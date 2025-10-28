function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  } else {
    req.session.error = 'Accès non autorisé. Vous devez être administrateur.';
    return res.redirect('/dashboard'); // Ou une page d'erreur 403
  }
}

module.exports = {
  requireAdmin
};
