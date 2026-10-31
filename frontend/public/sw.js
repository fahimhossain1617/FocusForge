// Focentia Progressive Web App Service Worker
const CACHE_NAME = 'focentia-build-1793451480627';
const IMMUTABLE_CACHE = 'focentia-immutable-static-v1';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
  '/icons/badge-large.png',
  '/icons/badge-large.png?v=max_zoom_1',
  '/icons/badge-48x48.png',
  '/icons/badge-96x96.png',
  '/icons/badge-72x72.png',
  '/icons/badge-monochrome.png',
  '/icons/notification-badge.png',
  '/badge-large.png',
  '/badge-48x48.png',
  '/badge-96x96.png',
  '/notification-badge.png',
  '/logo.png',
  '/icons/orb/orb-attentive.png',
  '/icons/orb/orb-curious.png',
  '/icons/orb/orb-thinking.png',
  '/icons/orb/orb-concerned.png',
  '/icons/orb/orb-sulky.png',
  '/icons/orb/orb-celebrating.png',
  '/icons/orb/orb-happy.png',
  '/icons/orb/orb-sleepy.png',
  '/icons/orb/orb-proud.png',
  '/icons/orb/orb-sad.png',
  '/icons/orb/orb-playful.png',
];

// Background reminder storage and active timers map
// Background reminder storage and active timers map

// Glori AI Orb face icon resolution matching exact mood/category reactions
function getNotificationOrbIcon(moodOrCategory) {
  switch (moodOrCategory) {
    case 'celebrating':
    case 'task_completed':
      return '/icons/orb/orb-celebrating.png';
    case 'happy':
    case 'focus_completed':
      return '/icons/orb/orb-happy.png';
    case 'proud':
    case 'streak_milestone':
      return '/icons/orb/orb-proud.png';
    case 'thinking':
    case 'task_pre_reminder':
      return '/icons/orb/orb-thinking.png';
    case 'curious':
    case 'daily_plan':
    case 'skill_reminder':
    case 'learning':
      return '/icons/orb/orb-curious.png';
    case 'concerned':
    case 'task_incomplete':
      return '/icons/orb/orb-concerned.png';
    case 'sulky':
    case 'inactivity':
      return '/icons/orb/orb-sulky.png';
    case 'sleepy':
    case 'break_time':
    case 'diary_reminder':
    case 'diary':
      return '/icons/orb/orb-sleepy.png';
    case 'playful':
    case 'ai_companion':
      return '/icons/orb/orb-playful.png';
    case 'sad':
      return '/icons/orb/orb-sad.png';
    case 'attentive':
    case 'focus_reminder':
    case 'focus':
    case 'task_start':
    case 'task':
    default:
      return '/icons/orb/orb-attentive.png';
  }
}

let activeScheduledReminders = [];
const activeReminderTimers = new Map();
const triggeredReminderIds = new Set();

// ==================== IndexedDB Persistence for Scheduled Reminders ====================
function openRemindersDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const request = indexedDB.open('focentia_reminders_db', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('reminders')) {
          db.createObjectStore('reminders', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveRemindersToIDB(reminders) {
  if (!Array.isArray(reminders)) return;
  const db = await openRemindersDB();
  if (!db) return;
  try {
    const tx = db.transaction('reminders', 'readwrite');
    const store = tx.objectStore('reminders');
    store.clear();
    for (const r of reminders) {
      store.put(r);
    }
  } catch (err) {
    console.warn('[SW] IDB saveReminders warning:', err);
  }
}

async function loadRemindersFromIDB() {
  const db = await openRemindersDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction('reminders', 'readonly');
      const store = tx.objectStore('reminders');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function clearAllReminderTimers() {
  for (const timer of activeReminderTimers.values()) {
    clearTimeout(timer);
  }
  activeReminderTimers.clear();
}

async function triggerScheduledNotification(reminder) {
  if (!reminder || triggeredReminderIds.has(reminder.id)) return;
  triggeredReminderIds.add(reminder.id);

  try {
    // OS notification is delivered so user receives notifications whether inside or outside the app.

    const category = reminder.category || 'system';
    const actionRoute = reminder.actionRoute || '';
    const deterministicTag = reminder.tag || `focentia-${reminder.id}`;
    const actions = getDefaultActions(category, actionRoute);

    const isSoundActive = reminder.sound !== false;
    const options = {
      body: reminder.body,
      icon: reminder.icon || getNotificationOrbIcon(reminder.orbMood || category),
      silent: !isSoundActive,
      badge: reminder.badge || '/icons/badge-large.png?v=max_zoom_1',
      tag: deterministicTag,
      renotify: true,
      requireInteraction: Boolean(reminder.requireInteraction),
      vibrate: isSoundActive ? [100, 50, 100] : [0],
      timestamp: reminder.timestamp || Date.now(),
      data: {
        id: reminder.id,
        actionRoute,
        targetUrl: actionRoute ? `/?page=${encodeURIComponent(actionRoute)}` : '/',
        category,
        taskId: reminder.taskId,
        skillId: reminder.skillId
      }
    };

    if (actions.length > 0) {
      options.actions = actions;
    }

    await self.registration.showNotification(reminder.title, options);
  } catch (err) {
    console.warn('[SW] Scheduled notification trigger error:', err);
  }
}

function scheduleReminders(reminders, persist = true) {
  if (!Array.isArray(reminders)) return;
  // Smart incremental timer update: preserve undisturbed active timers
  const incomingIds = new Set(reminders.map(r => r.id));
  for (const [id, timer] of activeReminderTimers.entries()) {
    if (!incomingIds.has(id)) {
      clearTimeout(timer);
      activeReminderTimers.delete(id);
    }
  }
  activeScheduledReminders = reminders;

  if (persist) {
    saveRemindersToIDB(reminders);
  }

  const now = Date.now();
  for (const item of reminders) {
    if (!item.targetTimestamp || triggeredReminderIds.has(item.id)) continue;
    if (activeReminderTimers.has(item.id)) continue;
    const delay = item.targetTimestamp - now;

    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      // 1. Native Chromium / Android Notification Triggers API (runs even if browser is closed/offline)
      if (typeof self.TimestampTrigger !== 'undefined') {
        try {
          const trigger = new self.TimestampTrigger(item.targetTimestamp);
          const category = item.category || 'system';
          const actionRoute = item.actionRoute || '';
          const deterministicTag = item.tag || `focentia-${item.id}`;
          const actions = getDefaultActions(category, actionRoute);
          const isSoundActive = item.sound !== false;
          const notifOptions = {
            body: item.body,
            icon: item.icon || getNotificationOrbIcon(item.orbMood || item.category),
            badge: item.badge || '/icons/badge-large.png?v=max_zoom_1',
            tag: deterministicTag,
            showTrigger: trigger,
            renotify: true,
            requireInteraction: Boolean(item.requireInteraction || item.isUrgent),
            silent: !isSoundActive,
            vibrate: isSoundActive ? [100, 50, 100] : [0],
            timestamp: item.targetTimestamp,
            data: {
              id: item.id,
              actionRoute,
              targetUrl: actionRoute ? `/?page=${encodeURIComponent(actionRoute)}` : '/',
              category,
              taskId: item.taskId,
              skillId: item.skillId
            }
          };
          if (actions.length > 0) notifOptions.actions = actions;
          self.registration.showNotification(item.title, notifOptions).catch(() => {});
        } catch {}
      }

      // 2. In-memory timer fallback while worker remains active
      const timer = setTimeout(() => {
        triggerScheduledNotification(item);
        activeReminderTimers.delete(item.id);
      }, delay);
      activeReminderTimers.set(item.id, timer);
    } else if (delay <= 0) {
      // Anti-avalanche catch-up window:
      // For tasks: if within 10 minutes, trigger it. Older than 10m: skip silently.
      // For automated nudges: if within 3 minutes, trigger it. Older than 3m: skip silently.
      const isTask = (item.category && item.category.startsWith('task')) || item.priority === 1;
      const maxPastWindow = isTask ? -45 * 60 * 1000 : -15 * 60 * 1000;
      if (delay >= maxPastWindow) {
        triggerScheduledNotification(item);
      } else {
        triggeredReminderIds.add(item.id);
      }
    }
  }
}

// Restore and arm scheduled reminders from IndexedDB
async function restoreAndArmReminders() {
  const saved = await loadRemindersFromIDB();
  if (Array.isArray(saved) && saved.length > 0) {
    scheduleReminders(saved, false);
  }
}

// Check due reminders across IDB with anti-avalanche protection
async function checkDueReminders() {
  const reminders = activeScheduledReminders.length > 0 ? activeScheduledReminders : await loadRemindersFromIDB();
  if (!Array.isArray(reminders) || reminders.length === 0) return;
  const now = Date.now();
  for (const item of reminders) {
    if (!item.targetTimestamp || triggeredReminderIds.has(item.id)) continue;
    const diff = now - item.targetTimestamp;
    const isTask = (item.category && item.category.startsWith('task')) || item.priority === 1;
    const maxWindow = isTask ? 45 * 60 * 1000 : 15 * 60 * 1000;
    if (diff >= 0 && diff < maxWindow) {
      await triggerScheduledNotification(item);
    } else if (diff >= maxWindow) {
      triggeredReminderIds.add(item.id);
    }
  }
}

// Auto-arm reminders on worker startup
restoreAndArmReminders().catch(() => {});

// Message listener to trigger immediate skip waiting or schedule reminders from client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting') {
    self.skipWaiting();
  } else if (event.data.type === 'SCHEDULE_REMINDERS') {
    scheduleReminders(event.data.reminders, true);
  } else if (event.data.type === 'CHECK_REMINDERS') {
    event.waitUntil(checkDueReminders());
  } else if (event.data.type === 'CANCEL_REMINDER' && event.data.id) {
    triggeredReminderIds.add(event.data.id);
    const timer = activeReminderTimers.get(event.data.id);
    if (timer) {
      clearTimeout(timer);
      activeReminderTimers.delete(event.data.id);
    }
  }
});

// Periodic background sync if supported by Android/Chromium browser
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'focentia-reminders') {
    event.waitUntil(checkDueReminders());
  }
});

// Standard background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'focentia-reminders' || event.tag === 'focentia-sync-reminders') {
    event.waitUntil(checkDueReminders());
  }
});

// Install: Pre-cache app shell assets reliably with Promise.allSettled
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        STATIC_ASSETS.map(async (asset) => {
          try {
            const cleanAsset = asset.split('?')[0];
            const res = await fetch(asset, { cache: 'no-cache' });
            if (res && res.status === 200) {
              await cache.put(asset, res.clone());
              if (cleanAsset !== asset) {
                await cache.put(cleanAsset, res);
              }
            }
          } catch (err) {
            console.warn('[SW] Pre-caching asset warning:', asset, err);
          }
        })
      );
    })
  );
});

// Activate: Clean up any outdated caches and restore reminders (preserving immutable static store)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key !== IMMUTABLE_CACHE) {
              return caches.delete(key);
            }
          })
        );
      }),
      restoreAndArmReminders()
    ]).then(() => self.clients.claim())
  );
});

// Fetch: Safe caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never cache non-GET requests (e.g. POST, PUT, DELETE)
  if (request.method !== 'GET') {
    return;
  }

  // 2. Never cache dynamic backend/API requests or chrome extensions
  if (url.pathname.startsWith('/api/') || url.protocol.startsWith('chrome-extension')) {
    return;
  }

  // 3. For Next.js immutable static bundles (chunks, css, media, fonts), serve Cache-First / Stale-While-Revalidate
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      (async () => {
        const immutableCache = await caches.open(IMMUTABLE_CACHE);
        const cachedResponse = (await immutableCache.match(request, { ignoreSearch: true })) || (await caches.match(request, { ignoreSearch: true }));
        if (cachedResponse) {
          // Revalidate in background when online to keep cached chunks fresh
          if (typeof navigator === 'undefined' || navigator.onLine) {
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                immutableCache.put(request, networkResponse.clone());
              }
            }).catch(() => {});
          }
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            immutableCache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const fallback = await caches.match(request, { ignoreSearch: true });
          if (fallback) return fallback;
          return new Response('', { status: 408, statusText: 'Request timed out / offline' });
        }
      })()
    );
    return;
  }

  // Bypass other dynamic Next.js internals (e.g. HMR, dev middleware)
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  // 4. Static Assets (Icons, images, fonts)
  const isStaticAsset = 
    url.pathname.startsWith('/icons/') || 
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/i);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        }).catch(() => caches.match(request, { ignoreSearch: true }));
      })
    );
    return;
  }

  // 5. HTML Navigation: Instant Cache-First with Background Revalidation for sub-0.3s launch and 100% offline support
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = (await caches.match(request, { ignoreSearch: true })) || (await caches.match('/', { ignoreSearch: true }));

        // Fast offline path: return cached app shell immediately
        if (cached && typeof navigator !== 'undefined' && !navigator.onLine) {
          return cached;
        }

        // Background fetch to keep cached app shell updated when online
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put('/', responseClone.clone());
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => null);

        // If cached app shell exists, return INSTANTLY (sub-15ms)
        if (cached) {
          event.waitUntil(fetchPromise);
          return cached;
        }

        // First-time visit: wait for network response
        const networkResponse = await fetchPromise;
        if (networkResponse) return networkResponse;

        const fallback = (await caches.match('/', { ignoreSearch: true })) || (await caches.match(request, { ignoreSearch: true }));
        if (fallback) return fallback;

        return fetch(request);
      })()
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request, { ignoreSearch: true }))
  );
});

// ==================== Notification & Push Listeners ====================

/**
 * Maps notification category to default native Web Notification actions for Android / Chromium PWA
 */
function getDefaultActions(category, actionRoute) {
  switch (category) {
    case 'daily_plan':
      return [
        { action: 'view_plan', title: 'View Plan' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'focus_reminder':
    case 'focus':
      return [
        { action: 'start_focus', title: 'Start Focus' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'task_start':
    case 'task_pre_reminder':
    case 'task_incomplete':
    case 'task':
      return [
        { action: 'open_task', title: 'Open Task' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'skill_reminder':
    case 'learning':
      return [
        { action: 'open_learning', title: 'Practice' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'diary_reminder':
    case 'diary':
      return [
        { action: 'open_diary', title: 'Open Diary' },
        { action: 'dismiss', title: 'Dismiss' }
      ];
    case 'task_completed':
    case 'focus_completed':
    case 'streak_milestone':
      return [
        { action: 'view_stats', title: 'View Progress' }
      ];
    case 'break_time':
      return [
        { action: 'dismiss', title: 'Dismiss' }
      ];
    default:
      return actionRoute
        ? [{ action: 'open_route', title: 'Open' }, { action: 'dismiss', title: 'Dismiss' }]
        : [];
  }
}

/**
 * Handle push events from Web Push server
 */
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'Focentia', body: event.data.text() };
    }
  }

  const category = data.category || data.type || 'system';
  const actionRoute = data.actionRoute || (data.data && data.data.actionRoute) || '';
  const notifId = data.id || `push_${Date.now()}`;
  const todayStr = new Date().toISOString().split('T')[0];

  // Deterministic tag to group/replace logically identical alerts
  let deterministicTag = data.tag;
  if (!deterministicTag) {
    if (category === 'daily_plan') deterministicTag = `focentia-daily-plan-${todayStr}`;
    else if (category === 'focus_reminder' || category === 'focus_completed') deterministicTag = `focentia-focus-${todayStr}`;
    else if (data.taskId) deterministicTag = `focentia-task-${data.taskId}`;
    else if (data.skillId) deterministicTag = `focentia-skill-${data.skillId}-${todayStr}`;
    else deterministicTag = `focentia-${category}`;
  }

  const title = data.title || 'Focentia';
  const body = data.body || data.message || 'You have an update.';
  const icon = data.icon || getNotificationOrbIcon(data.orbMood || category);
  const badge = data.badge || '/icons/badge-large.png?v=max_zoom_1';
  const vibrate = data.vibrate || [100, 50, 100];
  const timestamp = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();

  const actions = Array.isArray(data.actions) && data.actions.length > 0
    ? data.actions.slice(0, 2).map((a) => ({
        action: a.action || a.label || 'view',
        title: a.title || a.label || 'View',
        icon: a.icon
      }))
    : getDefaultActions(category, actionRoute);

  const options = {
    body,
    icon,
    badge,
    tag: deterministicTag,
    renotify: data.renotify !== false,
    requireInteraction: Boolean(data.requireInteraction),
    silent: Boolean(data.silent),
    vibrate,
    timestamp,
    data: {
      ...data.data,
      id: notifId,
      actionRoute,
      targetUrl: data.targetUrl || (actionRoute ? `/?page=${actionRoute}` : '/'),
      category,
      taskId: data.taskId,
      skillId: data.skillId,
      templateId: data.templateId
    }
  };

  if (data.image) {
    options.image = data.image;
  }

  if (actions.length > 0) {
    options.actions = actions;
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Handle notification clicks & action button clicks
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickedAction = event.action;
  const notifData = event.notification.data || {};

  // If user tapped native "Dismiss" button, close notification and return
  if (clickedAction === 'dismiss') {
    return;
  }

  // Resolve target route from clicked action button or payload route
  let targetRoute = 'today';
  if (clickedAction === 'start_focus') {
    targetRoute = 'focus';
  } else if (clickedAction === 'view_plan') {
    targetRoute = 'planner';
  } else if (clickedAction === 'open_task') {
    targetRoute = 'planner';
  } else if (clickedAction === 'open_learning') {
    targetRoute = 'learning';
  } else if (clickedAction === 'open_diary') {
    targetRoute = 'diary';
  } else if (clickedAction === 'view_stats') {
    targetRoute = 'today';
  } else if (clickedAction === 'open_route' && notifData.actionRoute) {
    targetRoute = notifData.actionRoute;
  } else if (notifData.actionRoute) {
    targetRoute = notifData.actionRoute;
  }

  const targetUrl = notifData.targetUrl || (targetRoute ? `/?page=${encodeURIComponent(targetRoute)}` : '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an existing FocusForge PWA window is open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if ('postMessage' in client) {
            client.postMessage({
              type: 'NAVIGATE',
              route: targetRoute,
              taskId: notifData.taskId,
              action: clickedAction
            });
          }
          return client.focus();
        }
      }

      // 2. If app is closed/backgrounded, open a new window to target route
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

/**
 * Handle notification dismiss / close event
 */
self.addEventListener('notificationclose', (event) => {
  // Graceful event handling for analytics or logging
});

