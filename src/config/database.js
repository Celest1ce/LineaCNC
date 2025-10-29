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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Table users créée/vérifiée');
    
    // Vérifier s'il y a des utilisateurs, sinon créer un utilisateur admin par défaut
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.execute(
        'INSERT INTO users (email, password, pseudo) VALUES (?, ?, ?)',
        ['admin@lineacnc.com', hashedPassword, 'Administrateur']
      );
      console.log('✅ Utilisateur admin créé (email: admin@lineacnc.com, mot de passe: admin123)');
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
        uuid VARCHAR(36) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        baud_rate INT DEFAULT 115200,
        last_port VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.execute(createTableQuery);
    console.log('✅ Table machines créée/vérifiée');
  } catch (error) {
    console.error('❌ Erreur lors de la création de la table machines:', error.message);
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

module.exports = {
  initDatabase,
  getConnection,
  executeQuery,
  closeDatabase
};

