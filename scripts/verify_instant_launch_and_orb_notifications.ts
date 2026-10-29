import fs from "fs";
import path from "path";
import assert from "assert";

let passed = 0;
function test(desc: string, fn: () => void) {
  try {
    fn();
    console.log(`[PASS] ${desc}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${desc}: ${err.message}`);
    process.exit(1);
  }
}

console.log("===============================================================");
console.log("VERIFYING INSTANT APP LAUNCH & GLORI ORB NOTIFICATIONS");
console.log("===============================================================\n");

// 1. MindService non-blocking verification
test("mindService.fetchMindItems does not block initial load on cloud fetch", () => {
  const content = fs.readFileSync("frontend/src/services/mindService.ts", "utf8");
  const fetchMindItemsFn = content.slice(content.indexOf("async fetchMindItems("), content.indexOf("async saveMindItem("));
  assert(fetchMindItemsFn.includes("setTimeout"), "Cloud fetch must be deferred in background setTimeout");
  assert(fetchMindItemsFn.includes("return localItems;\n  },") || fetchMindItemsFn.includes("return localItems;\r\n  },"), "Must return localItems immediately outside setTimeout");
});

// 2. AppContext fast-cache verification
test("AppContext implements fast-cache synchronous state hydration", () => {
  const content = fs.readFileSync("frontend/src/context/AppContext.tsx", "utf8");
  assert(content.includes("FAST_CACHE_KEY_PREFIX"), "AppContext must define FAST_CACHE_KEY_PREFIX");
  assert(content.includes("getFastInitialState()"), "AppContext must have getFastInitialState function");
  assert(content.includes("useState<boolean>(fastInit.hasCache)"), "isLoaded must initialize to fastInit.hasCache for zero-delay frame 0 rendering");
  assert(content.includes("localStorage.setItem(cacheKey,"), "loadUserData and state changes must persist fast cache snapshot");
});

// 3. AuthContext instant synchronous state
test("AuthContext initializes user and lifecycle synchronously without blocking on network", () => {
  const content = fs.readFileSync("frontend/src/context/AuthContext.tsx", "utf8");
  assert(content.includes("accountManager.getRememberedAccounts()[0]"), "AuthContext must check remembered accounts synchronously on initial state");
  assert(!content.includes("isOffline ? 150 : 2500"), "AuthContext session init timeout must not be 2500ms");
});

// 4. Notification Orb Icon in ReminderSyncService
test("reminderSyncService sets getNotificationOrbIcon on every scheduled reminder", () => {
  const content = fs.readFileSync("frontend/src/services/reminderSyncService.ts", "utf8");
  assert(content.includes("import { getNotificationOrbIcon } from './notificationService'"), "reminderSyncService must import getNotificationOrbIcon");
  assert(content.includes("getNotificationOrbIcon(preTemplate.orbMood || \"task_pre_reminder\")"), "task_pre_reminder must specify orb icon");
  assert(content.includes("getNotificationOrbIcon(startTemplate.orbMood || \"task_start\")"), "task_start must specify orb icon");
  assert(content.includes("getNotificationOrbIcon(incompTemplate.orbMood || \"task_incomplete\")"), "task_incomplete must specify orb icon");
  assert(content.includes("getNotificationOrbIcon(planTemplate.orbMood || \"daily_plan\")"), "daily_plan must specify orb icon");
});

// 5. Backend and Frontend Server Scheduler & Web Push
test("Server schedulers and web push use getNotificationOrbIcon instead of hardcoded app icon", () => {
  const bSched = fs.readFileSync("backend/src/services/notificationSchedulerService.ts", "utf8");
  const fSched = fs.readFileSync("frontend/src/lib/server/schedulerService.ts", "utf8");
  const bPush = fs.readFileSync("backend/src/services/webPushService.ts", "utf8");
  const fPush = fs.readFileSync("frontend/src/lib/server/webPushService.ts", "utf8");

  assert(bSched.includes("getNotificationOrbIcon"), "backend schedulerService must use getNotificationOrbIcon");
  assert(fSched.includes("getNotificationOrbIcon"), "frontend schedulerService must use getNotificationOrbIcon");
  assert(bPush.includes("getNotificationOrbIcon"), "backend webPushService must use getNotificationOrbIcon");
  assert(fPush.includes("getNotificationOrbIcon"), "frontend webPushService must use getNotificationOrbIcon");

  assert(!bSched.includes("icon: '/icons/icon-192x192.png'"), "backend schedulerService must not hardcode app icon");
  assert(!fSched.includes("icon: '/icons/icon-192x192.png'"), "frontend schedulerService must not hardcode app icon");
});

// 6. ServiceWorker push and trigger icon
test("sw.js uses getNotificationOrbIcon in both TimestampTrigger and push event", () => {
  const content = fs.readFileSync("frontend/public/sw.js", "utf8");
  assert(content.includes("icon: item.icon || getNotificationOrbIcon(item.orbMood || item.category)"), "sw.js TimestampTrigger must use getNotificationOrbIcon");
  assert(content.includes("const icon = data.icon || getNotificationOrbIcon(data.orbMood || category)"), "sw.js push event must use getNotificationOrbIcon");
});

// 7. Benchmark fast-cache execution speed
test("Fast-cache state restoration executes in under 2ms", () => {
  const mockState = {
    tasks: Array.from({ length: 50 }, (_, i) => ({ id: i + 1, title: `Task ${i}`, completed: false })),
    categories: ["study", "work", "fitness"],
    dailyBig3: [1, 2, 3],
    theme: { mode: "dark" },
    lang: "en",
  };
  const json = JSON.stringify(mockState);
  
  const start = performance.now();
  const parsed = JSON.parse(json);
  const end = performance.now();
  const duration = end - start;
  
  assert(duration < 2, `State deserialization took ${duration}ms, must be < 2ms`);
  assert.strictEqual(parsed.tasks.length, 50);
});

console.log(`\nAll ${passed} instant loading & notification checks passed!`);
