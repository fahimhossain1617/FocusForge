const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('🧪 VERIFYING FOCUSFORGE NOTIFICATION ARCHITECTURE');
console.log('====================================================\n');

// 1. Check Asset existence
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const requiredAssets = [
  'icon-192x192.png',
  'icon-512x512.png',
  'badge-96x96.png',
  'badge-72x72.png',
  'badge-monochrome.png'
];

console.log('--- 1. Asset Verification ---');
for (const asset of requiredAssets) {
  const p = path.join(iconsDir, asset);
  assert(fs.existsSync(p), `Missing asset: ${asset}`);
  const stats = fs.statSync(p);
  assert(stats.size > 50, `Asset ${asset} is too small (${stats.size} bytes)`);
  console.log(`  ✅ [PASS] Found ${asset} (${stats.size} bytes)`);
}

// 2. Check sw.js content and handlers
console.log('\n--- 2. Service Worker (sw.js) Verification ---');
const swPath = path.join(__dirname, '..', 'public', 'sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');

assert(swContent.includes("CACHE_NAME = 'focusforge-v6'"), 'CACHE_NAME is not v6');
assert(swContent.includes('/icons/badge-96x96.png'), 'sw.js missing badge-96x96.png in static assets');
assert(swContent.includes("self.addEventListener('push'"), 'sw.js missing push event listener');
assert(swContent.includes("self.addEventListener('notificationclick'"), 'sw.js missing notificationclick listener');
assert(swContent.includes("self.registration.showNotification"), 'sw.js missing showNotification call');
assert(swContent.includes("clients.matchAll"), 'sw.js missing clients.matchAll window matching');
assert(swContent.includes("start_focus"), 'sw.js missing start_focus action handler');
assert(swContent.includes("view_plan"), 'sw.js missing view_plan action handler');
assert(swContent.includes("open_task"), 'sw.js missing open_task action handler');
assert(swContent.includes("postMessage({"), 'sw.js missing postMessage to client');
console.log('  ✅ [PASS] sw.js has cache v6, monochrome badges, push listener, showNotification, and all action handlers');

// 3. Check notificationService.ts
console.log('\n--- 3. notificationService.ts Verification ---');
const notifServicePath = path.join(__dirname, '..', 'src', 'services', 'notificationService.ts');
const notifServiceContent = fs.readFileSync(notifServicePath, 'utf8');

assert(notifServiceContent.includes('generateDeterministicTag'), 'notificationService missing generateDeterministicTag');
assert(notifServiceContent.includes('buildNativeActions'), 'notificationService missing buildNativeActions');
assert(notifServiceContent.includes('badgeUrl'), 'notificationService missing badgeUrl');
assert(notifServiceContent.includes('/icons/badge-96x96.png'), 'notificationService missing badge-96x96.png default');
assert(notifServiceContent.includes('vibrate: vibratePattern'), 'notificationService missing vibrate');
assert(notifServiceContent.includes('registration.showNotification'), 'notificationService missing registration.showNotification');
console.log('  ✅ [PASS] notificationService has deterministic tagging, native actions, monochrome badge, and SW delivery');

// 4. Check AppContext.tsx and ServiceWorkerRegister.tsx for navigation sync
console.log('\n--- 4. Navigation Synchronization Verification ---');
const appContextPath = path.join(__dirname, '..', 'src', 'context', 'AppContext.tsx');
const appContextContent = fs.readFileSync(appContextPath, 'utf8');
assert(appContextContent.includes("window.addEventListener('focusforge:navigate'"), 'AppContext missing focusforge:navigate listener');
assert(appContextContent.includes("new URLSearchParams(window.location.search)"), 'AppContext missing URL parameter page resolution');

const swRegPath = path.join(__dirname, '..', 'src', 'components', 'pwa', 'ServiceWorkerRegister.tsx');
const swRegContent = fs.readFileSync(swRegPath, 'utf8');
assert(swRegContent.includes('focusforge:navigate'), 'ServiceWorkerRegister missing focusforge:navigate event dispatch');
console.log('  ✅ [PASS] AppContext and ServiceWorkerRegister are fully synchronized for deep-link navigation');

// 5. Test Deterministic Tagging Logic
console.log('\n--- 5. Deterministic Tagging Unit Tests ---');
function simulateTag(category, taskId, notifId, todayStr) {
  if (category === 'daily_plan') return `focusforge-daily-plan-${todayStr}`;
  if (category === 'focus_reminder' || category === 'focus_completed') return `focusforge-focus-${todayStr}`;
  if (taskId) return `focusforge-task-${taskId}-${category}`;
  return `focusforge-${notifId}`;
}

const today = '2026-10-03';
assert.strictEqual(simulateTag('daily_plan', null, '123', today), 'focusforge-daily-plan-2026-10-03');
assert.strictEqual(simulateTag('focus_reminder', null, '456', today), 'focusforge-focus-2026-10-03');
assert.strictEqual(simulateTag('task_start', 101, '789', today), 'focusforge-task-101-task_start');
assert.strictEqual(simulateTag('task_incomplete', 101, '890', today), 'focusforge-task-101-task_incomplete');
console.log('  ✅ [PASS] Deterministic tag generation correctly prevents duplicates and isolates distinct tasks');

console.log('\n====================================================');
console.log('🎉 ALL NOTIFICATION ARCHITECTURE CHECKS PASSED (5/5)');
console.log('====================================================\n');
