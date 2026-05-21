/**
 * Carte d'imprimante avec animations et actions
 */

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Printer as PrinterIcon,
  Wifi,
  WifiOff,
  RefreshCw,
  Terminal,
  Settings,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Printer, ConnectionStatus } from '../../types/printer';

interface PrinterCardProps {
  printer: Printer;
  onConnect: () => void;
  onDisconnect: () => void;
  onReconnect: () => void;
  onOpenTerminal: () => void;
  onOpenSettings: () => void;
  onDelete: () => void;
  onSelect: () => void;
}

export const PrinterCard: React.FC<PrinterCardProps> = ({
  printer,
  onConnect,
  onDisconnect,
  onReconnect,
  onOpenTerminal,
  onOpenSettings,
  onDelete,
  onSelect,
}) => {
  const navigate = useNavigate();

  const getStatusColor = () => {
    switch (printer.connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'bg-green-100 border-green-300 text-green-800';
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case ConnectionStatus.ERROR:
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (printer.connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'Connected';
      case ConnectionStatus.CONNECTING:
        return 'Connecting...';
      case ConnectionStatus.RECONNECTING:
        return 'Reconnecting...';
      case ConnectionStatus.ERROR:
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  const getStatusIcon = () => {
    switch (printer.connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return <Wifi className="w-4 h-4" />;
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case ConnectionStatus.ERROR:
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const isConnected = printer.connectionStatus === ConnectionStatus.CONNECTED;
  const isConnecting =
    printer.connectionStatus === ConnectionStatus.CONNECTING ||
    printer.connectionStatus === ConnectionStatus.RECONNECTING;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow duration-300 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <PrinterIcon className="w-8 h-8" />
            <div>
              <h3 className="text-lg font-bold">{printer.name}</h3>
              {printer.firmware.name && (
                <p className="text-sm opacity-90">
                  {printer.firmware.name} {printer.firmware.version}
                </p>
              )}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="text-xs font-semibold">{getStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* État de l'imprimante */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-3 text-sm"
          >
            {printer.state.temperature && (
              <>
                <div className="bg-orange-50 p-2 rounded">
                  <p className="text-gray-600 text-xs">Hotend</p>
                  <p className="font-semibold text-orange-600">
                    {printer.state.temperature.hotend?.toFixed(1) ?? '--'}°C
                    {printer.state.temperature.targetHotend && (
                      <span className="text-xs text-gray-500">
                        {' '}
                        / {printer.state.temperature.targetHotend.toFixed(1)}°C
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-gray-600 text-xs">Bed</p>
                  <p className="font-semibold text-blue-600">
                    {printer.state.temperature.bed?.toFixed(1) ?? '--'}°C
                    {printer.state.temperature.targetBed && (
                      <span className="text-xs text-gray-500">
                        {' '}
                        / {printer.state.temperature.targetBed.toFixed(1)}°C
                      </span>
                    )}
                  </p>
                </div>
              </>
            )}

            {printer.state.position && (
              <div className="col-span-2 bg-gray-50 p-2 rounded">
                <p className="text-gray-600 text-xs mb-1">Position</p>
                <p className="font-mono text-xs">
                  X: {printer.state.position.x?.toFixed(2) ?? '--'} Y:{' '}
                  {printer.state.position.y?.toFixed(2) ?? '--'} Z:{' '}
                  {printer.state.position.z?.toFixed(2) ?? '--'}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* Erreur */}
        {printer.lastError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 p-2 rounded text-sm text-red-700"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs">{printer.lastError}</p>
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {!isConnected && !isConnecting && (
            <button
              onClick={onConnect}
              className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors duration-200 font-medium text-sm"
            >
              Connect
            </button>
          )}

          {isConnected && (
            <>
              <button
                onClick={onOpenTerminal}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium text-sm flex items-center justify-center gap-2"
              >
                <Terminal className="w-4 h-4" />
                Terminal
              </button>
              <button
                onClick={() => navigate(`/control/${printer.id}`)}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium text-sm flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Control
              </button>
              <button
                onClick={onDisconnect}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 font-medium text-sm"
              >
                Disconnect
              </button>
            </>
          )}

          {printer.connectionStatus === ConnectionStatus.ERROR && (
            <button
              onClick={onReconnect}
              className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors duration-200 font-medium text-sm flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onDelete}
            className="bg-gray-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors duration-200 cursor-pointer"
            title="Delete printer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Informations supplémentaires */}
        <button
          onClick={onSelect}
          className="w-full text-xs text-gray-500 hover:text-primary-600 transition-colors text-center pt-2 border-t border-gray-100"
        >
          View Details →
        </button>
      </div>
    </motion.div>
  );
};
