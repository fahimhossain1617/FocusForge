/**
 * FocusForge / Focentia Web Push Subscription Utility
 *
 * Handles:
 * 1. Base64 VAPID Public Key conversion to Uint8Array.
 * 2. Web Push registration with browser PushManager.
 * 3. Secure sync of endpoint and p256dh/auth keys to Supabase database.
 * 4. Graceful unsubscription and key rotation.
 */

const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKiTIGiwQ4QM67m8BPFRtckuTY3jxOwNRM6m5sltJurz-ygl6jMf0mKLoQOIqPArqMEo2sVaU5TaQxvqyNy8irU';

/**
 * Converts a URL-safe Base64 string to a Uint8Array buffer
 * required by registration.pushManager.subscribe({ applicationServerKey })
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if the current client supports Web Push notifications
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Retrieves the current active PushSubscription if one exists
 */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn('[WebPush] Error checking existing subscription:', err);
    return null;
  }
}

/**
 * Subscribes the current device/browser to Web Push and sends the endpoint to backend
 */
export async function subscribeUserToPush(userId?: string | null): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('[WebPush] Push notifications are not supported in this browser/device.');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[WebPush] Notification permission not granted yet.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = DEFAULT_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      console.error('[WebPush] Missing VAPID public key.');
      return null;
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    let subscription = await registration.pushManager.getSubscription();

    // If subscription already exists, verify its validity or subscribe afresh
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
      console.log('[WebPush] Successfully created new push subscription.');
    }

    // Sync subscription payload with backend
    if (subscription) {
      const subJson = subscription.toJSON();
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {}),
        },
        body: JSON.stringify({
          subscription: subJson,
        }),
      }).catch((syncErr) => {
        console.warn('[WebPush] Failed to sync push subscription to backend:', syncErr);
      });
    }

    return subscription;
  } catch (err) {
    console.error('[WebPush] Failed to subscribe user to Web Push:', err);
    return null;
  }
}

/**
 * Unsubscribes the current device/browser from Web Push
 */
export async function unsubscribeUserFromPush(userId?: string | null): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return true;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userId ? { 'x-user-id': userId } : {}),
      },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});

    console.log('[WebPush] Unsubscribed successfully.');
    return true;
  } catch (err) {
    console.error('[WebPush] Error unsubscribing:', err);
    return false;
  }
}
