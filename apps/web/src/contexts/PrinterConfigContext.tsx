/**
 * Contexte pour la configuration de l'imprimante (M990, paramètres manuels, etc.)
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { PrinterConfig } from '../types/printer-config';
import { DEFAULT_PRINTER_CONFIG } from '../types/printer-config';
import { parseM990Response, mergeWithDefaults, validatePrinterConfig } from '../utils/m990-parser.utils';

interface PrinterConfigContextType {
  config: PrinterConfig;
  updateConfig: (partial: Partial<PrinterConfig>) => void;
  loadFromM990: (response: string) => { success: boolean; errors?: string[] };
  resetToDefaults: () => void;
  isValid: boolean;
  validationErrors: string[];
}

const PrinterConfigContext = createContext<PrinterConfigContextType | undefined>(undefined);

const STORAGE_KEY = 'lineatools_printer_config';

export const PrinterConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PrinterConfig>(() => {
    // Charger depuis localStorage si disponible
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored printer config:', e);
      }
    }
    return DEFAULT_PRINTER_CONFIG;
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);

  // Valider la configuration à chaque changement
  useEffect(() => {
    const validation = validatePrinterConfig(config);
    setIsValid(validation.valid);
    setValidationErrors(validation.errors);
  }, [config]);

  // Sauvegarder dans localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateConfig = useCallback((partial: Partial<PrinterConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...partial,
      dimensions: {
        ...prev.dimensions,
        ...partial.dimensions,
      },
      meshDimensions: {
        ...prev.meshDimensions,
        ...partial.meshDimensions,
      },
      probeMargins: {
        ...prev.probeMargins,
        ...partial.probeMargins,
      },
      lastUpdated: new Date(),
    }));
  }, []);

  const loadFromM990 = useCallback((response: string): { success: boolean; errors?: string[] } => {
    try {
      const parsed = parseM990Response(response);
      const merged = mergeWithDefaults(parsed);
      const validation = validatePrinterConfig(merged);

      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      setConfig(merged);
      return { success: true };
    } catch (error) {
      console.error('Failed to parse M990 response:', error);
      return {
        success: false,
        errors: ['Erreur lors du parsing de la réponse M990'],
      };
    }
  }, []);

  const resetToDefaults = useCallback(() => {
    setConfig({
      ...DEFAULT_PRINTER_CONFIG,
      lastUpdated: new Date(),
    });
  }, []);

  const value: PrinterConfigContextType = {
    config,
    updateConfig,
    loadFromM990,
    resetToDefaults,
    isValid,
    validationErrors,
  };

  return <PrinterConfigContext.Provider value={value}>{children}</PrinterConfigContext.Provider>;
};

export const usePrinterConfig = (): PrinterConfigContextType => {
  const context = useContext(PrinterConfigContext);
  if (context === undefined) {
    throw new Error('usePrinterConfig must be used within a PrinterConfigProvider');
  }
  return context;
};
