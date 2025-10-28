#!/bin/bash

# Script de déploiement pour Infomaniak
# Usage: ./deploy.sh

echo "🚀 Déploiement LineaCNC sur Infomaniak"
echo "======================================"

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Exécutez ce script depuis la racine du projet."
    exit 1
fi

echo "📦 Installation des dépendances..."
npm install

echo "🎨 Compilation des styles TailwindCSS..."
npm run build-css-prod

echo "✅ Déploiement terminé !"
echo ""
echo "📋 Étapes suivantes sur Infomaniak :"
echo "1. Uploadez tous les fichiers via FTP"
echo "2. Créez un fichier .env avec vos paramètres MySQL"
echo "3. Redémarrez l'application Node.js"
echo "4. Testez la connexion avec admin@lineacnc.com / admin123"
echo ""
echo "🔧 Configuration .env requise :"
echo "DB_HOST=votre-host-mysql"
echo "DB_USER=votre-utilisateur"
echo "DB_PASSWORD=votre-mot-de-passe"
echo "DB_NAME=votre-base-de-donnees"
echo "SESSION_SECRET=votre-cle-secrete"
echo "PORT=process.env.PORT"
echo "NODE_ENV=production"
