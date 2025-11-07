const DEFAULT_INFO_COMMANDS = ['M990'];

function normalizeInfoCommands(commands, { allowEmpty = false } = {}) {
  const list = Array.isArray(commands) ? commands : [];
  const normalized = list
    .map((command) =>
      typeof command === 'string'
        ? command
            .trim()
            .replace(/\s+/g, ' ')
            .toUpperCase()
        : ''
    )
    .filter(Boolean);

  const unique = Array.from(new Set(normalized));
  if (unique.length === 0 && !allowEmpty) {
    return [...DEFAULT_INFO_COMMANDS];
  }
  return unique;
}

function parseInfoCommands(rawValue, options = {}) {
  if (!rawValue) {
    return normalizeInfoCommands([], options);
  }

  if (Array.isArray(rawValue)) {
    return normalizeInfoCommands(rawValue, options);
  }

  if (typeof rawValue === 'string') {
    try {
      const parsed = JSON.parse(rawValue);
      return normalizeInfoCommands(parsed, options);
    } catch (error) {
      return normalizeInfoCommands(rawValue.split(/[,\n]/), options);
    }
  }

  return normalizeInfoCommands([], options);
}

function normalizeParameterName(rawKey, command, index = 0) {
  const base = typeof rawKey === 'string' ? rawKey : '';
  const normalized = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

  if (normalized) {
    return normalized;
  }

  const fallbackCommand = typeof command === 'string' ? command : 'param';
  const safeCommand = fallbackCommand
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'param';

  return `${safeCommand}_${index + 1}`;
}

function inferDataType(value) {
  if (value === null || value === undefined) {
    return 'unknown';
  }

  const stringValue = String(value).trim();
  if (stringValue.length === 0) {
    return 'string';
  }

  const lowerValue = stringValue.toLowerCase();

  if (/^-?\d+(\.\d+)?$/.test(stringValue)) {
    return 'number';
  }

  if (['true', 'false', 'on', 'off', 'yes', 'no', 'enabled', 'disabled', 'present', 'absent'].includes(lowerValue)) {
    return 'boolean';
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue) && !Number.isNaN(Date.parse(stringValue))) {
    return 'date';
  }

  if (
    (stringValue.startsWith('{') && stringValue.endsWith('}')) ||
    (stringValue.startsWith('[') && stringValue.endsWith(']'))
  ) {
    try {
      JSON.parse(stringValue);
      return 'json';
    } catch (error) {
      // Ignored - fallback to string
    }
  }

  return 'string';
}

function normalizeValueForType(value, type) {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();
  if (stringValue.length === 0) {
    return '';
  }

  const lowerValue = stringValue.toLowerCase();

  switch (type) {
    case 'number':
      return Number(stringValue).toString();
    case 'boolean':
      return ['true', 'on', 'yes', 'enabled', 'present'].includes(lowerValue) ? 'true' : 'false';
    case 'date':
      try {
        const date = new Date(stringValue);
        if (!Number.isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (error) {
        return stringValue;
      }
      return stringValue;
    case 'json':
      try {
        const parsed = JSON.parse(stringValue);
        return JSON.stringify(parsed);
      } catch (error) {
        return stringValue;
      }
    default:
      return stringValue;
  }
}

module.exports = {
  DEFAULT_INFO_COMMANDS,
  normalizeInfoCommands,
  parseInfoCommands,
  normalizeParameterName,
  inferDataType,
  normalizeValueForType
};
