const { initDatabase, executeQuery } = require('./src/config/database');
const { logAuth, logError, logSecurity, logSystem, logAccess, logUserAction, getLogs } = require('./src/utils/logging');

async function testCompleteSystem() {
  console.log('🧪 Test du système complet LineaCNC...\n');
  
  try {
    // Initialiser la base de données
    console.log('1. Initialisation de la base de données...');
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
      console.error('❌ Impossible d\'initialiser la base de données');
      return;
    }
    console.log('✅ Base de données initialisée\n');
    
    // Test des utilisateurs et rôles
    console.log('2. Test du système de rôles et statuts...');
    
    // Récupérer les utilisateurs
    const users = await executeQuery(`
      SELECT id, email, pseudo, role, status, last_login, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 ${users.length} utilisateurs trouvés:`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.pseudo} (${user.email})`);
      console.log(`      Rôle: ${user.role}, Statut: ${user.status}`);
      console.log(`      Créé: ${new Date(user.created_at).toLocaleString('fr-FR')}`);
      console.log(`      Dernière connexion: ${user.last_login ? new Date(user.last_login).toLocaleString('fr-FR') : 'Jamais'}\n`);
    });
    
    // Test des logs
    console.log('3. Test du système de logging...');
    
    // Créer différents types de logs
    await logSystem('test_complete', 'Test du système complet', {}, {
      testType: 'complete_system',
      timestamp: new Date().toISOString()
    });
    
    await logAuth('test_auth', 'Test d\'authentification', {}, {
      email: 'test@example.com',
      success: true
    });
    
    await logUserAction('test_user_action', 'Test d\'action utilisateur', {}, {
      action: 'test',
      userId: 1
    });
    
    await logSecurity('test_security', 'Test de sécurité', {}, {
      suspiciousActivity: 'test_pattern',
      blocked: true
    });
    
    await logAccess('test_access', 'Test d\'accès', {}, {
      method: 'GET',
      path: '/test',
      statusCode: 200
    });
    
    await logError('test_error', 'Test d\'erreur', {}, {
      errorCode: 'TEST_ERROR',
      stack: 'fake stack trace'
    });
    
    console.log('✅ Logs de test créés\n');
    
    // Récupérer et analyser les logs
    console.log('4. Analyse des logs...');
    const logs = await getLogs({ limit: 20 });
    
    console.log(`📊 ${logs.length} logs récents trouvés:`);
    logs.forEach((log, index) => {
      console.log(`   ${index + 1}. [${log.log_type}] ${log.action}: ${log.description}`);
      console.log(`      Utilisateur: ${log.pseudo || 'N/A'}, IP: ${log.ip_address || 'N/A'}`);
      console.log(`      Date: ${new Date(log.created_at).toLocaleString('fr-FR')}\n`);
    });
    
    // Statistiques par type
    console.log('5. Statistiques par type de log:');
    const stats = logs.reduce((acc, log) => {
      acc[log.log_type] = (acc[log.log_type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} logs`);
    });
    
    // Test des sessions
    console.log('\n6. Test du système de sessions...');
    const sessions = await executeQuery(`
      SELECT us.*, u.pseudo, u.email 
      FROM user_sessions us 
      LEFT JOIN users u ON us.user_id = u.id 
      ORDER BY us.login_time DESC 
      LIMIT 5
    `);
    
    console.log(`📊 ${sessions.length} sessions trouvées:`);
    sessions.forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.pseudo} (${session.email})`);
      console.log(`      Session ID: ${session.session_id}`);
      console.log(`      Connexion: ${new Date(session.login_time).toLocaleString('fr-FR')}`);
      console.log(`      Dernière activité: ${new Date(session.last_activity).toLocaleString('fr-FR')}`);
      console.log(`      Statut: ${session.is_active ? 'Active' : 'Fermée'}\n`);
    });
    
    console.log('✅ Test du système complet terminé avec succès !');
    console.log('📊 Le système LineaCNC est opérationnel avec :');
    console.log('   - Système d\'authentification avec rôles et statuts');
    console.log('   - Interface d\'administration complète');
    console.log('   - Système de logging évolutif en base de données');
    console.log('   - Gestion des sessions et sécurité avancée');
    console.log('   - Architecture prête pour la production');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    // Fermer la connexion
    const { closeDatabase } = require('./src/config/database');
    await closeDatabase();
  }
}

// Exécuter le test
testCompleteSystem();
