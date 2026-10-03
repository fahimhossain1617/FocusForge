const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create a minimal pure PNG generator for monochrome badge
function createPng(width, height, rgbaBuffer) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT chunk: filter byte (0) + raw RGBA scanlines
  const scanlines = [];
  for (let y = 0; y < height; y++) {
    scanlines.push(0); // Filter type None
    const offset = y * width * 4;
    for (let x = 0; x < width * 4; x++) {
      scanlines.push(rgbaBuffer[offset + x]);
    }
  }

  const uncompressed = Buffer.from(scanlines);
  const compressed = zlib.deflateSync(uncompressed);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crc]);
}

// Simple CRC32
function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }

  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

// Generate stylized FocusForge badge (crisp hexagon forge + bold F monogram with flame tip)
function drawBadge(size) {
  const buf = Buffer.alloc(size * size * 4); // all 0 = transparent

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  // Function to set pixel with antialiasing alpha (0-255)
  function setPixel(x, y, alpha) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = (Math.floor(y) * size + Math.floor(x)) * 4;
    const existingA = buf[idx + 3];
    const newA = Math.max(existingA, Math.min(255, Math.floor(alpha)));
    buf[idx] = 255;     // Red (White)
    buf[idx + 1] = 255; // Green (White)
    buf[idx + 2] = 255; // Blue (White)
    buf[idx + 3] = newA;
  }

  // Supersampling grid for high quality antialiased rasterization
  const scale = 4;
  const ssSize = size * scale;
  const ssBuf = new Uint8Array(ssSize * ssSize);

  // Draw hexagon ring and central 'F' on supersampled grid
  const sscx = ssSize / 2;
  const sscy = ssSize / 2;
  const ssR = ssSize * 0.42;

  // Hexagon vertices
  function inHexagon(px, py, hexR, thickness) {
    const dx = Math.abs(px - sscx);
    const dy = Math.abs(py - sscy);
    const h = hexR * Math.sin(Math.PI / 3); // ~0.866 * hexR

    // Hexagon outer boundary distance
    // In a flat-topped or pointy-topped hexagon
    const d1 = dx;
    const d2 = dx * 0.5 + dy * 0.866025;
    const dist = Math.max(d1, d2);

    if (dist <= hexR && dist >= hexR - thickness) {
      return true;
    }
    return false;
  }

  // Central F monogram with forge flame geometry
  function inForgeMonogram(px, py) {
    // Relative coordinates [-1, 1] inside center
    const nx = (px - sscx) / (ssSize * 0.28);
    const ny = (py - sscy) / (ssSize * 0.28);

    // Vertical stem of F
    if (nx >= -0.75 && nx <= -0.25 && ny >= -0.75 && ny <= 0.75) {
      return true;
    }
    // Top bar of F
    if (nx >= -0.75 && nx <= 0.70 && ny >= -0.75 && ny <= -0.32) {
      return true;
    }
    // Middle bar of F
    if (nx >= -0.75 && nx <= 0.45 && ny >= -0.15 && ny <= 0.22) {
      return true;
    }
    // Flame tip accent at top right
    if (nx >= 0.35 && nx <= 0.70 && ny >= -0.32 && ny <= -0.05) {
      const diag = (nx - 0.35) - (ny + 0.32);
      if (diag <= 0.1) return true;
    }
    return false;
  }

  const ringThick = ssSize * 0.085;
  for (let sy = 0; sy < ssSize; sy++) {
    for (let sx = 0; sx < ssSize; sx++) {
      if (inHexagon(sx, sy, ssR, ringThick) || inForgeMonogram(sx, sy)) {
        ssBuf[sy * ssSize + sx] = 1;
      }
    }
  }

  // Downsample to target size
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let count = 0;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          count += ssBuf[(y * scale + dy) * ssSize + (x * scale + dx)];
        }
      }
      const alpha = (count / (scale * scale)) * 255;
      if (alpha > 0) {
        setPixel(x, y, alpha);
      }
    }
  }

  return createPng(size, size, buf);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate badge files: 96x96, 72x72, and badge-monochrome.png
const badge96 = drawBadge(96);
const badge72 = drawBadge(72);

fs.writeFileSync(path.join(iconsDir, 'badge-96x96.png'), badge96);
fs.writeFileSync(path.join(iconsDir, 'badge-72x72.png'), badge72);
fs.writeFileSync(path.join(iconsDir, 'badge-monochrome.png'), badge96);
console.log('Successfully created monochrome badges: badge-96x96.png, badge-72x72.png, badge-monochrome.png');
