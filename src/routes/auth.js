const express = require('express');
const bcrypt = require('bcrypt');
const { executeQuery } = require('../config/database');
const { redirectIfAuthenticated } = require('../middleware/auth');

const router = express.Router();

// Page de connexion
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('login', {
    title: 'Connexion',
    error: req.session.error || null,
    success: req.session.success || null
  });
  
  // Nettoyer les messages après affichage
  delete req.session.error;
  delete req.session.success;
});

// Traitement de la connexion
router.post('/login', redirectIfAuthenticated, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validation des données
    if (!email || !password) {
      req.session.error = 'Veuillez remplir tous les champs';
      return res.redirect('/auth/login');
    }

    // Rechercher l'utilisateur dans la base de données
    const users = await executeQuery(
      'SELECT id, email, password, pseudo FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      req.session.error = 'Email ou mot de passe incorrect';
      return res.redirect('/auth/login');
    }

    const user = users[0];

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      req.session.error = 'Email ou mot de passe incorrect';
      return res.redirect('/auth/login');
    }

    // Créer la session utilisateur
    req.session.user = {
      id: user.id,
      email: user.email,
      pseudo: user.pseudo
    };

    req.session.success = `Bienvenue, ${user.pseudo} !`;
    res.redirect('/dashboard');

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    req.session.error = 'Une erreur s\'est produite lors de la connexion';
    res.redirect('/auth/login');
  }
});

// Déconnexion
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
    }
    res.redirect('/auth/login');
  });
});

// Route pour créer un compte (optionnel, pour les administrateurs)
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('register', {
    title: 'Créer un compte',
    error: req.session.error || null,
    success: req.session.success || null
  });
  
  delete req.session.error;
  delete req.session.success;
});

router.post('/register', redirectIfAuthenticated, async (req, res) => {
  const { email, password, confirmPassword, pseudo } = req.body;

  try {
    // Validation des données
    if (!email || !password || !confirmPassword || !pseudo) {
      req.session.error = 'Veuillez remplir tous les champs';
      return res.redirect('/auth/register');
    }

    if (password !== confirmPassword) {
      req.session.error = 'Les mots de passe ne correspondent pas';
      return res.redirect('/auth/register');
    }

    if (password.length < 6) {
      req.session.error = 'Le mot de passe doit contenir au moins 6 caractères';
      return res.redirect('/auth/register');
    }

    // Vérifier si l'email existe déjà
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      req.session.error = 'Cet email est déjà utilisé';
      return res.redirect('/auth/register');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    await executeQuery(
      'INSERT INTO users (email, password, pseudo) VALUES (?, ?, ?)',
      [email, hashedPassword, pseudo]
    );

    req.session.success = 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.';
    res.redirect('/auth/login');

  } catch (error) {
    console.error('Erreur lors de la création du compte:', error);
    req.session.error = 'Une erreur s\'est produite lors de la création du compte';
    res.redirect('/auth/register');
  }
});

module.exports = router;
