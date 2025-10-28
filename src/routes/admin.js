const express = require('express');
const bcrypt = require('bcrypt');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { executeQuery } = require('../config/database');
const { getLogs, logUserAction, logSecurity, logError } = require('../utils/logging');

const router = express.Router();

// Page d'administration des logs
router.get('/admin/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Récupérer les logs récents (dernières 100 entrées)
    const logs = await getLogs({ limit: 100 });

    // Grouper les logs par type pour les statistiques
    const logStats = logs.reduce((acc, log) => {
      acc[log.type] = (acc[log.type] || 0) + 1;
      return acc;
    }, {});

    res.render('admin-logs', {
      title: 'Administration - Logs',
      user: req.session.user,
      logs: logs,
      logStats: logStats,
      success: req.session.success || null,
      error: req.session.error || null
    });

    // Nettoyer les messages après affichage
    delete req.session.success;
    delete req.session.error;

  } catch (error) {
    console.error('Erreur récupération logs:', error);
    logError('admin_logs_fetch_error', `Erreur lors de la récupération des logs: ${error.message}`, req);
    req.session.error = 'Erreur lors de la récupération des logs';
    res.redirect('/dashboard');
  }
});

// Page d'administration des utilisateurs
router.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Récupérer tous les utilisateurs
    const users = await executeQuery(`
      SELECT id, email, pseudo, role, status, last_login, login_attempts,
             locked_until, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
    `);

    // Statistiques
    const stats = {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      inactive: users.filter(u => u.status === 'inactive').length,
      banned: users.filter(u => u.status === 'banned').length,
      admins: users.filter(u => u.role === 'admin').length,
      regular: users.filter(u => u.role === 'user').length
    };

    res.render('admin-users', {
      title: 'Administration - Utilisateurs',
      user: req.session.user,
      users: users,
      stats: stats,
      success: req.session.success || null,
      error: req.session.error || null
    });

    // Nettoyer les messages après affichage
    delete req.session.success;
    delete req.session.error;

  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    logError('admin_users_fetch_error', `Erreur lors de la récupération des utilisateurs: ${error.message}`, req);
    req.session.error = 'Erreur lors de la récupération des utilisateurs';
    res.redirect('/dashboard');
  }
});

// Créer un nouvel utilisateur
router.post('/admin/users/create', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, pseudo, role = 'user', status = 'active' } = req.body;

    // Validation
    if (!email || !password || !pseudo) {
      req.session.error = 'Tous les champs sont requis';
      return res.redirect('/admin/users');
    }

    // Vérifier si l'email existe déjà
    const existingUsers = await executeQuery('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      req.session.error = 'Cet email est déjà utilisé';
      return res.redirect('/admin/users');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    await executeQuery(
      'INSERT INTO users (email, password, pseudo, role, status) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, pseudo, role, status]
    );

    await logUserAction('user_created', `Utilisateur créé: ${pseudo} (${email})`, req, {
      newUserEmail: email,
      newUserRole: role,
      newUserStatus: status,
      createdBy: req.session.user.pseudo
    });

    req.session.success = `Utilisateur ${pseudo} créé avec succès`;
    res.redirect('/admin/users');

  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    logError('admin_user_create_error', `Erreur lors de la création de l\'utilisateur: ${error.message}`, req, {
      attemptedEmail: req.body.email,
      createdBy: req.session.user.pseudo
    });
    req.session.error = 'Erreur lors de la création de l\'utilisateur';
    res.redirect('/admin/users');
  }
});

// Modifier un utilisateur
router.post('/admin/users/:id/update', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, pseudo, role, status } = req.body;

    // Récupérer l'utilisateur actuel
    const currentUsers = await executeQuery('SELECT * FROM users WHERE id = ?', [userId]);
    if (currentUsers.length === 0) {
      req.session.error = 'Utilisateur non trouvé';
      return res.redirect('/admin/users');
    }

    const currentUser = currentUsers[0];

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (email !== currentUser.email) {
      const existingUsers = await executeQuery('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
      if (existingUsers.length > 0) {
        req.session.error = 'Cet email est déjà utilisé';
        return res.redirect('/admin/users');
      }
    }

    // Mettre à jour l'utilisateur
    await executeQuery(
      'UPDATE users SET email = ?, pseudo = ?, role = ?, status = ?, updated_at = NOW() WHERE id = ?',
      [email, pseudo, role, status, userId]
    );

    await logUserAction('user_updated', `Utilisateur modifié: ${pseudo} (${email})`, req, {
      userId: userId,
      oldEmail: currentUser.email,
      newEmail: email,
      oldRole: currentUser.role,
      newRole: role,
      oldStatus: currentUser.status,
      newStatus: status,
      updatedBy: req.session.user.pseudo
    });

    req.session.success = `Utilisateur ${pseudo} modifié avec succès`;
    res.redirect('/admin/users');

  } catch (error) {
    console.error('Erreur modification utilisateur:', error);
    logError('admin_user_update_error', `Erreur lors de la modification de l\'utilisateur: ${error.message}`, req, {
      targetUserId: req.params.id,
      updatedBy: req.session.user.pseudo
    });
    req.session.error = 'Erreur lors de la modification de l\'utilisateur';
    res.redirect('/admin/users');
  }
});

// Changer le mot de passe d'un utilisateur
router.post('/admin/users/:id/password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      req.session.error = 'Le mot de passe doit contenir au moins 6 caractères';
      return res.redirect('/admin/users');
    }

    // Récupérer l'utilisateur
    const users = await executeQuery('SELECT pseudo, email FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      req.session.error = 'Utilisateur non trouvé';
      return res.redirect('/admin/users');
    }

    const user = users[0];

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await executeQuery(
      'UPDATE users SET password = ?, login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );

    await logUserAction('user_password_changed', `Mot de passe modifié pour: ${user.pseudo} (${user.email})`, req, {
      userId: userId,
      userEmail: user.email,
      changedBy: req.session.user.pseudo
    });

    req.session.success = `Mot de passe modifié pour ${user.pseudo}`;
    res.redirect('/admin/users');

  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    logError('admin_user_password_change_error', `Erreur lors du changement de mot de passe: ${error.message}`, req, {
      targetUserId: req.params.id,
      changedBy: req.session.user.pseudo
    });
    req.session.error = 'Erreur lors du changement de mot de passe';
    res.redirect('/admin/users');
  }
});

// Supprimer un utilisateur
router.post('/admin/users/:id/delete', requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Empêcher la suppression de son propre compte
    if (parseInt(userId) === req.session.user.id) {
      req.session.error = 'Vous ne pouvez pas supprimer votre propre compte';
      return res.redirect('/admin/users');
    }

    // Récupérer l'utilisateur
    const users = await executeQuery('SELECT pseudo, email FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      req.session.error = 'Utilisateur non trouvé';
      return res.redirect('/admin/users');
    }

    const user = users[0];

    // Supprimer l'utilisateur
    await executeQuery('DELETE FROM users WHERE id = ?', [userId]);

    await logUserAction('user_deleted', `Utilisateur supprimé: ${user.pseudo} (${user.email})`, req, {
      deletedUserId: userId,
      deletedUserEmail: user.email,
      deletedBy: req.session.user.pseudo
    });

    req.session.success = `Utilisateur ${user.pseudo} supprimé avec succès`;
    res.redirect('/admin/users');

  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    logError('admin_user_delete_error', `Erreur lors de la suppression de l\'utilisateur: ${error.message}`, req, {
      targetUserId: req.params.id,
      deletedBy: req.session.user.pseudo
    });
    req.session.error = 'Erreur lors de la suppression de l\'utilisateur';
    res.redirect('/admin/users');
  }
});

// API pour récupérer les logs avec filtres
router.get('/api/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      level: req.query.level,
      userId: req.query.userId,
      sessionId: req.query.sessionId,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0
    };
    const logs = await getLogs(filters);
    res.json(logs);
  } catch (error) {
    console.error('Erreur API logs:', error);
    logError('api_logs_fetch_error', `Erreur API lors de la récupération des logs: ${error.message}`, req);
    res.status(500).json({ error: 'Erreur lors de la récupération des logs' });
  }
});

module.exports = router;
