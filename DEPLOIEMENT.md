# 🚀 Guide de Déploiement - LineaCNC sur Infomaniak

## 📋 Prérequis

### Compte Infomaniak
- Hébergement mutualisé avec support Node.js
- Accès au panel de gestion Infomaniak
- Base de données MySQL disponible
- Accès FTP/SFTP pour l'upload des fichiers

### Environnement Local
- Node.js 18+ installé
- npm ou yarn
- Accès à une base MySQL pour les tests

## 🗄️ Configuration de la Base de Données

### 1. Création de la Base MySQL
1. Connectez-vous au **panel Infomaniak**
2. Allez dans **Bases de données** → **MySQL**
3. Créez une nouvelle base de données :
   - Nom : `lineacnc_auth` (ou votre choix)
   - Utilisateur : Créez un utilisateur dédié
   - Mot de passe : Générez un mot de passe fort
4. Notez les informations de connexion

### 2. Configuration via phpMyAdmin
1. Accédez à **phpMyAdmin** depuis le panel
2. Sélectionnez votre base de données
3. La table `users` sera créée automatiquement au premier démarrage

## ⚙️ Configuration de l'Environnement

### 1. Fichier .env
Créez un fichier `.env` à la racine du projet :

```env
# Configuration pour hébergement Infomaniak
PORT=3000

# Base de données MySQL (remplacez par vos valeurs)
DB_HOST=localhost
DB_USER=votre_utilisateur_mysql
DB_PASSWORD=votre_mot_de_passe_mysql
DB_NAME=votre_nom_de_base

# Session sécurisée (générez une clé longue et aléatoire)
SESSION_SECRET=votre_clé_session_très_longue_et_aléatoire_ici

# Environnement
NODE_ENV=production
```

### 2. Génération de la Clé de Session
```bash
# Générer une clé aléatoire (optionnel)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 📦 Installation et Compilation

### 1. Installation des Dépendances
```bash
npm install
```

### 2. Compilation des Styles
```bash
# Compiler TailwindCSS pour la production
npm run build-css-prod
```

### 3. Test Local (Recommandé)
```bash
# Tester l'application localement avant déploiement
npm run dev
```

Vérifiez que :
- L'application démarre sans erreur
- La connexion à la base de données fonctionne
- Les pages s'affichent correctement
- L'authentification fonctionne

## 📤 Déploiement sur Infomaniak

### 1. Upload des Fichiers
Via FTP/SFTP, uploadez tous les fichiers **sauf** :
- `node_modules/` (sera installé sur le serveur)
- `.env` (à créer directement sur le serveur)
- `.git/` (si présent)

**Structure à uploader à la racine du domaine :**
```
/votre-domaine/
├── src/
├── public/
├── package.json
├── tailwind.config.js
└── .env.example
```

### 2. Configuration sur le Panel Infomaniak
1. Allez dans **Applications** → **Node.js**
2. Créez une nouvelle application :
   - **Nom** : LineaCNC (ou votre choix)
   - **Répertoire** : `/votre-domaine/` (racine du domaine)
   - **Port** : Laissé vide (automatique)
   - **Script de démarrage** : `src/server.js`
   - **Version Node.js** : 18+ (recommandé)

### 3. Installation des Dépendances sur le Serveur
1. Dans le panel Infomaniak, allez dans **Terminal**
2. Naviguez vers votre répertoire racine :
   ```bash
   cd /votre-domaine/
   ```
3. Installez les dépendances :
   ```bash
   npm install --production
   ```

### 4. Configuration du Fichier .env
1. Créez le fichier `.env` sur le serveur
2. Copiez le contenu de `.env.example`
3. Modifiez les valeurs avec vos informations MySQL

### 5. Démarrage de l'Application
1. Dans le panel Infomaniak, **démarrez** votre application Node.js
2. Vérifiez les logs pour détecter d'éventuelles erreurs

## ✅ Vérification du Déploiement

### 1. Test de l'Application
1. Accédez à votre domaine : `https://votre-domaine.com`
2. Vérifiez que la page de connexion s'affiche
3. Testez la connexion avec le compte admin :
   - **Email** : `admin@lineacnc.com`
   - **Mot de passe** : `admin123`

### 2. Fonctionnalités à Tester
- [ ] Page de connexion s'affiche
- [ ] Connexion avec compte admin fonctionne
- [ ] Dashboard s'affiche après connexion
- [ ] Menu paramètres fonctionne
- [ ] Page paramètres du compte accessible
- [ ] Modification du pseudo fonctionne
- [ ] Changement de mot de passe fonctionne
- [ ] Déconnexion fonctionne
- [ ] Design responsive sur mobile

### 3. Vérification des Logs
1. Consultez les logs dans le panel Infomaniak
2. Vérifiez qu'il n'y a pas d'erreurs critiques
3. Confirmez la connexion à la base de données

## 🔧 Maintenance et Mises à Jour

### 1. Mise à Jour des Dépendances
```bash
# Vérifier les mises à jour disponibles
npm outdated

# Mettre à jour (avec précaution)
npm update

# Tester localement avant déploiement
npm run dev
```

### 2. Sauvegarde de la Base de Données
1. Via phpMyAdmin : **Exporter** → **SQL**
2. Sauvegardez régulièrement le fichier `.sql`
3. Testez la restauration sur un environnement de test

### 3. Monitoring
- Surveillez les logs d'erreur
- Vérifiez l'espace disque disponible
- Monitorer les performances de l'application

## 🚨 Troubleshooting

### Problèmes Courants

#### Erreur de Connexion à la Base de Données
```
❌ Erreur de connexion à la base de données: ER_ACCESS_DENIED_ERROR
```
**Solution :**
- Vérifiez les identifiants dans `.env`
- Confirmez que l'utilisateur MySQL a les droits sur la base
- Testez la connexion via phpMyAdmin

#### Port Non Disponible
```
❌ Error: listen EADDRINUSE: address already in use
```
**Solution :**
- Laissez le port vide dans la configuration Infomaniak
- Le port sera assigné automatiquement

#### Erreur de Session
```
❌ Session secret not configured
```
**Solution :**
- Vérifiez que `SESSION_SECRET` est défini dans `.env`
- Utilisez une clé longue et aléatoire

#### Styles Non Chargés
**Solution :**
- Vérifiez que `public/css/styles.css` existe
- Recompilez TailwindCSS : `npm run build-css-prod`
- Vérifiez les permissions des fichiers

### Logs et Debug
1. **Logs d'application** : Panel Infomaniak → Applications → Logs
2. **Logs d'erreur** : Panel Infomaniak → Logs système
3. **Debug local** : `npm run dev` avec logs détaillés

## 🔒 Sécurité

### Bonnes Pratiques
- **Mot de passe fort** pour la base de données
- **Clé de session** longue et aléatoire
- **HTTPS** activé sur le domaine
- **Mise à jour** régulière des dépendances
- **Sauvegarde** régulière de la base de données

### Configuration Sécurisée
- `NODE_ENV=production` en production
- Cookies sécurisés (`secure: true`)
- Headers de sécurité appropriés
- Validation de toutes les entrées utilisateur

## 📞 Support

### Ressources
- **Documentation Infomaniak** : [help.infomaniak.com](https://help.infomaniak.com)
- **Support technique** : Via le panel Infomaniak
- **Documentation Node.js** : [nodejs.org](https://nodejs.org)

### En Cas de Problème
1. Consultez les logs d'erreur
2. Vérifiez la configuration `.env`
3. Testez localement si possible
4. Contactez le support Infomaniak si nécessaire

---

## 🎯 Checklist de Déploiement

- [ ] Base de données MySQL créée
- [ ] Fichier `.env` configuré
- [ ] Dépendances installées localement
- [ ] Styles TailwindCSS compilés
- [ ] Tests locaux réussis
- [ ] Fichiers uploadés via FTP
- [ ] Application Node.js créée sur Infomaniak
- [ ] Dépendances installées sur le serveur
- [ ] Application démarrée
- [ ] Tests de fonctionnalités réussis
- [ ] Logs vérifiés
- [ ] Sauvegarde de la base de données effectuée

**🎉 Félicitations ! Votre application LineaCNC est maintenant déployée sur Infomaniak !**
