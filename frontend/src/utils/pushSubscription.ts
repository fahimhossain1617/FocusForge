/**
 * FocusForge / Focentia Web Push Subscription Utility
 *
 * Handles:
 * 1. Base64 VAPID Public Key conversion to Uint8Array.
 * 2. Web Push registration with browser PushManager.
 * 3. Secure sync of endpoint and p256dh/auth keys to Supabase database.
 * 4. Graceful unsubscription, key rotation, and diagnostics.
 */

import { supabase } from '../lib/supabaseClient';

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

export interface PushSyncResult {
  success: boolean;
  subscription: PushSubscription | null;
  serverResult?: any;
  error?: string;
}

/**
 * Subscribes the current device/browser to Web Push and sends the endpoint to backend
 */
export async function subscribeUserToPush(userId?: string | null): Promise<PushSyncResult> {
  if (!isPushSupported()) {
    return { success: false, subscription: null, error: 'Push notifications not supported in this browser' };
  }

  if (Notification.permission !== 'granted') {
    return { success: false, subscription: null, error: 'Notification permission not granted' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = DEFAULT_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      return { success: false, subscription: null, error: 'Missing VAPID public key' };
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidKey);
    let subscription = await registration.pushManager.getSubscription();

    // If subscription already exists, verify its validity or subscribe afresh
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
      console.log('[WebPush] Created fresh PushSubscription with PushManager.');
    }

    // Get current auth session to include valid JWT Bearer token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let resolvedUserId = userId;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      if (session?.user?.id) {
        resolvedUserId = session.user.id;
      }
    } catch {}

    if (resolvedUserId) {
      headers['x-user-id'] = resolvedUserId;
    }

    let serverResult: any = null;

    // Sync subscription payload with backend
    if (subscription) {
      const subJson = subscription.toJSON();
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subscription: subJson,
          userId: resolvedUserId,
        }),
      });

      serverResult = await res.json().catch(() => ({}));
      console.log('[WebPush] Backend subscription sync response:', serverResult);
    }

    return {
      success: Boolean(serverResult?.success),
      subscription,
      serverResult,
    };
  } catch (err: any) {
    console.error('[WebPush] Failed to subscribe user to Web Push:', err);
    return { success: false, subscription: null, error: err?.message || String(err) };
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch {}

    if (userId) {
      headers['x-user-id'] = userId;
    }

    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});

    console.log('[WebPush] Unsubscribed successfully.');
    return true;
  } catch (err) {
    console.error('[WebPush] Error unsubscribing:', err);
    return false;
  }
}

/**
 * Collects full client diagnostic details for debugging
 */
export async function getPushDiagnostics() {
  const supported = isPushSupported();
  const permission = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
  let swReady = false;
  let swScope = '';
  let subscriptionData: any = null;
  let error: string | null = null;

  if (supported) {
    try {
      const reg = await navigator.serviceWorker.ready;
      swReady = Boolean(reg);
      swScope = reg.scope;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        subscriptionData = sub.toJSON();
      }
    } catch (e: any) {
      error = e.message || String(e);
    }
  }

  return {
    supported,
    permission,
    swReady,
    swScope,
    hasSubscription: Boolean(subscriptionData),
    subscription: subscriptionData,
    vapidKeyLength: DEFAULT_VAPID_PUBLIC_KEY?.length || 0,
    error,
  };
}
