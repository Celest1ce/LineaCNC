const { logSecurity } = require('../utils/logging');

/**
 * Middleware pour vérifier si l'utilisateur est administrateur
 */
function requireAdmin(req, res, next) {
  console.log('🔒 requireAdmin - Vérification des droits admin');
  
  if (!req.session || !req.session.user) {
    console.log('❌ Accès refusé: utilisateur non connecté');
    logSecurity('admin_access_denied', 'Tentative d\'accès admin sans authentification', req);
    return res.redirect('/auth/login');
  }

  const user = req.session.user;
  
  // Vérifier le rôle admin
  if (user.role !== 'admin') {
    console.log('❌ Accès refusé: utilisateur non admin', { userId: user.id, role: user.role });
    logSecurity('admin_access_denied', `Tentative d'accès admin par utilisateur non autorisé: ${user.pseudo} (${user.email})`, req, {
      userId: user.id,
      userRole: user.role,
      attemptedAction: req.path
    });
    
    req.session.error = 'Accès refusé. Droits administrateur requis.';
    return res.redirect('/dashboard');
  }

  // Vérifier le statut actif
  if (user.status !== 'active') {
    console.log('❌ Accès refusé: compte inactif', { userId: user.id, status: user.status });
    logSecurity('admin_access_denied', `Tentative d'accès admin avec compte inactif: ${user.pseudo}`, req, {
      userId: user.id,
      userStatus: user.status
    });
    
    req.session.error = 'Votre compte n\'est pas actif.';
    return res.redirect('/auth/login');
  }

  console.log('✅ Accès admin autorisé:', { userId: user.id, pseudo: user.pseudo });
  next();
}

/**
 * Middleware pour vérifier si l'utilisateur est actif (non banni)
 */
function requireActiveUser(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect('/auth/login');
  }

  const user = req.session.user;
  
  if (user.status !== 'active') {
    console.log('❌ Accès refusé: compte inactif', { userId: user.id, status: user.status });
    logSecurity('inactive_user_access', `Tentative d'accès avec compte inactif: ${user.pseudo}`, req, {
      userId: user.id,
      userStatus: user.status
    });
    
    req.session.destroy(() => {
      res.redirect('/auth/login?error=account_inactive');
    });
    return;
  }

  next();
}

/**
 * Middleware pour vérifier les permissions selon le rôle
 */
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }

    const userRole = req.session.user.role;
    
    if (!roles.includes(userRole)) {
      logSecurity('role_access_denied', `Tentative d'accès avec rôle insuffisant: ${userRole}`, req, {
        userId: req.session.user.id,
        userRole: userRole,
        requiredRoles: roles,
        attemptedAction: req.path
      });
      
      req.session.error = 'Permissions insuffisantes pour cette action.';
      return res.redirect('/dashboard');
    }

    next();
  };
}

module.exports = {
  requireAdmin,
  requireActiveUser,
  requireRole
};
