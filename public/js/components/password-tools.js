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
