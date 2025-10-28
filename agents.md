# AGENTS.md - Philosophie et Guidelines LineaCNC

## 🎯 Philosophie du Projet

### Vision
LineaCNC est un système d'authentification et d'administration **minimaliste, professionnel et évolutif**. Notre approche privilégie la **simplicité fonctionnelle** plutôt que la complexité technique.

### Principes Fondamentaux

#### 1. **Simplicité Avant Tout**
- Code lisible et maintenable par tout développeur
- Architecture claire et documentée
- Fonctionnalités essentielles uniquement
- Interface utilisateur intuitive

#### 2. **Sécurité Robuste**
- Authentification sécurisée avec bcrypt
- Protection contre les attaques courantes
- Logging complet des actions sensibles
- Sessions sécurisées avec cookies HttpOnly

#### 3. **Évolutivité Architecturale**
- Système de logging extensible
- Base de données avec migrations automatiques
- Code modulaire et réutilisable
- Prêt pour l'ajout de nouvelles fonctionnalités

#### 4. **Performance et Fiabilité**
- Optimisé pour l'hébergement Infomaniak
- Gestion d'erreurs robuste
- Monitoring intégré
- Déploiement simple et fiable

## 🏗️ Architecture Technique

### Stack Technologique
- **Backend** : Node.js + Express.js
- **Base de données** : MySQL avec mysql2/promise
- **Authentification** : Sessions + bcrypt
- **Frontend** : EJS + TailwindCSS
- **Typographie** : Inter (Google Fonts)

### Structure Modulaire
```
src/
├── config/          # Configuration et base de données
├── middleware/      # Middlewares d'authentification et logging
├── routes/          # Routes de l'application
├── utils/           # Utilitaires et helpers
├── views/           # Templates EJS
└── server.js        # Point d'entrée principal
```

### Principes d'Architecture
1. **Séparation des responsabilités** : Chaque module a un rôle précis
2. **Injection de dépendances** : Configuration centralisée
3. **Middleware pattern** : Pipeline de traitement des requêtes
4. **Error-first callbacks** : Gestion d'erreurs cohérente

## 🎨 Guidelines Visuelles

### Palette de Couleurs
```css
/* Couleurs principales */
Primary Blue: #3B82F6 (blue-500)
Primary Dark: #2563EB (blue-600)
Primary Light: #EFF6FF (blue-50)

/* Couleurs secondaires */
Gray Light: #F9FAFB (gray-50)
Gray Medium: #6B7280 (gray-500)
Gray Dark: #1F2937 (gray-800)

/* Couleurs d'état */
Success: #10B981 (green-500)
Warning: #F59E0B (yellow-500)
Error: #EF4444 (red-500)
```

### Typographie
- **Police principale** : Inter (Google Fonts)
- **Tailles** : text-xs, text-sm, text-base, text-lg, text-xl, text-2xl, text-3xl
- **Poids** : font-light (300), font-normal (400), font-medium (500), font-semibold (600), font-bold (700)

### Composants UI

#### Boutons
```css
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200;
}

.btn-secondary {
  @apply bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200;
}
```

#### Formulaires
```css
.input-field {
  @apply w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200;
}
```

#### Cartes
```css
.card {
  @apply bg-white rounded-lg shadow-md border border-gray-200;
}
```

### Layout et Espacement
- **Container** : max-width avec padding responsive
- **Espacement** : Système TailwindCSS (4px, 8px, 12px, 16px, 24px, 32px)
- **Grilles** : CSS Grid avec responsive breakpoints
- **Navigation** : Barre horizontale fixe en haut

## 🔒 Bonnes Pratiques de Sécurité

### Authentification
1. **Mots de passe** : Minimum 6 caractères, hachage bcrypt (salt rounds: 10)
2. **Sessions** : Cookies HttpOnly, SameSite=Lax, durée 24h
3. **Protection brute force** : Verrouillage après 5 tentatives (15 min)
4. **Validation** : Sanitisation de toutes les entrées utilisateur

### Base de Données
1. **Requêtes préparées** : Protection contre les injections SQL
2. **Connexions** : Pool de connexions avec limites
3. **Migrations** : Système automatique sans perte de données
4. **Backup** : Sauvegarde régulière recommandée

### Logging et Monitoring
1. **Logs complets** : Toutes les actions sensibles tracées
2. **Informations contextuelles** : IP, User-Agent, Session ID
3. **Niveaux de log** : INFO, WARNING, ERROR, AUTH, SECURITY, SYSTEM
4. **Rétention** : Nettoyage périodique des anciens logs

## 🌐 Spécificités Infomaniak

### Configuration Hébergement
```env
# Variables d'environnement Infomaniak
PORT=process.env.PORT          # Port dynamique assigné
NODE_ENV=production           # Environnement de production
DB_HOST=mysql-xxx.infomaniak.com
DB_USER=your_infomaniak_user
DB_PASSWORD=your_infomaniak_password
DB_NAME=your_database_name
```

### Déploiement
1. **Upload FTP** : Tous les fichiers dans le répertoire racine
2. **Dépendances** : `npm install` sur le serveur
3. **Compilation CSS** : `npm run build-css-prod`
4. **Configuration** : Créer le fichier `.env`
5. **Redémarrage** : Via le panel Infomaniak

### Optimisations Infomaniak
- **Compression** : CSS et JS minifiés
- **Cache** : Headers appropriés pour les assets statiques
- **Sessions** : Configuration compatible avec le proxy Infomaniak
- **Logs** : Rotation automatique des logs système

## 📝 Standards de Code

### Conventions JavaScript
```javascript
// Nommage
const userName = 'john_doe';           // camelCase pour variables
const API_ENDPOINT = '/api/users';     // UPPER_CASE pour constantes
function getUserById(id) { ... }       // camelCase pour fonctions

// Structure des fonctions
async function processUser(userId) {
  try {
    const user = await getUserById(userId);
    await logUserAction('user_processed', `User ${userId} processed`, req);
    return user;
  } catch (error) {
    await logError('user_process_failed', error.message, req);
    throw error;
  }
}
```

### Conventions EJS
```ejs
<!-- Structure des templates -->
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <link href="/css/styles.css" rel="stylesheet">
</head>
<body class="bg-gray-100">
    <!-- Contenu -->
</body>
</html>
```

### Documentation
- **Commentaires** : Expliquer le "pourquoi", pas le "comment"
- **README** : Instructions complètes de déploiement
- **Code** : Noms de variables explicites
- **Logs** : Messages descriptifs et actionables

## 🔄 Maintenance et Évolution

### Règles de Maintenance
1. **Mises à jour** : Tester en local avant déploiement
2. **Sauvegardes** : Base de données avant chaque modification
3. **Monitoring** : Surveiller les logs d'erreur régulièrement
4. **Sécurité** : Mise à jour des dépendances mensuelle

### Évolutivité
1. **Nouvelles fonctionnalités** : Respecter l'architecture existante
2. **Base de données** : Utiliser le système de migrations
3. **Logging** : Étendre les types de logs selon les besoins
4. **Interface** : Maintenir la cohérence visuelle

### Tests et Validation
1. **Tests locaux** : Vérifier toutes les fonctionnalités
2. **Tests de charge** : Valider les performances
3. **Tests de sécurité** : Vérifier les protections
4. **Tests utilisateur** : Valider l'expérience utilisateur

## 🚀 Déploiement et Production

### Checklist Pré-déploiement
- [ ] Tests locaux réussis
- [ ] CSS compilé et minifié
- [ ] Variables d'environnement configurées
- [ ] Base de données migrée
- [ ] Logs de test vérifiés

### Checklist Post-déploiement
- [ ] Application accessible
- [ ] Connexion utilisateur fonctionnelle
- [ ] Interface d'administration accessible
- [ ] Logs générés correctement
- [ ] Performance acceptable

### Monitoring Production
1. **Logs système** : Surveiller les erreurs
2. **Performance** : Temps de réponse des requêtes
3. **Sécurité** : Tentatives d'intrusion
4. **Utilisateurs** : Activité et sessions

## 📞 Support et Documentation

### Ressources
- **README.md** : Guide complet d'installation
- **DEPLOIEMENT.md** : Instructions spécifiques Infomaniak
- **Logs système** : Diagnostic des problèmes
- **Code source** : Documentation inline

### Procédures de Dépannage
1. **Problème de connexion** : Vérifier les logs d'authentification
2. **Erreur base de données** : Vérifier la configuration `.env`
3. **Interface cassée** : Recompiler les styles CSS
4. **Performance lente** : Analyser les logs de requêtes

---

**LineaCNC** - Système d'authentification professionnel  
*Philosophie : Simplicité, Sécurité, Évolutivité*
