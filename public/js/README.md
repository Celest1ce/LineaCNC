# 📁 Architecture JavaScript - LineaCNC

Ce dossier contient toute la logique JavaScript de l'application, séparée des templates EJS pour une meilleure organisation et maintenabilité.

## 🗂️ Structure des dossiers

```
public/js/
├── components/          # Composants réutilisables
│   ├── dropdown-manager.js    # Gestion des dropdowns
│   └── machine-manager.js     # Gestion des machines CNC
├── pages/              # Logique spécifique aux pages
│   └── dashboard.js           # Page dashboard
├── utils/              # Utilitaires et helpers
│   └── notification.js        # Système de notifications
└── main.js             # Point d'entrée principal
```

## 🎯 Principes d'architecture

### **Séparation des responsabilités**
- **Templates EJS** : Structure HTML uniquement
- **JavaScript** : Logique métier et interactions
- **CSS** : Styles et apparence

### **Modularité**
- Chaque composant a une responsabilité unique
- Réutilisabilité maximale
- Dépendances claires et minimales

### **Maintenabilité**
- Code organisé et documenté
- Conventions de nommage cohérentes
- Tests et débogage facilités

## 📋 Composants

### **NotificationManager** (`utils/notification.js`)
Gestionnaire centralisé des notifications utilisateur.

```javascript
// Utilisation
notificationManager.show('Message de succès', 'success');
notificationManager.show('Erreur critique', 'error');
notificationManager.show('Information', 'info');
```

**Fonctionnalités :**
- Types : success, error, warning, info
- Animations d'entrée/sortie
- Fermeture automatique ou manuelle
- Positionnement intelligent

### **DropdownManager** (`components/dropdown-manager.js`)
Gestionnaire des menus déroulants et modals.

```javascript
// Utilisation automatique
// Détecte et gère tous les dropdowns avec l'ID se terminant par "Dropdown"
```

**Fonctionnalités :**
- Fermeture automatique (clic extérieur, Échap)
- Animations fluides
- Gestion des états actifs
- Support clavier

### **MachineManager** (`components/machine-manager.js`)
Gestionnaire des machines CNC et Web Serial API.

```javascript
// Utilisation
const machineManager = new MachineManager();
machineManager.addMachine();
machineManager.disconnectMachine(machineId);
```

**Fonctionnalités :**
- Connexion/déconnexion Web Serial
- Gestion des paramètres (nom, baud rate)
- Interface utilisateur dynamique
- Persistance des données

### **DashboardPage** (`pages/dashboard.js`)
Logique spécifique à la page dashboard.

```javascript
// Initialisation automatique
// Gère les raccourcis clavier et la visibilité de page
```

**Fonctionnalités :**
- Raccourcis clavier (Ctrl+N, Échap)
- Gestion de la visibilité de page
- Optimisation des performances
- API publique pour les autres composants

## 🔧 Configuration

### **Variables globales**
```javascript
window.LineaCNC = {
    version: '1.0.0',
    debug: false,
    config: {
        api: { baseUrl: '/api', timeout: 10000 },
        ui: { animationDuration: 300, notificationDuration: 3000 }
    }
};
```

### **Utilitaires globaux**
```javascript
// Disponibles via window.LineaCNC.utils
LineaCNC.utils.debounce(func, wait);
LineaCNC.utils.formatDate(date, options);
LineaCNC.utils.copyToClipboard(text);
LineaCNC.utils.isValidEmail(email);
```

## 📱 Responsive et Accessibilité

### **Responsive Design**
- Tous les composants s'adaptent aux différentes tailles d'écran
- Gestion des événements tactiles
- Optimisation mobile

### **Accessibilité**
- Support clavier complet
- ARIA labels appropriés
- Contraste et lisibilité
- Navigation au clavier

## 🚀 Performance

### **Optimisations**
- Chargement asynchrone des composants
- Debouncing des événements fréquents
- Gestion de la visibilité de page
- Nettoyage automatique des ressources

### **Monitoring**
- Gestion des erreurs globales
- Logging en mode debug
- Métriques de performance

## 🧪 Développement

### **Conventions de code**
```javascript
// Classes : PascalCase
class MachineManager {}

// Méthodes : camelCase
addMachine() {}

// Variables : camelCase
const machineId = 'machine_123';

// Constantes : UPPER_CASE
const MAX_MACHINES = 10;
```

### **Documentation**
- JSDoc pour toutes les méthodes publiques
- Commentaires explicatifs pour la logique complexe
- Exemples d'utilisation

### **Tests**
- Tests unitaires pour chaque composant
- Tests d'intégration pour les interactions
- Tests de performance

## 🔄 Intégration avec EJS

### **Dans les templates**
```ejs
<!-- Chargement des scripts -->
<script src="/js/utils/notification.js"></script>
<script src="/js/components/machine-manager.js"></script>
<script src="/js/pages/dashboard.js"></script>
```

### **Passage de données**
```ejs
<!-- Variables EJS vers JavaScript -->
<script>
    const userData = <%- JSON.stringify(user) %>;
    const config = <%- JSON.stringify(config) %>;
</script>
```

## 📈 Évolutivité

### **Ajout de nouveaux composants**
1. Créer le fichier dans le dossier approprié
2. Documenter l'API publique
3. Ajouter les tests
4. Intégrer dans les pages nécessaires

### **Modification des composants existants**
1. Maintenir la compatibilité ascendante
2. Mettre à jour la documentation
3. Tester les régressions
4. Notifier les changements breaking

## 🐛 Débogage

### **Mode debug**
```javascript
// Activer le mode debug
window.LineaCNC.debug = true;
```

### **Console**
- Logs détaillés en mode debug
- Erreurs capturées et affichées
- Métriques de performance

### **Outils de développement**
- Source maps pour le debugging
- Breakpoints dans les composants
- Inspection des états des objets
