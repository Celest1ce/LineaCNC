const express = require('express');
const bcrypt = require('bcrypt');
const { executeQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const {
  logUserAction,
  logError
} = require('../utils/logging');
const {
  updatePseudoSchema,
  changePasswordSchema,
  machineSchema
} = require('../validation/schemas');

const router = express.Router();

// Page d'accueil - redirige vers login ou dashboard
router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/auth/login');
  }
});

// Dashboard principal
router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', {
    title: 'Tableau de bord',
    user: req.session.user,
    success: req.session.success || null,
    error: req.session.error || null
  });
  
  // Nettoyer les messages après affichage
  delete req.session.success;
  delete req.session.error;
});

// Page des paramètres du compte
router.get('/account', requireAuth, (req, res) => {
  res.render('account', {
    title: 'Paramètres du compte',
    user: req.session.user,
    success: req.session.success || null,
    error: req.session.error || null
  });

  delete req.session.success;
  delete req.session.error;
});

// Outil Mesh Viewer
router.get('/tools/mesh-viewer', requireAuth, (req, res) => {
  res.render('tools/mesh-viewer', {
    title: 'Mesh Viewer',
    user: req.session.user,
    success: req.session.success || null,
    error: req.session.error || null
  });

  delete req.session.success;
  delete req.session.error;
});

// Mise à jour du pseudo
router.post('/account/update-pseudo', requireAuth, async (req, res) => {
  const { error: validationError, value } = updatePseudoSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (validationError) {
    req.session.error = 'Le pseudo doit contenir entre 2 et 100 caractères.';
    return res.redirect('/account');
  }

  const { pseudo } = value;
  const userId = req.session.user.id;

  try {
    await executeQuery(
      'UPDATE users SET pseudo = ? WHERE id = ?',
      [pseudo.trim(), userId]
    );

    req.session.user.pseudo = pseudo.trim();
    req.session.success = 'Pseudo mis à jour avec succès !';
    await logUserAction('update_pseudo_success', `Pseudo mis à jour pour l'utilisateur ${userId}`, req, {
      userId
    });
    res.redirect('/account');

  } catch (error) {
    console.error('Erreur lors de la mise à jour du pseudo:', error);
    await logError('update_pseudo_failed', error.message, req, {
      userId
    });
    req.session.error = 'Une erreur s\'est produite lors de la mise à jour';
    res.redirect('/account');
  }
});

// Changement de mot de passe
router.post('/account/change-password', requireAuth, async (req, res) => {
  const { error: validationError, value } = changePasswordSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (validationError) {
    req.session.error = 'Veuillez vérifier les informations de mot de passe.';
    return res.redirect('/account');
  }

  const { currentPassword, newPassword, confirmPassword } = value;
  const userId = req.session.user.id;

  try {
    if (newPassword !== confirmPassword) {
      req.session.error = 'Les nouveaux mots de passe ne correspondent pas';
      return res.redirect('/account');
    }

    const users = await executeQuery(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      req.session.error = 'Utilisateur non trouvé';
      return res.redirect('/account');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      req.session.error = 'Mot de passe actuel incorrect';
      return res.redirect('/account');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    await executeQuery(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, userId]
    );

    req.session.success = 'Mot de passe modifié avec succès !';
    await logUserAction('password_changed', `Mot de passe modifié pour l'utilisateur ${userId}`, req, {
      userId
    });
    res.redirect('/account');

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    await logError('password_change_failed', error.message, req, {
      userId
    });
    req.session.error = 'Une erreur s\'est produite lors du changement de mot de passe';
    res.redirect('/account');
  }
});

// API - Sauvegarder une machine
router.post('/api/machines', requireAuth, async (req, res) => {
  try {
    const { error: validationError, value } = machineSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (validationError) {
      return res.status(400).json({ error: 'Données machine invalides.' });
    }

    const { uuid, name, baudRate, port } = value;
    const userId = req.session.user.id;

    const existing = await executeQuery(
      'SELECT id FROM machines WHERE uuid = ? AND user_id = ?',
      [uuid, userId]
    );

    if (existing.length > 0) {
      await executeQuery(
        'UPDATE machines SET name = ?, baud_rate = ?, last_port = ?, updated_at = NOW() WHERE uuid = ? AND user_id = ?',
        [name, baudRate || 115200, port, uuid, userId]
      );
      await logUserAction('machine_updated', `Machine ${uuid} mise à jour`, req, {
        userId,
        uuid
      });
      return res.json({ success: true, message: 'Machine mise à jour' });
    }

    await executeQuery(
      'INSERT INTO machines (user_id, uuid, name, baud_rate, last_port) VALUES (?, ?, ?, ?, ?)',
      [userId, uuid, name, baudRate || 115200, port]
    );
    await logUserAction('machine_created', `Machine ${uuid} créée`, req, {
      userId,
      uuid
    });
    return res.json({ success: true, message: 'Machine enregistrée' });
  } catch (error) {
    console.error('Erreur sauvegarde machine:', error);
    await logError('machine_save_failed', error.message, req);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde' });
  }
});

// API - Récupérer les machines de l'utilisateur
router.get('/api/machines', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const machines = await executeQuery(
      'SELECT id, uuid, name, baud_rate, last_port, created_at, updated_at FROM machines WHERE user_id = ?',
      [userId]
    );
    res.json(machines);
  } catch (error) {
    console.error('Erreur récupération machines:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

// API - Supprimer une machine
router.delete('/api/machines/:uuid', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { uuid } = req.params;

    const result = await executeQuery(
      'DELETE FROM machines WHERE uuid = ? AND user_id = ?',
      [uuid, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Machine non trouvée' });
    }

    await logUserAction('machine_deleted', `Machine ${uuid} supprimée`, req, {
      userId,
      uuid
    });
    res.json({ success: true, message: 'Machine supprimée' });
  } catch (error) {
    console.error('Erreur suppression machine:', error);
    await logError('machine_delete_failed', error.message, req);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

module.exports = router;

