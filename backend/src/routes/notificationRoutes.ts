import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  dbGetNotificationSettings,
  dbUpsertNotificationSettings,
  dbSavePushSubscription,
  dbRemovePushSubscription,
  dbGetTasks,
  dbGetNotifications,
  dbSaveNotification,
  dbMarkNotificationRead,
  dbMarkAllNotificationsRead,
  dbDeleteNotification,
  dbClearNotifications,
  dbGetRotationStates,
  dbSaveRotationState,
} from '../services/db';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
router.use(requireAuth);

/**
 * GET /api/notifications
 * Fetch notification history for current user
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ notifications: [] });
    }

    const notifications = await dbGetNotifications(userId);
    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notifications' });
  }
});

/**
 * POST /api/notifications/sync
 * Sync/save notifications from client to database
 */
router.post('/sync', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true, guest: true });
    }

    const { notifications } = req.body;
    if (Array.isArray(notifications)) {
      for (const n of notifications) {
        if (n && n.title) {
          await dbSaveNotification(userId, n);
        }
      }
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to sync notifications' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true });
    }

    await dbMarkAllNotificationsRead(userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to mark notifications read' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark single notification as read
 */
router.patch('/:id/read', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true });
    }

    const notifId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (notifId) {
      await dbMarkNotificationRead(userId, notifId);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to mark notification read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Dismiss/delete single notification
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true });
    }

    const notifId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (notifId) {
      await dbDeleteNotification(userId, notifId);
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete notification' });
  }
});

/**
 * DELETE /api/notifications
 * Clear all notifications for user
 */
router.delete('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true });
    }

    await dbClearNotifications(userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear notifications' });
  }
});

/**
 * GET /api/notifications/rotation
 * Get rotation state for user
 */
router.get('/rotation', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ rotation: {} });
    }

    const rotation = await dbGetRotationStates(userId);
    res.json({ rotation });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get rotation states' });
  }
});

/**
 * POST /api/notifications/rotation
 * Save rotation state for user & category
 */
router.post('/rotation', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true });
    }

    const { category, bag, lastUsedId } = req.body;
    if (!category || !Array.isArray(bag)) {
      return res.status(400).json({ error: 'Invalid category or bag' });
    }

    await dbSaveRotationState(userId, category, bag, lastUsedId || null);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save rotation state' });
  }
});

/**
 * GET /api/notifications/settings
 * Fetch notification preferences for current user
 */
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({
        pushEnabled: true,
        taskReminders: true,
        focusReminders: true,
        dailyProgressReminders: true,
        dailyReminderTime: '20:00',
        timezone: 'UTC',
      });
    }

    const settings = await dbGetNotificationSettings(userId);
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch notification settings' });
  }
});

/**
 * POST /api/notifications/settings
 * Update notification preferences
 */
router.post('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true, guest: true });
    }

    const settings = await dbUpsertNotificationSettings(userId, req.body);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update notification settings' });
  }
});

/**
 * POST /api/notifications/subscribe
 * Register a web push subscription
 */
router.post('/subscribe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true, guest: true });
    }

    const { subscription } = req.body;
    const userAgent = req.headers['user-agent'] || '';

    await dbSavePushSubscription(userId, subscription, userAgent);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Subscription failed' });
  }
});

/**
 * POST /api/notifications/unsubscribe
 * Unregister a web push subscription
 */
router.post('/unsubscribe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true });
    }

    const { endpoint } = req.body;
    await dbRemovePushSubscription(userId, endpoint);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Unsubscribe failed' });
  }
});

/**
 * POST /api/notifications/test
 * Triggers a test notification payload or checks user notification subscription
 */
router.post('/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const lang = req.headers['x-app-lang'] === 'en' ? 'en' : 'bn';
    const isBengali = lang === 'bn';

    const payload = {
      title: isBengali ? 'Focentia নোটিফিকেশন সফল' : 'Focentia Notification Active',
      body: isBengali 
        ? 'আপনার নোটিফিকেশন সিস্টেম সম্পূর্ণ সক্রিয় রয়েছে। সময়মতো আপনার কাজের রিমাইন্ডার পাবেন।' 
        : 'Your notification system is fully active. You will receive your scheduled task reminders on time.',
      timestamp: new Date().toISOString(),
      lang,
    };

    res.json({ success: true, payload });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Notification test failed' });
  }
});

/**
 * GET /api/notifications/reminders
 * Returns upcoming task reminders for the authenticated user for today
 */
router.get('/reminders', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ reminders: [] });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const tasks = await dbGetTasks(userId, todayStr);
    const pendingWithReminders = tasks.filter((t: any) => !t.completed && t.status !== 'completed');

    res.json({ reminders: pendingWithReminders || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch reminders' });
  }
});

export default router;
