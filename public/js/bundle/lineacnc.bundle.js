/**
 * LineaCNC - Bundle JavaScript
 * Généré le 2025-11-08T23:03:24.458Z
 */

// === config.js ===
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


// === utils/notification.js ===
/**
 * Gestionnaire de notifications
 */
class NotificationManager {
    constructor() {
        this.container = this.createContainer();
    }

    /**
     * Crée le conteneur des notifications
     */
    createContainer() {
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'fixed top-4 right-4 left-4 sm:left-auto sm:max-w-sm z-50 space-y-2 pointer-events-none';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Affiche une notification
     * @param {string} message - Message à afficher
     * @param {string} type - Type de notification (success, error, info, warning)
     * @param {number} duration - Durée d'affichage en ms (défaut: 3000)
     */
    show(message, type = 'info', duration = 3000) {
        // Limiter le nombre de notifications visibles
        this.limitVisibleNotifications();

        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);

        // Animation d'entrée
        setTimeout(() => {
            notification.classList.add('opacity-100', 'translate-x-0');
        }, 10);

        // Suppression automatique
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * Limite le nombre de notifications visibles (max 3)
     */
    limitVisibleNotifications() {
        const notifications = this.container.querySelectorAll('.transform');
        const maxNotifications = 3;
        
        if (notifications.length >= maxNotifications) {
            // Supprimer les notifications les plus anciennes
            const notificationsToRemove = notifications.length - maxNotifications + 1;
            for (let i = 0; i < notificationsToRemove; i++) {
                this.hide(notifications[i]);
            }
        }
    }

    /**
     * Crée l'élément de notification
     */
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `transform transition-all duration-300 ease-in-out opacity-0 translate-x-full max-w-full w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`;

        const colors = {
            success: 'border-l-4 border-green-400 bg-green-50',
            error: 'border-l-4 border-red-400 bg-red-50',
            warning: 'border-l-4 border-yellow-400 bg-yellow-50',
            info: 'border-l-4 border-blue-400 bg-blue-50'
        };

        const icons = {
            success: `<svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
            </svg>`,
            error: `<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
            </svg>`,
            warning: `<svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.725-1.36 3.49 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>`,
            info: `<svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
            </svg>`
        };

        notification.innerHTML = `
            <div class="p-4 ${colors[type]}">
                <div class="flex">
                    <div class="flex-shrink-0">
                        ${icons[type]}
                    </div>
                    <div class="ml-3 w-0 flex-1">
                        <p class="text-sm font-medium text-gray-900 break-words">
                            ${message}
                        </p>
                    </div>
                    <div class="ml-4 flex-shrink-0 flex">
                        <button class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onclick="notificationManager.hide(this.closest('.transform'))">
                            <span class="sr-only">Fermer</span>
                            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return notification;
    }

    /**
     * Masque une notification
     */
    hide(notification) {
        notification.classList.remove('opacity-100', 'translate-x-0');
        notification.classList.add('opacity-0', 'translate-x-full');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Masque toutes les notifications
     */
    hideAll() {
        const notifications = this.container.querySelectorAll('.transform');
        notifications.forEach(notification => this.hide(notification));
    }
}

// Instance globale
const notificationManager = new NotificationManager();


// === utils/theme-manager.js ===
/**
 * Gestionnaire de thème (Mode clair, sombre, automatique)
 */
class ThemeManager {
    constructor() {
        this.currentTheme = 'auto';
        this.init();
    }

    init() {
        // Charger le thème sauvegardé
        this.loadTheme();
        
        // Appliquer le thème
        this.applyTheme();
        
        // Attendre que le DOM soit chargé pour bind les events
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEvents();
                this.updateButtons();
            });
        } else {
            this.bindEvents();
            this.updateButtons();
        }
        
        // Vérifier l'heure toutes les minutes pour le mode auto
        setInterval(() => this.checkAutoTheme(), 60000);
    }

    bindEvents() {
        // Boutons de sélection de thème
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.currentTarget.dataset.theme;
                this.setTheme(theme);
            });
        });
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
            this.currentTheme = savedTheme;
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme();
        this.updateButtons();
    }

    applyTheme() {
        const html = document.documentElement;
        
        if (this.currentTheme === 'auto') {
            // Mode automatique : sombre de 20h à 7h
            const hour = new Date().getHours();
            if (hour >= 20 || hour < 7) {
                html.classList.add('dark');
            } else {
                html.classList.remove('dark');
            }
        } else if (this.currentTheme === 'dark') {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
    }

    checkAutoTheme() {
        if (this.currentTheme === 'auto') {
            this.applyTheme();
        }
    }

    updateButtons() {
        const buttons = document.querySelectorAll('.theme-btn');
        buttons.forEach(btn => {
            const theme = btn.dataset.theme;
            const span = btn.querySelector('span');
            const svg = btn.querySelector('svg');
            
            if (theme === this.currentTheme) {
                // Bouton sélectionné
                btn.classList.add('bg-blue-50', 'dark:bg-blue-900', 'border', 'border-blue-300', 'dark:border-blue-700');
                btn.classList.remove('hover:bg-gray-100');
                span.classList.add('text-blue-600', 'dark:text-blue-300', 'font-semibold');
                span.classList.remove('text-gray-600');
            } else {
                // Bouton non sélectionné
                btn.classList.remove('bg-blue-50', 'dark:bg-blue-900', 'border', 'border-blue-300', 'dark:border-blue-700');
                btn.classList.add('hover:bg-gray-100', 'dark:hover:bg-gray-700');
                span.classList.remove('text-blue-600', 'dark:text-blue-300', 'font-semibold');
                span.classList.add('text-gray-600', 'dark:text-gray-400');
            }
        });
    }
}

// Créer une instance globale
const themeManager = new ThemeManager();



// === components/password-tools.js ===
(function () {
    'use strict';

    const PASSWORD_TOGGLE_LABELS = {
        show: 'Afficher le mot de passe',
        hide: 'Masquer le mot de passe'
    };

    const REQUIREMENT_CHECKS = [
        {
            key: 'length',
            test: (value) => value.length >= 10
        },
        {
            key: 'uppercase',
            test: (value) => /[A-Z]/.test(value)
        },
        {
            key: 'lowercase',
            test: (value) => /[a-z]/.test(value)
        },
        {
            key: 'number',
            test: (value) => /[0-9]/.test(value)
        },
        {
            key: 'special',
            test: (value) => /[^A-Za-z0-9]/.test(value)
        }
    ];

    function updateIcons(container, isActive) {
        const activeIcon = container.querySelector('[data-icon-active]');
        const inactiveIcon = container.querySelector('[data-icon-inactive]');

        if (activeIcon) {
            activeIcon.classList.toggle('hidden', !isActive);
        }

        if (inactiveIcon) {
            inactiveIcon.classList.toggle('hidden', isActive);
        }
    }

    function updateRequirementClasses(element, isValid) {
        element.classList.toggle('text-green-600', isValid);
        element.classList.toggle('text-gray-600', !isValid);
    }

    function initPasswordVisibility() {
        const fields = document.querySelectorAll('[data-password-field]');

        fields.forEach((field) => {
            const input = field.querySelector('[data-password-input]');
            const toggle = field.querySelector('[data-password-toggle]');

            if (!input || !toggle) {
                return;
            }

            const showIcon = toggle.querySelector('[data-icon-show]');
            const hideIcon = toggle.querySelector('[data-icon-hide]');
            const label = toggle.querySelector('[data-password-toggle-label]');

            toggle.addEventListener('click', () => {
                const shouldReveal = input.type === 'password';
                input.type = shouldReveal ? 'text' : 'password';
                toggle.setAttribute('aria-pressed', shouldReveal ? 'true' : 'false');

                const labelText = shouldReveal ? PASSWORD_TOGGLE_LABELS.hide : PASSWORD_TOGGLE_LABELS.show;
                toggle.setAttribute('aria-label', labelText);
                if (label) {
                    label.textContent = labelText;
                }

                if (showIcon) {
                    showIcon.classList.toggle('hidden', shouldReveal);
                }

                if (hideIcon) {
                    hideIcon.classList.toggle('hidden', !shouldReveal);
                }
            });
        });
    }

    function initPasswordSecurity() {
        const passwordInput = document.querySelector('[data-password-strength]');

        if (!passwordInput) {
            return;
        }

        const confirmInput = document.querySelector('[data-password-confirm]');
        const requirementsContainer = document.querySelector('[data-password-requirements]');
        const matchIndicator = document.querySelector('[data-password-match]');

        function updateRequirements(value) {
            if (!requirementsContainer) {
                return;
            }

            REQUIREMENT_CHECKS.forEach(({ key, test }) => {
                const item = requirementsContainer.querySelector(`[data-requirement="${key}"]`);
                if (!item) {
                    return;
                }

                const isValid = test(value);
                updateRequirementClasses(item, isValid);
                updateIcons(item, isValid);
            });
        }

        function updateMatchIndicator() {
            if (!confirmInput || !matchIndicator) {
                return;
            }

            const passwordsMatch = confirmInput.value.length > 0 && confirmInput.value === passwordInput.value;
            updateRequirementClasses(matchIndicator, passwordsMatch);
            updateIcons(matchIndicator, passwordsMatch);
        }

        passwordInput.addEventListener('input', () => {
            updateRequirements(passwordInput.value);
            updateMatchIndicator();
        });

        if (confirmInput) {
            confirmInput.addEventListener('input', updateMatchIndicator);
        }

        updateRequirements(passwordInput.value);
        updateMatchIndicator();
    }

    document.addEventListener('DOMContentLoaded', () => {
        window.LineaCNC = window.LineaCNC || {};
        initPasswordVisibility();
        initPasswordSecurity();
    });
})();


// === components/dropdown-manager.js ===
/**
 * Gestionnaire des dropdowns
 */
class DropdownManager {
    constructor() {
        this.activeDropdown = null;
        this.activeTrigger = null;
        this.dropdownKeydownHandler = this.handleDropdownKeydown.bind(this);
        this.focusInHandler = this.handleFocusIn.bind(this);
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Gestion du dropdown des outils
        this.setupToggle('toolsButton', 'toolsDropdown');
        this.setupToggle('settingsButton', 'settingsDropdown');

        // Fermer les dropdowns en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (
                this.activeDropdown &&
                !this.activeDropdown.contains(e.target) &&
                (!this.activeTrigger || !this.activeTrigger.contains(e.target))
            ) {
                this.closeDropdown(this.activeDropdown, { restoreFocus: false });
            }
        });

        // Gestion des touches clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeDropdown) {
                this.closeDropdown(this.activeDropdown);
            }
        });
    }

    setupToggle(buttonId, dropdownId) {
        const button = document.getElementById(buttonId);
        const dropdown = document.getElementById(dropdownId);

        if (!button || !dropdown) return;

        button.setAttribute('aria-expanded', 'false');

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleDropdown(dropdown, button);
        });

        button.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.openDropdown(dropdown, button, { focusFirst: true });
            }
        });
    }

    toggleDropdown(dropdown, trigger) {
        if (this.activeDropdown === dropdown) {
            this.closeDropdown(dropdown);
        } else {
            this.closeAllDropdowns();
            this.openDropdown(dropdown, trigger, { focusFirst: true });
        }
    }

    openDropdown(dropdown, trigger, { focusFirst = false } = {}) {
        dropdown.classList.remove('hidden');
        this.activeDropdown = dropdown;
        this.activeTrigger = trigger || null;

        if (this.activeTrigger) {
            this.activeTrigger.setAttribute('aria-expanded', 'true');
        }

        dropdown.setAttribute('aria-hidden', 'false');
        dropdown.addEventListener('keydown', this.dropdownKeydownHandler);
        document.addEventListener('focusin', this.focusInHandler);

        // Animation d'ouverture
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';

        requestAnimationFrame(() => {
            dropdown.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0)';
        });

        if (focusFirst) {
            const items = this.getFocusableItems(dropdown);
            if (items.length > 0) {
                items[0].focus();
            }
        }
    }

    closeDropdown(dropdown, { restoreFocus = true } = {}) {
        if (!dropdown) return;

        // Animation de fermeture
        dropdown.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            dropdown.classList.add('hidden');
            dropdown.style.transition = '';
            dropdown.style.opacity = '';
            dropdown.style.transform = '';

            if (this.activeDropdown === dropdown) {
                this.activeDropdown = null;
                if (this.activeTrigger) {
                    this.activeTrigger.setAttribute('aria-expanded', 'false');
                }
                dropdown.setAttribute('aria-hidden', 'true');
                dropdown.removeEventListener('keydown', this.dropdownKeydownHandler);
                document.removeEventListener('focusin', this.focusInHandler);

                if (restoreFocus && this.activeTrigger) {
                    this.activeTrigger.focus();
                }

                this.activeTrigger = null;
            }
        }, 200);
    }

    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('[id$="Dropdown"]');
        dropdowns.forEach(dropdown => {
            if (!dropdown.classList.contains('hidden')) {
                this.closeDropdown(dropdown);
            }
        });
    }

    getFocusableItems(dropdown) {
        return Array.from(
            dropdown.querySelectorAll(
                'a[href], button:not([disabled]), [role="menuitem"], [tabindex]:not([tabindex="-1"])'
            )
        ).filter((el) => !el.hasAttribute('disabled'));
    }

    handleDropdownKeydown(event) {
        if (!this.activeDropdown) return;

        const items = this.getFocusableItems(this.activeDropdown);
        if (items.length === 0) return;

        const currentIndex = items.indexOf(document.activeElement);

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
            items[nextIndex].focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const prevIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
            items[prevIndex].focus();
        } else if (event.key === 'Home') {
            event.preventDefault();
            items[0].focus();
        } else if (event.key === 'End') {
            event.preventDefault();
            items[items.length - 1].focus();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.closeDropdown(this.activeDropdown);
        } else if (event.key === 'Tab') {
            // Fermer le menu quand on tabule en dehors
            this.closeDropdown(this.activeDropdown, { restoreFocus: false });
        }
    }

    handleFocusIn(event) {
        if (
            !this.activeDropdown ||
            this.activeDropdown.contains(event.target) ||
            (this.activeTrigger && this.activeTrigger.contains(event.target))
        ) {
            return;
        }

        this.closeDropdown(this.activeDropdown, { restoreFocus: false });
    }
}

// Instance globale
const dropdownManager = new DropdownManager();


// === views/machine-tile-view.js ===
const SVG_NS = 'http://www.w3.org/2000/svg';

const MACHINE_TILE_STATUS_META = {
    connected: {
        label: 'Connectée',
        badgeClass: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
    },
    connecting: {
        label: 'Connexion...',
        badgeClass: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900'
    },
    retrieving: {
        label: 'Récupération des informations...',
        badgeClass: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900'
    },
    ready: {
        label: 'Prête',
        badgeClass: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900'
    },
    disconnected: {
        label: 'Non connecté',
        badgeClass: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
    },
    error: {
        label: 'Erreur',
        badgeClass: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900'
    }
};

const MACHINE_TILE_ICONS = {
    machine: ['M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'],
    settings: [
        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 01.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
        'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    ],
    console: ['M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'],
    trash: ['M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'],
    info: ['M13 16h-1v-4h1m0-4h-1m1-4a9 9 0 11-2 17.81A9 9 0 0112 3z']
};

class MachineTileView {
    constructor({ containerId = 'machinesGrid', emptyStateId = 'noMachinesMessage' } = {}) {
        this.containerId = containerId;
        this.emptyStateId = emptyStateId;
        this.callbacks = {};
    }

    setCallbacks(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    render(machines) {
        const grid = document.getElementById(this.containerId);
        const noMachinesMessage = document.getElementById(this.emptyStateId);

        if (!grid) return;

        grid.innerHTML = '';

        const list = machines instanceof Map
            ? Array.from(machines.values())
            : Array.isArray(machines)
                ? machines
                : [];

        if (list.length === 0) {
            if (noMachinesMessage) {
                noMachinesMessage.classList.remove('hidden');
            }
            return;
        }

        if (noMachinesMessage) {
            noMachinesMessage.classList.add('hidden');
        }

        const fragment = document.createDocumentFragment();

        list.forEach((machine) => {
            fragment.appendChild(this.createMachineTile(machine));
        });

        grid.appendChild(fragment);
    }

    createMachineTile(machine) {
        const tile = this.createElement('div', 'card p-4 flex flex-col gap-3 hover:shadow-lg transition-shadow duration-200');

        tile.append(
            this.buildTileHeader(machine),
            this.buildTileDetails(machine)
        );

        const footer = this.buildTileFooter(machine);
        if (footer) {
            tile.appendChild(footer);
        }

        return tile;
    }

    buildTileHeader(machine) {
        const header = this.createElement('div', 'flex items-start justify-between gap-3');

        const identity = this.createElement('div', 'flex items-start gap-2');
        const iconWrapper = this.createElement('div', 'p-1.5 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/40 dark:text-blue-300');
        iconWrapper.appendChild(this.createIcon(MACHINE_TILE_ICONS.machine, 'h-4 w-4'));
        identity.appendChild(iconWrapper);

        const info = this.createElement('div', 'min-w-0');
        info.append(
            this.createElement('h3', 'text-sm font-semibold text-gray-900 dark:text-gray-100 truncate', machine.name),
            this.createElement('p', 'text-xs text-gray-500 dark:text-gray-400', `${machine.baudRate} baud`)
        );
        identity.appendChild(info);

        header.appendChild(identity);

        const status = MACHINE_TILE_STATUS_META[machine.status] || MACHINE_TILE_STATUS_META.disconnected;
        const badge = this.createElement('span', `px-2 py-1 text-xs font-semibold rounded-full ${status.badgeClass}`, status.label);

        const actions = this.createElement('div', 'flex items-center gap-1');

        actions.appendChild(this.createIconButton({
            title: 'Paramètres',
            icon: this.createIcon(MACHINE_TILE_ICONS.settings, 'h-3 w-3'),
            className: 'p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors',
            onClick: () => this.callbacks.onEdit?.(machine.id)
        }));

        actions.appendChild(this.createIconButton({
            title: 'Informations',
            icon: this.createIcon(MACHINE_TILE_ICONS.info, 'h-3 w-3'),
            className: 'p-1 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors',
            onClick: () => this.callbacks.onViewInfo?.(machine.id)
        }));

        if (machine.status === 'ready') {
            actions.appendChild(this.createIconButton({
                title: 'Console Serial',
                icon: this.createIcon(MACHINE_TILE_ICONS.console, 'h-3 w-3'),
                className: 'p-1 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors',
                onClick: () => this.callbacks.onOpenConsole?.(machine.id)
            }));
        }

        actions.appendChild(this.createIconButton({
            title: 'Supprimer',
            icon: this.createIcon(MACHINE_TILE_ICONS.trash, 'h-3 w-3'),
            className: 'p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors',
            onClick: () => this.callbacks.onDelete?.(machine.id)
        }));

        const rightSide = this.createElement('div', 'flex items-start gap-2');
        rightSide.appendChild(badge);
        rightSide.appendChild(actions);
        header.appendChild(rightSide);

        return header;
    }

    buildTileDetails(machine) {
        const details = this.createElement('div', 'space-y-2');

        const activityRow = this.createElement('div', 'flex items-center justify-between');
        activityRow.append(
            this.createElement('span', 'text-xs font-medium text-gray-700 dark:text-gray-300', 'Activité :'),
            this.createElement(
                'span',
                'text-xs text-gray-500 dark:text-gray-400',
                machine.lastSeen ? this.formatTime(typeof machine.lastSeen === 'string' ? new Date(machine.lastSeen) : machine.lastSeen) : '—'
            )
        );

        details.appendChild(activityRow);

        const infoRow = this.createElement('div', 'flex items-center justify-between');
        infoRow.append(
            this.createElement('span', 'text-xs font-medium text-gray-700 dark:text-gray-300', 'Infos :'),
            this.createElement(
                'span',
                'text-xs text-gray-500 dark:text-gray-400',
                machine.lastInfoSync
                    ? this.formatTime(typeof machine.lastInfoSync === 'string' ? new Date(machine.lastInfoSync) : machine.lastInfoSync)
                    : 'Jamais'
            )
        );

        details.appendChild(infoRow);

        if (machine.uuid) {
            const uuidSection = this.createElement('div', 'mt-2 pt-2 border-t border-gray-200 dark:border-gray-800');
            const uuidBox = this.createElement('div', 'rounded-lg bg-gray-100 px-2 py-1.5 dark:bg-gray-900');
            uuidBox.append(
                this.createElement('div', 'text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5', 'UUID Firmware'),
                this.createElement('div', 'text-xs font-mono text-gray-800 break-all dark:text-gray-200', machine.uuid)
            );
            uuidSection.appendChild(uuidBox);
            details.appendChild(uuidSection);
        }

        return details;
    }

    buildTileFooter(machine) {
        const base = this.createElement('div', 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-800');

        if (machine.status === 'ready') {
            const actions = this.createElement('div', 'flex gap-2');
            const disconnectBtn = this.createFooterButton('Déconnecter', 'secondary', () => this.callbacks.onDisconnect?.(machine.id));
            disconnectBtn.classList.add('flex-1');
            const controlBtn = this.createFooterButton('Contrôler', 'primary');
            controlBtn.classList.add('flex-1');
            actions.append(disconnectBtn, controlBtn);
            base.appendChild(actions);
            return base;
        }

        if (machine.status === 'disconnected') {
            const action = machine.needsAuthorization
                ? () => this.callbacks.onAuthorize?.(machine.id)
                : () => this.callbacks.onConnect?.(machine.id);
            const connectBtn = this.createFooterButton(
                machine.needsAuthorization ? 'Autoriser le port' : 'Connecter',
                'primary',
                action
            );
            connectBtn.classList.add('w-full');
            base.appendChild(connectBtn);
            return base;
        }

        if (machine.status === 'connecting' || machine.status === 'retrieving') {
            const message = machine.status === 'connecting' ? 'Connexion en cours...' : 'Récupération des informations...';
            base.appendChild(this.createElement('div', 'w-full text-center text-xs py-1.5 text-gray-500 dark:text-gray-400', message));
            return base;
        }

        if (machine.status === 'error') {
            const action = machine.lastError === 'NotAllowedError'
                ? () => this.callbacks.onAuthorize?.(machine.id)
                : () => this.callbacks.onRetry?.(machine.id);
            const retryBtn = this.createFooterButton(
                machine.lastError === 'NotAllowedError' ? 'Autoriser le port' : 'Réessayer',
                'primary',
                action
            );
            retryBtn.classList.add('w-full');
            base.appendChild(retryBtn);
            return base;
        }

        return null;
    }

    createIconButton({ title, icon, className, onClick }) {
        const button = this.createElement('button', className);
        button.type = 'button';
        button.title = title;
        button.appendChild(icon);
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        return button;
    }

    createFooterButton(label, variant, onClick) {
        const variantClass = variant === 'secondary' ? 'btn-secondary' : 'btn-primary';
        const button = this.createElement('button', `${variantClass} text-xs py-1.5 rounded-lg`);
        button.type = 'button';
        button.textContent = label;
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        return button;
    }

    createIcon(paths, size) {
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('class', size);

        paths.forEach((d) => {
            const path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('stroke-linejoin', 'round');
            path.setAttribute('stroke-width', '2');
            svg.appendChild(path);
        });

        return svg;
    }

    createElement(tag, className, textContent) {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        if (typeof textContent === 'string') {
            element.textContent = textContent;
        }
        return element;
    }

    formatTime(date) {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return 'Jamais';
        }

        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);

        if (minutes < 1) return "À l'instant";
        if (minutes < 60) return `Il y a ${minutes}min`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Il y a ${hours}h`;

        return date.toLocaleDateString('fr-FR');
    }
}

if (typeof window !== 'undefined') {
    window.MachineTileView = MachineTileView;
}



// === views/machine-manager-view.js ===
const DEFAULT_IDS = {
    addMachineBtn: 'addMachineBtn',
    machineModal: 'machineModal',
    machineForm: 'machineForm',
    machineName: 'machineName',
    machineBaudRate: 'machineBaudRate',
    closeModal: 'closeModal',
    cancelModal: 'cancelBtn',
    baudrateDropdownBtn: 'baudrateDropdownBtn',
    baudrateDropdown: 'baudrateDropdown',
    consoleModal: 'consoleModal',
    closeConsoleModal: 'closeConsoleModal',
    sendConsoleBtn: 'sendConsoleBtn',
    consoleInput: 'consoleInput',
    consoleOutput: 'consoleOutput',
    machineInfoModal: 'machineInfoModal',
    closeMachineInfoModal: 'closeMachineInfoModal',
    refreshMachineInfo: 'refreshMachineInfo',
    machineInfoLastSync: 'machineInfoLastSync',
    machineInfoCommands: 'machineInfoCommands',
    machineInfoLoader: 'machineInfoLoader',
    machineInfoError: 'machineInfoError',
    machineInfoEmpty: 'machineInfoEmpty',
    machineInfoContent: 'machineInfoContent',
    machineInfoRefreshStatus: 'machineInfoRefreshStatus',
    machineInfoTitle: 'machineInfoTitle',
    serialSupportMessage: 'serialSupportMessage',
    deleteMachineModal: 'deleteMachineModal',
    closeDeleteMachineModal: 'closeDeleteMachineModal',
    cancelDeleteMachine: 'cancelDeleteMachine',
    confirmDeleteMachine: 'confirmDeleteMachine',
    deleteMachineName: 'deleteMachineName',
    machineBaudRateError: 'machineBaudRateError'
};

class MachineManagerView {
    constructor(customIds = {}) {
        this.ids = { ...DEFAULT_IDS, ...customIds };
        this.callbacks = {};
        this.documentClickHandler = this.handleDocumentClick.bind(this);
        this.boundModalKeydown = this.handleModalKeydown.bind(this);
        this.boundFocusIn = this.restrictFocusToModal.bind(this);
        this.activeModal = null;
        this.focusableElements = [];
        this.previouslyFocusedElement = null;
        this.cacheElements();
        this.bindEvents();
        this.updateSerialCapability();
    }

    cacheElements() {
        this.elements = {
            addMachineBtn: document.getElementById(this.ids.addMachineBtn),
            machineModal: document.getElementById(this.ids.machineModal),
            machineForm: document.getElementById(this.ids.machineForm),
            machineName: document.getElementById(this.ids.machineName),
            machineBaudRate: document.getElementById(this.ids.machineBaudRate),
            closeModal: document.getElementById(this.ids.closeModal),
            cancelModal: document.getElementById(this.ids.cancelModal),
            baudrateDropdownBtn: document.getElementById(this.ids.baudrateDropdownBtn),
            baudrateDropdown: document.getElementById(this.ids.baudrateDropdown),
            baudrateOptions: Array.from(document.querySelectorAll('.baudrate-option')),
            consoleModal: document.getElementById(this.ids.consoleModal),
            closeConsoleModal: document.getElementById(this.ids.closeConsoleModal),
            sendConsoleBtn: document.getElementById(this.ids.sendConsoleBtn),
            consoleInput: document.getElementById(this.ids.consoleInput),
            consoleOutput: document.getElementById(this.ids.consoleOutput),
            machineInfoModal: document.getElementById(this.ids.machineInfoModal),
            closeMachineInfoModal: document.getElementById(this.ids.closeMachineInfoModal),
            refreshMachineInfo: document.getElementById(this.ids.refreshMachineInfo),
            machineInfoLastSync: document.getElementById(this.ids.machineInfoLastSync),
            machineInfoCommands: document.getElementById(this.ids.machineInfoCommands),
            machineInfoLoader: document.getElementById(this.ids.machineInfoLoader),
            machineInfoError: document.getElementById(this.ids.machineInfoError),
            machineInfoEmpty: document.getElementById(this.ids.machineInfoEmpty),
            machineInfoContent: document.getElementById(this.ids.machineInfoContent),
            machineInfoRefreshStatus: document.getElementById(this.ids.machineInfoRefreshStatus),
            machineInfoTitle: document.getElementById(this.ids.machineInfoTitle),
            machineInfoCommandsInput: document.getElementById('machineInfoCommands'),
            serialSupportMessage: document.getElementById(this.ids.serialSupportMessage),
            deleteMachineModal: document.getElementById(this.ids.deleteMachineModal),
            closeDeleteMachineModal: document.getElementById(this.ids.closeDeleteMachineModal),
            cancelDeleteMachine: document.getElementById(this.ids.cancelDeleteMachine),
            confirmDeleteMachine: document.getElementById(this.ids.confirmDeleteMachine),
            deleteMachineName: document.getElementById(this.ids.deleteMachineName),
            machineBaudRateError: document.getElementById(this.ids.machineBaudRateError)
        };
    }

    setCallbacks(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    bindEvents() {
        const {
            addMachineBtn,
            machineModal,
            machineForm,
            closeModal,
            cancelModal,
            baudrateDropdownBtn,
            baudrateOptions,
            machineBaudRate,
            consoleModal,
            closeConsoleModal,
            sendConsoleBtn,
            consoleInput,
            machineInfoModal,
            closeMachineInfoModal,
            refreshMachineInfo
        } = this.elements;

        if (addMachineBtn) {
            addMachineBtn.addEventListener('click', () => {
                if (addMachineBtn.disabled) {
                    return;
                }
                this.callbacks.onRequestAddMachine?.();
            });
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeMachineModal());
        }

        if (cancelModal) {
            cancelModal.addEventListener('click', () => this.closeMachineModal());
        }

        if (machineModal) {
            machineModal.addEventListener('click', (event) => {
                if (event.target === machineModal) {
                    this.closeMachineModal();
                }
            });
        }

        if (machineForm) {
            machineForm.addEventListener('submit', (event) => {
                event.preventDefault();
                const data = this.getFormData();
                this.callbacks.onMachineFormSubmit?.(data);
            });
        }

        if (baudrateDropdownBtn) {
            baudrateDropdownBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                this.toggleBaudrateDropdown();
            });
        }

        if (Array.isArray(baudrateOptions)) {
            baudrateOptions.forEach((button) => {
                button.addEventListener('click', (event) => {
                    const value = event.currentTarget.getAttribute('data-baudrate');
                    this.setBaudrateValue(value);
                    this.validateBaudrateInput(value);
                    this.callbacks.onBaudratePresetSelected?.(value);
                    this.hideBaudrateDropdown();
                });
            });
        }

        document.addEventListener('click', this.documentClickHandler);

        if (machineBaudRate) {
            ['input', 'blur'].forEach((eventName) => {
                machineBaudRate.addEventListener(eventName, (event) => {
                    this.validateBaudrateInput(event.target.value);
                    this.callbacks.onBaudrateInput?.(event.target.value);
                });
            });
        }

        if (closeConsoleModal) {
            closeConsoleModal.addEventListener('click', () => this.closeConsoleModal());
        }

        if (consoleModal) {
            consoleModal.addEventListener('click', (event) => {
                if (event.target === consoleModal) {
                    this.closeConsoleModal();
                }
            });
        }

        if (sendConsoleBtn) {
            sendConsoleBtn.addEventListener('click', () => {
                const command = this.getConsoleInputValue();
                this.callbacks.onConsoleSend?.(command);
            });
        }

        if (consoleInput) {
            consoleInput.addEventListener('keydown', (event) => {
                if (event.ctrlKey && event.key === 'Enter') {
                    event.preventDefault();
                    const command = this.getConsoleInputValue();
                    this.callbacks.onConsoleSend?.(command);
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    this.callbacks.onConsoleNavigate?.('up');
                } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    this.callbacks.onConsoleNavigate?.('down');
                }
            });
        }

        if (closeMachineInfoModal) {
            closeMachineInfoModal.addEventListener('click', () => this.closeInfoModal());
        }

        if (machineInfoModal) {
            machineInfoModal.addEventListener('click', (event) => {
                if (event.target === machineInfoModal) {
                    this.closeInfoModal();
                }
            });
        }

        if (refreshMachineInfo) {
            refreshMachineInfo.addEventListener('click', () => {
                if (refreshMachineInfo.disabled) {
                    return;
                }
                this.callbacks.onInfoRefresh?.();
            });
        }

        if (this.elements.deleteMachineModal) {
            this.elements.deleteMachineModal.addEventListener('click', (event) => {
                if (event.target === this.elements.deleteMachineModal) {
                    this.closeDeleteModal();
                }
            });
        }

        if (this.elements.closeDeleteMachineModal) {
            this.elements.closeDeleteMachineModal.addEventListener('click', () => this.closeDeleteModal());
        }

        if (this.elements.cancelDeleteMachine) {
            this.elements.cancelDeleteMachine.addEventListener('click', () => this.handleDeleteCancelled());
        }

        if (this.elements.confirmDeleteMachine) {
            this.elements.confirmDeleteMachine.addEventListener('click', () => {
                this.callbacks.onDeleteConfirmed?.();
            });
        }
    }

    toggleBaudrateDropdown() {
        const dropdown = this.elements.baudrateDropdown;
        if (!dropdown) return;

        if (dropdown.classList.contains('hidden')) {
            dropdown.classList.remove('hidden');
            dropdown.classList.add('show');
        } else {
            this.hideBaudrateDropdown();
        }
    }

    hideBaudrateDropdown() {
        const dropdown = this.elements.baudrateDropdown;
        if (!dropdown) return;
        dropdown.classList.add('hidden');
        dropdown.classList.remove('show');
    }

    handleDocumentClick(event) {
        const { baudrateDropdown, baudrateDropdownBtn } = this.elements;
        if (!baudrateDropdown) return;

        const clickedInsideDropdown = baudrateDropdown.contains(event.target);
        const clickedButton = baudrateDropdownBtn?.contains(event.target);

        if (!clickedInsideDropdown && !clickedButton) {
            this.hideBaudrateDropdown();
        }
    }

    getFormData() {
        const name = this.elements.machineName?.value?.trim() || '';
        const baudRateValue = parseInt(this.elements.machineBaudRate?.value, 10);
        const commandsRaw = this.elements.machineInfoCommandsInput?.value || '';
        const infoCommands = commandsRaw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line, index, array) => line.length > 0 && array.indexOf(line) === index);
        return {
            name,
            baudRate: Number.isNaN(baudRateValue) ? null : baudRateValue,
            infoCommands
        };
    }

    showMachineModal({ name, baudRate, infoCommands } = {}) {
        const { machineModal, machineName } = this.elements;
        if (!machineModal) return;

        this.setMachineNameValue(name || '');
        this.setBaudrateValue(baudRate || '');
        this.validateBaudrateInput(this.elements.machineBaudRate?.value);
        if (this.elements.machineInfoCommandsInput) {
            const commandsValue = Array.isArray(infoCommands) && infoCommands.length
                ? infoCommands.join('\n')
                : '';
            this.elements.machineInfoCommandsInput.value = commandsValue;
        }
        this.openModal(machineModal, machineName);
    }

    closeMachineModal() {
        const { machineModal } = this.elements;
        if (!machineModal) return;
        this.closeModal(machineModal);
        this.callbacks.onMachineModalClosed?.();
    }

    focusMachineName() {
        const { machineName } = this.elements;
        if (machineName) {
            machineName.focus();
        }
    }

    setMachineNameValue(value) {
        if (this.elements.machineName) {
            this.elements.machineName.value = value;
        }
    }

    setBaudrateValue(value) {
        if (this.elements.machineBaudRate) {
            this.elements.machineBaudRate.value = value;
            this.clearBaudrateError();
        }
    }

    clearBaudrateError() {
        const { machineBaudRate, machineBaudRateError } = this.elements;
        if (machineBaudRateError) {
            machineBaudRateError.textContent = '';
            machineBaudRateError.classList.add('hidden');
        }
        if (machineBaudRate) {
            machineBaudRate.removeAttribute('aria-invalid');
            machineBaudRate.style.borderColor = '';
            machineBaudRate.style.backgroundColor = '';
        }
    }

    validateBaudrateInput(value) {
        const input = this.elements.machineBaudRate;
        const errorEl = this.elements.machineBaudRateError;
        if (!input) return;

        const numericValue = parseInt(value, 10);
        const isValid = !Number.isNaN(numericValue) && numericValue >= 1200 && numericValue <= 20000000;

        if (isValid) {
            input.removeAttribute('aria-invalid');
            input.style.borderColor = '';
            input.style.backgroundColor = '';
            if (errorEl) {
                errorEl.textContent = '';
                errorEl.classList.add('hidden');
            }
        } else {
            input.setAttribute('aria-invalid', 'true');
            input.style.borderColor = '#EF4444';
            input.style.backgroundColor = '#FEF2F2';
            if (errorEl) {
                errorEl.textContent = 'Entrez une valeur comprise entre 1200 et 20000000 baud.';
                errorEl.classList.remove('hidden');
            }
        }
    }

    showConsoleModal() {
        const { consoleModal, consoleInput } = this.elements;
        if (!consoleModal) return;

        this.resetConsoleOutput();
        this.openModal(consoleModal, consoleInput);
    }

    closeConsoleModal() {
        const { consoleModal } = this.elements;
        if (!consoleModal) return;
        this.closeModal(consoleModal);
        this.callbacks.onConsoleClosed?.();
    }

    resetConsoleOutput() {
        const { consoleOutput } = this.elements;
        if (!consoleOutput) return;
        consoleOutput.innerHTML = '<div class="text-gray-500 dark:text-gray-400">Console ouverte. En attente de données...</div>';
    }

    showInfoModal({ machineName, lastSyncLabel, commands } = {}) {
        const { machineInfoModal, refreshMachineInfo } = this.elements;
        if (!machineInfoModal) return;

        this.updateInfoMeta({ machineName, lastSyncLabel, commands });
        this.clearInfoModalError();
        this.hideInfoEmptyState();
        if (this.elements.machineInfoContent) {
            this.elements.machineInfoContent.innerHTML = '';
        }

        this.setInfoModalLoading(true);
        this.setInfoRefreshState(false);
        this.openModal(machineInfoModal, refreshMachineInfo);
    }

    closeInfoModal() {
        const { machineInfoModal } = this.elements;
        if (!machineInfoModal) return;
        this.setInfoRefreshState(false);
        this.closeModal(machineInfoModal);
        this.callbacks.onInfoModalClosed?.();
    }

    setInfoModalLoading(isLoading) {
        if (this.elements.machineInfoLoader) {
            this.elements.machineInfoLoader.classList.toggle('hidden', !isLoading);
        }
        if (this.elements.machineInfoContent) {
            this.elements.machineInfoContent.setAttribute('aria-busy', isLoading ? 'true' : 'false');
            if (isLoading) {
                this.elements.machineInfoContent.classList.add('opacity-50');
            } else {
                this.elements.machineInfoContent.classList.remove('opacity-50');
            }
        }
    }

    setInfoRefreshState(isRefreshing) {
        const { refreshMachineInfo, machineInfoRefreshStatus } = this.elements;
        if (refreshMachineInfo) {
            refreshMachineInfo.disabled = !!isRefreshing;
            refreshMachineInfo.classList.toggle('opacity-60', !!isRefreshing);
            refreshMachineInfo.classList.toggle('cursor-not-allowed', !!isRefreshing);
        }
        if (machineInfoRefreshStatus) {
            machineInfoRefreshStatus.classList.toggle('hidden', !isRefreshing);
        }
    }

    setInfoModalError(message) {
        if (!this.elements.machineInfoError) {
            return;
        }
        if (message) {
            this.elements.machineInfoError.textContent = message;
            this.elements.machineInfoError.classList.remove('hidden');
        } else {
            this.clearInfoModalError();
        }
    }

    clearInfoModalError() {
        if (!this.elements.machineInfoError) {
            return;
        }
        this.elements.machineInfoError.textContent = '';
        this.elements.machineInfoError.classList.add('hidden');
    }

    showInfoEmptyState() {
        if (this.elements.machineInfoEmpty) {
            this.elements.machineInfoEmpty.classList.remove('hidden');
        }
    }

    hideInfoEmptyState() {
        if (this.elements.machineInfoEmpty) {
            this.elements.machineInfoEmpty.classList.add('hidden');
        }
    }

    renderInfoModalContent(commandResults = []) {
        const { machineInfoContent } = this.elements;
        if (!machineInfoContent) return;

        machineInfoContent.innerHTML = '';

        if (!Array.isArray(commandResults) || commandResults.length === 0) {
            this.showInfoEmptyState();
            return;
        }

        this.hideInfoEmptyState();

        commandResults.forEach((result) => {
            const section = document.createElement('div');
            section.className = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/40 p-4 space-y-3';

            const header = document.createElement('div');
            header.className = 'flex flex-wrap items-center justify-between gap-2';

            const title = document.createElement('h4');
            title.className = 'text-sm font-semibold text-gray-900 dark:text-gray-100';
            title.textContent = result?.command || 'Commande';
            header.appendChild(title);

            if (result?.capturedAt) {
                const date = new Date(result.capturedAt);
                if (!Number.isNaN(date.getTime())) {
                    const dateEl = document.createElement('span');
                    dateEl.className = 'text-xs text-gray-500 dark:text-gray-400';
                    dateEl.textContent = date.toLocaleString('fr-FR');
                    header.appendChild(dateEl);
                }
            }

            section.appendChild(header);

            if (Array.isArray(result?.entries) && result.entries.length > 0) {
                const grid = document.createElement('div');
                grid.className = 'grid grid-cols-1 sm:grid-cols-2 gap-3';

                result.entries.forEach((entry) => {
                    const card = document.createElement('div');
                    card.className = 'rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3';

                    const label = document.createElement('div');
                    label.className = 'text-xs font-semibold text-gray-700 dark:text-gray-200';
                    label.textContent = entry?.label || 'Paramètre';
                    card.appendChild(label);

                    if (entry?.parameter?.name) {
                        const normalized = document.createElement('div');
                        normalized.className = 'text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500';
                        normalized.textContent = entry.parameter.name;
                        card.appendChild(normalized);
                    }

                    const valueContainer = document.createElement('div');
                    valueContainer.className = 'mt-1 max-h-40 overflow-auto rounded bg-gray-100/70 px-2 py-1 text-sm text-gray-900 dark:bg-gray-900/40 dark:text-gray-100';

                    const value = document.createElement('pre');
                    value.className = 'whitespace-pre-wrap break-words font-sans text-sm';
                    const hasValue = entry?.value !== undefined && entry.value !== null && String(entry.value).trim().length > 0;
                    value.textContent = hasValue ? String(entry.value) : '—';

                    valueContainer.appendChild(value);
                    card.appendChild(valueContainer);

                    grid.appendChild(card);
                });

                section.appendChild(grid);
            } else {
                const empty = document.createElement('p');
                empty.className = 'text-xs text-gray-500 dark:text-gray-400';
                empty.textContent = 'Aucune donnée détaillée pour cette commande.';
                section.appendChild(empty);
            }

            if (result?.rawOutput) {
                const details = document.createElement('details');
                details.className = 'rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-3 py-2 text-xs text-gray-600 dark:text-gray-300';

                const summary = document.createElement('summary');
                summary.className = 'cursor-pointer text-xs font-medium text-blue-600 dark:text-blue-400';
                summary.textContent = 'Voir la réponse brute';
                details.appendChild(summary);

                const pre = document.createElement('pre');
                pre.className = 'mt-2 whitespace-pre-wrap break-words text-[11px] text-gray-600 dark:text-gray-300';
                pre.textContent = result.rawOutput;
                details.appendChild(pre);

                section.appendChild(details);
            }

            machineInfoContent.appendChild(section);
        });
    }

    updateInfoMeta({ machineName, lastSyncLabel, commands } = {}) {
        if (this.elements.machineInfoTitle) {
            const baseTitle = 'Informations machine';
            this.elements.machineInfoTitle.textContent = machineName
                ? `${baseTitle} · ${machineName}`
                : baseTitle;
        }
        if (this.elements.machineInfoLastSync) {
            this.elements.machineInfoLastSync.textContent = lastSyncLabel || 'Jamais';
        }
        if (this.elements.machineInfoCommands) {
            if (Array.isArray(commands) && commands.length > 0) {
                this.elements.machineInfoCommands.textContent = commands.join(' · ');
            } else if (typeof commands === 'string' && commands.trim().length > 0) {
                this.elements.machineInfoCommands.textContent = commands.trim();
            } else {
                this.elements.machineInfoCommands.textContent = '—';
            }
        }
    }

    appendToConsole(text, colorClass = 'text-green-400') {
        const { consoleOutput } = this.elements;
        if (!consoleOutput) return;
        const line = document.createElement('div');
        line.className = colorClass;
        line.textContent = text;
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    getConsoleInputValue() {
        const value = this.elements.consoleInput?.value || '';
        return value.trim();
    }

    setConsoleInputValue(value) {
        if (this.elements.consoleInput) {
            this.elements.consoleInput.value = value;
        }
    }

    clearConsoleInput() {
        if (this.elements.consoleInput) {
            this.elements.consoleInput.value = '';
        }
    }

    focusConsoleInput() {
        if (this.elements.consoleInput) {
            this.elements.consoleInput.focus();
        }
    }

    showDeleteModal({ name } = {}) {
        const { deleteMachineModal } = this.elements;
        if (!deleteMachineModal) return;

        this.setDeleteMachineName(name || 'cette machine');
        this.openModal(deleteMachineModal, this.elements.confirmDeleteMachine);
    }

    closeDeleteModal() {
        const { deleteMachineModal } = this.elements;
        if (!deleteMachineModal) return;
        this.closeModal(deleteMachineModal);
    }

    handleDeleteCancelled() {
        this.closeDeleteModal();
        this.callbacks.onDeleteCancelled?.();
    }

    setDeleteMachineName(name) {
        if (this.elements.deleteMachineName) {
            this.elements.deleteMachineName.textContent = name;
        }
    }

    updateSerialCapability() {
        const { addMachineBtn, serialSupportMessage } = this.elements;
        const supported = typeof navigator !== 'undefined' && 'serial' in navigator;

        if (addMachineBtn) {
            addMachineBtn.disabled = !supported;
            if (supported) {
                addMachineBtn.removeAttribute('aria-disabled');
                addMachineBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                addMachineBtn.setAttribute('aria-disabled', 'true');
                addMachineBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }

        if (serialSupportMessage) {
            serialSupportMessage.classList.toggle('hidden', supported);
        }
    }

    openModal(modal, initialFocusElement) {
        if (!modal) return;

        this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('overflow-hidden');
        this.activeModal = modal;
        this.focusableElements = this.getFocusableElements(modal);

        const initialFocus = initialFocusElement && typeof initialFocusElement.focus === 'function'
            ? initialFocusElement
            : this.focusableElements[0];

        (initialFocus || modal).focus();

        modal.addEventListener('keydown', this.boundModalKeydown);
        document.addEventListener('focusin', this.boundFocusIn);
    }

    closeModal(modal) {
        if (!modal) return;

        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');

        if (this.activeModal === modal) {
            modal.removeEventListener('keydown', this.boundModalKeydown);
            document.removeEventListener('focusin', this.boundFocusIn);
            document.body.classList.remove('overflow-hidden');
            this.activeModal = null;
            this.focusableElements = [];

            if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
                this.previouslyFocusedElement.focus();
            }
            this.previouslyFocusedElement = null;
        }
    }

    handleModalKeydown(event) {
        if (!this.activeModal) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            if (this.activeModal === this.elements.machineModal) {
                this.closeMachineModal();
            } else if (this.activeModal === this.elements.consoleModal) {
                this.closeConsoleModal();
            } else if (this.activeModal === this.elements.machineInfoModal) {
                this.closeInfoModal();
            } else if (this.activeModal === this.elements.deleteMachineModal) {
                this.closeDeleteModal();
            }
            return;
        }

        if (event.key !== 'Tab' || this.focusableElements.length === 0) {
            return;
        }

        const first = this.focusableElements[0];
        const last = this.focusableElements[this.focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    restrictFocusToModal(event) {
        if (!this.activeModal || this.activeModal.contains(event.target)) {
            return;
        }

        const first = this.focusableElements[0];
        (first || this.activeModal).focus();
    }

    getFocusableElements(container) {
        if (!container) return [];
        return Array.from(
            container.querySelectorAll(
                'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((element) => element.offsetParent !== null);
    }
}

if (typeof window !== 'undefined') {
    window.MachineManagerView = MachineManagerView;
}



// === components/machine-manager.js ===
/**
 * Gestionnaire des machines CNC
 */
const DEFAULT_INFO_COMMANDS = ['M990'];

class MachineManager {
    constructor() {
        this.machines = new Map();
        this.ports = new Map();
        this.currentEditingMachine = null;
        this.currentConsoleMachine = null;
        this.readers = new Map(); // Pour stocker les readers Web Serial
        this.connectionMonitors = new Map(); // Pour stocker les monitors de connexion
        this.heartbeatIntervals = new Map(); // Pour stocker les intervalles de heartbeat
        this.commandHistory = []; // Historique des commandes
        this.historyIndex = -1; // Index actuel dans l'historique
        this.serialListeners = new Set();
        this.pendingDeletionMachine = null;
        this.infoCache = new Map();
        this.currentInfoMachine = null;
        this.infoRefreshInProgress = false;
        this.csrfHeaders = () => {
            const token = window.LineaCNC?.csrfToken;
            return token ? { 'X-CSRF-Token': token } : {};
        };
        if (typeof MachineTileView !== 'undefined') {
            this.tileView = new MachineTileView({
                containerId: 'machinesGrid',
                emptyStateId: 'noMachinesMessage'
            });
            this.tileView.setCallbacks({
                onEdit: (machineId) => this.showModal(machineId),
                onOpenConsole: (machineId) => this.showConsoleModal(machineId),
                onViewInfo: (machineId) => this.openInfoModal(machineId),
                onDelete: (machineId) => this.removeMachine(machineId),
                onDisconnect: (machineId) => this.disconnectMachine(machineId),
                onAuthorize: (machineId) => this.authorizeAndConnect(machineId),
                onConnect: (machineId) => this.connectExistingMachine(machineId),
                onRetry: (machineId) => this.connectExistingMachine(machineId)
            });
        } else {
            console.warn('MachineTileView non disponible - affichage des tuiles désactivé');
            this.tileView = null;
        }

        if (typeof MachineManagerView !== 'undefined') {
            this.managerView = new MachineManagerView();
            this.managerView.setCallbacks({
                onRequestAddMachine: () => this.addMachine(),
                onMachineFormSubmit: (data) => this.handleFormSubmit(data),
                onMachineModalClosed: () => this.resetEditingState(),
                onConsoleClosed: () => this.resetConsoleState(),
                onConsoleSend: (command) => this.handleConsoleSend(command),
                onConsoleNavigate: (direction) => this.navigateHistory(direction),
                onDeleteConfirmed: () => this.executePendingDeletion(),
                onDeleteCancelled: () => {
                    this.pendingDeletionMachine = null;
                },
                onInfoRefresh: () => this.refreshMachineInfo(),
                onInfoModalClosed: () => this.resetInfoState()
            });
        } else {
            console.warn('MachineManagerView non disponible - interactions limitées');
            this.managerView = null;
        }
        this.init();
    }

    normalizeInfoCommands(commands, { allowEmpty = false } = {}) {
        if (!Array.isArray(commands)) {
            return allowEmpty ? [] : [...DEFAULT_INFO_COMMANDS];
        }

        const normalized = commands
            .map((command) => (typeof command === 'string' ? command.trim().toUpperCase() : ''))
            .filter(Boolean);

        if (normalized.length === 0) {
            return allowEmpty ? [] : [...DEFAULT_INFO_COMMANDS];
        }

        return Array.from(new Set(normalized));
    }

    init() {
        this.updateDisplay();
        // Charger les machines sauvegardées depuis la BDD
        this.loadMachinesFromDB();
    }

    addSerialListener(listener) {
        if (typeof listener !== 'function') {
            return () => {};
        }
        this.serialListeners.add(listener);
        return () => this.serialListeners.delete(listener);
    }

    emitSerialData(machineId, data) {
        if (this.serialListeners.size === 0) {
            return;
        }

        const machine = this.machines.get(machineId) || null;
        this.serialListeners.forEach((listener) => {
            try {
                listener({ machineId, machine, data });
            } catch (error) {
                console.error('Erreur dans un listener série:', error);
            }
        });
    }

    resetEditingState() {
        this.currentEditingMachine = null;
    }

    resetConsoleState() {
        this.currentConsoleMachine = null;
        this.historyIndex = -1;
        this.managerView?.clearConsoleInput();
    }

    resetInfoState() {
        this.currentInfoMachine = null;
        this.infoRefreshInProgress = false;
        this.managerView?.setInfoRefreshState?.(false);
    }

    async handleFormSubmit({ name, baudRate, infoCommands }) {
        if (!this.currentEditingMachine || !this.machines.has(this.currentEditingMachine)) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }

        if (!name) {
            notificationManager.show('Le nom de la machine est requis', 'error');
            this.managerView?.focusMachineName();
            return;
        }

        const machine = this.machines.get(this.currentEditingMachine);
        const parsedBaudRate = Number.isInteger(baudRate) ? baudRate : parseInt(baudRate, 10);
        const sanitizedBaudRate = Number.isNaN(parsedBaudRate) ? machine?.baudRate : parsedBaudRate;

        const normalizedCommands = Array.isArray(infoCommands) && infoCommands.length > 0
            ? this.normalizeInfoCommands(infoCommands)
            : machine.infoCommands;

        await this.updateMachine(this.currentEditingMachine, name, sanitizedBaudRate, normalizedCommands);
        this.managerView?.closeMachineModal();
    }

    showModal(machineId) {
        if (!machineId || !this.machines.has(machineId)) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }

        this.currentEditingMachine = machineId;
        const machine = this.machines.get(machineId);
        this.managerView?.showMachineModal({
            name: machine.name,
            baudRate: machine.baudRate,
            infoCommands: machine.infoCommands
        });
    }

    showConsoleModal(machineId) {
        if (!machineId || !this.machines.has(machineId)) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }

        const machine = this.machines.get(machineId);

        if (!machine.isConnected) {
            notificationManager.show('La machine doit être connectée pour ouvrir la console', 'error');
            return;
        }

        this.currentConsoleMachine = machineId;
        this.historyIndex = -1;
        this.managerView?.showConsoleModal();

        // Démarrer la lecture des données seulement si pas déjà active
        if (!this.readers.has(machineId)) {
            this.startReadingSerial(machineId);
        }
    }

    openInfoModal(machineId) {
        if (!machineId || !this.machines.has(machineId)) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }

        const machine = this.machines.get(machineId);
        this.currentInfoMachine = machineId;

        const lastSyncLabel = machine.lastInfoSync
            ? new Date(machine.lastInfoSync).toLocaleString('fr-FR')
            : 'Jamais';

        this.managerView?.showInfoModal({
            machineName: machine.name,
            lastSyncLabel,
            commands: machine.infoCommands
        });

        this.managerView?.setInfoModalError?.(null);
        this.managerView?.setInfoRefreshState?.(false);

        this.fetchAndDisplayMachineInfo(machine).catch((error) => {
            console.error('Erreur affichage informations machine:', error);
        });
    }

    async hideConsoleModal() {
        this.managerView?.closeConsoleModal();
    }

    /**
     * Arrêter seulement la lecture de console sans affecter la connexion
     */
    async stopConsoleReading(machineId) {
        if (this.readers.has(machineId)) {
            const reader = this.readers.get(machineId);
            if (reader) {
                try {
                    await reader.cancel();
                    reader.releaseLock();
                } catch (error) {
                    console.error('Erreur lors de l\'arrêt de la lecture console:', error);
                }
            }
            this.readers.delete(machineId);
            // Ne pas arrêter le monitoring de connexion
            // Ne pas afficher de message de fermeture
        }
    }

    async handleConsoleSend(command) {
        const trimmedCommand = (command || '').trim();

        if (!trimmedCommand) {
            return;
        }

        if (!this.currentConsoleMachine) {
            notificationManager.show('Aucune machine sélectionnée', 'error');
            return;
        }

        const machine = this.machines.get(this.currentConsoleMachine);
        if (!machine || !machine.isConnected) {
            notificationManager.show('Machine non connectée', 'error');
            return;
        }

        try {
            this.addToHistory(trimmedCommand);
            const outbound = `> ${trimmedCommand}`;
            this.appendToConsole(outbound, 'text-blue-400');
            this.emitSerialData(this.currentConsoleMachine, outbound);

            const encoder = new TextEncoder();
            const writer = machine.port.writable.getWriter();
            await writer.write(encoder.encode(`${trimmedCommand}\n`));
            writer.releaseLock();

            this.managerView?.clearConsoleInput();
            this.historyIndex = -1;
            this.managerView?.focusConsoleInput();
        } catch (error) {
            console.error('Erreur lors de l\'envoi:', error);
            const errorMessage = `[Erreur] ${error.message}`;
            this.appendToConsole(errorMessage, 'text-red-400');
            this.emitSerialData(this.currentConsoleMachine, errorMessage);
            notificationManager.show('Erreur lors de l\'envoi de la commande', 'error');
        }
    }

    addToHistory(command) {
        // Éviter les doublons consécutifs
        if (this.commandHistory.length === 0 || this.commandHistory[this.commandHistory.length - 1] !== command) {
            this.commandHistory.push(command);
        }
        
        // Limiter l'historique à 100 commandes
        if (this.commandHistory.length > 100) {
            this.commandHistory.shift();
        }
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0 || !this.managerView) {
            return;
        }

        if (direction === 'up') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                const value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
                this.managerView.setConsoleInputValue(value);
            }
        } else if (direction === 'down') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                const value = this.commandHistory[this.commandHistory.length - 1 - this.historyIndex];
                this.managerView.setConsoleInputValue(value);
            } else if (this.historyIndex === 0) {
                this.historyIndex = -1;
                this.managerView.clearConsoleInput();
            }
        }
    }

    appendToConsole(text, colorClass = 'text-green-400') {
        this.managerView?.appendToConsole(text, colorClass);
    }

    async fetchAndDisplayMachineInfo(machine, { bypassCache = false } = {}) {
        if (!machine || !machine.uuid) {
            return;
        }

        const cacheKey = machine.id;

        if (!bypassCache && this.infoCache.has(cacheKey)) {
            const cached = this.infoCache.get(cacheKey);
            this.renderMachineInfo(machine, cached);
            this.managerView?.setInfoModalLoading(false);
            return;
        }

        this.managerView?.setInfoModalLoading(true);
        this.managerView?.setInfoModalError?.(null);

        try {
            const response = await fetch(`/api/machines/${machine.uuid}/info`, {
                headers: {
                    Accept: 'application/json',
                    ...this.csrfHeaders()
                }
            });

            if (response.status === 404) {
                const emptyPayload = {
                    machine: {
                        infoCommands: machine.infoCommands
                    },
                    syncedAt: null,
                    commandResults: []
                };
                this.infoCache.set(cacheKey, emptyPayload);
                this.renderMachineInfo(machine, emptyPayload);
                machine.lastInfoSync = null;
                this.updateDisplay();
                return;
            }

            if (!response.ok) {
                throw new Error('Réponse inattendue du serveur');
            }

            const data = await response.json();
            this.infoCache.set(cacheKey, data);
            this.renderMachineInfo(machine, data);

            const syncedAt = data?.syncedAt || data?.machine?.infoSyncedAt || null;
            if (syncedAt) {
                const date = new Date(syncedAt);
                if (!Number.isNaN(date.getTime())) {
                    machine.lastInfoSync = date;
                    this.updateDisplay();
                }
            }
        } catch (error) {
            console.error('Erreur récupération informations machine:', error);
            this.managerView?.setInfoModalError?.("Impossible de récupérer les informations de la machine.");
        } finally {
            this.managerView?.setInfoModalLoading(false);
        }
    }

    renderMachineInfo(machine, payload) {
        if (!machine) {
            return;
        }

        const commands = payload?.machine?.infoCommands || machine.infoCommands;
        const syncedAt = payload?.syncedAt || payload?.machine?.infoSyncedAt || machine.lastInfoSync || null;
        const lastSyncLabel = syncedAt
            ? new Date(syncedAt).toLocaleString('fr-FR')
            : 'Jamais';

        this.managerView?.updateInfoMeta({
            machineName: machine.name,
            lastSyncLabel,
            commands
        });

        this.managerView?.renderInfoModalContent(payload?.commandResults || []);
    }

    async refreshMachineInfo() {
        if (!this.currentInfoMachine || !this.machines.has(this.currentInfoMachine)) {
            return;
        }

        const machine = this.machines.get(this.currentInfoMachine);
        if (!machine) {
            return;
        }

        this.managerView?.setInfoRefreshState?.(true);
        this.managerView?.setInfoModalError?.(null);

        try {
            const { results } = await this.collectAndPersistMachineInfo(machine, { silent: false }) || {};

            if (!results || results.length === 0) {
                const emptyMessage = 'Aucune donnée renvoyée par la machine.';
                this.managerView?.setInfoModalError?.(emptyMessage);
                notificationManager.show(emptyMessage, 'warning');
                return;
            }

            notificationManager.show('Informations machine actualisées', 'success');
        } catch (error) {
            console.error('Erreur actualisation informations machine:', error);
            let message = error.message || 'Impossible d\'actualiser les informations.';
            let level = 'error';

            if (error.code === 'MACHINE_DISCONNECTED') {
                message = 'Connectez la machine pour actualiser les informations.';
                level = 'warning';
            } else if (error.code === 'INFO_SYNC_IN_PROGRESS') {
                message = 'Une synchronisation des informations est déjà en cours.';
                level = 'info';
            }

            this.managerView?.setInfoModalError?.(message);
            notificationManager.show(message, level);
        } finally {
            this.managerView?.setInfoRefreshState?.(false);
        }
    }

    async collectInfoFromMachine(machine, commandsOverride = null) {
        let sourceCommands;
        if (Array.isArray(commandsOverride)) {
            sourceCommands = commandsOverride;
        } else if (Array.isArray(machine.infoCommands) && machine.infoCommands.length > 0) {
            sourceCommands = machine.infoCommands;
        } else {
            sourceCommands = DEFAULT_INFO_COMMANDS;
        }

        if (!Array.isArray(sourceCommands) || sourceCommands.length === 0) {
            return [];
        }

        const commands = this.normalizeInfoCommands(sourceCommands, { allowEmpty: true });

        if (commands.length === 0) {
            return [];
        }

        const results = [];
        for (let i = 0; i < commands.length; i += 1) {
            const command = typeof commands[i] === 'string' ? commands[i].trim().toUpperCase() : '';
            if (!command) {
                continue;
            }

            const lines = await this.collectCommandResponse(machine.id, command, 7000);
            const parsed = this.parseInfoResponse(lines);
            results.push({
                command,
                rawOutput: parsed.rawOutput,
                entries: parsed.entries,
                capturedAt: new Date().toISOString()
            });
        }

        return results;
    }

    async collectCommandResponse(machineId, command, timeout = 7000) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.port) {
            throw new Error('Machine non connectée');
        }

        let detachListener = null;
        let timeoutId = null;
        const lines = [];

        const cleanup = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            if (typeof detachListener === 'function') {
                detachListener();
                detachListener = null;
            }
        };

        const responsePromise = new Promise((resolve, reject) => {
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error(`Timeout lors de l'exécution de ${command}`));
            }, timeout);

            detachListener = this.addSerialListener(({ machineId: incomingId, data }) => {
                if (incomingId !== machineId) {
                    return;
                }

                const text = typeof data === 'string' ? data.trim() : '';
                if (!text) {
                    return;
                }

                if (text.toUpperCase() === command.toUpperCase()) {
                    return;
                }

                if (text.toLowerCase() === 'ok') {
                    cleanup();
                    resolve(lines);
                    return;
                }

                lines.push(text);
            });
        });

        try {
            const writer = machine.port.writable.getWriter();
            try {
                const encoder = new TextEncoder();
                await writer.write(encoder.encode(`${command}\n`));
            } finally {
                writer.releaseLock();
            }

            const result = await responsePromise;
            return result;
        } catch (error) {
            cleanup();
            throw error;
        } finally {
            cleanup();
        }
    }

    parseInfoResponse(lines = []) {
        if (!Array.isArray(lines)) {
            return { entries: [], rawOutput: '' };
        }

        const entries = [];

        lines.forEach((originalLine, index) => {
            const line = typeof originalLine === 'string' ? originalLine.trim() : '';
            if (!line) {
                return;
            }

            if (line.toLowerCase() === 'ok') {
                return;
            }

            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) {
                entries.push({
                    label: line,
                    value: '',
                    position: index
                });
                return;
            }

            const label = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            entries.push({
                label: label || `Ligne ${index + 1}`,
                value,
                position: index
            });
        });

        return {
            entries,
            rawOutput: lines.join('\n')
        };
    }

    async syncMachineInformation(machine, initialInfo = null) {
        if (!machine || !machine.uuid) {
            return;
        }

        if (this.infoRefreshInProgress) {
            return;
        }

        this.infoRefreshInProgress = true;

        try {
            const results = [];
            const processed = new Set();

            if (initialInfo && Array.isArray(initialInfo.entries) && initialInfo.entries.length > 0) {
                const normalizedCommand = (initialInfo.command || 'M990').toUpperCase();
                processed.add(normalizedCommand);
                results.push({
                    command: normalizedCommand,
                    rawOutput: initialInfo.rawOutput || this.parseInfoResponse(initialInfo.entries.map((entry) => `${entry.label}: ${entry.value}`)).rawOutput,
                    entries: initialInfo.entries,
                    capturedAt: new Date().toISOString()
                });
            }

            const remainingCommands = Array.isArray(machine.infoCommands) && machine.infoCommands.length > 0
                ? this.normalizeInfoCommands(machine.infoCommands, { allowEmpty: true }).filter((command) => !processed.has(command))
                : [...DEFAULT_INFO_COMMANDS].filter((command) => !processed.has(command));

            if (remainingCommands.length > 0) {
                try {
                    const additionalResults = await this.collectInfoFromMachine(machine, remainingCommands);
                    additionalResults.forEach((result) => {
                        if (result?.command) {
                            processed.add(result.command);
                        }
                        results.push(result);
                    });
                } catch (error) {
                    console.warn('Erreur lors de la collecte automatique des informations:', error);
                }
            }

            if (results.length === 0) {
                return;
            }

            await this.persistAndUpdateInfo(machine, results, { silent: true });
        } finally {
            this.infoRefreshInProgress = false;
        }
    }

    async persistMachineInfo(machine, commandResults, { silent = false } = {}) {
        if (!machine || !machine.uuid || !Array.isArray(commandResults) || commandResults.length === 0) {
            return null;
        }

        try {
            const response = await fetch(`/api/machines/${machine.uuid}/info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.csrfHeaders()
                },
                body: JSON.stringify({
                    commandResults: commandResults.map((result, commandIndex) => ({
                        command: result.command,
                        rawOutput: result.rawOutput,
                        capturedAt: result.capturedAt || new Date().toISOString(),
                        entries: Array.isArray(result.entries)
                            ? result.entries.map((entry, entryIndex) => ({
                                label: entry?.label || '',
                                value: entry?.value ?? '',
                                position: typeof entry?.position === 'number' ? entry.position : entryIndex
                            }))
                            : []
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('Erreur serveur lors de l\'enregistrement des informations');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Erreur enregistrement informations machine:', error);
            if (!silent) {
                notificationManager.show('Erreur lors de l\'enregistrement des informations machine.', 'error');
            }
            if (!error.code) {
                error.code = 'MACHINE_INFO_PERSIST_FAILED';
            }
            throw error;
        }
    }

    async persistAndUpdateInfo(machine, commandResults, { silent = false } = {}) {
        if (!machine || !Array.isArray(commandResults) || commandResults.length === 0) {
            return null;
        }

        const response = await this.persistMachineInfo(machine, commandResults, { silent });

        if (response?.syncedAt) {
            const date = new Date(response.syncedAt);
            if (!Number.isNaN(date.getTime())) {
                machine.lastInfoSync = date;
                this.updateDisplay();
            }
        }

        this.infoCache.delete(machine.id);

        if (this.currentInfoMachine === machine.id) {
            await this.fetchAndDisplayMachineInfo(machine, { bypassCache: true });
        }

        return response;
    }

    async collectAndPersistMachineInfo(machine, { silent = false } = {}) {
        if (!machine || !machine.uuid) {
            return null;
        }

        if (!machine.isConnected || !machine.port) {
            const error = new Error('Machine non connectée');
            error.code = 'MACHINE_DISCONNECTED';
            throw error;
        }

        if (this.infoRefreshInProgress) {
            const error = new Error('Une synchronisation est déjà en cours.');
            error.code = 'INFO_SYNC_IN_PROGRESS';
            throw error;
        }

        this.infoRefreshInProgress = true;

        try {
            const results = await this.collectInfoFromMachine(machine);

            if (!Array.isArray(results) || results.length === 0) {
                return { results: [], response: null };
            }

            const response = await this.persistAndUpdateInfo(machine, results, { silent });

            return { results, response };
        } finally {
            this.infoRefreshInProgress = false;
        }
    }

    async startReadingSerial(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.port) return;

        try {
            // Vérifier si un reader existe déjà
            if (this.readers.has(machineId)) {
                console.log('Reader déjà actif pour cette machine');
                return;
            }

            const decoder = new TextDecoder();
            let buffer = '';

            // Créer le reader et le stocker
            const reader = machine.port.readable.getReader();
            this.readers.set(machineId, reader);

            // Démarrer le monitoring de connexion (seulement si pas déjà actif)
            if (!this.connectionMonitors.has(machineId)) {
                this.startConnectionMonitoring(machineId);
            }

            // Fonction pour lire les données
            const readLoop = async () => {
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        
                        if (done) {
                            console.log('Lecture terminée');
                            this.handleConnectionLost(machineId, 'Port fermé');
                            break;
                        }

                        // Décoder les données
                        buffer += decoder.decode(value, { stream: true });
                        
                        // Traiter ligne par ligne
                        const lines = buffer.split('\n');
                        buffer = lines.pop(); // Garder la dernière ligne incomplète
                        
                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (trimmed) {
                                machine.lastSeen = new Date();
                                this.emitSerialData(machineId, trimmed);
                                if (this.currentConsoleMachine === machineId) {
                                    this.appendToConsole(trimmed);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Erreur lors de la lecture:', error);
                    if (this.currentConsoleMachine === machineId) {
                        const errorMessage = `[Erreur lecture] ${error.message}`;
                        this.appendToConsole(errorMessage, 'text-red-400');
                        this.emitSerialData(machineId, errorMessage);
                    }
                    this.handleConnectionLost(machineId, error.message);
                } finally {
                    reader.releaseLock();
                    this.readers.delete(machineId);
                    // Ne pas arrêter le monitoring de connexion ici
                    // Il doit continuer même si la console est fermée
                }
            };

            // Démarrer la lecture
            readLoop();

        } catch (error) {
            console.error('Erreur lors du démarrage de la lecture:', error);
            if (this.currentConsoleMachine === machineId) {
            this.appendToConsole(`[Erreur] ${error.message}`, 'text-red-400');
            }
            // Nettoyer en cas d'erreur
            this.readers.delete(machineId);
            this.handleConnectionLost(machineId, error.message);
        }
    }

    async stopReadingSerial(machineId) {
        if (this.readers.has(machineId)) {
            const reader = this.readers.get(machineId);
            if (reader) {
                try {
                    await reader.cancel();
                    reader.releaseLock();
                } catch (error) {
                    console.error('Erreur lors de l\'arrêt de la lecture:', error);
                }
            }
            this.readers.delete(machineId);
            // Ne pas arrêter le monitoring de connexion ici
            // Ne pas fermer le port, seulement arrêter la lecture
            // Afficher le message seulement si la console est ouverte
            if (this.currentConsoleMachine === machineId) {
            this.appendToConsole('[Console fermée]', 'text-gray-500 dark:text-gray-400');
            }
        }
    }

    /**
     * Démarrer le monitoring de connexion pour une machine
     */
    startConnectionMonitoring(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        // Arrêter le monitoring existant s'il y en a un
        this.stopConnectionMonitoring(machineId);

        // Démarrer le heartbeat
        const heartbeatInterval = setInterval(async () => {
            await this.checkConnectionHealth(machineId);
        }, 5000); // Vérifier toutes les 5 secondes

        this.heartbeatIntervals.set(machineId, heartbeatInterval);

        // Démarrer le monitoring de port
        const monitorInterval = setInterval(async () => {
            await this.checkPortStatus(machineId);
        }, 2000); // Vérifier le port toutes les 2 secondes

        this.connectionMonitors.set(machineId, monitorInterval);

        console.log(`Monitoring de connexion démarré pour ${machine.name}`);
    }

    /**
     * Arrêter le monitoring de connexion pour une machine
     */
    stopConnectionMonitoring(machineId) {
        // Arrêter le heartbeat
        if (this.heartbeatIntervals.has(machineId)) {
            clearInterval(this.heartbeatIntervals.get(machineId));
            this.heartbeatIntervals.delete(machineId);
        }

        // Arrêter le monitoring de port
        if (this.connectionMonitors.has(machineId)) {
            clearInterval(this.connectionMonitors.get(machineId));
            this.connectionMonitors.delete(machineId);
        }

        console.log(`Monitoring de connexion arrêté pour ${machineId}`);
    }

    /**
     * Vérifier la santé de la connexion
     */
    async checkConnectionHealth(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.isConnected) return;

        try {
            // Vérifier si le port est toujours accessible
            if (!machine.port || !machine.port.readable) {
                this.handleConnectionLost(machineId, 'Port non accessible');
                return;
            }

            // Vérifier si on n'a pas reçu de données depuis trop longtemps
            const now = new Date();
            const timeSinceLastSeen = now - machine.lastSeen;
            const maxSilenceTime = 30000; // 30 secondes

            if (timeSinceLastSeen > maxSilenceTime) {
                console.log(`Aucune donnée reçue depuis ${Math.round(timeSinceLastSeen / 1000)}s pour ${machine.name}`);
                // Ne pas déconnecter automatiquement, juste logger
            }

        } catch (error) {
            console.error('Erreur lors de la vérification de la connexion:', error);
            this.handleConnectionLost(machineId, error.message);
        }
    }

    /**
     * Vérifier le statut du port série
     */
    async checkPortStatus(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.isConnected) return;

        try {
            // Tenter d'accéder au port pour vérifier s'il est toujours disponible
            if (machine.port) {
                // Vérifier si le port est toujours ouvert
                if (!machine.port.readable) {
                    this.handleConnectionLost(machineId, 'Port fermé inattendu');
                    return;
                }
            }
        } catch (error) {
            // Si on ne peut pas accéder au port, c'est qu'il a été déconnecté
            console.error('Port inaccessible:', error);
            this.handleConnectionLost(machineId, 'Port déconnecté physiquement');
        }
    }

    /**
     * Gérer la perte de connexion
     */
    async handleConnectionLost(machineId, reason) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        console.log(`Connexion perdue pour ${machine.name}: ${reason}`);

        // Arrêter tous les monitoring
        this.stopConnectionMonitoring(machineId);
        
        // Arrêter la lecture si active
        if (this.readers.has(machineId)) {
            await this.stopReadingSerial(machineId);
        }

        // Fermer proprement le port et nettoyer les références
        if (machine.port) {
            await this.safeClosePort(machine.port);
            machine.port = null;
            this.ports.delete(machineId);
        }

        // Mettre à jour le statut
        machine.status = 'disconnected';
        machine.isConnected = false;
        machine.lastSeen = new Date();

        // Mettre à jour l'affichage
        this.updateDisplay();

        // Afficher une notification
        notificationManager.show(`Machine ${machine.name} déconnectée (${reason})`, 'warning');

        // Mettre à jour la base de données
        if (machine.uuid) {
            await this.updatePortInDB(machine);
        }

        // Ajouter un message dans la console si elle est ouverte
        if (this.currentConsoleMachine === machineId) {
            this.appendToConsole(`[Déconnexion] ${reason}`, 'text-red-400');
        }
    }

    async addMachine() {
        let port = null;
        let machineId = null;
        try {
            if (!('serial' in navigator)) {
                notificationManager.show('Web Serial API non supportée par ce navigateur', 'error');
                return;
            }

            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 115200 });

            machineId = 'machine_' + Date.now();
            const machine = {
                id: machineId,
                name: `Machine ${this.machines.size + 1}`,
                port,
                status: 'connecting',
                lastSeen: new Date(),
                baudRate: 115200,
                isConnected: false,
                uuid: null,
                needsAuthorization: false,
                lastKnownPortDescriptor: null,
                legacyPortDescriptor: null,
                infoCommands: this.normalizeInfoCommands(DEFAULT_INFO_COMMANDS),
                lastInfoSync: null
            };

            this.machines.set(machineId, machine);
            this.ports.set(machineId, port);
            this.updateDisplay();

            const detectedInfo = await this.getUUIDFromPort(port, false);
            if (!detectedInfo) {
                throw new Error("Impossible de détecter l'UUID de la machine");
            }

            machine.uuid = detectedInfo.uuid;
            if (detectedInfo.machineName) {
                machine.name = detectedInfo.machineName;
            }

            this.rememberPortDescriptor(machine, port);

            await this.saveMachineToDB(machine);
            await this.finalizeReadyState(machine, port, `Machine ${machine.name} prête`, detectedInfo);
        } catch (error) {
            console.error("Erreur lors de l'ajout de la machine:", error);

            if (machineId && this.machines.has(machineId)) {
                this.machines.delete(machineId);
                this.ports.delete(machineId);
                this.updateDisplay();
            }

            await this.safeClosePort(port);

            let message = "Erreur: Impossible d'ajouter la machine";
            if (error?.message) {
                message = error.message;
            }
            if (error?.name === 'NotAllowedError') {
                message = 'Accès au port série refusé';
            } else if (error?.name === 'NotFoundError') {
                message = 'Aucun port série trouvé';
            }
            notificationManager.show(message, 'error');
        }
    }

    async sendCommandAndParseUUID(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine || !machine.port) return;

        try {
            // Envoyer la commande M990
            const encoder = new TextEncoder();
            const writer = machine.port.writable.getWriter();
            await writer.write(encoder.encode('M990\n'));
            writer.releaseLock();

            // Lire la réponse avec timeout
            const decoder = new TextDecoder();
            const reader = machine.port.readable.getReader();
            let buffer = '';
            let lines = [];
            let timeoutId;
            
            // Créer une promesse avec timeout
            const readPromise = new Promise(async (resolve, reject) => {
                timeoutId = setTimeout(() => {
                    reader.cancel();
                    reject(new Error('Timeout lors de la lecture de l\'UUID'));
                }, 5000); // 5 secondes timeout
                
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        
                        if (done) {
                            clearTimeout(timeoutId);
                            resolve(lines);
                            break;
                        }
                        
                        buffer += decoder.decode(value, { stream: true });
                        const tempLines = buffer.split('\n');
                        buffer = tempLines.pop() || '';
                        
                        lines.push(...tempLines);
                        
                        // Vérifier si on a reçu "ok"
                        if (lines.some(line => line.trim().toLowerCase() === 'ok')) {
                            clearTimeout(timeoutId);
                            resolve(lines);
                            break;
                        }
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });

            await readPromise;
            reader.releaseLock();

            // Parser l'UUID de la réponse
            // Format attendu: "Firmware Build UUID:\nbc140b75-8e0f-4f49-9723-268f574c5df3\nok"
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                // UUID Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(line)) {
                    machine.uuid = line;
                    console.log('UUID trouvé:', line);
                    
                    // Sauvegarder la machine en BDD
                    await this.saveMachineToDB(machine);
                    break;
                }
            }

        } catch (error) {
            console.error('Erreur lors de la récupération de l\'UUID:', error);
            // Ne pas bloquer l'ajout de la machine si l'UUID ne peut pas être récupéré
        }
    }

    async saveMachineToDB(machine) {
        const portName = machine.lastKnownPortDescriptor
            || (machine.port ? this.describePort(machine.port) : machine.port || null);

        try {
            const response = await fetch('/api/machines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.csrfHeaders()
                },
                body: JSON.stringify({
                    uuid: machine.uuid,
                    name: machine.name,
                    baudRate: machine.baudRate,
                    port: portName,
                    infoCommands: machine.infoCommands
                })
            });

            const payload = await response.json();

            if (!response.ok || payload.success !== true) {
                const error = new Error(payload?.error || 'Erreur lors de la sauvegarde de la machine.');
                error.code = 'MACHINE_SAVE_FAILED';
                throw error;
            }

            return payload;
        } catch (error) {
            console.error('Erreur sauvegarde machine en BDD:', error);
            throw error;
        }
    }

    async updatePortInDB(machine) {
        try {
            if (!machine.port && !machine.lastKnownPortDescriptor) {
                console.log('Port inconnu, pas de mise à jour BDD');
                return;
            }

            const portName = machine.lastKnownPortDescriptor
                || (machine.port ? this.describePort(machine.port) : 'unknown');

            const response = await fetch('/api/machines', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.csrfHeaders()
                },
                body: JSON.stringify({
                    uuid: machine.uuid,
                    name: machine.name,
                    baudRate: machine.baudRate,
                    port: portName,
                    infoCommands: machine.infoCommands
                })
            });

            const data = await response.json();
            if (data.success) {
                console.log('Port COM mis à jour en BDD:', portName);
            }
        } catch (error) {
            console.error('Erreur mise à jour port COM en BDD:', error);
        }
    }

    async loadMachinesFromDB() {
        try {
            // 1. Charger toutes les machines de la BDD
            const response = await fetch('/api/machines', {
                headers: {
                    ...this.csrfHeaders()
                }
            });
            const machines = await response.json();
            
            console.log('Machines chargées depuis la BDD:', machines);
            
            // 2. Récupérer les ports déjà autorisés
            let authorizedPorts = [];
            try {
                if ('serial' in navigator) {
                    authorizedPorts = await navigator.serial.getPorts();
                }
            } catch (error) {
                console.log('Aucun port autorisé trouvé:', error);
            }
            
            // 3. Créer les objets machine
            for (const dbMachine of machines) {
                // Générer un ID unique pour la machine (ou réutiliser si déjà existante)
                let machineId = null;
                
                // Chercher si cette machine existe déjà dans this.machines
                this.machines.forEach((machine, id) => {
                    if (machine.uuid === dbMachine.uuid) {
                        machineId = id;
                    }
                });
                
                // Si pas trouvée, créer un nouvel ID
                if (!machineId) {
                    machineId = 'machine_' + dbMachine.uuid.replace(/-/g, '_') + '_' + Date.now();
                }
                
                // Créer ou mettre à jour l'objet machine
                const baudRateValue = dbMachine.baudRate ?? dbMachine.baud_rate;
                const lastPort = dbMachine.lastPort ?? dbMachine.last_port ?? null;
                const infoCommandSource = Array.isArray(dbMachine.infoCommands)
                    ? dbMachine.infoCommands
                    : dbMachine.info_commands;
                const infoSyncedAt = dbMachine.infoSyncedAt ?? dbMachine.info_synced_at;
                const parsedBaudRate = Number.parseInt(baudRateValue, 10);
                const sanitizedBaudRate = Number.isNaN(parsedBaudRate) ? 115200 : parsedBaudRate;

                const updatedAt = dbMachine.updatedAt ?? dbMachine.updated_at;
                const createdAt = dbMachine.createdAt ?? dbMachine.created_at;

                const machine = {
                    id: machineId,
                    uuid: dbMachine.uuid,
                    name: dbMachine.name,
                    port: null,
                    status: 'disconnected',
                    lastSeen: updatedAt ? new Date(updatedAt) : createdAt ? new Date(createdAt) : new Date(),
                    baudRate: sanitizedBaudRate,
                    isConnected: false,
                    lastError: null,
                    needsAuthorization: false,
                    lastKnownPortDescriptor: lastPort,
                    legacyPortDescriptor: lastPort,
                    infoCommands: this.normalizeInfoCommands(infoCommandSource),
                    lastInfoSync: infoSyncedAt ? new Date(infoSyncedAt) : null
                };

                // Ajouter à la liste (remplace si existant)
                this.machines.set(machineId, machine);
            }
            
            // 4. Marquer les machines qui ont besoin d'autorisation
            const authorizedPortIds = new Set();
            for (const port of authorizedPorts) {
                const info = port.getInfo();
                const portId = `${info.usbVendorId}_${info.usbProductId}`;
                authorizedPortIds.add(portId);
            }
            
            // Identifier les machines non autorisées
            this.machines.forEach(machine => {
                // Pour l'instant, marquer toutes les machines comme ayant besoin d'autorisation
                // si aucun port n'est autorisé
                if (authorizedPorts.length === 0) {
                    machine.needsAuthorization = true;
                }
            });
            
            // 5. Afficher immédiatement toutes les machines
            this.updateDisplay();
            
            // 6. Tenter la connexion automatique pour les ports autorisés
            if (authorizedPorts.length > 0) {
                await this.autoConnectMachines(authorizedPorts);
            }
            
        } catch (error) {
            console.error('Erreur chargement machines depuis BDD:', error);
        }
    }

    /**
     * Connexion automatique des machines avec ports autorisés
     */
    async autoConnectMachines(authorizedPorts) {
        if (!Array.isArray(authorizedPorts) || authorizedPorts.length === 0) return;

        let readyCount = 0;

        for (const port of authorizedPorts) {
            let detectedInfo = null;
            try {
                await port.open({ baudRate: 115200 });
                detectedInfo = await this.getUUIDFromPort(port, true);
            } catch (error) {
                console.error('Erreur lors de la détection automatique:', error);
            } finally {
                await this.safeClosePort(port);
            }

            if (!detectedInfo) {
                continue;
            }

            const machine = this.findMachineByUUID(detectedInfo.uuid);
            if (!machine) {
                console.log(`UUID ${detectedInfo.uuid} inconnu - port ignoré`);
                continue;
            }

            try {
                await port.open({ baudRate: machine.baudRate });
                machine.status = 'connecting';
                machine.needsAuthorization = false;
                this.updateDisplay();
                if (detectedInfo.machineName && !machine.name) {
                    machine.name = detectedInfo.machineName;
                }
                const message = `Machine ${machine.name} prête automatiquement`;
                const success = await this.finalizeReadyState(machine, port, message, detectedInfo);
                if (success) {
                    readyCount += 1;
                }
            } catch (error) {
                await this.safeClosePort(port);
                console.error('Erreur connexion auto:', error);
            }
        }

        if (readyCount > 0) {
            notificationManager.show(`${readyCount} machine(s) prête(s) automatiquement`, 'success');
        }
    }

    /**
     * Obtenir l'UUID depuis un port série ouvert
     */
    async getUUIDFromPort(port, silent = true) {
        let reader = null;
        try {
            // Envoyer la commande M990
            const encoder = new TextEncoder();
            const writer = port.writable.getWriter();
            await writer.write(encoder.encode('M990\n'));
            writer.releaseLock();

            // Lire la réponse avec timeout
            const decoder = new TextDecoder();
            reader = port.readable.getReader();
            let buffer = '';
            let lines = [];
            let timeoutId;
            
            // Créer une promesse avec timeout
            const readPromise = new Promise(async (resolve, reject) => {
                timeoutId = setTimeout(() => {
                    reader.cancel();
                    reject(new Error('Timeout lors de la lecture de l\'UUID'));
                }, 5000); // 5 secondes timeout
                
                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        
                        if (done) {
                            clearTimeout(timeoutId);
                            resolve(lines);
                            break;
                        }
                        
                        buffer += decoder.decode(value, { stream: true });
                        const tempLines = buffer.split('\n');
                        buffer = tempLines.pop() || '';
                        
                        lines.push(...tempLines);
                        
                        // Vérifier si on a reçu "ok"
                        if (lines.some(line => line.trim().toLowerCase() === 'ok')) {
                            clearTimeout(timeoutId);
                            resolve(lines);
                            break;
                        }
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });

            await readPromise;

            const filteredLines = lines.filter((line) => line.trim().toLowerCase() !== 'ok');
            const parsed = this.parseInfoResponse(filteredLines);

            let uuid = null;
            let machineName = null;

            parsed.entries.forEach((entry) => {
                if (!entry || !entry.label) {
                    return;
                }
                const label = entry.label.toLowerCase();
                if (!uuid && label.startsWith('build uuid')) {
                    const uuidMatch = entry.value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
                    if (uuidMatch) {
                        uuid = uuidMatch[0];
                        if (!silent) {
                            console.log('UUID trouvé:', uuid);
                        }
                    }
                }

                if (!machineName && label.startsWith('machine name')) {
                    machineName = entry.value.trim();
                    if (!silent) {
                        console.log('Nom de machine trouvé:', machineName);
                    }
                }
            });

            if (uuid) {
                return {
                    uuid,
                    machineName: machineName || null,
                    entries: parsed.entries,
                    rawOutput: parsed.rawOutput,
                    command: 'M990'
                };
            }

            return null;
        } catch (error) {
            if (!silent) {
                console.error('Erreur lors de la récupération de l\'UUID:', error);
            }
            return null;
        } finally {
            // Toujours libérer le reader, même en cas d'erreur
            if (reader) {
                try {
                    reader.releaseLock();
                } catch (releaseError) {
                    // Ignorer les erreurs de libération (reader peut être déjà libéré ou annulé)
                }
            }
        }
    }

    /**
     * Trouver une machine par son UUID dans la liste actuelle
     */
    findMachineByUUID(uuid) {
        for (const [machineId, machine] of this.machines.entries()) {
            if (machine.uuid === uuid) {
                return machine;
            }
        }
        return null;
    }

    resolveMachineForUUID(machine, uuid) {
        if (!uuid) {
            return null;
        }

        const existing = this.findMachineByUUID(uuid);
        if (existing && existing.id !== machine.id) {
            return existing;
        }

        machine.uuid = uuid;
        return machine;
    }

    describePort(port) {
        if (!port || typeof port.getInfo !== 'function') {
            return 'unknown';
        }

        try {
            const info = port.getInfo();
            const vendor = typeof info.usbVendorId === 'number'
                ? info.usbVendorId.toString(16).padStart(4, '0')
                : null;
            const product = typeof info.usbProductId === 'number'
                ? info.usbProductId.toString(16).padStart(4, '0')
                : null;
            const serialNumber = port?.serialNumber ? String(port.serialNumber) : null;

            const segments = [];
            if (vendor) segments.push(`v${vendor}`);
            if (product) segments.push(`p${product}`);
            if (serialNumber) segments.push(`s${serialNumber}`);

            return segments.length ? segments.join(':') : 'unknown';
        } catch (error) {
            console.warn('Impossible de récupérer les informations du port:', error);
            return 'unknown';
        }
    }

    rememberPortDescriptor(machine, port) {
        if (!machine) {
            return 'unknown';
        }

        const descriptor = this.describePort(port);
        machine.lastKnownPortDescriptor = descriptor;
        machine.legacyPortDescriptor = descriptor;
        return descriptor;
    }

    getKnownPortDescriptors(machine) {
        const descriptors = [];
        if (machine?.lastKnownPortDescriptor) {
            descriptors.push(machine.lastKnownPortDescriptor);
        }
        if (machine?.legacyPortDescriptor && machine.legacyPortDescriptor !== machine?.lastKnownPortDescriptor) {
            descriptors.push(machine.legacyPortDescriptor);
        }
        return descriptors;
    }

    matchesPortDescriptor(port, descriptor) {
        if (!descriptor || descriptor === 'unknown') {
            return false;
        }

        const normalizedDescriptor = descriptor.toString().toLowerCase();
        const currentDescriptor = this.describePort(port).toLowerCase();

        if (currentDescriptor !== 'unknown' && currentDescriptor === normalizedDescriptor) {
            return true;
        }

        if (normalizedDescriptor.startsWith('com')) {
            const info = port.getInfo();
            const legacyName = info.usbProductId ? `com${info.usbProductId}`.toLowerCase() : 'unknown';
            return legacyName === normalizedDescriptor;
        }

        return false;
    }

    isPortInUse(port) {
        for (const trackedPort of this.ports.values()) {
            if (trackedPort === port) {
                return true;
            }
        }
        return false;
    }

    filterAvailablePorts(ports) {
        return ports.filter((port) => !this.isPortInUse(port));
    }

    prioritizePorts(machine, ports) {
        if (!Array.isArray(ports)) {
            return [];
        }

        const descriptors = this.getKnownPortDescriptors(machine);
        if (!descriptors.length) {
            return [...ports];
        }

        const matched = [];
        const others = [];

        ports.forEach((port) => {
            const isMatch = descriptors.some((descriptor) => this.matchesPortDescriptor(port, descriptor));
            if (isMatch) {
                matched.push(port);
            } else {
                others.push(port);
            }
        });

        return [...matched, ...others];
    }

    async listAuthorizedPorts() {
        if (!('serial' in navigator)) {
            return [];
        }

        try {
            return await navigator.serial.getPorts();
        } catch (error) {
            console.warn('Impossible de récupérer les ports autorisés:', error);
            return [];
        }
    }

    async connectUsingAuthorizedPorts(machine) {
        const ports = await this.listAuthorizedPorts();
        const hadPorts = ports.length > 0;
        const availablePorts = this.filterAvailablePorts(ports);
        const hadAvailablePorts = availablePorts.length > 0;
        const orderedPorts = this.prioritizePorts(machine, availablePorts);

        for (const port of orderedPorts) {
            const success = await this.connectMachineWithPort(machine, port);
            if (success) {
                return { connected: true, hadPorts, hadAvailablePorts };
            }
        }

        return { connected: false, hadPorts, hadAvailablePorts };
    }

    async finalizeReadyState(machine, port, notificationMessage, initialInfo = null) {
        if (!machine) return false;

        machine.port = port;
        machine.status = 'connected';
        this.updateDisplay();

        machine.status = 'retrieving';
        this.updateDisplay();

        machine.status = 'ready';
        machine.isConnected = true;
        machine.needsAuthorization = false;
        machine.lastSeen = new Date();
        this.ports.set(machine.id, port);

        this.rememberPortDescriptor(machine, port);

        this.startConnectionMonitoring(machine.id);
        this.startReadingSerial(machine.id);

        if (machine.uuid) {
            await this.updatePortInDB(machine);
        }

        this.updateDisplay();

        if (notificationMessage) {
            notificationManager.show(notificationMessage, 'success');
        }

        try {
            await this.syncMachineInformation(machine, initialInfo);
        } catch (error) {
            console.warn('Synchronisation des informations échouée:', error);
        }

        return true;
    }

    async safeClosePort(port) {
        if (!port) return;
        try {
            if (port.readable) {
                await port.close();
            }
        } catch (error) {
            console.warn('Fermeture du port ignorée:', error.message);
        }
    }

    handleConnectionError(machine, error) {
        if (!machine) {
            return;
        }

        machine.status = 'disconnected';
        machine.isConnected = false;
        machine.port = null;
        this.ports.delete(machine.id);
        this.updateDisplay();

        let message = error?.message || 'Erreur lors de la connexion';
        let level = 'error';
        if (error?.name === 'NotAllowedError') {
            message = 'Accès au port série refusé';
        } else if (error?.name === 'NotFoundError') {
            message = 'Aucun port série trouvé';
        } else if (message && message.toLowerCase().includes('uuid inconnu')) {
            level = 'warning';
        }

        if (message) {
            notificationManager.show(message, level);
        }
    }

    /**
     * Connecter une machine avec un port spécifique
     */
    async connectMachineWithPort(machine, port) {
        if (!machine || !port) {
            return false;
        }

        let openedHere = false;
        try {
            if (!port.readable) {
                await port.open({ baudRate: machine.baudRate });
                openedHere = true;
            }

            machine.status = 'connecting';
            machine.needsAuthorization = false;
            machine.port = port;
            this.ports.set(machine.id, port);
            this.updateDisplay();

            const detectedInfo = await this.getUUIDFromPort(port, true);
            if (!detectedInfo) {
                throw new Error("Impossible de détecter l'UUID de la machine");
            }

            const targetMachine = this.resolveMachineForUUID(machine, detectedInfo.uuid);
            if (!targetMachine) {
                throw new Error('UUID inconnu - machine non enregistrée');
            }

            if (targetMachine !== machine) {
                machine.status = 'disconnected';
                machine.port = null;
                this.updateDisplay();
            }

            if (detectedInfo.machineName && !targetMachine.name) {
                targetMachine.name = detectedInfo.machineName;
            }

            await this.finalizeReadyState(targetMachine, port, `Machine ${targetMachine.name} prête`, detectedInfo);
            return true;
        } catch (error) {
            await this.safeClosePort(port);
            if (openedHere && machine) {
                machine.port = null;
            }
            this.handleConnectionError(machine, error);
            return false;
        }
    }

    /**
     * Finaliser la connexion d'une machine
     */
    async finalizeMachineConnection(machine, port) {
        machine.port = port;
        machine.status = 'connected';
        machine.isConnected = true;
        machine.lastSeen = new Date();
        machine.needsAuthorization = false;
        
        this.ports.set(machine.id, port);
        
        // Démarrer monitoring et lecture
        this.startConnectionMonitoring(machine.id);
        this.startReadingSerial(machine.id);
        
        // Mettre à jour la BDD
        await this.updatePortInDB(machine);
        
        this.updateDisplay();
    }

    /**
     * Autoriser et connecter une machine
     */
    async authorizeAndConnect(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            notificationManager.show('Machine non trouvée', 'error');
            return;
        }
        
        try {
            const { connected } = await this.connectUsingAuthorizedPorts(machine);
            if (connected) {
                return;
            }

            const port = await navigator.serial.requestPort();
            await this.connectMachineWithPort(machine, port);

        } catch (error) {
            if (error.name === 'NotAllowedError') {
                notificationManager.show('Autorisation refusée', 'warning');
            } else {
                console.error('Erreur autorisation:', error);
                notificationManager.show('Erreur lors de l\'autorisation', 'error');
            }
        }
    }

    /**
     * Connecter une machine existante (pour machines avec ports autorisés)
     */
    async connectExistingMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            if (typeof notificationManager !== 'undefined') {
                notificationManager.show('Machine non trouvée', 'error');
            } else {
                console.error('Machine non trouvée');
            }
            return;
        }

        if (machine.isConnected || machine.status === 'ready' || machine.status === 'connected') {
            notificationManager.show('Machine déjà connectée', 'info');
            return;
        }

        if (machine.status === 'connecting' || machine.status === 'retrieving') {
            notificationManager.show('Connexion en cours...', 'info');
            return;
        }

        try {
            const { connected, hadPorts, hadAvailablePorts } = await this.connectUsingAuthorizedPorts(machine);

            if (connected) {
                return;
            }

            if (!hadPorts) {
                machine.needsAuthorization = true;
                this.updateDisplay();
                notificationManager.show('Aucun port autorisé disponible', 'warning');
                return;
            }

            if (!hadAvailablePorts) {
                notificationManager.show('Tous les ports autorisés sont déjà utilisés', 'warning');
                return;
            }

            notificationManager.show('Impossible de connecter la machine avec les ports autorisés', 'warning');
        } catch (error) {
            console.error('Erreur:', error);
            this.handleConnectionError(machine, error);
        }
    }

    async tryReconnectMachine(dbMachine) {
        try {
            if (!('serial' in navigator)) {
                return;
            }

            const machine = this.findMachineByUUID(dbMachine.uuid);
            if (!machine || machine.isConnected) {
                return;
            }

            const descriptor = dbMachine.port || dbMachine.last_port || null;
            if (descriptor && !machine.lastKnownPortDescriptor) {
                machine.lastKnownPortDescriptor = descriptor;
            }
            if (descriptor && !machine.legacyPortDescriptor) {
                machine.legacyPortDescriptor = descriptor;
            }

            const { connected } = await this.connectUsingAuthorizedPorts(machine);
            if (connected) {
                notificationManager.show(`Machine ${machine.name} reconnectée automatiquement`, 'success');
            }
        } catch (error) {
            console.error('Erreur reconnexion automatique:', error);
        }
    }

    async updateMachine(machineId, name, baudRate, infoCommands) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        const previousName = machine.name;
        const previousBaudRate = machine.baudRate;
        const previousCommands = Array.isArray(machine.infoCommands) ? [...machine.infoCommands] : [];

        machine.name = name;
        machine.baudRate = baudRate;

        const normalizedCommands = this.normalizeInfoCommands(infoCommands || machine.infoCommands);
        const commandsChanged = JSON.stringify(normalizedCommands) !== JSON.stringify(previousCommands);
        machine.infoCommands = normalizedCommands;
        if (commandsChanged) {
            this.infoCache.delete(machineId);
        }

        if (machine.isConnected && previousBaudRate !== baudRate) {
            try {
                if (this.readers.has(machineId)) {
                    await this.stopReadingSerial(machineId);
                }

                await machine.port.close();
                await new Promise((resolve) => setTimeout(resolve, 500));
                await machine.port.open({ baudRate });
            } catch (error) {
                console.error('Erreur lors de la mise à jour:', error);
                machine.status = 'error';
                machine.isConnected = false;
                notificationManager.show('Erreur lors de la mise à jour du port série.', 'error');
                this.updateDisplay();
                return;
            }
        }

        if (machine.uuid) {
            try {
                await this.saveMachineToDB(machine);
            } catch (error) {
                notificationManager.show('Impossible d\'enregistrer la machine.', 'error');
                machine.name = previousName;
                machine.baudRate = previousBaudRate;
                machine.infoCommands = previousCommands;
                this.updateDisplay();
                return;
            }
        }

        this.updateDisplay();
        notificationManager.show(`Machine ${name} mise à jour`, 'success');

        if (machine.isConnected && machine.port) {
            try {
                const syncResult = await this.collectAndPersistMachineInfo(machine, { silent: true });
                if (!syncResult || !Array.isArray(syncResult.results) || syncResult.results.length === 0) {
                    if (commandsChanged) {
                        notificationManager.show('Commandes enregistrées mais aucune donnée n\'a été renvoyée.', 'warning');
                    }
                }
            } catch (error) {
                console.error('Erreur lors de la synchronisation après mise à jour:', error);
                if (commandsChanged) {
                    if (error.code === 'INFO_SYNC_IN_PROGRESS') {
                        notificationManager.show('Une synchronisation des informations est déjà en cours.', 'info');
                    } else {
                        notificationManager.show('Les commandes sont enregistrées mais la récupération des informations a échoué.', 'warning');
                    }
                }
            }
        } else if (commandsChanged) {
            notificationManager.show('Commandes enregistrées. Connectez la machine pour synchroniser les informations.', 'info');
        }
    }

    async disconnectMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        try {
            // Arrêter le monitoring de connexion
            this.stopConnectionMonitoring(machineId);
            
            // Arrêter la lecture si un reader est actif
            if (this.readers.has(machineId)) {
                await this.stopReadingSerial(machineId);
            }

            // Fermer proprement le port et nettoyer les références
            if (machine.port) {
                try {
                    // Essayer de fermer le port proprement
                    if (machine.port.readable) {
            await machine.port.close();
                    }
                } catch (error) {
                    console.log('Port déjà fermé ou erreur lors de la fermeture:', error);
                }
                // Attendre un peu pour s'assurer que le port est libéré
                await new Promise(resolve => setTimeout(resolve, 200));
                // Réinitialiser la référence du port
                machine.port = null;
                this.ports.delete(machineId);
            }
            
            // Mettre à jour le port COM dans la BDD
            if (machine.uuid) {
                await this.updatePortInDB(machine);
            }
            
            machine.status = 'disconnected';
            machine.isConnected = false;
            this.updateDisplay();
            notificationManager.show(`Machine ${machine.name} déconnectée`, 'info');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            // En cas d'erreur, forcer la déconnexion
            this.stopConnectionMonitoring(machineId);
            // Réinitialiser la référence du port même en cas d'erreur
            if (machine.port) {
                machine.port = null;
            }
            machine.status = 'disconnected';
            machine.isConnected = false;
            this.updateDisplay();
            notificationManager.show(`Machine ${machine.name} déconnectée`, 'info');
        }
    }

    async reconnectMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) return;

        try {
            machine.status = 'connecting';
            this.updateDisplay();

            this.stopConnectionMonitoring(machineId);
            if (this.readers.has(machineId)) {
                await this.stopReadingSerial(machineId);
            }

            if (machine.port) {
                await this.safeClosePort(machine.port);
            }
            machine.port = null;
            this.ports.delete(machineId);

            if (!('serial' in navigator)) {
                notificationManager.show('Web Serial API non supportée par ce navigateur', 'error');
                machine.status = 'disconnected';
                this.updateDisplay();
                return;
            }

            const { connected, hadAvailablePorts } = await this.connectUsingAuthorizedPorts(machine);
            if (connected) {
                return;
            }

            if (!hadAvailablePorts) {
                notificationManager.show('Sélectionnez un port série pour reconnecter la machine', 'info');
            }

            const port = await navigator.serial.requestPort();
            await this.connectMachineWithPort(machine, port);
        } catch (error) {
            console.error('Erreur de reconnexion:', error);

            machine.status = 'disconnected';
            machine.isConnected = false;
            machine.port = null;
            this.ports.delete(machineId);
            this.updateDisplay();

            if (error.name === 'NotFoundError') {
                notificationManager.show('Aucun port série trouvé', 'error');
            } else if (error.name === 'NotAllowedError') {
                notificationManager.show('Accès au port série refusé', 'error');
            } else if (error.name === 'NetworkError') {
                notificationManager.show('Port déjà utilisé ou inaccessible', 'error');
            } else {
                notificationManager.show(`Erreur de reconnexion: ${error.message}`, 'error');
            }
        }
    }

    async removeMachine(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            console.warn(`Machine ${machineId} introuvable`);
            return;
        }

        if (this.managerView && typeof this.managerView.showDeleteModal === 'function') {
            this.pendingDeletionMachine = machineId;
            this.managerView.setDeleteMachineName(machine.name || 'cette machine');
            this.managerView.showDeleteModal({ name: machine.name || 'cette machine' });
            return;
        }

        const fallbackConfirm =
            (typeof window !== 'undefined' && typeof window.confirm === 'function' && window.confirm(`Êtes-vous sûr de vouloir supprimer la machine "${machine.name}" ?`)) ||
            (typeof confirm === 'function' && confirm(`Êtes-vous sûr de vouloir supprimer la machine "${machine.name}" ?`));

        if (fallbackConfirm) {
            await this.performMachineDeletion(machineId);
        }
    }

    async executePendingDeletion() {
        if (!this.pendingDeletionMachine || !this.machines.has(this.pendingDeletionMachine)) {
            this.pendingDeletionMachine = null;
            this.managerView?.closeDeleteModal();
            notificationManager.show('Machine introuvable', 'error');
            return;
        }

        const machineId = this.pendingDeletionMachine;
        this.pendingDeletionMachine = null;
        await this.performMachineDeletion(machineId);
    }

    async performMachineDeletion(machineId) {
        const machine = this.machines.get(machineId);
        if (!machine) {
            notificationManager.show('Machine introuvable', 'error');
            this.managerView?.closeDeleteModal();
            return;
        }

        this.managerView?.closeDeleteModal();

        try {
            if (machine.uuid) {
                const response = await fetch(`/api/machines/${machine.uuid}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.csrfHeaders()
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Erreur lors de la suppression en base de données');
                }
            }

            await this.teardownMachine(machineId, machine);
            notificationManager.show(`Machine ${machine.name} supprimée`, 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression:', error);

            if (error.message.includes('Machine non trouvée') || error.message.includes('404')) {
                await this.teardownMachine(machineId, machine);
                notificationManager.show(`Machine ${machine.name} supprimée (localement)`, 'success');
                return;
            }

            notificationManager.show(`Erreur lors de la suppression: ${error.message}`, 'error');
        }
    }

    async teardownMachine(machineId, machine = null) {
        const targetMachine = machine || this.machines.get(machineId);

        this.stopConnectionMonitoring(machineId);

        if (this.readers.has(machineId)) {
            await this.stopReadingSerial(machineId);
        }

        if (targetMachine && targetMachine.isConnected && targetMachine.port) {
            try {
                await targetMachine.port.close();
            } catch (error) {
                console.warn('Port déjà fermé ou en cours de fermeture:', error.message);
            }
        }

        this.machines.delete(machineId);
        this.ports.delete(machineId);
        this.readers.delete(machineId);
        this.infoCache.delete(machineId);
        if (this.currentInfoMachine === machineId) {
            this.resetInfoState();
        }

        this.updateDisplay();
    }

    updateDisplay() {
        if (!this.tileView) {
            return;
        }
        this.tileView.render(this.machines);
    }

}


// === pages/dashboard.js ===
/**
 * Page Dashboard - Logique principale
 */
class DashboardPage {
    constructor() {
        this.machineManager = null;
        this.init();
    }

    init() {
        // Attendre que le DOM soit chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.initializeMachineManager();
        this.setupEventListeners();
    }

    initializeMachineManager() {
        // Vérifier si les éléments nécessaires existent
        const machinesGrid = document.getElementById('machinesGrid');
        const addMachineBtn = document.getElementById('addMachineBtn');
        
        if (machinesGrid || addMachineBtn) {
            this.machineManager = new MachineManager();
            // Exposer globalement pour les attributs onclick dans le HTML
            window.machineManager = this.machineManager;
        }
    }

    setupEventListeners() {
        // Événements spécifiques à la page dashboard
        this.setupKeyboardShortcuts();
        this.setupPageVisibility();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + N : Ajouter une machine
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                if (this.machineManager) {
                    this.machineManager.addMachine();
                }
            }
            
            // Échap : Fermer les modals
            if (e.key === 'Escape') {
                const modal = document.getElementById('machineModal');
                const consoleModal = document.getElementById('consoleModal');
                
                if (modal && !modal.classList.contains('hidden')) {
                    this.machineManager?.hideModal();
                } else if (consoleModal && !consoleModal.classList.contains('hidden')) {
                    this.machineManager?.hideConsoleModal();
                }
            }
        });
    }

    setupPageVisibility() {
        // Gérer la visibilité de la page pour optimiser les performances
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page cachée - réduire l'activité
                this.pauseMachineUpdates();
            } else {
                // Page visible - reprendre l'activité
                this.resumeMachineUpdates();
            }
        });
    }

    pauseMachineUpdates() {
        // Pause les mises à jour des machines quand la page n'est pas visible
        if (this.machineManager) {
            // Logique de pause si nécessaire
            console.log('Dashboard paused - page not visible');
        }
    }

    resumeMachineUpdates() {
        // Reprend les mises à jour des machines
        if (this.machineManager) {
            // Logique de reprise si nécessaire
            console.log('Dashboard resumed - page visible');
        }
    }

    // Méthodes utilitaires pour la page
    refreshMachines() {
        if (this.machineManager) {
            this.machineManager.updateDisplay();
        }
    }

    getMachineCount() {
        return this.machineManager ? this.machineManager.machines.size : 0;
    }

    getConnectedMachineCount() {
        if (!this.machineManager) return 0;
        
        let count = 0;
        this.machineManager.machines.forEach(machine => {
            if (machine.status === 'connected') count++;
        });
        return count;
    }
}

// Initialiser la page dashboard
const dashboardPage = new DashboardPage();


// === main.js ===
/**
 * Fichier principal - Point d'entrée de l'application
 */

// Charger la configuration
// La configuration est définie dans config.js

// Initialisation CSRF
window.LineaCNC = window.LineaCNC || {};
const csrfMetaTag = document.querySelector('meta[name="csrf-token"]');
if (csrfMetaTag) {
    window.LineaCNC.csrfToken = csrfMetaTag.getAttribute('content');
}

// Utilitaires globaux
window.LineaCNC.utils = {
    /**
     * Debounce une fonction
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle une fonction
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Formater une date
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Intl.DateTimeFormat('fr-FR', { ...defaultOptions, ...options }).format(new Date(date));
    },

    /**
     * Formater une durée
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}j ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}min`;
        if (minutes > 0) return `${minutes}min ${seconds % 60}s`;
        return `${seconds}s`;
    },

    /**
     * Copier du texte dans le presse-papiers
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            notificationManager.show('Copié dans le presse-papiers', 'success');
            return true;
        } catch (err) {
            console.error('Erreur lors de la copie:', err);
            notificationManager.show('Erreur lors de la copie', 'error');
            return false;
        }
    },

    /**
     * Valider un email
     */
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Générer un ID unique
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
};

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur JavaScript:', event.error);
    if (window.LineaCNC?.debug) {
        notificationManager.show(`Erreur: ${event.error.message}`, 'error');
    }
});

// Gestion des promesses rejetées
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesse rejetée:', event.reason);
    if (window.LineaCNC?.debug) {
        notificationManager.show(`Erreur: ${event.reason}`, 'error');
    }
});

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    console.log('LineaCNC v' + window.LineaCNC.version + ' initialisé');
    
    // Initialiser les composants globaux
    if (typeof notificationManager !== 'undefined') {
        console.log('NotificationManager initialisé');
    }
    
    if (typeof dropdownManager !== 'undefined') {
        console.log('DropdownManager initialisé');
    }
    
    // Détecter la page actuelle et initialiser les composants spécifiques
    const body = document.body;
    const pageClass = body.getAttribute('data-page');
    
    if (pageClass) {
        console.log('Page détectée:', pageClass);
    }
});

// Exports pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        LineaCNC: window.LineaCNC,
        notificationManager: window.notificationManager,
        dropdownManager: window.dropdownManager
    };
}
