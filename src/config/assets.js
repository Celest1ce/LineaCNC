const path = require('path');

/**
 * Configuration des assets statiques
 */
const assetsConfig = {
  // Chemins des dossiers d'assets
  paths: {
    images: '/assets/images',
    fonts: '/assets/fonts',
    documents: '/assets/documents',
    downloads: '/assets/downloads'
  },

  // Configuration des images
  images: {
    logos: {
      path: '/assets/images/logos',
      sizes: [16, 32, 64, 128, 256],
      formats: ['svg', 'png'],
      defaultSize: 64
    },
    icons: {
      path: '/assets/images/icons',
      sizes: [16, 20, 24, 32],
      formats: ['svg', 'png'],
      defaultSize: 24
    },
    backgrounds: {
      path: '/assets/images/backgrounds',
      formats: ['jpg', 'png', 'webp'],
      maxSize: '2MB'
    }
  },

  // Configuration des polices
  fonts: {
    path: '/assets/fonts',
    formats: ['woff2', 'woff', 'ttf'],
    families: ['Inter', 'Montserrat'],
    fallbacks: {
      'Inter': 'system-ui, -apple-system, sans-serif',
      'Montserrat': 'Inter, system-ui, sans-serif'
    }
  },

  // Configuration des documents
  documents: {
    path: '/assets/documents',
    allowedTypes: ['pdf', 'doc', 'docx', 'txt'],
    maxSize: '10MB'
  },

  // Configuration des téléchargements
  downloads: {
    path: '/assets/downloads',
    allowedTypes: ['zip', 'tar', 'gz', 'exe', 'dmg'],
    maxSize: '100MB'
  },

  // Headers de cache
  cache: {
    images: 'public, max-age=31536000', // 1 an
    fonts: 'public, max-age=31536000',  // 1 an
    documents: 'public, max-age=86400', // 1 jour
    downloads: 'public, max-age=3600'   // 1 heure
  }
};

/**
 * Génère l'URL complète d'un asset
 * @param {string} type - Type d'asset (images, fonts, etc.)
 * @param {string} filename - Nom du fichier
 * @param {string} subfolder - Sous-dossier (logos, icons, etc.)
 * @returns {string} URL complète de l'asset
 */
function getAssetUrl(type, filename, subfolder = '') {
  const basePath = assetsConfig.paths[type];
  const subPath = subfolder ? `/${subfolder}` : '';
  return `${basePath}${subPath}/${filename}`;
}

/**
 * Génère l'URL d'une image avec taille spécifique
 * @param {string} name - Nom de l'image
 * @param {number} size - Taille en pixels
 * @param {string} format - Format de l'image (svg, png, jpg)
 * @param {string} subfolder - Sous-dossier (logos, icons, etc.)
 * @returns {string} URL de l'image
 */
function getImageUrl(name, size, format = 'svg', subfolder = 'icons') {
  const filename = size ? `${name}-${size}.${format}` : `${name}.${format}`;
  return getAssetUrl('images', filename, subfolder);
}

/**
 * Génère l'URL d'une police
 * @param {string} family - Nom de la famille de police
 * @param {string} weight - Poids de la police (400, 500, 600, etc.)
 * @param {string} style - Style de la police (normal, italic)
 * @returns {string} URL de la police
 */
function getFontUrl(family, weight = '400', style = 'normal') {
  const filename = `${family}-${weight}${style !== 'normal' ? `-${style}` : ''}.woff2`;
  return getAssetUrl('fonts', filename, family);
}

/**
 * Vérifie si un type de fichier est autorisé
 * @param {string} type - Type d'asset
 * @param {string} extension - Extension du fichier
 * @returns {boolean} True si autorisé
 */
function isAllowedType(type, extension) {
  const config = assetsConfig[type];
  if (!config || !config.allowedTypes) return true;
  return config.allowedTypes.includes(extension.toLowerCase());
}

/**
 * Obtient la configuration de cache pour un type d'asset
 * @param {string} type - Type d'asset
 * @returns {string} Header de cache
 */
function getCacheHeader(type) {
  return assetsConfig.cache[type] || 'public, max-age=3600';
}

module.exports = {
  assetsConfig,
  getAssetUrl,
  getImageUrl,
  getFontUrl,
  isAllowedType,
  getCacheHeader
};
