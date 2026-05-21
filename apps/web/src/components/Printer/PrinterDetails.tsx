/**
 * Détails complets d'une imprimante
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Edit2, Save, RefreshCw, Info, Settings as SettingsIcon, Maximize2, Upload, Grid3x3 } from 'lucide-react';
import { Printer } from '../../types/printer';
import { usePrinter } from '../../contexts/PrinterContext';
import { apiService } from '../../services/api.service';
import { logger } from '../../utils/logger';
import { parseM990Response, mergeWithDefaults, validatePrinterConfig } from '../../utils/m990-parser.utils';

interface PrinterDetailsProps {
  printer: Printer;
  onClose: () => void;
}

export const PrinterDetails: React.FC<PrinterDetailsProps> = ({ printer, onClose }) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(printer.name);
  const { updatePrinterName, reconnectPrinter } = usePrinter();

  // Print area states
  const [printAreaX, setPrintAreaX] = useState(200);
  const [printAreaY, setPrintAreaY] = useState(200);
  const [printAreaZ, setPrintAreaZ] = useState(200);
  const [isLoadingPrintArea, setIsLoadingPrintArea] = useState(true);

  // Mesh configuration states
  const [meshColumns, setMeshColumns] = useState(7);
  const [meshRows, setMeshRows] = useState(7);
  const [probeMarginLeft, setProbeMarginLeft] = useState(20);
  const [probeMarginRight, setProbeMarginRight] = useState(20);
  const [probeMarginFront, setProbeMarginFront] = useState(20);
  const [probeMarginBack, setProbeMarginBack] = useState(20);

  // M990 import
  const [showM990Input, setShowM990Input] = useState(false);
  const [m990Text, setM990Text] = useState('');

  // Load print area and mesh parameters on mount
  useEffect(() => {
    const loadPrinterParams = async () => {
      try {
        setIsLoadingPrintArea(true);
        const parameters = await apiService.getPrinterParameters(printer.id, 1);

        // Print area
        const printAreaXParam = parameters.find(p => p.parameter_key === 'print_area.x');
        if (printAreaXParam) setPrintAreaX(Number(printAreaXParam.value));

        const printAreaYParam = parameters.find(p => p.parameter_key === 'print_area.y');
        if (printAreaYParam) setPrintAreaY(Number(printAreaYParam.value));

        const printAreaZParam = parameters.find(p => p.parameter_key === 'print_area.z');
        if (printAreaZParam) setPrintAreaZ(Number(printAreaZParam.value));

        // Mesh dimensions
        const meshColsParam = parameters.find(p => p.parameter_key === 'mesh.columns');
        if (meshColsParam) setMeshColumns(Number(meshColsParam.value));

        const meshRowsParam = parameters.find(p => p.parameter_key === 'mesh.rows');
        if (meshRowsParam) setMeshRows(Number(meshRowsParam.value));

        // Probe margins
        const marginLeftParam = parameters.find(p => p.parameter_key === 'probe_margin.left');
        if (marginLeftParam) setProbeMarginLeft(Number(marginLeftParam.value));

        const marginRightParam = parameters.find(p => p.parameter_key === 'probe_margin.right');
        if (marginRightParam) setProbeMarginRight(Number(marginRightParam.value));

        const marginFrontParam = parameters.find(p => p.parameter_key === 'probe_margin.front');
        if (marginFrontParam) setProbeMarginFront(Number(marginFrontParam.value));

        const marginBackParam = parameters.find(p => p.parameter_key === 'probe_margin.back');
        if (marginBackParam) setProbeMarginBack(Number(marginBackParam.value));
      } catch (error) {
        logger.error('Failed to load printer parameters', error);
      } finally {
        setIsLoadingPrintArea(false);
      }
    };

    loadPrinterParams();
  }, [printer.id]);

  const handleSaveName = async () => {
    if (newName.trim() && newName !== printer.name) {
      try {
        await updatePrinterName(printer.id, newName.trim());
        setIsEditingName(false);
      } catch (error) {
        logger.error('Failed to update name', error);
      }
    } else {
      setIsEditingName(false);
      setNewName(printer.name);
    }
  };

  const handlePrintAreaChange = async (axis: 'x' | 'y' | 'z', value: number) => {
    try {
      await apiService.setPrinterParameter(printer.id, `print_area.${axis}`, value, 1);
      logger.info(`Print area ${axis.toUpperCase()} updated to ${value}`);
    } catch (error) {
      logger.error(`Failed to update print area ${axis}`, error);
    }
  };

  const handleMeshDimensionChange = async (axis: 'columns' | 'rows', value: number) => {
    try {
      await apiService.setPrinterParameter(printer.id, `mesh.${axis}`, value, 1);
      logger.info(`Mesh ${axis} updated to ${value}`);
    } catch (error) {
      logger.error(`Failed to update mesh ${axis}`, error);
    }
  };

  const handleProbeMarginChange = async (side: 'left' | 'right' | 'front' | 'back', value: number) => {
    try {
      await apiService.setPrinterParameter(printer.id, `probe_margin.${side}`, value, 1);
      logger.info(`Probe margin ${side} updated to ${value}`);
    } catch (error) {
      logger.error(`Failed to update probe margin ${side}`, error);
    }
  };

  const handleM990Import = async () => {
    try {
      const parsed = parseM990Response(m990Text);
      const merged = mergeWithDefaults(parsed);
      const validation = validatePrinterConfig(merged);

      if (!validation.valid) {
        alert(`Erreurs de validation:\n${validation.errors.join('\n')}`);
        return;
      }

      // Sauvegarder tous les paramètres via l'API
      const promises = [];

      if (merged.dimensions) {
        promises.push(apiService.setPrinterParameter(printer.id, 'print_area.x', merged.dimensions.x, 1));
        promises.push(apiService.setPrinterParameter(printer.id, 'print_area.y', merged.dimensions.y, 1));
        promises.push(apiService.setPrinterParameter(printer.id, 'print_area.z', merged.dimensions.z, 1));
      }

      if (merged.meshDimensions) {
        promises.push(apiService.setPrinterParameter(printer.id, 'mesh.columns', merged.meshDimensions.columns, 1));
        promises.push(apiService.setPrinterParameter(printer.id, 'mesh.rows', merged.meshDimensions.rows, 1));
      }

      if (merged.probeMargins) {
        promises.push(apiService.setPrinterParameter(printer.id, 'probe_margin.left', merged.probeMargins.left, 1));
        promises.push(apiService.setPrinterParameter(printer.id, 'probe_margin.right', merged.probeMargins.right, 1));
        promises.push(apiService.setPrinterParameter(printer.id, 'probe_margin.front', merged.probeMargins.front, 1));
        promises.push(apiService.setPrinterParameter(printer.id, 'probe_margin.back', merged.probeMargins.back, 1));
      }

      await Promise.all(promises);

      // Mettre à jour les états locaux
      if (merged.dimensions) {
        setPrintAreaX(merged.dimensions.x);
        setPrintAreaY(merged.dimensions.y);
        setPrintAreaZ(merged.dimensions.z);
      }

      if (merged.meshDimensions) {
        setMeshColumns(merged.meshDimensions.columns);
        setMeshRows(merged.meshDimensions.rows);
      }

      if (merged.probeMargins) {
        setProbeMarginLeft(merged.probeMargins.left);
        setProbeMarginRight(merged.probeMargins.right);
        setProbeMarginFront(merged.probeMargins.front);
        setProbeMarginBack(merged.probeMargins.back);
      }

      setShowM990Input(false);
      setM990Text('');
      alert('Configuration M990 importée avec succès !');
    } catch (error) {
      logger.error('Failed to import M990', error);
      alert('Erreur lors de l\'import M990');
    }
  };

  const handleReconnect = async () => {
    try {
      await reconnectPrinter(printer.id);
    } catch (error) {
      logger.error('Reconnect failed', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 p-6 text-white rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    className="bg-white text-gray-900 px-3 py-1 rounded text-xl font-bold flex-1"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="bg-white text-primary-600 p-2 rounded hover:bg-gray-100"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{printer.name}</h2>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-sm opacity-90 mt-1">UUID: {printer.uuid}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Firmware Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold">Firmware Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Name</p>
                <p className="font-semibold">{printer.firmware.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-600">Version</p>
                <p className="font-semibold">{printer.firmware.version || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-600">Protocol</p>
                <p className="font-semibold">{printer.firmware.protocol || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-600">Capabilities</p>
                <p className="font-semibold">
                  {printer.firmware.capabilities?.join(', ') || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Hardware Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <SettingsIcon className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold">Hardware Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Vendor ID</p>
                <p className="font-mono font-semibold">
                  {printer.hardware.vendorId?.toString(16).toUpperCase() || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Product ID</p>
                <p className="font-mono font-semibold">
                  {printer.hardware.productId?.toString(16).toUpperCase() || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Manufacturer</p>
                <p className="font-semibold">{printer.hardware.manufacturer || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-600">Serial Number</p>
                <p className="font-mono font-semibold">
                  {printer.hardware.serialNumber || 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Print Area Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Maximize2 className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold">Print Area Settings</h3>
            </div>
            {isLoadingPrintArea ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading print area settings...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      X Axis (mm)
                    </label>
                    <input
                      type="number"
                      value={printAreaX}
                      onChange={e => {
                        const value = Number(e.target.value);
                        setPrintAreaX(value);
                        handlePrintAreaChange('x', value);
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="10"
                      max="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Y Axis (mm)
                    </label>
                    <input
                      type="number"
                      value={printAreaY}
                      onChange={e => {
                        const value = Number(e.target.value);
                        setPrintAreaY(value);
                        handlePrintAreaChange('y', value);
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="10"
                      max="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Z Axis (mm)
                    </label>
                    <input
                      type="number"
                      value={printAreaZ}
                      onChange={e => {
                        const value = Number(e.target.value);
                        setPrintAreaZ(value);
                        handlePrintAreaChange('z', value);
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      min="10"
                      max="1000"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Ces valeurs sont automatiquement récupérées via la commande M990 lors de la première connexion. Les modifications sont sauvegardées automatiquement.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* M990 Import */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold">Import Configuration (M990)</h3>
              </div>
              <button
                onClick={() => setShowM990Input(!showM990Input)}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
              >
                {showM990Input ? 'Cancel' : 'Import M990'}
              </button>
            </div>
            {showM990Input && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Paste M990 response from printer:
                  </label>
                  <textarea
                    value={m990Text}
                    onChange={e => setM990Text(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    rows={6}
                    placeholder="Paste the output of the M990 command here..."
                  />
                </div>
                <button
                  onClick={handleM990Import}
                  disabled={!m990Text.trim()}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                  Parse and Import
                </button>
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs text-blue-800">
                    <strong>Info:</strong> The M990 command returns all printer configuration parameters. Pasting the response here will automatically configure print area, mesh dimensions, and probe margins.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mesh Configuration */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Grid3x3 className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold">Mesh Configuration</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Columns (X)
                </label>
                <input
                  type="number"
                  value={meshColumns}
                  onChange={e => {
                    const value = Number(e.target.value);
                    setMeshColumns(value);
                    handleMeshDimensionChange('columns', value);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="3"
                  max="20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Rows (Y)
                </label>
                <input
                  type="number"
                  value={meshRows}
                  onChange={e => {
                    const value = Number(e.target.value);
                    setMeshRows(value);
                    handleMeshDimensionChange('rows', value);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="3"
                  max="20"
                />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-3">
              <p className="text-xs text-blue-800">
                <strong>Grid Size:</strong> {meshColumns} × {meshRows} = {meshColumns * meshRows} probe points
              </p>
            </div>
          </div>

          {/* Probe Margins */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Maximize2 className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold">Probe Margins (mm)</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Left Margin
                </label>
                <input
                  type="number"
                  value={probeMarginLeft}
                  onChange={e => {
                    const value = Number(e.target.value);
                    setProbeMarginLeft(value);
                    handleProbeMarginChange('left', value);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Right Margin
                </label>
                <input
                  type="number"
                  value={probeMarginRight}
                  onChange={e => {
                    const value = Number(e.target.value);
                    setProbeMarginRight(value);
                    handleProbeMarginChange('right', value);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Front Margin
                </label>
                <input
                  type="number"
                  value={probeMarginFront}
                  onChange={e => {
                    const value = Number(e.target.value);
                    setProbeMarginFront(value);
                    handleProbeMarginChange('front', value);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Back Margin
                </label>
                <input
                  type="number"
                  value={probeMarginBack}
                  onChange={e => {
                    const value = Number(e.target.value);
                    setProbeMarginBack(value);
                    handleProbeMarginChange('back', value);
                  }}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-3">
              <p className="text-xs text-blue-800">
                <strong>Probeable Area:</strong> {(printAreaX - probeMarginLeft - probeMarginRight).toFixed(1)} × {(printAreaY - probeMarginFront - probeMarginBack).toFixed(1)} mm
              </p>
            </div>
          </div>

          {/* Serial Configuration */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Serial Port Configuration</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Baud Rate</p>
                <p className="font-semibold">{printer.config.serialOptions.baudRate}</p>
              </div>
              <div>
                <p className="text-gray-600">Data Bits</p>
                <p className="font-semibold">{printer.config.serialOptions.dataBits}</p>
              </div>
              <div>
                <p className="text-gray-600">Stop Bits</p>
                <p className="font-semibold">{printer.config.serialOptions.stopBits}</p>
              </div>
              <div>
                <p className="text-gray-600">Parity</p>
                <p className="font-semibold">{printer.config.serialOptions.parity}</p>
              </div>
              <div>
                <p className="text-gray-600">Flow Control</p>
                <p className="font-semibold">{printer.config.serialOptions.flowControl}</p>
              </div>
              <div>
                <p className="text-gray-600">Buffer Size</p>
                <p className="font-semibold">{printer.config.serialOptions.bufferSize} bytes</p>
              </div>
            </div>
          </div>

          {/* Connection Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Connection Settings</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Auto Reconnect</p>
                <p className="font-semibold">
                  {printer.config.autoReconnect ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Reconnect Delay</p>
                <p className="font-semibold">{printer.config.reconnectDelay}ms</p>
              </div>
              <div>
                <p className="text-gray-600">Max Reconnect Attempts</p>
                <p className="font-semibold">{printer.config.maxReconnectAttempts}</p>
              </div>
              <div>
                <p className="text-gray-600">Command Timeout</p>
                <p className="font-semibold">{printer.config.commandTimeout}ms</p>
              </div>
              <div>
                <p className="text-gray-600">Keep Alive Interval</p>
                <p className="font-semibold">{printer.config.keepAliveInterval || 'N/A'}ms</p>
              </div>
            </div>
          </div>

          {/* Quick Reconnect */}
          <button
            onClick={handleReconnect}
            className="w-full bg-primary-600 text-white py-3 rounded-lg hover:bg-primary-700 transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Quick Reconnect
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
