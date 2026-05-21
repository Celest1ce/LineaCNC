/**
 * Mesh Gradient Settings Modal
 *
 * Allows configuration of gradient type and custom gradient settings
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { GradientType, CustomGradient } from '../../types/printer';
import { getGradientCss } from '../../utils/gradient.utils';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';

interface MeshGradientSettingsProps {
  gradientType: GradientType;
  customGradient: CustomGradient;
  onGradientTypeChange: (type: GradientType) => void;
  onCustomGradientChange: (gradient: CustomGradient) => void;
  onClose: () => void;
  meshMin: number;
  meshMax: number;
}

export const MeshGradientSettings: React.FC<MeshGradientSettingsProps> = ({
  gradientType,
  customGradient,
  onGradientTypeChange,
  onCustomGradientChange,
  onClose,
  meshMin,
  meshMax,
}) => {
  const [localGradientType, setLocalGradientType] = useState(gradientType);
  const [localCustomGradient, setLocalCustomGradient] = useState(customGradient);

  useEffect(() => {
    setLocalGradientType(gradientType);
    setLocalCustomGradient(customGradient);
  }, [gradientType, customGradient]);

  const handleSave = () => {
    onGradientTypeChange(localGradientType);
    onCustomGradientChange(localCustomGradient);
    onClose();
  };

  const handleReset = () => {
    setLocalCustomGradient({
      min: meshMin,
      max: meshMax,
      colorMin: '#0000ff',
      colorMax: '#ff0000',
    });
  };

  const gradientOptions: { value: GradientType; label: string }[] = [
    { value: 'magma', label: 'Magma (Scientific)' },
    { value: 'viridis', label: 'Viridis (Scientific)' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Gradient Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Gradient Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gradient Type
            </label>
            <div className="space-y-2">
              {gradientOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setLocalGradientType(option.value)}
                  className={`
                    w-full p-3 rounded-lg border-2 transition-all text-left
                    ${
                      localGradientType === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{option.label}</span>
                    {localGradientType === option.value && (
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                    )}
                  </div>
                  <div
                    className="h-6 rounded"
                    style={{
                      background:
                        option.value === 'custom'
                          ? getGradientCss('custom', localCustomGradient)
                          : getGradientCss(option.value),
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Gradient Settings */}
          {localGradientType === 'custom' && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Custom Settings</h3>
                <Button onClick={handleReset} variant="secondary" className="text-xs py-1 px-2">
                  Reset
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Min Value"
                  type="number"
                  step="0.001"
                  value={localCustomGradient.min}
                  onChange={e =>
                    setLocalCustomGradient(prev => ({
                      ...prev,
                      min: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                <Input
                  label="Max Value"
                  type="number"
                  step="0.001"
                  value={localCustomGradient.max}
                  onChange={e =>
                    setLocalCustomGradient(prev => ({
                      ...prev,
                      max: parseFloat(e.target.value) || 1,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={localCustomGradient.colorMin}
                      onChange={e =>
                        setLocalCustomGradient(prev => ({
                          ...prev,
                          colorMin: e.target.value,
                        }))
                      }
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localCustomGradient.colorMin}
                      onChange={e =>
                        setLocalCustomGradient(prev => ({
                          ...prev,
                          colorMin: e.target.value,
                        }))
                      }
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={localCustomGradient.colorMax}
                      onChange={e =>
                        setLocalCustomGradient(prev => ({
                          ...prev,
                          colorMax: e.target.value,
                        }))
                      }
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localCustomGradient.colorMax}
                      onChange={e =>
                        setLocalCustomGradient(prev => ({
                          ...prev,
                          colorMax: e.target.value,
                        }))
                      }
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Note: Custom min/max values are used for color mapping only. Mesh values remain
                unchanged.
              </div>
            </div>
          )}

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div
              className="h-16 rounded-lg border border-gray-300"
              style={{
                background: getGradientCss(localGradientType, localCustomGradient),
              }}
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>
                {localGradientType === 'custom'
                  ? localCustomGradient.min.toFixed(3)
                  : meshMin.toFixed(3)}
              </span>
              <span>
                {localGradientType === 'custom'
                  ? localCustomGradient.max.toFixed(3)
                  : meshMax.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t border-gray-200">
          <Button onClick={onClose} variant="secondary" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary" className="flex-1">
            Apply
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
