/**
 * Migration pour corriger la contrainte UUID
 * Permet à plusieurs utilisateurs d'avoir des machines avec le même UUID
 * 
 * Usage: node src/config/migrations/migrate-uuid-constraint.js
 */

const { initDatabase, getConnection } = require('../database');

async function migrateUUIDConstraint() {
  let connection;
  
  try {
    console.log('🔄 Début de la migration UUID constraint...');
    
    // Initialiser la base de données d'abord
    console.log('🔧 Initialisation de la base de données...');
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      throw new Error('Impossible d\'initialiser la base de données');
    }
    console.log('✅ Base de données initialisée');
    
    connection = await getConnection();
    
    // 1. Vérifier si la table machines existe
    console.log('📋 Vérification de l\'existence de la table machines...');
    try {
      await connection.execute('SELECT 1 FROM machines LIMIT 1');
      console.log('✅ La table machines existe');
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('ℹ️  La table machines n\'existe pas encore, elle sera créée au prochain démarrage du serveur');
        return;
      }
      throw error;
    }
    
    // 2. Vérifier les index existants
    console.log('📊 Analyse des index existants...');
    const [indexes] = await connection.execute('SHOW INDEX FROM machines');
    
    const hasUUIDIndex = indexes.some(idx => idx.Key_name === 'uuid' && idx.Non_unique === 0);
    const hasCompositeIndex = indexes.some(idx => idx.Key_name === 'unique_user_machine');
    
    console.log('  - Index uuid unique:', hasUUIDIndex ? '✅ Présent' : '❌ Absent');
    console.log('  - Index composite (user_id, uuid):', hasCompositeIndex ? '✅ Présent' : '❌ Absent');
    
    // 3. Supprimer l'ancienne contrainte UNIQUE sur uuid si elle existe
    if (hasUUIDIndex) {
      console.log('📝 Suppression de l\'ancienne contrainte UNIQUE sur uuid...');
      try {
        await connection.execute('ALTER TABLE machines DROP INDEX uuid');
        console.log('✅ Ancienne contrainte supprimée');
      } catch (error) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('ℹ️  Contrainte uuid n\'existait pas, continuons...');
        } else {
          throw error;
        }
      }
    } else {
      console.log('ℹ️  Pas d\'ancienne contrainte uuid à supprimer');
    }
    
    // 4. Créer la nouvelle contrainte composite (user_id, uuid)
    if (!hasCompositeIndex) {
      console.log('📝 Création de la nouvelle contrainte composite (user_id, uuid)...');
      try {
        await connection.execute('ALTER TABLE machines ADD UNIQUE KEY unique_user_machine (user_id, uuid)');
        console.log('✅ Nouvelle contrainte composite créée');
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log('ℹ️  Contrainte composite existe déjà');
        } else {
          throw error;
        }
      }
    } else {
      console.log('ℹ️  La contrainte composite existe déjà');
    }
    
    // 5. Vérifier la structure finale de la table
    console.log('🔍 Vérification de la structure finale...');
    const [finalIndexes] = await connection.execute('SHOW INDEX FROM machines');
    
    console.log('\n📊 Indexes de la table machines:');
    const indexMap = new Map();
    finalIndexes.forEach(index => {
      if (!indexMap.has(index.Key_name)) {
        indexMap.set(index.Key_name, {
          columns: [],
          unique: index.Non_unique === 0
        });
      }
      indexMap.get(index.Key_name).columns.push(index.Column_name);
    });
    
    indexMap.forEach((info, keyName) => {
      const unique = info.unique ? '🔒 UNIQUE' : '📌 INDEX';
      console.log(`  ${unique} ${keyName}: (${info.columns.join(', ')})`);
    });
    
    // 6. Vérifier que la contrainte composite est bien présente
    const finalCompositeIndex = finalIndexes.find(idx => idx.Key_name === 'unique_user_machine');
    if (finalCompositeIndex) {
      console.log('\n✅ Migration réussie !');
      console.log('✅ La contrainte composite (user_id, uuid) est active');
      console.log('✅ Plusieurs utilisateurs peuvent maintenant avoir des machines avec le même UUID');
    } else {
      console.log('\n⚠️  Attention: La contrainte composite n\'a pas été créée');
      console.log('⚠️  Vérifiez manuellement la structure de la table');
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    if (error.code) {
      console.error(`   Code d'erreur: ${error.code}`);
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
      console.log('🔌 Connexion libérée');
    }
  }
}

// Exécuter la migration si ce fichier est appelé directement
if (require.main === module) {
  migrateUUIDConstraint()
    .then(() => {
      console.log('\n🎉 Migration terminée avec succès');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Échec de la migration:', error);
      process.exit(1);
    });
}

module.exports = { migrateUUIDConstraint };
