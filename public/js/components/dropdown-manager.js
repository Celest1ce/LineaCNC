/**
 * Gestionnaire des dropdowns
 */
class DropdownManager {
    constructor() {
        this.activeDropdown = null;
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Gestion du dropdown des outils
        const toolsButton = document.getElementById('toolsButton');
        const toolsDropdown = document.getElementById('toolsDropdown');

        if (toolsButton && toolsDropdown) {
            toolsButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(toolsDropdown);
            });
        }

        // Gestion du dropdown des paramètres
        const settingsButton = document.getElementById('settingsButton');
        const settingsDropdown = document.getElementById('settingsDropdown');

        if (settingsButton && settingsDropdown) {
            settingsButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(settingsDropdown);
            });
        }

        // Fermer les dropdowns en cliquant à l'extérieur
        document.addEventListener('click', (e) => {
            if (this.activeDropdown && !this.activeDropdown.contains(e.target)) {
                this.closeDropdown(this.activeDropdown);
            }
        });

        // Gestion des touches clavier
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeDropdown) {
                this.closeDropdown(this.activeDropdown);
            }
        });
    }

    toggleDropdown(dropdown) {
        if (this.activeDropdown === dropdown) {
            this.closeDropdown(dropdown);
        } else {
            this.closeAllDropdowns();
            this.openDropdown(dropdown);
        }
    }

    openDropdown(dropdown) {
        dropdown.classList.remove('hidden');
        this.activeDropdown = dropdown;
        
        // Animation d'ouverture
        dropdown.style.opacity = '0';
        dropdown.style.transform = 'translateY(-10px)';
        
        requestAnimationFrame(() => {
            dropdown.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0)';
        });
    }

    closeDropdown(dropdown) {
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
}

// Instance globale
const dropdownManager = new DropdownManager();
