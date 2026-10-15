const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');
if (fs.existsSync(swPath)) {
  let content = fs.readFileSync(swPath, 'utf8');
  const buildStamp = Date.now();
  const newCacheName = `const CACHE_NAME = 'focentia-build-${buildStamp}';`;

  if (/const CACHE_NAME = ['"][^'"]+['"];/.test(content)) {
    content = content.replace(/const CACHE_NAME = ['"][^'"]+['"];/, newCacheName);
    fs.writeFileSync(swPath, content, 'utf8');
    console.log(`[stamp_sw] Successfully stamped sw.js with CACHE_NAME: focentia-build-${buildStamp}`);
  } else {
    console.warn('[stamp_sw] Warning: CACHE_NAME declaration pattern not found in sw.js');
  }
} else {
  console.warn('[stamp_sw] Warning: sw.js file not found at', swPath);
}
