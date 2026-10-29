const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outputDir = path.resolve(__dirname, '../frontend/public/icons/orb');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// All mood definitions corresponding to NotificationOrbAvatar
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

function getHeadAngle(mood) {
  if (mood === 'curious') return 7;
  if (mood === 'thinking') return 6;
  if (mood === 'sad' || mood === 'concerned') return -4.5;
  if (mood === 'sulky') return -3.5;
  if (mood === 'playful' || mood === 'celebrating' || mood === 'happy') return 5;
  if (mood === 'proud') return -4.5;
  return 0;
}

function getEyebrows(mood) {
  if (mood === 'sad' || mood === 'concerned') {
    return `<path d="M 97 93 Q 112 86 125 93" fill="none" /><path d="M 155 93 Q 168 86 183 93" fill="none" />`;
  }
  if (mood === 'curious') {
    return `<path d="M 97 82 Q 112 73 125 83" fill="none" /><path d="M 155 92 Q 168 89 181 93" fill="none" />`;
  }
  if (mood === 'sulky') {
    return `<line x1="97" y1="92" x2="125" y2="92" /><path d="M 155 87 Q 168 80 181 87" fill="none" />`;
  }
  if (mood === 'playful' || mood === 'celebrating' || mood === 'happy') {
    return `<path d="M 97 87 Q 112 81 125 87" fill="none" /><path d="M 155 87 Q 168 81 183 87" fill="none" />`;
  }
  if (mood === 'sleepy') {
    return `<path d="M 99 95 Q 112 98 125 96" fill="none" /><path d="M 155 96 Q 168 98 181 95" fill="none" />`;
  }
  if (mood === 'thinking') {
    return `<path d="M 97 93 Q 112 89 125 94" fill="none" /><path d="M 155 86 Q 168 79 181 86" fill="none" />`;
  }
  if (mood === 'proud') {
    return `<path d="M 98 85 Q 112 78 126 85" fill="none" /><path d="M 154 85 Q 168 78 182 85" fill="none" />`;
  }
  return `<path d="M 99 90 Q 112 84 125 90" fill="none" /><path d="M 155 90 Q 168 84 181 90" fill="none" />`;
}

function getEyes(mood) {
  if (mood === 'playful') {
    return `
      <g>
        <ellipse cx="112" cy="112" rx="14.5" ry="16.5" fill="url(#notifEyeGrad)" />
        <ellipse cx="112" cy="117" rx="10" ry="5.5" fill="#64748b" opacity="0.35" />
        <circle cx="116" cy="107" r="4.8" fill="#ffffff" filter="url(#notifGlow)" />
        <circle cx="108" cy="116" r="2.2" fill="#ffffff" opacity="0.9" />
        <path d="M 151 114 Q 166 127 181 114" fill="none" stroke="#1e293b" stroke-width="3.8" stroke-linecap="round" />
        <line x1="181" y1="114" x2="188" y2="108" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round" />
      </g>
    `;
  }
  if (mood === 'sleepy') {
    return `
      <g>
        <path d="M 97 114 Q 112 123 127 114" fill="none" stroke="#1e293b" stroke-width="3.8" stroke-linecap="round" />
        <path d="M 153 114 Q 168 123 183 114" fill="none" stroke="#1e293b" stroke-width="3.8" stroke-linecap="round" />
      </g>
    `;
  }
  if (mood === 'happy' || mood === 'celebrating') {
    return `
      <g>
        <path d="M 97 115 Q 112 97 127 115" fill="none" stroke="#1e293b" stroke-width="3.8" stroke-linecap="round" />
        <path d="M 153 115 Q 168 97 183 115" fill="none" stroke="#1e293b" stroke-width="3.8" stroke-linecap="round" />
      </g>
    `;
  }
  if (mood === 'sulky') {
    // Iconic bombastic side-eye
    return `
      <g>
        <ellipse cx="112" cy="112" rx="14.5" ry="15" fill="url(#notifEyeGrad)" />
        <line x1="96" y1="106" x2="128" y2="106" stroke="#475569" stroke-width="2.6" />
        <circle cx="117" cy="113" r="5.5" fill="#334155" />
        <circle cx="119" cy="111" r="3" fill="#ffffff" filter="url(#notifGlow)" />
        <ellipse cx="168" cy="112" rx="14.5" ry="15" fill="url(#notifEyeGrad)" />
        <line x1="152" y1="106" x2="184" y2="106" stroke="#475569" stroke-width="2.6" />
        <circle cx="173" cy="113" r="5.5" fill="#334155" />
        <circle cx="175" cy="111" r="3" fill="#ffffff" filter="url(#notifGlow)" />
      </g>
    `;
  }
  return `
    <g>
      <ellipse cx="112" cy="112" rx="14.5" ry="16.5" fill="url(#notifEyeGrad)" />
      <ellipse cx="112" cy="117" rx="10" ry="5.5" fill="#64748b" opacity="0.3" />
      <circle cx="112" cy="112" r="8" fill="#475569" opacity="0.25" />
      <circle cx="116" cy="107" r="4.8" fill="#ffffff" filter="url(#notifGlow)" />
      <circle cx="108" cy="116" r="2.2" fill="#ffffff" opacity="0.9" />
      <ellipse cx="168" cy="112" rx="14.5" ry="16.5" fill="url(#notifEyeGrad)" />
      <ellipse cx="168" cy="117" rx="10" ry="5.5" fill="#64748b" opacity="0.3" />
      <circle cx="168" cy="112" r="8" fill="#475569" opacity="0.25" />
      <circle cx="172" cy="107" r="4.8" fill="#ffffff" filter="url(#notifGlow)" />
      <circle cx="164" cy="116" r="2.2" fill="#ffffff" opacity="0.9" />
    </g>
  `;
}

function getMouth(mood) {
  if (mood === 'curious') {
    return `<ellipse cx="140" cy="129" rx="4" ry="4.8" fill="#1e293b" stroke="#475569" stroke-width="1.4" />`;
  }
  if (mood === 'sulky') {
    return `<path d="M 131 134 Q 140 126 149 134" fill="none" stroke="#334155" stroke-width="2.8" stroke-linecap="round" />`;
  }
  if (mood === 'playful') {
    return `
      <g>
        <path d="M 130 123 Q 140 134 150 123" fill="none" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round" />
        <path d="M 134 126 Q 140 142 146 126 Z" fill="#ff4d79" stroke="#e11d48" stroke-width="0.9" />
      </g>
    `;
  }
  if (mood === 'sleepy') {
    return `
      <g>
        <ellipse cx="140" cy="130" rx="7.5" ry="9" fill="#1e293b" stroke="#475569" stroke-width="1.6" />
        <ellipse cx="140" cy="135" rx="4.8" ry="3.2" fill="#ff4d79" />
      </g>
    `;
  }
  if (mood === 'happy' || mood === 'celebrating') {
    return `<path d="M 131 125 Q 140 140 149 125 Z" fill="#ff4d79" stroke="#1e293b" stroke-width="1.8" />`;
  }
  if (mood === 'proud') {
    return `<path d="M 132 125 Q 140 133 150 124" fill="none" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round" />`;
  }
  if (mood === 'sad' || mood === 'concerned') {
    return `<path d="M 132 133 Q 140 125 148 133" fill="none" stroke="#334155" stroke-width="2.6" stroke-linecap="round" />`;
  }
  return `<path d="M 132 125 Q 140 132 148 125" fill="none" stroke="#334155" stroke-width="2.6" stroke-linecap="round" />`;
}

function getAccessories(mood) {
  if (mood === 'curious') {
    return `<text x="194" y="66" fill="#3b82f6" font-size="24" font-weight="bold" font-family="sans-serif" filter="url(#notifGlow)">?</text>`;
  }
  if (mood === 'sulky') {
    return `
      <g transform="translate(190, 50)" stroke="#64748b" stroke-width="2" fill="none">
        <path d="M 0 4 Q 4 0 8 4 Q 12 0 16 4 Q 20 8 16 12 Q 20 16 16 20 Q 12 16 8 20 Q 4 16 0 20 Q -4 16 0 12 Z" opacity="0.9" />
      </g>
    `;
  }
  if (mood === 'sleepy') {
    return `
      <g transform="translate(194, 68)" fill="#3b82f6" font-weight="bold">
        <text x="0" y="0" font-size="14">z</text>
        <text x="8" y="-9" font-size="17">Z</text>
        <text x="18" y="-20" font-size="22">Z</text>
      </g>
    `;
  }
  if (mood === 'proud' || mood === 'celebrating') {
    return `
      <g transform="translate(196, 52)">
        <path d="M 0 -14 Q 1.8 -2 12 0 Q 1.8 2 0 14 Q -1.8 2 -12 0 Q -1.8 -2 0 -14 Z" fill="url(#notifGoldStar)" filter="url(#notifGlow)" />
        <path d="M 0 -9 Q 1.2 -1.5 8 0 Q 1.2 1.5 0 9 Q -1.2 1.5 -8 0 Q -1.2 -1.5 0 -9 Z" fill="url(#notifGoldStar)" filter="url(#notifGlow)" transform="translate(-7, 22)" />
      </g>
    `;
  }
  if (mood === 'thinking') {
    return `
      <g>
        <path d="M 194 162 C 206 148, 198 132, 172 134" fill="none" stroke="url(#notifHandGrad)" stroke-width="15" stroke-linecap="round" filter="url(#notifGlow)" />
        <g transform="translate(162, 136)">
          <circle cx="0" cy="0" r="12" fill="url(#notifHandGrad)" stroke="#cbd5e1" stroke-width="1.6" />
          <path d="M -5 -4 Q 0 -7 5 -4" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" />
        </g>
      </g>
    `;
  }
  if (mood === 'celebrating') {
    return `
      <g stroke="#94a3b8" stroke-width="11" stroke-linecap="round">
        <line x1="68" y1="140" x2="54" y2="108" />
        <circle cx="52" cy="104" r="8.5" fill="url(#notifHandGrad)" stroke="#cbd5e1" stroke-width="1.6" />
        <line x1="212" y1="140" x2="226" y2="108" />
        <circle cx="228" cy="104" r="8.5" fill="url(#notifHandGrad)" stroke="#cbd5e1" stroke-width="1.6" />
      </g>
    `;
  }
  return '';
}

function generateSvg(mood) {
  const headAngle = getHeadAngle(mood);
  const eyebrows = getEyebrows(mood);
  const eyes = getEyes(mood);
  const mouth = getMouth(mood);
  const accessories = getAccessories(mood);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="54 40 172 172" width="192" height="192">
  <defs>
    <radialGradient id="notifSphereAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#94a3b8" stop-opacity="0.18" />
      <stop offset="70%" stop-color="#cbd5e1" stop-opacity="0.06" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="notifWhitePearl" cx="36%" cy="26%" r="74%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="40%" stop-color="#f8fafc" stop-opacity="1" />
      <stop offset="82%" stop-color="#e2e8f0" stop-opacity="1" />
      <stop offset="100%" stop-color="#cbd5e1" stop-opacity="1" />
    </radialGradient>
    <linearGradient id="notifSpecular" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.38" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <radialGradient id="notifPinkBlush" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff3366" stop-opacity="0.55" />
      <stop offset="60%" stop-color="#ff4d79" stop-opacity="0.20" />
      <stop offset="100%" stop-color="#ff4d79" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="notifGoldStar" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="45%" stop-color="#facc15" />
      <stop offset="100%" stop-color="#ca8a04" />
    </linearGradient>
    <radialGradient id="notifEyeGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="65%" stop-color="#080d1a" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    <radialGradient id="notifHandGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#f1f5f9" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </radialGradient>
    <filter id="notifGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <ellipse cx="140" cy="208" rx="58" ry="7.5" fill="rgba(100, 116, 139, 0.22)" />
  <circle cx="140" cy="126" r="92" fill="url(#notifSphereAura)" />

  <g transform="rotate(${headAngle}, 140, 126)">
    <circle cx="140" cy="126" r="76" fill="url(#notifWhitePearl)" stroke="rgba(203, 213, 225, 0.65)" stroke-width="1.5" />
    <path d="M 88 76 C 100 52, 140 46, 184 60 C 148 53, 108 60, 88 76 Z" fill="url(#notifSpecular)" />
    <ellipse cx="105" cy="76" rx="16" ry="10" fill="url(#notifSpecular)" transform="rotate(-28, 105, 76)" />
    <circle cx="101" cy="72" r="5" fill="#ffffff" opacity="0.85" filter="url(#notifGlow)" />

    <ellipse cx="93" cy="132" rx="12" ry="7.5" fill="url(#notifPinkBlush)" filter="url(#notifGlow)" />
    <ellipse cx="187" cy="132" rx="12" ry="7.5" fill="url(#notifPinkBlush)" filter="url(#notifGlow)" />

    <g stroke="#334155" stroke-width="2.4" stroke-linecap="round" opacity="0.95">
      ${eyebrows}
    </g>

    ${eyes}
    ${mouth}
    ${accessories}
  </g>
</svg>`;
}

// Generate all SVGs
for (const mood of moods) {
  const svg = generateSvg(mood);
  fs.writeFileSync(path.join(outputDir, `orb-${mood}.svg`), svg, 'utf8');
}
console.log(`Generated SVGs for ${moods.length} moods in ${outputDir}`);

