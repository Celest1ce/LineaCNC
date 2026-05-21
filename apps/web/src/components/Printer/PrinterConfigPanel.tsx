/**
 * Panel de configuration de l'imprimante
 * Permet l'import M990 et l'édition manuelle des paramètres
 */

import React, { useState } from 'react';
import { Settings, Upload, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import { usePrinterConfig } from '../../contexts/PrinterConfigContext';
import { Button } from '../UI/Button';

export const PrinterConfigPanel: React.FC = () => {
  const { config, updateConfig, loadFromM990, resetToDefaults, isValid, validationErrors } = usePrinterConfig();
  const [showM990Input, setShowM990Input] = useState(false);
  const [m990Text, setM990Text] = useState('');

  const handleM990Import = () => {
    const result = loadFromM990(m990Text);
    if (result.success) {
      alert('Configuration importée avec succès depuis M990 !');
      setShowM990Input(false);
      setM990Text('');
    } else {
      alert(`Erreur lors de l'import:\n${result.errors?.join('\n')}`);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Configuration de l'imprimante</h2>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowM990Input(!showM990Input)} variant="secondary">
            <Upload className="w-4 h-4 mr-2" />
            Importer M990
          </Button>
          <Button onClick={resetToDefaults} variant="secondary">
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Validation status */}
      {!isValid && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Configuration invalide:</p>
              <ul className="mt-2 space-y-1 text-sm text-red-700">
                {validationErrors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {isValid && config.sourceCommand === 'M990' && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-sm text-green-800">
              Configuration chargée depuis M990 le {new Date(config.lastUpdated!).toLocaleString('fr-FR')}
            </p>
          </div>
        </div>
      )}

      {/* M990 Import */}
      {showM990Input && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Coller la réponse M990 de l'imprimante:
          </label>
          <textarea
            value={m990Text}
            onChange={(e) => setM990Text(e.target.value)}
            className="w-full h-32 p-2 border border-gray-300 rounded-md font-mono text-sm"
            placeholder="Coller la sortie de la commande M990 ici..."
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={handleM990Import} disabled={!m990Text.trim()}>
              Importer
            </Button>
            <Button onClick={() => setShowM990Input(false)} variant="secondary">
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Configuration form */}
      <div className="space-y-6">
        {/* Informations générales */}
        <section>
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Informations générales</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom machine</label>
              <input
                type="text"
                value={config.machineName}
                onChange={(e) => updateConfig({ machineName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version firmware</label>
              <input
                type="text"
                value={config.firmwareVersion}
                onChange={(e) => updateConfig({ firmwareVersion: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type leveling</label>
              <select
                value={config.levelingType}
                onChange={(e) => updateConfig({ levelingType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="UBL">UBL (Unified Bed Leveling)</option>
                <option value="ABL">ABL (Auto Bed Leveling)</option>
                <option value="Manual">Manuel</option>
                <option value="None">Aucun</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Baudrate</label>
              <input
                type="number"
                value={config.baudrate}
                onChange={(e) => updateConfig({ baudrate: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </section>

        {/* Dimensions du plateau */}
        <section>
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Dimensions du plateau (mm)</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taille X</label>
              <input
                type="number"
                value={config.dimensions.x}
                onChange={(e) =>
                  updateConfig({
                    dimensions: { ...config.dimensions, x: parseFloat(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taille Y</label>
              <input
                type="number"
                value={config.dimensions.y}
                onChange={(e) =>
                  updateConfig({
                    dimensions: { ...config.dimensions, y: parseFloat(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hauteur Z</label>
              <input
                type="number"
                value={config.dimensions.z}
                onChange={(e) =>
                  updateConfig({
                    dimensions: { ...config.dimensions, z: parseFloat(e.target.value) },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </section>

        {/* Configuration du mesh */}
        <section>
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Configuration du mesh</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Colonnes (X)</label>
              <input
                type="number"
                min="3"
                max="20"
                value={config.meshDimensions.columns}
                onChange={(e) =>
                  updateConfig({
                    meshDimensions: {
                      ...config.meshDimensions,
                      columns: parseInt(e.target.value, 10),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lignes (Y)</label>
              <input
                type="number"
                min="3"
                max="20"
                value={config.meshDimensions.rows}
                onChange={(e) =>
                  updateConfig({
                    meshDimensions: {
                      ...config.meshDimensions,
                      rows: parseInt(e.target.value, 10),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </section>

        {/* Marges du probe */}
        <section>
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Marges du probe (mm)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gauche (L)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={config.probeMargins.left}
                onChange={(e) =>
                  updateConfig({
                    probeMargins: {
                      ...config.probeMargins,
                      left: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Droite (R)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={config.probeMargins.right}
                onChange={(e) =>
                  updateConfig({
                    probeMargins: {
                      ...config.probeMargins,
                      right: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avant (F)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={config.probeMargins.front}
                onChange={(e) =>
                  updateConfig({
                    probeMargins: {
                      ...config.probeMargins,
                      front: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arrière (B)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={config.probeMargins.back}
                onChange={(e) =>
                  updateConfig({
                    probeMargins: {
                      ...config.probeMargins,
                      back: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
