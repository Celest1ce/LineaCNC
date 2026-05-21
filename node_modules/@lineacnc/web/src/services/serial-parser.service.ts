/**
 * Service de parsing intelligent des données série
 * Détecte automatiquement le type de données et les normalise
 */

import { SerialDataType, ParsedSerialData, FirmwareInfo, BedMeshData } from '../types/printer';
import { extractMeshFromGcodeReport } from '../utils/mesh-parser.utils';

/**
 * Parser intelligent pour les données série
 */
export class SerialParserService {
  private static instance: SerialParserService;

  private constructor() {}

  static getInstance(): SerialParserService {
    if (!SerialParserService.instance) {
      SerialParserService.instance = new SerialParserService();
    }
    return SerialParserService.instance;
  }

  /**
   * Parse une ligne de données série
   */
  parse(rawData: string): ParsedSerialData {
    const timestamp = Date.now();
    const trimmed = rawData.trim();

    // Détecter le type de données
    const type = this.detectDataType(trimmed);
    const data = this.extractData(trimmed, type);

    return {
      raw: rawData,
      type,
      timestamp,
      data,
    };
  }

  /**
   * Détecte automatiquement le type de données
   */
  private detectDataType(line: string): SerialDataType {
    const lower = line.toLowerCase();

    // Si on est en mode buffering mesh, toutes les lignes jusqu'à "ok" font partie du mesh
    if (this.isMeshBuffering) {
      // Arrêter le buffering seulement sur "ok" seul
      if (lower.trim() === 'ok') {
        // Cette ligne "ok" marque la fin, mais on la traite d'abord comme mesh
        return SerialDataType.BED_MESH_DATA;
      }
      // Toutes les autres lignes pendant le buffering sont du mesh
      return SerialDataType.BED_MESH_DATA;
    }

    // Messages d'erreur
    if (
      lower.includes('error') ||
      lower.includes('err:') ||
      lower.startsWith('!!') ||
      lower.includes('failed')
    ) {
      return SerialDataType.ERROR_MESSAGE;
    }

    // Bed mesh data (G29 T response) - Début du mesh
    if (
      lower.includes('bilinear leveling grid') ||
      lower.includes('ubl mesh') ||
      lower.includes('bed topology') ||
      lower.includes('bed topography') ||
      (lower.includes('mesh') && /^\s*\d+\s+\d+\s+\d+/.test(line))
    ) {
      return SerialDataType.BED_MESH_DATA;
    }

    // M990 Hardware information
    if (
      lower.includes('hardware information report') ||
      lower.includes('build uuid:') ||
      lower.includes('machine name:') ||
      lower.includes('mainboard:') ||
      lower.includes('printable area') ||
      lower.includes('bed leveling:') ||
      lower.includes('motion drivers:') ||
      lower.includes('z probe:') ||
      lower.includes('filament runout sensor:') ||
      lower.includes('power loss recovery:')
    ) {
      return SerialDataType.HARDWARE_INFO;
    }

    // Informations firmware
    if (
      lower.includes('firmware') ||
      lower.includes('marlin') ||
      lower.includes('repetier') ||
      lower.includes('klipper') ||
      lower.includes('grbl') ||
      lower.match(/^(start|echo:)\s*(marlin|repetier|klipper|grbl)/i)
    ) {
      return SerialDataType.FIRMWARE_INFO;
    }

    // Températures
    if (
      lower.match(/t\d?:\d+\.?\d*/i) ||
      lower.match(/b:\d+\.?\d*/i) ||
      lower.includes('temp')
    ) {
      return SerialDataType.TEMPERATURE;
    }

    // Position
    if (
      lower.match(/x:\s*-?\d+\.?\d*/i) ||
      lower.match(/count\s+[xyz]/i) ||
      lower.includes('position')
    ) {
      return SerialDataType.POSITION;
    }

    // Réponses ok/acknowledgement
    if (lower === 'ok' || lower.startsWith('ok ') || lower === 'ok\n') {
      return SerialDataType.COMMAND_RESPONSE;
    }

    // Messages de status
    if (
      lower.includes('busy') ||
      lower.includes('processing') ||
      lower.includes('printing') ||
      lower.includes('idle')
    ) {
      return SerialDataType.STATUS_UPDATE;
    }

    // Messages de log
    if (
      lower.startsWith('echo:') ||
      lower.startsWith('info:') ||
      lower.startsWith('debug:') ||
      lower.startsWith('//')
    ) {
      return SerialDataType.LOG_MESSAGE;
    }

    return SerialDataType.UNKNOWN;
  }

  /**
   * Extrait les données selon le type
   */
  private extractData(
    line: string,
    type: SerialDataType
  ): ParsedSerialData['data'] {
    switch (type) {
      case SerialDataType.TEMPERATURE:
        return this.parseTemperature(line);

      case SerialDataType.POSITION:
        return this.parsePosition(line);

      case SerialDataType.FIRMWARE_INFO:
        return this.parseFirmwareInfo(line) as ParsedSerialData['data'];

      case SerialDataType.HARDWARE_INFO:
        return this.parseM990(line);

      case SerialDataType.BED_MESH_DATA:
        return this.parseBedMesh(line);

      case SerialDataType.ERROR_MESSAGE:
        return this.parseError(line);

      case SerialDataType.COMMAND_RESPONSE:
        return this.parseCommandResponse(line);

      case SerialDataType.STATUS_UPDATE:
        return this.parseStatus(line);

      default:
        return { raw: line };
    }
  }

  /**
   * Parse les informations de température
   */
  private parseTemperature(line: string): Record<string, unknown> {
    const data: Record<string, number> = {};

    // Marlin format: T:190.0 /200.0 B:60.0 /60.0
    const tempMatches = line.matchAll(/([TB]\d?):\s*(-?\d+\.?\d*)\s*\/?\s*(-?\d+\.?\d*)?/gi);

    for (const match of tempMatches) {
      const sensor = match[1].toUpperCase();
      const current = parseFloat(match[2]);
      const target = match[3] ? parseFloat(match[3]) : undefined;

      if (sensor.startsWith('T')) {
        data.hotend = current;
        if (target !== undefined) data.targetHotend = target;
      } else if (sensor === 'B') {
        data.bed = current;
        if (target !== undefined) data.targetBed = target;
      }
    }

    return data;
  }

  /**
   * Parse les informations de position
   */
  private parsePosition(line: string): Record<string, unknown> {
    const data: Record<string, number> = {};

    // Marlin format: X:0.00 Y:0.00 Z:0.00 E:0.00 Count X:8480 Y:13000 Z:2000
    // On veut seulement les vraies positions (avant "Count"), pas les compteurs de steppers
    const beforeCount = line.split(/Count\s+/i)[0];
    const posMatches = beforeCount.matchAll(/([XYZE]):\s*(-?\d+\.?\d*)/gi);

    for (const match of posMatches) {
      const axis = match[1].toLowerCase();
      const value = parseFloat(match[2]);
      data[axis] = value;
    }

    return data;
  }

  /**
   * Parse les informations du firmware
   */
  private parseFirmwareInfo(line: string): FirmwareInfo {
    const info: FirmwareInfo = {};

    // Détection du nom du firmware
    const firmwareNames = ['marlin', 'repetier', 'klipper', 'grbl', 'smoothie'];
    for (const name of firmwareNames) {
      if (line.toLowerCase().includes(name)) {
        info.name = name.charAt(0).toUpperCase() + name.slice(1);
        break;
      }
    }

    // Extraction de la version
    const versionMatch = line.match(/(\d+\.\d+\.?\d*)/);
    if (versionMatch) {
      info.version = versionMatch[1];
    }

    // Extraction du protocole
    if (line.toLowerCase().includes('protocol')) {
      const protocolMatch = line.match(/protocol[:\s]+(\S+)/i);
      if (protocolMatch) {
        info.protocol = protocolMatch[1];
      }
    }

    return info;
  }

  /**
   * Parse les informations hardware du M990
   */
  private parseM990(line: string): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    // Build UUID
    if (line.includes('Build UUID:')) {
      const match = line.match(/Build UUID:\s*(.+)/i);
      if (match) data.buildUUID = match[1].trim();
    }

    // Firmware Version
    if (line.includes('Firmware Version:')) {
      const match = line.match(/Firmware Version:\s*(.+)/i);
      if (match) data.firmwareVersion = match[1].trim();
    }

    // Build Date
    if (line.includes('Build Date:')) {
      const match = line.match(/Build Date:\s*(.+)/i);
      if (match) data.buildDate = match[1].trim();
    }

    // Machine Name
    if (line.includes('Machine Name:')) {
      const match = line.match(/Machine Name:\s*(.+)/i);
      if (match) data.machineName = match[1].trim();
    }

    // Mainboard
    if (line.includes('Mainboard:')) {
      const match = line.match(/Mainboard:\s*(.+)/i);
      if (match) data.mainboard = match[1].trim();
    }

    // Extruders
    if (line.includes('Extruders:')) {
      const match = line.match(/Extruders:\s*(\d+)/i);
      if (match) data.extruders = parseInt(match[1]);
    }

    // Toolheads
    if (line.includes('Toolheads:')) {
      const match = line.match(/Toolheads:\s*(\d+)/i);
      if (match) data.toolheads = parseInt(match[1]);
    }

    // Printable Area
    if (line.includes('Printable Area')) {
      const match = line.match(/X(\d+)\s*x\s*Y(\d+)\s*x\s*Z(\d+)/i);
      if (match) {
        data.printableArea = {
          x: parseInt(match[1]),
          y: parseInt(match[2]),
          z: parseInt(match[3]),
        };
      }
    }

    // Bed Leveling
    if (line.includes('Bed Leveling:')) {
      const match = line.match(/Bed Leveling:\s*(.+)/i);
      if (match) data.bedLeveling = match[1].trim();
    }

    // Mesh Points
    if (line.includes('Mesh Points:')) {
      const match = line.match(/(\d+)\s*x\s*(\d+)/i);
      if (match) {
        data.meshPoints = {
          x: parseInt(match[1]),
          y: parseInt(match[2]),
        };
      }
    }

    // Probe Margin
    if (line.includes('Probe Margin')) {
      const match = line.match(/L(\d+)\s*\/\s*R(\d+)\s*\/\s*F(\d+)\s*\/\s*B(\d+)/i);
      if (match) {
        data.probeMargin = {
          left: parseInt(match[1]),
          right: parseInt(match[2]),
          front: parseInt(match[3]),
          back: parseInt(match[4]),
        };
      }
    }

    // Z Steppers
    if (line.includes('Z Steppers:')) {
      const match = line.match(/Z Steppers:\s*(\d+)/i);
      if (match) data.zSteppers = parseInt(match[1]);
    }

    // Motion Drivers
    if (line.includes('Motion Drivers:')) {
      const match = line.match(/Motion Drivers:\s*(.+)/i);
      if (match) {
        const drivers = match[1].trim();
        const driverMatches = drivers.matchAll(/([XYZE]\d?)=(\S+)/g);
        const driverData: Record<string, string> = {};
        for (const dm of driverMatches) {
          driverData[dm[1].toLowerCase()] = dm[2];
        }
        data.motionDrivers = driverData;
      }
    }

    // Z Probe
    if (line.includes('Z Probe:')) {
      const match = line.match(/Z Probe:\s*(.+)/i);
      if (match) data.zProbe = match[1].trim().toLowerCase() === 'present';
    }

    // Filament Runout Sensor
    if (line.includes('Filament Runout Sensor:')) {
      const match = line.match(/Filament Runout Sensor:\s*(.+)/i);
      if (match) data.filamentRunoutSensor = match[1].trim().toLowerCase() === 'present';
    }

    // Power Loss Recovery
    if (line.includes('Power Loss Recovery:')) {
      const match = line.match(/Power Loss Recovery:\s*(.+)/i);
      if (match) data.powerLossRecovery = match[1].trim().toLowerCase() === 'enabled';
    }

    // Baud Rate
    if (line.includes('Baud Rate:')) {
      const match = line.match(/Baud Rate:\s*(\d+)/i);
      if (match) data.baudRate = parseInt(match[1]);
    }

    return data;
  }

  /**
   * Parse les messages d'erreur
   */
  private parseError(line: string): Record<string, unknown> {
    return {
      error: line.replace(/^(error|err):\s*/i, '').trim(),
      severity: this.detectErrorSeverity(line),
    };
  }

  /**
   * Détecte la sévérité d'une erreur
   */
  private detectErrorSeverity(line: string): 'low' | 'medium' | 'high' | 'critical' {
    const lower = line.toLowerCase();

    if (
      lower.includes('critical') ||
      lower.includes('fatal') ||
      lower.includes('emergency') ||
      lower.includes('halted')
    ) {
      return 'critical';
    }

    if (
      lower.includes('thermal') ||
      lower.includes('mintemp') ||
      lower.includes('maxtemp') ||
      lower.includes('heating failed')
    ) {
      return 'high';
    }

    if (lower.includes('warning') || lower.includes('heating slow')) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Parse les réponses de commande
   */
  private parseCommandResponse(line: string): Record<string, unknown> {
    // Si c'est juste "ok", c'est une réponse simple
    if (line.trim().toLowerCase() === 'ok') {
      return { success: true };
    }

    // Sinon, extraire les données supplémentaires
    const data: Record<string, unknown> = { success: true };

    // Certaines commandes retournent des valeurs avec ok
    const parts = line.split(/\s+/).slice(1); // Ignorer le "ok"
    if (parts.length > 0) {
      data.response = parts.join(' ');
    }

    return data;
  }

  /**
   * Parse les messages de status
   */
  private parseStatus(line: string): Record<string, unknown> {
    const lower = line.toLowerCase();

    let status = 'unknown';
    if (lower.includes('idle')) status = 'idle';
    else if (lower.includes('printing')) status = 'printing';
    else if (lower.includes('busy')) status = 'busy';
    else if (lower.includes('paused')) status = 'paused';
    else if (lower.includes('stopped')) status = 'stopped';

    return { status, message: line };
  }

  /**
   * Buffer pour accumuler les lignes de mesh
   */
  private meshBuffer: string[] = [];
  private isMeshBuffering = false;

  /**
   * Parse les données de bed mesh (G29 T)
   * Note: Les données de mesh peuvent être multi-lignes, donc on accumule
   */
  private parseBedMesh(line: string): Record<string, unknown> {
    const lower = line.toLowerCase();

    // Start buffering when we detect the mesh header
    if (
      lower.includes('leveling grid') ||
      lower.includes('bed topology') ||
      lower.includes('bed topography')
    ) {
      this.isMeshBuffering = true;
      this.meshBuffer = [line];
      return { raw: line, buffering: true };
    }

    // If we're buffering, add lines
    if (this.isMeshBuffering) {
      this.meshBuffer.push(line);

      // Check if this is the end (ok line)
      if (lower.trim() === 'ok') {
        // Try to parse the complete mesh (without the ok line)
        const meshData = extractMeshFromGcodeReport(this.meshBuffer.slice(0, -1).join('\n'));

        // Stop buffering
        this.isMeshBuffering = false;
        const buffer = [...this.meshBuffer];
        this.meshBuffer = [];

        if (meshData) {
          // Successfully parsed
          return { meshData, raw: buffer.join('\n'), complete: true };
        } else {
          // Failed to parse
          return { raw: buffer.join('\n'), complete: false, error: 'Failed to parse mesh data' };
        }
      }

      // Still buffering (not at ok yet)
      return { raw: line, buffering: true };
    }

    return { raw: line };
  }

  /**
   * Parse mesh data from accumulated lines (for manual parsing)
   * @param lines - Array of lines to parse
   * @returns Parsed mesh data or null
   */
  parseMeshData(lines: string[]): BedMeshData | null {
    return extractMeshFromGcodeReport(lines.join('\n'));
  }

  /**
   * Parse plusieurs lignes en batch
   */
  parseMultiple(lines: string[]): ParsedSerialData[] {
    return lines.filter(line => line.trim().length > 0).map(line => this.parse(line));
  }

  /**
   * Détecte si une ligne est un écho de commande
   */
  isCommandEcho(line: string): boolean {
    return (
      line.startsWith('echo:') ||
      line.startsWith('Echo:') ||
      line.toLowerCase().startsWith('echo:')
    );
  }

  /**
   * Nettoie une ligne de caractères de contrôle
   */
  cleanLine(line: string): string {
    return line
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Caractères de contrôle
      .replace(/\r\n|\n|\r/g, '') // Retours à la ligne
      .trim();
  }

  /**
   * Détecte si le firmware nécessite un checksum
   */
  requiresChecksum(firmwareName?: string): boolean {
    if (!firmwareName) return false;
    const lower = firmwareName.toLowerCase();
    return lower.includes('marlin') || lower.includes('repetier');
  }

  /**
   * Calcule un checksum pour une commande (format Marlin)
   */
  calculateChecksum(command: string, lineNumber: number): string {
    const line = `N${lineNumber} ${command}`;
    let checksum = 0;

    for (let i = 0; i < line.length; i++) {
      checksum ^= line.charCodeAt(i);
    }

    return `${line}*${checksum}`;
  }
}

// Export de l'instance unique
export const serialParser = SerialParserService.getInstance();
