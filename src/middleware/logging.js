const { logAccess, logError, logSecurity, updateSessionActivity } = require('../utils/logging');

/**
 * Middleware de logging des requêtes
 */
async function requestLogger(req, res, next) {
  const startTime = Date.now();
  const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  // Log de la requête
  await logAccess('request', `${req.method} ${req.path}`, req, {
    method: req.method,
    path: req.path,
    userIP: userIP,
    userAgent: req.headers['user-agent']?.substring(0, 100),
    hasSession: !!req.session?.user,
    userId: req.session?.user?.id || null
  });

  // Mettre à jour l'activité de session si connecté
  if (req.session && req.session.user && req.sessionID) {
    await updateSessionActivity(req.sessionID, req);
  }

  // Intercepter la réponse pour calculer la durée
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Log de la réponse
    logAccess('response', `${req.method} ${req.path} - ${res.statusCode}`, req, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: duration,
      userIP: userIP,
      hasSession: !!req.session?.user,
      userId: req.session?.user?.id || null
    }).catch(err => {
      console.error('Erreur logging réponse:', err.message);
    });

    originalSend.call(this, data);
  };

  next();
}

/**
 * Middleware de logging des erreurs
 */
async function errorLogger(err, req, res, next) {
  const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  await logError('server_error', `Erreur serveur: ${err.message}`, req, {
    error: err.message,
    stack: err.stack?.substring(0, 500), // Limiter la taille
    method: req.method,
    path: req.path,
    userIP: userIP,
    hasSession: !!req.session?.user,
    userId: req.session?.user?.id || null
  });

  next(err);
}

/**
 * Middleware de détection d'activité suspecte
 */
async function securityLogger(req, res, next) {
  const userIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  // Détecter les tentatives d'injection SQL basiques
  const suspiciousPatterns = [
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i,
    /script\s*>/i,
    /<script/i,
    /javascript:/i,
    /onload=/i,
    /onerror=/i
  ];

  const queryString = JSON.stringify(req.query);
  const bodyString = JSON.stringify(req.body);
  const fullString = queryString + bodyString;

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullString)) {
      await logSecurity('suspicious_activity', `Activité suspecte détectée: ${pattern}`, req, {
        pattern: pattern.toString(),
        query: req.query,
        body: req.body,
        userIP: userIP,
        path: req.path,
        method: req.method
      });
      break;
    }
  }

  // Détecter les tentatives d'accès à des fichiers sensibles
  const sensitivePaths = [
    '/.env',
    '/config',
    '/admin',
    '/phpmyadmin',
    '/wp-admin',
    '/.git',
    '/backup',
    '/logs'
  ];

  if (sensitivePaths.some(path => req.path.toLowerCase().includes(path))) {
    await logSecurity('sensitive_access_attempt', `Tentative d'accès à un chemin sensible: ${req.path}`, req, {
      path: req.path,
      userIP: userIP,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
  }

  next();
}

module.exports = {
  requestLogger,
  errorLogger,
  securityLogger
};
