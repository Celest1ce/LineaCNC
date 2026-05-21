/**
 * Types pour le système de gestion d'imprimantes via Web Serial API
 */

// Types de base pour Web Serial API
export interface SerialPortOptions {
  baudRate: number;
  dataBits?: 7 | 8;
  stopBits?: 1 | 2;
  parity?: 'none' | 'even' | 'odd';
  bufferSize?: number;
  flowControl?: 'none' | 'hardware';
}

export const DEFAULT_SERIAL_OPTIONS: SerialPortOptions = {
  baudRate: 115200,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  bufferSize: 8192,
  flowControl: 'none',
};

// Statuts de connexion
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// Types de données série
export enum SerialDataType {
  COMMAND_RESPONSE = 'command_response',
  STATUS_UPDATE = 'status_update',
  ERROR_MESSAGE = 'error_message',
  LOG_MESSAGE = 'log_message',
  TEMPERATURE = 'temperature',
  POSITION = 'position',
  FIRMWARE_INFO = 'firmware_info',
  HARDWARE_INFO = 'hardware_info',
  BED_MESH_DATA = 'bed_mesh_data',
  UNKNOWN = 'unknown',
}

// Types de logs
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Information matérielle de l'imprimante
export interface PrinterHardwareInfo {
  vendorId?: number;
  productId?: number;
  manufacturer?: string;
  serialNumber?: string;
  buildUUID?: string;
  machineName?: string;
  mainboard?: string;
  extruders?: number;
  toolheads?: number;
  printableArea?: {
    x?: number;
    y?: number;
    z?: number;
  };
  bedLeveling?: string;
  meshPoints?: {
    x?: number;
    y?: number;
  };
  probeMargin?: {
    left?: number;
    right?: number;
    front?: number;
    back?: number;
  };
  zSteppers?: number;
  motionDrivers?: {
    x?: string;
    y?: string;
    z?: string;
    e0?: string;
  };
  zProbe?: boolean;
  filamentRunoutSensor?: boolean;
  powerLossRecovery?: boolean;
  baudRate?: number;
}

// Informations firmware
export interface FirmwareInfo {
  name?: string;
  version?: string;
  buildDate?: string;
  machineType?: string;
  extruderCount?: number;
  uuid?: string;
  protocol?: string;
  capabilities?: string[];
}

// État de l'imprimante
export interface PrinterState {
  temperature?: {
    hotend?: number;
    bed?: number;
    targetHotend?: number;
    targetBed?: number;
  };
  position?: {
    x?: number;
    y?: number;
    z?: number;
    e?: number;
  };
  status?: string;
  isHomed?: boolean;
  isPrinting?: boolean;
  progress?: number;
}

// Commande envoyée
export interface Command {
  id: string;
  command: string;
  timestamp: number;
  response?: string;
  responseTime?: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

// Entrée de log
export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: 'connection' | 'command' | 'data' | 'system' | 'error';
  message: string;
  data?: unknown;
  printerId?: string;
}

// Données série parsées
export interface ParsedSerialData {
  raw: string;
  type: SerialDataType;
  timestamp: number;
  data: {
    command?: string;
    value?: unknown;
    error?: string;
    [key: string]: unknown;
  };
}

// Configuration d'imprimante
export interface PrinterConfig {
  id: string;
  name: string;
  serialOptions: SerialPortOptions;
  autoReconnect: boolean;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  commandTimeout: number;
  keepAliveInterval?: number;
  customSettings?: Record<string, unknown>;
}

// Informations du port série (pour reconnexion)
export interface SerialPortIdentifier {
  usbVendorId?: number;
  usbProductId?: number;
}

// Imprimante complète
export interface Printer {
  id: string;
  name: string;
  uuid: string;
  config: PrinterConfig;
  hardware: PrinterHardwareInfo;
  firmware: FirmwareInfo;
  state: PrinterState;
  connectionStatus: ConnectionStatus;
  portInfo?: SerialPortIdentifier; // Pour reconnexion automatique
  lastConnected?: number;
  lastError?: string;
  createdAt: number;
  updatedAt: number;
  // Données de runtime (non persistées)
  port?: SerialPort;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
  writer?: WritableStreamDefaultWriter<Uint8Array>;
  reconnectAttempts?: number;
}

// Statistiques d'imprimante
export interface PrinterStats {
  totalCommands: number;
  successfulCommands: number;
  failedCommands: number;
  totalErrors: number;
  totalConnectionTime: number;
  averageResponseTime: number;
  lastActivity: number;
}

// Filtres pour les logs
export interface LogFilter {
  levels?: LogLevel[];
  categories?: LogEntry['category'][];
  printerId?: string;
  startDate?: number;
  endDate?: number;
  searchTerm?: string;
}

// Événements du système
export enum PrinterEvent {
  CONNECTED = 'printer:connected',
  DISCONNECTED = 'printer:disconnected',
  RECONNECTING = 'printer:reconnecting',
  ERROR = 'printer:error',
  DATA_RECEIVED = 'printer:data',
  COMMAND_SENT = 'printer:command:sent',
  COMMAND_RESPONSE = 'printer:command:response',
  STATE_UPDATED = 'printer:state:updated',
}

export interface PrinterEventPayload {
  printerId: string;
  event: PrinterEvent;
  timestamp: number;
  data?: unknown;
}

// Bed Mesh Data
export interface BedMeshData {
  size: number;
  probingMode: string;
  mesh: (number | null)[][];
  min: number;
  max: number;
  meshPoints?: {
    x: number;
    y: number;
  };
}

// Gradient Types
export type GradientType = 'magma' | 'viridis' | 'custom';

export interface CustomGradient {
  min: number;
  max: number;
  colorMin: string;
  colorMax: string;
}
