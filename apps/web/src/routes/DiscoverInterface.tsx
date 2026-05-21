import { useEffect, useMemo, useState } from 'react';
import { Activity, Wifi } from 'lucide-react';
import { Layout } from '../components/Layout';
import { TemperatureChart } from '../components/Printer/TemperatureChart';
import { ConsoleSidePanel } from '../components/Printer/ConsoleSidePanel';
import { MeshViewerPanel } from '../components/Printer/MeshViewerPanel';
import type { BedMeshData } from '../types/printer';

interface TempPoint {
  timestamp: number;
  hotend: number;
  targetHotend: number;
  bed: number;
  targetBed: number;
}

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

function createInitialTemperatureSeries(): TempPoint[] {
  const now = Date.now();
  return Array.from({ length: 90 }, (_, index) => {
    const t = index / 12;
    return {
      timestamp: now - (90 - index) * 1000,
      hotend: 208 + Math.sin(t) * 2.4,
      targetHotend: 210,
      bed: 60 + Math.cos(t * 0.8) * 1.3,
      targetBed: 60,
    };
  });
}

function createDemoMesh(): BedMeshData {
  const mesh = Array.from({ length: 7 }, (_, y) => (
    Array.from({ length: 7 }, (_, x) => {
      const centerX = 3;
      const centerY = 3;
      const radial = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const base = (radial - 2.6) * 0.035;
      const wave = Math.sin((x + y) * 0.9) * 0.01;
      return Number((base + wave).toFixed(3));
    })
  ));

  const flat = mesh.flat().filter((value): value is number => value !== null);
  return {
    size: 7,
    probingMode: 'AUTO_BILINEAR',
    mesh,
    min: Math.min(...flat),
    max: Math.max(...flat),
    meshPoints: { x: 7, y: 7 },
  };
}

export function DiscoverInterface() {
  const [temperatureSeries, setTemperatureSeries] = useState<TempPoint[]>(() => createInitialTemperatureSeries());
  const [progress, setProgress] = useState(41);
  const [elapsedMinutes, setElapsedMinutes] = useState(38);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  const [commandInput, setCommandInput] = useState('');
  const [autoscroll, setAutoscroll] = useState(true);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([
    { id: '1', timestamp: Date.now() - 9000, type: 'response', text: '[EMU] Firmware Marlin 2.1.3 ready' },
    { id: '2', timestamp: Date.now() - 7000, type: 'response', text: 'ok T:209.2 /210.0 B:59.7 /60.0 @:118 B@:32' },
    { id: '3', timestamp: Date.now() - 5000, type: 'command', text: '> G29 T' },
    { id: '4', timestamp: Date.now() - 3500, type: 'response', text: 'Bed mesh loaded: 7x7 points' },
  ]);
  const [consoleFilters, setConsoleFilters] = useState<ConsoleFilter[]>([
    {
      id: 'temp',
      name: 'Temperature Reports',
      regex: 'T:\\s*\\d+\\.?\\d*\\s*\\/\\s*\\d+\\.?\\d*',
      enabled: false,
    },
  ]);

  const demoMesh = useMemo(() => createDemoMesh(), []);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setTemperatureSeries((prev) => {
        const seconds = Date.now() / 1000;
        const next: TempPoint = {
          timestamp: Date.now(),
          hotend: 209 + Math.sin(seconds / 3) * 1.8,
          targetHotend: 210,
          bed: 60 + Math.cos(seconds / 4) * 0.9,
          targetBed: 60,
        };
        return [...prev.slice(-149), next];
      });

      setProgress((prev) => Math.min(100, prev + 0.2));
      setElapsedMinutes((prev) => prev + 1 / 60);
    }, 1000);

    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const scriptedResponses = [
      'ok X:138.72 Y:96.50 Z:0.28 E:241.31',
      'Recv: M105',
      'ok T:209.8 /210.0 B:60.1 /60.0 @:121 B@:30',
      'Recv: M114',
      'echo:busy: processing',
      'ok Mesh validated: variance=0.036',
    ];

    let index = 0;
    const tick = window.setInterval(() => {
      const line = scriptedResponses[index % scriptedResponses.length];
      setConsoleEntries((prev) => [
        ...prev.slice(-120),
        {
          id: `${Date.now()}-${index}`,
          timestamp: Date.now(),
          type: line.startsWith('Recv:') ? 'command' : 'response',
          text: line.startsWith('Recv:') ? `> ${line.replace('Recv: ', '')}` : line,
        },
      ]);
      index += 1;
    }, 2400);

    return () => window.clearInterval(tick);
  }, []);

  const handleSendCommand = (command: string) => {
    if (!command.trim()) return;

    setConsoleEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}-cmd`,
        timestamp: Date.now(),
        type: 'command',
        text: `> ${command.trim()}`,
      },
      {
        id: `${Date.now()}-rsp`,
        timestamp: Date.now() + 30,
        type: 'response',
        text: `ok (emu) executed: ${command.trim()}`,
      },
    ]);
    setCommandInput('');
  };

  const getFilteredConsoleEntries = () => {
    return consoleEntries.filter((entry) => {
      if (entry.type !== 'response') return true;

      for (const filter of consoleFilters) {
        if (!filter.enabled) continue;
        try {
          if (new RegExp(filter.regex).test(entry.text)) return false;
        } catch {
          return true;
        }
      }
      return true;
    });
  };

  const latest = temperatureSeries[temperatureSeries.length - 1];

  return (
    <Layout fullWidth enableNavbarAutoHide>
      <div className="w-full">
        <div className="bg-white border-b border-gray-200 px-4 py-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-5 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-primary-600" />
                    <h1 className="text-base font-bold text-gray-900">Decouvrir l'interface (mode emulation)</h1>
                    <div className="flex items-center gap-1 bg-green-50 border border-green-300 px-2 py-0.5 rounded">
                      <Wifi className="w-3 h-3 text-green-600" />
                      <span className="text-xs font-semibold text-green-700">Connecte (factice)</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Marlin 2.1.3 - X:{138.72} Y:{96.5} Z:{0.28} E:{241.31}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-600 font-medium">
              Progression: {progress.toFixed(1)}% - {Math.floor(elapsedMinutes)} min
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-3 p-3 bg-gray-50 min-h-[calc(100vh-12rem)]">
          <div className="space-y-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900 mb-3">Temperature (composant natif)</h2>
              <TemperatureChart data={temperatureSeries} width={680} height={260} maxDataPoints={150} />
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 border border-gray-200 rounded p-2">
                  Hotend: <span className="font-semibold text-red-600">{latest.hotend.toFixed(1)} / {latest.targetHotend.toFixed(0)} C</span>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded p-2">
                  Bed: <span className="font-semibold text-blue-600">{latest.bed.toFixed(1)} / {latest.targetBed.toFixed(0)} C</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm min-h-[650px]">
            <MeshViewerPanel initialMeshData={demoMesh} />
          </div>
        </div>

        <ConsoleSidePanel
          isOpen={isConsoleOpen}
          onToggle={() => setIsConsoleOpen((prev) => !prev)}
          consoleEntries={consoleEntries}
          commandInput={commandInput}
          onCommandInputChange={setCommandInput}
          onSendCommand={handleSendCommand}
          onClearConsole={() => setConsoleEntries([])}
          isConnected
          autoscroll={autoscroll}
          onAutoscrollChange={setAutoscroll}
          consoleFilters={consoleFilters}
          onToggleFilter={(filterId) =>
            setConsoleFilters((prev) => prev.map((f) => (f.id === filterId ? { ...f, enabled: !f.enabled } : f)))
          }
          onDeleteFilter={(filterId) => setConsoleFilters((prev) => prev.filter((f) => f.id !== filterId))}
          onAddFilter={(name, regex) =>
            setConsoleFilters((prev) => [
              ...prev,
              { id: `${Date.now()}`, name, regex, enabled: true },
            ])
          }
          getFilteredConsoleEntries={getFilteredConsoleEntries}
        />
      </div>
    </Layout>
  );
}
