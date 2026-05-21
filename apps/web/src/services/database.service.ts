/**
 * Service de persistance avec IndexedDB via Dexie
 * Gère le stockage des imprimantes, commandes, logs et statistiques
 */

import Dexie, { Table } from 'dexie';
import {
  Printer,
  Command,
  LogEntry,
  PrinterStats,
  LogFilter,
  ConnectionStatus,
} from '../types/printer';

// Structure de la base de données
export class PrinterDatabase extends Dexie {
  printers!: Table<Printer, string>;
  commands!: Table<Command, string>;
  logs!: Table<LogEntry, string>;
  stats!: Table<PrinterStats & { printerId: string }, string>;

  constructor() {
    super('PrinterManagementDB');

    this.version(1).stores({
      printers: 'id, uuid, name, connectionStatus, lastConnected, createdAt',
      commands: 'id, printerId, timestamp, status',
      logs: 'id, printerId, timestamp, level, category',
      stats: 'printerId, lastActivity',
    });
  }
}

// Instance unique de la base de données
export const db = new PrinterDatabase();

/**
 * Service de gestion de la base de données
 */
export class DatabaseService {
  private static instance: DatabaseService;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ========== GESTION DES IMPRIMANTES ==========

  async savePrinter(printer: Printer): Promise<void> {
    // Nettoyer les données de runtime avant de sauvegarder
    const printerToSave = { ...printer };
    delete printerToSave.port;
    delete printerToSave.reader;
    delete printerToSave.writer;
    delete printerToSave.reconnectAttempts;

    // Ne pas stocker les données temps réel (température, position)
    // Ces données seront rafraîchies à la reconnexion
    if (printerToSave.state) {
      const stateCopy = { ...printerToSave.state };
      delete stateCopy.temperature;
      delete stateCopy.position;
      printerToSave.state = stateCopy;
    }

    printerToSave.updatedAt = Date.now();

    await db.printers.put(printerToSave);
  }

  async getPrinter(id: string): Promise<Printer | undefined> {
    return await db.printers.get(id);
  }

  async getAllPrinters(): Promise<Printer[]> {
    return await db.printers.toArray();
  }

  async getConnectedPrinters(): Promise<Printer[]> {
    return await db.printers
      .where('connectionStatus')
      .equals(ConnectionStatus.CONNECTED)
      .toArray();
  }

  async deletePrinter(id: string): Promise<void> {
    await db.transaction('rw', [db.printers, db.commands, db.logs, db.stats], async () => {
      // Supprimer l'imprimante
      await db.printers.delete(id);

      // Supprimer les commandes associées
      await db.commands.where('printerId').equals(id).delete();

      // Supprimer les logs associés
      await db.logs.where('printerId').equals(id).delete();

      // Supprimer les statistiques
      await db.stats.delete(id);
    });
  }

  async updatePrinterStatus(
    id: string,
    status: ConnectionStatus,
    error?: string
  ): Promise<void> {
    const printer = await this.getPrinter(id);
    if (printer) {
      printer.connectionStatus = status;
      if (error) {
        printer.lastError = error;
      }
      if (status === ConnectionStatus.CONNECTED) {
        printer.lastConnected = Date.now();
        printer.lastError = undefined;
      }
      await this.savePrinter(printer);
    }
  }

  // ========== GESTION DES COMMANDES ==========

  async saveCommand(command: Command, printerId: string): Promise<void> {
    await db.commands.add({ ...command, printerId } as Command & { printerId: string });
  }

  async updateCommand(id: string, updates: Partial<Command>): Promise<void> {
    await db.commands.update(id, updates);
  }

  async getCommandHistory(printerId: string, limit = 100): Promise<Command[]> {
    return await db.commands
      .where('printerId')
      .equals(printerId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  async getAllCommands(printerId: string): Promise<Command[]> {
    return await db.commands.where('printerId').equals(printerId).toArray();
  }

  async clearCommandHistory(printerId: string): Promise<void> {
    await db.commands.where('printerId').equals(printerId).delete();
  }

  // ========== GESTION DES LOGS ==========

  async addLog(log: LogEntry): Promise<void> {
    await db.logs.add(log);

    // Nettoyer automatiquement les vieux logs (garder max 10000 entrées)
    const count = await db.logs.count();
    if (count > 10000) {
      const oldLogs = await db.logs.orderBy('timestamp').limit(count - 10000).toArray();
      await db.logs.bulkDelete(oldLogs.map(l => l.id));
    }
  }

  async getLogs(filter?: LogFilter, limit = 1000): Promise<LogEntry[]> {
    let query = db.logs.orderBy('timestamp').reverse();

    if (filter?.printerId) {
      const logs = await query.toArray();
      return logs
        .filter(log => {
          if (filter.printerId && log.printerId !== filter.printerId) return false;
          if (filter.levels && !filter.levels.includes(log.level)) return false;
          if (filter.categories && !filter.categories.includes(log.category)) return false;
          if (filter.startDate && log.timestamp < filter.startDate) return false;
          if (filter.endDate && log.timestamp > filter.endDate) return false;
          if (filter.searchTerm && !log.message.toLowerCase().includes(filter.searchTerm.toLowerCase())) {
            return false;
          }
          return true;
        })
        .slice(0, limit);
    }

    return await query.limit(limit).toArray();
  }

  async clearLogs(printerId?: string): Promise<void> {
    if (printerId) {
      await db.logs.where('printerId').equals(printerId).delete();
    } else {
      await db.logs.clear();
    }
  }

  // ========== GESTION DES STATISTIQUES ==========

  async getStats(printerId: string): Promise<PrinterStats> {
    const stats = await db.stats.get(printerId);
    if (stats) {
      const { printerId: _, ...statsData } = stats;
      return statsData;
    }

    // Statistiques par défaut
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

  async updateStats(printerId: string, updates: Partial<PrinterStats>): Promise<void> {
    const currentStats = await this.getStats(printerId);
    const updatedStats = { ...currentStats, ...updates };

    await db.stats.put({ printerId, ...updatedStats });
  }

  async incrementCommandStats(
    printerId: string,
    success: boolean,
    responseTime?: number
  ): Promise<void> {
    const stats = await this.getStats(printerId);

    stats.totalCommands += 1;
    if (success) {
      stats.successfulCommands += 1;
    } else {
      stats.failedCommands += 1;
    }

    if (responseTime) {
      const totalResponses = stats.successfulCommands || 1;
      stats.averageResponseTime =
        (stats.averageResponseTime * (totalResponses - 1) + responseTime) / totalResponses;
    }

    stats.lastActivity = Date.now();

    await this.updateStats(printerId, stats);
  }

  // ========== UTILITAIRES ==========

  async exportData(): Promise<{
    printers: Printer[];
    commands: Command[];
    logs: LogEntry[];
    stats: (PrinterStats & { printerId: string })[];
  }> {
    return {
      printers: await db.printers.toArray(),
      commands: await db.commands.toArray(),
      logs: await db.logs.toArray(),
      stats: await db.stats.toArray(),
    };
  }

  async importData(data: {
    printers?: Printer[];
    commands?: Command[];
    logs?: LogEntry[];
    stats?: (PrinterStats & { printerId: string })[];
  }): Promise<void> {
    await db.transaction('rw', [db.printers, db.commands, db.logs, db.stats], async () => {
      if (data.printers) {
        await db.printers.bulkPut(data.printers);
      }
      if (data.commands) {
        await db.commands.bulkPut(data.commands);
      }
      if (data.logs) {
        await db.logs.bulkPut(data.logs);
      }
      if (data.stats) {
        await db.stats.bulkPut(data.stats);
      }
    });
  }

  async clearAllData(): Promise<void> {
    await db.transaction('rw', [db.printers, db.commands, db.logs, db.stats], async () => {
      await db.printers.clear();
      await db.commands.clear();
      await db.logs.clear();
      await db.stats.clear();
    });
  }

  async getStorageSize(): Promise<{ usage: number; quota: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return null;
  }
}

// Export de l'instance unique
export const dbService = DatabaseService.getInstance();
