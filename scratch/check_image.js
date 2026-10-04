const sharp = require('./frontend/node_modules/sharp');
const path = require('path');

async function check() {
  const meta = await sharp(path.join(__dirname, '..', 'frontend', 'public', 'extracted-app-icon.png')).metadata();
  console.log('Metadata:', meta);
}
check().catch(console.error);
