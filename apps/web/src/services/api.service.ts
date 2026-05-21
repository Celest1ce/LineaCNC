/**
 * Service API V2 pour communiquer avec le backend
 * Utilise le schéma normalisé avec tables séparées
 */

import {
  Printer,
  Command,
  LogEntry,
  PrinterStats,
  LogFilter,
  ConnectionStatus,
  SerialPortOptions,
  PrinterHardwareInfo,
  FirmwareInfo,
  PrinterState,
} from '../types/printer';
import { logger } from '../utils/logger';

// Use relative URL by default (works in production when frontend is served by API)
// Can be overridden with VITE_API_URL env variable for dev if needed
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Parameter interfaces
export interface ParameterDefinition {
  id: string;
  parameter_key: string;
  parameter_type: 'number' | 'string' | 'boolean' | 'json';
  default_value?: any;
  min_value?: number;
  max_value?: number;
  category?: string;
  display_order: number;
  created_at: number;
  updated_at: number;
}

export interface PrinterParameter {
  id: string;
  parameter_key: string;
  parameter_type: string;
  value: any;
  default_value?: any;
  min_value?: number;
  max_value?: number;
  category?: string;
  is_default: boolean;
  updated_at: number;
}

// Format CompletePrinter du backend (V2)
interface CompletePrinter {
  printer: {
    id: string;
    uuid: string;
    name: string;
    user_id?: number;
    connection_status: string;
    last_connected?: number;
    last_error?: string;
    created_at: number;
    updated_at: number;
  };
  config?: {
    printer_id: string;
    auto_reconnect: boolean;
    reconnect_delay: number;
    max_reconnect_attempts: number;
    command_timeout: number;
    keep_alive_interval: number;
    serial_options: SerialPortOptions;
    custom_settings?: Record<string, unknown>;
    updated_at: number;
  };
  hardware?: {
    printer_id: string;
    vendor_id?: number;
    product_id?: number;
    manufacturer?: string;
    serial_number?: string;
    hardware_specs: Partial<PrinterHardwareInfo>;
    updated_at: number;
  };
  firmware?: {
    printer_id: string;
    name?: string;
    version?: string;
    build_date?: string;
    capabilities: Partial<FirmwareInfo>;
    updated_at: number;
  };
  port?: {
    printer_id: string;
    usb_vendor_id?: number;
    usb_product_id?: number;
    port_metadata?: Record<string, unknown>;
    updated_at: number;
  };
  state?: {
    printer_id: string;
    status?: string;
    state_data?: Partial<PrinterState>;
    updated_at: number;
  };
}

class ApiService {
  private static instance: ApiService;

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Get the base URL for API requests
   */
  getBaseUrl(): string {
    return API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('API request failed', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ========== PRINTERS ==========

  async savePrinter(printer: Printer): Promise<void> {
    const completePrinter = this.toCompletePrinter(printer);

    const result = await this.request('/printers', {
      method: 'POST',
      body: JSON.stringify(completePrinter),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to save printer');
    }
  }

  async getPrinter(id: string): Promise<Printer | undefined> {
    const result = await this.request<CompletePrinter>(`/printers/${id}`);

    if (!result.success || !result.data) {
      return undefined;
    }

    return this.fromCompletePrinter(result.data);
  }

  async getAllPrinters(): Promise<Printer[]> {
    const result = await this.request<CompletePrinter[]>('/printers');

    if (!result.success || !result.data) {
      return [];
    }

    return result.data.map(p => this.fromCompletePrinter(p));
  }

  async getConnectedPrinters(): Promise<Printer[]> {
    const result = await this.request<CompletePrinter[]>('/printers');

    if (!result.success || !result.data) {
      return [];
    }

    return result.data
      .filter(p => p.printer.connection_status === ConnectionStatus.CONNECTED)
      .map(p => this.fromCompletePrinter(p));
  }

  async deletePrinter(id: string): Promise<void> {
    const result = await this.request(`/printers/${id}`, {
      method: 'DELETE',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete printer');
    }
  }

  async updatePrinterStatus(
    id: string,
    status: ConnectionStatus,
    error?: string
  ): Promise<void> {
    const updates: {
      connection_status: ConnectionStatus;
      updated_at: number;
      last_connected?: number;
      last_error?: string | null;
    } = {
      connection_status: status,
      updated_at: Date.now(),
    };

    if (status === ConnectionStatus.CONNECTED) {
      updates.last_connected = Date.now();
      updates.last_error = null;
    }

    if (error) {
      updates.last_error = error;
    }

    const result = await this.request(`/printers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to update printer status');
    }
  }

  // ========== COMMANDS ==========

  async saveCommand(command: Command, printerId: string): Promise<void> {
    const result = await this.request(`/printers/${printerId}/commands`, {
      method: 'POST',
      body: JSON.stringify(command),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to save command');
    }
  }

  async getCommandHistory(printerId: string, limit = 100): Promise<Command[]> {
    const result = await this.request<Command[]>(
      `/printers/${printerId}/commands?limit=${limit}`
    );

    if (!result.success || !result.data) {
      return [];
    }

    return result.data;
  }

  async clearCommandHistory(printerId: string): Promise<void> {
    const result = await this.request(`/printers/${printerId}/commands`, {
      method: 'DELETE',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to clear command history');
    }
  }

  // ========== LOGS ==========

  /**
   * Add a single log entry (deprecated - use addLogsBatch for better performance)
   */
  async addLog(log: LogEntry): Promise<void> {
    const result = await this.request('/logs', {
      method: 'POST',
      body: JSON.stringify(log),
    });

    if (!result.success) {
      logger.error('Failed to save log', result.error);
    }
  }

  /**
   * Add multiple log entries in a single request (optimized)
   */
  async addLogsBatch(logs: LogEntry[]): Promise<void> {
    if (logs.length === 0) {
      return;
    }

    const result = await this.request('/logs/batch', {
      method: 'POST',
      body: JSON.stringify(logs),
    });

    if (!result.success) {
      logger.error('Failed to save logs batch', result.error);
      throw new Error(result.error || 'Failed to save logs batch');
    }
  }

  async getLogs(filter?: LogFilter, limit = 1000): Promise<LogEntry[]> {
    const params = new URLSearchParams();

    if (filter?.printerId) params.append('printerId', filter.printerId);
    if (filter?.levels) params.append('levels', filter.levels.join(','));
    if (filter?.categories) params.append('categories', filter.categories.join(','));
    if (limit) params.append('limit', limit.toString());

    const result = await this.request<LogEntry[]>(`/logs?${params.toString()}`);

    if (!result.success || !result.data) {
      return [];
    }

    return result.data;
  }

  async clearLogs(printerId?: string): Promise<void> {
    const endpoint = printerId ? `/logs?printerId=${printerId}` : '/logs';

    const result = await this.request(endpoint, {
      method: 'DELETE',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to clear logs');
    }
  }

  // ========== STATS ==========

  async getStats(printerId: string): Promise<PrinterStats> {
    const result = await this.request<{
      total_commands: number;
      successful_commands: number;
      failed_commands: number;
      total_errors: number;
      total_connection_time: number;
      average_response_time: number;
      last_activity: number;
    }>(`/printers/${printerId}/stats`);

    if (!result.success || !result.data) {
      return {
        totalCommands: 0,
        successfulCommands: 0,
        failedCommands: 0,
        totalErrors: 0,
        totalConnectionTime: 0,
        averageResponseTime: 0,
        lastActivity: Date.now(),
      };
    }

    const data = result.data;
    return {
      totalCommands: data.total_commands || 0,
      successfulCommands: data.successful_commands || 0,
      failedCommands: data.failed_commands || 0,
      totalErrors: data.total_errors || 0,
      totalConnectionTime: data.total_connection_time || 0,
      averageResponseTime: data.average_response_time || 0,
      lastActivity: data.last_activity || Date.now(),
    };
  }

  /**
   * Increment command stats using optimized database-level operations
   * This method uses a dedicated increment endpoint that avoids read-modify-write
   */
  async incrementCommandStats(
    printerId: string,
    success: boolean,
    responseTime?: number
  ): Promise<void> {
    const result = await this.request(`/printers/${printerId}/stats/increment`, {
      method: 'POST',
      body: JSON.stringify({ success, responseTime }),
    });

    if (!result.success) {
      logger.error('Failed to increment stats', result.error);
    }
  }

  // ========== CONVERSION METHODS ==========

  /**
   * Convertir Printer (frontend) vers CompletePrinter (backend V2)
   */
  private toCompletePrinter(printer: Printer): CompletePrinter {
    const now = Date.now();

    return {
      printer: {
        id: printer.id,
        uuid: printer.uuid,
        name: printer.name,
        connection_status: printer.connectionStatus || ConnectionStatus.DISCONNECTED,
        last_connected: printer.lastConnected,
        last_error: printer.lastError,
        created_at: printer.createdAt,
        updated_at: printer.updatedAt || now,
      },
      config: {
        printer_id: printer.id,
        auto_reconnect: printer.config.autoReconnect ?? true,
        reconnect_delay: printer.config.reconnectDelay || 2000,
        max_reconnect_attempts: printer.config.maxReconnectAttempts || 5,
        command_timeout: printer.config.commandTimeout || 30000,
        keep_alive_interval: printer.config.keepAliveInterval || 60000,
        serial_options: printer.config.serialOptions,
        updated_at: now,
      },
      hardware: {
        printer_id: printer.id,
        vendor_id: printer.hardware.vendorId,
        product_id: printer.hardware.productId,
        manufacturer: printer.hardware.manufacturer,
        serial_number: printer.hardware.serialNumber,
        hardware_specs: {
          buildUUID: printer.hardware.buildUUID,
          machineName: printer.hardware.machineName,
          mainboard: printer.hardware.mainboard,
          extruders: printer.hardware.extruders,
          toolheads: printer.hardware.toolheads,
          printableArea: printer.hardware.printableArea,
          bedLeveling: printer.hardware.bedLeveling,
          meshPoints: printer.hardware.meshPoints,
          probeMargin: printer.hardware.probeMargin,
          zSteppers: printer.hardware.zSteppers,
          motionDrivers: printer.hardware.motionDrivers,
          zProbe: printer.hardware.zProbe,
          filamentRunoutSensor: printer.hardware.filamentRunoutSensor,
          powerLossRecovery: printer.hardware.powerLossRecovery,
          baudRate: printer.hardware.baudRate,
        },
        updated_at: now,
      },
      firmware: {
        printer_id: printer.id,
        name: printer.firmware.name,
        version: printer.firmware.version,
        build_date: printer.firmware.buildDate,
        capabilities: {
          machineType: printer.firmware.machineType,
          extruderCount: printer.firmware.extruderCount,
          uuid: printer.firmware.uuid,
          protocol: printer.firmware.protocol,
          capabilities: printer.firmware.capabilities,
        },
        updated_at: now,
      },
      port: {
        printer_id: printer.id,
        usb_vendor_id: printer.portInfo?.usbVendorId,
        usb_product_id: printer.portInfo?.usbProductId,
        updated_at: now,
      },
      state: {
        printer_id: printer.id,
        status: printer.state.status,
        // Temperature and position are NOT persisted (realtime only)
        updated_at: now,
      },
    };
  }

  /**
   * Convertir CompletePrinter (backend V2) vers Printer (frontend)
   */
  private fromCompletePrinter(data: CompletePrinter): Printer {
    const specs = data.hardware?.hardware_specs || {};
    const caps = data.firmware?.capabilities || {};

    // Parser les JSON si ce sont des strings
    let serialOptions = data.config?.serial_options;
    if (typeof serialOptions === 'string') {
      try {
        serialOptions = JSON.parse(serialOptions);
      } catch (e) {
        logger.warn('Failed to parse serial_options', e);
        serialOptions = undefined;
      }
    }

    return {
      id: data.printer.id,
      uuid: data.printer.uuid,
      name: data.printer.name,
      config: {
        id: data.printer.id,
        name: data.printer.name,
        serialOptions: serialOptions || {
          baudRate: 115200,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          flowControl: 'none',
          bufferSize: 255,
        },
        autoReconnect: data.config?.auto_reconnect ?? true,
        reconnectDelay: data.config?.reconnect_delay || 2000,
        maxReconnectAttempts: data.config?.max_reconnect_attempts || 5,
        commandTimeout: data.config?.command_timeout || 30000,
        keepAliveInterval: data.config?.keep_alive_interval || 60000,
      },
      hardware: {
        vendorId: data.hardware?.vendor_id,
        productId: data.hardware?.product_id,
        manufacturer: data.hardware?.manufacturer,
        serialNumber: data.hardware?.serial_number,
        buildUUID: specs.buildUUID,
        machineName: specs.machineName,
        mainboard: specs.mainboard,
        extruders: specs.extruders,
        toolheads: specs.toolheads,
        printableArea: specs.printableArea,
        bedLeveling: specs.bedLeveling,
        meshPoints: specs.meshPoints,
        probeMargin: specs.probeMargin,
        zSteppers: specs.zSteppers,
        motionDrivers: specs.motionDrivers,
        zProbe: specs.zProbe,
        filamentRunoutSensor: specs.filamentRunoutSensor,
        powerLossRecovery: specs.powerLossRecovery,
        baudRate: specs.baudRate,
      },
      firmware: {
        name: data.firmware?.name,
        version: data.firmware?.version,
        buildDate: data.firmware?.build_date,
        machineType: caps.machineType,
        extruderCount: caps.extruderCount,
        uuid: caps.uuid,
        protocol: caps.protocol,
        capabilities: caps.capabilities,
      },
      portInfo: {
        usbVendorId: data.port?.usb_vendor_id,
        usbProductId: data.port?.usb_product_id,
      },
      state: {
        status: data.state?.status,
        // Temperature and position not loaded from DB (realtime only)
      },
      connectionStatus: data.printer.connection_status as ConnectionStatus,
      lastConnected: data.printer.last_connected,
      lastError: data.printer.last_error,
      createdAt: data.printer.created_at,
      updatedAt: data.printer.updated_at,
    } as Printer;
  }

  // ========== PARAMETERS ==========

  /**
   * Get all parameter definitions
   */
  async getParameterDefinitions(category?: string): Promise<ParameterDefinition[]> {
    const endpoint = category
      ? `/parameter-definitions?category=${category}`
      : '/parameter-definitions';

    const result = await this.request<ParameterDefinition[]>(endpoint);

    if (!result.success || !result.data) {
      return [];
    }

    return result.data;
  }

  /**
   * Get all parameters for a printer (with userId)
   * Note: In production, userId should come from session/auth
   */
  async getPrinterParameters(
    printerId: string,
    userId: number = 1
  ): Promise<PrinterParameter[]> {
    const result = await this.request<PrinterParameter[]>(
      `/printers/${printerId}/parameters?userId=${userId}`
    );

    if (!result.success || !result.data) {
      return [];
    }

    return result.data;
  }

  /**
   * Get a specific parameter for a printer
   */
  async getPrinterParameter(
    printerId: string,
    parameterId: string,
    userId: number = 1
  ): Promise<PrinterParameter | undefined> {
    const result = await this.request<PrinterParameter>(
      `/printers/${printerId}/parameters/${parameterId}?userId=${userId}`
    );

    if (!result.success || !result.data) {
      return undefined;
    }

    return result.data;
  }

  /**
   * Set/update a parameter value for a printer
   */
  async setPrinterParameter(
    printerId: string,
    parameterId: string,
    value: any,
    userId: number = 1
  ): Promise<void> {
    const result = await this.request(`/printers/${printerId}/parameters/${parameterId}`, {
      method: 'PUT',
      body: JSON.stringify({ value, userId }),
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to set parameter');
    }
  }

  /**
   * Reset a parameter to its default value
   */
  async resetPrinterParameter(
    printerId: string,
    parameterId: string,
    userId: number = 1
  ): Promise<void> {
    const result = await this.request(
      `/printers/${printerId}/parameters/${parameterId}?userId=${userId}`,
      {
        method: 'DELETE',
      }
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to reset parameter');
    }
  }

  /**
   * Reset all parameters to their default values
   */
  async resetAllPrinterParameters(
    printerId: string,
    userId: number = 1
  ): Promise<void> {
    const result = await this.request(`/printers/${printerId}/parameters?userId=${userId}`, {
      method: 'DELETE',
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to reset all parameters');
    }
  }
}

export const apiService = ApiService.getInstance();
