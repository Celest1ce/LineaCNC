/**
 * Utilitaires pour l'export de données de mesh
 */

import type { MeshData, MeshExportOptions } from '../types/mesh';

/**
 * Exporte le mesh au format CSV
 */
export function exportToCSV(mesh: MeshData, options: MeshExportOptions = { format: 'csv', includeMetadata: true, includeImputed: false }): string {
  const { width, height, values, metadata } = mesh;
  const lines: string[] = [];

  // Header avec metadata
  if (options.includeMetadata && metadata) {
    lines.push(`# Mesh Export - ${new Date().toISOString()}`);
    lines.push(`# X=${width}, Y=${height}`);

    if (metadata.inset !== undefined) {
      lines.push(`# INSET=${metadata.inset}`);
    }
    if (metadata.zOffset !== undefined) {
      lines.push(`# Z_OFFSET=${metadata.zOffset}`);
    }
    if (metadata.source) {
      lines.push(`# SOURCE=${metadata.source}`);
    }

    lines.push(''); // Ligne vide
  }

  // Données
  for (let y = 0; y < height; y++) {
    const row: string[] = [];
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const value = values[index];

      if (isFinite(value)) {
        row.push(value.toFixed(3));
      } else {
        row.push('');
      }
    }
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

/**
 * Exporte le mesh au format JSON (flat)
 */
export function exportToJSONFlat(mesh: MeshData, options: MeshExportOptions): string {
  const { width, height, values, metadata } = mesh;

  const data = {
    width,
    height,
    values: options.includeImputed
      ? Array.from(values)
      : Array.from(values).map(v => isFinite(v) ? v : null),
    ...(options.includeMetadata && metadata ? { metadata } : {}),
    exportDate: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Exporte le mesh au format JSON (grid)
 */
export function exportToJSONGrid(mesh: MeshData, options: MeshExportOptions): string {
  const { width, height, values, metadata } = mesh;

  const grid: (number | null)[][] = [];
  for (let y = 0; y < height; y++) {
    const row: (number | null)[] = [];
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const value = values[index];
      row.push(isFinite(value) ? value : null);
    }
    grid.push(row);
  }

  const data = {
    grid,
    ...(options.includeMetadata && metadata ? { metadata } : {}),
    exportDate: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Exporte le mesh selon le format spécifié
 */
export function exportMesh(mesh: MeshData, options: MeshExportOptions): string {
  switch (options.format) {
    case 'csv':
    case 'txt':
      return exportToCSV(mesh, options);

    case 'json':
      return options.jsonFormat === 'grid'
        ? exportToJSONGrid(mesh, options)
        : exportToJSONFlat(mesh, options);

    default:
      throw new Error(`Format d'export non supporté: ${options.format}`);
  }
}

/**
 * Télécharge le mesh exporté comme fichier
 */
export function downloadMeshFile(
  mesh: MeshData,
  options: MeshExportOptions,
  filename?: string
): void {
  const content = exportMesh(mesh, options);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

  const defaultFilename = `mesh_${Date.now()}.${options.format}`;
  const finalFilename = filename || defaultFilename;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse un fichier CSV/TXT importé
 */
export function parseCSV(content: string): MeshData | null {
  try {
    const lines = content.split('\n').map(line => line.trim());

    // Extraction de la metadata depuis les commentaires
    const metadata: Record<string, unknown> = {};
    let dataStartIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('#')) {
        // Parse metadata
        const metaMatch = line.match(/# (\w+)=([\d.]+)/);
        if (metaMatch) {
          const [, key, value] = metaMatch;
          metadata[key.toLowerCase()] = parseFloat(value) || value;
        }
      } else if (line.length > 0) {
        dataStartIndex = i;
        break;
      }
    }

    // Parse les lignes de données
    const dataLines = lines.slice(dataStartIndex).filter(l => l.length > 0);
    if (dataLines.length === 0) {
      return null;
    }

    // Détecte le délimiteur (virgule ou espace)
    const delimiter = dataLines[0].includes(',') ? ',' : /\s+/;

    const rows: number[][] = [];
    for (const line of dataLines) {
      const values = line.split(delimiter)
        .map(v => v.trim())
        .filter(v => v.length > 0)
        .map(v => {
          const parsed = parseFloat(v);
          return isNaN(parsed) ? NaN : parsed;
        });

      if (values.length > 0) {
        rows.push(values);
      }
    }

    if (rows.length === 0) {
      return null;
    }

    const height = rows.length;
    const width = Math.max(...rows.map(r => r.length));

    // Crée le tableau plat
    const values = new Float64Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = rows[y][x];
        values[y * width + x] = value !== undefined ? value : NaN;
      }
    }

    return {
      width,
      height,
      values,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };
  } catch (error) {
    console.error('Erreur lors du parsing CSV:', error);
    return null;
  }
}

/**
 * Parse un fichier JSON importé
 */
export function parseJSON(content: string): MeshData | null {
  try {
    const data = JSON.parse(content);

    // Format flat
    if (data.width && data.height && data.values) {
      return {
        width: data.width,
        height: data.height,
        values: new Float64Array(data.values),
        metadata: data.metadata,
      };
    }

    // Format grid
    if (data.grid && Array.isArray(data.grid)) {
      const height = data.grid.length;
      const width = data.grid[0]?.length || 0;
      const values = new Float64Array(width * height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const value = data.grid[y][x];
          values[y * width + x] = value !== null ? value : NaN;
        }
      }

      return {
        width,
        height,
        values,
        metadata: data.metadata,
      };
    }

    return null;
  } catch (error) {
    console.error('Erreur lors du parsing JSON:', error);
    return null;
  }
}

/**
 * Parse un fichier importé selon son extension
 */
export function parseMeshFile(content: string, filename: string): MeshData | null {
  const ext = filename.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'csv':
    case 'txt':
      return parseCSV(content);

    case 'json':
      return parseJSON(content);

    default:
      // Essaye de deviner le format
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        return parseJSON(content);
      } else {
        return parseCSV(content);
      }
  }
}
