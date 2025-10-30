/**
 * Script de build pour optimiser les fichiers JavaScript
 * Usage: node public/js/build.js [--minify] [--watch]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    inputDir: __dirname,
    outputDir: path.join(__dirname, '..', 'dist', 'js'),
    files: [
        'config.js',
        'utils/notification.js',
        'components/dropdown-manager.js',
        'views/machine-tile-view.js',
        'views/machine-manager-view.js',
        'components/machine-manager.js',
        'pages/dashboard.js',
        'main.js'
    ],
    bundleFile: 'lineacnc.bundle.js',
    minifiedFile: 'lineacnc.bundle.min.js'
};

// Arguments de ligne de commande
const args = process.argv.slice(2);
const minify = args.includes('--minify');
const watch = args.includes('--watch');

/**
 * Minifier du code JavaScript (version simple)
 */
function minifyJS(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, '') // Supprimer les commentaires /* */
        .replace(/\/\/.*$/gm, '') // Supprimer les commentaires //
        .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
        .replace(/\s*([{}();,=])\s*/g, '$1') // Supprimer les espaces autour des opérateurs
        .trim();
}

/**
 * Lire et concaténer les fichiers
 */
function bundleFiles() {
    console.log('📦 Création du bundle JavaScript...');
    
    let bundle = `/**
 * LineaCNC - Bundle JavaScript
 * Généré le ${new Date().toISOString()}
 * Version: 1.0.0
 */

`;

    for (const file of config.files) {
        const filePath = path.join(config.inputDir, file);
        
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            bundle += `\n// === ${file} ===\n`;
            bundle += content;
            bundle += '\n';
            console.log(`✅ Ajouté: ${file}`);
        } else {
            console.warn(`⚠️ Fichier non trouvé: ${file}`);
        }
    }

    return bundle;
}

/**
 * Créer le répertoire de sortie
 */
function ensureOutputDir() {
    if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
        console.log(`📁 Répertoire créé: ${config.outputDir}`);
    }
}

/**
 * Écrire les fichiers de sortie
 */
function writeOutput(bundle) {
    ensureOutputDir();
    
    // Bundle normal
    const bundlePath = path.join(config.outputDir, config.bundleFile);
    fs.writeFileSync(bundlePath, bundle, 'utf8');
    console.log(`📄 Bundle créé: ${config.bundleFile}`);
    
    // Bundle minifié
    if (minify) {
        const minified = minifyJS(bundle);
        const minifiedPath = path.join(config.outputDir, config.minifiedFile);
        fs.writeFileSync(minifiedPath, minified, 'utf8');
        console.log(`📄 Bundle minifié créé: ${config.minifiedFile}`);
        
        // Statistiques
        const originalSize = Buffer.byteLength(bundle, 'utf8');
        const minifiedSize = Buffer.byteLength(minified, 'utf8');
        const reduction = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
        
        console.log(`📊 Taille originale: ${(originalSize / 1024).toFixed(2)} KB`);
        console.log(`📊 Taille minifiée: ${(minifiedSize / 1024).toFixed(2)} KB`);
        console.log(`📊 Réduction: ${reduction}%`);
    }
}

/**
 * Surveiller les changements de fichiers
 */
function watchFiles() {
    console.log('👀 Surveillance des fichiers...');
    
    for (const file of config.files) {
        const filePath = path.join(config.inputDir, file);
        
        if (fs.existsSync(filePath)) {
            fs.watchFile(filePath, { interval: 1000 }, (curr, prev) => {
                if (curr.mtime !== prev.mtime) {
                    console.log(`🔄 Fichier modifié: ${file}`);
                    const bundle = bundleFiles();
                    writeOutput(bundle);
                }
            });
        }
    }
    
    console.log('✅ Surveillance active. Appuyez sur Ctrl+C pour arrêter.');
}

/**
 * Fonction principale
 */
function main() {
    console.log('🚀 Build JavaScript LineaCNC');
    console.log(`Mode: ${minify ? 'Minifié' : 'Normal'}`);
    console.log(`Surveillance: ${watch ? 'Activée' : 'Désactivée'}`);
    console.log('');
    
    try {
        const bundle = bundleFiles();
        writeOutput(bundle);
        
        if (watch) {
            watchFiles();
        } else {
            console.log('✅ Build terminé avec succès!');
        }
    } catch (error) {
        console.error('❌ Erreur lors du build:', error.message);
        process.exit(1);
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    main();
}

module.exports = {
    bundleFiles,
    writeOutput,
    minifyJS,
    config
};
