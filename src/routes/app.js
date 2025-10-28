const express = require('express');
const bcrypt = require('bcrypt');
const { executeQuery } = require('../config/database');
const { requireAuth } = require('../middleware/auth');

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

// Mise à jour du pseudo
router.post('/account/update-pseudo', requireAuth, async (req, res) => {
  const { pseudo } = req.body;
  const userId = req.session.user.id;

  try {
    if (!pseudo || pseudo.trim().length < 2) {
      req.session.error = 'Le pseudo doit contenir au moins 2 caractères';
      return res.redirect('/account');
    }

    // Mettre à jour le pseudo dans la base de données
    await executeQuery(
      'UPDATE users SET pseudo = ? WHERE id = ?',
      [pseudo.trim(), userId]
    );

    // Mettre à jour la session
    req.session.user.pseudo = pseudo.trim();

    req.session.success = 'Pseudo mis à jour avec succès !';
    res.redirect('/account');

  } catch (error) {
    console.error('Erreur lors de la mise à jour du pseudo:', error);
    req.session.error = 'Une erreur s\'est produite lors de la mise à jour';
    res.redirect('/account');
  }
});

// Changement de mot de passe
router.post('/account/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.user.id;

  try {
    // Validation des données
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.session.error = 'Veuillez remplir tous les champs';
      return res.redirect('/account');
    }

    if (newPassword !== confirmPassword) {
      req.session.error = 'Les nouveaux mots de passe ne correspondent pas';
      return res.redirect('/account');
    }

    if (newPassword.length < 6) {
      req.session.error = 'Le nouveau mot de passe doit contenir au moins 6 caractères';
      return res.redirect('/account');
    }

    // Récupérer le mot de passe actuel
    const users = await executeQuery(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      req.session.error = 'Utilisateur non trouvé';
      return res.redirect('/account');
    }

    // Vérifier le mot de passe actuel
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      req.session.error = 'Mot de passe actuel incorrect';
      return res.redirect('/account');
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await executeQuery(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedNewPassword, userId]
    );

    req.session.success = 'Mot de passe modifié avec succès !';
    res.redirect('/account');

  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    req.session.error = 'Une erreur s\'est produite lors du changement de mot de passe';
    res.redirect('/account');
  }
});

module.exports = router;

