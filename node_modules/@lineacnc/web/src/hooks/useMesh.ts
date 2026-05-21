/**
 * Hook pour gérer l'état et les opérations sur un mesh
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { MeshData, MeshSnapshot, MeshCellUpdate, MeshStats } from '../types/mesh';
import { calculateMeshStats, setCellValue } from '../utils/mesh-stats.utils';
import { cloneMeshData } from '../utils/mesh-data-fix.utils';
import { ColorScale, createDefaultColorScaleConfig } from '../utils/color-scale.utils';

const MAX_HISTORY = 100;

export interface UseMeshReturn {
  mesh: MeshData | null;
  stats: MeshStats | null;
  colorScale: ColorScale | null;
  history: MeshSnapshot[];
  future: MeshSnapshot[];

  // Actions
  loadMesh: (mesh: MeshData) => void;
  updateCell: (x: number, y: number, value: number, markImputed?: boolean) => void;
  updateCells: (updates: MeshCellUpdate[], description?: string) => void;
  clearMesh: () => void;

  // History
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;

  // Color scale
  updateColorScale: (min?: number, max?: number) => void;
}

export function useMesh(): UseMeshReturn {
  const [mesh, setMesh] = useState<MeshData | null>(null);
  const [history, setHistory] = useState<MeshSnapshot[]>([]);
  const [future, setFuture] = useState<MeshSnapshot[]>([]);
  const [colorScale, setColorScale] = useState<ColorScale | null>(null);

  // Calcule les statistiques
  const stats = useMemo(() => {
    if (!mesh) return null;
    return calculateMeshStats(mesh);
  }, [mesh]);

  // Crée/met à jour le color scale quand le mesh change
  useEffect(() => {
    if (stats && stats.count > 0) {
      if (!colorScale) {
        setColorScale(new ColorScale(createDefaultColorScaleConfig(stats.min, stats.max)));
      } else {
        colorScale.updateConfig({ min: stats.min, max: stats.max });
      }
    }
  }, [stats, colorScale]);

  /**
   * Crée un snapshot du mesh actuel
   */
  const createSnapshot = useCallback((mesh: MeshData, description: string): MeshSnapshot => {
    return {
      width: mesh.width,
      height: mesh.height,
      values: new Float64Array(mesh.values),
      imputed: mesh.imputed ? new Uint8Array(mesh.imputed) : new Uint8Array(mesh.values.length),
      description,
      timestamp: Date.now(),
    };
  }, []);

  /**
   * Restaure un snapshot
   */
  const restoreSnapshot = useCallback((snapshot: MeshSnapshot): MeshData => {
    return {
      width: snapshot.width,
      height: snapshot.height,
      values: new Float64Array(snapshot.values),
      imputed: new Uint8Array(snapshot.imputed),
    };
  }, []);

  /**
   * Charge un nouveau mesh
   */
  const loadMesh = useCallback((newMesh: MeshData) => {
    setMesh(newMesh);
    setHistory([]);
    setFuture([]);

    // Crée le color scale initial
    const meshStats = calculateMeshStats(newMesh);
    if (meshStats.count > 0) {
      setColorScale(new ColorScale(createDefaultColorScaleConfig(meshStats.min, meshStats.max)));
    }
  }, []);

  /**
   * Met à jour une cellule
   */
  const updateCell = useCallback((x: number, y: number, value: number, markImputed: boolean = false) => {
    if (!mesh) return;

    // Valide les coordonnées
    if (x < 0 || x >= mesh.width || y < 0 || y >= mesh.height) {
      return;
    }

    // Crée un snapshot avant la modification
    const snapshot = createSnapshot(mesh, `Update cell (${x}, ${y})`);

    // Clone et modifie
    const newMesh = cloneMeshData(mesh);
    setCellValue(newMesh, x, y, value, markImputed);

    // Sauvegarde l'historique
    setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), snapshot]);
    setFuture([]);
    setMesh(newMesh);
  }, [mesh, createSnapshot]);

  /**
   * Met à jour plusieurs cellules à la fois
   */
  const updateCells = useCallback((updates: MeshCellUpdate[], description: string = 'Bulk update') => {
    if (!mesh || updates.length === 0) return;

    // Crée un snapshot avant les modifications
    const snapshot = createSnapshot(mesh, description);

    // Clone et applique toutes les modifications
    const newMesh = cloneMeshData(mesh);
    for (const update of updates) {
      if (update.value !== null) {
        setCellValue(newMesh, update.x, update.y, update.value, update.markImputed);
      }
    }

    // Sauvegarde l'historique
    setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), snapshot]);
    setFuture([]);
    setMesh(newMesh);
  }, [mesh, createSnapshot]);

  /**
   * Annule la dernière action
   */
  const undo = useCallback((): boolean => {
    if (history.length === 0 || !mesh) return false;

    const lastSnapshot = history[history.length - 1];
    const currentSnapshot = createSnapshot(mesh, 'Current state');

    // Restaure l'état précédent
    setMesh(restoreSnapshot(lastSnapshot));
    setHistory(prev => prev.slice(0, -1));
    setFuture(prev => [currentSnapshot, ...prev.slice(0, MAX_HISTORY - 1)]);

    return true;
  }, [history, mesh, createSnapshot, restoreSnapshot]);

  /**
   * Refait la dernière action annulée
   */
  const redo = useCallback((): boolean => {
    if (future.length === 0 || !mesh) return false;

    const nextSnapshot = future[0];
    const currentSnapshot = createSnapshot(mesh, 'Current state');

    // Restaure l'état suivant
    setMesh(restoreSnapshot(nextSnapshot));
    setHistory(prev => [...prev.slice(-MAX_HISTORY + 1), currentSnapshot]);
    setFuture(prev => prev.slice(1));

    return true;
  }, [future, mesh, createSnapshot, restoreSnapshot]);

  /**
   * Efface le mesh
   */
  const clearMesh = useCallback(() => {
    setMesh(null);
    setHistory([]);
    setFuture([]);
    setColorScale(null);
  }, []);

  /**
   * Met à jour les bornes du color scale
   */
  const updateColorScale = useCallback((min?: number, max?: number) => {
    if (!colorScale || !stats) return;

    const newMin = min ?? stats.min;
    const newMax = max ?? stats.max;

    colorScale.updateConfig({ min: newMin, max: newMax });
    setColorScale(new ColorScale(colorScale.getConfig()));
  }, [colorScale, stats]);

  return {
    mesh,
    stats,
    colorScale,
    history,
    future,

    loadMesh,
    updateCell,
    updateCells,
    clearMesh,

    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,

    updateColorScale,
  };
}
