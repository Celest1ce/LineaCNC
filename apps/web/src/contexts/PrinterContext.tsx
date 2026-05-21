/**
 * Context React pour la gestion des imprimantes
 * Fournit l'état global et les actions pour gérer les imprimantes
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  Printer,
  Command,
  LogEntry,
  PrinterEvent,
  PrinterEventPayload,
  ConnectionStatus,
  SerialPortOptions,
  LogFilter,
} from '../types/printer';
import { webSerial } from '../services/web-serial.service';
import { apiService } from '../services/api.service';
import { logger } from '../utils/logger';

interface PrinterContextValue {
  // État
  printers: Printer[];
  activePrinter: Printer | null;
  loading: boolean;
  error: string | null;

  // Actions de connexion
  requestConnection: (options?: Partial<SerialPortOptions>, name?: string) => Promise<Printer>;
  disconnectPrinter: (printerId: string) => Promise<void>;
  reconnectPrinter: (printerId: string) => Promise<void>;
  setActivePrinter: (printer: Printer | null) => void;

  // Actions de commande
  sendCommand: (printerId: string, command: string) => Promise<Command>;
  getCommandHistory: (printerId: string) => Promise<Command[]>;
  clearCommandHistory: (printerId: string) => Promise<void>;

  // Actions de logs
  getLogs: (filter?: LogFilter) => Promise<LogEntry[]>;
  clearLogs: (printerId?: string) => Promise<void>;

  // Utilitaires
  deletePrinter: (printerId: string) => Promise<void>;
  updatePrinterName: (printerId: string, name: string) => Promise<void>;
  isSupported: boolean;
}

const PrinterContext = createContext<PrinterContextValue | undefined>(undefined);

export const PrinterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [activePrinter, setActivePrinter] = useState<Printer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSupported] = useState(webSerial.isSupported());

  // Charger les imprimantes depuis la base de données au démarrage
  useEffect(() => {
    loadPrinters();
    // Reconnexion automatique des imprimantes précédemment connectées
    if (isSupported) {
      reconnectSavedPrinters();
    }
  }, []);

  // Écouter les événements des imprimantes
  useEffect(() => {
    const unsubscribers = [
      webSerial.on(PrinterEvent.CONNECTED, handlePrinterConnected),
      webSerial.on(PrinterEvent.DISCONNECTED, handlePrinterDisconnected),
      webSerial.on(PrinterEvent.RECONNECTING, handlePrinterReconnecting),
      webSerial.on(PrinterEvent.ERROR, handlePrinterError),
      webSerial.on(PrinterEvent.STATE_UPDATED, handleStateUpdated),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const loadPrinters = async () => {
    try {
      setLoading(true);
      const loadedPrinters = await apiService.getAllPrinters();
      setPrinters(loadedPrinters);

      // Restaurer les connexions actives
      const activePrinters = webSerial.getActivePrinters();
      if (activePrinters.length > 0) {
        setPrinters(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          activePrinters.forEach(ap => map.set(ap.id, ap));
          return Array.from(map.values());
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load printers');
    } finally {
      setLoading(false);
    }
  };

  const reconnectSavedPrinters = async () => {
    try {
      // Récupérer tous les ports série disponibles
      const availablePorts = await navigator.serial!.getPorts();

      // Récupérer les imprimantes sauvegardées
      const savedPrinters = await apiService.getAllPrinters();

      // Tenter de reconnecter chaque imprimante avec auto-reconnect activé
      for (const printer of savedPrinters) {
        if (printer.portInfo && printer.config.autoReconnect) {
          // Trouver le port correspondant
          const matchingPort = availablePorts.find(port => {
            const info = port.getInfo();
            return (
              info.usbVendorId === printer.portInfo?.usbVendorId &&
              info.usbProductId === printer.portInfo?.usbProductId
            );
          });

          if (matchingPort) {
            try {
              logger.info(`Auto-reconnecting to printer: ${printer.name}`);
              await webSerial.connectPrinter(
                matchingPort,
                printer.config.serialOptions,
                printer.name
              );
            } catch (error) {
              logger.error(`Auto-reconnect failed for printer ${printer.name}`, error);
              // Ne pas bloquer la reconnexion des autres imprimantes en cas d'erreur
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to auto-reconnect printers', error);
    }
  };

  // Gestionnaires d'événements
  const handlePrinterConnected = useCallback((payload: PrinterEventPayload) => {
    setPrinters(prev => {
      const index = prev.findIndex(p => p.id === payload.printerId);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = { ...updated[index], ...(payload.data as Partial<Printer>) };
        return updated;
      } else if (payload.data) {
        return [...prev, payload.data as Printer];
      }
      return prev;
    });
  }, []);

  const handlePrinterDisconnected = useCallback((payload: PrinterEventPayload) => {
    setPrinters(prev =>
      prev.map(p =>
        p.id === payload.printerId
          ? { ...p, connectionStatus: ConnectionStatus.DISCONNECTED }
          : p
      )
    );
  }, []);

  const handlePrinterReconnecting = useCallback((payload: PrinterEventPayload) => {
    setPrinters(prev =>
      prev.map(p =>
        p.id === payload.printerId
          ? { ...p, connectionStatus: ConnectionStatus.RECONNECTING }
          : p
      )
    );
  }, []);

  const handlePrinterError = useCallback((payload: PrinterEventPayload) => {
    setPrinters(prev =>
      prev.map(p =>
        p.id === payload.printerId
          ? {
              ...p,
              connectionStatus: ConnectionStatus.ERROR,
              lastError: (payload.data as { error?: string })?.error,
            }
          : p
      )
    );
  }, []);

  const handleStateUpdated = useCallback((payload: PrinterEventPayload) => {
    setPrinters(prev =>
      prev.map(p =>
        p.id === payload.printerId
          ? { ...p, ...(payload.data as Partial<Printer>), state: { ...p.state, ...(payload.data as Partial<Printer>)?.state } }
          : p
      )
    );

    // Mettre à jour l'imprimante active si c'est celle-ci
    setActivePrinter(prev => {
      if (prev && prev.id === payload.printerId) {
        return { ...prev, ...(payload.data as Partial<Printer>), state: { ...prev.state, ...(payload.data as Partial<Printer>)?.state } } as Printer;
      }
      return prev;
    });
  }, []);

  // Actions
  const requestConnection = useCallback(
    async (options?: Partial<SerialPortOptions>, name?: string): Promise<Printer> => {
      try {
        setError(null);
        const port = await webSerial.requestPort();

        if (!port) {
          throw new Error('No port selected');
        }

        const printer = await webSerial.connectPrinter(port, options, name);
        await loadPrinters(); // Recharger la liste
        return printer;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Connection failed';
        setError(errorMessage);
        throw err;
      }
    },
    []
  );

  const disconnectPrinter = useCallback(async (printerId: string) => {
    try {
      setError(null);
      await webSerial.disconnectPrinter(printerId);
      await loadPrinters();

      if (activePrinter?.id === printerId) {
        setActivePrinter(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Disconnection failed';
      setError(errorMessage);
      throw err;
    }
  }, [activePrinter]);

  const reconnectPrinter = useCallback(async (printerId: string) => {
    try {
      setError(null);
      await webSerial.reconnectPrinter(printerId);
      await loadPrinters();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reconnection failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const sendCommand = useCallback(async (printerId: string, command: string): Promise<Command> => {
    try {
      setError(null);
      return await webSerial.sendCommand(printerId, command);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Command failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const getCommandHistory = useCallback(async (printerId: string): Promise<Command[]> => {
    return await apiService.getCommandHistory(printerId);
  }, []);

  const clearCommandHistory = useCallback(async (printerId: string) => {
    await apiService.clearCommandHistory(printerId);
  }, []);

  const getLogs = useCallback(async (filter?: LogFilter): Promise<LogEntry[]> => {
    return await apiService.getLogs(filter);
  }, []);

  const clearLogs = useCallback(async (printerId?: string) => {
    await apiService.clearLogs(printerId);
  }, []);

  const deletePrinter = useCallback(async (printerId: string) => {
    try {
      setError(null);

      // Toujours déconnecter l'imprimante avant de la supprimer
      // Cela nettoie les ressources même si elle est déjà déconnectée
      await webSerial.disconnectPrinter(printerId);

      await apiService.deletePrinter(printerId);
      await loadPrinters();

      if (activePrinter?.id === printerId) {
        setActivePrinter(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Delete failed';
      setError(errorMessage);
      throw err;
    }
  }, [printers, activePrinter]);

  const updatePrinterName = useCallback(async (printerId: string, name: string) => {
    try {
      setError(null);
      const printer = await apiService.getPrinter(printerId);

      if (printer) {
        printer.name = name;
        printer.config.name = name;
        await apiService.savePrinter(printer);
        await loadPrinters();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const value: PrinterContextValue = {
    printers,
    activePrinter,
    loading,
    error,
    requestConnection,
    disconnectPrinter,
    reconnectPrinter,
    setActivePrinter,
    sendCommand,
    getCommandHistory,
    clearCommandHistory,
    getLogs,
    clearLogs,
    deletePrinter,
    updatePrinterName,
    isSupported,
  };

  return <PrinterContext.Provider value={value}>{children}</PrinterContext.Provider>;
};

export const usePrinter = () => {
  const context = useContext(PrinterContext);
  if (!context) {
    throw new Error('usePrinter must be used within a PrinterProvider');
  }
  return context;
};
