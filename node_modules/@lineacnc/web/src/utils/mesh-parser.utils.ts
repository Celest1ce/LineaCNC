/**
 * Utilities for parsing bed mesh data from G-code responses
 *
 * These functions are designed to be generic and reusable for any mesh-related
 * G-code commands (G29, G29 T, M420 V, etc.)
 */

import { BedMeshData } from '../types/printer';

/**
 * Extracts a 2D mesh matrix from G29 T response
 *
 * Expected format:
 * Bilinear Leveling Grid:
 *       0      1      2      3      4      5      6
 *  0 +0.000 +0.000 +0.000 +0.000 +0.000 +0.000 +0.000
 *  1 +0.000 -1.455 -0.785 -0.060 +0.712 +1.440 +0.000
 *  ...
 *
 * @param rawData - Raw G-code response text
 * @returns Parsed BedMeshData or null if parsing fails
 */
export function extractMeshFromGcodeReport(rawData: string): BedMeshData | null {
  try {
    const lines = rawData.split('\n').map(line => line.trim()).filter(Boolean);

    // Detect probing mode
    const probingMode = detectProbingMode(lines);
    if (!probingMode) {
      return null;
    }

    // Find the start of the mesh data (after the header line with column numbers)
    let meshStartIndex = -1;
    let headerLine: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Look for a line with sequential numbers (column headers)
      // Must be ONLY integers (no decimals, no +/- signs)
      if (/^\s*\d+\s+\d+\s+\d+/.test(line)) {
        // Additional check: make sure it's not a data line
        // Data lines either have pipes "|" or have decimal/signed numbers
        if (line.includes('|') || /[+\-]\d+\.\d+/.test(line)) {
          continue; // Skip this line, it's not a header
        }

        // Verify it's a sequential header (0, 1, 2, 3... or similar pattern)
        const numbers = line.trim().split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        const isSequential = numbers.length >= 3 && numbers[0] === 0 && numbers[1] === 1;

        if (isSequential) {
          headerLine = line;
          meshStartIndex = i + 1;
          break;
        }
      }
    }

    if (meshStartIndex === -1 || !headerLine) {
      return null;
    }

    // Extract mesh size from header
    const headerNumbers = headerLine.trim().split(/\s+/).filter(n => /^\d+$/.test(n));
    const cols = headerNumbers.length;

    // Parse mesh data rows
    const mesh: (number | null)[][] = [];
    let min = Infinity;
    let max = -Infinity;

    for (let i = meshStartIndex; i < lines.length; i++) {
      const line = lines[i];

      // Skip empty lines or lines that are just separators (|)
      if (!line.trim() || line.trim() === '|') {
        continue;
      }

      // Stop if we hit a non-data line (coordinates like "( 1, 1) (299, 1)" or "ok")
      if (!line.match(/^\s*\d+/) || line.includes('(') || line.toLowerCase().includes('ok')) {
        break;
      }

      // Skip lines that look like column headers (sequential integers: 0 1 2 3 4...)
      // This prevents re-parsing the header if it appears again
      const tokens = line.trim().split(/\s+/);
      if (tokens.length >= 3 &&
          /^\d+$/.test(tokens[0]) &&
          /^\d+$/.test(tokens[1]) &&
          /^\d+$/.test(tokens[2]) &&
          !line.includes('|') &&
          !line.includes('.') &&
          !line.includes('+') &&
          !line.includes('-')) {
        // This looks like a header line (only integers, no decimals/signs)
        const nums = tokens.map(t => parseInt(t, 10)).filter(n => !isNaN(n));
        if (nums.length >= 3 && nums[0] === 0 && nums[1] === 1) {
          continue; // Skip this header line
        }
      }

      const row = parseMeshRow(line, cols);
      if (row) {
        mesh.push(row);

        // Update min/max
        row.forEach(val => {
          if (val !== null) {
            min = Math.min(min, val);
            max = Math.max(max, val);
          }
        });
      }
    }

    if (mesh.length === 0) {
      return null;
    }

    return {
      size: mesh.length,
      probingMode,
      mesh,
      min: min === Infinity ? 0 : min,
      max: max === -Infinity ? 0 : max,
      meshPoints: {
        x: cols,
        y: mesh.length,
      },
    };
  } catch (error) {
    console.error('Error parsing mesh data:', error);
    return null;
  }
}

/**
 * Parses a single mesh row
 *
 * @param line - Raw line like "  1 +0.000 -1.455 -0.785 -0.060 +0.712 +1.440 +0.000"
 *               or " 6 |  .      .      .      .      .      .      ."
 * @param expectedCols - Expected number of columns
 * @returns Array of numbers or null for missing values
 */
function parseMeshRow(line: string, expectedCols: number): (number | null)[] | null {
  try {
    // Find the pipe separator (Pronterface/Topography format)
    const pipeIndex = line.indexOf('|');

    if (pipeIndex === -1) {
      // No pipe, try to parse as standard format: "  1 +0.000 -1.455 ..."
      const parts = line.trim().split(/\s+/);
      if (!/^\d+$/.test(parts[0])) {
        return null;
      }

      const values = parts.slice(1);
      const row: (number | null)[] = [];

      for (let i = 0; i < expectedCols; i++) {
        if (i >= values.length) {
          row.push(null);
        } else {
          const val = values[i];
          if (val === '.' || val === '---' || val === 'nan' || val.toLowerCase() === 'null') {
            row.push(null);
          } else {
            const parsed = parseFloat(val);
            row.push(isNaN(parsed) ? null : parsed);
          }
        }
      }
      return row;
    }

    // Pipe format handling (like Pronterface parser)
    // Extract row number before the pipe
    const beforePipe = line.slice(0, pipeIndex).trim();
    if (!/^\d+$/.test(beforePipe)) {
      return null;
    }

    // Get everything after the pipe
    const afterPipe = line.slice(pipeIndex + 1);

    // Remove brackets, parentheses, and replace commas/semicolons with spaces
    const segment = afterPipe
      .replace(/[\[\]\(\)]/g, ' ')
      .replace(/[,;]+/g, ' ');

    // Tokenize: split on whitespace and filter empty tokens
    const tokens = segment
      .split(/\s+/)
      .map(token => token.trim())
      .filter(token => token.length > 0);

    const row: (number | null)[] = [];

    for (const token of tokens) {
      // Check for missing value indicators (., ·, ---, etc.)
      if (/^[.·-]+$/.test(token) || token.toLowerCase() === 'nan' || token.toLowerCase() === 'null') {
        row.push(null);
        continue;
      }

      // Try to extract a number from the token (robust regex from Pronterface)
      const match = token.match(/[-+]?(?:\d+\.\d+|\d+|\.\d+)(?:[eE][-+]?\d+)?/);
      if (match) {
        const value = parseFloat(match[0]);
        if (isFinite(value)) {
          row.push(value);
          continue;
        }
      }

      // If we can't parse it, treat as missing
      row.push(null);
    }

    // Pad with nulls if we don't have enough columns
    while (row.length < expectedCols) {
      row.push(null);
    }

    // Truncate if we have too many columns
    if (row.length > expectedCols) {
      row.length = expectedCols;
    }

    return row;
  } catch (error) {
    return null;
  }
}

/**
 * Detects the probing/leveling mode from the response
 *
 * @param lines - Lines from the G-code response
 * @returns Probing mode string or null
 */
export function detectProbingMode(lines: string[]): string | null {
  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.includes('bilinear')) {
      return 'Bilinear';
    } else if (lower.includes('ubl') || lower.includes('unified bed leveling')) {
      return 'UBL';
    } else if (lower.includes('3-point') || lower.includes('3point')) {
      return '3-Point';
    } else if (lower.includes('topography')) {
      return 'Bed Topography';
    } else if (lower.includes('mesh') || lower.includes('grid')) {
      return 'Mesh';
    }
  }

  return null;
}

/**
 * Normalizes mesh values to a 0-1 range for visualization
 *
 * @param mesh - Raw mesh data
 * @param min - Minimum value (or will be calculated)
 * @param max - Maximum value (or will be calculated)
 * @returns Normalized mesh
 */
export function normalizeMeshValues(
  mesh: (number | null)[][],
  min?: number,
  max?: number
): (number | null)[][] {
  let actualMin = min ?? Infinity;
  let actualMax = max ?? -Infinity;

  // Calculate min/max if not provided
  if (min === undefined || max === undefined) {
    mesh.forEach(row => {
      row.forEach(val => {
        if (val !== null) {
          actualMin = Math.min(actualMin, val);
          actualMax = Math.max(actualMax, val);
        }
      });
    });
  }

  const range = actualMax - actualMin;
  if (range === 0) return mesh;

  return mesh.map(row =>
    row.map(val => (val !== null ? (val - actualMin) / range : null))
  );
}

/**
 * Converts raw G-code text into a structured grid
 * Universal function that can handle different G-code report formats
 *
 * @param rawData - Raw G-code response
 * @returns Structured mesh data or null
 */
export function convertRawGcodeToGrid(rawData: string): BedMeshData | null {
  // Try to extract mesh using the standard format
  return extractMeshFromGcodeReport(rawData);
}

/**
 * Validates mesh data integrity
 *
 * @param mesh - Mesh data to validate
 * @returns True if valid
 */
export function validateMeshData(mesh: BedMeshData): boolean {
  if (!mesh || !mesh.mesh || mesh.mesh.length === 0) {
    return false;
  }

  // Check that all rows have the same length
  const rowLength = mesh.mesh[0].length;
  return mesh.mesh.every(row => row.length === rowLength);
}

/**
 * Extracts mesh info from M990 response
 *
 * @param m990Data - Parsed M990 hardware info
 * @returns Mesh configuration info
 */
export function extractMeshInfoFromM990(m990Data: Record<string, unknown>): {
  bedLeveling: string;
  meshPoints?: { x: number; y: number };
} | null {
  if (!m990Data) return null;

  return {
    bedLeveling: (m990Data.bedLeveling as string) || 'Unknown',
    meshPoints: m990Data.meshPoints as { x: number; y: number } | undefined,
  };
}
