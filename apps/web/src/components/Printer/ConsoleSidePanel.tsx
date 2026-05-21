import React, { useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, Send, Trash2, Settings, X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConsoleEntry {
  id: string;
  timestamp: number;
  type: 'command' | 'response' | 'error';
  text: string;
}

interface ConsoleFilter {
  id: string;
  name: string;
  regex: string;
  enabled: boolean;
}

interface ConsoleSidePanelProps {
  isOpen: boolean;
  onToggle: () => void;
  consoleEntries: ConsoleEntry[];
  commandInput: string;
  onCommandInputChange: (value: string) => void;
  onSendCommand: (command: string) => void;
  onClearConsole: () => void;
  isConnected: boolean;
  autoscroll: boolean;
  onAutoscrollChange: (value: boolean) => void;
  consoleFilters: ConsoleFilter[];
  onToggleFilter: (filterId: string) => void;
  onDeleteFilter: (filterId: string) => void;
  onAddFilter: (name: string, regex: string) => void;
  getFilteredConsoleEntries: () => ConsoleEntry[];
}

export const ConsoleSidePanel: React.FC<ConsoleSidePanelProps> = ({
  isOpen,
  onToggle,
  consoleEntries,
  commandInput,
  onCommandInputChange,
  onSendCommand,
  onClearConsole,
  isConnected,
  autoscroll,
  onAutoscrollChange,
  consoleFilters,
  onToggleFilter,
  onDeleteFilter,
  onAddFilter,
  getFilteredConsoleEntries,
}) => {
  const { t } = useTranslation();
  const consoleRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);
  const [newFilterName, setNewFilterName] = React.useState('');
  const [newFilterRegex, setNewFilterRegex] = React.useState('');

  // Auto-scroll de la console
  useEffect(() => {
    if (consoleRef.current && autoscroll) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleEntries, autoscroll]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  const getConsoleLineClassName = (type: ConsoleEntry['type']) => {
    switch (type) {
      case 'command':
        return 'text-blue-600 font-semibold';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-green-600';
    }
  };

  const handleAddFilter = () => {
    if (!newFilterName.trim() || !newFilterRegex.trim()) return;
    onAddFilter(newFilterName, newFilterRegex);
    setNewFilterName('');
    setNewFilterRegex('');
  };

  return (
    <>
      {/* Languette verticale */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-40 bg-green-600 text-white px-2 py-6 rounded-l-lg shadow-lg hover:bg-green-700 transition-all duration-300 ${
          isOpen ? 'right-[600px]' : 'right-0'
        }`}
        style={{ writingMode: 'vertical-rl' }}
      >
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4" />
          <span className="font-semibold text-sm">CONSOLE</span>
        </div>
      </button>

      {/* Panneau latéral */}
      <div
        className={`fixed top-0 right-0 h-full w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Console Header */}
          <div className="bg-gray-100 p-4 flex items-center justify-between border-b border-gray-200">
            <div className="flex items-center gap-3">
              <TerminalIcon className="w-5 h-5 text-green-600" />
              <h2 className="text-gray-900 font-semibold text-base">{t('control.console')}</h2>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-gray-700 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoscroll}
                  onChange={e => onAutoscrollChange(e.target.checked)}
                  className="rounded w-4 h-4"
                />
                <span>Auto</span>
              </label>
              <button
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className="p-2 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 transition-colors"
                title="Console Filters"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={onClearConsole}
                className="p-2 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 transition-colors"
                title="Clear Console"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onToggle}
                className="p-2 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 transition-colors"
                title="Close Console"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Modal */}
          {showFilterPanel && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => setShowFilterPanel(false)}
            >
              <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                  <h3 className="font-bold text-base">Console Filters</h3>
                  <button
                    onClick={() => setShowFilterPanel(false)}
                    className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 max-h-96 overflow-y-auto">
                  {/* Filters List */}
                  <div className="space-y-2 mb-4">
                    {consoleFilters.map(filter => (
                      <div
                        key={filter.id}
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={filter.enabled}
                          onChange={() => onToggleFilter(filter.id)}
                          className="rounded w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{filter.name}</div>
                          <div className="text-xs text-gray-500 font-mono truncate">{filter.regex}</div>
                        </div>
                        <button
                          onClick={() => onDeleteFilter(filter.id)}
                          className="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Filter */}
                  <div className="border-t pt-4 space-y-2">
                    <input
                      type="text"
                      value={newFilterName}
                      onChange={e => setNewFilterName(e.target.value)}
                      placeholder="Filter name..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={newFilterRegex}
                      onChange={e => setNewFilterRegex(e.target.value)}
                      placeholder="Regex pattern..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded font-mono focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleAddFilter}
                      disabled={!newFilterName.trim() || !newFilterRegex.trim()}
                      className="w-full bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 transition-colors disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Filter
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Console Output */}
          <div ref={consoleRef} className="flex-1 overflow-y-auto p-4 bg-gray-50 font-mono text-sm">
            {consoleEntries.length === 0 ? (
              <p className="text-gray-500 italic">{t('control.consoleReady')}</p>
            ) : (
              <div className="space-y-1">
                {getFilteredConsoleEntries().map(entry => (
                  <div key={entry.id} className="flex gap-2">
                    <span className="text-gray-500 text-xs flex-shrink-0">{formatTimestamp(entry.timestamp)}</span>
                    <span className={getConsoleLineClassName(entry.type)}>{entry.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Console Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <span className="text-green-600 font-mono flex-shrink-0 mt-2 text-base">$</span>
              <input
                ref={inputRef}
                type="text"
                value={commandInput}
                onChange={e => onCommandInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onSendCommand(commandInput);
                  }
                }}
                placeholder={t('control.enterCommand')}
                disabled={!isConnected}
                className="flex-1 border border-gray-300 font-mono outline-none px-3 py-2 rounded text-sm placeholder-gray-400 disabled:opacity-50 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={() => onSendCommand(commandInput)}
                disabled={!isConnected || !commandInput.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm text-sm"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
