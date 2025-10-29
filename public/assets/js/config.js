/**
 * Configuration centralisée de l'application JavaScript
 */
window.LineaCNC = window.LineaCNC || {};

window.LineaCNC.config = {
    // Version de l'application
    version: '1.0.0',
    
    // Mode debug
    debug: false,
    
    // Configuration de l'API
    api: {
        baseUrl: '/api',
        timeout: 10000,
        retries: 3
    },
    
    // Configuration de l'interface utilisateur
    ui: {
        animationDuration: 300,
        notificationDuration: 3000,
        dropdownAnimationDuration: 200,
        machineUpdateInterval: 5000
    },
    
    // Configuration des machines CNC
    machines: {
        maxMachines: 10,
        defaultBaudRate: 115200,
        connectionTimeout: 5000,
        supportedBaudRates: [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600]
    },
    
    // Configuration des notifications
    notifications: {
        maxVisible: 5,
        position: 'top-right',
        autoClose: true,
        showCloseButton: true
    },
    
    // Configuration des dropdowns
    dropdowns: {
        closeOnEscape: true,
        closeOnOutsideClick: true,
        animationEnabled: true
    },
    
    // Configuration des thèmes
    themes: {
        current: 'light',
        available: ['light', 'dark'],
        autoDetect: true
    },
    
    // Configuration des performances
    performance: {
        enableLazyLoading: true,
        enableVirtualScrolling: false,
        maxRenderItems: 100,
        debounceDelay: 300
    },
    
    // Configuration de sécurité
    security: {
        enableCSP: true,
        sanitizeInputs: true,
        validateUrls: true
    }
};

/**
 * Fonction pour obtenir une valeur de configuration
 * @param {string} path - Chemin vers la configuration (ex: 'ui.animationDuration')
 * @param {*} defaultValue - Valeur par défaut si non trouvée
 * @returns {*} Valeur de configuration
 */
window.LineaCNC.getConfig = function(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.config;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return defaultValue;
        }
    }
    
    return value;
};

/**
 * Fonction pour définir une valeur de configuration
 * @param {string} path - Chemin vers la configuration
 * @param {*} value - Nouvelle valeur
 */
window.LineaCNC.setConfig = function(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.config;
    
    for (const key of keys) {
        if (!target[key] || typeof target[key] !== 'object') {
            target[key] = {};
        }
        target = target[key];
    }
    
    target[lastKey] = value;
};

/**
 * Fonction pour réinitialiser la configuration
 */
window.LineaCNC.resetConfig = function() {
    // Recharger la configuration par défaut
    location.reload();
};

// Configuration spécifique à l'environnement
if (typeof window !== 'undefined') {
    // Détection de l'environnement
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('dev');
    
    if (isDevelopment) {
        window.LineaCNC.config.debug = true;
        window.LineaCNC.config.api.timeout = 30000;
        console.log('🔧 Mode développement activé');
    }
    
    // Détection des capacités du navigateur
    window.LineaCNC.capabilities = {
        webSerial: 'serial' in navigator,
        notifications: 'Notification' in window,
        clipboard: 'clipboard' in navigator,
        localStorage: 'localStorage' in window,
        sessionStorage: 'sessionStorage' in window,
        webWorkers: 'Worker' in window,
        serviceWorkers: 'serviceWorker' in navigator
    };
    
    // Configuration adaptative basée sur les capacités
    if (!window.LineaCNC.capabilities.webSerial) {
        console.warn('⚠️ Web Serial API non supportée');
    }
    
    if (!window.LineaCNC.capabilities.notifications) {
        window.LineaCNC.config.notifications.enableBrowserNotifications = false;
    }
}

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.LineaCNC;
}
