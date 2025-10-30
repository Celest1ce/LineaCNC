const express = require('express');
const path = require('path');
const helmet = require('helmet');
const csrf = require('csurf');
require('dotenv').config();

const { initDatabase } = require('./config/database');
const { createSessionMiddleware } = require('./config/session');
const { requestLogger, errorLogger } = require('./middleware/logging');
const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/app');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: false
}));

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Configuration des sessions
app.use(createSessionMiddleware());

// Journalisation des requêtes
app.use(requestLogger);

// Middleware pour parser les données
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuration des assets
const { getCacheHeader } = require('./config/assets');

// Servir les fichiers statiques avec headers de cache
app.use('/assets', (req, res, next) => {
  // Déterminer le type d'asset basé sur le chemin
  let assetType = 'images'; // par défaut
  if (req.path.startsWith('/fonts')) assetType = 'fonts';
  else if (req.path.startsWith('/documents')) assetType = 'documents';
  else if (req.path.startsWith('/downloads')) assetType = 'downloads';
  
  // Définir le header de cache approprié
  res.set('Cache-Control', getCacheHeader(assetType));
  next();
}, express.static(path.join(__dirname, '../public/assets')));

// Servir les autres fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

// Configuration du moteur de template EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pour passer les données de session aux vues
const csrfProtection = csrf();
app.use(csrfProtection);

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.session.user || null;
  res.locals.isAuthenticated = !!req.session.user;
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/', appRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page non trouvée',
    message: 'La page que vous recherchez n\'existe pas.'
  });
});

// Gestion des erreurs CSRF
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    console.warn('⚠️ Jeton CSRF invalide détecté');
    if (req.accepts('json')) {
      return res.status(403).json({ error: 'Jeton CSRF invalide. Veuillez recharger la page.' });
    }
    return res.status(403).render('error', {
      title: 'Action non autorisée',
      message: 'La vérification de sécurité a échoué. Veuillez réessayer.'
    });
  }
  return next(err);
});

// Gestion des erreurs
app.use(errorLogger);

app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err.message);
  res.status(500).render('error', {
    title: 'Erreur serveur',
    message: process.env.NODE_ENV === 'production'
      ? 'Une erreur interne s\'est produite.'
      : err.message
  });
});

// Initialisation et démarrage du serveur
async function startServer() {
  try {
    console.log('🔍 Variables d\'environnement importantes:');
    console.log(`PORT défini: ${process.env.PORT ? 'oui' : 'non'}`);
    console.log(`Configuration base de données présente: ${process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME ? 'oui' : 'non'}`);
    console.log(`SESSION_SECRET défini: ${process.env.SESSION_SECRET ? 'oui' : 'non'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    // Initialiser la base de données
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      console.error('❌ Impossible de démarrer sans connexion à la base de données');
      console.error('💡 Créez un fichier .env avec vos paramètres MySQL ou configurez les variables d\'environnement');
      process.exit(1);
    }

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📱 Application accessible sur: http://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du serveur...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Arrêt du serveur...');
  process.exit(0);
});

// Démarrer le serveur
startServer();

