/**
 * Mesh 2D Viewer Component
 *
 * Displays a bed mesh in a 2D interactive grid with color gradients
 */

import { useState, useEffect, useRef } from 'react';
import { Settings, Download, RotateCcw } from 'lucide-react';
import { BedMeshData, GradientType, CustomGradient } from '../../types/printer';
import { getColorForValue, getGradientCss } from '../../utils/gradient.utils';
import { Button } from '../UI/Button';
import { MeshGradientSettings } from './MeshGradientSettings';

interface MeshViewer2DProps {
  meshData: BedMeshData | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const MeshViewer2D: React.FC<MeshViewer2DProps> = ({
  meshData,
  onRefresh,
  isLoading = false,
}) => {
  const [gradientType, setGradientType] = useState<GradientType>('magma');
  const [customGradient, setCustomGradient] = useState<CustomGradient>({
    min: 0,
    max: 1,
    colorMin: '#0000ff',
    colorMax: '#ff0000',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Update custom gradient min/max when mesh data changes
  useEffect(() => {
    if (meshData) {
      setCustomGradient(prev => ({
        ...prev,
        min: meshData.min,
        max: meshData.max,
      }));
    }
  }, [meshData]);

  // Focus input when editing
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleCellClick = (row: number, col: number, value: number | null) => {
    setEditingCell({ row, col });
    setEditValue(value !== null ? value.toFixed(3) : '');
  };

  const handleEditSubmit = () => {
    if (!meshData || !editingCell) return;

    const newValue = parseFloat(editValue);
    if (!isNaN(newValue)) {
      // Update the mesh data (in a real app, this would update the state)
      meshData.mesh[editingCell.row][editingCell.col] = newValue;

      // Recalculate min/max
      let min = Infinity;
      let max = -Infinity;
      meshData.mesh.forEach(row => {
        row.forEach(val => {
          if (val !== null) {
            min = Math.min(min, val);
            max = Math.max(max, val);
          }
        });
      });
      meshData.min = min === Infinity ? 0 : min;
      meshData.max = max === -Infinity ? 0 : max;
    }

    setEditingCell(null);
    setEditValue('');
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  const exportMeshData = () => {
    if (!meshData) return;

    const dataStr = JSON.stringify(meshData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `bed-mesh-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  if (!meshData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-gray-500 mb-4">
          {isLoading ? 'Loading mesh data...' : 'No mesh data available'}
        </div>
        {!isLoading && onRefresh && (
          <Button onClick={onRefresh} variant="primary" className="text-sm py-1 px-3 inline-flex items-center">
            <RotateCcw className="w-4 h-4 mr-2" />
            Load Mesh
          </Button>
        )}
      </div>
    );
  }

  const { mesh, min, max, probingMode } = meshData;

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-700">
            Bed Leveling: <span className="text-primary-600">{probingMode}</span>
          </div>
          <div className="text-xs text-gray-500">
            Range: {min.toFixed(3)} mm to {max.toFixed(3)} mm
          </div>
        </div>
        <div className="flex gap-2">
          {onRefresh && (
            <Button
              onClick={onRefresh}
              variant="secondary"
              className="text-sm py-1 px-2"
              disabled={isLoading}
            >
              <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <Button onClick={exportMeshData} variant="secondary" className="text-sm py-1 px-2">
            <Download className="w-4 h-4" />
          </Button>
          <Button onClick={() => setShowSettings(true)} variant="secondary" className="text-sm py-1 px-2">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Gradient Legend */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-600">{min.toFixed(2)}</span>
        <div
          className="flex-1 h-6 rounded"
          style={{ background: getGradientCss(gradientType, customGradient) }}
        />
        <span className="text-gray-600">{max.toFixed(2)}</span>
      </div>

      {/* Mesh Grid */}
      <div className="overflow-x-auto flex-1">
        <div className="inline-block min-w-full h-full flex items-center justify-center">
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${mesh[0].length}, minmax(48px, 1fr))`,
            }}
          >
            {mesh.map((row, rowIndex) =>
              row.map((value, colIndex) => {
                const isEditing =
                  editingCell?.row === rowIndex && editingCell?.col === colIndex;
                const color = getColorForValue(
                  value,
                  min,
                  max,
                  gradientType,
                  customGradient
                );

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`
                      relative aspect-square rounded flex items-center justify-center
                      text-xs font-medium transition-all cursor-pointer
                      ${value === null ? 'border-2 border-dashed border-gray-300 bg-gray-100' : 'hover:ring-2 hover:ring-primary-500'}
                      ${isEditing ? 'ring-2 ring-blue-500 z-10' : ''}
                    `}
                    style={{
                      backgroundColor: value !== null ? color : undefined,
                      color: value !== null && value < (min + max) / 2 ? '#ffffff' : '#000000',
                    }}
                    onClick={() => handleCellClick(rowIndex, colIndex, value)}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={handleEditSubmit}
                        onKeyDown={handleKeyDown}
                        className="absolute inset-0 w-full h-full text-center text-xs font-medium bg-white border-2 border-blue-500 rounded focus:outline-none"
                      />
                    ) : (
                      <span className="select-none">
                        {value !== null ? value.toFixed(2) : '—'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <MeshGradientSettings
          gradientType={gradientType}
          customGradient={customGradient}
          onGradientTypeChange={setGradientType}
          onCustomGradientChange={setCustomGradient}
          onClose={() => setShowSettings(false)}
          meshMin={min}
          meshMax={max}
        />
      )}
    </div>
  );
};
