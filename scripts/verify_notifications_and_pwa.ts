import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    passed++;
  } else {
    console.error(`[FAIL] ${msg}`);
    failed++;
  }
}

// 1. Verify orb icons exist on disk
const orbDir = path.resolve(__dirname, '../frontend/public/icons/orb');
const requiredMoods = [
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

for (const mood of requiredMoods) {
  const pngPath = path.join(orbDir, `orb-${mood}.png`);
  const svgPath = path.join(orbDir, `orb-${mood}.svg`);
  assert(fs.existsSync(pngPath) && fs.statSync(pngPath).size > 1000, `Orb PNG exists and valid: orb-${mood}.png`);
  assert(fs.existsSync(svgPath) && fs.statSync(svgPath).size > 500, `Orb SVG exists and valid: orb-${mood}.svg`);
}

// 2. Verify sw.js static pre-cache and silence
const swPath = path.resolve(__dirname, '../frontend/public/sw.js');
const swCode = fs.readFileSync(swPath, 'utf8');

assert(swCode.includes('/icons/orb/orb-attentive.png'), 'sw.js includes /icons/orb/ in STATIC_ASSETS');
assert(swCode.includes('function getNotificationOrbIcon'), 'sw.js has getNotificationOrbIcon function');
assert(swCode.includes('silent: true'), 'sw.js forces silent: true for notifications');
assert(!swCode.includes('clearAllReminderTimers();\n  activeScheduledReminders = reminders;'), 'sw.js avoids wiping active timers on every sync');

// 3. Verify notificationService.ts
const notifServicePath = path.resolve(__dirname, '../frontend/src/services/notificationService.ts');
const notifCode = fs.readFileSync(notifServicePath, 'utf8');

assert(notifCode.includes('export function getNotificationOrbIcon'), 'notificationService exports getNotificationOrbIcon');
assert(notifCode.includes('private dailyLimit: number = 3'), 'notificationService daily limit is strictly 3');
assert(notifCode.includes('private soundEnabled: boolean = false'), 'notificationService soundEnabled defaults to false');
assert(notifCode.includes('silent: true'), 'notificationService dispatches with silent: true');
assert(notifCode.includes('Date.now() - this.appBootTime < 10000'), 'notificationService has boot shield preventing startup burst');

// 4. Verify localNotificationScheduler.ts
const schedulerPath = path.resolve(__dirname, '../frontend/src/services/localNotificationScheduler.ts');
const schedulerCode = fs.readFileSync(schedulerPath, 'utf8');

assert(schedulerCode.includes('getNotificationOrbIcon'), 'localNotificationScheduler uses getNotificationOrbIcon');
assert(schedulerCode.includes('localStorage.getItem(LOCAL_REMINDERS_DB_KEY)'), 'localNotificationScheduler rehydrates activeReminders from DB on startup');
assert(schedulerCode.includes('diff >= 0 && diff < 2 * 60 * 1000'), 'localNotificationScheduler enforces 2-minute freshness to eliminate startup backlog flood');
assert(schedulerCode.includes('untimedTasks'), 'localNotificationScheduler supports untimed tasks with gentle reminder');

// 5. Verify useDailyPlan.ts
const dailyPlanPath = path.resolve(__dirname, '../frontend/src/hooks/useDailyPlan.ts');
const dailyCode = fs.readFileSync(dailyPlanPath, 'utf8');

assert(dailyCode.includes('currentMinutes - schedMinutes > 15'), 'useDailyPlan suppresses morning plan burst if opening app later in day');
assert(!dailyCode.includes('await checkInactivityAndAICompanion();\n        syncScheduleToServiceWorker();'), 'useDailyPlan no longer calls syncScheduleToServiceWorker in 10-second polling loop');

// 6. Verify PWAUpdater.tsx and MobileHeader.tsx
const pwaPath = path.resolve(__dirname, '../frontend/src/components/pwa/PWAUpdater.tsx');
const pwaCode = fs.readFileSync(pwaPath, 'utf8');

assert(pwaCode.includes('localStorage.setItem("focentia_has_pwa_update", "true")'), 'PWAUpdater persists update readiness in localStorage');
assert(pwaCode.includes('sessionStorage.setItem("focentia_update_banner_dismissed", "true")'), 'PWAUpdater tracks banner dismiss while keeping navbar update alive');

const mobileHeaderPath = path.resolve(__dirname, '../frontend/src/components/navigation/MobileHeader.tsx');
const headerCode = fs.readFileSync(mobileHeaderPath, 'utf8');

assert(headerCode.includes('localStorage.getItem("focentia_has_pwa_update") === "true"'), 'MobileHeader initializes update badge from localStorage');
assert(headerCode.includes('reg?.waiting'), 'MobileHeader checks service worker waiting state on mount');

console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

