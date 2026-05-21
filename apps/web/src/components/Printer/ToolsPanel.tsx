/**
 * Tools Panel Component
 *
 * Container for 3D printer tools with side-by-side mesh viewers
 * - Mesh 2D Viewer (Canvas-based heatmap)
 * - Mesh 3D Viewer (WebGL2-based 3D visualization)
 * Layout: 3 columns (Parameters | 2D View | 3D View)
 */

import { useState, useEffect } from 'react';
import { Wrench, WrenchIcon, Send } from 'lucide-react';
import { MeshHeatmap2D } from './MeshHeatmap2D';
import { MeshViewer3D } from './MeshViewer3D';
import { UBLExportDialog } from './UBLExportDialog';
import { useMesh } from '../../hooks/useMesh';
import { SerialDataType, PrinterEvent } from '../../types/printer';
import { webSerial } from '../../services/web-serial.service';
import { bedMeshToMeshData } from '../../utils/mesh-adapter.utils';
import { downloadMeshFile } from '../../utils/mesh-export.utils';
import { generateDataFixPreview, applyDataFix } from '../../utils/mesh-data-fix.utils';
import type { MeshViewer3DConfig } from '../../types/mesh';

interface ToolsPanelProps {
  printerId?: string;
  isConnected?: boolean;
  onSendCommand?: (command: string) => Promise<void>;
  onAddConsoleEntry?: (entry: { type: 'command' | 'response' | 'error'; text: string }) => void;
}

type ViewTab = 'mesh' | 'calibration' | 'diagnostics';

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  printerId,
  isConnected = false,
  onSendCommand,
  onAddConsoleEntry,
}) => {
  const [activeTab, setActiveTab] = useState<ViewTab>('mesh');
  const [isLoadingMesh, setIsLoadingMesh] = useState(false);
  const [showUBLExport, setShowUBLExport] = useState(false);

  // États pour les viewers 2D/3D
  const meshState = useMesh();
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

  const handleLoadMesh = async () => {
    if (!onSendCommand || !isConnected) {
      if (onAddConsoleEntry) {
        onAddConsoleEntry({
          type: 'error',
          text: 'Cannot load mesh: printer not connected',
        });
      }
      return;
    }

    setIsLoadingMesh(true);

    try {
      // First, get hardware info to detect leveling type
      if (onAddConsoleEntry) {
        onAddConsoleEntry({ type: 'command', text: '> M990' });
      }
      await onSendCommand('M990');

      // Small delay to allow M990 to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then request the mesh data
      if (onAddConsoleEntry) {
        onAddConsoleEntry({ type: 'command', text: '> G29 T' });
      }
      await onSendCommand('G29 T');

      // Note: The actual mesh data will be received via the data stream
      // and parsed by the serial parser. We need to listen for it.
      // For now, show a message that data is being received
      if (onAddConsoleEntry) {
        onAddConsoleEntry({
          type: 'response',
          text: 'Mesh data requested. Waiting for response...',
        });
      }
    } catch (error) {
      console.error('Error loading mesh:', error);
      if (onAddConsoleEntry) {
        onAddConsoleEntry({
          type: 'error',
          text: `Error loading mesh: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
      setIsLoadingMesh(false);
    }
  };

  /**
   * Applique la correction automatique des données manquantes
   */
  const handleDataFix = () => {
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
  };

  // Wrapper pour envoyer des commandes via webSerial
  const sendCommand = async (command: string) => {
    if (!printerId) {
      throw new Error('No printer ID available');
    }
    await webSerial.sendCommand(printerId, command);
  };

  // Listen to incoming data events for mesh data
  useEffect(() => {
    if (!printerId) return;

    const handleDataReceived = (payload: any) => {
      if (payload.printerId !== printerId) return;

      const parsedData = payload.data;
      if (!parsedData) return;

      // Check if this is bed mesh data
      if (parsedData.type === SerialDataType.BED_MESH_DATA) {
        const meshInfo = parsedData.data;

        if (meshInfo.complete && meshInfo.meshData) {
          // We received complete mesh data
          setIsLoadingMesh(false);

          // Convertit vers le nouveau format et charge dans meshState
          try {
            const convertedMesh = bedMeshToMeshData(meshInfo.meshData);
            meshState.loadMesh(convertedMesh);
          } catch (error) {
            console.error('Error converting mesh data:', error);
          }

          if (onAddConsoleEntry) {
            onAddConsoleEntry({
              type: 'response',
              text: `Mesh data received: ${meshInfo.meshData.size}x${meshInfo.meshData.meshPoints?.x || meshInfo.meshData.size} points`,
            });
          }
        }
      }

      // Also check for hardware info to get bed leveling type
      if (parsedData.type === SerialDataType.HARDWARE_INFO) {
        const hwInfo = parsedData.data;
        if (hwInfo.bedLeveling && onAddConsoleEntry) {
          onAddConsoleEntry({
            type: 'response',
            text: `Bed Leveling: ${hwInfo.bedLeveling}`,
          });
        }
      }
    };

    const unsubscribe = webSerial.on(PrinterEvent.DATA_RECEIVED, handleDataReceived);

    return () => {
      unsubscribe();
    };
  }, [printerId, onAddConsoleEntry, meshState]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col h-full">
      {/* Header with title and tabs */}
      <div className="border-b border-gray-200 flex-shrink-0 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">Tools</h2>
          </div>

          {/* Tabs à droite */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('mesh')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded transition-colors
                ${
                  activeTab === 'mesh'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              Mesh Viewer
            </button>
            <button
              onClick={() => setActiveTab('calibration')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded transition-colors
                ${
                  activeTab === 'calibration'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              Calibration
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`
                px-4 py-1.5 text-sm font-medium rounded transition-colors
                ${
                  activeTab === 'diagnostics'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              Diagnostics
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {activeTab === 'mesh' && (
          <>
            {!meshState.mesh ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-gray-500 mb-4">Aucun mesh chargé</p>
                <button
                  onClick={handleLoadMesh}
                  disabled={isLoadingMesh || !isConnected}
                  className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingMesh ? 'Chargement...' : 'Charger le mesh (G29 T)'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-[300px_1fr_1fr] gap-4 h-full">
                {/* Colonne 1: Paramètres */}
                <div className="flex flex-col gap-3 overflow-y-auto">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Actions</h3>
                    <div className="space-y-2">
                      <button
                        onClick={handleLoadMesh}
                        disabled={isLoadingMesh || !isConnected}
                        className="w-full text-sm bg-primary-600 text-white px-3 py-2 rounded hover:bg-primary-700 transition-colors disabled:opacity-50"
                      >
                        {isLoadingMesh ? 'Chargement...' : 'Recharger le mesh'}
                      </button>
                      <button
                        onClick={() => {
                          if (meshState.mesh) {
                            downloadMeshFile(meshState.mesh, {
                              format: 'csv',
                              includeMetadata: true,
                              includeImputed: true,
                            });
                          }
                        }}
                        className="w-full text-sm bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                      >
                        Exporter CSV
                      </button>
                      <button
                        onClick={handleDataFix}
                        disabled={!meshState.mesh}
                        className="w-full text-sm bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        title="Corriger les valeurs manquantes avec interpolation intelligente"
                      >
                        <WrenchIcon className="w-4 h-4" />
                        Corriger valeurs manquantes
                      </button>
                      {printerId && isConnected && (
                        <button
                          onClick={() => setShowUBLExport(true)}
                          disabled={!meshState.mesh}
                          className="w-full text-sm bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          title="Exporter le mesh vers l'imprimante (UBL)"
                        >
                          <Send className="w-4 h-4" />
                          Exporter vers imprimante (UBL)
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Paramètres 3D</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">
                          Lissage: {viewer3DConfig.smoothingLevel}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="3"
                          value={viewer3DConfig.smoothingLevel}
                          onChange={(e) =>
                            setViewer3DConfig({
                              ...viewer3DConfig,
                              smoothingLevel: parseInt(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">
                          Échelle Z: {viewer3DConfig.zScale.toFixed(1)}×
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={viewer3DConfig.zScale}
                          onChange={(e) =>
                            setViewer3DConfig({
                              ...viewer3DConfig,
                              zScale: parseFloat(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={viewer3DConfig.showAxes}
                            onChange={(e) =>
                              setViewer3DConfig({
                                ...viewer3DConfig,
                                showAxes: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-xs font-medium text-gray-700">Afficher les axes</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Statistiques */}
                  {meshState.stats && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Statistiques</h3>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Min:</span>
                          <span className="font-mono">{meshState.stats.min.toFixed(3)} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Max:</span>
                          <span className="font-mono">{meshState.stats.max.toFixed(3)} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Moyenne:</span>
                          <span className="font-mono">{meshState.stats.mean.toFixed(3)} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Médiane:</span>
                          <span className="font-mono">{meshState.stats.median.toFixed(3)} mm</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Points:</span>
                          <span className="font-mono">{meshState.stats.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Manquants:</span>
                          <span className="font-mono">{meshState.stats.missingCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Colonne 2: Vue 2D */}
                <div className="flex flex-col bg-gray-50 rounded-lg border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Vue 2D</h3>
                  <div className="flex-1 min-h-0">
                    <MeshHeatmap2D
                      mesh={meshState.mesh}
                      colorScale={meshState.colorScale!}
                      onCellUpdate={(x, y, value) => {
                        if (value === null || isNaN(value)) {
                          meshState.updateCell(x, y, NaN, false);
                        } else {
                          meshState.updateCell(x, y, value, false);
                        }
                      }}
                      printerId={printerId}
                    />
                  </div>
                </div>

                {/* Colonne 3: Vue 3D */}
                <div className="flex flex-col bg-gray-50 rounded-lg border border-gray-200 p-3">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Vue 3D</h3>
                  <div className="flex-1 min-h-0">
                    <MeshViewer3D
                      mesh={meshState.mesh}
                      colorScale={meshState.colorScale!}
                      config={viewer3DConfig}
                      onConfigChange={(newConfig) =>
                        setViewer3DConfig({ ...viewer3DConfig, ...newConfig })
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'calibration' && (
          <div className="flex items-center justify-center h-full text-center text-gray-500">
            Calibration tools coming soon...
          </div>
        )}

        {activeTab === 'diagnostics' && (
          <div className="flex items-center justify-center h-full text-center text-gray-500">
            Diagnostics tools coming soon...
          </div>
        )}
      </div>

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
