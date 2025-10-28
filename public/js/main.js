/**
 * Fichier principal - Point d'entrée de l'application
 */

// Charger la configuration
// La configuration est définie dans config.js

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