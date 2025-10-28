const { executeQuery } = require('../config/database');

/**
 * Système de logging en base de données
 * Architecture évolutive avec différents types et niveaux de logs
 */

// Types de logs disponibles
const LOG_TYPES = {
  AUTH: 'auth',           // Authentification (login, logout, register)
  ACCESS: 'access',       // Accès aux pages et ressources
  ERROR: 'error',         // Erreurs système et application
  SECURITY: 'security',   // Tentatives d'intrusion, violations de sécurité
  SYSTEM: 'system',       // Logs système (démarrage, arrêt, maintenance)
  USER_ACTION: 'user_action', // Actions utilisateur (modification profil, etc.)
  API: 'api'              // Appels API et requêtes externes
};

// Niveaux de logs
const LOG_LEVELS = {
  DEBUG: 'debug',         // Informations de débogage
  INFO: 'info',           // Informations générales
  WARN: 'warn',           // Avertissements
  ERROR: 'error',         // Erreurs
  CRITICAL: 'critical'   // Erreurs critiques
};

/**
 * Enregistre un log en base de données
 * @param {Object} logData - Données du log
 * @param {string} logData.type - Type de log (LOG_TYPES)
 * @param {string} logData.level - Niveau de log (LOG_LEVELS)
 * @param {string} logData.action - Action effectuée
 * @param {string} logData.description - Description détaillée
 * @param {Object} logData.context - Contexte de la requête (req)
 * @param {Object} logData.metadata - Métadonnées supplémentaires
 */
async function logToDatabase(logData) {
  try {
    const {
      type = LOG_TYPES.SYSTEM,
      level = LOG_LEVELS.INFO,
      action,
      description,
      context = {},
      metadata = {}
    } = logData;

    // Extraire les informations du contexte
    const userId = context.session?.user?.id || null;
    const sessionId = context.sessionID || null;
    const ipAddress = context.ip || context.connection?.remoteAddress || 
                     context.headers?.['x-forwarded-for'] || null;
    const userAgent = context.headers?.['user-agent'] || null;
    const requestMethod = context.method || null;
    const requestPath = context.path || context.url || null;
    const responseStatus = context.status || null;
    const durationMs = context.duration || null;

    // Préparer les métadonnées JSON
    const metadataJson = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;

    // Insérer le log en base
    const query = `
      INSERT INTO logs (
        log_type, log_level, user_id, session_id, action, description,
        ip_address, user_agent, request_method, request_path, 
        response_status, duration_ms, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await executeQuery(query, [
      type,
      level,
      userId,
      sessionId,
      action,
      description,
      ipAddress,
      userAgent,
      requestMethod,
      requestPath,
      responseStatus,
      durationMs,
      metadataJson
    ]);

    // Log console pour le développement
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()} [${type}] ${action}: ${description}`;
    
    switch (level) {
      case LOG_LEVELS.DEBUG:
        console.debug('🐛', logMessage);
        break;
      case LOG_LEVELS.INFO:
        console.log('📊', logMessage);
        break;
      case LOG_LEVELS.WARN:
        console.warn('⚠️', logMessage);
        break;
      case LOG_LEVELS.ERROR:
        console.error('❌', logMessage);
        break;
      case LOG_LEVELS.CRITICAL:
        console.error('🚨', logMessage);
        break;
      default:
        console.log('📝', logMessage);
    }

  } catch (error) {
    // En cas d'erreur de logging, on log quand même en console
    console.error('❌ Erreur lors de l\'enregistrement du log:', error.message);
    console.error('📝 Log original:', logData);
  }
}

/**
 * Log d'authentification
 */
async function logAuth(action, description, context = {}, metadata = {}) {
  await logToDatabase({
    type: LOG_TYPES.AUTH,
    level: LOG_LEVELS.INFO,
    action,
    description,
    context,
    metadata
  });
}

/**
 * Log d'accès
 */
async function logAccess(action, description, context = {}, metadata = {}) {
  await logToDatabase({
    type: LOG_TYPES.ACCESS,
    level: LOG_LEVELS.INFO,
    action,
    description,
    context,
    metadata
  });
}

/**
 * Log d'erreur
 */
async function logError(action, description, context = {}, metadata = {}) {
  await logToDatabase({
    type: LOG_TYPES.ERROR,
    level: LOG_LEVELS.ERROR,
    action,
    description,
    context,
    metadata
  });
}

/**
 * Log de sécurité
 */
async function logSecurity(action, description, context = {}, metadata = {}) {
  await logToDatabase({
    type: LOG_TYPES.SECURITY,
    level: LOG_LEVELS.WARN,
    action,
    description,
    context,
    metadata
  });
}

/**
 * Log système
 */
async function logSystem(action, description, context = {}, metadata = {}) {
  await logToDatabase({
    type: LOG_TYPES.SYSTEM,
    level: LOG_LEVELS.INFO,
    action,
    description,
    context,
    metadata
  });
}

/**
 * Log d'action utilisateur
 */
async function logUserAction(action, description, context = {}, metadata = {}) {
  await logToDatabase({
    type: LOG_TYPES.USER_ACTION,
    level: LOG_LEVELS.INFO,
    action,
    description,
    context,
    metadata
  });
}

/**
 * Log API
 */
async function logAPI(action, description, context = {}, metadata = {}) {
  await logToDatabase({
    type: LOG_TYPES.API,
    level: LOG_LEVELS.INFO,
    action,
    description,
    context,
    metadata
  });
}

/**
 * Gestion des sessions en base de données
 */
async function createSessionLog(userId, sessionId, context = {}) {
  try {
    const ipAddress = context.ip || context.connection?.remoteAddress || 
                     context.headers?.['x-forwarded-for'] || null;
    const userAgent = context.headers?.['user-agent'] || null;
    const sessionData = context.session ? JSON.stringify(context.session) : null;

    const query = `
      INSERT INTO user_sessions (
        user_id, session_id, ip_address, user_agent, 
        login_time, last_activity, is_active, session_data
      ) VALUES (?, ?, ?, ?, NOW(), NOW(), TRUE, ?)
    `;

    await executeQuery(query, [userId, sessionId, ipAddress, userAgent, sessionData]);
    
    await logAuth('session_created', `Session créée pour l'utilisateur ${userId}`, context, {
      sessionId,
      userId,
      ipAddress
    });

  } catch (error) {
    await logError('session_creation_failed', `Erreur création session: ${error.message}`, context);
  }
}

async function updateSessionActivity(sessionId, context = {}) {
  try {
    const query = `
      UPDATE user_sessions 
      SET last_activity = NOW(), session_data = ?
      WHERE session_id = ? AND is_active = TRUE
    `;

    const sessionData = context.session ? JSON.stringify(context.session) : null;
    await executeQuery(query, [sessionData, sessionId]);

  } catch (error) {
    await logError('session_update_failed', `Erreur mise à jour session: ${error.message}`, context);
  }
}

async function closeSessionLog(sessionId, context = {}) {
  try {
    const query = `
      UPDATE user_sessions 
      SET logout_time = NOW(), is_active = FALSE
      WHERE session_id = ? AND is_active = TRUE
    `;

    const [result] = await executeQuery(query, [sessionId]);
    
    if (result.affectedRows > 0) {
      await logAuth('session_closed', `Session fermée: ${sessionId}`, context, {
        sessionId
      });
    }

  } catch (error) {
    await logError('session_close_failed', `Erreur fermeture session: ${error.message}`, context);
  }
}

/**
 * Récupérer les logs avec filtres
 */
async function getLogs(filters = {}) {
  try {
    let query = `
      SELECT l.*, u.pseudo, u.email 
      FROM logs l 
      LEFT JOIN users u ON l.user_id = u.id 
      WHERE 1=1
    `;
    const params = [];

    // Filtres
    if (filters.type) {
      query += ' AND l.log_type = ?';
      params.push(filters.type);
    }

    if (filters.level) {
      query += ' AND l.log_level = ?';
      params.push(filters.level);
    }

    if (filters.userId) {
      query += ' AND l.user_id = ?';
      params.push(filters.userId);
    }

    if (filters.sessionId) {
      query += ' AND l.session_id = ?';
      params.push(filters.sessionId);
    }

    if (filters.startDate) {
      query += ' AND l.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND l.created_at <= ?';
      params.push(filters.endDate);
    }

    // Tri et limite
    query += ' ORDER BY l.created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    return await executeQuery(query, params);

  } catch (error) {
    console.error('❌ Erreur récupération logs:', error.message);
    return [];
  }
}

module.exports = {
  LOG_TYPES,
  LOG_LEVELS,
  logToDatabase,
  logAuth,
  logAccess,
  logError,
  logSecurity,
  logSystem,
  logUserAction,
  logAPI,
  createSessionLog,
  updateSessionActivity,
  closeSessionLog,
  getLogs
};