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
