// Middleware d'authentification
function requireAuth(req, res, next) {
  console.log('🔒 requireAuth - Session:', req.session?.user ? 'Connecté' : 'Non connecté');
  console.log('🔒 Session ID:', req.sessionID);
  if (req.session && req.session.user) {
    return next();
  } else {
    console.log('❌ Accès refusé, redirection vers login');
    return res.redirect('/auth/login');
  }
}

// Middleware pour rediriger les utilisateurs connectés
function redirectIfAuthenticated(req, res, next) {
  console.log('🔄 redirectIfAuthenticated - Session:', req.session?.user ? 'Connecté' : 'Non connecté');
  console.log('🔄 Session ID:', req.sessionID);
  if (req.session && req.session.user) {
    console.log('✅ Utilisateur déjà connecté, redirection vers dashboard');
    return res.redirect('/dashboard');
  } else {
    return next();
  }
}

module.exports = {
  requireAuth,
  redirectIfAuthenticated
};

