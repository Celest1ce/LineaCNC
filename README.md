# LineaCNC - Système d'Authentification et d'Administration

## 🎯 Vue d'ensemble

Application Node.js complète avec authentification, administration et système de logging avancé, optimisée pour l'hébergement Infomaniak.

## ✨ Fonctionnalités

### 🔐 Authentification
- Connexion avec email/mot de passe
- Hachage sécurisé des mots de passe (bcrypt)
- Gestion des sessions avec cookies
- Protection contre les attaques par force brute
- Verrouillage temporaire des comptes

### 👥 Gestion des utilisateurs
- Système de rôles (admin/user)
- Statuts des comptes (actif/inactif/banni)
- Interface d'administration complète
- CRUD utilisateurs
- Changement de mots de passe

### 📊 Système de logging
- Logs en base de données (architecture évolutive)
- Types de logs : AUTH, SECURITY, SYSTEM, USER_ACTION, ERROR
- Suivi des sessions utilisateurs
- Logs d'accès et de sécurité
- Interface d'administration des logs

### 🎨 Interface utilisateur
- Design moderne avec TailwindCSS
- Typographie Inter
- Interface responsive
- Couleurs : bleu, gris, blanc
- Navigation horizontale

## 🏗️ Architecture

```
LineaCNC/
├── src/
│   ├── config/
│   │   └── database.js          # Configuration MySQL + migrations
│   ├── middleware/
│   │   ├── auth.js              # Authentification
│   │   ├── admin.js             # Autorisation admin
│   │   └── logging.js           # Logging des requêtes
│   ├── routes/
│   │   ├── auth.js              # Routes d'authentification
│   │   ├── app.js               # Routes de l'application
│   │   └── admin.js             # Routes d'administration
│   ├── utils/
│   │   └── logging.js           # Système de logging
│   ├── views/
│   │   ├── login.ejs            # Page de connexion
│   │   ├── register.ejs         # Page d'inscription
│   │   ├── dashboard.ejs        # Tableau de bord
│   │   ├── account.ejs          # Paramètres du compte
│   │   ├── admin-users.ejs      # Administration utilisateurs
│   │   └── admin-logs.ejs       # Administration logs
│   └── server.js                # Serveur principal
├── public/
│   ├── css/
│   │   └── styles.css           # Styles TailwindCSS
│   └── js/
│       └── main.js              # JavaScript client
├── package.json                 # Dépendances Node.js
├── tailwind.config.js          # Configuration TailwindCSS
├── .gitignore                  # Fichiers à ignorer
└── deploy.sh                   # Script de déploiement
```

## 🚀 Installation et déploiement

### Prérequis
- Node.js 18+
- MySQL 5.7+
- Compte Infomaniak avec hébergement Node.js

### Installation locale
```bash
# Cloner le projet
git clone <repository-url>
cd LineaCNC

# Installer les dépendances
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres MySQL

# Compiler les styles
npm run build-css-prod

# Démarrer le serveur
npm start
```

### Déploiement Infomaniak
```bash
# Exécuter le script de déploiement
./deploy.sh

# Uploadez tous les fichiers via FTP
# Créez un fichier .env avec vos paramètres Infomaniak
# Redémarrez l'application Node.js
```

## 🔧 Configuration

### Variables d'environnement (.env)
```env
# Base de données MySQL
DB_HOST=mysql-xxx.infomaniak.com
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database

# Sessions
SESSION_SECRET=your-super-secret-key

# Serveur
PORT=process.env.PORT  # Défini automatiquement par Infomaniak
NODE_ENV=production
```

### Base de données
Le système crée automatiquement les tables :
- `users` : Utilisateurs avec rôles et statuts
- `logs` : Système de logging évolutif
- `user_sessions` : Suivi des sessions

## 👤 Comptes par défaut

### Administrateur
- **Email** : admin@lineacnc.com
- **Mot de passe** : admin123
- **Rôle** : admin
- **Statut** : actif

## 📱 Utilisation

### Connexion
1. Accédez à `/auth/login`
2. Connectez-vous avec vos identifiants
3. Redirection vers le dashboard

### Administration (admin uniquement)
- `/admin/users` : Gestion des utilisateurs
- `/admin/logs` : Consultation des logs

### Paramètres du compte
- `/account` : Modification du pseudo et mot de passe

## 🔒 Sécurité

### Mesures implémentées
- Hachage bcrypt des mots de passe
- Sessions sécurisées avec cookies HttpOnly
- Protection CSRF avec SameSite
- Limitation des tentatives de connexion
- Logging de toutes les actions sensibles
- Validation des entrées utilisateur

### Logs de sécurité
- Tentatives de connexion échouées
- Accès non autorisés à l'admin
- Changements de mots de passe
- Modifications des comptes utilisateurs

## 🛠️ Maintenance

### Logs
- Consultation via `/admin/logs`
- Filtrage par type et niveau
- Export possible via API

### Base de données
- Migrations automatiques
- Sauvegarde recommandée
- Nettoyage périodique des anciens logs

## 📞 Support

Pour toute question ou problème :
1. Consultez les logs via `/admin/logs`
2. Vérifiez la configuration `.env`
3. Testez la connexion MySQL
4. Redémarrez l'application

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

---

**LineaCNC** - Système d'authentification professionnel pour Infomaniak