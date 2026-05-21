const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { executeQuery } = require('../config/database');
const { redirectIfAuthenticated, requireAuth } = require('../middleware/auth');
const {
  logAuth,
  logSecurity,
  logError,
  createSessionLog,
  closeSessionLog
} = require('../utils/logging');
const { loginSchema, registerSchema } = require('../validation/schemas');

const router = express.Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    req.session.error = 'Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes.';
    logSecurity('login_rate_limited', 'Trop de tentatives de connexion détectées', req);
    return res.redirect('/auth/login');
  }
});

// Page de connexion
router.get('/login', redirectIfAuthenticated, (req, res) => {
  const error = req.session.error || null;
  const success = req.session.success || null;
  
  // Nettoyer les messages avant l'affichage
  delete req.session.error;
  delete req.session.success;
  
  res.render('login', {
    title: 'Connexion',
    error: error,
    success: success
  });
});

// Traitement de la connexion
router.post('/login', redirectIfAuthenticated, loginLimiter, async (req, res) => {
  const { error: validationError, value } = loginSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (validationError) {
    req.session.error = 'Email ou mot de passe invalide.';
    return res.redirect('/auth/login');
  }

  const { email, password } = value;

  try {
    // Rechercher l'utilisateur dans la base de données
    const users = await executeQuery(
      `SELECT id, email, password, pseudo, role, status, failed_attempts, locked_until
       FROM users WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      req.session.error = 'Email ou mot de passe incorrect';
      await logSecurity('login_failed_unknown_user', `Tentative de connexion avec email inconnu: ${email}`, req);
      return res.redirect('/auth/login');
    }

    const user = users[0];

    if (user.status !== 'active') {
      req.session.error = 'Ce compte est désactivé. Contactez le support.';
      await logSecurity('login_blocked_status', `Connexion bloquée pour ${email} (statut: ${user.status})`, req, {
        userId: user.id,
        status: user.status
      });
      return res.redirect('/auth/login');
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      req.session.error = `Compte verrouillé suite à des tentatives échouées. Réessayez après ${new Date(user.locked_until).toLocaleTimeString('fr-FR')}`;
      await logSecurity('login_locked', `Tentative de connexion durant verrouillage pour ${email}`, req, {
        userId: user.id,
        lockedUntil: user.locked_until
      });
      return res.redirect('/auth/login');
    }

    // Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      const failedAttempts = (user.failed_attempts || 0) + 1;
      const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
      const lockUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60000) : null;

      await executeQuery(
        'UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?',
        [shouldLock ? 0 : failedAttempts, shouldLock ? lockUntil : null, user.id]
      );

      req.session.error = shouldLock
        ? `Trop de tentatives. Votre compte est verrouillé ${LOCK_DURATION_MINUTES} minutes.`
        : 'Email ou mot de passe incorrect';

      await logSecurity('login_failed_invalid_password', `Mot de passe invalide pour ${email}`, req, {
        userId: user.id,
        failedAttempts,
        lockedUntil: lockUntil ? lockUntil.toISOString() : null
      });
      return res.redirect('/auth/login');
    }

    await executeQuery(
      'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
      [user.id]
    );

    // Créer la session utilisateur
    req.session.user = {
      id: user.id,
      email: user.email,
      pseudo: user.pseudo,
      role: user.role
    };

    // Sauvegarder la session explicitement
    req.session.success = `Bienvenue, ${user.pseudo} !`;
    const sessionId = req.sessionID;

    req.session.save((err) => {
      if (err) {
        console.error('❌ Erreur sauvegarde session:', err);
        req.session.error = 'Erreur de session';
        return res.redirect('/auth/login');
      }

      createSessionLog(user.id, sessionId, req)
        .catch((logErr) => {
          console.error('❌ Erreur journalisation session:', logErr.message);
        })
        .finally(() => {
          logAuth('login_success', `Connexion réussie pour ${user.email}`, req, {
            userId: user.id,
            sessionId
          });
          res.redirect('/dashboard');
        });
    });

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    await logError('login_unhandled_error', error.message, req, {
      email
    });
    req.session.error = 'Une erreur s\'est produite lors de la connexion';
    res.redirect('/auth/login');
  }
});

// Déconnexion
router.post('/logout', requireAuth, async (req, res) => {
  const sessionId = req.sessionID;
  const user = req.session.user;

  await closeSessionLog(sessionId, req);
  await logAuth('logout', `Déconnexion de l'utilisateur ${user.email}`, req, {
    userId: user.id,
    sessionId
  });

  req.session.destroy((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
    }
    res.clearCookie('lineacnc.sid');
    res.redirect('/auth/login');
  });
});

// Route pour créer un compte (optionnel)
router.get('/register', redirectIfAuthenticated, (req, res) => {
  const error = req.session.error || null;
  const success = req.session.success || null;
  
  // Nettoyer les messages avant l'affichage
  delete req.session.error;
  delete req.session.success;
  
  res.render('register', {
    title: 'Créer un compte',
    error: error,
    success: success
  });
});

router.post('/register', redirectIfAuthenticated, async (req, res) => {
  const { error: validationError, value } = registerSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (validationError) {
    req.session.error = 'Veuillez vérifier les informations saisies.';
    return res.redirect('/auth/register');
  }

  const { email, password, confirmPassword, pseudo } = value;

  try {
    if (password !== confirmPassword) {
      req.session.error = 'Les mots de passe ne correspondent pas';
      return res.redirect('/auth/register');
    }

    // Vérifier si l'email existe déjà
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      req.session.error = 'Cet email est déjà utilisé';
      await logSecurity('register_email_exists', `Tentative d\'inscription avec email existant: ${email}`, req);
      return res.redirect('/auth/register');
    }

    const existingPseudo = await executeQuery(
      'SELECT id FROM users WHERE pseudo = ?',
      [pseudo]
    );

    if (existingPseudo.length > 0) {
      req.session.error = 'Ce pseudo est déjà utilisé';
      await logSecurity('register_pseudo_exists', `Tentative d\'inscription avec pseudo existant: ${pseudo}`, req);
      return res.redirect('/auth/register');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    await executeQuery(
      'INSERT INTO users (email, password, pseudo, role, status) VALUES (?, ?, ?, ?, ?)',
      [email, hashedPassword, pseudo, 'user', 'active']
    );

    req.session.success = 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.';
    await logAuth('register_success', `Nouvel utilisateur créé: ${email}`, req);
    res.redirect('/auth/login');

  } catch (error) {
    console.error('Erreur lors de la création du compte:', error);
    await logError('register_unhandled_error', error.message, req, {
      email
    });
    req.session.error = 'Une erreur s\'est produite lors de la création du compte';
    res.redirect('/auth/register');
  }
});

module.exports = router;
