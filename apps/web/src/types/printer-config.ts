/**
 * Types pour la configuration de l'imprimante (issus de M990, M503, etc.)
 */

export interface PrinterDimensions {
  x: number; // Taille d'impression X (mm)
  y: number; // Taille d'impression Y (mm)
  z: number; // Taille d'impression Z (mm)
}

export interface ProbeMargins {
  left: number;   // Marge gauche (mm)
  right: number;  // Marge droite (mm)
  front: number;  // Marge avant (mm)
  back: number;   // Marge arrière (mm)
}

export interface MeshDimensions {
  columns: number; // Nombre de colonnes (X)
  rows: number;    // Nombre de lignes (Y)
}

export interface PrinterConfig {
  // Informations générales
  machineName: string;
  firmwareVersion: string;
  firmwareType: 'Marlin' | 'RepRap' | 'Klipper' | 'Other';

  // Dimensions du plateau
  dimensions: PrinterDimensions;

  // Configuration du leveling
  levelingType: 'UBL' | 'ABL' | 'Manual' | 'None';
  meshDimensions: MeshDimensions;
  probeMargins: ProbeMargins;

  // Configuration série
  baudrate: number;

  // Informations optionnelles
  driverType?: string;
  extruders?: number;
  heatedBed?: boolean;
  autoLevelingEnabled?: boolean;

  // Source de la configuration
  sourceCommand?: string; // 'M990', 'M503', ou 'manual'
  lastUpdated?: Date;
}

/**
 * Configuration par défaut pour une imprimante type Ender-3 Max
 */
export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  machineName: 'Ender-3 Max',
  firmwareVersion: 'Unknown',
  firmwareType: 'Marlin',

  dimensions: {
    x: 300,
    y: 300,
    z: 340,
  },

  levelingType: 'UBL',
  meshDimensions: {
    columns: 7,
    rows: 7,
  },
  probeMargins: {
    left: 20,
    right: 20,
    front: 20,
    back: 20,
  },

  baudrate: 115200,
  extruders: 1,
  heatedBed: true,
  autoLevelingEnabled: true,

  sourceCommand: 'manual',
  lastUpdated: new Date(),
};

/**
 * Calcule la position réelle (X, Y) d'un point de mesh
 */
export function calculateMeshPointPosition(
  gridX: number,
  gridY: number,
  config: PrinterConfig
): { x: number; y: number } {
  const { dimensions, meshDimensions, probeMargins } = config;

  // Zone accessible au probe
  const probeableX = dimensions.x - probeMargins.left - probeMargins.right;
  const probeableY = dimensions.y - probeMargins.front - probeMargins.back;

  // Espacement entre les points
  const stepX = probeableX / (meshDimensions.columns - 1);
  const stepY = probeableY / (meshDimensions.rows - 1);

  // Position réelle
  const x = probeMargins.left + gridX * stepX;
  const y = probeMargins.front + gridY * stepY;

  return { x, y };
}

/**
 * Vérifie si une position est dans les limites du plateau
 */
export function isPositionValid(
  x: number,
  y: number,
  config: PrinterConfig
): boolean {
  return (
    x >= config.probeMargins.left &&
    x <= config.dimensions.x - config.probeMargins.right &&
    y >= config.probeMargins.front &&
    y <= config.dimensions.y - config.probeMargins.back
  );
}
