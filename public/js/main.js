// JavaScript principal pour l'application LineaCNC
document.addEventListener('DOMContentLoaded', function() {
    // Gestion des messages flash (auto-hide après 5 secondes)
    const alerts = document.querySelectorAll('.alert-success, .alert-error');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                alert.remove();
            }, 300);
        }, 5000);
    });

    // Gestion des dropdowns
    const dropdownButtons = document.querySelectorAll('[data-dropdown-toggle]');
    dropdownButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById(this.getAttribute('data-dropdown-toggle'));
            if (dropdown) {
                dropdown.classList.toggle('hidden');
            }
        });
    });

    // Fermer les dropdowns en cliquant ailleurs
    document.addEventListener('click', function(e) {
        const dropdowns = document.querySelectorAll('[data-dropdown]');
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
    });

    // Validation des formulaires
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitButton = this.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Traitement...';
                
                // Réactiver le bouton après 3 secondes au cas où
                setTimeout(() => {
                    submitButton.disabled = false;
                    submitButton.textContent = submitButton.getAttribute('data-original-text') || 'Envoyer';
                }, 3000);
            }
        });
    });

    // Sauvegarder le texte original des boutons
    const submitButtons = document.querySelectorAll('button[type="submit"]');
    submitButtons.forEach(button => {
        button.setAttribute('data-original-text', button.textContent);
    });

    // Animation des cartes au scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});

