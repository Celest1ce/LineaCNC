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
