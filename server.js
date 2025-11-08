const path = require('path');

const ENTRY_PATH = path.join(__dirname, 'src', 'server.js');

try {
  const { startServer } = require(ENTRY_PATH);

  if (typeof startServer !== 'function') {
    throw new TypeError('Expected startServer export to be a function.');
  }

  startServer();
} catch (error) {
  console.error('❌ Impossible de charger le serveur depuis %s', ENTRY_PATH);
  console.error('💡 Vérifiez que le dossier src est présent et que server.js est correctement exporté.');
  console.error(error);
  process.exit(1);
}
