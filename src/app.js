const express = require('express');
const path = require('path');
const helmet = require('helmet');
const csrf = require('csurf');

const { createSessionMiddleware } = require('./config/session');
const { requestLogger, errorLogger } = require('./middleware/logging');
const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/app');
const { getCacheHeader } = require('./config/assets');

function createApp(options = {}) {
  const {
    enableCsrf = true,
    sessionMiddleware = createSessionMiddleware(),
    csrfTokenValue = null
  } = options;

  const app = express();

  app.use(helmet({
    contentSecurityPolicy: false
  }));

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(sessionMiddleware);
  app.use(requestLogger);
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(
    '/assets',
    (req, res, next) => {
      let assetType = 'images';
      if (req.path.startsWith('/fonts')) assetType = 'fonts';
      else if (req.path.startsWith('/documents')) assetType = 'documents';
      else if (req.path.startsWith('/downloads')) assetType = 'downloads';

      res.set('Cache-Control', getCacheHeader(assetType));
      next();
    },
    express.static(path.join(__dirname, '../public/assets'))
  );

  app.use(express.static(path.join(__dirname, '../public')));

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  const csrfProtection = enableCsrf ? csrf() : (req, res, next) => {
    req.csrfToken = () => csrfTokenValue || 'test-token';
    next();
  };

  app.use(csrfProtection);

  app.use((req, res, next) => {
    res.locals.csrfToken = enableCsrf
      ? req.csrfToken()
      : csrfTokenValue || 'test-token';
    res.locals.user = req.session.user || null;
    res.locals.isAuthenticated = !!req.session.user;
    next();
  });

  app.use('/auth', authRoutes);
  app.use('/', appRoutes);

  app.use((req, res) => {
    res.status(404).render('404', {
      title: 'Page non trouvée',
      message: 'La page que vous recherchez n\'existe pas.'
    });
  });

  app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
      console.warn('⚠️ Jeton CSRF invalide détecté');
      if (req.accepts('json')) {
        return res
          .status(403)
          .json({ error: 'Jeton CSRF invalide. Veuillez recharger la page.' });
      }
      return res.status(403).render('error', {
        title: 'Action non autorisée',
        message: 'La vérification de sécurité a échoué. Veuillez réessayer.'
      });
    }
    return next(err);
  });

  app.use(errorLogger);

  app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err.message);
    res.status(500).render('error', {
      title: 'Erreur serveur',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Une erreur interne s\'est produite.'
          : err.message
    });
  });

  return app;
}

module.exports = { createApp };
