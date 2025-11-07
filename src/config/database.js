const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuration de la base de données
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lineacnc_auth',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;
const shouldSeedTestUser = process.env.SEED_TEST_USER === 'true';

// Initialisation de la connexion à la base de données
async function initDatabase() {
  try {
    // Créer le pool de connexions
    pool = mysql.createPool(dbConfig);
    
    // Tester la connexion
    const connection = await pool.getConnection();
    console.log('✅ Connexion à la base de données MySQL établie');
    
    // Créer les tables si elles n'existent pas
    await createUsersTable(connection);
    await createMachinesTable(connection);
    await createLogsTable(connection);
    await createUserSessionsTable(connection);
    
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
    return false;
  }
}

// Création automatique de la table users
async function createUsersTable(connection) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        pseudo VARCHAR(100) NOT NULL,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        status ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
        failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
        locked_until DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_pseudo (pseudo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(createTableQuery);
    console.log('✅ Table users créée/vérifiée');

    await ensureColumn(connection, 'users', 'role', "ALTER TABLE users ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER pseudo");
    await ensureColumn(connection, 'users', 'status', "ALTER TABLE users ADD COLUMN status ENUM('active','inactive','banned') NOT NULL DEFAULT 'active' AFTER role");
    await ensureColumn(connection, 'users', 'failed_attempts', 'ALTER TABLE users ADD COLUMN failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER status');
    await ensureColumn(connection, 'users', 'locked_until', 'ALTER TABLE users ADD COLUMN locked_until DATETIME NULL AFTER failed_attempts');
    await ensureUniqueIndex(connection, 'users', 'unique_pseudo', 'ALTER TABLE users ADD CONSTRAINT unique_pseudo UNIQUE (pseudo)');

    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      if (shouldSeedTestUser) {
        const bcrypt = require('bcrypt');
        const seedPassword = process.env.SEED_TEST_PASSWORD || 'test123';
        const seedEmail = process.env.SEED_TEST_EMAIL || 'test@lineacnc.com';
        const seedPseudo = process.env.SEED_TEST_PSEUDO || 'Utilisateur Test';
        const seedRole = process.env.SEED_TEST_ROLE || 'user';
        const seedStatus = process.env.SEED_TEST_STATUS || 'active';
        const hashedPassword = await bcrypt.hash(seedPassword, 10);

        await connection.execute(
          'INSERT INTO users (email, password, pseudo, role, status) VALUES (?, ?, ?, ?, ?)',
          [seedEmail, hashedPassword, seedPseudo, seedRole, seedStatus]
        );
        console.log(`✅ Utilisateur de test créé (email: ${seedEmail})`);
      } else {
        console.warn('⚠️ Aucun utilisateur présent dans la base. Créez un compte via l\'interface ou définissez SEED_TEST_USER=true pour en générer un.');
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table users:', error.message);
    throw error;
  }
}

// Création automatique de la table machines
async function createMachinesTable(connection) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS machines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        uuid VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        baud_rate INT DEFAULT 115200,
        last_port VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_machine (user_id, uuid)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Table machines créée/vérifiée');
    console.log('ℹ️  Note: Si vous migrez depuis une ancienne version, exécutez:');
    console.log('   node src/config/migrations/migrate-uuid-constraint.js');
    
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table machines:', error.message);
    throw error;
  }
}

async function createLogsTable(connection) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        level VARCHAR(32) NOT NULL,
        type VARCHAR(64) NOT NULL,
        message TEXT NOT NULL,
        user_id INT NULL,
        session_id VARCHAR(255) NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(255) NULL,
        details JSON NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_logs_user_id (user_id),
        INDEX idx_logs_session_id (session_id),
        INDEX idx_logs_level (level),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(createTableQuery);
    console.log('✅ Table logs créée/vérifiée');
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table logs:', error.message);
    throw error;
  }
}

async function createUserSessionsTable(connection) {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id VARCHAR(255) PRIMARY KEY,
        user_id INT NOT NULL,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        logout_time TIMESTAMP NULL,
        duration_minutes INT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(255) NULL,
        INDEX idx_user_sessions_user_id (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await connection.execute(createTableQuery);
    console.log('✅ Table user_sessions créée/vérifiée');
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table user_sessions:', error.message);
    throw error;
  }
}

// Fonction pour obtenir une connexion du pool
async function getConnection() {
  if (!pool) {
    throw new Error('Base de données non initialisée');
  }
  return await pool.getConnection();
}

// Fonction pour exécuter une requête
async function executeQuery(query, params = []) {
  const connection = await getConnection();
  try {
    const [rows] = await connection.execute(query, params);
    return rows;
  } finally {
    connection.release();
  }
}

// Fonction pour fermer le pool de connexions
async function closeDatabase() {
  if (pool) {
    await pool.end();
    console.log('✅ Connexion à la base de données fermée');
  }
}

async function ensureColumn(connection, table, column, alterQuery) {
  // Les instructions SHOW ne supportent pas les requêtes préparées. Nous utilisons donc
  // connection.query pour bénéficier de l'échappement automatique.
  const [columns] = await connection.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column]);
  if (columns.length === 0) {
    await connection.execute(alterQuery);
    console.log(`ℹ️ Colonne ${column} ajoutée à ${table}`);
  }
}

async function ensureUniqueIndex(connection, table, indexName, alterQuery) {
  const [indexes] = await connection.query('SHOW INDEX FROM ?? WHERE Key_name = ?', [table, indexName]);
  if (indexes.length === 0) {
    await connection.execute(alterQuery);
    console.log(`ℹ️ Index unique ${indexName} ajouté à ${table}`);
  }
}

module.exports = {
  initDatabase,
  getConnection,
  executeQuery,
  closeDatabase,
  dbConfig
};

