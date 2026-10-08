/**
 * FocusForge / Focentia Server-Side Web Push Notification Service
 *
 * Utilizes standard Web Push protocol (RFC 8291 / RFC 8292) with VAPID authentication
 * to deliver OS-level background notifications directly to registered Service Workers.
 */

import webpush from 'web-push';
import { pool } from './db';

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BKiTIGiwQ4QM67m8BPFRtckuTY3jxOwNRM6m5sltJurz-ygl6jMf0mKLoQOIqPArqMEo2sVaU5TaQxvqyNy8irU';

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'DuHT8XxURd3NTsnVZC5UvEXgZfdt25Wh11aTxO5CBaM';

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  'mailto:focentia13@gmail.com';

// Initialize Web Push VAPID configuration
try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
} catch (err) {
  console.warn('[WebPush Server] Warning during VAPID configuration initialization:', err);
}

export interface WebPushPayload {
  title: string;
  body: string;
  id?: string;
  category?: string;
  actionRoute?: string;
  targetUrl?: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  taskId?: string | number;
  skillId?: string;
  requireInteraction?: boolean;
  isUrgent?: boolean;
  silent?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
  data?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Send Web Push notification to all active devices registered for a specific user
 */
export async function sendWebPushToUser(
  userId: string,
  payload: WebPushPayload
): Promise<{ sentCount: number; failedCount: number; removedExpired: number }> {
  if (!userId) {
    return { sentCount: 0, failedCount: 0, removedExpired: 0 };
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [userId]
    );

    if (!rows || rows.length === 0) {
      return { sentCount: 0, failedCount: 0, removedExpired: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      id: payload.id || `push_${Date.now()}`,
      category: payload.category || 'system',
      actionRoute: payload.actionRoute || '',
      targetUrl: payload.targetUrl || (payload.actionRoute ? `/?page=${encodeURIComponent(payload.actionRoute)}` : '/'),
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-large.png?v=max_zoom_1',
      tag: payload.tag || `focentia-${payload.category || 'system'}`,
      requireInteraction: Boolean(payload.requireInteraction),
      isUrgent: Boolean(payload.isUrgent),
      actions: payload.actions,
      data: payload.data || {},
      timestamp: payload.timestamp || Date.now(),
    });

    let sentCount = 0;
    let failedCount = 0;
    let removedExpired = 0;

    const pushPromises = rows.map(async (row) => {
      const pushSubscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payloadString, {
          TTL: 60 * 60 * 24, // 24 hours
          urgency: payload.isUrgent ? 'high' : 'normal',
        });
        sentCount++;
      } catch (pushErr: any) {
        failedCount++;
        // If the subscription has expired or is unsubscribed by browser (410 Gone / 404 Not Found), purge it
        if (pushErr?.statusCode === 410 || pushErr?.statusCode === 404) {
          try {
            await pool.query(
              `DELETE FROM push_subscriptions WHERE endpoint = $1`,
              [row.endpoint]
            );
            removedExpired++;
          } catch (deleteErr) {
            console.warn('[WebPush Server] Failed to delete expired subscription:', deleteErr);
          }
        } else {
          console.warn('[WebPush Server] Error sending push notification:', pushErr?.message || pushErr);
        }
      }
    });

    await Promise.allSettled(pushPromises);
    return { sentCount, failedCount, removedExpired };
  } catch (err: any) {
    console.error('[WebPush Server] Fatal error dispatching push notification to user:', err);
    return { sentCount: 0, failedCount: 0, removedExpired: 0 };
  }
}

/**
 * Send Web Push notification to a specific push subscription object directly
 */
export async function sendWebPushToSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: WebPushPayload
): Promise<boolean> {
  try {
    const payloadString = JSON.stringify(payload);
    await webpush.sendNotification(subscription, payloadString, {
      TTL: 60 * 60 * 24,
      urgency: payload.isUrgent ? 'high' : 'normal',
    });
    return true;
  } catch (err) {
    console.error('[WebPush Server] Failed to send direct push:', err);
    return false;
  }
}
