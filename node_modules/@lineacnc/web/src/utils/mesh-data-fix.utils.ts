/**
 * Utilitaires pour la correction et l'imputation des données de mesh
 * Basé sur plane-fitting avec contraintes physiques pour respecter les surfaces planes
 */

import type { MeshData, MeshCellUpdate } from '../types/mesh';
import { median } from './mesh-stats.utils';

export interface DataFixPreview {
  updates: MeshCellUpdate[];
  fixedCount: number;
  method: 'plane-fit' | 'median' | 'global-median';
}

interface NeighborhoodSample {
  x: number;
  y: number;
  value: number;
}

interface GlobalOrientation {
  gradientX: number; // Pente en X (∂z/∂x)
  gradientY: number; // Pente en Y (∂z/∂y)
  dominant: 'x' | 'y' | 'diagonal' | 'flat'; // Direction dominante
}

/**
 * Détecte l'orientation globale de l'inclinaison du plateau
 * Utilise un plane-fit global pour trouver les gradients dominants
 */
function detectGlobalOrientation(
  values: Float64Array,
  width: number,
  height: number
): GlobalOrientation {
  const samples: NeighborhoodSample[] = [];

  // Collecte tous les points valides
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const value = values[idx];
      if (isFinite(value)) {
        samples.push({ x, y, value });
      }
    }
  }

  if (samples.length < 3) {
    return { gradientX: 0, gradientY: 0, dominant: 'flat' };
  }

  // Plane-fit global pour obtenir les gradients
  let sumX = 0, sumY = 0, sumZ = 0;
  let sumXX = 0, sumYY = 0, sumXY = 0;
  let sumXZ = 0, sumYZ = 0;

  for (const sample of samples) {
    sumX += sample.x;
    sumY += sample.y;
    sumZ += sample.value;
    sumXX += sample.x * sample.x;
    sumYY += sample.y * sample.y;
    sumXY += sample.x * sample.y;
    sumXZ += sample.x * sample.value;
    sumYZ += sample.y * sample.value;
  }

  const n = samples.length;
  const solution = solveSymmetric3x3(
    sumXX, sumXY, sumX,
    sumYY, sumY,
    n,
    sumXZ, sumYZ, sumZ
  );

  if (!solution) {
    return { gradientX: 0, gradientY: 0, dominant: 'flat' };
  }

  const [gradientX, gradientY] = solution;
  const absX = Math.abs(gradientX);
  const absY = Math.abs(gradientY);

  // Détermine la direction dominante
  let dominant: 'x' | 'y' | 'diagonal' | 'flat';

  if (absX < 0.01 && absY < 0.01) {
    dominant = 'flat'; // Plateau presque plat
  } else if (absX > absY * 2) {
    dominant = 'x'; // Inclinaison dominante en X
  } else if (absY > absX * 2) {
    dominant = 'y'; // Inclinaison dominante en Y
  } else {
    dominant = 'diagonal'; // Inclinaison diagonale
  }

  return { gradientX, gradientY, dominant };
}

/**
 * Génère un aperçu des corrections proposées pour les valeurs manquantes/imputées
 * Respecte toutes les valeurs mesurées par l'imprimante (même aberrantes)
 */
export function generateDataFixPreview(
  mesh: MeshData,
  options: {
    fixMissing?: boolean;
    fixImputed?: boolean;
  } = {}
): DataFixPreview {
  const {
    fixMissing = true,
    fixImputed = false,
  } = options;

  const { width, height, values, imputed } = mesh;
  const total = width * height;

  // Crée une copie des valeurs pour résolution progressive
  const resolved = new Float64Array(total);
  const missingMask = new Uint8Array(total);
  const imputedMask = new Uint8Array(total);
  const finiteSamples: number[] = [];
  const pending: number[] = [];

  // Initialise les masques et collecte les échantillons
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const value = values[idx];

      if (isFinite(value)) {
        resolved[idx] = value;
        // Toutes les valeurs mesurées par l'imprimante sont utilisées comme échantillons
        // (même celles qui semblent aberrantes - c'est la réalité du plateau)
        if (!imputed || imputed[idx] === 0) {
          finiteSamples.push(value);
        }
      } else {
        resolved[idx] = NaN;
        missingMask[idx] = 1;
      }

      if (imputed && imputed[idx] !== 0) {
        imputedMask[idx] = 1;
      }

      // Détermine si cette cellule doit être corrigée
      const shouldFix =
        (fixMissing && missingMask[idx] === 1) ||
        (fixImputed && imputedMask[idx] === 1);

      if (shouldFix) {
        pending.push(idx);
        // Si on re-corrige une valeur imputée, la marquer comme invalide dans resolved
        if (imputedMask[idx] === 1) {
          resolved[idx] = NaN;
        }
      }
    }
  }

  if (pending.length === 0) {
    return { updates: [], fixedCount: 0, method: 'plane-fit' };
  }

  // Calcule la médiane globale comme fallback
  const fallback = finiteSamples.length > 0 ? median(finiteSamples) : 0;
  const updates: MeshCellUpdate[] = [];

  // Rayon adaptatif basé sur la taille du mesh
  const meshSize = Math.min(width, height);
  const maxRadius = Math.max(2, Math.min(8, Math.ceil(meshSize / 6)));

  // Détecte l'orientation globale de l'inclinaison du plateau
  const globalOrientation = detectGlobalOrientation(resolved, width, height);

  // Corrige chaque cellule en attente
  for (const idx of pending) {
    const x = idx % width;
    const y = Math.floor(idx / width);

    // Collecte les échantillons du voisinage (en spirale)
    const samples = collectNeighborhoodSamples(
      resolved,
      width,
      height,
      x,
      y,
      maxRadius
    );

    // Estime la valeur via plane-fit avec orientation-aware weighting
    let estimatedValue = estimatePlaneValue(samples, x, y, globalOrientation);

    // Fallback sur médiane locale si plane-fit échoue
    if (!isFinite(estimatedValue)) {
      const sampleValues = samples.map(s => s.value);
      estimatedValue = sampleValues.length > 0 ? median(sampleValues) : fallback;
    }

    // Fallback final sur médiane globale
    if (!isFinite(estimatedValue)) {
      estimatedValue = fallback;
    }

    if (!isFinite(estimatedValue)) {
      continue; // Impossible de corriger cette cellule
    }

    updates.push({
      x,
      y,
      value: estimatedValue,
      markImputed: true,
    });

    // Met à jour resolved pour que les prochaines cellules puissent utiliser cette valeur
    resolved[idx] = estimatedValue;
  }

  return {
    updates,
    fixedCount: updates.length,
    method: updates.length > 0 ? 'plane-fit' : 'global-median',
  };
}

/**
 * Collecte les échantillons du voisinage en spirale (par radius croissant)
 * S'arrête dès qu'on a au moins 3 échantillons valides
 */
function collectNeighborhoodSamples(
  resolved: Float64Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  maxRadius: number
): NeighborhoodSample[] {
  const samples: NeighborhoodSample[] = [];
  const seen = new Set<number>();
  const minimumSamples = 3;

  for (let radius = 1; radius <= maxRadius; radius++) {
    // Parcours en "carré" autour du centre
    for (let y = Math.max(0, cy - radius); y <= Math.min(height - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(width - 1, cx + radius); x++) {
        // Distance de Manhattan pour parcourir en spirale
        const manhattan = Math.abs(cx - x) + Math.abs(cy - y);
        if (manhattan > radius || manhattan < radius - 1) {
          continue;
        }

        if (x === cx && y === cy) {
          continue; // Skip la cellule centrale
        }

        const idx = y * width + x;
        if (seen.has(idx)) {
          continue;
        }

        seen.add(idx);
        const value = resolved[idx];

        if (isFinite(value)) {
          samples.push({ x, y, value });
        }
      }
    }

    // Arrête dès qu'on a assez d'échantillons
    if (samples.length >= minimumSamples) {
      break;
    }
  }

  return samples;
}

/**
 * Estime la valeur en (targetX, targetY) via plane-fit avec contraintes physiques
 * Respecte la pente maximale observée et privilégie les échantillons alignés avec l'inclinaison
 */
function estimatePlaneValue(
  samples: NeighborhoodSample[],
  targetX: number,
  targetY: number,
  orientation: GlobalOrientation
): number {
  if (samples.length < 3) {
    return NaN;
  }

  // Calcule les statistiques pour le plane fit avec pondération adaptative
  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;
  let sumXZ = 0;
  let sumYZ = 0;
  let sumWeights = 0;

  for (const sample of samples) {
    const { x, y, value } = sample;
    const dx = x - targetX;
    const dy = y - targetY;
    const distance = Math.hypot(dx, dy);

    // Poids de base : inverse du carré de la distance
    let weight = 1 / (distance * distance + 0.1);

    // Bonus selon l'orientation dominante
    if (orientation.dominant === 'x') {
      // Privilégie les voisins horizontaux (même Y)
      const alignX = Math.abs(dy) < 0.5 ? 2.0 : 1.0;
      weight *= alignX;
    } else if (orientation.dominant === 'y') {
      // Privilégie les voisins verticaux (même X)
      const alignY = Math.abs(dx) < 0.5 ? 2.0 : 1.0;
      weight *= alignY;
    } else if (orientation.dominant === 'diagonal') {
      // Privilégie les voisins diagonaux (|dx| ≈ |dy|)
      const alignDiag = Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.5 ? 1.5 : 1.0;
      weight *= alignDiag;
    }
    // Si 'flat', pas de bonus - tous les poids égaux

    sumX += x * weight;
    sumY += y * weight;
    sumZ += value * weight;
    sumXX += x * x * weight;
    sumYY += y * y * weight;
    sumXY += x * y * weight;
    sumXZ += x * value * weight;
    sumYZ += y * value * weight;
    sumWeights += weight;
  }

  // Normalise les statistiques par les poids totaux (pour weighted least squares)
  const n = sumWeights;

  // Résout le système 3x3 pour trouver les coefficients du plan: z = a*x + b*y + c
  const solution = solveSymmetric3x3(
    sumXX, sumXY, sumX,
    sumYY, sumY,
    n,
    sumXZ, sumYZ, sumZ
  );

  if (!solution) {
    return NaN;
  }

  let [a, b, c] = solution;

  const meanX = sumX / n;
  const meanY = sumY / n;
  const meanZ = sumZ / n;

  // Calcule le gradient (pente) du plan
  const gradient = Math.hypot(a, b);

  // Calcule la pente maximale observée dans les données
  let maxObservedSlope = 0;
  for (let i = 0; i < samples.length; i++) {
    const sampleA = samples[i];
    for (let j = i + 1; j < samples.length; j++) {
      const sampleB = samples[j];
      const dx = sampleA.x - sampleB.x;
      const dy = sampleA.y - sampleB.y;
      const distance = Math.hypot(dx, dy);

      if (distance === 0) continue;

      const slope = Math.abs(sampleA.value - sampleB.value) / distance;
      if (slope > maxObservedSlope) {
        maxObservedSlope = slope;
      }
    }
  }

  // Si tous les échantillons ont la même valeur, retourne cette valeur
  if (maxObservedSlope === 0) {
    return meanZ;
  }

  // CONTRAINTE PHYSIQUE: Le gradient du plan ne doit pas dépasser la pente maximale observée
  // Ajout d'une marge de 5% pour tolérer de légères variations
  if (isFinite(gradient) && gradient > maxObservedSlope * 1.05) {
    const scale = maxObservedSlope / gradient;
    a = a * scale;
    b = b * scale;
    c = meanZ - a * meanX - b * meanY;
  }

  // Prédiction via le plan ajusté
  let predicted = a * targetX + b * targetY + c;

  if (!isFinite(predicted)) {
    return NaN;
  }

  // CONTRAINTE PHYSIQUE: Clamp la valeur prédite dans la plage [min, max] des échantillons
  let minValue = Infinity;
  let maxValue = -Infinity;
  for (const sample of samples) {
    if (sample.value < minValue) minValue = sample.value;
    if (sample.value > maxValue) maxValue = sample.value;
  }

  if (minValue <= maxValue) {
    if (predicted < minValue) {
      predicted = minValue;
    } else if (predicted > maxValue) {
      predicted = maxValue;
    }
  }

  return predicted;
}

/**
 * Résout un système linéaire 3x3 symétrique via élimination de Gauss avec pivot partiel
 * Matrice: [[a11, a12, a13], [a12, a22, a23], [a13, a23, a33]]
 * Second membre: [b1, b2, b3]
 * Retourne: [x1, x2, x3] ou null si singulier
 */
function solveSymmetric3x3(
  a11: number,
  a12: number,
  a13: number,
  a22: number,
  a23: number,
  a33: number,
  b1: number,
  b2: number,
  b3: number
): [number, number, number] | null {
  // Matrice augmentée [A|b]
  const matrix: number[][] = [
    [a11, a12, a13, b1],
    [a12, a22, a23, b2],
    [a13, a23, a33, b3],
  ];

  const size = 3;

  // Élimination de Gauss avec pivot partiel
  for (let pivot = 0; pivot < size; pivot++) {
    // Cherche le meilleur pivot (valeur absolue maximale)
    let pivotRow = pivot;
    let pivotValue = Math.abs(matrix[pivot][pivot]);

    for (let row = pivot + 1; row < size; row++) {
      const value = Math.abs(matrix[row][pivot]);
      if (value > pivotValue) {
        pivotValue = value;
        pivotRow = row;
      }
    }

    // Matrice singulière
    if (pivotValue < 1e-8) {
      return null;
    }

    // Échange les lignes si nécessaire
    if (pivotRow !== pivot) {
      const temp = matrix[pivot];
      matrix[pivot] = matrix[pivotRow];
      matrix[pivotRow] = temp;
    }

    // Élimine la colonne pivot
    const pivotElement = matrix[pivot][pivot];
    for (let row = pivot + 1; row < size; row++) {
      const factor = matrix[row][pivot] / pivotElement;
      for (let col = pivot; col <= size; col++) {
        matrix[row][col] -= factor * matrix[pivot][col];
      }
    }
  }

  // Substitution arrière
  const solution = new Array<number>(size);
  for (let row = size - 1; row >= 0; row--) {
    let sum = matrix[row][size];
    for (let col = row + 1; col < size; col++) {
      sum -= matrix[row][col] * solution[col];
    }
    const pivot = matrix[row][row];
    if (Math.abs(pivot) < 1e-8) {
      return null;
    }
    solution[row] = sum / pivot;
  }

  return solution as [number, number, number];
}

/**
 * Applique la correction automatique des données
 */
export function applyDataFix(
  mesh: MeshData,
  preview: DataFixPreview
): MeshData {
  const newValues = new Float64Array(mesh.values);
  const newImputed = mesh.imputed ? new Uint8Array(mesh.imputed) : new Uint8Array(mesh.values.length);

  for (const update of preview.updates) {
    const index = update.y * mesh.width + update.x;
    if (update.value !== null) {
      newValues[index] = update.value;
      if (update.markImputed) {
        newImputed[index] = 1;
      }
    }
  }

  return {
    ...mesh,
    values: newValues,
    imputed: newImputed,
  };
}

/**
 * Lissage du champ de hauteur (smoothing Laplacien)
 */
export function smoothHeightField(
  mesh: MeshData,
  iterations: number = 2,
  blendFactor: number = 0.5
): MeshData {
  const { width, height } = mesh;
  let currentValues = new Float64Array(mesh.values);
  let newValues = new Float64Array(mesh.values.length);

  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const value = currentValues[index];

        if (!isFinite(value)) {
          // Pour les valeurs manquantes, utilise la médiane des voisins
          const neighbors = getNeighborValuesFromArray(currentValues, width, height, x, y, 1);
          newValues[index] = neighbors.length > 0 ? median(neighbors) : value;
          continue;
        }

        // Pour les valeurs existantes, applique le lissage avec blend
        const neighbors = getNeighborValuesFromArray(currentValues, width, height, x, y, 1);
        if (neighbors.length > 0) {
          const smoothed = median(neighbors);
          newValues[index] = value * (1 - blendFactor) + smoothed * blendFactor;
        } else {
          newValues[index] = value;
        }
      }
    }

    // Swap pour l'itération suivante
    const temp = currentValues;
    currentValues = newValues;
    newValues = temp;
  }

  return {
    ...mesh,
    values: currentValues,
  };
}

/**
 * Obtient les valeurs voisines depuis un tableau brut
 */
function getNeighborValuesFromArray(
  values: Float64Array,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number = 1
): number[] {
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
          neighbors.push(value);
        }
      }
    }
  }

  return neighbors;
}

/**
 * Crée une copie du mesh pour les opérations de correction
 */
export function cloneMeshData(mesh: MeshData): MeshData {
  return {
    ...mesh,
    values: new Float64Array(mesh.values),
    imputed: mesh.imputed ? new Uint8Array(mesh.imputed) : undefined,
  };
}

/**
 * Corrige automatiquement les valeurs manquantes dans le mesh
 * Utilise l'interpolation plane-fit avec contraintes physiques
 *
 * @param mesh - Mesh avec potentiellement des valeurs manquantes (NaN, Infinity)
 * @param options - Options de correction
 * @returns Nouveau mesh avec valeurs corrigées
 */
export function autoFixMissingValues(
  mesh: MeshData,
  options: {
    maxRadius?: number;
    iterations?: number;
  } = {}
): MeshData {
  const { iterations = 1 } = options;

  let fixedMesh = cloneMeshData(mesh);

  // Applique plusieurs passes pour propager les valeurs
  for (let i = 0; i < iterations; i++) {
    const preview = generateDataFixPreview(fixedMesh, {
      fixMissing: true,
      fixImputed: false, // Ne touche pas aux valeurs déjà imputées
    });

    if (preview.fixedCount === 0) break; // Plus rien à corriger

    fixedMesh = applyDataFix(fixedMesh, preview);
  }

  return fixedMesh;
}
