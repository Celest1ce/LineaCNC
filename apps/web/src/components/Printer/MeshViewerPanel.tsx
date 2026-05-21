/**
 * Panneau principal de visualisation de mesh
 * Combine les viewers 2D et 3D avec tous les contrôles
 */

import { useState, useCallback, useEffect } from 'react';
import { Upload, Save, Wrench, Grid3x3, Box, Send } from 'lucide-react';
import { Button } from '../UI/Button';
import { useMesh } from '../../hooks/useMesh';
import { MeshHeatmap2D } from './MeshHeatmap2D';
import { MeshViewer3D } from './MeshViewer3D';
import { UBLExportDialog } from './UBLExportDialog';
import type { BrushMode, MeshViewer3DConfig, MeshExportOptions } from '../../types/mesh';
import { parseMeshFile } from '../../utils/mesh-export.utils';
import { downloadMeshFile } from '../../utils/mesh-export.utils';
import { generateDataFixPreview, applyDataFix } from '../../utils/mesh-data-fix.utils';
import { bedMeshToMeshData } from '../../utils/mesh-adapter.utils';
import type { BedMeshData } from '../../types/printer';
import { webSerial } from '../../services/web-serial.service';

interface MeshViewerPanelProps {
  initialMeshData?: BedMeshData | null;
  printerId?: string; // Optional: enables UBL export functionality
  onClose?: () => void;
}

type ViewMode = '2d' | '3d';

export const MeshViewerPanel: React.FC<MeshViewerPanelProps> = ({
  initialMeshData,
  printerId,
  // onClose gardé pour la compatibilité de l'interface
}) => {
  const meshState = useMesh();
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [brushMode, setBrushMode] = useState<BrushMode>('set');
  const [paintValue, setPaintValue] = useState(0);
  const [showUBLExport, setShowUBLExport] = useState(false);
  const [viewer3DConfig, setViewer3DConfig] = useState<MeshViewer3DConfig>({
    smoothingLevel: 1,
    zScale: 1.0,
    showAxes: true,
    camera: {
      azimuth: Math.PI / 4,
      elevation: Math.PI / 6,
      distance: 3,
    },
  });

  /**
   * Charge les données initiales si fournies
   */
  useEffect(() => {
    if (initialMeshData && initialMeshData.mesh) {
      try {
        const meshData = bedMeshToMeshData(initialMeshData);
        meshState.loadMesh(meshData);
      } catch (error) {
        console.error('Erreur lors de la conversion du mesh:', error);
      }
    }
  }, [initialMeshData, meshState]);

  /**
   * Gère l'importation de fichier
   */
  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;

      const parsed = parseMeshFile(content, file.name);
      if (parsed) {
        meshState.loadMesh(parsed);
      } else {
        alert('Échec de l\'import du fichier. Format non reconnu.');
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }, [meshState]);

  /**
   * Gère l'export
   */
  const handleExport = useCallback(() => {
    if (!meshState.mesh) return;

    const options: MeshExportOptions = {
      format: 'csv',
      includeMetadata: true,
      includeImputed: true,
    };

    downloadMeshFile(meshState.mesh, options);
  }, [meshState.mesh]);

  /**
   * Applique la correction automatique des données
   */
  const handleDataFix = useCallback(() => {
    if (!meshState.mesh) return;

    const preview = generateDataFixPreview(meshState.mesh, {
      fixMissing: true,
      fixImputed: false,
    });

    if (preview.updates.length === 0) {
      alert('Aucune correction nécessaire.');
      return;
    }

    const confirmed = confirm(
      `Correction de ${preview.fixedCount} valeur(s) manquante(s) par interpolation plane-fit.\n\nLes valeurs mesurées par l'imprimante ne seront pas modifiées.\n\nVoulez-vous continuer?`
    );

    if (confirmed) {
      const fixed = applyDataFix(meshState.mesh, preview);
      meshState.loadMesh(fixed);
    }
  }, [meshState]);

  /**
   * Gère les mises à jour de cellule
   */
  const handleCellUpdate = useCallback((x: number, y: number, value: number | null) => {
    if (value === null || isNaN(value)) {
      // Effacer - marquer comme NaN
      meshState.updateCell(x, y, NaN, false);
    } else {
      meshState.updateCell(x, y, value, false);
    }
  }, [meshState]);

  /**
   * Wrapper pour envoyer des commandes via webSerial
   */
  const sendCommand = useCallback(async (command: string) => {
    if (!printerId) {
      throw new Error('No printer ID available');
    }
    await webSerial.sendCommand(printerId, command);
  }, [printerId]);

  if (!meshState.mesh || !meshState.colorScale) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-gray-500 text-center">
          <p className="text-lg font-medium mb-2">Aucun mesh chargé</p>
          <p className="text-sm">Importez un fichier mesh ou chargez des données depuis l'imprimante</p>
        </div>

        <label className="cursor-pointer">
          <Button variant="primary" className="inline-flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            Importer un fichier
          </Button>
          <input
            type="file"
            accept=".csv,.txt,.json"
            onChange={handleFileImport}
            className="hidden"
          />
        </label>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header avec statistiques */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">Visualisation de Mesh</h3>
          {meshState.stats && (
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span>Taille: {meshState.mesh.width}×{meshState.mesh.height}</span>
              <span>Min: {meshState.stats.min.toFixed(3)} mm</span>
              <span>Max: {meshState.stats.max.toFixed(3)} mm</span>
              <span>Moyenne: {meshState.stats.mean.toFixed(3)} mm</span>
              {meshState.stats.missingCount > 0 && (
                <span className="text-orange-600">
                  Manquants: {meshState.stats.missingCount}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <Button variant="secondary" className="text-sm py-1 px-2">
              <Upload className="w-4 h-4" />
            </Button>
            <input
              type="file"
              accept=".csv,.txt,.json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <Button
            onClick={handleExport}
            variant="secondary"
            className="text-sm py-1 px-2"
            title="Exporter"
          >
            <Save className="w-4 h-4" />
          </Button>

          <Button
            onClick={handleDataFix}
            variant="secondary"
            className="text-sm py-1 px-2"
            title="Correction automatique"
          >
            <Wrench className="w-4 h-4" />
          </Button>

          {printerId && (
            <Button
              onClick={() => setShowUBLExport(true)}
              variant="primary"
              className="text-sm py-1 px-2"
              title="Exporter vers imprimante (UBL)"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setViewMode('2d')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
            viewMode === '2d'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Grid3x3 className="w-4 h-4" />
          Vue 2D
        </button>

        <button
          onClick={() => setViewMode('3d')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm transition-colors ${
            viewMode === '3d'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Box className="w-4 h-4" />
          Vue 3D
        </button>
      </div>

      {/* Viewer container */}
      <div className="flex-1 min-h-0">
        {viewMode === '2d' ? (
        <MeshHeatmap2D
          mesh={meshState.mesh}
          colorScale={meshState.colorScale}
          onCellUpdate={handleCellUpdate}
          printerId={printerId}
        />
        ) : (
          <MeshViewer3D
            mesh={meshState.mesh}
            colorScale={meshState.colorScale}
            config={viewer3DConfig}
            onConfigChange={(newConfig) => setViewer3DConfig({ ...viewer3DConfig, ...newConfig })}
          />
        )}
      </div>

      {/* Controls (pour le mode 2D) */}
      {viewMode === '2d' && (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Mode:</label>
            <select
              value={brushMode}
              onChange={(e) => setBrushMode(e.target.value as BrushMode)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="set">Définir</option>
              <option value="clear">Effacer</option>
            </select>
          </div>

          {brushMode === 'set' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Valeur:</label>
              <input
                type="number"
                value={paintValue}
                onChange={(e) => setPaintValue(parseFloat(e.target.value) || 0)}
                step="0.001"
                className="text-sm border border-gray-300 rounded px-2 py-1 w-24"
              />
            </div>
          )}
        </div>
      )}

      {/* Controls (pour le mode 3D) */}
      {viewMode === '3d' && (
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Lissage:</label>
            <input
              type="range"
              min="0"
              max="3"
              value={viewer3DConfig.smoothingLevel}
              onChange={(e) => setViewer3DConfig({ ...viewer3DConfig, smoothingLevel: parseInt(e.target.value) })}
              className="w-32"
            />
            <span className="text-sm text-gray-600">{viewer3DConfig.smoothingLevel}</span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Échelle Z:</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={viewer3DConfig.zScale}
              onChange={(e) => setViewer3DConfig({ ...viewer3DConfig, zScale: parseFloat(e.target.value) })}
              className="w-32"
            />
            <span className="text-sm text-gray-600">{viewer3DConfig.zScale.toFixed(1)}×</span>
          </div>
        </div>
      )}

      {/* UBL Export Dialog */}
      {showUBLExport && printerId && meshState.mesh && (
        <UBLExportDialog
          mesh={meshState.mesh}
          sendCommand={sendCommand}
          onClose={() => setShowUBLExport(false)}
        />
      )}
    </div>
  );
};
