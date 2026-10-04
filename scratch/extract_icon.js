const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'frontend', 'public', 'app icon.svg');
const content = fs.readFileSync(svgPath, 'utf8');

const base64Prefix = 'xlink:href="data:image/png;base64,';
const startIdx = content.indexOf(base64Prefix);
if (startIdx !== -1) {
  const dataStart = startIdx + base64Prefix.length;
  const endIdx = content.indexOf('"', dataStart);
  const base64Data = content.substring(dataStart, endIdx);
  const buf = Buffer.from(base64Data, 'base64');
  const outPath = path.join(__dirname, '..', 'frontend', 'public', 'extracted-app-icon.png');
  fs.writeFileSync(outPath, buf);
  console.log('Successfully saved extracted PNG to:', outPath, 'Bytes:', buf.length);
} else {
  console.log('Prefix not found');
}
