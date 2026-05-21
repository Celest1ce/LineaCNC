#!/usr/bin/env node

/**
 * Script de test de connexion à la base de données
 */

const { readFileSync, existsSync } = require('fs');
const { resolve, join } = require('path');
const mysql = require('mysql2/promise');

// Charger le .env
const rootPath = resolve(__dirname, '../../../');
const envPath = join(rootPath, '.env');

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const { DB_HOST, DB_PORT = '3306', DB_USER, DB_PASS, DB_NAME } = process.env;

async function testConnection() {
  console.log('\n🔍 Test de connexion à la base de données...\n');
  console.log('Configuration :');
  console.log(`  Host : ${DB_HOST}`);
  console.log(`  Port : ${DB_PORT}`);
  console.log(`  User : ${DB_USER}`);
  console.log(`  DB   : ${DB_NAME}`);
  console.log(`  Pass : ${'*'.repeat(DB_PASS?.length || 0)}\n`);

  try {
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: parseInt(DB_PORT),
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      connectTimeout: 10000
    });

    console.log('✅ Connexion réussie !\n');

    // Tester une requête
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Requête test réussie !\n');

    // Lister les tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📊 Tables trouvées (${tables.length}) :`);
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });

    await connection.end();
    console.log('\n✅ Tout fonctionne parfaitement !\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur de connexion :\n');

    if (error.code === 'ECONNREFUSED') {
      console.error('  La connexion a été refusée.');
      console.error('  Si vous êtes en local et que la BDD est sur Infomaniak,');
      console.error('  c\'est NORMAL ! Infomaniak n\'autorise que les connexions');
      console.error('  depuis leurs serveurs.\n');
      console.error('  👉 Les migrations se feront automatiquement au déploiement.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('  Timeout de connexion.');
      console.error('  Le serveur ne répond pas (firewall ou IP bloquée).\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('  Accès refusé : vérifiez vos identifiants.\n');
    } else {
      console.error(`  ${error.message}\n`);
    }

    process.exit(1);
  }
}

testConnection();
