/**
 * Graphique de température en temps réel avec Canvas
 */

import React, { useEffect, useRef } from 'react';

interface TemperatureDataPoint {
  timestamp: number;
  hotend?: number;
  targetHotend?: number;
  bed?: number;
  targetBed?: number;
}

interface TemperatureChartProps {
  data: TemperatureDataPoint[];
  maxDataPoints?: number;
  width?: number;
  height?: number;
}

export const TemperatureChart: React.FC<TemperatureChartProps> = ({
  data,
  maxDataPoints = 300,
  width = 800,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configuration
    const padding = { top: 20, right: 40, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Limiter les données
    const limitedData = data.slice(-maxDataPoints);

    // Trouver min/max pour l'échelle Y
    const allTemps = limitedData.flatMap(d => [
      d.hotend || 0,
      d.targetHotend || 0,
      d.bed || 0,
      d.targetBed || 0,
    ]);
    const maxTemp = Math.max(...allTemps, 250);
    const minTemp = 0;

    // Effacer le canvas
    ctx.clearRect(0, 0, width, height);

    // Fond
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Zone de graphique
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);

    // Grille horizontale
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartHeight / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();

      // Labels Y
      const temp = maxTemp - ((maxTemp - minTemp) / gridLines) * i;
      ctx.fillStyle = '#888';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${temp.toFixed(0)}°C`, padding.left - 10, y + 4);
    }

    // Grille verticale (temps)
    const timeGridLines = 6;
    for (let i = 0; i <= timeGridLines; i++) {
      const x = padding.left + (chartWidth / timeGridLines) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    if (limitedData.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Aucune donnée de température', width / 2, height / 2);
      return;
    }

    // Fonction pour convertir température en Y
    const tempToY = (temp: number) => {
      const ratio = (temp - minTemp) / (maxTemp - minTemp);
      return padding.top + chartHeight - ratio * chartHeight;
    };

    // Fonction pour convertir index en X
    const indexToX = (index: number) => {
      const ratio = limitedData.length > 1 ? index / (limitedData.length - 1) : 0.5;
      return padding.left + ratio * chartWidth;
    };

    // Dessiner les courbes
    const drawLine = (
      getValue: (d: TemperatureDataPoint) => number | undefined,
      color: string,
      lineWidth = 2,
      dashed = false
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (dashed) {
        ctx.setLineDash([5, 5]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      let started = false;

      limitedData.forEach((d, i) => {
        const value = getValue(d);
        if (value !== undefined && value > 0) {
          const x = indexToX(i);
          const y = tempToY(value);

          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      });

      ctx.stroke();
    };

    // Hotend actuel (rouge)
    drawLine(d => d.hotend, '#ef4444', 2.5);

    // Hotend cible (rouge pointillé)
    drawLine(d => d.targetHotend, '#f87171', 1.5, true);

    // Bed actuel (bleu)
    drawLine(d => d.bed, '#3b82f6', 2.5);

    // Bed cible (bleu pointillé)
    drawLine(d => d.targetBed, '#60a5fa', 1.5, true);

    // Légende
    const legendY = height - 10;
    const legendItems = [
      { label: 'Hotend', color: '#ef4444' },
      { label: 'Hotend Target', color: '#f87171', dashed: true },
      { label: 'Bed', color: '#3b82f6' },
      { label: 'Bed Target', color: '#60a5fa', dashed: true },
    ];

    let legendX = padding.left;
    legendItems.forEach(item => {
      // Ligne
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 2;
      if (item.dashed) {
        ctx.setLineDash([4, 4]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.beginPath();
      ctx.moveTo(legendX, legendY);
      ctx.lineTo(legendX + 20, legendY);
      ctx.stroke();

      // Texte
      ctx.fillStyle = '#ccc';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 25, legendY + 4);

      legendX += ctx.measureText(item.label).width + 50;
    });

    // Afficher les valeurs actuelles
    if (limitedData.length > 0) {
      const latest = limitedData[limitedData.length - 1];
      const infoY = 15;
      let infoX = padding.left + chartWidth - 200;

      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'right';

      if (latest.hotend !== undefined) {
        ctx.fillStyle = '#ef4444';
        ctx.fillText(
          `Hotend: ${latest.hotend.toFixed(1)}°C`,
          infoX,
          infoY
        );
        if (latest.targetHotend && latest.targetHotend > 0) {
          ctx.fillStyle = '#f87171';
          ctx.fillText(
            `/ ${latest.targetHotend.toFixed(1)}°C`,
            infoX + 70,
            infoY
          );
        }
      }

      if (latest.bed !== undefined) {
        ctx.fillStyle = '#3b82f6';
        ctx.fillText(
          `Bed: ${latest.bed.toFixed(1)}°C`,
          infoX,
          infoY + 18
        );
        if (latest.targetBed && latest.targetBed > 0) {
          ctx.fillStyle = '#60a5fa';
          ctx.fillText(
            `/ ${latest.targetBed.toFixed(1)}°C`,
            infoX + 70,
            infoY + 18
          );
        }
      }
    }
  }, [data, maxDataPoints, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg"
      style={{ width: '100%', height: 'auto' }}
    />
  );
};
