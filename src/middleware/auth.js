// Middleware d'authentification
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    return res.redirect('/auth/login');
  }
}

// Middleware pour rediriger les utilisateurs connectés
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  } else {
    return next();
  }
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated
};
