/**
 * Migration automatique du schéma V2
 * Crée les tables au démarrage si elles n'existent pas
 */
import knex from 'knex';
import { env } from './env.js';
// SQL Schema V2 embedded directly to avoid file path issues in build
const SCHEMA_V2_SQL = `
-- Drop old tables if migration from V1
DROP TABLE IF EXISTS stats;
DROP TABLE IF EXISTS logs;
DROP TABLE IF EXISTS commands;
DROP TABLE IF EXISTS printers;

-- ==========================================
-- CORE PRINTER TABLE (minimal, frequently queried data)
-- ==========================================
CREATE TABLE printers (
  id VARCHAR(36) PRIMARY KEY,
  uuid VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  user_id INT,
  connection_status VARCHAR(50) DEFAULT 'disconnected',
  last_connected BIGINT,
  last_error TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,

  INDEX idx_uuid (uuid),
  INDEX idx_user_id (user_id),
  INDEX idx_connection_status (connection_status),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PRINTER CONFIGURATION
-- ==========================================
CREATE TABLE printer_configs (
  printer_id VARCHAR(36) PRIMARY KEY,
  auto_reconnect BOOLEAN DEFAULT TRUE,
  reconnect_delay INT DEFAULT 2000,
  max_reconnect_attempts INT DEFAULT 5,
  command_timeout INT DEFAULT 30000,
  keep_alive_interval INT DEFAULT 60000,
  serial_options JSON DEFAULT '{"baudRate": 115200, "dataBits": 8, "stopBits": 1, "parity": "none", "flowControl": "none", "bufferSize": 255}',
  custom_settings JSON,
  updated_at BIGINT NOT NULL,

  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PRINTER HARDWARE
-- ==========================================
CREATE TABLE printer_hardware (
  printer_id VARCHAR(36) PRIMARY KEY,
  vendor_id INT,
  product_id INT,
  manufacturer VARCHAR(255),
  serial_number VARCHAR(255),
  hardware_specs JSON DEFAULT '{}',
  updated_at BIGINT NOT NULL,

  INDEX idx_vendor_product (vendor_id, product_id),
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PRINTER FIRMWARE
-- ==========================================
CREATE TABLE printer_firmware (
  printer_id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255),
  version VARCHAR(255),
  build_date VARCHAR(255),
  capabilities JSON DEFAULT '{}',
  updated_at BIGINT NOT NULL,

  INDEX idx_name_version (name, version),
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PRINTER PORT INFO
-- ==========================================
CREATE TABLE printer_ports (
  printer_id VARCHAR(36) PRIMARY KEY,
  usb_vendor_id INT,
  usb_product_id INT,
  port_metadata JSON,
  updated_at BIGINT NOT NULL,

  INDEX idx_usb_ids (usb_vendor_id, usb_product_id),
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PRINTER STATE
-- ==========================================
CREATE TABLE printer_states (
  printer_id VARCHAR(36) PRIMARY KEY,
  status VARCHAR(100),
  state_data JSON,
  updated_at BIGINT NOT NULL,

  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- COMMANDS
-- ==========================================
CREATE TABLE commands (
  id VARCHAR(36) PRIMARY KEY,
  printer_id VARCHAR(36) NOT NULL,
  command TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  error TEXT,
  response TEXT,
  execution_time INT,

  INDEX idx_printer_timestamp (printer_id, timestamp DESC),
  INDEX idx_status (status),
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- LOGS
-- ==========================================
CREATE TABLE logs (
  id VARCHAR(36) PRIMARY KEY,
  printer_id VARCHAR(36),
  timestamp BIGINT NOT NULL,
  level VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  data JSON,

  INDEX idx_printer_timestamp (printer_id, timestamp DESC),
  INDEX idx_level (level),
  INDEX idx_category (category),
  INDEX idx_timestamp (timestamp DESC),
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- STATS
-- ==========================================
CREATE TABLE printer_stats (
  printer_id VARCHAR(36) PRIMARY KEY,
  total_commands INT DEFAULT 0,
  successful_commands INT DEFAULT 0,
  failed_commands INT DEFAULT 0,
  total_errors INT DEFAULT 0,
  total_connection_time BIGINT DEFAULT 0,
  average_response_time FLOAT DEFAULT 0,
  last_activity BIGINT,
  stats_data JSON,
  updated_at BIGINT NOT NULL,

  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- PRINTER EVENTS
-- ==========================================
CREATE TABLE printer_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  printer_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSON,
  timestamp BIGINT NOT NULL,

  INDEX idx_printer_timestamp (printer_id, timestamp DESC),
  INDEX idx_event_type (event_type),
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- USER PREFERENCES
-- ==========================================
CREATE TABLE user_printer_preferences (
  user_id INT NOT NULL,
  printer_id VARCHAR(36) NOT NULL,
  favorite BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  custom_color VARCHAR(7),
  notes TEXT,
  preferences JSON,

  PRIMARY KEY (user_id, printer_id),
  INDEX idx_user_favorite (user_id, favorite),
  INDEX idx_display_order (display_order),
  FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;
async function checkTableStructure(db, tableName) {
    try {
        const columns = await db.raw(`SHOW COLUMNS FROM ${tableName}`);
        const columnNames = columns[0].map((col) => col.Field);
        // Check for V2 structure markers
        if (tableName === 'printer_configs') {
            // V2 has serial_options (JSON), V1 has individual columns
            return columnNames.includes('serial_options');
        }
        if (tableName === 'logs') {
            // Both should have printer_id (not printerId)
            return columnNames.includes('printer_id');
        }
        return true;
    }
    catch (error) {
        return false;
    }
}
export async function runMigrations() {
    const db = knex({
        client: 'mysql2',
        connection: env.DATABASE_URL,
    });
    try {
        console.log('🔄 Checking database schema...');
        console.log('📍 Database:', env.DATABASE_URL.replace(/\/\/.*:.*@/, '//***:***@')); // Hide credentials
        // Vérifier si les tables V2 existent
        const tables = await db.raw('SHOW TABLES');
        const tableNames = tables[0].map((row) => Object.values(row)[0]);
        console.log('📊 Found', tableNames.length, 'existing tables');
        const requiredTables = [
            'printers',
            'printer_configs',
            'printer_hardware',
            'printer_firmware',
            'printer_ports',
            'printer_states',
        ];
        const missingTables = requiredTables.filter(t => !tableNames.includes(t));
        console.log('⚙️  Missing tables:', missingTables.length > 0 ? missingTables.join(', ') : 'none');
        // Check if existing tables have the correct structure
        let needsRecreation = false;
        for (const table of requiredTables) {
            if (tableNames.includes(table)) {
                const isCorrectStructure = await checkTableStructure(db, table);
                if (!isCorrectStructure) {
                    console.log(`⚠️  Table '${table}' exists but has outdated structure`);
                    needsRecreation = true;
                }
            }
        }
        if (missingTables.length > 0 || needsRecreation) {
            if (needsRecreation) {
                console.log('⚠️  WARNING: Database structure is outdated.');
                console.log('📦 Creating backups before recreating tables...');
                // Créer des backups avant de dropper
                const timestamp = Date.now();
                const tablesToDrop = ['stats', 'logs', 'commands', 'printer_events', 'user_printer_preferences',
                    'printer_states', 'printer_ports', 'printer_firmware', 'printer_hardware',
                    'printer_configs', 'printers'];
                for (const table of tablesToDrop) {
                    if (tableNames.includes(table)) {
                        try {
                            const backupName = `${table}_backup_${timestamp}`;
                            await db.raw(`CREATE TABLE ${backupName} AS SELECT * FROM ${table}`);
                            console.log(`  ✓ Backed up ${table} to ${backupName}`);
                        }
                        catch (error) {
                            console.error(`  ✗ Error backing up ${table}:`, error.message);
                        }
                    }
                }
                console.log('📦 Recreating tables with V2 schema...');
                console.log('   Note: Backups created with timestamp:', timestamp);
                // Drop old tables in correct order (foreign key constraints)
                for (const table of tablesToDrop) {
                    if (tableNames.includes(table)) {
                        try {
                            await db.raw(`DROP TABLE IF EXISTS ${table}`);
                            console.log(`  ✓ Dropped old table: ${table}`);
                        }
                        catch (error) {
                            console.error(`  ✗ Error dropping ${table}:`, error.message);
                        }
                    }
                }
            }
            else {
                console.log('📦 Creating missing database tables (V2 schema)...');
            }
            // Séparer les statements SQL (embedded in code)
            const statements = SCHEMA_V2_SQL
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().includes('use ') && !s.toLowerCase().startsWith('drop'));
            console.log(`📝 Executing ${statements.length} SQL statements...`);
            // Exécuter chaque statement
            for (const statement of statements) {
                try {
                    await db.raw(statement);
                    // Extract table name for logging
                    const match = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?/i);
                    if (match) {
                        console.log('  ✓ Created table:', match[1]);
                    }
                }
                catch (error) {
                    if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
                        console.error('  ✗ Error:', error.message);
                        console.error('  Statement:', statement.substring(0, 100) + '...');
                        // Continue with other tables
                    }
                }
            }
            console.log('✅ Database tables created successfully!');
        }
        else {
            console.log('✅ Database schema up to date');
        }
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
    finally {
        await db.destroy();
    }
}
//# sourceMappingURL=migrations.js.map