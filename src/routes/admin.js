const express = require('express');
const bcrypt = require('bcrypt');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');
const { executeQuery } = require('../config/database');
const { getLogs } = require('../utils/logging');
const { logUserAction, logSecurity } = require('../utils/logging');

const router = express.Router();

// Page d'administration des logs
router.get('/admin/logs', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Récupérer les logs récents (dernières 100 entrées)
    const logs = await getLogs({ limit: 100 });
    
    // Grouper les logs par type pour les statistiques
    const stats = logs.reduce((acc, log) => {
      acc[log.log_type] = (acc[log.log_type] || 0) + 1;
      return acc;
    }, {});

    res.render('admin-logs', {
      title: 'Administration - Logs',
      user: req.session.user,
      logs: logs,
      stats: stats,
      success: req.session.success || null,
      error: req.session.error || null
    });
    
    // Nettoyer les messages après affichage
    delete req.session.success;
    delete req.session.error;
    
  } catch (error) {
    console.error('Erreur récupération logs:', error);
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
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: parseInt(req.query.limit) || 50
    };

    const logs = await getLogs(filters);
    
    res.json({
      success: true,
      logs: logs,
      count: logs.length
    });
    
  } catch (error) {
    console.error('Erreur API logs:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des logs'
    });
  }
});

module.exports = router;
