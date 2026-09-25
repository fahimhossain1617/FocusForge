import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import {
  dbGetUserProfile,
  dbUpdateUserProfile,
  dbCheckUsernameAvailable,
  dbCreateSupportTicket,
  dbDeleteUserAccountCompletely,
  dbUpsertTask,
  dbUpsertNote,
  dbUpsertMindItem,
  pool,
} from '../services/db';
import {
  ERROR_CODES,
  validateFullName,
  validateDisplayName,
  validatePhone,
  validateDateOfBirth,
  validateBio,
  validateGender,
  validatePassword,
} from '../services/validation';
import { checkRateLimit } from '../services/rateLimiter';
import {
  sendSupportNotificationToOwner,
  sendSupportConfirmationToUser,
  sendPasswordChangedEmail,
  sendAccountDeletedEmail,
} from '../services/emailService';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

const supabaseServiceRole = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

router.use(requireAuth);

/**
 * GET /api/user/profile
 * Get current authenticated user profile
 */
router.get('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({
        id: 'guest',
        identifier: 'guest',
        authMethod: 'email',
        displayName: 'Guest User',
        fullName: 'Guest User',
        avatarUrl: null,
      });
    }

    let profile = await dbGetUserProfile(userId);
    if (!profile) {
      profile = await dbUpdateUserProfile(userId, {
        email: req.user?.email || 'user',
        fullName: req.user?.user_metadata?.full_name || '',
        displayName: '',
      });
    }

    res.json(profile);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user profile' });
  }
});

/**
 * PATCH /api/user/profile
 * Update current user profile with server validation
 */
router.patch('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const body = req.body;

    // Server-side validations
    if (body.fullName !== undefined) {
      const v = validateFullName(body.fullName);
      if (!v.valid) return res.status(400).json({ error: v.message, code: v.code });
    }

    if (body.displayName !== undefined && body.displayName.trim() !== '') {
      const v = validateDisplayName(body.displayName);
      if (!v.valid) return res.status(400).json({ error: v.message, code: v.code });
      const available = await dbCheckUsernameAvailable(body.displayName, userId);
      if (!available) {
        return res.status(409).json({ error: 'Username is already taken.', code: ERROR_CODES.USERNAME_TAKEN });
      }
    }

    if (body.phone !== undefined) {
      const v = validatePhone(body.phone);
      if (!v.valid) return res.status(400).json({ error: v.message, code: v.code });
    }

    if (body.dateOfBirth !== undefined) {
      const v = validateDateOfBirth(body.dateOfBirth);
      if (!v.valid) return res.status(400).json({ error: v.message, code: v.code });
    }

    if (body.bio !== undefined) {
      const v = validateBio(body.bio);
      if (!v.valid) return res.status(400).json({ error: v.message, code: v.code });
    }

    if (body.gender !== undefined) {
      const v = validateGender(body.gender);
      if (!v.valid) return res.status(400).json({ error: v.message, code: v.code });
    }

    const updated = await dbUpdateUserProfile(userId, body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user profile' });
  }
});

/**
 * GET /api/user/check-username?username=...
 * Check if a display name or username is available
 */
router.get('/check-username', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const rateCheck = checkRateLimit(`check_user:${clientIp}`, 30, 60000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Too many requests', code: ERROR_CODES.TOO_MANY_ATTEMPTS });
    }

    const username = (req.query.username as string) || '';
    const val = validateDisplayName(username);
    if (!val.valid) {
      return res.json({ available: false, valid: false, message: val.message, code: val.code });
    }

    const available = await dbCheckUsernameAvailable(username, req.user?.id || undefined);
    res.json({ available, valid: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Database check failed', code: ERROR_CODES.SERVER_ERROR });
  }
});

/**
 * POST /api/user/avatar
 * Upload or set user avatar URL
 */
router.post('/avatar', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required', code: ERROR_CODES.UNAUTHORIZED });
    }

    const { avatarUrl } = req.body;
    if (!avatarUrl || typeof avatarUrl !== 'string') {
      return res.status(400).json({ error: 'Valid avatar URL is required', code: ERROR_CODES.INVALID_INPUT });
    }

    const updated = await dbUpdateUserProfile(userId, { avatarUrl });
    res.json({ success: true, profile: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update avatar', code: ERROR_CODES.SERVER_ERROR });
  }
});

/**
 * DELETE /api/user/avatar
 * Remove user avatar
 */
router.delete('/avatar', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required', code: ERROR_CODES.UNAUTHORIZED });
    }

    await dbUpdateUserProfile(userId, { avatarUrl: null });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to remove avatar', code: ERROR_CODES.SERVER_ERROR });
  }
});

/**
 * POST /api/user/change-password
 * Change password with provider checks, rate limiting and security notification email
 */
router.post('/change-password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required', code: ERROR_CODES.UNAUTHORIZED });
    }

    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const rateCheck = checkRateLimit(`pwd_change:${userId}`, 5, 900000); // 5 attempts per 15 min
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
        code: ERROR_CODES.TOO_MANY_ATTEMPTS,
      });
    }

    const authProvider = req.user.app_metadata?.provider || 'email';
    if (authProvider === 'google' || authProvider === 'apple' || authProvider === 'github') {
      return res.status(400).json({
        error: `This account is managed through Google login. Password change is handled by Google.`,
        code: ERROR_CODES.PASSWORD_MANAGED_BY_PROVIDER,
      });
    }

    const { newPassword } = req.body;
    const v = validatePassword(newPassword);
    if (!v.valid) {
      return res.status(400).json({ error: v.message, code: v.code });
    }

    const { error: updateError } = await supabaseServiceRole.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      return res.status(400).json({ error: updateError.message, code: ERROR_CODES.INVALID_PASSWORD });
    }

    const userEmail = req.user.email;
    if (userEmail) {
      sendPasswordChangedEmail(userEmail);
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to change password', code: ERROR_CODES.SERVER_ERROR });
  }
});

/**
 * DELETE /api/user/account
 * Completely deletes all user profile, task, note, diary, focus, learning, AI, and state data.
 */
router.delete('/account', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required', code: ERROR_CODES.UNAUTHORIZED });
    }

    const userEmail = req.user.email;

    // 1. Safe idempotent database cleanup
    await dbDeleteUserAccountCompletely(userId);

    // 2. Send confirmation email
    if (userEmail) {
      sendAccountDeletedEmail(userEmail);
    }

    // 3. Delete auth account in Supabase
    try {
      await supabaseServiceRole.auth.admin.deleteUser(userId);
    } catch (e: any) {
      console.warn('[Account deletion] Supabase auth user delete notice:', e?.message);
    }

    res.json({ success: true, message: 'Account and all associated data permanently deleted.' });
  } catch (err: any) {
    console.error('[DELETE /api/user/account] Error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete user account', code: ERROR_CODES.SERVER_ERROR });
  }
});

/**
 * POST /api/user/migrate-guest-data
 * Migrates local guest data (tasks, notes, mind items) into authenticated account
 */
router.post('/migrate-guest-data', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required to merge data', code: ERROR_CODES.UNAUTHORIZED });
    }

    const { tasks = [], notes = [], mindItems = [] } = req.body;
    let tasksMigrated = 0;
    let notesMigrated = 0;
    let mindMigrated = 0;

    for (const t of tasks) {
      try {
        await dbUpsertTask(userId, { ...t, id: undefined });
        tasksMigrated++;
      } catch {}
    }

    for (const n of notes) {
      try {
        await dbUpsertNote(userId, { ...n, id: undefined });
        notesMigrated++;
      } catch {}
    }

    for (const m of mindItems) {
      try {
        await dbUpsertMindItem(userId, { ...m, id: undefined });
        mindMigrated++;
      } catch {}
    }

    res.json({
      success: true,
      migrated: { tasks: tasksMigrated, notes: notesMigrated, mindItems: mindMigrated },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Migration failed', code: ERROR_CODES.SERVER_ERROR });
  }
});

/**
 * Support pipeline handler helper
 */
async function handleSupportSubmission(req: AuthenticatedRequest, res: Response, type: 'report' | 'contact' | 'feedback') {
  try {
    const userId = req.user?.isGuest ? null : (req.user?.id || null);
    const clientIp = req.ip || req.headers['x-forwarded-for']?.toString() || '127.0.0.1';
    const rateKey = userId ? `support:${userId}` : `support_ip:${clientIp}`;
    const rateCheck = checkRateLimit(rateKey, 10, 3600000); // 10 submissions per hour
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Too many submissions. Please wait before sending another message.', code: ERROR_CODES.TOO_MANY_ATTEMPTS });
    }

    const body = req.body;
    const senderName = body.name || (userId ? 'FocusForge User' : 'Guest User');
    const senderEmail = body.email || req.user?.email || '';
    const subject = body.subject || body.title || `${type.toUpperCase()} Submission`;
    const message = body.message || body.description || '';
    const category = body.category || body.type || 'General';
    const attachments = body.screenshot ? [body.screenshot] : body.attachments || [];
    const appVersion = body.appVersion || '1.0.0';
    const browserInfo = body.browserInfo || req.headers['user-agent'] || undefined;
    const lang = (req.headers['x-app-lang'] as string) || 'bn';

    if (!message.trim() && !subject.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty', code: ERROR_CODES.INVALID_INPUT });
    }

    // 1. Create support ticket
    const ticket = await dbCreateSupportTicket({
      userId,
      type,
      category,
      subject,
      message,
      name: senderName,
      email: senderEmail,
      attachments,
      isGuest: !userId,
      appVersion,
      browserInfo,
      language: lang,
    });

    if (!ticket) {
      throw new Error('Ticket creation failed');
    }

    // 2. Dispatch emails in background
    sendSupportNotificationToOwner({
      ticketNumber: ticket.ticketNumber,
      type: ticket.type,
      senderName: ticket.name || 'Anonymous',
      senderEmail: ticket.email || 'noreply@focusforge.app',
      subject: ticket.subject,
      message: ticket.message,
      appVersion: ticket.appVersion || '1.0.0',
      browserInfo: ticket.browserInfo || undefined,
      isGuest: ticket.isGuest,
      attachments: ticket.attachments,
    });

    if (ticket.email) {
      sendSupportConfirmationToUser({
        ticketNumber: ticket.ticketNumber,
        senderName: ticket.name || 'there',
        senderEmail: ticket.email,
        subject: ticket.subject,
      });
    }

    res.json({
      success: true,
      ticketNumber: ticket.ticketNumber,
      ticketId: ticket.id,
      message: 'Your message has been received. Ticket created.',
    });
  } catch (err: any) {
    console.error('[Support Submission Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to submit ticket', code: ERROR_CODES.SERVER_ERROR });
  }
}

/**
 * POST /api/user/support/report
 */
router.post('/support/report', (req: AuthenticatedRequest, res: Response) => {
  return handleSupportSubmission(req, res, 'report');
});

/**
 * POST /api/user/support/contact
 */
router.post('/support/contact', (req: AuthenticatedRequest, res: Response) => {
  return handleSupportSubmission(req, res, 'contact');
});

/**
 * POST /api/user/support/feedback
 */
router.post('/support/feedback', (req: AuthenticatedRequest, res: Response) => {
  return handleSupportSubmission(req, res, 'feedback');
});

/**
 * GET /api/user/state
 * Get current user cloud state
 */
router.get('/state', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ state: null });
    }

    const { data, error } = await supabase
      .from('user_cloud_state')
      .select('state, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data ? data.state : null);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch cloud state' });
  }
});

/**
 * POST /api/user/state
 * Save or update current user cloud state
 */
router.post('/state', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { state } = req.body;
    if (!state) {
      return res.status(400).json({ error: 'State payload is required' });
    }

    const { data, error } = await supabase
      .from('user_cloud_state')
      .upsert({
        id: userId,
        state: state,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, updated_at: data.updated_at });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save cloud state' });
  }
});

/**
 * GET /api/user/onboarding
 */
router.get('/onboarding', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({
        onboardingCompleted: false,
        onboardingCompletedAt: null,
        preferredLanguage: 'en',
        preferredTheme: 'dark',
        accountMode: 'guest',
        productTourCompleted: false,
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_completed_at, preferred_language, preferred_theme, account_mode, product_tour_completed')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (data) {
      return res.json({
        onboardingCompleted: Boolean(data.onboarding_completed),
        onboardingCompletedAt: data.onboarding_completed_at,
        preferredLanguage: data.preferred_language || 'en',
        preferredTheme: data.preferred_theme || 'dark',
        accountMode: data.account_mode || 'authenticated',
        productTourCompleted: Boolean(data.product_tour_completed),
      });
    }

    res.json({
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      preferredLanguage: 'en',
      preferredTheme: 'dark',
      accountMode: 'authenticated',
      productTourCompleted: false,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch onboarding state' });
  }
});

/**
 * POST /api/user/onboarding
 */
router.post('/onboarding', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId || req.user?.isGuest) {
      return res.json({ success: true, guest: true });
    }

    const {
      onboardingCompleted,
      preferredLanguage,
      preferredTheme,
      accountMode,
      productTourCompleted,
    } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (onboardingCompleted !== undefined) {
      updates.onboarding_completed = Boolean(onboardingCompleted);
      if (onboardingCompleted) {
        updates.onboarding_completed_at = new Date().toISOString();
      }
    }
    if (preferredLanguage !== undefined) updates.preferred_language = preferredLanguage;
    if (preferredTheme !== undefined) updates.preferred_theme = preferredTheme;
    if (accountMode !== undefined) updates.account_mode = accountMode;
    if (productTourCompleted !== undefined) updates.product_tour_completed = Boolean(productTourCompleted);

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('onboarding_completed, onboarding_completed_at, preferred_language, preferred_theme, account_mode, product_tour_completed')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save onboarding state' });
  }
});

export default router;
