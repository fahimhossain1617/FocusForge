const sharp = require('../frontend/node_modules/sharp');
const fs = require('fs');
const path = require('path');

// 1. Master SVG template with 100% full-bleed white background
function getSvg(width = 1024, height = 1024) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${width}" height="${height}">
  <rect width="1024" height="1024" fill="#ffffff" />
  <g transform="translate(512, 512) scale(0.85) translate(-620, -635)" fill="#061f52">
    <path d="M390 632V548C390 440 470 366 580 366H750C810 366 850 350 870 332C868 400 830 465 740 468H585C548 468 522 495 522 530V632Z" />
    <path d="M853 524L856 600C858 630 845 648 832 656L500 925C490 932 460 936 417 938L497 862C560 848 595 800 598 740C598 715 592 700 585 692C650 650 760 570 853 524Z" />
    <circle cx="473" cy="745" r="97" stroke-width="15" fill="#ffffff" stroke="#061f52" />
    <circle cx="473" cy="745" r="45" fill="#061f52" />
    <circle cx="473" cy="745" r="14" fill="#ffffff" />
    <path d="M473 662v16M473 812v16M390 745h16M540 745h16" stroke-width="5" fill="none" stroke="#061f52" />
  </g>
</svg>`;
}

async function generateAll() {
  const masterSvg = getSvg(1024, 1024);
  const publicDir = path.join(__dirname, '..', 'frontend', 'public');
  const iconsDir = path.join(publicDir, 'icons');

  // Save SVG
  fs.writeFileSync(path.join(publicDir, 'app icon.svg'), masterSvg, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'app-icon.svg'), masterSvg, 'utf8');
  console.log('Saved app icon.svg and app-icon.svg');

  // List of sizes to generate
  const iconSizes = [
    { name: 'icon-512x512.png', size: 512, dir: iconsDir },
    { name: 'icon-maskable-512x512.png', size: 512, dir: iconsDir },
    { name: 'icon-384x384.png', size: 384, dir: iconsDir },
    { name: 'icon-192x192.png', size: 192, dir: iconsDir },
    { name: 'icon-maskable-192x192.png', size: 192, dir: iconsDir },
    { name: 'icon-152x152.png', size: 152, dir: iconsDir },
    { name: 'icon-144x144.png', size: 144, dir: iconsDir },
    { name: 'icon-128x128.png', size: 128, dir: iconsDir },
    { name: 'icon-96x96.png', size: 96, dir: iconsDir },
    { name: 'icon-72x72.png', size: 72, dir: iconsDir },
    { name: 'badge-96x96.png', size: 96, dir: iconsDir },
    { name: 'badge-72x72.png', size: 72, dir: iconsDir },
    { name: 'apple-touch-icon.png', size: 180, dir: publicDir },
    { name: 'favicon-32x32.png', size: 32, dir: publicDir },
    { name: 'favicon-16x16.png', size: 16, dir: publicDir },
    { name: 'logo.png', size: 512, dir: publicDir },
    { name: 'logo-light.png', size: 1024, dir: publicDir },
  ];

  for (const item of iconSizes) {
    const dest = path.join(item.dir, item.name);
    await sharp(Buffer.from(masterSvg))
      .resize(item.size, item.size)
      .png({ compressionLevel: 9 })
      .toFile(dest);
    console.log(`Generated ${item.name} (${item.size}x${item.size})`);
  }

  // Also generate favicon.ico from 32x32 PNG
  const icoDest = path.join(publicDir, 'favicon.ico');
  const png32Buffer = await sharp(Buffer.from(masterSvg)).resize(32, 32).png().toBuffer();
  fs.writeFileSync(icoDest, png32Buffer);
  console.log('Generated favicon.ico');
}

generateAll().catch(console.error);
