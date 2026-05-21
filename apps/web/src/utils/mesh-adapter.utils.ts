/**
 * Adaptateur pour convertir entre BedMeshData (ancien format) et MeshData (nouveau format)
 */

import type { BedMeshData } from '../types/printer';
import type { MeshData } from '../types/mesh';

/**
 * Convertit BedMeshData vers MeshData
 */
export function bedMeshToMeshData(bedMesh: BedMeshData): MeshData {
  const { mesh } = bedMesh;

  if (!mesh || mesh.length === 0) {
    throw new Error('Bed mesh data is empty');
  }

  const height = mesh.length;
  const width = mesh[0]?.length || 0;

  if (width === 0) {
    throw new Error('Bed mesh has no columns');
  }

  // Crée le tableau plat de valeurs
  const values = new Float64Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = mesh[y][x];
      values[y * width + x] = value !== null ? value : NaN;
    }
  }

  return {
    width,
    height,
    values,
    metadata: {
      source: bedMesh.probingMode || 'Unknown',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Convertit MeshData vers BedMeshData
 */
export function meshDataToBedMesh(meshData: MeshData): BedMeshData {
  const { width, height, values } = meshData;

  // Crée la matrice 2D
  const mesh: (number | null)[][] = [];
  let min = Infinity;
  let max = -Infinity;

  for (let y = 0; y < height; y++) {
    const row: (number | null)[] = [];
    for (let x = 0; x < width; x++) {
      const value = values[y * width + x];

      if (isFinite(value)) {
        row.push(value);
        min = Math.min(min, value);
        max = Math.max(max, value);
      } else {
        row.push(null);
      }
    }
    mesh.push(row);
  }

  return {
    size: height,
    probingMode: (meshData.metadata?.source as string) || 'Unknown',
    mesh,
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
    meshPoints: {
      x: width,
      y: height,
    },
  };
}
