/**
 * Page de contrôle d'imprimante 3D (style Pronterface)
 * Interface webapp pleine largeur avec graphiques temps réel
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  Thermometer,
  Move,
  Zap,
  AlertCircle,
  Wifi,
  WifiOff,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Activity,
  Settings,
  X,
  Crosshair,
  BarChart3,
  Fan,
} from 'lucide-react';
import { usePrinter } from '../contexts/PrinterContext';
import { webSerial } from '../services/web-serial.service';
import { apiService } from '../services/api.service';
import { PrinterEvent, ParsedSerialData, ConnectionStatus } from '../types/printer';
import { TemperatureChart } from '../components/Printer/TemperatureChart';
import { TemperatureProfilesModal, TemperatureProfile } from '../components/Printer/TemperatureProfilesModal';
import { ConsoleSidePanel } from '../components/Printer/ConsoleSidePanel';
import { ToolsPanel } from '../components/Printer/ToolsPanel';
import { Layout } from '../components/Layout';
import { useTranslation } from 'react-i18next';

interface ConsoleEntry {
  id: string;
  timestamp: number;
  type: 'command' | 'response' | 'error';
  text: string;
}

interface TemperatureDataPoint {
  timestamp: number;
  hotend?: number;
  targetHotend?: number;
  bed?: number;
  targetBed?: number;
}

interface ConsoleFilter {
  id: string;
  name: string;
  regex: string;
  enabled: boolean;
}

export const PrinterControl: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { printers, sendCommand, reconnectPrinter } = usePrinter();

  const printer = printers.find(p => p.id === id);
  const isConnected = printer?.connectionStatus === ConnectionStatus.CONNECTED;

  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [commandInput, setCommandInput] = useState('');
  const [moveDistance, setMoveDistance] = useState(10);
  const [extrudeAmount, setExtrudeAmount] = useState(10);
  const [feedRate, setFeedRate] = useState(1000);
  const [targetHotend, setTargetHotend] = useState(0);
  const [targetBed, setTargetBed] = useState(0);
  const [autoscroll, setAutoscroll] = useState(true);
  const [temperatureData, setTemperatureData] = useState<TemperatureDataPoint[]>([]);
  const [isConsolePanelOpen, setIsConsolePanelOpen] = useState(false);
  const [consoleFilters, setConsoleFilters] = useState<ConsoleFilter[]>([
    {
      id: '1',
      name: 'Temperature Reports',
      regex: 'T:\\s*\\d+\\.?\\d*\\s*\\/\\s*\\d+\\.?\\d*.*B:\\s*\\d+\\.?\\d*\\s*\\/\\s*\\d+\\.?\\d*',
      enabled: false,
    },
    {
      id: '2',
      name: 'Position Reports',
      regex: 'X:\\s*-?\\d+\\.?\\d*\\s+Y:\\s*-?\\d+\\.?\\d*\\s+Z:\\s*-?\\d+\\.?\\d*',
      enabled: false,
    },
  ]);

  // États pour les paramètres d'extrusion
  const [showExtrusionSettings, setShowExtrusionSettings] = useState(false);
  const [extrusionFeedRate, setExtrusionFeedRate] = useState(300);
  const [minExtrusionTemp, setMinExtrusionTemp] = useState(170);
  const [showTempWarning, setShowTempWarning] = useState(false);
  const [pendingExtrusionAction, setPendingExtrusionAction] = useState<(() => void) | null>(null);

  // États pour les profils de température
  const [temperatureProfiles, setTemperatureProfiles] = useState<TemperatureProfile[]>([]);
  const [showTempProfilesModal, setShowTempProfilesModal] = useState(false);
  const [showHotendDropdown, setShowHotendDropdown] = useState(false);
  const [showBedDropdown, setShowBedDropdown] = useState(false);

  // États pour la zone d'impression
  const [printAreaX, setPrintAreaX] = useState(200);
  const [printAreaY, setPrintAreaY] = useState(200);
  const [printAreaZ, setPrintAreaZ] = useState(200);

  // États pour le modal du graphique
  const [showTempGraphModal, setShowTempGraphModal] = useState(false);

  // États pour les ventilateurs
  const [fanSpeed, setFanSpeed] = useState(100); // En pourcentage (0-100)

  const parametersLoadedRef = useRef(false);
  const hotendDropdownRef = useRef<HTMLDivElement>(null);
  const bedDropdownRef = useRef<HTMLDivElement>(null);
  const hasRequestedM990Ref = useRef(false);

  // Charger les paramètres depuis l'API au montage
  useEffect(() => {
    if (!id) return;

    const loadParameters = async () => {
      try {
        parametersLoadedRef.current = false;
        console.log('[loadParameters] Chargement des paramètres pour l\'imprimante:', id);
        const parameters = await apiService.getPrinterParameters(id, 1);
        console.log('[loadParameters] Paramètres reçus:', parameters);

        // Charger les filtres console
        const consoleFiltersParam = parameters.find(p => p.parameter_key === 'console.filters');
        console.log('[loadParameters] Console filters param:', consoleFiltersParam);
        if (consoleFiltersParam && consoleFiltersParam.value) {
          const filters = Array.isArray(consoleFiltersParam.value)
            ? consoleFiltersParam.value
            : [];
          // Ne charger que si on a des filtres, sinon garder les valeurs par défaut
          if (filters.length > 0) {
            console.log('[loadParameters] Chargement des filtres console:', filters);
            setConsoleFilters(filters as ConsoleFilter[]);
          } else {
            console.log('[loadParameters] Aucun filtre console en BDD, conservation des valeurs par défaut');
          }
        } else {
          console.log('[loadParameters] Paramètre console.filters non trouvé en BDD');
        }

        // Charger le feed rate d'extrusion
        const extrusionFeedRateParam = parameters.find(p => p.parameter_key === 'extrusion.feed_rate');
        if (extrusionFeedRateParam) {
          setExtrusionFeedRate(Number(extrusionFeedRateParam.value));
        }

        // Charger la température minimale d'extrusion
        const minExtrusionTempParam = parameters.find(p => p.parameter_key === 'extrusion.min_temp');
        if (minExtrusionTempParam) {
          setMinExtrusionTemp(Number(minExtrusionTempParam.value));
        }

        // Charger la distance de mouvement
        const moveDistanceParam = parameters.find(p => p.parameter_key === 'movement.distance');
        if (moveDistanceParam) {
          setMoveDistance(Number(moveDistanceParam.value));
        }

        // Charger le feed rate de mouvement
        const feedRateParam = parameters.find(p => p.parameter_key === 'movement.feed_rate');
        if (feedRateParam) {
          setFeedRate(Number(feedRateParam.value));
        }

        // Charger la quantité d'extrusion
        const extrudeAmountParam = parameters.find(p => p.parameter_key === 'extrusion.amount');
        if (extrudeAmountParam) {
          setExtrudeAmount(Number(extrudeAmountParam.value));
        }

        // Charger la température cible du hotend
        const targetHotendParam = parameters.find(p => p.parameter_key === 'temperature.hotend_target');
        if (targetHotendParam) {
          setTargetHotend(Number(targetHotendParam.value));
        }

        // Charger la température cible du bed
        const targetBedParam = parameters.find(p => p.parameter_key === 'temperature.bed_target');
        if (targetBedParam) {
          setTargetBed(Number(targetBedParam.value));
        }

        // Charger les profils de température
        const tempProfilesParam = parameters.find(p => p.parameter_key === 'temperature.profiles');
        console.log('[loadParameters] Temperature profiles param:', tempProfilesParam);

        if (tempProfilesParam) {
          // tempProfilesParam.value contient soit les valeurs personnalisées, soit les valeurs par défaut
          const profiles = Array.isArray(tempProfilesParam.value)
            ? tempProfilesParam.value
            : [];

          console.log('[loadParameters] Chargement des profils de température:', profiles);
          setTemperatureProfiles(profiles as TemperatureProfile[]);
        } else {
          console.log('[loadParameters] Paramètre temperature.profiles non trouvé en BDD');
        }

        // Charger les dimensions de la zone d'impression
        const printAreaXParam = parameters.find(p => p.parameter_key === 'print_area.x');
        if (printAreaXParam) {
          setPrintAreaX(Number(printAreaXParam.value));
        }

        const printAreaYParam = parameters.find(p => p.parameter_key === 'print_area.y');
        if (printAreaYParam) {
          setPrintAreaY(Number(printAreaYParam.value));
        }

        const printAreaZParam = parameters.find(p => p.parameter_key === 'print_area.z');
        if (printAreaZParam) {
          setPrintAreaZ(Number(printAreaZParam.value));
        }

        // Marquer les paramètres comme chargés pour activer la sauvegarde automatique
        console.log('[loadParameters] Paramètres chargés, activation de la sauvegarde automatique');
        parametersLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load printer parameters:', error);
        // Activer la sauvegarde même en cas d'erreur
        parametersLoadedRef.current = true;
      }
    };

    loadParameters();
  }, [id]);

  // Sauvegarder les paramètres quand ils changent (avec debounce)
  useEffect(() => {
    if (!id || !parametersLoadedRef.current) {
      console.log('[useEffect consoleFilters] Saut de sauvegarde:', { id, loaded: parametersLoadedRef.current });
      return;
    }
    console.log('[useEffect consoleFilters] Préparation sauvegarde dans 1s');
    const timeoutId = setTimeout(() => {
      saveParameter('console.filters', consoleFilters);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [consoleFilters, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('extrusion.feed_rate', extrusionFeedRate);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [extrusionFeedRate, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('extrusion.min_temp', minExtrusionTemp);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [minExtrusionTemp, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('movement.distance', moveDistance);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [moveDistance, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('movement.feed_rate', feedRate);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [feedRate, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('extrusion.amount', extrudeAmount);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [extrudeAmount, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('temperature.hotend_target', targetHotend);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [targetHotend, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('temperature.bed_target', targetBed);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [targetBed, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('print_area.x', printAreaX);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [printAreaX, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('print_area.y', printAreaY);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [printAreaY, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('print_area.z', printAreaZ);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [printAreaZ, id]);

  useEffect(() => {
    if (!id || !parametersLoadedRef.current) return;
    const timeoutId = setTimeout(() => {
      saveParameter('temperature.profiles', temperatureProfiles);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [temperatureProfiles, id]);

  // Redirection si l'imprimante n'existe pas ou n'est pas connectée
  useEffect(() => {
    if (!id) {
      navigate('/dashboard');
    }
  }, [id, navigate]);

  // Redirection si déconnecté (après un délai pour laisser le temps à la reconnexion)
  useEffect(() => {
    if (!printer) return;

    if (!isConnected) {
      const timeoutId = setTimeout(() => {
        if (!isConnected) {
          navigate('/dashboard');
        }
      }, 3000); // 3 secondes de délai

      return () => clearTimeout(timeoutId);
    }
  }, [printer, isConnected, navigate]);

  // Envoyer M990 à la première connexion pour récupérer les dimensions de la zone d'impression
  useEffect(() => {
    if (!printer || !isConnected || !id) return;

    // Envoyer M990 seulement si on ne l'a pas encore fait pour cette session
    if (!hasRequestedM990Ref.current) {
      hasRequestedM990Ref.current = true;
      console.log('[M990] Envoi de M990 pour récupérer les dimensions de la zone d\'impression');
      sendCommand(id, 'M990').catch(error => {
        console.error('[M990] Erreur lors de l\'envoi de M990:', error);
      });
    }
  }, [printer, isConnected, id, sendCommand]);

  // Activer le reporting automatique de température et position (Marlin M155 et M154)
  useEffect(() => {
    if (!printer || !isConnected) return;

    // Activer l'auto-report de température toutes les 2 secondes
    sendCommand(printer.id, 'M155 S2').catch(err => {
      console.error('Failed to enable temperature auto-report:', err);
    });

    // Activer l'auto-report de position toutes les 2 secondes
    sendCommand(printer.id, 'M154 S2').catch(err => {
      console.error('Failed to enable position auto-report:', err);
    });

    // Désactiver l'auto-report au démontage
    return () => {
      sendCommand(printer.id, 'M155 S0').catch(err => {
        console.error('Failed to disable temperature auto-report:', err);
      });
      sendCommand(printer.id, 'M154 S0').catch(err => {
        console.error('Failed to disable position auto-report:', err);
      });
    };
  }, [printer?.id, isConnected, sendCommand]);

  // Écouter les événements de l'imprimante et mettre à jour le graphique
  useEffect(() => {
    if (!printer) return;

    const unsubscribe = webSerial.on(PrinterEvent.DATA_RECEIVED, payload => {
      if (payload.printerId === printer.id && payload.data) {
        const data = payload.data as ParsedSerialData;

        // Ajouter à la console
        addConsoleEntry({
          type: data.type === 'error_message' ? 'error' : 'response',
          text: data.raw || JSON.stringify(data.data),
        });

        // Mettre à jour le graphique si c'est une donnée de température
        if (data.type === 'temperature' && data.data) {
          setTemperatureData(prev => {
            const newDataPoint: TemperatureDataPoint = {
              timestamp: Date.now(),
              hotend: data.data.hotend as number | undefined,
              targetHotend: data.data.targetHotend as number | undefined,
              bed: data.data.bed as number | undefined,
              targetBed: data.data.targetBed as number | undefined,
            };

            // Garder max 300 points (10 minutes à 1 point/2sec avec M155 S2)
            const updated = [...prev, newDataPoint];
            return updated.slice(-300);
          });
        }

        // Extraire les dimensions de la zone d'impression depuis M990
        if (data.type === 'hardware_info' && data.data && 'printableArea' in data.data) {
          const printableArea = data.data.printableArea as { x: number; y: number; z: number };
          console.log('[M990] Dimensions de la zone d\'impression reçues:', printableArea);

          if (printableArea.x && printableArea.y && printableArea.z) {
            setPrintAreaX(printableArea.x);
            setPrintAreaY(printableArea.y);
            setPrintAreaZ(printableArea.z);
            console.log('[M990] Dimensions mises à jour:', printableArea);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [printer?.id]);

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hotendDropdownRef.current && !hotendDropdownRef.current.contains(event.target as Node)) {
        setShowHotendDropdown(false);
      }
      if (bedDropdownRef.current && !bedDropdownRef.current.contains(event.target as Node)) {
        setShowBedDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fonction utilitaire pour sauvegarder un paramètre
  const saveParameter = async (parameterKey: string, value: any) => {
    if (!id) {
      console.warn('[saveParameter] No printer ID');
      return;
    }
    try {
      console.log(`[saveParameter] Saving ${parameterKey}:`, value);
      await apiService.setPrinterParameter(id, parameterKey, value, 1);
      console.log(`[saveParameter] Successfully saved ${parameterKey}`);
    } catch (error) {
      console.error(`[saveParameter] Failed to save parameter ${parameterKey}:`, error);
    }
  };

  const addConsoleEntry = (entry: Omit<ConsoleEntry, 'id' | 'timestamp'>) => {
    setConsoleEntries(prev => [
      ...prev,
      {
        ...entry,
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
      },
    ]);
  };

  // Filtrer les entrées de console basées sur les préférences
  const getFilteredConsoleEntries = () => {
    return consoleEntries.filter(entry => {
      // Ne jamais filtrer les commandes et les erreurs
      if (entry.type === 'command' || entry.type === 'error') return true;

      // Appliquer les filtres activés
      for (const filter of consoleFilters) {
        if (filter.enabled) {
          try {
            const regex = new RegExp(filter.regex);
            if (regex.test(entry.text)) {
              return false; // Filtrer cette entrée
            }
          } catch (e) {
            // Regex invalide, ignorer ce filtre
            console.warn(`Invalid regex in filter "${filter.name}":`, filter.regex);
          }
        }
      }

      return true;
    });
  };

  const handleAddFilter = (name: string, regex: string) => {
    if (!name.trim() || !regex.trim()) return;

    const newFilter: ConsoleFilter = {
      id: Date.now().toString(),
      name,
      regex,
      enabled: true,
    };

    const updatedFilters = [...consoleFilters, newFilter];
    setConsoleFilters(updatedFilters);
    // Sauvegarde automatique via useEffect
  };

  const handleToggleFilter = (filterId: string) => {
    const updatedFilters = consoleFilters.map(filter =>
      filter.id === filterId ? { ...filter, enabled: !filter.enabled } : filter
    );
    setConsoleFilters(updatedFilters);
    // Sauvegarde automatique via useEffect
  };

  const handleDeleteFilter = (filterId: string) => {
    const updatedFilters = consoleFilters.filter(filter => filter.id !== filterId);
    setConsoleFilters(updatedFilters);
    // Sauvegarde automatique via useEffect
  };

  const handleSendCommand = async (command: string) => {
    if (!printer || !isConnected || !command.trim()) return;

    addConsoleEntry({ type: 'command', text: `> ${command}` });

    try {
      await sendCommand(printer.id, command);
      setCommandInput('');
    } catch (error) {
      addConsoleEntry({
        type: 'error',
        text: `Error: ${error instanceof Error ? error.message : 'Failed to send command'}`,
      });
    }
  };

  const handleMove = (axis: 'X' | 'Y' | 'Z', direction: 1 | -1) => {
    if (!isConnected) return;
    const distance = moveDistance * direction;
    const command = `G91\nG1 ${axis}${distance} F${feedRate}\nG90`;
    handleSendCommand(command);
  };

  const handleHome = (axis?: 'X' | 'Y' | 'Z' | 'ALL') => {
    if (!isConnected) return;

    // Si un axe spécifique est demandé, faire un home de cet axe
    if (axis && axis !== 'ALL') {
      const command = `G28 ${axis}`;
      handleSendCommand(command);
    } else if (axis === 'ALL') {
      // Home All : G28 sans paramètre
      handleSendCommand('G28');
    } else {
      // Bouton central sans paramètre : centrer la tête sur X/2 et Y/2
      const centerX = printAreaX / 2;
      const centerY = printAreaY / 2;
      const command = `G90\nG1 X${centerX} Y${centerY} F${feedRate}`;
      handleSendCommand(command);
    }
  };

  const handleExtrude = (retract = false) => {
    if (!isConnected) return;

    const currentTemp = printer?.state.temperature?.hotend || 0;

    // Vérifier la température minimale
    if (currentTemp < minExtrusionTemp) {
      // Stocker l'action en attente et afficher l'avertissement
      setPendingExtrusionAction(() => () => {
        const amount = retract ? -extrudeAmount : extrudeAmount;
        const command = `G91\nG1 E${amount} F${extrusionFeedRate}\nG90`;
        handleSendCommand(command);
      });
      setShowTempWarning(true);
      return;
    }

    // Température OK, exécuter directement
    const amount = retract ? -extrudeAmount : extrudeAmount;
    const command = `G91\nG1 E${amount} F${extrusionFeedRate}\nG90`;
    handleSendCommand(command);
  };

  const handleConfirmExtrusion = () => {
    if (pendingExtrusionAction) {
      pendingExtrusionAction();
      setPendingExtrusionAction(null);
    }
    setShowTempWarning(false);
  };

  const handleCancelExtrusion = () => {
    setPendingExtrusionAction(null);
    setShowTempWarning(false);
  };

  const handleSetTemperature = (type: 'hotend' | 'bed') => {
    if (!isConnected) return;
    const temp = type === 'hotend' ? targetHotend : targetBed;
    const command = type === 'hotend' ? `M104 S${temp}` : `M140 S${temp}`;
    handleSendCommand(command);
  };

  const handleSaveTemperatureProfiles = async (profiles: TemperatureProfile[]) => {
    setTemperatureProfiles(profiles);
    await saveParameter('temperature.profiles', profiles);
  };

  const handleSetFanSpeed = (speed: number) => {
    if (!isConnected) return;
    // Convertir le pourcentage (0-100) en valeur PWM (0-255)
    const pwmValue = Math.round((speed / 100) * 255);
    // Si la vitesse est 0, utiliser M107 pour éteindre, sinon M106
    if (speed === 0) {
      handleSendCommand('M107');
    } else {
      handleSendCommand(`M106 S${pwmValue}`);
    }
  };

  const handleDisableSteppers = () => {
    if (!isConnected) return;
    handleSendCommand('M84');
  };

  const handleEmergencyStop = () => {
    if (!isConnected) return;
    handleSendCommand('M112');
  };

  const clearConsole = () => {
    setConsoleEntries([]);
  };

  if (!printer) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="font-semibold text-red-900 text-lg">{t('control.printerNotFound')}</h3>
            </div>
            <p className="text-red-700 mb-4">{t('control.printerNotFoundDescription')}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('control.backToDashboard')}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth enableNavbarAutoHide>
      <div className="w-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-1.5 text-gray-600 hover:text-primary-600 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">{t('control.backToDashboard')}</span>
              </button>
              <div className="h-5 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-primary-600" />
                    <h1 className="text-base font-bold text-gray-900">{printer.name}</h1>
                    {isConnected ? (
                      <div className="flex items-center gap-1 bg-green-50 border border-green-300 px-2 py-0.5 rounded">
                        <Wifi className="w-3 h-3 text-green-600" />
                        <span className="text-xs font-semibold text-green-700">
                          {t('control.connected')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 bg-red-50 border border-red-300 px-2 py-0.5 rounded">
                        <WifiOff className="w-3 h-3 text-red-600" />
                        <span className="text-xs font-semibold text-red-700">
                          {t('control.disconnected')}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {printer.firmware.name} {printer.firmware.version}
                    {printer.state.position && (
                      <span className="font-mono ml-2">
                        X:{printer.state.position.x?.toFixed(2) ?? '--'} Y:{printer.state.position.y?.toFixed(2) ?? '--'} Z:{printer.state.position.z?.toFixed(2) ?? '--'} E:{printer.state.position.e?.toFixed(2) ?? '--'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <button
                    onClick={handleDisableSteppers}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-2 rounded transition-colors text-xs font-medium"
                  >
                    {t('control.disableSteppers')}
                  </button>
                  <button
                    onClick={handleEmergencyStop}
                    className="bg-red-600 hover:bg-red-700 text-white px-2 py-2 rounded transition-colors font-bold text-xs"
                  >
                    {t('control.emergencyStop')}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => reconnectPrinter(printer.id)}
                  className="bg-primary-600 text-white px-3 py-1 rounded hover:bg-primary-700 transition-colors text-xs font-medium shadow-sm"
                >
                  {t('control.reconnect')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_4fr] gap-3 p-3 bg-gray-50 min-h-[calc(100vh-12rem)]">
          {/* Left Column - Controls */}
          <div className="space-y-3">
            {/* Temperature Control */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-orange-600" />
                  <h2 className="text-sm font-bold text-gray-900">{t('control.temperature')}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowTempGraphModal(true)}
                    className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-gray-100 rounded"
                    title="Voir le graphique de température"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowTempProfilesModal(true)}
                    className="text-gray-600 hover:text-gray-900 transition-colors p-1 hover:bg-gray-100 rounded"
                    title={t('temperatureProfiles.manage', 'Gérer les profils')}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Hotend */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-orange-800 text-xs">{t('control.hotend')}</span>
                    <span className="text-sm font-bold text-orange-600">
                      {printer.state.temperature?.hotend?.toFixed(1) ?? '--'}°
                      {printer.state.temperature?.targetHotend !== undefined &&
                        printer.state.temperature.targetHotend > 0 && (
                          <span className="text-xs text-gray-500">
                            /{printer.state.temperature.targetHotend.toFixed(0)}°
                          </span>
                        )}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div ref={hotendDropdownRef} className="relative flex-1">
                      <div className="relative">
                        <input
                          type="number"
                          value={targetHotend}
                          onChange={e => setTargetHotend(Number(e.target.value))}
                          onClick={() => setShowHotendDropdown(!showHotendDropdown)}
                          className="w-full px-2 py-1 pr-7 text-xs border border-orange-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="°C"
                          disabled={!isConnected}
                        />
                        <button
                          onClick={() => setShowHotendDropdown(!showHotendDropdown)}
                          disabled={!isConnected}
                          className="absolute right-0 top-0 bottom-0 px-2 text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      {showHotendDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-orange-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {temperatureProfiles
                            .filter(p => p.type === 'hotend')
                            .map(profile => (
                              <button
                                key={profile.id}
                                onClick={() => {
                                  setTargetHotend(profile.value);
                                  setShowHotendDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-orange-50 flex items-center justify-between transition-colors"
                              >
                                <span className="font-medium text-gray-700">{profile.name}</span>
                                <span className="text-orange-600 font-semibold">{profile.value}°C</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex">
                      <button
                        onClick={() => handleSetTemperature('hotend')}
                        disabled={!isConnected}
                        className="bg-orange-600 text-white px-2 py-1 text-xs rounded-l hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => {
                          setTargetHotend(0);
                          handleSendCommand('M104 S0');
                        }}
                        disabled={!isConnected}
                        className="bg-gray-600 text-white px-2 py-1 text-xs rounded-r hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium border-l border-gray-700"
                      >
                        Off
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bed */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-blue-800 text-xs">{t('control.bed')}</span>
                    <span className="text-sm font-bold text-blue-600">
                      {printer.state.temperature?.bed?.toFixed(1) ?? '--'}°
                      {printer.state.temperature?.targetBed !== undefined &&
                        printer.state.temperature.targetBed > 0 && (
                          <span className="text-xs text-gray-500">
                            /{printer.state.temperature.targetBed.toFixed(0)}°
                          </span>
                        )}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <div ref={bedDropdownRef} className="relative flex-1">
                      <div className="relative">
                        <input
                          type="number"
                          value={targetBed}
                          onChange={e => setTargetBed(Number(e.target.value))}
                          onClick={() => setShowBedDropdown(!showBedDropdown)}
                          className="w-full px-2 py-1 pr-7 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="°C"
                          disabled={!isConnected}
                        />
                        <button
                          onClick={() => setShowBedDropdown(!showBedDropdown)}
                          disabled={!isConnected}
                          className="absolute right-0 top-0 bottom-0 px-2 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                      {showBedDropdown && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-blue-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {temperatureProfiles
                            .filter(p => p.type === 'bed')
                            .map(profile => (
                              <button
                                key={profile.id}
                                onClick={() => {
                                  setTargetBed(profile.value);
                                  setShowBedDropdown(false);
                                }}
                                className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center justify-between transition-colors"
                              >
                                <span className="font-medium text-gray-700">{profile.name}</span>
                                <span className="text-blue-600 font-semibold">{profile.value}°C</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                    <div className="flex">
                      <button
                        onClick={() => handleSetTemperature('bed')}
                        disabled={!isConnected}
                        className="bg-blue-600 text-white px-2 py-1 text-xs rounded-l hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Set
                      </button>
                      <button
                        onClick={() => {
                          setTargetBed(0);
                          handleSendCommand('M140 S0');
                        }}
                        disabled={!isConnected}
                        className="bg-gray-600 text-white px-2 py-1 text-xs rounded-r hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium border-l border-gray-700"
                      >
                        Off
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fan Control */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Fan className="w-4 h-4 text-cyan-600" />
                <h2 className="text-sm font-bold text-gray-900">{t('control.fans', 'Ventilateurs')}</h2>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-700">
                    {t('control.fanSpeed', 'Vitesse')} (%)
                  </label>
                  <input
                    type="number"
                    value={fanSpeed}
                    onChange={e => {
                      const newSpeed = Math.min(100, Math.max(0, Number(e.target.value)));
                      setFanSpeed(newSpeed);
                    }}
                    onBlur={() => handleSetFanSpeed(fanSpeed)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleSetFanSpeed(fanSpeed);
                      }
                    }}
                    min="0"
                    max="100"
                    disabled={!isConnected}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
                <input
                  type="range"
                  value={fanSpeed}
                  onChange={e => setFanSpeed(Number(e.target.value))}
                  onMouseUp={() => handleSetFanSpeed(fanSpeed)}
                  onTouchEnd={() => handleSetFanSpeed(fanSpeed)}
                  min="0"
                  max="100"
                  step="1"
                  disabled={!isConnected}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: `linear-gradient(to right, #0891b2 0%, #0891b2 ${fanSpeed}%, #e5e7eb ${fanSpeed}%, #e5e7eb 100%)`
                  }}
                />
              </div>
            </div>

            {/* Movement Control */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Move className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-gray-900">{t('control.movement')}</h2>
              </div>

              {/* Matrice de contrôle unifiée 3x5 */}
              <div className="grid grid-cols-3 gap-1 mb-3">
                {/* Ligne 1: Home X | Y+ | Z+ */}
                <button
                  onClick={() => handleHome('X')}
                  disabled={!isConnected}
                  className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-sm text-xs font-medium"
                  title="Home X"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="ml-1">X</span>
                </button>
                <button
                  onClick={() => handleMove('Y', 1)}
                  disabled={!isConnected}
                  className="bg-green-500 hover:bg-green-600 text-white p-2.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                  title="Y+"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleMove('Z', 1)}
                  disabled={!isConnected}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-sm text-xs font-medium"
                  title="Z+"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span className="ml-0.5">Z</span>
                </button>

                {/* Ligne 2: X- | Centre | X+ */}
                <button
                  onClick={() => handleMove('X', -1)}
                  disabled={!isConnected}
                  className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                  title="X-"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleHome()}
                  disabled={!isConnected}
                  className="bg-gray-600 hover:bg-gray-700 text-white p-2.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                  title="Centrage tête"
                >
                  <Crosshair className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleMove('X', 1)}
                  disabled={!isConnected}
                  className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                  title="X+"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Ligne 3: Home Y | Y- | Z- */}
                <button
                  onClick={() => handleHome('Y')}
                  disabled={!isConnected}
                  className="bg-green-500 hover:bg-green-600 text-white p-2.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-sm text-xs font-medium"
                  title="Home Y"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="ml-1">Y</span>
                </button>
                <button
                  onClick={() => handleMove('Y', -1)}
                  disabled={!isConnected}
                  className="bg-green-500 hover:bg-green-600 text-white p-2.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
                  title="Y-"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleMove('Z', -1)}
                  disabled={!isConnected}
                  className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-sm text-xs font-medium"
                  title="Z-"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span className="ml-0.5">Z</span>
                </button>
              </div>

              {/* Ligne 4: Home Z (large) */}
              <button
                onClick={() => handleHome('Z')}
                disabled={!isConnected}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm text-xs font-medium mb-1"
                title="Home Z"
              >
                <Home className="w-4 h-4" />
                <span>HOME Z</span>
              </button>

              {/* Ligne 5: Home All (large) */}
              <button
                onClick={() => handleHome('ALL')}
                disabled={!isConnected}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm text-xs font-medium mb-3"
                title="Home All"
              >
                <Home className="w-4 h-4" />
                <span>HOME ALL</span>
              </button>

              {/* Affichage position avec couleurs */}
              {printer.state.position && (
                <div className="text-xs font-mono text-center bg-gray-50 rounded p-2 border border-gray-200">
                  <span className="text-red-600 font-semibold">X: {printer.state.position.x?.toFixed(2) ?? '--'}</span>
                  {' | '}
                  <span className="text-green-600 font-semibold">Y: {printer.state.position.y?.toFixed(2) ?? '--'}</span>
                  {' | '}
                  <span className="text-blue-600 font-semibold">Z: {printer.state.position.z?.toFixed(2) ?? '--'}</span>
                </div>
              )}

              {/* Distance & Feed Rate */}
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('control.distance')} (mm)
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[0.1, 1, 10, 100].map(dist => (
                      <button
                        key={dist}
                        onClick={() => setMoveDistance(dist)}
                        className={`px-2 py-1 rounded transition-colors text-xs font-medium shadow-sm ${
                          moveDistance === dist
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('control.feedRate')} (mm/min)
                  </label>
                  <input
                    type="number"
                    value={feedRate}
                    onChange={e => setFeedRate(Number(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Extrusion Control */}
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-600" />
                  <h2 className="text-sm font-bold text-gray-900">{t('control.extrusion')}</h2>
                </div>
                <button
                  onClick={() => setShowExtrusionSettings(true)}
                  className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900 transition-colors"
                  title="Extrusion Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {t('control.amount')} (mm)
                  </label>
                  <input
                    type="number"
                    value={extrudeAmount}
                    onChange={e => setExtrudeAmount(Number(e.target.value))}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleExtrude(false)}
                    disabled={!isConnected}
                    className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium shadow-sm text-xs"
                  >
                    {t('control.extrude')}
                  </button>
                  <button
                    onClick={() => handleExtrude(true)}
                    disabled={!isConnected}
                    className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium shadow-sm text-xs"
                  >
                    {t('control.retract')}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tools */}
          <div className="flex flex-col h-full">
            <ToolsPanel
              printerId={id}
              isConnected={isConnected}
              onSendCommand={handleSendCommand}
              onAddConsoleEntry={addConsoleEntry}
            />
          </div>
        </div>

        {/* Console Side Panel */}
        <ConsoleSidePanel
          isOpen={isConsolePanelOpen}
          onToggle={() => setIsConsolePanelOpen(!isConsolePanelOpen)}
          consoleEntries={consoleEntries}
          commandInput={commandInput}
          onCommandInputChange={setCommandInput}
          onSendCommand={handleSendCommand}
          onClearConsole={clearConsole}
          isConnected={isConnected}
          autoscroll={autoscroll}
          onAutoscrollChange={setAutoscroll}
          consoleFilters={consoleFilters}
          onToggleFilter={handleToggleFilter}
          onDeleteFilter={handleDeleteFilter}
          onAddFilter={handleAddFilter}
          getFilteredConsoleEntries={getFilteredConsoleEntries}
        />

        {/* Modal Paramètres Extrusion */}
        {showExtrusionSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowExtrusionSettings(false)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="font-bold text-base">Extrusion Settings</h3>
                <button
                  onClick={() => setShowExtrusionSettings(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feed Rate (mm/min)
                  </label>
                  <input
                    type="number"
                    value={extrusionFeedRate}
                    onChange={e => setExtrusionFeedRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="1"
                    max="3000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Vitesse d'extrusion/rétraction</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Hotend Temperature (°C)
                  </label>
                  <input
                    type="number"
                    value={minExtrusionTemp}
                    onChange={e => setMinExtrusionTemp(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    min="0"
                    max="300"
                  />
                  <p className="text-xs text-gray-500 mt-1">Température minimale pour autoriser l'extrusion</p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowExtrusionSettings(false)}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Avertissement Température */}
        {showTempWarning && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center gap-3 p-4 border-b border-gray-200 bg-yellow-50">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <h3 className="font-bold text-base text-yellow-900">Temperature Warning</h3>
              </div>

              <div className="p-4">
                <p className="text-gray-700 mb-4">
                  La température actuelle du hotend ({printer?.state.temperature?.hotend?.toFixed(1) || 0}°C)
                  est inférieure à la température minimale configurée ({minExtrusionTemp}°C).
                </p>
                <p className="text-gray-700 font-medium mb-4">
                  Voulez-vous continuer l'extrusion malgré tout ?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelExtrusion}
                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmExtrusion}
                    className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors font-medium"
                  >
                    Continuer quand même
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Temperature Profiles Modal */}
        <TemperatureProfilesModal
          isOpen={showTempProfilesModal}
          onClose={() => setShowTempProfilesModal(false)}
          profiles={temperatureProfiles}
          onSaveProfiles={handleSaveTemperatureProfiles}
        />

        {/* Temperature Graph Modal */}
        {showTempGraphModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTempGraphModal(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-600" />
                  <h3 className="font-bold text-lg">{t('control.temperatureGraph')}</h3>
                </div>
                <button
                  onClick={() => setShowTempGraphModal(false)}
                  className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="bg-gray-100 rounded p-4 border border-gray-200">
                  <TemperatureChart
                    data={temperatureData}
                    maxDataPoints={300}
                    width={800}
                    height={400}
                  />
                </div>
                <div className="mt-3 text-xs text-gray-500 text-center">
                  {temperatureData.length} points de données
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
