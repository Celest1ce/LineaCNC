const { logSecurity } = require('../utils/logging');

// Middleware d'authentification
async function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  await logSecurity('unauthenticated_access', 'Tentative d\'accès non authentifié', req);
  return res.redirect('/auth/login');
}

// Middleware pour rediriger les utilisateurs connectés
async function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    await logSecurity('redundant_login_attempt', 'Utilisateur connecté accédant à la page de connexion', req);
    return res.redirect('/dashboard');
  }
  return next();
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated
};

