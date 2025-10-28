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
