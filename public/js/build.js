#!/usr/bin/env node
/**
 * Builder JavaScript LineaCNC basé sur esbuild.
 * Concatène les scripts dans un ordre maîtrisé puis délègue la minification à esbuild
 * pour éviter les corruptions liées aux regex naïves.
 */

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const chokidar = require('chokidar');

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const minify = args.includes('--minify') || process.env.NODE_ENV === 'production';

const config = {
  baseDir: __dirname,
  files: [
    'config.js',
    'utils/notification.js',
    'utils/theme-manager.js',
    'components/password-tools.js',
    'components/dropdown-manager.js',
    'views/machine-tile-view.js',
    'views/machine-manager-view.js',
    'components/machine-manager.js',
    'pages/dashboard.js',
    'main.js'
  ],
  distDir: path.join(__dirname, 'bundle'),
  bundleName: 'lineacnc.bundle.js',
  minifiedName: 'lineacnc.bundle.min.js'
};

async function readFileSafe(filePath) {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    console.warn(`⚠️ Fichier introuvable ignoré: ${filePath}`);
    return '';
  }
}

async function createBundle() {
  const header = `/**\n * LineaCNC - Bundle JavaScript\n * Généré le ${new Date().toISOString()}\n */\n\n`;
  const segments = await Promise.all(
    config.files.map(async (relativePath) => {
      const absolutePath = path.join(config.baseDir, relativePath);
      const content = await readFileSafe(absolutePath);
      return `// === ${relativePath} ===\n${content}\n`;
    })
  );

  return header + segments.join('\n');
}

async function writeOutput(bundle) {
  await fs.promises.mkdir(config.distDir, { recursive: true });
  const bundlePath = path.join(config.distDir, config.bundleName);
  await fs.promises.writeFile(bundlePath, bundle, 'utf8');
  console.log(`📄 Bundle généré: ${bundlePath}`);

  if (minify) {
    const { code } = await esbuild.transform(bundle, {
      loader: 'js',
      minify: true,
      target: 'es2018'
    });
    const minifiedPath = path.join(config.distDir, config.minifiedName);
    await fs.promises.writeFile(minifiedPath, code, 'utf8');
    console.log(`📄 Bundle minifié généré: ${minifiedPath}`);

    const originalSize = Buffer.byteLength(bundle, 'utf8');
    const minifiedSize = Buffer.byteLength(code, 'utf8');
    const reduction = ((originalSize - minifiedSize) / originalSize) * 100;
    console.log(`📊 Réduction de taille: ${reduction.toFixed(1)}%`);
  }
}

async function buildOnce() {
  const bundle = await createBundle();
  await writeOutput(bundle);
  console.log('✅ Build JavaScript terminé');
}

function startWatcher() {
  console.log('👀 Surveillance des fichiers JavaScript...');
  const watcher = chokidar.watch(config.files.map((file) => path.join(config.baseDir, file)), {
    ignoreInitial: true
  });

  watcher.on('change', async (filePath) => {
    console.log(`🔄 Modification détectée: ${path.relative(config.baseDir, filePath)}`);
    try {
      await buildOnce();
    } catch (error) {
      console.error('❌ Échec du rebuild:', error);
    }
  });
}

(async () => {
  try {
    await buildOnce();
    if (watch) {
      startWatcher();
    }
  } catch (error) {
    console.error('❌ Erreur pendant le build JavaScript:', error);
    process.exit(1);
  }
})();
