// Focentia Progressive Web App Service Worker
const CACHE_NAME = 'focentia-v11-web-push';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
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
  '/logo.png'
];

// Background reminder storage and active timers map
let activeScheduledReminders = [];
const activeReminderTimers = new Map();
const triggeredReminderIds = new Set();

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
    // Check if any client is open and actively focused
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasFocusedClient = clientList.some((c) => c.visibilityState === 'visible' && c.focused);

    // If user is actively focused in the app, the in-app banner will display it without duplicate OS noise.
    if (hasFocusedClient && !reminder.isUrgent) {
      return;
    }

    const category = reminder.category || 'system';
    const actionRoute = reminder.actionRoute || '';
    const deterministicTag = reminder.tag || `focentia-${reminder.id}`;
    const actions = getDefaultActions(category, actionRoute);

    const options = {
      body: reminder.body,
      icon: reminder.icon || '/icons/icon-192x192.png',
      badge: reminder.badge || '/icons/badge-large.png?v=max_zoom_1',
      tag: deterministicTag,
      renotify: true,
      requireInteraction: Boolean(reminder.requireInteraction),
      vibrate: reminder.isUrgent ? [150, 80, 150, 80, 200] : [100, 50, 100],
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

function scheduleReminders(reminders) {
  if (!Array.isArray(reminders)) return;
  clearAllReminderTimers();
  activeScheduledReminders = reminders;

  const now = Date.now();
  for (const item of reminders) {
    if (!item.targetTimestamp || triggeredReminderIds.has(item.id)) continue;
    const delay = item.targetTimestamp - now;
    if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
      const timer = setTimeout(() => {
        triggerScheduledNotification(item);
        activeReminderTimers.delete(item.id);
      }, delay);
      activeReminderTimers.set(item.id, timer);
    } else if (delay >= -45000 && delay <= 0) {
      // Within last 45 seconds: trigger immediately
      triggerScheduledNotification(item);
    }
  }
}

// Message listener to trigger immediate skip waiting or schedule reminders from client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting') {
    self.skipWaiting();
  } else if (event.data.type === 'SCHEDULE_REMINDERS') {
    scheduleReminders(event.data.reminders);
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
    event.waitUntil((async () => {
      const now = Date.now();
      for (const item of activeScheduledReminders) {
        if (!triggeredReminderIds.has(item.id) && item.targetTimestamp <= now && now - item.targetTimestamp < 15 * 60 * 1000) {
          await triggerScheduledNotification(item);
        }
      }
    })());
  }
});

// Install: Pre-cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up any outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
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

  // 3. For Next.js internal dynamic bundles, bypass cache to avoid chunk mismatch
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  // 4. Static Assets (Icons, images, fonts)
  const isStaticAsset = 
    url.pathname.startsWith('/icons/') || 
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf|eot)$/i);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
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
        });
      })
    );
    return;
  }

  // 5. HTML Navigation: Instant Cache-First with Background Revalidation for sub-0.3s launch
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = (await caches.match('/')) || (await caches.match(request));

        // Background fetch to keep cached app shell updated
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put('/', responseClone));
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

        return cached || fetch(request);
      })()
    );
    return;
  }

  // Default: Network with cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
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
  const icon = data.icon || '/icons/icon-192x192.png';
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
    targetRoute = 'tasks';
  } else if (clickedAction === 'open_learning') {
    targetRoute = 'learning';
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

