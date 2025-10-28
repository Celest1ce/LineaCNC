const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const { initDatabase } = require('./config/database');
const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/app');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration des sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Désactivé pour HTTP (Infomaniak gère HTTPS)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
    sameSite: 'lax' // Compatible avec Infomaniak
  },
  name: 'lineacnc.sid' // Nom personnalisé pour éviter les conflits
}));

// Middleware pour parser les données
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serveur de fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

// Configuration du moteur de template EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pour passer les données de session aux vues
app.use((req, res, next) => {
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

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
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
    // Afficher les variables d'environnement pour diagnostic
    console.log('🔍 Variables d\'environnement:');
    console.log(`PORT: ${process.env.PORT || 'non défini'}`);
    console.log(`DB_HOST: ${process.env.DB_HOST || 'non défini'}`);
    console.log(`DB_USER: ${process.env.DB_USER || 'non défini'}`);
    console.log(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***défini***' : 'non défini'}`);
    console.log(`DB_NAME: ${process.env.DB_NAME || 'non défini'}`);
    console.log(`SESSION_SECRET: ${process.env.SESSION_SECRET ? '***défini***' : 'non défini'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'non défini'}`);
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
