/**
 * Utilitaires pour la gestion des palettes de couleurs et du mapping des valeurs
 */

import type { ColorPalette, ColorScaleConfig } from '../types/mesh';

/**
 * Palettes prédéfinies pour la visualisation scientifique
 */
export const PREDEFINED_PALETTES: Record<string, ColorPalette> = {
  viridis: {
    name: 'Viridis',
    colors: [
      '#440154',
      '#482878',
      '#3e4989',
      '#31688e',
      '#26828e',
      '#1f9e89',
      '#35b779',
      '#6dcd59',
      '#b4de2c',
      '#fde725',
    ],
  },
  magma: {
    name: 'Magma',
    colors: [
      '#000004',
      '#1c1044',
      '#4f127b',
      '#812581',
      '#b5367a',
      '#e55064',
      '#fb8761',
      '#fec287',
      '#fcfdbf',
    ],
  },
  iceFire: {
    name: 'Ice-Fire',
    colors: [
      '#0000ff',
      '#4080ff',
      '#80c0ff',
      '#c0e0ff',
      '#ffffff',
      '#ffe0c0',
      '#ffc080',
      '#ff8040',
      '#ff0000',
    ],
  },
  plasma: {
    name: 'Plasma',
    colors: [
      '#0d0887',
      '#46039f',
      '#7201a8',
      '#9c179e',
      '#bd3786',
      '#d8576b',
      '#ed7953',
      '#fb9f3a',
      '#fdca26',
      '#f0f921',
    ],
  },
  turbo: {
    name: 'Turbo',
    colors: [
      '#30123b',
      '#4662d7',
      '#36aaf9',
      '#1ae4b6',
      '#72fe5e',
      '#c8ef34',
      '#faba39',
      '#f66b19',
      '#ca2a04',
      '#7a0403',
    ],
  },
};

/**
 * Convertit une couleur hex en RGB
 */
export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return [0, 0, 0];
  }
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
  ];
}

/**
 * Convertit RGB en hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Interpole entre deux couleurs RGB
 */
export function interpolateRgb(
  color1: [number, number, number],
  color2: [number, number, number],
  factor: number
): [number, number, number] {
  const clampedFactor = Math.max(0, Math.min(1, factor));
  return [
    color1[0] + (color2[0] - color1[0]) * clampedFactor,
    color1[1] + (color2[1] - color1[1]) * clampedFactor,
    color1[2] + (color2[2] - color1[2]) * clampedFactor,
  ];
}

/**
 * Applique une fonction d'easing pour le softness
 */
function applySoftness(t: number, softness: number): number {
  if (softness === 0) return t;

  // Easing function: smooth step with variable steepness
  const k = 1 + softness * 9; // 1 to 10
  return Math.pow(t, k) / (Math.pow(t, k) + Math.pow(1 - t, k));
}

/**
 * Sample une couleur depuis une palette à une position donnée (0-1)
 */
export function samplePalette(
  palette: string[],
  position: number,
  softness: number = 0
): string {
  const clampedPos = Math.max(0, Math.min(1, position));
  const adjustedPos = applySoftness(clampedPos, softness);

  const scaledPos = adjustedPos * (palette.length - 1);
  const index = Math.floor(scaledPos);
  const fraction = scaledPos - index;

  if (index >= palette.length - 1) {
    return palette[palette.length - 1];
  }

  const color1 = hexToRgb(palette[index]);
  const color2 = hexToRgb(palette[index + 1]);
  const [r, g, b] = interpolateRgb(color1, color2, fraction);

  return rgbToHex(r, g, b);
}

/**
 * Classe pour gérer le mapping des valeurs vers les couleurs
 */
export class ColorScale {
  private config: ColorScaleConfig;

  constructor(config: ColorScaleConfig) {
    this.config = config;
  }

  /**
   * Met à jour la configuration
   */
  updateConfig(newConfig: Partial<ColorScaleConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Obtient la configuration actuelle
   */
  getConfig(): ColorScaleConfig {
    return { ...this.config };
  }

  /**
   * Map une valeur vers une couleur
   */
  getColor(value: number | null): string {
    if (value === null || !isFinite(value)) {
      return this.config.missingColor;
    }

    const { min, max, palette, customGradient, softness } = this.config;

    // Normalise la valeur entre 0 et 1
    const range = max - min;
    if (range === 0) {
      return palette ? palette.colors[Math.floor(palette.colors.length / 2)] : '#808080';
    }

    const normalized = (value - min) / range;

    // Utilise la palette ou le gradient personnalisé
    if (palette) {
      return samplePalette(palette.colors, normalized, softness);
    } else if (customGradient) {
      const color1 = hexToRgb(customGradient.negativeColor);
      const color2 = hexToRgb(customGradient.positiveColor);
      const adjustedPos = applySoftness(normalized, softness);
      const [r, g, b] = interpolateRgb(color1, color2, adjustedPos);
      return rgbToHex(r, g, b);
    }

    return '#808080';
  }

  /**
   * Génère une légende de couleurs avec des valeurs échantillonnées
   */
  generateLegend(steps: number = 10): { value: number; color: string }[] {
    const { min, max } = this.config;
    const legend: { value: number; color: string }[] = [];

    for (let i = 0; i <= steps; i++) {
      const factor = i / steps;
      const value = min + (max - min) * factor;
      const color = this.getColor(value);
      legend.push({ value, color });
    }

    return legend;
  }

  /**
   * Génère un gradient CSS
   */
  toCssGradient(): string {
    const { palette, customGradient } = this.config;

    if (palette) {
      return `linear-gradient(to right, ${palette.colors.join(', ')})`;
    } else if (customGradient) {
      return `linear-gradient(to right, ${customGradient.negativeColor}, ${customGradient.positiveColor})`;
    }

    return 'linear-gradient(to right, #000000, #ffffff)';
  }
}

/**
 * Crée une configuration de ColorScale par défaut
 */
export function createDefaultColorScaleConfig(
  min: number,
  max: number,
  paletteName: keyof typeof PREDEFINED_PALETTES = 'viridis'
): ColorScaleConfig {
  return {
    min,
    max,
    palette: PREDEFINED_PALETTES[paletteName],
    softness: 0,
    missingColor: '#6b7280',
  };
}
