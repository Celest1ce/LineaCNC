# LineaCNC - Authentification sécurisée

## 🎯 Vue d'ensemble

LineaCNC est une application Node.js (Express + EJS) orientée démonstration qui propose une authentification par session, un tableau de bord pour gérer des machines virtuelles et une journalisation fine des actions. Le projet est optimisé pour un déploiement simple sur l'hébergement Infomaniak.

## ✨ Fonctionnalités principales

### 🔐 Authentification & sécurité
- Connexion via email/mot de passe avec sessions `HttpOnly`
- Hachage `bcrypt` et politique de mot de passe renforcée (longueur minimale + complexité)
- Journalisation détaillée des évènements d'authentification et de sécurité
- Blocage automatique d'un compte après plusieurs tentatives échouées
- Statut utilisateur (`active`, `inactive`, `banned`) géré côté serveur

### 👥 Gestion des utilisateurs
- Inscription libre avec vérification d'unicité email/pseudo
- Suivi des rôles (`user`/`admin`) prêt pour de futures vues d'administration
- Possibilité de désactiver un compte directement en base pour bloquer l'accès

### 📊 Logging & suivi
- Table `logs` pour tracer toutes les actions importantes
- Table `user_sessions` pour suivre les connexions/déconnexions (heure, IP, agent)
- Intégration avec les middlewares pour tracer automatiquement les requêtes critiques

### 🎨 Interface utilisateur
- Templates EJS responsives stylés avec TailwindCSS
- Bundle JavaScript optimisé via esbuild (scripts client regroupés et minifiés)
- Notifications front pour les actions (succès, erreurs, etc.)

## 🏗️ Architecture

```
LineaCNC/
├── src/
│   ├── app.js                # Construction de l'application Express
│   ├── server.js             # Démarrage du serveur & bootstrap
│   ├── config/
│   │   ├── database.js       # Connexion MySQL + auto-provisioning
│   │   ├── session.js        # Configuration des sessions
│   │   └── assets.js         # Politique de cache statique
│   ├── middleware/           # Authentification, logging, sécurité
│   ├── routes/               # Routes applicatives et API
│   ├── utils/                # Utilitaires de journalisation
│   ├── validation/           # Schémas Joi
│   └── views/                # Templates EJS
├── public/
│   ├── css/                  # Styles générés (Tailwind)
│   └── js/                   # Scripts source + bundle dist
└── tests/                    # Tests automatisés (Jest + Supertest)
```

## 🚀 Installation & exécution

### Prérequis
- Node.js 18+
- MySQL 5.7+ (ou compatible)

### Installation locale
```bash
# Cloner le projet
 git clone <repository-url>
 cd LineaCNC

# Installer les dépendances
 npm install

# Configurer l'environnement
 cp .env.example .env
 # Éditer .env avec vos paramètres

# Construire les assets (CSS + JS)
 npm run build

# Lancer l'application
 npm start
```

### Variables d'environnement essentielles
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=secret
DB_NAME=lineacnc_auth
SESSION_SECRET=change-me
PORT=3000
```

⚠️ `SESSION_SECRET` est obligatoire : l'application refusera de démarrer s'il est manquant.

## 🧪 Tests

Le projet contient des tests Jest/Supertest pour valider les scénarios d'inscription et de connexion.

```bash
npm test
```

## 🛠️ Scripts npm
- `npm run dev` : démarre le serveur avec rechargement `nodemon`
- `npm run build-css` / `npm run build-css-prod` : génère les styles Tailwind
- `npm run build-js` / `npm run build-js-prod` : construit le bundle JavaScript avec esbuild
- `npm run build` : génère CSS + JS optimisés
- `npm test` : lance la suite de tests

## 📦 Déploiement Infomaniak
1. Copier les fichiers sur l'hébergement
2. Installer les dépendances (`npm install`)
3. Construire les assets (`npm run build`)
4. Configurer les variables d'environnement via le panneau d'administration
5. Redémarrer l'application Node.js

## 🔐 Bonnes pratiques
- Utiliser des mots de passe utilisateurs forts et uniques
- Surveiller la table `logs` pour détecter les accès suspects
- Forcer HTTPS en production (via reverse proxy Infomaniak)
- Planifier des sauvegardes régulières de la base de données

## 🤝 Contributions
Les contributions sont les bienvenues : issues, PRs, améliorations de docs ou de tests.

---
LineaCNC – Sécurité et simplicité au service d'une admin CNC minimale.
