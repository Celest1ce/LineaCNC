/**
 * Parser pour la réponse M990 (Marlin configuration report)
 * Extrait automatiquement tous les paramètres de l'imprimante
 */

import type { PrinterConfig } from '../types/printer-config';
import { DEFAULT_PRINTER_CONFIG } from '../types/printer-config';

/**
 * Parse la réponse M990 et extrait la configuration de l'imprimante
 */
export function parseM990Response(response: string): Partial<PrinterConfig> {
  const config: Partial<PrinterConfig> = {
    sourceCommand: 'M990',
    lastUpdated: new Date(),
  };

  const lines = response.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Machine name
    if (trimmed.includes('MACHINE_NAME') || trimmed.includes('Machine:')) {
      const match = trimmed.match(/[:=]\s*["']?([^"'\n]+)["']?/);
      if (match) config.machineName = match[1].trim();
    }

    // Firmware version
    if (trimmed.includes('FIRMWARE_VERSION') || trimmed.match(/Marlin\s+[\d.]+/i)) {
      const match = trimmed.match(/(?:VERSION|Marlin)\s*[:=]?\s*([\d.]+)/i);
      if (match) config.firmwareVersion = match[1];
    }

    // Bed size - X_BED_SIZE
    if (trimmed.includes('X_BED_SIZE') || trimmed.match(/X.*size/i)) {
      const match = trimmed.match(/[:=]\s*(\d+)/);
      if (match) {
        if (!config.dimensions) config.dimensions = { ...DEFAULT_PRINTER_CONFIG.dimensions };
        config.dimensions.x = parseInt(match[1], 10);
      }
    }

    // Bed size - Y_BED_SIZE
    if (trimmed.includes('Y_BED_SIZE') || trimmed.match(/Y.*size/i)) {
      const match = trimmed.match(/[:=]\s*(\d+)/);
      if (match) {
        if (!config.dimensions) config.dimensions = { ...DEFAULT_PRINTER_CONFIG.dimensions };
        config.dimensions.y = parseInt(match[1], 10);
      }
    }

    // Z max
    if (trimmed.includes('Z_MAX_POS') || trimmed.match(/Z.*max/i)) {
      const match = trimmed.match(/[:=]\s*(\d+)/);
      if (match) {
        if (!config.dimensions) config.dimensions = { ...DEFAULT_PRINTER_CONFIG.dimensions };
        config.dimensions.z = parseInt(match[1], 10);
      }
    }

    // Leveling type
    if (trimmed.includes('AUTO_BED_LEVELING_UBL') || trimmed.includes('UBL')) {
      config.levelingType = 'UBL';
    } else if (trimmed.includes('AUTO_BED_LEVELING_BILINEAR') || trimmed.includes('ABL')) {
      config.levelingType = 'ABL';
    }

    // Grid size - GRID_MAX_POINTS_X
    if (trimmed.includes('GRID_MAX_POINTS_X') || trimmed.match(/Grid.*X/i)) {
      const match = trimmed.match(/[:=]\s*(\d+)/);
      if (match) {
        if (!config.meshDimensions) config.meshDimensions = { ...DEFAULT_PRINTER_CONFIG.meshDimensions };
        config.meshDimensions.columns = parseInt(match[1], 10);
      }
    }

    // Grid size - GRID_MAX_POINTS_Y
    if (trimmed.includes('GRID_MAX_POINTS_Y') || trimmed.match(/Grid.*Y/i)) {
      const match = trimmed.match(/[:=]\s*(\d+)/);
      if (match) {
        if (!config.meshDimensions) config.meshDimensions = { ...DEFAULT_PRINTER_CONFIG.meshDimensions };
        config.meshDimensions.rows = parseInt(match[1], 10);
      }
    }

    // Probe margins - LEFT
    if (trimmed.includes('UBL_MESH_MIN_X') || trimmed.includes('MESH_MIN_X') || trimmed.match(/Probe.*left/i)) {
      const match = trimmed.match(/[:=]\s*([\d.]+)/);
      if (match) {
        if (!config.probeMargins) config.probeMargins = { ...DEFAULT_PRINTER_CONFIG.probeMargins };
        config.probeMargins.left = parseFloat(match[1]);
      }
    }

    // Probe margins - RIGHT (calculé depuis MESH_MAX_X)
    if (trimmed.includes('UBL_MESH_MAX_X') || trimmed.includes('MESH_MAX_X')) {
      const match = trimmed.match(/[:=]\s*([\d.]+)/);
      if (match && config.dimensions?.x) {
        if (!config.probeMargins) config.probeMargins = { ...DEFAULT_PRINTER_CONFIG.probeMargins };
        const maxX = parseFloat(match[1]);
        config.probeMargins.right = config.dimensions.x - maxX;
      }
    }

    // Probe margins - FRONT
    if (trimmed.includes('UBL_MESH_MIN_Y') || trimmed.includes('MESH_MIN_Y') || trimmed.match(/Probe.*front/i)) {
      const match = trimmed.match(/[:=]\s*([\d.]+)/);
      if (match) {
        if (!config.probeMargins) config.probeMargins = { ...DEFAULT_PRINTER_CONFIG.probeMargins };
        config.probeMargins.front = parseFloat(match[1]);
      }
    }

    // Probe margins - BACK (calculé depuis MESH_MAX_Y)
    if (trimmed.includes('UBL_MESH_MAX_Y') || trimmed.includes('MESH_MAX_Y')) {
      const match = trimmed.match(/[:=]\s*([\d.]+)/);
      if (match && config.dimensions?.y) {
        if (!config.probeMargins) config.probeMargins = { ...DEFAULT_PRINTER_CONFIG.probeMargins };
        const maxY = parseFloat(match[1]);
        config.probeMargins.back = config.dimensions.y - maxY;
      }
    }

    // Baudrate
    if (trimmed.includes('BAUDRATE')) {
      const match = trimmed.match(/[:=]\s*(\d+)/);
      if (match) config.baudrate = parseInt(match[1], 10);
    }

    // Extruders
    if (trimmed.includes('EXTRUDERS')) {
      const match = trimmed.match(/[:=]\s*(\d+)/);
      if (match) config.extruders = parseInt(match[1], 10);
    }
  }

  return config;
}

/**
 * Merge la configuration parsée avec la configuration par défaut
 */
export function mergeWithDefaults(parsed: Partial<PrinterConfig>): PrinterConfig {
  return {
    ...DEFAULT_PRINTER_CONFIG,
    ...parsed,
    dimensions: {
      ...DEFAULT_PRINTER_CONFIG.dimensions,
      ...parsed.dimensions,
    },
    meshDimensions: {
      ...DEFAULT_PRINTER_CONFIG.meshDimensions,
      ...parsed.meshDimensions,
    },
    probeMargins: {
      ...DEFAULT_PRINTER_CONFIG.probeMargins,
      ...parsed.probeMargins,
    },
  };
}

/**
 * Valide une configuration de l'imprimante
 */
export function validatePrinterConfig(config: PrinterConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.dimensions.x <= 0) errors.push('Dimension X invalide');
  if (config.dimensions.y <= 0) errors.push('Dimension Y invalide');
  if (config.dimensions.z <= 0) errors.push('Dimension Z invalide');

  if (config.meshDimensions.columns < 3) errors.push('Nombre de colonnes doit être ≥ 3');
  if (config.meshDimensions.rows < 3) errors.push('Nombre de lignes doit être ≥ 3');

  if (config.probeMargins.left < 0) errors.push('Marge gauche invalide');
  if (config.probeMargins.right < 0) errors.push('Marge droite invalide');
  if (config.probeMargins.front < 0) errors.push('Marge avant invalide');
  if (config.probeMargins.back < 0) errors.push('Marge arrière invalide');

  const totalMarginX = config.probeMargins.left + config.probeMargins.right;
  const totalMarginY = config.probeMargins.front + config.probeMargins.back;

  if (totalMarginX >= config.dimensions.x) {
    errors.push('Marges X trop grandes (dépassent la dimension du plateau)');
  }
  if (totalMarginY >= config.dimensions.y) {
    errors.push('Marges Y trop grandes (dépassent la dimension du plateau)');
  }

  return { valid: errors.length === 0, errors };
}
