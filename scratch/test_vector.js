const sharp = require('../frontend/node_modules/sharp');
const fs = require('fs');
const path = require('path');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="512" height="512">
  <rect width="1024" height="1024" fill="#ffffff" rx="0" />
  <g transform="translate(512, 512) scale(0.9) translate(-620, -635)" fill="#061f52">
    <path d="M390 632V548C390 440 470 366 580 366H750C810 366 850 350 870 332C868 400 830 465 740 468H585C548 468 522 495 522 530V632Z" />
    <path d="M853 524L856 600C858 630 845 648 832 656L500 925C490 932 460 936 417 938L497 862C560 848 595 800 598 740C598 715 592 700 585 692C650 650 760 570 853 524Z" />
    <circle cx="473" cy="745" r="97" stroke-width="15" fill="#ffffff" stroke="#061f52" />
    <circle cx="473" cy="745" r="45" fill="#061f52" />
    <circle cx="473" cy="745" r="14" fill="#ffffff" />
    <path d="M473 662v16M473 812v16M390 745h16M540 745h16" stroke-width="5" fill="none" stroke="#061f52" />
  </g>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile(path.join(__dirname, '..', 'frontend', 'public', 'test-vector-icon.png'))
  .then(() => {
    console.log('test-vector-icon.png created successfully!');
  })
  .catch(console.error);
