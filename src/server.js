require('dotenv').config();

const { initDatabase } = require('./config/database');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;

// Initialisation et démarrage du serveur
async function startServer() {
  try {
    console.log('🔍 Variables d\'environnement importantes:');
    console.log(`PORT défini: ${process.env.PORT ? 'oui' : 'non'}`);
    console.log(`Configuration base de données présente: ${process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME ? 'oui' : 'non'}`);
    console.log(`SESSION_SECRET défini: ${process.env.SESSION_SECRET ? 'oui' : 'non'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    if (!process.env.SESSION_SECRET) {
      console.error('❌ SESSION_SECRET doit être défini pour sécuriser les sessions.');
      process.exit(1);
    }

    // Initialiser la base de données
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      console.error('❌ Impossible de démarrer sans connexion à la base de données');
      console.error('💡 Créez un fichier .env avec vos paramètres MySQL ou configurez les variables d\'environnement');
      process.exit(1);
    }

    // Démarrer le serveur
    const app = createApp();
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

// Démarrer le serveur si exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
  createApp
};

