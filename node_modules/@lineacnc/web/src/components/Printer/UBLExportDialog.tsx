/**
 * Dialog pour l'export UBL vers l'imprimante
 * Affiche la progression de l'envoi cellule par cellule
 */

import { useState, useCallback } from 'react';
import { Upload, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import type { MeshData } from '../../types/mesh';
import { exportMeshToUBL, type UBLExportProgress, type UBLExportResult } from '../../utils/mesh-ubl-export.utils';
import { Button } from '../UI/Button';

interface UBLExportDialogProps {
  mesh: MeshData;
  sendCommand: (cmd: string) => Promise<void>;
  onClose: () => void;
}

export const UBLExportDialog: React.FC<UBLExportDialogProps> = ({
  mesh,
  sendCommand,
  onClose,
}) => {
  const [progress, setProgress] = useState<UBLExportProgress | null>(null);
  const [result, setResult] = useState<UBLExportResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setResult(null);

    const exportResult = await exportMeshToUBL(mesh, sendCommand, setProgress);

    setResult(exportResult);
    setIsExporting(false);
  }, [mesh, sendCommand]);

  const getProgressPercentage = (): number => {
    if (!progress || progress.total === 0) return 0;
    return (progress.current / progress.total) * 100;
  };

  const getStatusIcon = () => {
    if (!progress) return null;

    switch (progress.status) {
      case 'initializing':
      case 'sending':
      case 'saving':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    if (!progress) return 'bg-blue-600';

    switch (progress.status) {
      case 'complete':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6 text-primary-600" />
            Export to Printer (UBL)
          </h2>

          {!isExporting && !result ? (
            <>
              <div className="space-y-3 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-900 font-semibold mb-2">Mesh Information:</p>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>
                      • Grid Size: {mesh.width} × {mesh.height} = {mesh.width * mesh.height} points
                    </li>
                    <li>• Estimated Export Time: ~{Math.ceil((mesh.width * mesh.height * 100) / 1000)}s</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-900 font-semibold mb-2">⚠️ Warning:</p>
                  <ul className="text-xs text-yellow-800 space-y-1">
                    <li>• This will overwrite your printer's current mesh data</li>
                    <li>• Ensure the printer is homed and ready</li>
                    <li>• Do not interrupt the process once started</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleExport} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Upload className="w-4 h-4 mr-2" />
                  Start Export
                </Button>
                <Button onClick={onClose} variant="secondary" className="flex-1">
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Progress Display */}
              {progress && (
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">Progress</span>
                      <span className="text-gray-600">
                        {progress.current} / {progress.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 ${getStatusColor()} transition-all duration-300 ease-out`}
                        style={{ width: `${getProgressPercentage()}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{getProgressPercentage().toFixed(1)}%</p>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    {getStatusIcon()}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{progress.message}</p>
                      {progress.status === 'sending' && (
                        <p className="text-xs text-gray-600 mt-1">
                          Current: ({progress.currentPoint.x}, {progress.currentPoint.y})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Result Display */}
              {result && (
                <div className="mb-6">
                  {result.success ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <p className="font-semibold text-green-900">Export Successful!</p>
                      </div>
                      <p className="text-sm text-green-800">
                        {result.exported} points exported to printer
                        {result.skipped && result.skipped > 0 && `, ${result.skipped} skipped`}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="font-semibold text-red-900">Export Failed</p>
                      </div>
                      {result.errors && (
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          <p className="text-xs text-red-800 font-semibold mb-1">Errors:</p>
                          <ul className="text-xs text-red-700 space-y-1">
                            {result.errors.map((error, i) => (
                              <li key={i}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Close Button (only shown when complete or error) */}
              {result && (
                <Button onClick={onClose} className="w-full">
                  Close
                </Button>
              )}

              {/* Cancel button during export */}
              {isExporting && !result && (
                <Button onClick={onClose} variant="secondary" className="w-full" disabled>
                  Exporting... Please wait
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
