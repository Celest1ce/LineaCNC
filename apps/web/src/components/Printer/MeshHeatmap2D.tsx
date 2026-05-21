/**
 * Composant de visualisation 2D de mesh avec Canvas
 * Vue stable sans zoom/pan, avec édition directe des valeurs
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type { MeshData } from '../../types/mesh';
import type { ColorScale } from '../../utils/color-scale.utils';
import { getCellValue, isCellImputed, isCellMissing } from '../../utils/mesh-stats.utils';
import { webSerial } from '../../services/web-serial.service';
import { apiService } from '../../services/api.service';
import { PrinterEvent, type ParsedSerialData } from '../../types/printer';
import type { PrinterConfig } from '../../types/printer-config';
import { calculateMeshPointPosition, DEFAULT_PRINTER_CONFIG } from '../../types/printer-config';
import { logger } from '../../utils/logger';

interface MeshHeatmap2DProps {
  mesh: MeshData;
  colorScale: ColorScale;
  onCellUpdate?: (x: number, y: number, value: number | null) => void;
  printerId?: string; // Optional: enables Refresh button per cell
}

export const MeshHeatmap2D: React.FC<MeshHeatmap2DProps> = ({
  mesh,
  colorScale,
  onCellUpdate,
  printerId,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingCell, setEditingCell] = useState<{ x: number; y: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [cellSize, setCellSize] = useState(40);
  const [isProbing, setIsProbing] = useState(false);
  const [probingError, setProbingError] = useState<string | null>(null);

  /**
   * Calcule la taille des cellules pour remplir le container
   */
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Calcule la taille des cellules pour fit le container
      const cellWidth = Math.floor((containerWidth - 40) / mesh.width);
      const cellHeight = Math.floor((containerHeight - 40) / mesh.height);

      // Utilise la plus petite dimension pour avoir des cellules carrées
      const size = Math.min(cellWidth, cellHeight, 60); // Max 60px
      setCellSize(Math.max(size, 20)); // Min 20px
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [mesh.width, mesh.height]);

  /**
   * Dessine le mesh sur le canvas
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = mesh;

    // Ajuste la taille du canvas
    const totalWidth = width * cellSize;
    const totalHeight = height * cellSize;
    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Efface le canvas
    ctx.clearRect(0, 0, totalWidth, totalHeight);

    // Dessine chaque cellule
    // Note: Y est inversé pour correspondre à l'orientation physique de l'imprimante
    // Y=0 (front) doit être en bas de l'écran, Y=max (back) en haut
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = getCellValue(mesh, x, y);
        const px = x * cellSize;
        const py = (height - 1 - y) * cellSize; // Inverser Y pour orientation correcte

        // Couleur de fond
        if (isCellMissing(mesh, x, y)) {
          ctx.fillStyle = '#e5e7eb'; // Gris clair pour missing
        } else {
          ctx.fillStyle = colorScale.getColor(value);
        }

        ctx.fillRect(px, py, cellSize, cellSize);

        // Bordure pour les cellules imputées
        if (isCellImputed(mesh, x, y)) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
        }

        // Grille
        ctx.strokeStyle = '#00000020';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellSize, cellSize);

        // Texte de la valeur (si assez de place)
        if (!isCellMissing(mesh, x, y) && cellSize >= 25) {
          ctx.fillStyle = value < (colorScale.getConfig().min + colorScale.getConfig().max) / 2
            ? '#ffffff'
            : '#000000';
          ctx.font = `${Math.max(9, cellSize / 5)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(value.toFixed(2), px + cellSize / 2, py + cellSize / 2);
        }
      }
    }
  }, [mesh, colorScale, cellSize]);

  /**
   * Redessine quand les dépendances changent
   */
  useEffect(() => {
    draw();
  }, [draw]);

  /**
   * Gère le clic sur une cellule pour ouvrir l'éditeur
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / cellSize);
    const canvasY = Math.floor((event.clientY - rect.top) / cellSize);
    // Inverser Y pour correspondre aux coordonnées mesh (Y=0 en bas, Y=max en haut)
    const y = mesh.height - 1 - canvasY;

    if (x >= 0 && x < mesh.width && y >= 0 && y < mesh.height) {
      const currentValue = getCellValue(mesh, x, y);
      setEditingCell({ x, y });
      setEditValue(isCellMissing(mesh, x, y) ? '' : currentValue.toFixed(3));
    }
  }, [mesh, cellSize]);

  /**
   * Sauvegarde la valeur éditée
   */
  const handleSaveEdit = useCallback(() => {
    if (!editingCell || !onCellUpdate) return;

    const trimmed = editValue.trim();
    if (trimmed === '') {
      // Valeur vide = marquer comme manquant
      onCellUpdate(editingCell.x, editingCell.y, NaN);
    } else {
      const parsed = parseFloat(trimmed);
      if (!isNaN(parsed)) {
        onCellUpdate(editingCell.x, editingCell.y, parsed);
      }
    }

    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, onCellUpdate]);

  /**
   * Annule l'édition
   */
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue('');
    setProbingError(null);
  }, []);

  /**
   * Rafraîchit la cellule en effectuant un probing G30
   */
  const handleRefreshCell = useCallback(async () => {
    if (!editingCell || !printerId || !onCellUpdate) return;

    setIsProbing(true);
    setProbingError(null);

    try {
      // 1. Charger la configuration de l'imprimante depuis l'API
      const parameters = await apiService.getPrinterParameters(printerId, 1);

      const printAreaX = Number(parameters.find(p => p.parameter_key === 'print_area.x')?.value) || DEFAULT_PRINTER_CONFIG.dimensions.x;
      const printAreaY = Number(parameters.find(p => p.parameter_key === 'print_area.y')?.value) || DEFAULT_PRINTER_CONFIG.dimensions.y;
      const meshCols = Number(parameters.find(p => p.parameter_key === 'mesh.columns')?.value) || DEFAULT_PRINTER_CONFIG.meshDimensions.columns;
      const meshRows = Number(parameters.find(p => p.parameter_key === 'mesh.rows')?.value) || DEFAULT_PRINTER_CONFIG.meshDimensions.rows;
      const marginLeft = Number(parameters.find(p => p.parameter_key === 'probe_margin.left')?.value) || DEFAULT_PRINTER_CONFIG.probeMargins.left;
      const marginRight = Number(parameters.find(p => p.parameter_key === 'probe_margin.right')?.value) || DEFAULT_PRINTER_CONFIG.probeMargins.right;
      const marginFront = Number(parameters.find(p => p.parameter_key === 'probe_margin.front')?.value) || DEFAULT_PRINTER_CONFIG.probeMargins.front;
      const marginBack = Number(parameters.find(p => p.parameter_key === 'probe_margin.back')?.value) || DEFAULT_PRINTER_CONFIG.probeMargins.back;

      const config: PrinterConfig = {
        ...DEFAULT_PRINTER_CONFIG,
        dimensions: { x: printAreaX, y: printAreaY, z: 200 },
        meshDimensions: { columns: meshCols, rows: meshRows },
        probeMargins: {
          left: marginLeft,
          right: marginRight,
          front: marginFront,
          back: marginBack,
        },
      };

      // 2. Calculer la position réelle
      const { x, y } = calculateMeshPointPosition(editingCell.x, editingCell.y, config);

      // 3. Préparer l'écoute de la réponse
      let responseReceived = false;
      let timeoutId: NodeJS.Timeout;

      const resetTimeout = () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (!responseReceived) {
            unsubscribe();
            setIsProbing(false);
            setProbingError('Timeout: No response from printer');
          }
        }, 30000); // 30 secondes de timeout
      };

      // Démarrer le timeout initial
      resetTimeout();

      const unsubscribe = webSerial.on(PrinterEvent.DATA_RECEIVED, (payload) => {
        if (payload.printerId !== printerId || responseReceived) return;

        const data = payload.data as ParsedSerialData;

        // Détecter les erreurs de probing
        if (data.raw && data.raw.includes('Z Probe Past Bed')) {
          responseReceived = true;
          clearTimeout(timeoutId);
          unsubscribe();
          setIsProbing(false);
          setProbingError('Erreur: Sonde passée au-delà du lit (Z Probe Past Bed)');
          logger.error(`G30 probing error at (${editingCell.x},${editingCell.y}): Z Probe Past Bed`);
          return;
        }

        // Réinitialiser le timeout si on reçoit "busy" ou "ok" (imprimante répond toujours)
        if (data.raw && (data.raw.includes('busy') || data.raw.includes('ok'))) {
          resetTimeout();
        }

        // Parser la réponse G30: format "Bed X:... Y:... Z:..."
        // Utiliser une regex spécifique pour capturer UNIQUEMENT la ligne Bed
        if (data.raw && data.raw.includes('Bed')) {
          // Regex pour matcher "Bed X:... Y:... Z:..." et capturer le Z
          const bedMatch = data.raw.match(/Bed\s+X:\s*[-\d.]+\s+Y:\s*[-\d.]+\s+Z:\s*([-\d.]+)/i);
          if (bedMatch) {
            responseReceived = true;
            clearTimeout(timeoutId);
            unsubscribe();

            const zValue = parseFloat(bedMatch[1]);
            if (!isNaN(zValue)) {
              onCellUpdate(editingCell.x, editingCell.y, zValue);
              setEditingCell(null);
              setEditValue('');
              logger.info(`Cell (${editingCell.x},${editingCell.y}) probed: Z=${zValue} (from: ${data.raw})`);
            } else {
              setProbingError('Failed to parse Z value from response');
            }
            setIsProbing(false);
          }
        }
      });

      // 4. Envoyer la commande G30
      const command = `G30 X${x.toFixed(2)} Y${y.toFixed(2)}`;
      await webSerial.sendCommand(printerId, command);
      logger.info(`Sent probing command: ${command}`);

    } catch (error) {
      logger.error('Probing failed', error);
      setProbingError(error instanceof Error ? error.message : 'Probing failed');
      setIsProbing(false);
    }
  }, [editingCell, printerId, onCellUpdate]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center bg-white rounded overflow-hidden">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="cursor-pointer"
      />

      {/* Modal d'édition */}
      {editingCell && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-4 w-80">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Éditer cellule ({editingCell.x}, {editingCell.y})
            </h3>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Valeur (mm)
              </label>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    handleCancelEdit();
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Laisser vide pour marquer comme manquant"
              />
              <p className="text-xs text-gray-500 mt-1">
                Appuyez sur Entrée pour sauvegarder, Échap pour annuler
              </p>
            </div>
            {probingError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                {probingError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isProbing}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Sauvegarder
              </button>
              {printerId && onCellUpdate && (
                <button
                  onClick={handleRefreshCell}
                  disabled={isProbing}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${isProbing ? 'animate-spin' : ''}`} />
                  {isProbing ? 'Probing...' : 'Refresh (G30)'}
                </button>
              )}
              <button
                onClick={handleCancelEdit}
                disabled={isProbing}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
