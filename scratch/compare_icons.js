const sharp = require('../frontend/node_modules/sharp');
const path = require('path');

async function inspect(file) {
  const { data, info } = await sharp(path.join(__dirname, '..', 'frontend', 'public', file)).raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      if (data[idx] < 240 || data[idx+1] < 240 || data[idx+2] < 240) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(file, '-> bbox:', { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY }, 'center:', (minX+maxX)/2, (minY+maxY)/2);
}

Promise.all([
  inspect('test-fullbleed-512.png'),
  inspect('test-vector-icon.png')
]).catch(console.error);
