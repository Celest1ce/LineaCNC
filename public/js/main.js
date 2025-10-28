// Script principal pour LineaCNC
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 LineaCNC - Script principal chargé');

    // Gestion du menu déroulant des paramètres
    const settingsButton = document.getElementById('settings-menu-button');
    const settingsDropdown = document.getElementById('settingsDropdown');

    if (settingsButton && settingsDropdown) {
        settingsButton.addEventListener('click', function(e) {
            e.preventDefault();
            settingsDropdown.classList.toggle('hidden');
        });

        // Fermer le menu si on clique ailleurs
        document.addEventListener('click', function(e) {
            if (!settingsButton.contains(e.target) && !settingsDropdown.contains(e.target)) {
                settingsDropdown.classList.add('hidden');
            }
        });
    }

    // Gestion du menu mobile
    const mobileMenuButton = document.querySelector('[aria-controls="mobile-menu"]');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Auto-masquer les messages d'alerte après 5 secondes
    const alerts = document.querySelectorAll('[role="alert"]');
    alerts.forEach(function(alert) {
        setTimeout(function() {
            alert.style.opacity = '0';
            setTimeout(function() {
                alert.remove();
            }, 300);
        }, 5000);
    });

    // Animation des cartes au survol
    const cards = document.querySelectorAll('.bg-blue-50, .bg-purple-50, .bg-green-50');
    cards.forEach(function(card) {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'transform 0.2s ease-in-out';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Confirmation pour les actions de suppression
    const deleteButtons = document.querySelectorAll('button[onclick*="delete"]');
    deleteButtons.forEach(function(button) {
        button.addEventListener('click', function(e) {
            if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
                e.preventDefault();
            }
        });
    });

    // Fonction pour éditer un utilisateur (placeholder)
    window.editUser = function(userId) {
        console.log('Édition de l\'utilisateur:', userId);
        // TODO: Implémenter la logique d'édition
        alert('Fonctionnalité d\'édition en cours de développement');
    };

    // Fonction pour changer le mot de passe (placeholder)
    window.changePassword = function(userId) {
        console.log('Changement de mot de passe pour l\'utilisateur:', userId);
        const newPassword = prompt('Nouveau mot de passe:');
        if (newPassword && newPassword.length >= 6) {
            // TODO: Implémenter la logique de changement de mot de passe
            alert('Mot de passe changé avec succès');
        } else if (newPassword) {
            alert('Le mot de passe doit contenir au moins 6 caractères');
        }
    };

    // Fonction pour supprimer un utilisateur (placeholder)
    window.deleteUser = function(userId) {
        console.log('Suppression de l\'utilisateur:', userId);
        if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
            // TODO: Implémenter la logique de suppression
            alert('Utilisateur supprimé avec succès');
        }
    };

    console.log('✅ LineaCNC - Script principal initialisé');
});