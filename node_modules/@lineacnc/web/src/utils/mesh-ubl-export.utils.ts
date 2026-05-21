/**
 * Utilitaires pour l'export UBL (Unified Bed Leveling) vers l'imprimante
 * Envoie le mesh cellule par cellule via commandes M421
 */

import type { MeshData } from '../types/mesh';
import { getCellValue, isCellMissing } from './mesh-stats.utils';
import { logger } from './logger';

export interface UBLExportProgress {
  current: number;
  total: number;
  currentPoint: { x: number; y: number };
  status: 'initializing' | 'sending' | 'saving' | 'complete' | 'error';
  message?: string;
}

export interface UBLExportResult {
  success: boolean;
  errors?: string[];
  skipped?: number;
  exported?: number;
}

/**
 * Export le mesh vers l'imprimante via UBL (commandes M421)
 */
export async function exportMeshToUBL(
  mesh: MeshData,
  sendCommand: (cmd: string) => Promise<void>,
  onProgress?: (progress: UBLExportProgress) => void
): Promise<UBLExportResult> {
  const errors: string[] = [];
  const total = mesh.width * mesh.height;
  let current = 0;
  let exported = 0;
  let skipped = 0;

  try {
    // 1. Activer le mode édition UBL
    onProgress?.({
      current: 0,
      total,
      currentPoint: { x: 0, y: 0 },
      status: 'initializing',
      message: 'Activating UBL edit mode...',
    });

    try {
      await sendCommand('G29 P1');
      await delay(500);
    } catch (error) {
      logger.warn('G29 P1 may not be supported, continuing anyway', error);
    }

    // 2. Envoyer chaque point
    for (let y = 0; y < mesh.height; y++) {
      for (let x = 0; x < mesh.width; x++) {
        current++;
        const value = getCellValue(mesh, x, y);

        onProgress?.({
          current,
          total,
          currentPoint: { x, y },
          status: 'sending',
          message: `Sending point (${x}, ${y})...`,
        });

        // Sauter les cellules manquantes ou invalides
        if (isCellMissing(mesh, x, y) || !isFinite(value)) {
          logger.debug(`Skipping cell (${x},${y}): missing or invalid`);
          skipped++;
          await delay(50); // Petit délai même pour les cellules sautées
          continue;
        }

        // Format UBL: M421 I{col} J{row} Z{value}
        // I = colonne (X), J = ligne (Y)
        const cmd = `M421 I${x} J${y} Z${value.toFixed(4)}`;

        try {
          await sendCommand(cmd);
          exported++;
          await delay(100); // Délai entre commandes pour éviter de surcharger le buffer
        } catch (err) {
          const errorMsg = `Failed to set cell (${x},${y}): ${err instanceof Error ? err.message : String(err)}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }
    }

    // 3. Sauvegarder le mesh UBL dans le slot 0
    onProgress?.({
      current: total,
      total,
      currentPoint: { x: mesh.width - 1, y: mesh.height - 1 },
      status: 'saving',
      message: 'Saving mesh to slot 0...',
    });

    try {
      await sendCommand('G29 S0');
      await delay(1000);
    } catch (error) {
      logger.warn('G29 S0 may have failed', error);
      errors.push('Warning: Failed to save mesh to slot (G29 S0)');
    }

    // 4. Sauvegarder en EEPROM
    onProgress?.({
      current: total,
      total,
      currentPoint: { x: mesh.width - 1, y: mesh.height - 1 },
      status: 'saving',
      message: 'Saving to EEPROM...',
    });

    try {
      await sendCommand('M500');
      await delay(500);
    } catch (error) {
      logger.warn('M500 may have failed', error);
      errors.push('Warning: Failed to save to EEPROM (M500)');
    }

    // 5. Terminé
    onProgress?.({
      current: total,
      total,
      currentPoint: { x: mesh.width - 1, y: mesh.height - 1 },
      status: 'complete',
      message: `Export complete! ${exported} points exported, ${skipped} skipped.`,
    });

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      exported,
      skipped,
    };
  } catch (error) {
    const errorMsg = `Fatal error during export: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(errorMsg);

    onProgress?.({
      current,
      total,
      currentPoint: { x: 0, y: 0 },
      status: 'error',
      message: errorMsg,
    });

    return {
      success: false,
      errors: [errorMsg, ...errors],
      exported,
      skipped,
    };
  }
}

/**
 * Délai asynchrone
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
