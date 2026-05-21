#!/usr/bin/env node

/**
 * Wrapper pour Prisma CLI qui construit automatiquement DATABASE_URL
 * à partir des variables DB_HOST, DB_USER, DB_PASS, DB_NAME
 */

const { spawn } = require('child_process');
const { resolve, join } = require('path');
const { readFileSync, existsSync } = require('fs');

// Charger le .env depuis la racine du projet (parser manuel sans dépendance)
const rootPath = resolve(__dirname, '../../../');
const envPath = join(rootPath, '.env');

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    // Ignorer les commentaires et les lignes vides
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim()
        // Enlever les quotes si présentes
        .replace(/^["'](.*)["']$/, '$1');

      // Ne pas écraser si déjà défini
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Fonction pour encoder les caractères spéciaux dans les URLs
function encodePassword(password) {
  return encodeURIComponent(password);
}

function encodeUser(user) {
  return encodeURIComponent(user);
}

// Construire DATABASE_URL si elle n'existe pas déjà
if (!process.env.DATABASE_URL) {
  const { DB_HOST, DB_PORT = '3306', DB_USER, DB_PASS, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_PASS || !DB_NAME) {
    console.error('\n❌ Erreur : Variables manquantes dans .env');
    console.error('Variables requises : DB_HOST, DB_USER, DB_PASS, DB_NAME\n');
    process.exit(1);
  }

  const encodedUser = encodeUser(DB_USER);
  const encodedPass = encodePassword(DB_PASS);

  process.env.DATABASE_URL = `mysql://${encodedUser}:${encodedPass}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

  console.log('✓ DATABASE_URL construite automatiquement depuis vos variables DB_*');
}

// Récupérer la commande Prisma à exécuter depuis les arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node prisma-wrapper.js <commande-prisma>');
  console.error('Exemple: node prisma-wrapper.js migrate dev');
  process.exit(1);
}

// Lancer la commande Prisma avec l'environnement modifié
const prismaCmd = spawn('npx', ['prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

prismaCmd.on('exit', (code) => {
  process.exit(code || 0);
});

prismaCmd.on('error', (error) => {
  console.error('Erreur lors de l\'exécution de Prisma:', error);
  process.exit(1);
});
