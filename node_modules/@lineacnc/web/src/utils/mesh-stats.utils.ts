/**
 * Utilitaires pour calculer les statistiques sur les données de mesh
 */

import type { MeshData, MeshStats } from '../types/mesh';

/**
 * Calcule les statistiques complètes d'un mesh
 */
export function calculateMeshStats(mesh: MeshData): MeshStats {
  const { values, imputed } = mesh;

  const finiteValues: number[] = [];
  let imputedCount = 0;
  let missingCount = 0;

  for (let i = 0; i < values.length; i++) {
    const value = values[i];

    if (!isFinite(value)) {
      missingCount++;
    } else {
      finiteValues.push(value);
      if (imputed && imputed[i] === 1) {
        imputedCount++;
      }
    }
  }

  if (finiteValues.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      imputedCount,
      missingCount,
    };
  }

  // Min/Max
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);

  // Mean
  const sum = finiteValues.reduce((acc, val) => acc + val, 0);
  const mean = sum / finiteValues.length;

  // Median
  const sorted = finiteValues.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  return {
    count: finiteValues.length,
    min,
    max,
    mean,
    median,
    imputedCount,
    missingCount,
  };
}

/**
 * Calcule la médiane d'un tableau de nombres
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calcule la moyenne d'un tableau de nombres
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((acc, val) => acc + val, 0) / values.length;
}

/**
 * Clamp une valeur entre min et max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Obtient les valeurs voisines d'une cellule dans un rayon donné
 */
export function getNeighborValues(
  mesh: MeshData,
  x: number,
  y: number,
  radius: number = 1,
  excludeImputed: boolean = true
): number[] {
  const { width, height, values, imputed } = mesh;
  const neighbors: number[] = [];

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;

      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const index = ny * width + nx;
        const value = values[index];

        if (isFinite(value)) {
          // Exclure les valeurs imputées si demandé
          if (excludeImputed && imputed && imputed[index] === 1) {
            continue;
          }
          neighbors.push(value);
        }
      }
    }
  }

  return neighbors;
}

/**
 * Estime une valeur manquante via ajustement planaire (régression linéaire)
 * Retourne null si l'ajustement échoue
 */
export function estimateViaPlaneFit(
  mesh: MeshData,
  x: number,
  y: number,
  maxRadius: number = 3
): number | null {
  const samples: { x: number; y: number; z: number }[] = [];

  // Collecte les échantillons dans le voisinage
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (nx >= 0 && nx < mesh.width && ny >= 0 && ny < mesh.height) {
          const index = ny * mesh.width + nx;
          const value = mesh.values[index];

          // Exclure les valeurs imputées
          if (isFinite(value) && (!mesh.imputed || mesh.imputed[index] === 0)) {
            samples.push({ x: nx, y: ny, z: value });
          }
        }
      }
    }

    // Si on a assez d'échantillons, on peut faire l'ajustement
    if (samples.length >= 3) break;
  }

  if (samples.length < 3) {
    return null;
  }

  // Régression linéaire: z = a*x + b*y + c
  // Utilise la méthode des moindres carrés
  try {
    const n = samples.length;
    let sumX = 0, sumY = 0, sumZ = 0;
    let sumXX = 0, sumYY = 0, sumXY = 0;
    let sumXZ = 0, sumYZ = 0;

    for (const sample of samples) {
      sumX += sample.x;
      sumY += sample.y;
      sumZ += sample.z;
      sumXX += sample.x * sample.x;
      sumYY += sample.y * sample.y;
      sumXY += sample.x * sample.y;
      sumXZ += sample.x * sample.z;
      sumYZ += sample.y * sample.z;
    }

    // Matrice des coefficients (système 3x3)
    const denom = n * (sumXX * sumYY - sumXY * sumXY) -
                   sumX * (sumX * sumYY - sumY * sumXY) +
                   sumY * (sumX * sumXY - sumY * sumXX);

    if (Math.abs(denom) < 1e-10) {
      return null; // Système singulier
    }

    const a = (n * (sumXZ * sumYY - sumYZ * sumXY) -
               sumX * (sumZ * sumYY - sumY * sumYZ) +
               sumY * (sumZ * sumXY - sumY * sumXZ)) / denom;

    const b = (n * (sumXX * sumYZ - sumXY * sumXZ) -
               sumX * (sumX * sumYZ - sumY * sumXZ) +
               sumY * (sumX * sumXZ - sumZ * sumXX)) / denom;

    const c = (sumZ - a * sumX - b * sumY) / n;

    // Estime la valeur à (x, y)
    return a * x + b * y + c;
  } catch {
    return null;
  }
}

/**
 * Obtient la valeur d'une cellule dans le mesh
 */
export function getCellValue(mesh: MeshData, x: number, y: number): number {
  const index = y * mesh.width + x;
  return mesh.values[index];
}

/**
 * Définit la valeur d'une cellule dans le mesh
 */
export function setCellValue(
  mesh: MeshData,
  x: number,
  y: number,
  value: number,
  markImputed: boolean = false
): void {
  const index = y * mesh.width + x;
  mesh.values[index] = value;

  if (mesh.imputed && markImputed) {
    mesh.imputed[index] = 1;
  }
}

/**
 * Vérifie si une cellule est marquée comme imputée
 */
export function isCellImputed(mesh: MeshData, x: number, y: number): boolean {
  if (!mesh.imputed) return false;
  const index = y * mesh.width + x;
  return mesh.imputed[index] === 1;
}

/**
 * Vérifie si une cellule a une valeur manquante
 */
export function isCellMissing(mesh: MeshData, x: number, y: number): boolean {
  const value = getCellValue(mesh, x, y);
  return !isFinite(value);
}
