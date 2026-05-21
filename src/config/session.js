const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { dbConfig } = require('./database');

function assertSessionSecret() {
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET doit être défini dans les variables d\'environnement.');
  }
}

function createSessionMiddleware() {
  assertSessionSecret();

  let store = null;

  if (process.env.SESSION_STORE !== 'memory') {
    try {
      store = new MySQLStore(
        {
          ...dbConfig,
          createDatabaseTable: true,
          schema: {
            tableName: process.env.SESSION_TABLE || 'sessions'
          }
        }
      );

      store.on('error', (error) => {
        console.error('❌ Erreur du store de session MySQL:', error.message);
      });
    } catch (error) {
      console.error('❌ Impossible d\'initialiser le store MySQL pour les sessions:', error.message);
      console.warn('⚠️ Retour au store mémoire. Configurez les variables DB_* ou définissez SESSION_STORE=memory.');
      store = null;
    }
  }

  const secureCookies = process.env.NODE_ENV === 'production';

  return session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store || undefined,
    cookie: {
      secure: secureCookies,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: secureCookies ? 'strict' : 'lax'
    },
    name: 'lineacnc.sid'
  });
}

module.exports = {
  createSessionMiddleware
};
