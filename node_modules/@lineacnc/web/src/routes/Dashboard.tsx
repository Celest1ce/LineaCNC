/**
 * Dashboard principal de gestion des imprimantes
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, AlertCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { usePrinter } from '../contexts/PrinterContext';
import { logger } from '../utils/logger';
import { PrinterCard } from '../components/Printer/PrinterCard';
import { Terminal } from '../components/Printer/Terminal';
import { PrinterDetails } from '../components/Printer/PrinterDetails';
import { Logs } from '../components/Printer/Logs';
import { Printer } from '../types/printer';

export function Dashboard() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    printers,
    loading: printersLoading,
    error,
    requestConnection,
    disconnectPrinter,
    reconnectPrinter,
    deletePrinter,
    isSupported,
  } = usePrinter();

  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [terminalPrinter, setTerminalPrinter] = useState<Printer | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-xl">{t('dashboard.loading')}</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return null;
  }

  const handleAddPrinter = async () => {
    try {
      await requestConnection();
    } catch (error) {
      // L'erreur est déjà gérée par le contexte
      logger.error('Connection failed', error);
    }
  };

  const handleDisconnect = async (printerId: string) => {
    try {
      await disconnectPrinter(printerId);
    } catch (error) {
      logger.error('Disconnect failed', error);
    }
  };

  const handleReconnect = async (printerId: string) => {
    try {
      await reconnectPrinter(printerId);
    } catch (error) {
      logger.error('Reconnect failed', error);
    }
  };

  const handleDelete = async (printerId: string) => {
    // Simple suppression sans confirmation - l'UI devrait avoir un bouton clair
    try {
      await deletePrinter(printerId);
    } catch (error) {
      logger.error('Delete failed', error);
    }
  };

  return (
    <Layout fullWidth>
      <div className="w-full px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 text-primary-700">
            {t('dashboard.title')}
          </h1>
          <p className="text-gray-600">
            {t('dashboard.subtitle')}
          </p>
        </motion.div>

        {/* Web Serial Support Warning */}
        {!isSupported && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">{t('dashboard.notSupported.title')}</h3>
              <p className="text-sm text-red-700">
                {t('dashboard.notSupported.description')}
              </p>
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800">{error}</p>
            </div>
          </motion.div>
        )}

        {/* Actions Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3 mb-6"
        >
          <button
            onClick={handleAddPrinter}
            disabled={!isSupported}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors duration-200 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            {t('dashboard.addPrinter')}
          </button>
        </motion.div>

        {/* Printers Grid */}
        {printersLoading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">{t('dashboard.loadingPrinters')}</p>
          </div>
        ) : printers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-lg shadow-lg p-12 text-center"
          >
            <div className="text-6xl mb-4">🖨️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('dashboard.noPrinters.title')}</h2>
            <p className="text-gray-600 mb-6">
              {t('dashboard.noPrinters.description')}
            </p>
            <button
              onClick={handleAddPrinter}
              disabled={!isSupported}
              className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors duration-200 font-semibold inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
              {t('dashboard.noPrinters.action')}
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {printers.map(printer => (
                <PrinterCard
                  key={printer.id}
                  printer={printer}
                  onConnect={() => handleReconnect(printer.id)}
                  onDisconnect={() => handleDisconnect(printer.id)}
                  onReconnect={() => handleReconnect(printer.id)}
                  onOpenTerminal={() => setTerminalPrinter(printer)}
                  onOpenSettings={() => setSelectedPrinter(printer)}
                  onDelete={() => handleDelete(printer.id)}
                  onSelect={() => setSelectedPrinter(printer)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Modals */}
        <AnimatePresence>
          {terminalPrinter && (
            <Terminal
              printer={terminalPrinter}
              onClose={() => setTerminalPrinter(null)}
            />
          )}

          {selectedPrinter && (
            <PrinterDetails
              printer={selectedPrinter}
              onClose={() => setSelectedPrinter(null)}
            />
          )}

          {showLogs && <Logs onClose={() => setShowLogs(false)} />}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
