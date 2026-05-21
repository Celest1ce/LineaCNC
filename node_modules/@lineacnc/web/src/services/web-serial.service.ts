/**
 * Service de gestion de la connexion Web Serial API
 * Gère la connexion, déconnexion, reconnexion automatique et communication
 */

import {
  Printer,
  ConnectionStatus,
  SerialPortOptions,
  DEFAULT_SERIAL_OPTIONS,
  Command,
  LogLevel,
  ParsedSerialData,
  PrinterEvent,
  PrinterEventPayload,
} from '../types/printer';
import { apiService } from './api.service';
import { logBuffer } from './log-buffer.service';
import { serialParser } from './serial-parser.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

type EventCallback = (payload: PrinterEventPayload) => void;

/**
 * Service de gestion Web Serial
 */
export class WebSerialService {
  private static instance: WebSerialService;
  private activePrinters: Map<string, Printer> = new Map();
  private eventListeners: Map<PrinterEvent, Set<EventCallback>> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private readLoops: Map<string, boolean> = new Map();
  private lineBuffers: Map<string, string> = new Map();
  private pendingSaves: Map<string, NodeJS.Timeout> = new Map();
  private initTimers: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    // Gérer la fermeture de l'onglet
    window.addEventListener('beforeunload', () => {
      this.disconnectAll();
    });

    // Gérer la visibilité de la page
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndReconnectAll();
      }
    });
  }

  static getInstance(): WebSerialService {
    if (!WebSerialService.instance) {
      WebSerialService.instance = new WebSerialService();
    }
    return WebSerialService.instance;
  }

  // ========== VÉRIFICATION DE SUPPORT ==========

  isSupported(): boolean {
    return 'serial' in navigator;
  }

  // ========== GESTION DES ÉVÉNEMENTS ==========

  on(event: PrinterEvent, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);

    // Retourner une fonction pour se désabonner
    return () => {
      this.eventListeners.get(event)?.delete(callback);
    };
  }

  private emit(event: PrinterEvent, printerId: string, data?: unknown): void {
    const payload: PrinterEventPayload = {
      printerId,
      event,
      timestamp: Date.now(),
      data,
    };

    this.eventListeners.get(event)?.forEach(callback => {
      try {
        callback(payload);
      } catch (error) {
        logger.error('Error in event callback', error);
      }
    });
  }

  /**
   * Sauvegarde debounced pour éviter les race conditions
   * Sauvegarde max 1x par seconde par imprimante
   */
  private debouncedSave(printer: Printer): void {
    // Annuler la sauvegarde précédente
    const existing = this.pendingSaves.get(printer.id);
    if (existing) {
      clearTimeout(existing);
    }

    // Sauvegarder après 1 seconde d'inactivité
    const timer = setTimeout(async () => {
      try {
        await apiService.savePrinter(printer);
        this.pendingSaves.delete(printer.id);
      } catch (err) {
        logger.error('Failed to save printer', err);
      }
    }, 1000);

    this.pendingSaves.set(printer.id, timer);
  }

  // ========== CONNEXION ==========

  async requestPort(): Promise<SerialPort | null> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser');
    }

    try {
      const port = await navigator.serial!.requestPort();
      return port;
    } catch (error) {
      if (error instanceof Error && error.name === 'NotFoundError') {
        // L'utilisateur a annulé la sélection
        return null;
      }
      throw error;
    }
  }

  async connectPrinter(
    port: SerialPort,
    options: Partial<SerialPortOptions> = {},
    printerName?: string
  ): Promise<Printer> {
    const serialOptions: SerialPortOptions = {
      ...DEFAULT_SERIAL_OPTIONS,
      ...options,
    };

    // Vérifier si le port est déjà ouvert
    const info = port.getInfo();
    const existingPrinter = this.findPrinterByPort(info);

    if (existingPrinter) {
      if (existingPrinter.connectionStatus === ConnectionStatus.CONNECTED) {
        throw new Error('This printer is already connected');
      }
      return await this.reconnectPrinter(existingPrinter.id);
    }

    // Vérifier si une imprimante avec ce port existe déjà dans la DB
    const allPrinters = await apiService.getAllPrinters();
    const dbPrinter = allPrinters.find(p =>
      p.portInfo?.usbVendorId === info.usbVendorId &&
      p.portInfo?.usbProductId === info.usbProductId
    );

    if (dbPrinter) {
      // Utiliser l'imprimante existante et la reconnecter
      logger.info('Found existing printer in DB, reconnecting', { id: dbPrinter.id });
      dbPrinter.port = port;
      this.activePrinters.set(dbPrinter.id, dbPrinter);

      try {
        await this.openPort(dbPrinter, dbPrinter.config.serialOptions);
        await this.initializeConnection(dbPrinter);
        await apiService.savePrinter(dbPrinter);

        this.emit(PrinterEvent.CONNECTED, dbPrinter.id, dbPrinter);
        this.logEvent(dbPrinter.id, 'Reconnected to existing printer', LogLevel.INFO);

        return dbPrinter;
      } catch (error) {
        // Rollback : retirer l'imprimante de la mémoire si la connexion échoue
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        this.logEvent(dbPrinter.id, `Connection failed: ${errorMessage}`, LogLevel.ERROR);

        await this.releasePort(dbPrinter.id).catch(err =>
          logger.error('Error during rollback', err)
        );

        dbPrinter.connectionStatus = ConnectionStatus.ERROR;
        dbPrinter.lastError = errorMessage;

        throw error;
      }
    }

    // Créer une nouvelle imprimante
    const printer = await this.createPrinter(port, serialOptions, printerName);

    try {
      await this.openPort(printer, serialOptions);
      await this.initializeConnection(printer);

      // Sauvegarder dans la base de données
      await apiService.savePrinter(printer);

      this.emit(PrinterEvent.CONNECTED, printer.id, printer);
      this.logEvent(printer.id, 'Connection established successfully', LogLevel.INFO);

      return printer;
    } catch (error) {
      // Rollback : retirer l'imprimante de la mémoire si la sauvegarde échoue
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';

      this.logEvent(printer.id, `Connection failed: ${errorMessage}`, LogLevel.ERROR);

      // Nettoyer complètement
      await this.releasePort(printer.id).catch(err =>
        logger.error('Error during rollback', err)
      );

      printer.connectionStatus = ConnectionStatus.ERROR;
      printer.lastError = errorMessage;

      throw error;
    }
  }

  private async openPort(printer: Printer, options: SerialPortOptions): Promise<void> {
    if (!printer.port) {
      throw new Error('No serial port available');
    }

    try {
      // Ne garder que les propriétés valides pour SerialOptions de l'API Web Serial
      const serialOptions: SerialOptions = {
        baudRate: options.baudRate,
        dataBits: options.dataBits,
        stopBits: options.stopBits,
        parity: options.parity,
        flowControl: options.flowControl,
        bufferSize: options.bufferSize,
      };

      await printer.port.open(serialOptions);

      printer.reader = printer.port.readable?.getReader();
      printer.writer = printer.port.writable?.getWriter();

      if (!printer.reader || !printer.writer) {
        throw new Error('Failed to get port reader or writer');
      }

      printer.connectionStatus = ConnectionStatus.CONNECTED;
      printer.lastConnected = Date.now();
      printer.reconnectAttempts = 0;

      this.activePrinters.set(printer.id, printer);

    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'InvalidStateError') {
          throw new Error('Port is already open or in use');
        }
        throw error;
      }
      throw new Error('Failed to open port');
    }
  }

  private async initializeConnection(printer: Printer): Promise<void> {
    // Démarrer la lecture des données
    this.startReading(printer.id);

    // Envoyer des commandes pour obtenir les infos firmware et matérielles
    const timer = setTimeout(() => {
      this.sendCommand(printer.id, 'M115'); // Get firmware info
      this.sendCommand(printer.id, 'M990'); // Get hardware info (includes UUID and machine name)
      this.initTimers.delete(printer.id);
    }, 500);

    this.initTimers.set(printer.id, timer);
  }

  private async createPrinter(
    port: SerialPort,
    options: SerialPortOptions,
    name?: string
  ): Promise<Printer> {
    const info = port.getInfo();
    const uuid = this.generatePrinterUUID(info);
    const id = uuidv4();

    const printer: Printer = {
      id,
      uuid,
      name: name || `Printer ${id.slice(0, 8)}`,
      config: {
        id,
        name: name || `Printer ${id.slice(0, 8)}`,
        serialOptions: options,
        autoReconnect: true,
        reconnectDelay: 2000,
        maxReconnectAttempts: 5,
        commandTimeout: 30000,
        keepAliveInterval: 60000,
      },
      hardware: {
        vendorId: info.usbVendorId,
        productId: info.usbProductId,
      },
      firmware: {},
      state: {},
      connectionStatus: ConnectionStatus.CONNECTING,
      portInfo: {
        usbVendorId: info.usbVendorId,
        usbProductId: info.usbProductId,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      port,
      reconnectAttempts: 0,
    };

    return printer;
  }

  private generatePrinterUUID(info: SerialPortInfo): string {
    // Générer un UUID basé sur les infos matérielles
    const vendor = info.usbVendorId?.toString(16).padStart(4, '0') || '0000';
    const product = info.usbProductId?.toString(16).padStart(4, '0') || '0000';
    return `printer-${vendor}-${product}-${Date.now()}`;
  }

  private findPrinterByPort(info: SerialPortInfo): Printer | undefined {
    for (const printer of this.activePrinters.values()) {
      const printerInfo = printer.port?.getInfo();
      if (
        printerInfo &&
        printerInfo.usbVendorId === info.usbVendorId &&
        printerInfo.usbProductId === info.usbProductId
      ) {
        return printer;
      }
    }
    return undefined;
  }

  // ========== DÉCONNEXION ==========

  async disconnectPrinter(printerId: string): Promise<void> {
    const printer = this.activePrinters.get(printerId);
    if (!printer) {
      // Si l'imprimante n'est pas dans activePrinters, elle est déjà déconnectée
      // mais on met quand même à jour le statut DB au cas où
      logger.warn('Attempting to disconnect printer that is not active', { printerId });
      await apiService.updatePrinterStatus(printerId, ConnectionStatus.DISCONNECTED);
      return;
    }

    this.clearReconnectTimer(printerId);
    await this.releasePort(printerId);

    printer.connectionStatus = ConnectionStatus.DISCONNECTED;
    await apiService.updatePrinterStatus(printerId, ConnectionStatus.DISCONNECTED);

    this.emit(PrinterEvent.DISCONNECTED, printerId);
    this.logEvent(printerId, 'Disconnected', LogLevel.INFO);
  }

  async disconnectAll(): Promise<void> {
    const promises = Array.from(this.activePrinters.keys()).map(id =>
      this.disconnectPrinter(id).catch(err => logger.error(`Failed to disconnect ${id}`, err))
    );
    await Promise.all(promises);
  }

  private async releasePort(printerId: string): Promise<void> {
    const printer = this.activePrinters.get(printerId);
    if (!printer) return;

    // Arrêter la lecture
    this.readLoops.set(printerId, false);

    // Clear tous les timers liés à cette imprimante
    const initTimer = this.initTimers.get(printerId);
    if (initTimer) {
      clearTimeout(initTimer);
      this.initTimers.delete(printerId);
    }

    const saveTimer = this.pendingSaves.get(printerId);
    if (saveTimer) {
      clearTimeout(saveTimer);
      this.pendingSaves.delete(printerId);
    }

    try {
      // Libérer le reader
      if (printer.reader) {
        await printer.reader.cancel();
        printer.reader.releaseLock();
        printer.reader = undefined;
      }

      // Libérer le writer
      if (printer.writer) {
        await printer.writer.close();
        printer.writer = undefined;
      }

      // Fermer le port
      if (printer.port) {
        await printer.port.close();
      }
    } catch (error) {
      logger.error('Error releasing port', error);
    }

    this.activePrinters.delete(printerId);
  }

  // ========== RECONNEXION ==========

  async reconnectPrinter(printerId: string): Promise<Printer> {
    const printer = await apiService.getPrinter(printerId);
    if (!printer) {
      throw new Error('Printer not found in database');
    }

    // Retrouver le port série via vendorId/productId
    if (!printer.portInfo?.usbVendorId || !printer.portInfo?.usbProductId) {
      throw new Error('No port information available for reconnection');
    }

    const availablePorts = await navigator.serial!.getPorts();
    const matchingPort = availablePorts.find(port => {
      const info = port.getInfo();
      return info.usbVendorId === printer.portInfo?.usbVendorId &&
             info.usbProductId === printer.portInfo?.usbProductId;
    });

    if (!matchingPort) {
      throw new Error(`Port not found (VID: ${printer.portInfo.usbVendorId}, PID: ${printer.portInfo.usbProductId})`);
    }

    // Fermer le port s'il est déjà ouvert
    if (matchingPort.readable || matchingPort.writable) {
      try {
        await this.releasePort(printerId);
        // Attendre que le port soit vraiment libéré par le navigateur
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        logger.warn('Failed to release port before reconnect', e);
      }
    }

    // Attacher le port à l'imprimante
    printer.port = matchingPort;

    printer.connectionStatus = ConnectionStatus.RECONNECTING;
    this.emit(PrinterEvent.RECONNECTING, printerId);
    this.logEvent(printerId, 'Attempting to reconnect...', LogLevel.INFO);

    try {
      await this.openPort(printer, printer.config.serialOptions);
      await this.initializeConnection(printer);
      await apiService.savePrinter(printer);

      this.emit(PrinterEvent.CONNECTED, printerId, printer);
      this.logEvent(printerId, 'Reconnected successfully', LogLevel.INFO);

      return printer;
    } catch (error) {
      await this.handleReconnectFailure(printer, error);
      throw error;
    }
  }

  private async handleReconnectFailure(printer: Printer, error: unknown): Promise<void> {
    printer.reconnectAttempts = (printer.reconnectAttempts || 0) + 1;

    const errorMessage = error instanceof Error ? error.message : 'Reconnection failed';
    this.logEvent(
      printer.id,
      `Reconnection attempt ${printer.reconnectAttempts} failed: ${errorMessage}`,
      LogLevel.WARNING
    );

    if (
      printer.config.autoReconnect &&
      printer.reconnectAttempts < printer.config.maxReconnectAttempts
    ) {
      this.scheduleReconnect(printer);
    } else {
      printer.connectionStatus = ConnectionStatus.ERROR;
      printer.lastError = errorMessage;
      await apiService.savePrinter(printer);
      this.emit(PrinterEvent.ERROR, printer.id, { error: errorMessage });
    }
  }

  private scheduleReconnect(printer: Printer): void {
    this.clearReconnectTimer(printer.id);

    // Backoff exponentiel : 2s, 4s, 8s, 16s, 32s, max 60s
    const baseDelay = printer.config.reconnectDelay;
    const attempts = printer.reconnectAttempts || 1;
    const exponentialDelay = baseDelay * Math.pow(2, attempts - 1);
    const maxDelay = 60000; // 60 secondes maximum
    const delay = Math.min(exponentialDelay, maxDelay);

    this.logEvent(
      printer.id,
      `Next reconnection attempt in ${(delay / 1000).toFixed(1)}s (attempt ${attempts + 1}/${printer.config.maxReconnectAttempts})`,
      LogLevel.INFO
    );

    const timer = setTimeout(() => {
      this.reconnectPrinter(printer.id).catch(err => {
        logger.error('Scheduled reconnect failed', err);
      });
    }, delay);

    this.reconnectTimers.set(printer.id, timer);
  }

  private clearReconnectTimer(printerId: string): void {
    const timer = this.reconnectTimers.get(printerId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(printerId);
    }
  }

  private async checkAndReconnectAll(): Promise<void> {
    const printers = await apiService.getAllPrinters();

    for (const printer of printers) {
      if (
        printer.config.autoReconnect &&
        printer.connectionStatus !== ConnectionStatus.CONNECTED &&
        !this.activePrinters.has(printer.id)
      ) {
        this.reconnectPrinter(printer.id).catch(err => {
          logger.error(`Failed to reconnect printer ${printer.id}`, err);
        });
      }
    }
  }

  // ========== LECTURE DES DONNÉES ==========

  private startReading(printerId: string): void {
    const printer = this.activePrinters.get(printerId);
    if (!printer || !printer.reader) return;

    this.readLoops.set(printerId, true);
    this.lineBuffers.set(printerId, '');

    this.readData(printerId);
  }

  private async readData(printerId: string): Promise<void> {
    const printer = this.activePrinters.get(printerId);
    if (!printer || !printer.reader || !this.readLoops.get(printerId)) {
      return;
    }

    try {
      const { value, done } = await printer.reader.read();

      if (done) {
        // Ne pas reconnecter si la lecture a été arrêtée intentionnellement
        if (this.readLoops.get(printerId) !== false) {
          this.handleDisconnection(printerId);
        }
        return;
      }

      if (value) {
        this.processReceivedData(printerId, value);
      }

      // Continuer la lecture
      this.readData(printerId);
    } catch (error) {
      // Ne pas gérer l'erreur si la lecture a été arrêtée intentionnellement
      if (this.readLoops.get(printerId) !== false) {
        await this.handleSerialError(printerId, error);
      }
    }
  }

  private processReceivedData(printerId: string, data: Uint8Array): void {
    const MAX_BUFFER_SIZE = 10240; // 10KB max pour éviter les memory leaks
    const decoder = new TextDecoder();
    const text = decoder.decode(data);

    // Ajouter au buffer
    let buffer = this.lineBuffers.get(printerId) || '';
    buffer += text;

    // Vérifier la taille du buffer pour éviter les memory leaks
    if (buffer.length > MAX_BUFFER_SIZE) {
      logger.warn(`Buffer overflow for printer ${printerId} (${buffer.length} bytes), clearing...`);
      buffer = ''; // Purger le buffer si trop grand
    }

    // Extraire les lignes complètes
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || ''; // Garder la dernière ligne incomplète
    this.lineBuffers.set(printerId, buffer);

    // Traiter chaque ligne
    for (const line of lines) {
      if (line.trim()) {
        this.processLine(printerId, line);
      }
    }
  }

  private processLine(printerId: string, line: string): void {
    try {
      const cleanedLine = serialParser.cleanLine(line);
      if (!cleanedLine) return;

      // Parser la ligne
      const parsed = serialParser.parse(cleanedLine);

      // Émettre l'événement
      this.emit(PrinterEvent.DATA_RECEIVED, printerId, parsed);

      // Mettre à jour l'état de l'imprimante
      this.updatePrinterState(printerId, parsed);

      // Logger
      this.logSerialData(printerId, parsed);
    } catch (error) {
      // Ne pas crasher la lecture si le parsing échoue
      logger.error('Error parsing serial data', { error, line });
    }
  }

  private updatePrinterState(printerId: string, data: ParsedSerialData): void {
    const printer = this.activePrinters.get(printerId);
    if (!printer) return;

    let stateUpdated = false;

    // Mettre à jour selon le type de données
    switch (data.type) {
      case 'temperature':
        if (!printer.state.temperature) printer.state.temperature = {};
        Object.assign(printer.state.temperature, data.data);
        stateUpdated = true;
        break;

      case 'position':
        if (!printer.state.position) printer.state.position = {};
        Object.assign(printer.state.position, data.data);
        stateUpdated = true;
        break;

      case 'firmware_info':
        Object.assign(printer.firmware, data.data);
        stateUpdated = true;
        break;

      case 'hardware_info':
        // Utiliser l'UUID de M990 si disponible
        if (data.data.buildUUID) {
          printer.uuid = data.data.buildUUID as string;
        }
        // Utiliser le nom de la machine depuis M990 si disponible
        if (data.data.machineName) {
          printer.name = data.data.machineName as string;
          printer.config.name = data.data.machineName as string;
        }
        // Mettre à jour les infos matérielles
        Object.assign(printer.hardware, data.data);
        // Mettre à jour les infos firmware si présentes
        if (data.data.firmwareVersion) {
          printer.firmware.version = data.data.firmwareVersion as string;
        }
        if (data.data.buildDate) {
          printer.firmware.buildDate = data.data.buildDate as string;
        }
        stateUpdated = true;
        break;

      case 'status_update':
        if (data.data.status) {
          printer.state.status = data.data.status as string;
          stateUpdated = true;
        }
        break;
    }

    if (stateUpdated) {
      this.emit(PrinterEvent.STATE_UPDATED, printerId, printer);
      this.debouncedSave(printer); // Sauvegarde debounced pour éviter les race conditions
    }
  }

  // ========== ENVOI DE COMMANDES ==========

  async sendCommand(printerId: string, commandText: string): Promise<Command> {
    const printer = this.activePrinters.get(printerId);
    if (!printer) {
      throw new Error('Printer not found');
    }

    if (printer.connectionStatus !== ConnectionStatus.CONNECTED || !printer.writer) {
      throw new Error('Printer is not connected');
    }

    const command: Command = {
      id: uuidv4(),
      command: commandText,
      timestamp: Date.now(),
      status: 'pending',
    };

    try {
      // Encoder et envoyer
      const encoder = new TextEncoder();
      const data = encoder.encode(commandText + '\n');
      await printer.writer.write(data);

      this.emit(PrinterEvent.COMMAND_SENT, printerId, command);
      this.logEvent(printerId, `Command sent: ${commandText}`, LogLevel.DEBUG);

      // Sauvegarder dans l'historique
      await apiService.saveCommand(command, printerId);

      // Mettre à jour les stats
      await apiService.incrementCommandStats(printerId, true);

      return command;
    } catch (error) {
      command.status = 'error';
      command.error = error instanceof Error ? error.message : 'Failed to send command';

      this.logEvent(printerId, `Command failed: ${command.error}`, LogLevel.ERROR);
      await apiService.saveCommand(command, printerId);
      await apiService.incrementCommandStats(printerId, false);

      throw error;
    }
  }

  // ========== GESTION DES ERREURS ==========

  private async handleSerialError(printerId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Serial communication error';

    this.logEvent(printerId, `Serial error: ${errorMessage}`, LogLevel.ERROR);
    this.emit(PrinterEvent.ERROR, printerId, { error: errorMessage });

    const printer = this.activePrinters.get(printerId);
    if (printer) {
      printer.lastError = errorMessage;

      if (printer.config.autoReconnect) {
        this.scheduleReconnect(printer);
      } else {
        printer.connectionStatus = ConnectionStatus.ERROR;
        await apiService.savePrinter(printer);
      }
    }
  }

  private async handleDisconnection(printerId: string): Promise<void> {
    this.logEvent(printerId, 'Printer disconnected', LogLevel.WARNING);

    const printer = this.activePrinters.get(printerId);
    if (printer && printer.config.autoReconnect) {
      this.scheduleReconnect(printer);
    } else {
      await this.disconnectPrinter(printerId);
    }
  }

  // ========== LOGGING ==========

  /**
   * Log an event to the buffer (optimized - no immediate DB write)
   */
  private logEvent(printerId: string, message: string, level: LogLevel): void {
    logBuffer.addLog({
      id: uuidv4(),
      timestamp: Date.now(),
      level,
      category: 'connection',
      message,
      printerId,
    });
  }

  /**
   * Log serial data to the buffer (optimized - no immediate DB write)
   */
  private logSerialData(printerId: string, data: ParsedSerialData): void {
    logBuffer.addLog({
      id: uuidv4(),
      timestamp: data.timestamp,
      level: LogLevel.DEBUG,
      category: 'data',
      message: data.raw,
      data: data.data,
      printerId,
    });
  }

  // ========== GETTERS ==========

  getPrinter(printerId: string): Printer | undefined {
    return this.activePrinters.get(printerId);
  }

  getActivePrinters(): Printer[] {
    return Array.from(this.activePrinters.values());
  }

  isConnected(printerId: string): boolean {
    const printer = this.activePrinters.get(printerId);
    return printer?.connectionStatus === ConnectionStatus.CONNECTED;
  }
}

// Export de l'instance unique
export const webSerial = WebSerialService.getInstance();
