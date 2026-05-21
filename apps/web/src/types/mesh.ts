/**
 * Types pour la visualisation de mesh 2D/3D
 */

export interface MeshData {
  width: number;
  height: number;
  values: Float64Array;
  imputed?: Uint8Array; // Marque les cellules comme imputées
  metadata?: MeshMetadata;
}

export interface MeshMetadata {
  inset?: number;
  zOffset?: number;
  timestamp?: string;
  source?: string;
  version?: string;
  [key: string]: unknown;
}

export interface MeshStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  imputedCount: number;
  missingCount: number;
}

export interface MeshSnapshot {
  width: number;
  height: number;
  values: Float64Array;
  imputed: Uint8Array;
  description: string;
  timestamp: number;
}

export interface MeshCellUpdate {
  x: number;
  y: number;
  value: number | null;
  markImputed?: boolean;
}

export interface ColorPalette {
  name: string;
  colors: string[];
}

export interface ColorScaleConfig {
  min: number;
  max: number;
  palette: ColorPalette | null;
  customGradient?: {
    negativeColor: string;
    positiveColor: string;
  };
  softness: number;
  missingColor: string;
}

export interface Camera3DState {
  azimuth: number;
  elevation: number;
  distance: number;
}

export interface MeshViewer3DConfig {
  smoothingLevel: number; // 0-3
  zScale: number; // 0.1-1.0 (échelle visuelle uniquement)
  showAxes: boolean;
  camera: Camera3DState;
}

export interface MeshExportOptions {
  format: 'csv' | 'json' | 'txt';
  includeMetadata: boolean;
  includeImputed: boolean;
  jsonFormat?: 'flat' | 'grid';
}

export type BrushMode = 'set' | 'clear';

export interface MeshEditorState {
  brushMode: BrushMode;
  paintValue: number;
  selectedCell: { x: number; y: number } | null;
  hoverCell: { x: number; y: number } | null;
}
