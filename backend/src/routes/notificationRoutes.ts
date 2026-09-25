import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  dbGetNotificationSettings,
  dbUpsertNotificationSettings,
  dbSavePushSubscription,
  dbRemovePushSubscription,
} from '../services/db';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

router.use(requireAuth);

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
      title: isBengali ? 'FocusForge নোটিফিকেশন সফল' : 'FocusForge Notification Active',
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

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('target_date', todayStr)
      .neq('status', 'completed');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ reminders: tasks || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch reminders' });
  }
});

export default router;
