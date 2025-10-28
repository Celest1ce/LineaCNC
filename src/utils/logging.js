const { executeQuery } = require('../config/database');

/**
 * Enregistre un événement dans la table `logs`.
 * @param {string} level - Niveau de log (e.g., 'INFO', 'WARNING', 'ERROR', 'AUTH', 'SECURITY', 'SYSTEM', 'USER_ACTION').
 * @param {string} type - Type d'événement (e.g., 'login_success', 'session_destroy_failed').
 * @param {string} message - Message descriptif de l'événement.
 * @param {object} req - Objet de requête Express pour extraire les infos utilisateur/session.
 * @param {object} [details={}] - Détails supplémentaires à stocker en JSON.
 */
async function logEvent(level, type, message, req, details = {}) {
  const userId = req.session?.user?.id || null;
  const sessionId = req.sessionID || null;
  const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent']?.substring(0, 255) || null; // Limiter la taille

  try {
    await executeQuery(
      `INSERT INTO logs (level, type, message, user_id, session_id, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [level, type, message, userId, sessionId, ipAddress, userAgent, JSON.stringify(details)]
    );
    // Pour le debug local, on peut aussi logger à la console
    // console.log(`[${level}] [${type}] ${message}`, details);
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement du log en BDD:', error.message);
  }
}

// Fonctions utilitaires pour différents niveaux de log
const logInfo = (type, message, req, details) => logEvent('INFO', type, message, req, details);
const logWarning = (type, message, req, details) => logEvent('WARNING', type, message, req, details);
const logError = (type, message, req, details) => logEvent('ERROR', type, message, req, details);
const logAuth = (type, message, req, details) => logEvent('AUTH', type, message, req, details);
const logSecurity = (type, message, req, details) => logEvent('SECURITY', type, message, req, details);
const logSystem = (type, message, req, details) => logEvent('SYSTEM', type, message, req, details);
const logUserAction = (type, message, req, details) => logEvent('USER_ACTION', type, message, req, details);

/**
 * Crée un log de début de session dans la table user_sessions.
 * @param {number} userId - ID de l'utilisateur.
 * @param {string} sessionId - ID de la session.
 * @param {object} req - Objet de requête Express.
 */
async function createSessionLog(userId, sessionId, req) {
  const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent']?.substring(0, 255) || null;

  try {
    await executeQuery(
      'INSERT INTO user_sessions (session_id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [sessionId, userId, ipAddress, userAgent]
    );
    await logAuth('session_start', `Session démarrée pour l'utilisateur ${userId}`, req, {
      userId,
      sessionId,
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création du log de session en BDD:', error.message);
    await logError('session_log_creation_failed', `Erreur création log session: ${error.message}`, req, {
      userId,
      sessionId
    });
  }
}

/**
 * Met à jour un log de fin de session dans la table user_sessions.
 * @param {string} sessionId - ID de la session.
 * @param {object} req - Objet de requête Express.
 */
async function closeSessionLog(sessionId, req) {
  try {
    const [sessionRows] = await executeQuery(
      'SELECT login_time FROM user_sessions WHERE session_id = ?',
      [sessionId]
    );

    if (sessionRows.length > 0) {
      const loginTime = new Date(sessionRows[0].login_time);
      const logoutTime = new Date();
      const durationMinutes = Math.round((logoutTime - loginTime) / (1000 * 60));

      await executeQuery(
        'UPDATE user_sessions SET logout_time = ?, duration_minutes = ? WHERE session_id = ?',
        [logoutTime, durationMinutes, sessionId]
      );
      await logAuth('session_end', `Session terminée pour l'utilisateur ${req.session?.user?.id || 'inconnu'}`, req, {
        userId: req.session?.user?.id || null,
        sessionId,
        logoutTime: logoutTime.toISOString(),
        durationMinutes
      });
    } else {
      await logWarning('session_not_found_for_close', `Tentative de fermer une session inexistante: ${sessionId}`, req);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour du log de session en BDD:', error.message);
    await logError('session_log_update_failed', `Erreur mise à jour log session: ${error.message}`, req, {
      sessionId
    });
  }
}

/**
 * Récupère les logs de la base de données avec des options de filtrage.
 * @param {object} options - Options de filtrage (type, level, userId, sessionId, limit, offset).
 * @returns {Array} - Liste des logs.
 */
async function getLogs(options = {}) {
  let query = 'SELECT * FROM logs WHERE 1=1';
  const params = [];

  if (options.type) {
    query += ' AND type = ?';
    params.push(options.type);
  }
  if (options.level) {
    query += ' AND level = ?';
    params.push(options.level);
  }
  if (options.userId) {
    query += ' AND user_id = ?';
    params.push(options.userId);
  }
  if (options.sessionId) {
    query += ' AND session_id = ?';
    params.push(options.sessionId);
  }

  query += ' ORDER BY timestamp DESC';

  if (options.limit) {
    query += ' LIMIT ?';
    params.push(parseInt(options.limit));
  }
  if (options.offset) {
    query += ' OFFSET ?';
    params.push(parseInt(options.offset));
  }

  return executeQuery(query, params);
}

module.exports = {
  logInfo,
  logWarning,
  logError,
  logAuth,
  logSecurity,
  logSystem,
  logUserAction,
  createSessionLog,
  closeSessionLog,
  getLogs
};
