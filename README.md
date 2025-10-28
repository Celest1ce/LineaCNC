# 🚀 LineaCNC - Application Node.js avec Authentification

Une application web moderne et professionnelle développée avec Node.js, Express et MySQL, optimisée pour l'hébergement mutualisé Infomaniak.

## ✨ Fonctionnalités

- **🔐 Authentification sécurisée** avec email/mot de passe
- **👤 Gestion des utilisateurs** avec sessions persistantes
- **🎨 Interface moderne** avec TailwindCSS et typographie Inter
- **📱 Design responsive** adapté à tous les écrans
- **⚙️ Paramètres du compte** (modification pseudo et mot de passe)
- **🗄️ Base de données MySQL** avec auto-création des tables
- **🔒 Sécurité** avec bcrypt et sessions sécurisées

## 🏗️ Architecture

```
LineaCNC/
├── src/
│   ├── config/          # Configuration base de données
│   ├── middleware/      # Middlewares d'authentification
│   ├── routes/          # Routes de l'application
│   ├── views/           # Templates EJS
│   └── server.js        # Point d'entrée Express
├── public/
│   ├── css/             # Styles TailwindCSS compilés
│   └── js/              # JavaScript client
├── agents.md            # Philosophie et règles du projet
├── DEPLOIEMENT.md       # Guide de déploiement Infomaniak
└── package.json         # Configuration npm
```

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+
- MySQL (local ou hébergement Infomaniak)
- npm ou yarn

### Installation locale
```bash
# Cloner le projet
git clone <votre-repo>
cd LineaCNC

# Installer les dépendances
npm install

# Compiler les styles TailwindCSS
npm run build-css-prod

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres MySQL

# Démarrer en mode développement
npm run dev

# Ou démarrer en production
npm start
```

### Configuration de la base de données
1. Créer une base MySQL nommée `lineacnc_auth`
2. Configurer les paramètres dans `.env`
3. La table `users` sera créée automatiquement au premier démarrage

## 🌐 Déploiement sur Infomaniak

Consultez le guide complet dans [DEPLOIEMENT.md](./DEPLOIEMENT.md) pour :
- Configuration de la base MySQL
- Upload des fichiers
- Configuration de l'application Node.js
- Tests et vérifications

## 🔐 Compte de Test

Un compte administrateur est créé automatiquement :
- **Email** : `admin@lineacnc.com`
- **Mot de passe** : `admin123`

## 📚 Documentation

- **[agents.md](./agents.md)** : Philosophie, architecture et bonnes pratiques
- **[DEPLOIEMENT.md](./DEPLOIEMENT.md)** : Guide complet de déploiement
- **[README.md](./README.md)** : Ce fichier

## 🛠️ Technologies Utilisées

- **Backend** : Node.js, Express.js
- **Base de données** : MySQL avec mysql2
- **Authentification** : express-session, bcrypt
- **Frontend** : EJS, TailwindCSS
- **Typographie** : Inter (Google Fonts)
- **Développement** : nodemon, dotenv

## 🎨 Design System

- **Palette** : Bleus clairs, gris, blanc
- **Typographie** : Inter (300-700)
- **Composants** : Boutons, formulaires, cartes, alertes
- **Responsive** : Mobile-first design

## 🔒 Sécurité

- Mots de passe hashés avec bcrypt (10 rounds)
- Sessions sécurisées avec cookies HttpOnly
- Validation côté client et serveur
- Protection contre les injections SQL
- Gestion propre des erreurs

## 📋 Scripts Disponibles

```bash
npm start          # Démarrage production
npm run dev        # Démarrage développement avec nodemon
npm run build-css  # Compilation TailwindCSS (watch)
npm run build-css-prod  # Compilation TailwindCSS (production)
```

## 🌟 Fonctionnalités Principales

### Page de Connexion
- Formulaire email/mot de passe
- Design moderne avec dégradé bleu
- Messages d'erreur/succès élégants
- Lien vers création de compte

### Dashboard Principal
- Menu horizontal plein écran
- Message de bienvenue personnalisé
- Dropdown paramètres avec options
- Zone de contenu extensible

### Paramètres du Compte
- Modification du pseudo
- Changement de mot de passe
- Validation et feedback utilisateur
- Interface cohérente avec le dashboard

## 🔧 Maintenance

- Mise à jour des dépendances : `npm update`
- Compilation des styles : `npm run build-css-prod`
- Sauvegarde de la base de données via phpMyAdmin
- Monitoring des logs d'erreur

## 📞 Support

Pour toute question ou problème :
1. Consultez la documentation dans `agents.md` et `DEPLOIEMENT.md`
2. Vérifiez les logs d'erreur
3. Testez localement avant déploiement
4. Contactez le support Infomaniak si nécessaire

---

**🎯 Objectif** : Créer une application professionnelle, maintenable et évolutive, optimisée pour l'hébergement mutualisé Infomaniak.

**Mantra** : *"Simple, propre, fonctionnel"*