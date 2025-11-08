const express = require('express');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { executeQuery, getConnection } = require('../config/database');
const { requireAuth } = require('../middleware/auth');
const {
  logUserAction,
  logError,
  logSecurity
} = require('../utils/logging');
const {
  updatePseudoSchema,
  changePasswordSchema,
  machineSchema
} = require('../validation/schemas');
const {
  DEFAULT_INFO_COMMANDS,
  normalizeInfoCommands,
  parseInfoCommands,
  normalizeParameterName,
  inferDataType,
  normalizeValueForType
} = require('../utils/machine-info');

function extractNumericValues(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? [value] : [];
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    const normalized = trimmed.replace(/,/g, '.');
    try {
      const parsed = JSON.parse(normalized);
      return extractNumericValues(parsed);
    } catch (error) {
      const matches = normalized.match(/-?\d+(?:\.\d+)?/g);
      if (!matches) {
        return [];
      }
      return matches
        .map((token) => parseFloat(token))
        .filter((num) => Number.isFinite(num));
    }
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => extractNumericValues(item))
      .filter((num) => Number.isFinite(num));
  }

  if (typeof value === 'object') {
    return Object.values(value)
      .flatMap((item) => extractNumericValues(item))
      .filter((num) => Number.isFinite(num));
  }

  return [];
}

function computeWorkspaceFromParameters(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const workspace = {
    xMin: null,
    xMax: null,
    yMin: null,
    yMax: null,
    width: null,
    depth: null,
    originX: null,
    originY: null
  };

  rows.forEach((row) => {
    const name = typeof row.parameter_name === 'string' ? row.parameter_name.toLowerCase() : '';
    if (!name) {
      return;
    }

    const values = extractNumericValues(row.normalized_value ?? row.raw_value);
    if (values.length === 0) {
      return;
    }

    const firstValue = values[0];

    if (/bed_size_x|build_volume_x|work_size_x|workarea_x|x_size/.test(name)) {
      if (!Number.isFinite(workspace.width)) {
        workspace.width = firstValue;
      }
      return;
    }

    if (/bed_size_y|build_volume_y|work_size_y|workarea_y|y_size/.test(name)) {
      if (!Number.isFinite(workspace.depth)) {
        workspace.depth = firstValue;
      }
      return;
    }

    if (/bed_min_x|mesh_min_x|probe_min_x|work_min_x|x_min/.test(name)) {
      if (!Number.isFinite(workspace.xMin)) {
        workspace.xMin = firstValue;
      }
      return;
    }

    if (/bed_max_x|mesh_max_x|probe_max_x|work_max_x|x_max/.test(name)) {
      if (!Number.isFinite(workspace.xMax)) {
        workspace.xMax = firstValue;
      }
      return;
    }

    if (/bed_min_y|mesh_min_y|probe_min_y|work_min_y|y_min/.test(name)) {
      if (!Number.isFinite(workspace.yMin)) {
        workspace.yMin = firstValue;
      }
      return;
    }

    if (/bed_max_y|mesh_max_y|probe_max_y|work_max_y|y_max/.test(name)) {
      if (!Number.isFinite(workspace.yMax)) {
        workspace.yMax = firstValue;
      }
      return;
    }

    if (/bed_origin_x|origin_x|work_origin_x|x_origin/.test(name)) {
      if (!Number.isFinite(workspace.originX)) {
        workspace.originX = firstValue;
      }
      return;
    }

    if (/bed_origin_y|origin_y|work_origin_y|y_origin/.test(name)) {
      if (!Number.isFinite(workspace.originY)) {
        workspace.originY = firstValue;
      }
      return;
    }

    if (/bed_size|build_volume|work_size|bed_dimensions|print_area|build_area/.test(name) && values.length >= 2) {
      if (!Number.isFinite(workspace.width)) {
        workspace.width = values[0];
      }
      if (!Number.isFinite(workspace.depth)) {
        workspace.depth = values[1];
      }
      if (values.length >= 4) {
        if (!Number.isFinite(workspace.xMin)) workspace.xMin = values[0];
        if (!Number.isFinite(workspace.xMax)) workspace.xMax = values[1];
        if (!Number.isFinite(workspace.yMin)) workspace.yMin = values[2];
        if (!Number.isFinite(workspace.yMax)) workspace.yMax = values[3];
      }
      return;
    }

    if (/bed_limits|work_limits|mesh_limits|probe_area|work_area|bed_area|probe_limits/.test(name) && values.length >= 4) {
      workspace.xMin = Number.isFinite(workspace.xMin) ? workspace.xMin : values[0];
      workspace.xMax = Number.isFinite(workspace.xMax) ? workspace.xMax : values[1];
      workspace.yMin = Number.isFinite(workspace.yMin) ? workspace.yMin : values[2];
      workspace.yMax = Number.isFinite(workspace.yMax) ? workspace.yMax : values[3];
      return;
    }

    if (/x_range|probe_x_range|mesh_x_range/.test(name) && values.length >= 2) {
      if (!Number.isFinite(workspace.xMin)) workspace.xMin = values[0];
      if (!Number.isFinite(workspace.xMax)) workspace.xMax = values[1];
      return;
    }

    if (/y_range|probe_y_range|mesh_y_range/.test(name) && values.length >= 2) {
      if (!Number.isFinite(workspace.yMin)) workspace.yMin = values[0];
      if (!Number.isFinite(workspace.yMax)) workspace.yMax = values[1];
    }
  });

  if (!Number.isFinite(workspace.xMin) && Number.isFinite(workspace.originX)) {
    workspace.xMin = workspace.originX;
  }

  if (!Number.isFinite(workspace.yMin) && Number.isFinite(workspace.originY)) {
    workspace.yMin = workspace.originY;
  }

  if (!Number.isFinite(workspace.xMax) && Number.isFinite(workspace.xMin) && Number.isFinite(workspace.width)) {
    workspace.xMax = workspace.xMin + workspace.width;
  }

  if (!Number.isFinite(workspace.xMin) && Number.isFinite(workspace.xMax) && Number.isFinite(workspace.width)) {
    workspace.xMin = workspace.xMax - workspace.width;
  }

  if (!Number.isFinite(workspace.yMax) && Number.isFinite(workspace.yMin) && Number.isFinite(workspace.depth)) {
    workspace.yMax = workspace.yMin + workspace.depth;
  }

  if (!Number.isFinite(workspace.yMin) && Number.isFinite(workspace.yMax) && Number.isFinite(workspace.depth)) {
    workspace.yMin = workspace.yMax - workspace.depth;
  }

  if (Number.isFinite(workspace.xMin) && Number.isFinite(workspace.xMax) && workspace.xMin > workspace.xMax) {
    const temp = workspace.xMin;
    workspace.xMin = workspace.xMax;
    workspace.xMax = temp;
  }

  if (Number.isFinite(workspace.yMin) && Number.isFinite(workspace.yMax) && workspace.yMin > workspace.yMax) {
    const temp = workspace.yMin;
    workspace.yMin = workspace.yMax;
    workspace.yMax = temp;
  }

  if (!Number.isFinite(workspace.width) && Number.isFinite(workspace.xMin) && Number.isFinite(workspace.xMax)) {
    workspace.width = workspace.xMax - workspace.xMin;
  }

  if (!Number.isFinite(workspace.depth) && Number.isFinite(workspace.yMin) && Number.isFinite(workspace.yMax)) {
    workspace.depth = workspace.yMax - workspace.yMin;
  }

  if (Number.isFinite(workspace.width) && workspace.width < 0) {
    workspace.width = Math.abs(workspace.width);
  }

  if (Number.isFinite(workspace.depth) && workspace.depth < 0) {
    workspace.depth = Math.abs(workspace.depth);
  }

  const hasXRange = Number.isFinite(workspace.xMin) && Number.isFinite(workspace.xMax);
  const hasYRange = Number.isFinite(workspace.yMin) && Number.isFinite(workspace.yMax);

  if (!hasXRange && !hasYRange) {
    return null;
  }

  return workspace;
}

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

// Page Mesh viewer
router.get('/tools/mesh-viewer', requireAuth, (req, res) => {
  res.render('mesh-viewer', {
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
    const trimmedPseudo = pseudo.trim();

    const duplicates = await executeQuery(
      'SELECT id FROM users WHERE pseudo = ? AND id <> ?',
      [trimmedPseudo, userId]
    );

    if (duplicates.length > 0) {
      req.session.error = 'Ce pseudo est déjà utilisé par un autre compte.';
      await logSecurity('update_pseudo_duplicate', `Pseudo déjà utilisé: ${trimmedPseudo}`, req, {
        userId,
        conflictWith: duplicates[0].id
      });
      return res.redirect('/account');
    }

    await executeQuery(
      'UPDATE users SET pseudo = ? WHERE id = ?',
      [trimmedPseudo, userId]
    );

    req.session.user.pseudo = trimmedPseudo;
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
    const providedCommands = Array.isArray(value.infoCommands) ? value.infoCommands : undefined;
    const normalizedCommands = providedCommands ? normalizeInfoCommands(providedCommands) : null;
    const commandsJson = normalizedCommands ? JSON.stringify(normalizedCommands) : null;
    const commandsForInsert = commandsJson || JSON.stringify(DEFAULT_INFO_COMMANDS);
    const userId = req.session.user.id;

    const existing = await executeQuery(
      'SELECT id FROM machines WHERE uuid = ? AND user_id = ?',
      [uuid, userId]
    );

    if (existing.length > 0) {
      let updateQuery = 'UPDATE machines SET name = ?, baud_rate = ?, last_port = ?';
      const params = [name, baudRate || 115200, port || null];

      if (commandsJson !== null) {
        updateQuery += ', info_commands = ?';
        params.push(commandsJson);
      }

      updateQuery += ', updated_at = NOW() WHERE uuid = ? AND user_id = ?';
      params.push(uuid, userId);

      await executeQuery(updateQuery, params);
      await logUserAction('machine_updated', `Machine ${uuid} mise à jour`, req, {
        userId,
        uuid
      });
      return res.json({
        success: true,
        message: 'Machine mise à jour',
        infoCommands: normalizedCommands || undefined
      });
    }

    await executeQuery(
      'INSERT INTO machines (user_id, uuid, name, baud_rate, last_port, info_commands) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, uuid, name, baudRate || 115200, port || null, commandsForInsert]
    );
    await logUserAction('machine_created', `Machine ${uuid} créée`, req, {
      userId,
      uuid
    });
    return res.json({
      success: true,
      message: 'Machine enregistrée',
      infoCommands: JSON.parse(commandsForInsert)
    });
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
      'SELECT id, uuid, name, baud_rate, last_port, info_commands, info_synced_at, created_at, updated_at FROM machines WHERE user_id = ?',
      [userId]
    );

    const normalizedMachines = machines.map((machine) => {
      const infoCommands = parseInfoCommands(machine.info_commands, { allowEmpty: true });
      const infoSyncedAt = machine.info_synced_at;
      const portDescriptor = machine.last_port || null;

      return {
        id: machine.id,
        uuid: machine.uuid,
        name: machine.name,
        baudRate: machine.baud_rate,
        lastPort: portDescriptor,
        port: portDescriptor,
        infoCommands,
        infoSyncedAt,
        createdAt: machine.created_at,
        updatedAt: machine.updated_at
      };
    });

    res.json(normalizedMachines);
  } catch (error) {
    console.error('Erreur récupération machines:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération' });
  }
});

router.get('/api/machines/:uuid/workspace', requireAuth, async (req, res) => {
  const { uuid } = req.params;
  const userId = req.session.user.id;

  let connection;
  try {
    const machines = await executeQuery(
      'SELECT id FROM machines WHERE uuid = ? AND user_id = ?',
      [uuid, userId]
    );

    if (machines.length === 0) {
      return res.status(404).json({ error: 'Machine non trouvée' });
    }

    const machineId = machines[0].id;
    connection = await getConnection();

    const [batches] = await connection.execute(
      `SELECT batch_id
         FROM machine_info_values
        WHERE machine_id = ?
        ORDER BY captured_at DESC
        LIMIT 1`,
      [machineId]
    );

    if (batches.length === 0) {
      return res.json({ workspace: null });
    }

    const batchId = batches[0].batch_id;

    const [rows] = await connection.execute(
      `SELECT
         p.parameter_name,
         p.normalized_value,
         p.data_type,
         v.raw_value
       FROM machine_info_parameters p
       JOIN machine_info_values v ON v.id = p.info_value_id
       WHERE v.machine_id = ? AND v.batch_id = ?
       ORDER BY v.command_index ASC, v.position ASC, p.parameter_name ASC`,
      [machineId, batchId]
    );

    const workspace = computeWorkspaceFromParameters(rows);
    return res.json({ workspace });
  } catch (error) {
    console.error('Erreur lors de la récupération de la zone de travail de la machine:', error);
    await logError('machine_workspace_fetch_failed', error.message, req, { uuid });
    return res.status(500).json({ error: 'Erreur lors de la récupération de la zone de travail de la machine' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get('/api/machines/:uuid/info', requireAuth, async (req, res) => {
  const { uuid } = req.params;
  const userId = req.session.user.id;

  try {
    const machines = await executeQuery(
      'SELECT id, name, info_commands, info_synced_at FROM machines WHERE uuid = ? AND user_id = ?',
      [uuid, userId]
    );

    if (machines.length === 0) {
      return res.status(404).json({ error: 'Machine non trouvée' });
    }

    const machine = machines[0];
    const infoCommands = parseInfoCommands(machine.info_commands, { allowEmpty: true });

    let connection;

    try {
      connection = await getConnection();

      const [batches] = await connection.execute(
        `SELECT batch_id, MAX(captured_at) AS captured_at
         FROM machine_info_values
         WHERE machine_id = ?
         GROUP BY batch_id
         ORDER BY captured_at DESC
         LIMIT 1`,
        [machine.id]
      );

      if (batches.length === 0) {
        return res.json({
          machine: {
            uuid,
            name: machine.name,
            infoCommands,
            infoSyncedAt: machine.info_synced_at
          },
          syncedAt: null,
          commandResults: []
        });
      }

      const batch = batches[0];

      const [rows] = await connection.execute(
        `SELECT
           v.id,
           v.command,
           v.raw_key,
           v.raw_value,
           v.raw_output,
           v.captured_at,
           v.position,
           v.command_index,
           p.parameter_name,
           p.data_type,
           p.normalized_value
         FROM machine_info_values v
         LEFT JOIN machine_info_parameters p ON p.info_value_id = v.id
         WHERE v.machine_id = ? AND v.batch_id = ?
         ORDER BY v.command_index ASC, v.position ASC, v.id ASC`,
        [machine.id, batch.batch_id]
      );

      const commandMap = new Map();

      rows.forEach((row) => {
        const key = `${row.command_index}:${row.command}`;
        if (!commandMap.has(key)) {
          commandMap.set(key, {
            command: row.command,
            rawOutput: row.raw_output || null,
            capturedAt: row.captured_at,
            commandIndex: row.command_index,
            entries: []
          });
        }

        const group = commandMap.get(key);

        if (!group.rawOutput && row.raw_output) {
          group.rawOutput = row.raw_output;
        }

        group.entries.push({
          id: row.id,
          label: row.raw_key,
          value: row.raw_value,
          position: row.position,
          parameter: row.parameter_name
            ? {
                name: row.parameter_name,
                dataType: row.data_type,
                normalizedValue: row.normalized_value
              }
            : null
        });
      });

      const commandResults = Array.from(commandMap.values())
        .sort((a, b) => a.commandIndex - b.commandIndex)
        .map(({ commandIndex, ...rest }) => rest);

      return res.json({
        machine: {
          uuid,
          name: machine.name,
          infoCommands,
          infoSyncedAt: machine.info_synced_at
        },
        syncedAt: batch.captured_at,
        commandResults
      });
    } catch (error) {
      console.error('Erreur lors de la lecture des informations machine:', error);
      await logError('machine_info_fetch_failed', error.message, req, { uuid });
      return res.status(500).json({ error: 'Erreur lors de la récupération des informations' });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Erreur récupération info machine:', error);
    await logError('machine_info_fetch_failed', error.message, req, { uuid });
    res.status(500).json({ error: 'Erreur lors de la récupération des informations' });
  }
});

router.post('/api/machines/:uuid/info', requireAuth, async (req, res) => {
  const { uuid } = req.params;
  const { commandResults } = req.body || {};
  const userId = req.session.user.id;

  if (!Array.isArray(commandResults) || commandResults.length === 0) {
    return res.status(400).json({ error: 'Aucune donnée fournie' });
  }

  try {
    const machines = await executeQuery(
      'SELECT id FROM machines WHERE uuid = ? AND user_id = ?',
      [uuid, userId]
    );

    if (machines.length === 0) {
      return res.status(404).json({ error: 'Machine non trouvée' });
    }

    const machineId = machines[0].id;
    const connection = await getConnection();
    const batchId = randomUUID();
    const now = new Date();
    let inserted = 0;
    let latestCapture = now;

    try {
      await connection.beginTransaction();

      for (let i = 0; i < commandResults.length; i += 1) {
        const commandResult = commandResults[i] || {};
        const commandName = typeof commandResult.command === 'string' && commandResult.command.trim()
          ? commandResult.command.trim().toUpperCase()
          : `COMMAND_${i + 1}`;
        const rawOutput = typeof commandResult.rawOutput === 'string' ? commandResult.rawOutput : null;
        const capturedAtCandidate = commandResult.capturedAt ? new Date(commandResult.capturedAt) : now;
        const safeCapturedAt = Number.isNaN(capturedAtCandidate.getTime()) ? now : capturedAtCandidate;
        if (safeCapturedAt.getTime() > latestCapture.getTime()) {
          latestCapture = safeCapturedAt;
        }
        const entries = Array.isArray(commandResult.entries) ? commandResult.entries : [];

        if (entries.length === 0) {
          const [infoResult] = await connection.execute(
            `INSERT INTO machine_info_values (machine_id, command, raw_key, raw_value, raw_output, captured_at, position, command_index, batch_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [machineId, commandName, commandName, rawOutput, rawOutput, safeCapturedAt, 0, i, batchId]
          );

          const infoId = infoResult.insertId;
          const parameterName = normalizeParameterName(commandName, commandName, 0);
          const dataType = inferDataType(rawOutput);
          const normalizedValue = normalizeValueForType(rawOutput, dataType);

          await connection.execute(
            'INSERT INTO machine_info_parameters (info_value_id, parameter_name, data_type, normalized_value) VALUES (?, ?, ?, ?)',
            [infoId, parameterName, dataType, normalizedValue]
          );
          inserted += 1;
          continue;
        }

        for (let j = 0; j < entries.length; j += 1) {
          const entry = entries[j] || {};
          const label = typeof entry.label === 'string' && entry.label.trim()
            ? entry.label.trim().slice(0, 255)
            : `Paramètre ${j + 1}`;
          const value = entry.value !== undefined && entry.value !== null ? String(entry.value) : '';
          const parsedPosition = Number.parseInt(entry.position, 10);
          const position = Number.isNaN(parsedPosition) ? j : parsedPosition;

          const [infoResult] = await connection.execute(
            `INSERT INTO machine_info_values (machine_id, command, raw_key, raw_value, raw_output, captured_at, position, command_index, batch_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [machineId, commandName, label, value, j === 0 ? rawOutput : null, safeCapturedAt, position, i, batchId]
          );

          const infoId = infoResult.insertId;
          const parameterName = normalizeParameterName(label, commandName, j);
          const dataType = inferDataType(value);
          const normalizedValue = normalizeValueForType(value, dataType);

          await connection.execute(
            'INSERT INTO machine_info_parameters (info_value_id, parameter_name, data_type, normalized_value) VALUES (?, ?, ?, ?)',
            [infoId, parameterName, dataType, normalizedValue]
          );
          inserted += 1;
        }
      }

      await connection.execute('UPDATE machines SET info_synced_at = ? WHERE id = ?', [latestCapture, machineId]);
      await connection.commit();

      await logUserAction('machine_info_synced', `Informations machine ${uuid} mises à jour`, req, {
        userId,
        uuid,
        inserted
      });

      return res.json({
        success: true,
        inserted,
        syncedAt: latestCapture.toISOString()
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Erreur rollback informations machine:', rollbackError);
      }
      console.error('Erreur enregistrement informations machine:', error);
      await logError('machine_info_store_failed', error.message, req, { uuid });
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement des informations' });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erreur préparation informations machine:', error);
    await logError('machine_info_prepare_failed', error.message, req, { uuid });
    res.status(500).json({ error: 'Erreur lors du traitement de la requête' });
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

