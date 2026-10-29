const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const orbDir = path.resolve(__dirname, '../frontend/public/icons/orb');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const moods = [
  'attentive',
  'curious',
  'thinking',
  'concerned',
  'sulky',
  'celebrating',
  'happy',
  'sleepy',
  'proud',
  'sad',
  'playful'
];

// Helper HTML wrapper for exact 192x192 rendering with white circular background or transparent
for (const mood of moods) {
  const svgContent = fs.readFileSync(path.join(orbDir, `orb-${mood}.svg`), 'utf8');
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 192px;
    height: 192px;
    overflow: hidden;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  svg {
    width: 192px;
    height: 192px;
  }
</style>
</head>
<body>
${svgContent}
</body>
</html>`;

  const tmpHtml = path.join(orbDir, `tmp_${mood}.html`);
  const pngPath = path.join(orbDir, `orb-${mood}.png`);
  fs.writeFileSync(tmpHtml, htmlContent, 'utf8');

  try {
    const cmd = `"${chromePath}" --headless=new --disable-gpu --force-device-scale-factor=1 --window-size=192,192 --default-background-color=00000000 --screenshot="${pngPath}" "file:///${tmpHtml.replace(/\\/g, '/')}"`;
    execSync(cmd, { stdio: 'pipe' });
  } catch (err) {
    console.error(`Failed to render ${mood}:`, err.message);
  } finally {
    if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  }
}

console.log('PNG generation complete!');

