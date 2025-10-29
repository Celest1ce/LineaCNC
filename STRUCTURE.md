# Structure du Projet LineaCNC

## 📁 Architecture des Dossiers

```
LineaCNC/
├── src/                           # Code source principal
│   ├── config/                    # Configuration
│   │   └── database.js           # Configuration MySQL
│   ├── middleware/                # Middlewares Express
│   │   ├── auth.js               # Authentification
│   │   └── logging.js            # Système de logging
│   ├── routes/                    # Routes de l'application
│   │   ├── auth.js               # Routes d'authentification
│   │   └── app.js                # Routes principales + API
│   ├── utils/                     # Utilitaires
│   │   └── logging.js            # Fonctions de logging
│   ├── views/                     # Templates EJS
│   │   ├── auth/                 # Pages d'authentification
│   │   │   ├── login.ejs         # Connexion
│   │   │   └── register.ejs      # Inscription
│   │   ├── dashboard/            # Tableau de bord
│   │   │   └── index.ejs         # Dashboard principal
│   │   ├── account/              # Paramètres compte
│   │   │   └── index.ejs         # Page paramètres
│   │   ├── errors/               # Pages d'erreur
│   │   │   ├── 404.ejs           # Page non trouvée
│   │   │   └── 500.ejs           # Erreur serveur
│   │   └── components/           # Composants réutilisables
│   ├── styles.css                # Styles TailwindCSS
│   └── server.js                 # Point d'entrée principal
├── public/                        # Fichiers publics
│   └── assets/                   # Assets organisés
│       ├── css/                  # Feuilles de style
│       │   ├── styles.css        # CSS principal compilé
│       │   └── notifications.css # Styles notifications
│       ├── js/                   # Scripts JavaScript
│       │   ├── components/       # Composants JS
│       │   │   ├── dropdown-manager.js
│       │   │   └── machine-manager.js
│       │   ├── pages/            # Scripts par page
│       │   │   └── dashboard.js
│       │   ├── utils/            # Utilitaires JS
│       │   │   ├── notification.js
│       │   │   └── theme-manager.js
│       │   ├── build.js          # Script de build
│       │   ├── config.js         # Configuration JS
│       │   └── main.js           # Script principal
│       └── images/               # Images organisées
│           └── branding/         # Logos et favicon
│               ├── favicon.ico
│               ├── favicon.svg
│               └── logo-lineacnc.svg
├── package.json                  # Dépendances Node.js
├── tailwind.config.js           # Configuration TailwindCSS
└── README.md                    # Documentation principale
```

## 🎯 Organisation par Fonctionnalité

### Authentification (`src/views/auth/`)
- **login.ejs** : Page de connexion (mode clair uniquement)
- **register.ejs** : Page d'inscription (mode clair uniquement)

### Dashboard (`src/views/dashboard/`)
- **index.ejs** : Interface principale de contrôle CNC (avec dark mode)

### Compte (`src/views/account/`)
- **index.ejs** : Paramètres du compte utilisateur (avec dark mode)

### Erreurs (`src/views/errors/`)
- **404.ejs** : Page d'erreur 404
- **500.ejs** : Page d'erreur serveur

## 🎨 Assets Organisés

### CSS (`public/assets/css/`)
- **styles.css** : CSS principal compilé avec TailwindCSS
- **notifications.css** : Styles spécifiques aux notifications

### JavaScript (`public/assets/js/`)
- **components/** : Composants réutilisables
- **pages/** : Scripts spécifiques aux pages
- **utils/** : Utilitaires et helpers

### Images (`public/assets/images/`)
- **branding/** : Logos, favicon, éléments de marque

## 🔧 Configuration

### Chemins des Assets
- **CSS** : `/assets/css/` (nouveau) ou `/css/` (compatibilité)
- **JS** : `/assets/js/` (nouveau) ou `/js/` (compatibilité)
- **Images** : `/assets/images/`

### Base de Données
- **Tables** : `users`, `machines`, `user_preferences`
- **Configuration** : `src/config/database.js`

## 🚀 Avantages de cette Structure

1. **Séparation claire** : Chaque fonctionnalité dans son dossier
2. **Assets organisés** : CSS, JS et images séparés par type
3. **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités
4. **Maintenabilité** : Code organisé et facile à maintenir
5. **Performance** : Assets optimisés avec cache approprié
