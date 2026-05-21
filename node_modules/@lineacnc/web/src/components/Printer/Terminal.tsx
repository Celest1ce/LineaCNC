/**
 * Terminal de commandes pour l'imprimante
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal as TerminalIcon, Send, Trash2, Copy, X, History } from 'lucide-react';
import { Printer, PrinterEvent, ParsedSerialData } from '../../types/printer';
import { usePrinter } from '../../contexts/PrinterContext';
import { webSerial } from '../../services/web-serial.service';
import { logger } from '../../utils/logger';

interface TerminalProps {
  printer: Printer;
  onClose: () => void;
}

interface TerminalLine {
  id: string;
  timestamp: number;
  type: 'command' | 'response' | 'error';
  text: string;
}

export const Terminal: React.FC<TerminalProps> = ({ printer, onClose }) => {
  const [commandInput, setCommandInput] = useState('');
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendCommand, getCommandHistory } = usePrinter();

  // Charger l'historique des commandes
  useEffect(() => {
    loadCommandHistory();
  }, [printer.id]);

  // Écouter les données reçues
  useEffect(() => {
    const unsubscribe = webSerial.on(PrinterEvent.DATA_RECEIVED, payload => {
      if (payload.printerId === printer.id && payload.data) {
        const data = payload.data as ParsedSerialData;
        addLine({
          type: data.type === 'error_message' ? 'error' : 'response',
          text: data.raw || JSON.stringify(data),
        });
      }
    });

    return () => unsubscribe();
  }, [printer.id]);

  // Auto-scroll vers le bas
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const loadCommandHistory = async () => {
    try {
      const history = await getCommandHistory(printer.id);
      setCommandHistory(history.map(cmd => cmd.command).reverse());
    } catch (error) {
      logger.error('Failed to load command history', error);
    }
  };

  const addLine = (line: Omit<TerminalLine, 'id' | 'timestamp'>) => {
    setLines(prev => [
      ...prev,
      {
        ...line,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      },
    ]);
  };

  const handleSendCommand = async () => {
    const command = commandInput.trim();
    if (!command) return;

    // Ajouter à l'affichage
    addLine({ type: 'command', text: `> ${command}` });

    // Envoyer la commande
    try {
      await sendCommand(printer.id, command);

      // Ajouter à l'historique
      setCommandHistory(prev => [command, ...prev.filter(c => c !== command)]);
      setCommandInput('');
      setHistoryIndex(-1);
    } catch (error) {
      addLine({
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : 'Failed to send command'}`,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput('');
      }
    }
  };

  const clearTerminal = () => {
    setLines([]);
  };

  const copyToClipboard = () => {
    const text = lines.map(line => line.text).join('\n');
    navigator.clipboard.writeText(text);
  };

  const replayCommand = (command: string) => {
    setCommandInput(command);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const getLineClassName = (type: TerminalLine['type']) => {
    switch (type) {
      case 'command':
        return 'text-blue-400 font-semibold';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-green-400';
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
        className="bg-gray-900 rounded-lg shadow-2xl max-w-4xl w-full h-[600px] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-800 p-4 rounded-t-lg flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            <TerminalIcon className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-semibold">Terminal - {printer.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              title="Command History"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={copyToClipboard}
              className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              title="Copy to Clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={clearTerminal}
              className="p-2 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors"
              title="Clear Terminal"
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

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Terminal output */}
          <div className="flex-1 flex flex-col">
            <div
              ref={terminalRef}
              className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-gray-950"
            >
              {lines.length === 0 ? (
                <p className="text-gray-500 italic">
                  Terminal ready. Type a command and press Enter...
                </p>
              ) : (
                <div className="space-y-1">
                  {lines.map(line => (
                    <div key={line.id} className="flex gap-3">
                      <span className="text-gray-600 text-xs flex-shrink-0">
                        {formatTimestamp(line.timestamp)}
                      </span>
                      <span className={getLineClassName(line.type)}>{line.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-gray-900 border-t border-gray-700">
              <div className="flex gap-2">
                <span className="text-green-400 font-mono flex-shrink-0">$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={commandInput}
                  onChange={e => setCommandInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter command (e.g., M115, G28, M104 S200)..."
                  className="flex-1 bg-transparent text-white font-mono outline-none placeholder-gray-600"
                  autoFocus
                />
                <button
                  onClick={handleSendCommand}
                  disabled={!commandInput.trim()}
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press ↑/↓ to navigate history • Enter to send • Esc to close
              </p>
            </div>
          </div>

          {/* History sidebar */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 300, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="bg-gray-800 border-l border-gray-700 overflow-hidden"
              >
                <div className="p-4 h-full flex flex-col">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Command History
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-1">
                    {commandHistory.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">No commands yet</p>
                    ) : (
                      commandHistory.map((cmd, index) => (
                        <button
                          key={index}
                          onClick={() => replayCommand(cmd)}
                          className="w-full text-left p-2 rounded hover:bg-gray-700 text-sm text-gray-300 hover:text-white transition-colors font-mono truncate"
                          title={cmd}
                        >
                          {cmd}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
