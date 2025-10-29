const { logInfo, logError, logSecurity } = require('../utils/logging');

// Middleware pour logger toutes les requêtes
async function requestLogger(req, res, next) {
  const start = process.hrtime();

  res.on('finish', async () => {
    const diff = process.hrtime(start);
    const responseTime = (diff[0] * 1e9 + diff[1]) / 1e6; // en millisecondes

    await logInfo('access_log', `Requête ${req.method} ${req.originalUrl} - Statut: ${res.statusCode}`, req, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime.toFixed(2)}ms`,
      userId: req.session?.user?.id,
      pseudo: req.session?.user?.pseudo,
      sessionID: req.sessionID
    });
  });
  next();
}

// Middleware pour logger les erreurs
async function errorLogger(err, req, res, next) {
  await logError('application_error', `Erreur interne du serveur: ${err.message}`, req, {
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.session?.user?.id,
    pseudo: req.session?.user?.pseudo,
    sessionID: req.sessionID
  });
  next(err); // Passer l'erreur au gestionnaire d'erreurs Express par défaut
}

// Middleware pour logger les événements de sécurité (peut être étendu)
async function securityLogger(req, res, next) {
  // Exemple: Détecter des patterns suspects dans les requêtes
  // (Logique de sécurité peut être étendue ici)
  next();
}

module.exports = {
  requestLogger,
  errorLogger,
  securityLogger
};
