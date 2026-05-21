/**
 * Système de logs avec filtrage intelligent
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Filter,
  Trash2,
  Download,
  Search,
  AlertCircle,
  Info,
  AlertTriangle,
  Bug,
  Flame,
} from 'lucide-react';
import { LogEntry, LogLevel, LogFilter } from '../../types/printer';
import { usePrinter } from '../../contexts/PrinterContext';
import { logBuffer } from '../../services/log-buffer.service';
import { logger } from '../../utils/logger';

interface LogsProps {
  printerId?: string;
  onClose: () => void;
}

export const Logs: React.FC<LogsProps> = ({ printerId, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>({ printerId });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { getLogs, clearLogs } = usePrinter();

  useEffect(() => {
    loadLogs();

    // Refresh logs every 2 seconds to show new buffered logs
    const refreshInterval = setInterval(() => {
      loadLogs();
    }, 2000);

    return () => clearInterval(refreshInterval);
  }, [filter]);

  const loadLogs = async () => {
    try {
      // Load logs from database
      const dbLogs = await getLogs({ ...filter, searchTerm: searchTerm || undefined });

      // Get buffered logs (not yet persisted to database)
      const bufferedLogs = logBuffer.getBufferedLogs();

      // Filter buffered logs based on current filter
      let filteredBufferedLogs = bufferedLogs;

      if (filter.printerId) {
        filteredBufferedLogs = filteredBufferedLogs.filter(log => log.printerId === filter.printerId);
      }

      if (filter.levels && filter.levels.length > 0) {
        filteredBufferedLogs = filteredBufferedLogs.filter(log => filter.levels!.includes(log.level));
      }

      if (filter.categories && filter.categories.length > 0) {
        filteredBufferedLogs = filteredBufferedLogs.filter(log => filter.categories!.includes(log.category));
      }

      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filteredBufferedLogs = filteredBufferedLogs.filter(log =>
          log.message.toLowerCase().includes(lowerSearch)
        );
      }

      // Merge and sort by timestamp (newest first)
      const allLogs = [...dbLogs, ...filteredBufferedLogs].sort((a, b) => b.timestamp - a.timestamp);

      setLogs(allLogs);
    } catch (error) {
      logger.error('Failed to load logs', error);
    }
  };

  const handleClearLogs = async () => {
    // Clear database logs
    await clearLogs(printerId);
    // Clear buffer logs (only if printerId matches or no printerId specified)
    if (!printerId) {
      logBuffer.clear();
    }
    setLogs([]);
  };

  const handleExportLogs = () => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `printer-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleLevel = (level: LogLevel) => {
    setFilter(prev => {
      const levels = prev.levels || [];
      const newLevels = levels.includes(level)
        ? levels.filter(l => l !== level)
        : [...levels, level];
      return { ...prev, levels: newLevels.length > 0 ? newLevels : undefined };
    });
  };

  const toggleCategory = (category: LogEntry['category']) => {
    setFilter(prev => {
      const categories = prev.categories || [];
      const newCategories = categories.includes(category)
        ? categories.filter(c => c !== category)
        : [...categories, category];
      return { ...prev, categories: newCategories.length > 0 ? newCategories : undefined };
    });
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return <Bug className="w-4 h-4" />;
      case LogLevel.INFO:
        return <Info className="w-4 h-4" />;
      case LogLevel.WARNING:
        return <AlertTriangle className="w-4 h-4" />;
      case LogLevel.ERROR:
        return <AlertCircle className="w-4 h-4" />;
      case LogLevel.CRITICAL:
        return <Flame className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return 'text-gray-500 bg-gray-100';
      case LogLevel.INFO:
        return 'text-blue-600 bg-blue-100';
      case LogLevel.WARNING:
        return 'text-yellow-600 bg-yellow-100';
      case LogLevel.ERROR:
        return 'text-red-600 bg-red-100';
      case LogLevel.CRITICAL:
        return 'text-red-800 bg-red-200';
    }
  };

  const getCategoryColor = (category: LogEntry['category']) => {
    switch (category) {
      case 'connection':
        return 'bg-purple-100 text-purple-700';
      case 'command':
        return 'bg-green-100 text-green-700';
      case 'data':
        return 'bg-blue-100 text-blue-700';
      case 'system':
        return 'bg-gray-100 text-gray-700';
      case 'error':
        return 'bg-red-100 text-red-700';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
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
        className="bg-white rounded-lg shadow-2xl max-w-6xl w-full h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 p-4 rounded-t-lg flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-blue-400" />
            <h2 className="text-white font-semibold">System Logs</h2>
            <span className="text-gray-400 text-sm">({logs.length} entries)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded transition-colors ${
                showFilters ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
              }`}
              title="Toggle Filters"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportLogs}
              className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              title="Export Logs"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearLogs}
              className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              title="Clear Logs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-gray-50 border-b border-gray-200 overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadLogs()}
                    placeholder="Search logs..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                  <button
                    onClick={loadLogs}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
                  >
                    Search
                  </button>
                </div>

                {/* Level filters */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Log Level</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.values(LogLevel).map(level => (
                      <button
                        key={level}
                        onClick={() => toggleLevel(level)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                          filter.levels?.includes(level)
                            ? getLevelColor(level)
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {level.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category filters */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Category</p>
                  <div className="flex gap-2 flex-wrap">
                    {(['connection', 'command', 'data', 'system', 'error'] as LogEntry['category'][]).map(
                      category => (
                        <button
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            filter.categories?.includes(category)
                              ? getCategoryColor(category)
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {category.toUpperCase()}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Logs list */}
        <div className="flex-1 overflow-y-auto p-4">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Info className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-lg font-semibold">No logs found</p>
              <p className="text-sm">Logs will appear here as they are generated</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded ${getLevelColor(log.level)}`}>
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCategoryColor(log.category)}`}>
                          {log.category}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 break-words">{log.message}</p>
                      {log.data !== undefined && log.data !== null && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                            View data
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
