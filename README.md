# LineaCNC - Système d'Authentification et d'Administration

Une application Node.js moderne avec authentification sécurisée, gestion des utilisateurs et système de logging avancé, optimisée pour l'hébergement Infomaniak.

## 🚀 Fonctionnalités

### 🔐 Authentification Sécurisée
- **Connexion/Déconnexion** avec sessions persistantes
- **Hachage des mots de passe** avec bcrypt
- **Protection contre les attaques** par force brute
- **Verrouillage temporaire** des comptes après échecs
- **Validation côté client et serveur**

### 👥 Gestion des Utilisateurs
- **Système de rôles** : Admin / Utilisateur
- **Statuts des comptes** : Actif / Inactif / Banni
- **Interface d'administration** complète
- **CRUD utilisateurs** avec validation
- **Réinitialisation de mots de passe** par les admins

### 📊 Système de Logging Avancé
- **Logs en base de données** avec architecture évolutive
- **Types de logs** : auth, access, error, security, system, user_action, api
- **Niveaux de logs** : debug, info, warn, error, critical
- **Interface d'administration** pour visualiser les logs
- **Détection automatique** d'activités suspectes

### 🛡️ Sécurité Avancée
- **Middleware de sécurité** avec détection de patterns suspects
- **Protection CSRF** et validation des entrées
- **Audit trail** complet des actions
- **Suivi des sessions** et connexions
- **Logs de sécurité** détaillés

## 🏗️ Architecture Technique

### Stack Technologique
- **Backend** : Node.js + Express.js
- **Base de données** : MySQL avec pool de connexions
- **Authentification** : Sessions + bcrypt
- **Frontend** : EJS + TailwindCSS
- **Typographie** : Inter (Google Fonts)

### Structure du Projet
```
LineaCNC/
├── src/
│   ├── config/          # Configuration base de données
│   ├── middleware/      # Middlewares (auth, admin, logging)
│   ├── routes/          # Routes (auth, app, admin)
│   ├── utils/           # Utilitaires (logging)
│   ├── views/           # Templates EJS
│   └── server.js        # Point d'entrée
├── public/
│   ├── css/             # Styles TailwindCSS compilés
│   └── js/              # JavaScript client
└── Configuration files
```

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+
- MySQL 5.7+
- npm ou yarn

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd LineaCNC

# Installer les dépendances
npm install

# Compiler les styles TailwindCSS
npm run build-css

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres MySQL
```

### Configuration Base de Données
```env
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=lineacnc_auth
SESSION_SECRET=your-secret-key
```

### Démarrage
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

## 👤 Utilisation

### Compte Administrateur par Défaut
- **Email** : admin@lineacnc.com
- **Mot de passe** : admin123
- **Rôle** : Administrateur

### Fonctionnalités Administrateur
1. **Gestion des utilisateurs** (`/admin/users`)
   - Créer, modifier, supprimer des utilisateurs
   - Changer les rôles et statuts
   - Réinitialiser les mots de passe

2. **Visualisation des logs** (`/admin/logs`)
   - Consulter tous les logs système
   - Filtrer par type et niveau
   - Statistiques d'utilisation

### Fonctionnalités Utilisateur
1. **Tableau de bord** (`/dashboard`)
   - Interface personnalisée selon le rôle
   - Accès aux paramètres du compte

2. **Paramètres du compte** (`/account`)
   - Modifier le pseudo
   - Changer le mot de passe

## 🔧 Scripts Disponibles

```bash
npm start          # Démarrage en production
npm run dev        # Démarrage en développement avec nodemon
npm run build-css  # Compilation TailwindCSS
npm run build-css-prod  # Compilation TailwindCSS optimisée
```

## 📊 Tests

### Test du Système Complet
```bash
node test-complete-system.js
```

### Test du Système de Logging
```bash
node test-logging.js
```

## 🌐 Déploiement Infomaniak

Voir le fichier `DEPLOIEMENT.md` pour les instructions détaillées de déploiement sur Infomaniak.

### Points Clés
- Configuration du port dynamique (`process.env.PORT`)
- Base de données MySQL via le panel Infomaniak
- Upload FTP des fichiers
- Configuration des variables d'environnement

## 📚 Documentation

- **`agents.md`** : Philosophie du projet, bonnes pratiques, architecture
- **`DEPLOIEMENT.md`** : Guide de déploiement Infomaniak
- **`tailwind.config.js`** : Configuration TailwindCSS
- **`.env.example`** : Exemple de configuration

## 🔒 Sécurité

### Mesures Implémentées
- **Hachage sécurisé** des mots de passe (bcrypt)
- **Protection CSRF** et validation des entrées
- **Requêtes préparées** contre les injections SQL
- **Sessions sécurisées** avec cookies HttpOnly
- **Détection d'intrusion** automatique
- **Audit trail** complet des actions

### Bonnes Pratiques
- Variables d'environnement pour les secrets
- Validation côté client ET serveur
- Logs de sécurité détaillés
- Gestion d'erreurs sans exposition d'informations
- Middleware de sécurité multicouche

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
1. Consulter la documentation (`agents.md`)
2. Vérifier les logs système (`/admin/logs`)
3. Tester avec les scripts fournis
4. Ouvrir une issue sur GitHub

---

**LineaCNC** - *Simple, propre, fonctionnel* ✨