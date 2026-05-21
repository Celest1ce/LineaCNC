/**
 * Utilities for color gradients used in mesh visualization
 *
 * Provides pre-defined gradients (Magma, Viridis) and custom gradient generation
 */

import { GradientType, CustomGradient } from '../types/printer';

/**
 * Magma color gradient (scientific visualization)
 * From black/dark purple to white/yellow
 */
const MAGMA_COLORS = [
  [0, 0, 4],
  [28, 16, 68],
  [79, 18, 123],
  [129, 37, 129],
  [181, 54, 122],
  [229, 80, 100],
  [251, 135, 97],
  [254, 194, 135],
  [252, 253, 191],
];

/**
 * Viridis color gradient (scientific visualization)
 * From dark purple to yellow/green
 */
const VIRIDIS_COLORS = [
  [68, 1, 84],
  [72, 40, 120],
  [62, 73, 137],
  [49, 104, 142],
  [38, 130, 142],
  [31, 158, 137],
  [53, 183, 121],
  [109, 205, 89],
  [180, 222, 44],
  [253, 231, 37],
];

/**
 * Converts an RGB color to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Interpolates between two RGB colors
 */
function interpolateColor(
  color1: [number, number, number],
  color2: [number, number, number],
  factor: number
): [number, number, number] {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * factor),
    Math.round(color1[1] + (color2[1] - color1[1]) * factor),
    Math.round(color1[2] + (color2[2] - color1[2]) * factor),
  ];
}

/**
 * Gets a color from a gradient based on a normalized value (0-1)
 *
 * @param value - Normalized value between 0 and 1
 * @param gradientColors - Array of RGB colors
 * @returns Hex color string
 */
function getColorFromGradient(
  value: number,
  gradientColors: [number, number, number][]
): string {
  // Clamp value between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));

  // Calculate position in gradient
  const position = clampedValue * (gradientColors.length - 1);
  const index = Math.floor(position);
  const factor = position - index;

  // Handle edge cases
  if (index >= gradientColors.length - 1) {
    const lastColor = gradientColors[gradientColors.length - 1];
    return rgbToHex(lastColor[0], lastColor[1], lastColor[2]);
  }

  // Interpolate between two colors
  const color1 = gradientColors[index];
  const color2 = gradientColors[index + 1];
  const [r, g, b] = interpolateColor(color1, color2, factor);

  return rgbToHex(r, g, b);
}

/**
 * Hex to RGB conversion
 */
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return [0, 0, 0];
  }
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

/**
 * Gets a color for a mesh value using the specified gradient type
 *
 * @param value - The mesh value
 * @param min - Minimum value in the mesh
 * @param max - Maximum value in the mesh
 * @param gradientType - Type of gradient to use
 * @param customGradient - Custom gradient configuration (if type is 'custom')
 * @returns Hex color string
 */
export function getColorForValue(
  value: number | null,
  min: number,
  max: number,
  gradientType: GradientType = 'magma',
  customGradient?: CustomGradient
): string {
  // Handle null values (missing data)
  if (value === null) {
    return '#cccccc'; // Gray for missing data
  }

  // Handle edge case where min === max
  if (min === max) {
    if (gradientType === 'magma') {
      const color = MAGMA_COLORS[Math.floor(MAGMA_COLORS.length / 2)];
      return rgbToHex(color[0], color[1], color[2]);
    } else if (gradientType === 'viridis') {
      const color = VIRIDIS_COLORS[Math.floor(VIRIDIS_COLORS.length / 2)];
      return rgbToHex(color[0], color[1], color[2]);
    } else {
      return customGradient?.colorMin || '#0000ff';
    }
  }

  // Use custom min/max if provided
  const actualMin = customGradient?.min ?? min;
  const actualMax = customGradient?.max ?? max;

  // Normalize value
  const normalized = (value - actualMin) / (actualMax - actualMin);

  // Get color based on gradient type
  switch (gradientType) {
    case 'magma':
      return getColorFromGradient(normalized, MAGMA_COLORS as [number, number, number][]);

    case 'viridis':
      return getColorFromGradient(normalized, VIRIDIS_COLORS as [number, number, number][]);

    case 'custom':
      if (!customGradient) {
        return '#000000';
      }
      // Create a simple two-color gradient
      const rgb1 = hexToRgb(customGradient.colorMin);
      const rgb2 = hexToRgb(customGradient.colorMax);
      const [r, g, b] = interpolateColor(rgb1, rgb2, normalized);
      return rgbToHex(r, g, b);

    default:
      return '#000000';
  }
}

/**
 * Generates a legend/scale for the gradient
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @param gradientType - Type of gradient
 * @param customGradient - Custom gradient configuration
 * @param steps - Number of steps in the legend
 * @returns Array of {value, color} objects
 */
export function generateGradientLegend(
  min: number,
  max: number,
  gradientType: GradientType = 'magma',
  customGradient?: CustomGradient,
  steps: number = 10
): { value: number; color: string }[] {
  const legend: { value: number; color: string }[] = [];

  for (let i = 0; i <= steps; i++) {
    const factor = i / steps;
    const value = min + (max - min) * factor;
    const color = getColorForValue(value, min, max, gradientType, customGradient);
    legend.push({ value, color });
  }

  return legend;
}

/**
 * Gets the gradient colors array for a specific gradient type
 *
 * @param gradientType - Type of gradient
 * @returns CSS gradient string for use in backgrounds
 */
export function getGradientCss(gradientType: GradientType, customGradient?: CustomGradient): string {
  let colors: string[];

  switch (gradientType) {
    case 'magma':
      colors = MAGMA_COLORS.map(rgb => rgbToHex(rgb[0], rgb[1], rgb[2]));
      break;

    case 'viridis':
      colors = VIRIDIS_COLORS.map(rgb => rgbToHex(rgb[0], rgb[1], rgb[2]));
      break;

    case 'custom':
      if (!customGradient) {
        return 'linear-gradient(to right, #000000, #ffffff)';
      }
      return `linear-gradient(to right, ${customGradient.colorMin}, ${customGradient.colorMax})`;

    default:
      colors = MAGMA_COLORS.map(rgb => rgbToHex(rgb[0], rgb[1], rgb[2]));
  }

  return `linear-gradient(to right, ${colors.join(', ')})`;
}
