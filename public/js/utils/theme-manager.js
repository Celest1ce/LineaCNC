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

