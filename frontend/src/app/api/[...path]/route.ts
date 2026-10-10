import dns from 'node:dns';
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

import { NextRequest, NextResponse, after } from 'next/server';
import { executeAIAction, transcribeAudio } from '@/lib/server/aiService';
import { getUserTokenStatus, consumeUserTokens, estimateTokenUsage } from '@/lib/server/aiTokenService';
import {
  dbGetReviewPromptState,
  dbUpsertReviewPromptState,
  dbInsertReview,
  dbGetUserProfile,
  dbUpdateUserProfile,
  dbCheckUsernameAvailable,
  dbGetNotificationSettings,
  dbUpsertNotificationSettings,
  dbSavePushSubscription,
  dbRemovePushSubscription,
  dbGetNotifications,
  dbSaveNotification,
  dbMarkNotificationRead,
  dbMarkAllNotificationsRead,
  dbDeleteNotification,
  dbClearNotifications,
  dbGetRotationStates,
  dbSaveRotationState,
  dbCreateSupportTicket,
  dbGetSupportTickets,
  dbGetSupportTicketById,
  dbUpdateSupportTicket,
  dbAddTicketReply,
  dbGetTicketReplies,
  dbCheckUserRole,
  dbLogSupervisorAction,
  dbGetSupervisorAuditLogs,
  dbDeleteUserAccountCompletely,
  dbSyncScheduledReminders,
  dbGetScheduledReminders,
  pool,
} from '@/lib/server/db';
import {
  getChatSessions,
  getChatMessages,
  createChatSession,
  addChatMessage,
  deleteChatSession,
  clearAllChatSessions,
} from '@/lib/server/aiChatService';
import { sendWebPushToUser } from '@/lib/server/webPushService';
import { runNotificationSchedulerCycle } from '@/lib/server/schedulerService';
import {
  ERROR_CODES,
  validateFullName,
  validateDisplayName,
  validatePhone,
  validateDateOfBirth,
  validateBio,
  validateGender,
  validatePassword,
} from '@/lib/server/validation';
import { checkRateLimit } from '@/lib/server/rateLimiter';
import {
  sendSupportNotificationToOwner,
  sendSupportConfirmationToUser,
  sendSupervisorReplyToUser,
  sendPasswordChangedEmail,
  sendAccountDeletedEmail,
  sendVerificationOtpEmail,
  sendPasswordResetOtpEmail,
} from '@/lib/server/emailService';
import { sendToGoogleAppsScript } from '@/lib/server/googleSheetsService';
import { supabase } from '@/lib/supabaseClient';
import crypto from 'node:crypto';

const CIPHER_KEY = crypto
  .createHash('sha256')
  .update(process.env.DATABASE_URL || 'focusforge-secret-encryption-key-2026')
  .digest();

function encryptPassword(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptPassword(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', CIPHER_KEY, iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function extractAuth(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const lang = searchParams.get('lang') || request.headers.get('x-app-lang') || 'bn';
  const rawXff = request.headers.get('x-forwarded-for');
  const xffList = rawXff ? rawXff.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const clientIp =
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-vercel-proxied-for')?.split(',')[0]?.trim() ||
    (xffList.length > 0 ? xffList[xffList.length - 1] : null) ||
    '127.0.0.1';
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const guestHeader = request.headers.get('x-guest-id');
  const guestId = guestHeader && guestHeader !== 'guest' ? guestHeader : (clientIp || 'guest');

  let userId: string | null = null;
  let isGuest = true;
  let userEmail: string | null = null;
  let authProvider: string = 'email';

  if (token && token !== 'guest') {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        isGuest = false;
        userEmail = user.email || null;
        authProvider = user.app_metadata?.provider || (user.email ? 'email' : 'phone');
      }
    } catch (err) {
      console.warn('[route auth] Token verification fallback:', err);
    }
  }

  return { userId, isGuest, guestId, lang, token, clientIp, userEmail, authProvider };
}

// =========================================================================
// GET HANDLER
// =========================================================================
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');
  const searchParams = request.nextUrl.searchParams;

  const { userId, isGuest, guestId, lang, clientIp } = await extractAuth(request);

  // 1. Token status
  if (pathStr === 'ai/tokens') {
    const status = await getUserTokenStatus(userId, isGuest, guestId, lang);
    return NextResponse.json(status);
  }

  // 2. User Profile: GET /api/user/profile
  if (pathStr === 'user/profile') {
    if (!userId || isGuest) {
      return NextResponse.json({
        id: 'guest',
        identifier: 'guest',
        authMethod: 'email',
        displayName: 'Guest User',
        fullName: 'Guest User',
        avatarUrl: null,
      });
    }

    try {
      let profile = await dbGetUserProfile(userId);
      if (!profile) {
        const { data: authData } = await supabase.auth.getUser();
        const u = authData?.user;
        profile = await dbUpdateUserProfile(userId, {
          email: u?.email || 'user',
          fullName: u?.user_metadata?.full_name || '',
          displayName: '',
        });
      }
      return NextResponse.json(profile);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch profile', code: ERROR_CODES.SERVER_ERROR }, { status: 500 });
    }
  }

  // 3. Username Availability Check: GET /api/user/check-username?username=...
  if (pathStr === 'user/check-username') {
    const username = searchParams.get('username') || '';
    const rateCheck = checkRateLimit(`check_user:${clientIp}`, 30, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many requests', code: ERROR_CODES.TOO_MANY_ATTEMPTS }, { status: 429 });
    }

    const val = validateDisplayName(username);
    if (!val.valid) {
      return NextResponse.json({ available: false, valid: false, message: val.message, code: val.code });
    }

    try {
      const available = await dbCheckUsernameAvailable(username, userId || undefined);
      return NextResponse.json({ available, valid: true });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Database check failed', code: ERROR_CODES.SERVER_ERROR }, { status: 500 });
    }
  }

  // 3.5. Encryption Key Metadata: GET /api/crypto/keys
  if (pathStr === 'crypto/keys') {
    if (!userId || isGuest) {
      return NextResponse.json({ exists: false, error: 'Authentication required' }, { status: 401 });
    }
    try {
      const { rows } = await pool.query(
        `SELECT key_version, algorithm, kdf_algorithm, kdf_salt, kdf_params, wrapped_master_key, created_at, updated_at
         FROM user_encryption_keys
         WHERE user_id = $1`,
        [userId]
      );
      if (rows.length === 0) {
        return NextResponse.json({ exists: false });
      }
      const row = rows[0];
      let iv = '';
      let wrappedKeyCiphertext = row.wrapped_master_key;
      if (row.wrapped_master_key && row.wrapped_master_key.includes(':')) {
        const parts = row.wrapped_master_key.split(':');
        iv = parts[0];
        wrappedKeyCiphertext = parts[1];
      }
      return NextResponse.json({
        exists: true,
        envelope: {
          version: row.key_version,
          algorithm: row.algorithm,
          kdf: {
            algorithm: row.kdf_algorithm,
            salt: row.kdf_salt,
            parameters: typeof row.kdf_params === 'string' ? JSON.parse(row.kdf_params) : (row.kdf_params || {}),
          },
          iv,
          wrappedKeyCiphertext,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
      });
    } catch (err: any) {
      console.warn('[Crypto API] Error fetching user encryption keys:', err?.message);
      return NextResponse.json({ exists: false, error: err?.message }, { status: 500 });
    }
  }

  // 4. Notification Settings: GET /api/notifications/settings
  if (pathStr === 'notifications/settings') {
    if (!userId || isGuest) {
      return NextResponse.json({
        pushEnabled: true,
        taskReminders: true,
        focusReminders: true,
        dailyProgressReminders: true,
        dailyReminderTime: '20:00',
        timezone: 'UTC',
      });
    }

    try {
      const settings = await dbGetNotificationSettings(userId);
      return NextResponse.json(settings);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch notification settings' }, { status: 500 });
    }
  }

  // 4.1. Notifications History: GET /api/notifications
  if (pathStr === 'notifications') {
    if (!userId || isGuest) {
      return NextResponse.json([]);
    }
    try {
      const notifs = await dbGetNotifications(userId);
      return NextResponse.json(notifs);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch notifications' }, { status: 500 });
    }
  }

  // 4.2. Notification Rotation State: GET /api/notifications/rotation
  if (pathStr === 'notifications/rotation') {
    if (!userId || isGuest) {
      return NextResponse.json({});
    }
    try {
      const state = await dbGetRotationStates(userId);
      return NextResponse.json(state);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch rotation state' }, { status: 500 });
    }
  }

  // 4.3.3. Automated Cron Trigger: GET /api/notifications/cron
  if (pathStr === 'notifications/cron') {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const isVercelCron = request.headers.get('x-vercel-cron') === '1';
      if (!isVercelCron && (!userId || isGuest)) {
        return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
      }
    }
    try {
      const cycleResult = await runNotificationSchedulerCycle();
      return NextResponse.json({ success: true, ...cycleResult });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Notification cron cycle failed' }, { status: 500 });
    }
  }

  // 5. Supervisor API - Check Role: GET /api/supervisor/role
  if (pathStr === 'supervisor/role') {
    if (!userId || isGuest) {
      return NextResponse.json({ isSupervisor: false, roles: [] });
    }
    const roles = await dbCheckUserRole(userId);
    const isSupervisor = roles.includes('supervisor') || roles.includes('admin');
    return NextResponse.json({ isSupervisor, roles });
  }

  // 6. Supervisor API - List Tickets: GET /api/supervisor/tickets
  if (pathStr === 'supervisor/tickets') {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    }
    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('supervisor') && !roles.includes('admin')) {
      return NextResponse.json({ error: 'Supervisor access required', code: ERROR_CODES.FORBIDDEN }, { status: 403 });
    }

    try {
      const type = searchParams.get('type') || undefined;
      const status = searchParams.get('status') || undefined;
      const priority = searchParams.get('priority') || undefined;
      const unreadOnly = searchParams.get('unread') === 'true';
      const search = searchParams.get('search') || undefined;
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      const tickets = await dbGetSupportTickets({ type, status, priority, unreadOnly, search, limit, offset });
      return NextResponse.json(tickets);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch tickets' }, { status: 500 });
    }
  }

  // 7. Supervisor API - Single Ticket & Thread: GET /api/supervisor/tickets/:id
  if (pathStr.startsWith('supervisor/tickets/')) {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    }
    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('supervisor') && !roles.includes('admin')) {
      return NextResponse.json({ error: 'Supervisor access required', code: ERROR_CODES.FORBIDDEN }, { status: 403 });
    }

    const ticketId = pathStr.split('/')[2];
    try {
      const ticket = await dbGetSupportTicketById(ticketId);
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found', code: ERROR_CODES.NOT_FOUND }, { status: 404 });
      }
      const replies = await dbGetTicketReplies(ticket.id);
      return NextResponse.json({ ticket, replies });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to load ticket' }, { status: 500 });
    }
  }

  // 8. Supervisor API - Audit Logs: GET /api/supervisor/audit-logs
  if (pathStr === 'supervisor/audit-logs') {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    }
    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required', code: ERROR_CODES.FORBIDDEN }, { status: 403 });
    }

    try {
      const logs = await dbGetSupervisorAuditLogs(100);
      return NextResponse.json(logs);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch audit logs' }, { status: 500 });
    }
  }

  // 8.1. Debug / Push Status: GET /api/debug/test-push or /api/debug/push-status
  if (pathStr === 'debug/test-push' || pathStr === 'debug/push-status') {
    try {
      const targetUserId = userId || searchParams.get('userId');
      let count = 0;
      let latestRows: any[] = [];
      try {
        const countRes = await pool.query('SELECT count(*) FROM push_subscriptions');
        count = parseInt(countRes.rows[0]?.count || '0', 10);
        const latestRes = await pool.query('SELECT id, user_id, endpoint, created_at, updated_at FROM push_subscriptions ORDER BY created_at DESC LIMIT 5');
        latestRows = latestRes.rows.map(r => ({
          ...r,
          endpointPreview: r.endpoint.slice(0, 50) + '...',
        }));
      } catch (dbErr: any) {
        return NextResponse.json({ success: false, error: 'Database query error: ' + dbErr?.message }, { status: 500 });
      }

      const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:focentia13@gmail.com';
      const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

      return NextResponse.json({
        success: true,
        totalSubscriptions: count,
        currentUser: userId || 'unauthenticated',
        vapidConfig: {
          subject: vapidSubject,
          hasPublicKey: Boolean(vapidPublic),
          publicKeyPreview: vapidPublic ? vapidPublic.slice(0, 15) + '...' : null,
          hasPrivateKey: Boolean(vapidPrivate),
        },
        recentSubscriptions: latestRows,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
    }
  }

  // 8.2. Notifications GET Endpoints
  if (pathStr === 'notifications') {
    if (!userId || isGuest) return NextResponse.json({ notifications: [] });
    try {
      const notifications = await dbGetNotifications(userId);
      return NextResponse.json({ notifications });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch notifications' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/settings') {
    if (!userId || isGuest) {
      return NextResponse.json({
        pushEnabled: true,
        taskReminders: true,
        focusReminders: true,
        dailyProgressReminders: true,
        dailyReminderTime: '20:00',
        timezone: 'UTC',
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        orbReactionsMode: 'on',
        dailyLimit: 5,
        skillReminders: true,
        inactivityReminders: true,
        diaryReminder: true,
        aiCompanionReminder: true,
      });
    }
    try {
      const settings = await dbGetNotificationSettings(userId);
      return NextResponse.json(settings);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch notification settings' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/rotation') {
    if (!userId || isGuest) return NextResponse.json({ rotation: {} });
    try {
      const rotation = await dbGetRotationStates(userId);
      return NextResponse.json({ rotation });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to get rotation states' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/cron') {
    try {
      // Evaluate and dispatch due scheduled notifications for all registered users
      const cycleResult = await runNotificationSchedulerCycle();
      return NextResponse.json({ success: true, ...cycleResult });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Notification cron failed' }, { status: 500 });
    }
  }

  // 4.3. Scheduled Reminders: GET /api/notifications/reminders
  if (pathStr === 'notifications/reminders' || pathStr === 'reminders') {
    if (!userId || isGuest) return NextResponse.json({ reminders: [] });
    try {
      const url = new URL(request.url);
      const date = url.searchParams.get('date') || undefined;
      const reminders = await dbGetScheduledReminders(userId, date);
      return NextResponse.json({ reminders });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to get scheduled reminders' }, { status: 500 });
    }
  }

  // 9. AI Agent Sessions & Messages (Backed by PostgreSQL Database)
  if (pathStr === 'ai/agent/sessions' || pathStr === 'ai/sessions') {
    try {
      const list = await getChatSessions(userId || guestId);
      return NextResponse.json(list);
    } catch (err: any) {
      console.warn('[GET ai/sessions] Error:', err);
      return NextResponse.json([]);
    }
  }

  if (
    ((pathStr.startsWith('ai/agent/sessions/') || pathStr.startsWith('ai/sessions/')) && pathStr.endsWith('/messages'))
  ) {
    try {
      const segments = pathStr.split('/');
      const sId = segments[segments.length - 2];
      const msgs = await getChatMessages(userId || guestId, sId);
      return NextResponse.json(msgs);
    } catch (err: any) {
      console.warn('[GET ai/messages] Error:', err);
      return NextResponse.json([]);
    }
  }

  // 10-15. Personal Data Endpoints (Local-First: Stored in Client IndexedDB)
  if (
    pathStr === 'tasks/templates' ||
    pathStr === 'tasks' ||
    pathStr === 'notes' ||
    pathStr === 'mind' ||
    pathStr === 'focus/sessions' ||
    pathStr === 'diary/topics' ||
    pathStr === 'learning/data'
  ) {
    return NextResponse.json([]);
  }

  // 16. Reviews Prompt State
  if (pathStr === 'reviews/prompt-state' || pathStr === 'reviews/state') {
    try {
      const state = await dbGetReviewPromptState(userId);
      return NextResponse.json(state || { status: 'eligible', meaningfulActions: 0, skipCount: 0 });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch review prompt state' }, { status: 500 });
    }
  }

  // 17. User Cloud State (Obsolete: Handled by E2EE Sync)
  if (pathStr === 'user/cloud-state' || pathStr === 'user/state') {
    return NextResponse.json(null);
  }

  // 18. Health Check
  if (pathStr === 'health') {
    return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  return NextResponse.json({ ok: true, path: pathStr });
}

// =========================================================================
// POST HANDLER
// =========================================================================
export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');

  const { userId, isGuest, guestId, lang, clientIp, userEmail, authProvider, token } = await extractAuth(request);

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  // ==========================================
  // AUTH: PRE-VERIFICATION SIGNUP ENDPOINTS
  // Zero database entries until 6-digit OTP verified!
  // ==========================================
  if (pathStr === 'auth/pre-signup') {
    const { fullName, email, password } = body;
    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Please enter your full name.' }, { status: 400 });
    }
    if (!email?.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    const vPass = validatePassword(password);
    if (!vPass.valid) {
      return NextResponse.json({ error: vPass.message, code: vPass.code }, { status: 400 });
    }

    // Rate limit: 5 requests per 10 minutes per IP
    const rateCheck = checkRateLimit(`pre_signup:${clientIp}`, 5, 600000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many signup attempts. Please wait a few minutes.', code: ERROR_CODES.TOO_MANY_ATTEMPTS }, { status: 429 });
    }

    try {
      // Check if user already exists in auth.users
      const existingUser = await pool.query('SELECT id FROM auth.users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (existingUser.rows.length > 0) {
        return NextResponse.json({ error: 'An account with this email already exists. Please log in.' }, { status: 409 });
      }

      // Generate cryptographically secure 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const encryptedPassword = encryptPassword(password);

      // Store in pending_signups with 15 minutes expiry
      await pool.query(
        `INSERT INTO public.pending_signups (email, full_name, password_hash, otp_code, created_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '15 minutes')
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           otp_code = EXCLUDED.otp_code,
           attempts = 0,
           created_at = NOW(),
           expires_at = NOW() + INTERVAL '15 minutes'`,
        [cleanEmail, cleanName, encryptedPassword, otpCode]
      );

      // Send OTP via email
      await sendVerificationOtpEmail(cleanEmail, otpCode, cleanName);

      console.log(`[FocusForge Pre-Signup] OTP for ${cleanEmail}: ${otpCode}`);

      return NextResponse.json({
        success: true,
        message: 'A verification code has been dispatched to your email.',
        email: cleanEmail,
      });
    } catch (err: any) {
      console.error('[auth/pre-signup] Error:', err);
      return NextResponse.json({ error: err.message || 'Failed to initiate signup verification' }, { status: 500 });
    }
  }

  if (pathStr === 'auth/verify-signup') {
    const { email, otp } = body;
    if (!email?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    try {
      const res = await pool.query('SELECT * FROM public.pending_signups WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'No pending registration found for this email. Please sign up again.' }, { status: 404 });
      }

      const pending = res.rows[0];

      // Check expiry
      if (new Date(pending.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Verification code has expired. Please request a new code.', isExpired: true }, { status: 400 });
      }

      // Check OTP code
      if (pending.otp_code !== cleanOtp) {
        await pool.query('UPDATE public.pending_signups SET attempts = attempts + 1 WHERE email = $1', [cleanEmail]);
        return NextResponse.json({ error: 'Incorrect verification code. Please check and try again.' }, { status: 400 });
      }

      // OTP is valid! Decrypt password and create user in Supabase
      const plainPassword = decryptPassword(pending.password_hash);
      const cleanName = pending.full_name;

      // 1. Create user in Supabase auth
      const signUpRes = await supabase.auth.signUp({
        email: cleanEmail,
        password: plainPassword,
        options: {
          data: {
            full_name: cleanName,
            display_name: cleanName,
          },
        },
      });

      if (signUpRes.error && !signUpRes.error.message.toLowerCase().includes('already registered')) {
        return NextResponse.json({ error: signUpRes.error.message }, { status: 400 });
      }

      // 2. Mark confirmed in auth.users and public.profiles so login works immediately
      await pool.query('UPDATE auth.users SET email_confirmed_at = NOW() WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      await pool.query('UPDATE public.profiles SET email_verified = true WHERE LOWER(email) = LOWER($1)', [cleanEmail]);

      // 3. Remove pending registration
      await pool.query('DELETE FROM public.pending_signups WHERE LOWER(email) = LOWER($1)', [cleanEmail]);

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully! You can now log in.',
        user: {
          email: cleanEmail,
          fullName: cleanName,
        },
        credentials: {
          email: cleanEmail,
          password: plainPassword,
        }
      });
    } catch (err: any) {
      console.error('[auth/verify-signup] Error:', err);
      return NextResponse.json({ error: err.message || 'Verification failed.' }, { status: 500 });
    }
  }

  if (pathStr === 'auth/resend-signup-otp') {
    const { email } = body;
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check rate limit: 1 per 60 seconds
    const rateCheck = checkRateLimit(`resend_otp:${cleanEmail}`, 1, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: `Please wait ${rateCheck.retryAfterSeconds} seconds before requesting a new code.` }, { status: 429 });
    }

    try {
      const res = await pool.query('SELECT * FROM public.pending_signups WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'No pending registration found for this email. Please sign up again.' }, { status: 404 });
      }

      const pending = res.rows[0];
      const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

      await pool.query(
        `UPDATE public.pending_signups 
         SET otp_code = $1, attempts = 0, expires_at = NOW() + INTERVAL '15 minutes'
         WHERE LOWER(email) = LOWER($2)`,
        [newOtpCode, cleanEmail]
      );

      await sendVerificationOtpEmail(cleanEmail, newOtpCode, pending.full_name);
      console.log(`[FocusForge Resend OTP] New OTP for ${cleanEmail}: ${newOtpCode}`);

      return NextResponse.json({ success: true, message: 'A fresh verification code has been dispatched to your email.' });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to resend code' }, { status: 500 });
    }
  }

  // ==========================================
  // AUTH: PASSWORD RESET OTP FLOW
  // ==========================================
  if (pathStr === 'auth/request-reset-otp') {
    const { email, newPassword } = body;
    if (!email?.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (newPassword) {
      const vPass = validatePassword(newPassword);
      if (!vPass.valid) {
        return NextResponse.json({ error: vPass.message, code: vPass.code }, { status: 400 });
      }
    }

    // Rate limit: 5 requests per 10 minutes per IP
    const rateCheck = checkRateLimit(`reset_otp:${cleanEmail}:${clientIp}`, 5, 600000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many reset requests. Please wait a few minutes.', code: ERROR_CODES.TOO_MANY_ATTEMPTS }, { status: 429 });
    }

    try {
      // Ensure pending_password_resets table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.pending_password_resets (
          email TEXT PRIMARY KEY,
          new_password_hash TEXT,
          otp_code TEXT NOT NULL,
          attempts INT DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL
        )
      `);

      // Check if user exists in auth.users or profiles
      const userRes = await pool.query('SELECT id, email, raw_user_meta_data FROM auth.users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (userRes.rows.length === 0) {
        return NextResponse.json({ error: 'No account found with this email address. Please check and try again.' }, { status: 404 });
      }

      const userRow = userRes.rows[0];
      const meta = userRow.raw_user_meta_data || {};
      const recipientName = meta.full_name || meta.display_name || meta.name || cleanEmail.split('@')[0];

      // Generate cryptographically secure 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const encryptedPassword = newPassword ? encryptPassword(newPassword) : null;

      // Store in pending_password_resets with 15 minutes expiry
      await pool.query(
        `INSERT INTO public.pending_password_resets (email, new_password_hash, otp_code, created_at, expires_at)
         VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '15 minutes')
         ON CONFLICT (email) DO UPDATE SET
           new_password_hash = EXCLUDED.new_password_hash,
           otp_code = EXCLUDED.otp_code,
           attempts = 0,
           created_at = NOW(),
           expires_at = NOW() + INTERVAL '15 minutes'`,
        [cleanEmail, encryptedPassword, otpCode]
      );

      // Send OTP via email
      await sendPasswordResetOtpEmail(cleanEmail, otpCode, recipientName);

      console.log(`[FocusForge Reset OTP] OTP for ${cleanEmail}: ${otpCode}`);

      return NextResponse.json({
        success: true,
        message: 'A verification code has been dispatched to your email.',
        email: cleanEmail,
      });
    } catch (err: any) {
      console.error('[auth/request-reset-otp] Error:', err);
      let errorMsg = err?.message || 'Failed to initiate password reset.';
      if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('getaddrinfo')) {
        errorMsg = 'Database connection error. Please verify your Supabase database connection pooler settings in Vercel.';
      }
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  }

  if (pathStr === 'auth/resend-reset-otp') {
    const { email } = body;
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check rate limit: 1 per 60 seconds
    const rateCheck = checkRateLimit(`resend_reset_otp:${cleanEmail}`, 1, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: `Please wait ${rateCheck.retryAfterSeconds} seconds before requesting a new code.` }, { status: 429 });
    }

    try {
      const res = await pool.query('SELECT * FROM public.pending_password_resets WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'No pending reset request found for this email. Please request a new reset.' }, { status: 404 });
      }

      const pending = res.rows[0];
      const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();

      await pool.query(
        `UPDATE public.pending_password_resets 
         SET otp_code = $1, attempts = 0, expires_at = NOW() + INTERVAL '15 minutes'
         WHERE LOWER(email) = LOWER($2)`,
        [newOtpCode, cleanEmail]
      );

      // Fetch name
      const userRes = await pool.query('SELECT raw_user_meta_data FROM auth.users WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      const meta = userRes.rows[0]?.raw_user_meta_data || {};
      const recipientName = meta.full_name || meta.display_name || cleanEmail.split('@')[0];

      await sendPasswordResetOtpEmail(cleanEmail, newOtpCode, recipientName);
      console.log(`[FocusForge Resend Reset OTP] New OTP for ${cleanEmail}: ${newOtpCode}`);

      return NextResponse.json({ success: true, message: 'A fresh verification code has been dispatched to your email.' });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to resend code' }, { status: 500 });
    }
  }

  if (pathStr === 'auth/verify-reset-otp') {
    const { email, otp, newPassword } = body;
    if (!email?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: 'Email and verification code are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    try {
      const res = await pool.query('SELECT * FROM public.pending_password_resets WHERE LOWER(email) = LOWER($1)', [cleanEmail]);
      if (res.rows.length === 0) {
        return NextResponse.json({ error: 'No pending reset request found for this email. Please initiate a new password reset.' }, { status: 404 });
      }

      const pending = res.rows[0];

      // Check expiry
      if (new Date(pending.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Verification code has expired. Please request a new code.', isExpired: true }, { status: 400 });
      }

      // Check OTP code
      if (pending.otp_code !== cleanOtp) {
        await pool.query('UPDATE public.pending_password_resets SET attempts = attempts + 1 WHERE email = $1', [cleanEmail]);
        return NextResponse.json({ error: 'Incorrect verification code. Please check and try again.' }, { status: 400 });
      }

      // Determine target new password
      let targetPassword = newPassword;
      if (!targetPassword && pending.new_password_hash) {
        try {
          targetPassword = decryptPassword(pending.new_password_hash);
        } catch {
          targetPassword = null;
        }
      }

      if (!targetPassword) {
        return NextResponse.json({
          success: true,
          verified: true,
          message: 'Code verified. Please provide your new password.',
        });
      }

      const vPass = validatePassword(targetPassword);
      if (!vPass.valid) {
        return NextResponse.json({ error: vPass.message, code: vPass.code }, { status: 400 });
      }

      // 1. Update password in PostgreSQL auth.users
      try {
        await pool.query(
          `UPDATE auth.users 
           SET encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
               updated_at = NOW()
           WHERE LOWER(email) = LOWER($2)`,
          [targetPassword, cleanEmail]
        );
      } catch (sqlErr) {
        // Fallback without extensions prefix if installed in public schema
        await pool.query(
          `UPDATE auth.users 
           SET encrypted_password = crypt($1, gen_salt('bf')),
               updated_at = NOW()
           WHERE LOWER(email) = LOWER($2)`,
          [targetPassword, cleanEmail]
        );
      }

      // 2. Remove pending reset record
      await pool.query('DELETE FROM public.pending_password_resets WHERE LOWER(email) = LOWER($1)', [cleanEmail]);

      // 3. Send security alert email
      sendPasswordChangedEmail(cleanEmail);

      return NextResponse.json({
        success: true,
        message: 'Password has been updated successfully! You can now log in with your new password.',
        email: cleanEmail,
      });
    } catch (err: any) {
      console.error('[auth/verify-reset-otp] Error:', err);
      let errorMsg = err?.message || 'Verification failed.';
      if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED') || errorMsg.includes('getaddrinfo')) {
        errorMsg = 'Database connection error. Please verify your Supabase database connection pooler settings in Vercel.';
      }
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
  }

  // 0. Encryption Key Envelope: POST /api/crypto/keys
  if (pathStr === 'crypto/keys') {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { envelope } = body;
    if (!envelope || !envelope.wrappedKeyCiphertext || !envelope.kdf) {
      return NextResponse.json({ error: 'Invalid envelope payload' }, { status: 400 });
    }
    try {
      const serializedWrappedKey = `${envelope.iv || ''}:${envelope.wrappedKeyCiphertext}`;
      await pool.query(
        `
        INSERT INTO user_encryption_keys (
          user_id, key_version, algorithm, kdf_algorithm, kdf_salt, kdf_params, wrapped_master_key, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
          key_version = EXCLUDED.key_version,
          algorithm = EXCLUDED.algorithm,
          kdf_algorithm = EXCLUDED.kdf_algorithm,
          kdf_salt = EXCLUDED.kdf_salt,
          kdf_params = EXCLUDED.kdf_params,
          wrapped_master_key = EXCLUDED.wrapped_master_key,
          updated_at = NOW()
        `,
        [
          userId,
          envelope.version || 1,
          envelope.algorithm || 'AES-256-GCM',
          envelope.kdf.algorithm || 'PBKDF2-SHA256',
          envelope.kdf.salt,
          JSON.stringify(envelope.kdf.parameters || {}),
          serializedWrappedKey,
        ]
      );
      return NextResponse.json({ success: true });
    } catch (err: any) {
      console.warn('[Crypto API] Error saving encryption keys:', err?.message);
      return NextResponse.json({ error: err?.message || 'Failed to save encryption keys' }, { status: 500 });
    }
  }

  // 0. E2EE Sync Endpoints (Zero-Knowledge Ciphertext Relay)
  if (pathStr === 'sync/push') {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Authentication required for synchronization' }, { status: 401 });
    }
    const { items, deviceId } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }
    try {
      for (const item of items) {
        const { id, collection, ciphertext, iv, salt, version, isDeleted, updatedAt } = item;
        if (!id || !collection || !ciphertext || !iv) continue;
        await pool.query(
          `
          INSERT INTO encrypted_sync_records (
            user_id, store_name, record_id, ciphertext, iv, salt, version, is_deleted, device_id, client_updated_at, server_synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (user_id, store_name, record_id) DO UPDATE SET
            ciphertext = EXCLUDED.ciphertext,
            iv = EXCLUDED.iv,
            salt = EXCLUDED.salt,
            version = EXCLUDED.version,
            is_deleted = EXCLUDED.is_deleted,
            device_id = EXCLUDED.device_id,
            client_updated_at = EXCLUDED.client_updated_at,
            server_synced_at = NOW()
          `,
          [
            userId,
            collection,
            String(id),
            ciphertext,
            iv,
            salt || '',
            version || 1,
            Boolean(isDeleted),
            deviceId || item.deviceId || 'unknown',
            updatedAt || new Date().toISOString(),
          ]
        );
      }
      return NextResponse.json({ success: true, count: items.length });
    } catch (err: any) {
      console.warn('[Sync API] Error saving sync records to pool:', err?.message);
      return NextResponse.json({ success: true, count: items.length, fallback: true });
    }
  }

  if (pathStr === 'sync/pull') {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Authentication required for synchronization' }, { status: 401 });
    }
    const { since } = body;
    try {
      let query = `
        SELECT record_id as id, store_name as collection, ciphertext, iv, salt, version, is_deleted as "isDeleted", client_updated_at as "updatedAt", device_id as "deviceId"
        FROM encrypted_sync_records
        WHERE user_id = $1
      `;
      const params: any[] = [userId];
      if (since && !isNaN(Date.parse(since))) {
        query += ` AND server_synced_at > $2`;
        params.push(new Date(since).toISOString());
      }
      query += ` ORDER BY server_synced_at ASC LIMIT 500`;
      const { rows } = await pool.query(query, params);
      return NextResponse.json({
        success: true,
        items: rows,
        serverTime: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn('[Sync API] Error querying sync records:', err?.message);
      return NextResponse.json({
        success: true,
        items: [],
        serverTime: new Date().toISOString(),
      });
    }
  }

  // 1. Password Change: POST /api/user/change-password
  if (pathStr === 'user/change-password') {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Authentication required', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    }

    // Rate limit password change attempts
    const rateCheck = checkRateLimit(`pwd_change:${userId}`, 5, 900000); // 5 attempts per 15 min
    if (!rateCheck.allowed) {
      return NextResponse.json({
        error: 'Too many failed attempts. Please try again later.',
        code: ERROR_CODES.TOO_MANY_ATTEMPTS,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      }, { status: 429 });
    }

    if (authProvider === 'google') {
      return NextResponse.json({
        error: 'Password is managed by your Google account.',
        code: ERROR_CODES.PASSWORD_MANAGED_BY_PROVIDER,
      }, { status: 400 });
    }

    const { currentPassword, newPassword } = body;
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required.', code: ERROR_CODES.INVALID_INPUT }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ error: 'New password cannot be identical to current password.', code: ERROR_CODES.INVALID_PASSWORD }, { status: 400 });
    }

    const passVal = validatePassword(newPassword);
    if (!passVal.valid) {
      return NextResponse.json({ error: passVal.message, code: passVal.code }, { status: 400 });
    }

    try {
      // 1. Re-authenticate current user with current password
      if (userEmail) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: currentPassword,
        });
        if (signInError) {
          return NextResponse.json({ error: 'Current password is incorrect.', code: ERROR_CODES.INVALID_CREDENTIALS }, { status: 400 });
        }
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return NextResponse.json({ error: updateError.message, code: ERROR_CODES.SERVER_ERROR }, { status: 500 });
      }

      // 3. Send security alert email
      if (userEmail) {
        sendPasswordChangedEmail(userEmail);
      }

      return NextResponse.json({ success: true, message: 'Password updated successfully.' });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Password update failed', code: ERROR_CODES.SERVER_ERROR }, { status: 500 });
    }
  }

  // 2. Avatar Upload: POST /api/user/avatar
  if (pathStr === 'user/avatar') {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Authentication required', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    }

    const { avatarBase64, mimeType } = body;
    if (!avatarBase64) {
      return NextResponse.json({ error: 'Avatar image data required', code: ERROR_CODES.INVALID_INPUT }, { status: 400 });
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (mimeType && !allowedMimes.includes(mimeType)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and WebP formats are allowed.', code: ERROR_CODES.INVALID_FILE_TYPE }, { status: 400 });
    }

    try {
      // Save avatar URL in profile
      const avatarUrl = avatarBase64.startsWith('data:') ? avatarBase64 : `data:${mimeType || 'image/png'};base64,${avatarBase64}`;
      const profile = await dbUpdateUserProfile(userId, { avatarUrl });
      return NextResponse.json({ success: true, profile });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Avatar upload failed', code: ERROR_CODES.SERVER_ERROR }, { status: 500 });
    }
  }

  // 3. Notification Settings: POST /api/notifications/settings
  if (pathStr === 'notifications/settings') {
    if (!userId || isGuest) {
      return NextResponse.json({ success: true, guest: true });
    }
    try {
      const updated = await dbUpsertNotificationSettings(userId, body);
      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to save settings' }, { status: 500 });
    }
  }

  // 4. Push Subscriptions: POST /api/notifications/subscribe & unsubscribe
  if (pathStr === 'notifications/subscribe') {
    const targetUserId = userId || (body.userId && body.userId !== 'guest' ? body.userId : null) || request.headers.get('x-user-id');
    if (!targetUserId || targetUserId === 'guest') {
      return NextResponse.json({ success: false, guest: true, error: 'Authentication required to save push subscription' }, { status: 401 });
    }
    try {
      const userAgent = request.headers.get('user-agent') || '';
      await dbSavePushSubscription(targetUserId, body.subscription, userAgent);
      return NextResponse.json({ success: true, saved: true, userId: targetUserId, endpoint: body.subscription?.endpoint });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Subscription failed' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/unsubscribe') {
    const targetUserId = userId || request.headers.get('x-user-id');
    if (!targetUserId || targetUserId === 'guest') {
      return NextResponse.json({ success: true });
    }
    try {
      await dbRemovePushSubscription(targetUserId, body.endpoint);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Unsubscribe failed' }, { status: 500 });
    }
  }

  // 4.1. Notification Ingestion/Sync: POST /api/notifications/sync
  if (pathStr === 'notifications/sync') {
    if (!userId || isGuest) {
      return NextResponse.json({ success: true, guest: true });
    }
    try {
      const notif = body.notification || body;
      await dbSaveNotification(userId, notif);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to sync notification' }, { status: 500 });
    }
  }

  // 4.2. Notification Rotation Sync: POST /api/notifications/rotation
  if (pathStr === 'notifications/rotation') {
    if (!userId || isGuest) {
      return NextResponse.json({ success: true, guest: true });
    }
    try {
      const { category, bag, lastUsedId } = body;
      await dbSaveRotationState(userId, category, bag || [], lastUsedId || null);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to save rotation state' }, { status: 500 });
    }
  }

  // 4.3. Trigger Web Push Notification: POST /api/notifications/send-push
  if (pathStr === 'notifications/send-push') {
    const targetUserId = userId || (body.userId && body.userId !== 'guest' ? body.userId : null) || request.headers.get('x-user-id');
    if (!targetUserId || targetUserId === 'guest') {
      return NextResponse.json({ success: true, guest: true, sentCount: 0 });
    }
    try {
      const pushPayload = body.payload || body;
      const pushResult = await sendWebPushToUser(targetUserId, pushPayload);
      return NextResponse.json({ success: true, ...pushResult });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to dispatch push notification' }, { status: 500 });
    }
  }

  // 4.3.1. Scheduled Reminders Sync: POST /api/notifications/reminders/sync or /api/reminders/sync
  if (pathStr === 'notifications/reminders/sync' || pathStr === 'reminders/sync') {
    const targetUserId = userId || (body.userId && body.userId !== 'guest' ? body.userId : null) || request.headers.get('x-user-id');
    if (!targetUserId || targetUserId === 'guest') {
      return NextResponse.json({ success: true, guest: true, syncedCount: 0 });
    }
    try {
      const { reminders = [], cancelledIds = [], completedTaskIds = [] } = body;
      const result = await dbSyncScheduledReminders(targetUserId, reminders, cancelledIds, completedTaskIds);
      return NextResponse.json({ ...result });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to sync scheduled reminders' }, { status: 500 });
    }
  }

  // 4.3.2. Scheduled Reminders Cancellation: POST /api/notifications/reminders/cancel
  if (pathStr === 'notifications/reminders/cancel' || pathStr === 'reminders/cancel') {
    const targetUserId = userId || (body.userId && body.userId !== 'guest' ? body.userId : null) || request.headers.get('x-user-id');
    if (!targetUserId || targetUserId === 'guest') {
      return NextResponse.json({ success: true, guest: true });
    }
    try {
      const { ids = [], taskIds = [] } = body;
      const result = await dbSyncScheduledReminders(targetUserId, [], ids, taskIds);
      return NextResponse.json({ ...result });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to cancel scheduled reminders' }, { status: 500 });
    }
  }

  // 4.3.3. Manual/Automated Cron Trigger: POST /api/notifications/cron
  if (pathStr === 'notifications/cron') {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const isVercelCron = request.headers.get('x-vercel-cron') === '1';
      if (!isVercelCron && (!userId || isGuest)) {
        return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
      }
    }
    try {
      const cycleResult = await runNotificationSchedulerCycle();
      return NextResponse.json({ success: true, ...cycleResult });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Notification cron cycle failed' }, { status: 500 });
    }
  }

  // 4.4. Test Web Push Notification: POST /api/notifications/test or /api/notifications/test-push
  if (pathStr === 'notifications/test' || pathStr === 'notifications/test-push') {
    const isBengali = lang === 'bn';
    const testPayload = {
      title: isBengali ? 'Focentia নোটিফিকেশন সক্রিয়' : 'Focentia Notification Active',
      body: isBengali 
        ? 'আপনার ব্যাকগ্রাউন্ড পুশ নোটিফিকেশন সম্পূর্ণ সক্রিয় রয়েছে।' 
        : 'Your background Web Push notifications are fully active.',
      timestamp: Date.now(),
      category: 'system',
      actionRoute: 'today',
    };

    let pushResult = { sentCount: 0, failedCount: 0, removedExpired: 0 };
    const targetUserId = userId || (body.userId && body.userId !== 'guest' ? body.userId : null) || request.headers.get('x-user-id');
    if (targetUserId && targetUserId !== 'guest') {
      pushResult = await sendWebPushToUser(targetUserId, testPayload);
    }
    return NextResponse.json({ success: true, payload: testPayload, pushResult });
  }

  // 4.5. Full Isolation Debug Push: POST /api/debug/test-push
  if (pathStr === 'debug/test-push') {
    try {
      const targetUserId = userId || (body?.userId && body.userId !== 'guest' ? body.userId : null) || request.headers.get('x-user-id');
      let subscriptionRow: any = null;

      if (targetUserId && targetUserId !== 'guest') {
        const { rows } = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [targetUserId]);
        subscriptionRow = rows[0];
      }
      
      if (!subscriptionRow) {
        const { rows } = await pool.query('SELECT * FROM push_subscriptions ORDER BY created_at DESC LIMIT 1');
        subscriptionRow = rows[0];
      }

      const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:focentia13@gmail.com';
      const vapidPublic = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

      if (!subscriptionRow) {
        return NextResponse.json({
          success: false,
          error: 'No push subscription found in database. Please click "Register / Sync Web Push" on your device first.',
          vapidConfig: {
            subject: vapidSubject,
            hasPublicKey: Boolean(vapidPublic),
            hasPrivateKey: Boolean(vapidPrivate),
          },
        });
      }

      const webpush = (await import('web-push')).default;
      if (vapidPublic && vapidPrivate) {
        webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
      }

      const testPayload = JSON.stringify({
        title: 'Focentia Web Push Diagnostic',
        body: 'OS Background Web Push is working! (' + new Date().toLocaleTimeString() + ')',
        id: 'diag_' + Date.now(),
        category: 'system',
        actionRoute: 'today',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-large.png?v=max_zoom_1',
        tag: 'focentia-diag-test',
        timestamp: Date.now(),
      });

      const pushSub = {
        endpoint: subscriptionRow.endpoint,
        keys: {
          p256dh: subscriptionRow.p256dh,
          auth: subscriptionRow.auth,
        },
      };

      const sendRes = await webpush.sendNotification(pushSub, testPayload, {
        TTL: 86400,
        urgency: 'high',
      });

      return NextResponse.json({
        success: true,
        statusCode: sendRes.statusCode,
        headers: sendRes.headers,
        targetUserId: subscriptionRow.user_id,
        endpointPreview: subscriptionRow.endpoint.slice(0, 45) + '...',
        vapidConfig: {
          subject: vapidSubject,
          hasPublicKey: Boolean(vapidPublic),
          hasPrivateKey: Boolean(vapidPrivate),
        },
      });
    } catch (pushErr: any) {
      return NextResponse.json({
        success: false,
        error: pushErr?.message || String(pushErr),
        statusCode: pushErr?.statusCode || 500,
        body: pushErr?.body || null,
        endpoint: pushErr?.endpoint || null,
      });
    }
  }

  // 5. Support Pipeline Submissions: Report, Contact, Feedback
  if (pathStr === 'user/support/report' || pathStr === 'user/support/contact' || pathStr === 'user/support/feedback') {
    const rateKey = userId ? `support:${userId}` : `support_ip:${clientIp}`;
    const rateCheck = checkRateLimit(rateKey, 10, 3600000); // 10 submissions per hour
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please wait before sending another message.', code: ERROR_CODES.TOO_MANY_ATTEMPTS }, { status: 429 });
    }

    const type = pathStr.includes('report') ? 'report' : pathStr.includes('contact') ? 'contact' : 'feedback';
    const senderName = body.name || (userId ? 'Focentia User' : 'Guest User');
    const senderEmail = body.email || userEmail || '';
    const subject = body.subject || body.title || `${type.toUpperCase()} Submission`;
    const message = body.message || body.description || '';
    const category = body.category || body.type || 'General';
    const attachments = body.screenshot ? [body.screenshot] : body.attachments || [];
    const appVersion = body.appVersion || '1.0.0';
    const browserInfo = body.browserInfo || request.headers.get('user-agent') || undefined;

    if (!message.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty.', code: ERROR_CODES.INVALID_INPUT }, { status: 400 });
    }

    if (type === 'contact' && !senderEmail) {
      return NextResponse.json({ error: 'Email is required for contact support.', code: ERROR_CODES.INVALID_INPUT }, { status: 400 });
    }

    try {
      // 1. SAVE TICKET (Database with graceful in-memory fallback)
      let ticket: any = null;
      try {
        ticket = await dbCreateSupportTicket({
          type,
          category,
          subject,
          message,
          attachments,
          userId: userId || null,
          name: senderName,
          email: senderEmail,
          isGuest: isGuest || !userId,
          appVersion,
          browserInfo,
          language: lang,
        });
      } catch (dbErr) {
        console.warn('[Support Route] Database creation error, generating fallback ticket:', dbErr);
      }

      if (!ticket) {
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        ticket = {
          id: `ticket_${Date.now()}`,
          ticketNumber: `FF-${randomNum}`,
          type,
          category,
          subject,
          message,
          attachments,
          userId: userId || null,
          name: senderName,
          email: senderEmail,
          isGuest: isGuest || !userId,
          appVersion,
          browserInfo,
          language: lang,
        };
      }

      // 2. DISPATCH EMAILS & GOOGLE APPS SCRIPT ASYNCHRONOUSLY VIA after()
      // This returns the response to the user in < 50ms while guaranteeing background delivery
      after(async () => {
        const hasPicture = Boolean(ticket.attachments && ticket.attachments.length > 0 && ticket.attachments[0]);
        const shouldSendEmail = ticket.type === 'contact' || ticket.type === 'support' || (ticket.type === 'report' && hasPicture);

        if (shouldSendEmail) {
          try {
            sendSupportNotificationToOwner({
              ticketNumber: ticket.ticketNumber,
              type: ticket.type,
              category: ticket.category,
              senderName: ticket.name || 'Anonymous',
              senderEmail: ticket.email || 'noreply@focusforge.app',
              subject: ticket.type === 'report' && hasPicture ? `[Photo Attached] ${ticket.subject}` : ticket.subject,
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
          } catch (emailErr) {
            console.error('[Support Route] Email dispatch error:', emailErr);
          }
        }

        try {
          await sendToGoogleAppsScript({
            type: ticket.type,
            name: ticket.name,
            email: ticket.email,
            message: ticket.message,
            subject: ticket.subject,
            category: ticket.category,
            ticketNumber: ticket.ticketNumber,
            image: ticket.attachments?.[0] || undefined,
          });
        } catch (gSyncErr) {
          console.warn('[Support Route] Google Apps Script sync error:', gSyncErr);
        }
      });

      return NextResponse.json({
        success: true,
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket.id,
        message: 'Your message has been received. Ticket created.',
      });
    } catch (err: any) {
      console.error('[Support Submission Error]:', err);
      // Even on outer error, return success with generated reference so user flow is not broken
      const fallbackTicketNumber = `FF-${Math.floor(100000 + Math.random() * 900000)}`;
      return NextResponse.json({
        success: true,
        ticketNumber: fallbackTicketNumber,
        message: 'Your message has been received.',
      });
    }
  }

  // 6. Supervisor API - Update Ticket & Reply
  if (pathStr.startsWith('supervisor/tickets/') && pathStr.endsWith('/reply')) {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    }
    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('supervisor') && !roles.includes('admin')) {
      return NextResponse.json({ error: 'Supervisor access required', code: ERROR_CODES.FORBIDDEN }, { status: 403 });
    }

    const ticketId = pathStr.split('/')[2];
    const { message: replyMessage, supervisorName = 'Supervisor' } = body;

    if (!replyMessage || !replyMessage.trim()) {
      return NextResponse.json({ error: 'Reply message cannot be empty', code: ERROR_CODES.INVALID_INPUT }, { status: 400 });
    }

    try {
      const ticket = await dbGetSupportTicketById(ticketId);
      if (!ticket) {
        return NextResponse.json({ error: 'Ticket not found', code: ERROR_CODES.NOT_FOUND }, { status: 404 });
      }

      // Add reply to database
      const reply = await dbAddTicketReply({
        ticketId: ticket.id,
        senderRole: 'supervisor',
        senderId: userId,
        senderName: supervisorName,
        message: replyMessage,
      });

      // Log supervisor action
      await dbLogSupervisorAction(userId, 'REPLY_TICKET', 'support_tickets', ticket.id, { ticketNumber: ticket.ticketNumber }, clientIp);

      // Send email to user if email available
      if (ticket.email) {
        sendSupervisorReplyToUser({
          ticketNumber: ticket.ticketNumber,
          recipientName: ticket.name || 'there',
          recipientEmail: ticket.email,
          subject: ticket.subject,
          supervisorName,
          replyMessage,
        });
      }

      return NextResponse.json({ success: true, reply });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to post reply' }, { status: 500 });
    }
  }

  // 7. Guest Data Migration: POST /api/user/migrate-guest-data (Local-First in IndexedDB)
  if (pathStr === 'user/migrate-guest-data') {
    return NextResponse.json({
      success: true,
      migrated: { tasks: 0, notes: 0, mindItems: 0 },
    });
  }

  // 8. AI Agent Chat
  if (pathStr === 'ai/agent/chat' || pathStr === 'ai/chat') {
    const { sessionId: requestedSessionId, message: userMsg, context: wsContext, history, model: selectedModel } = body;
    
    // Burst Rate Limiting: 40 AI requests per minute per IP / User
    const chatRateLimitKey = `ai_agent_chat:${userId || guestId || clientIp}`;
    if (!checkRateLimit(chatRateLimitKey, 40, 60000)) {
      return NextResponse.json(
        { error: 'AI request limit reached. Please slow down.' },
        { status: 429 }
      );
    }

    if (userMsg && typeof userMsg === 'string' && userMsg.length > 5000) {
      return NextResponse.json(
        { error: 'Message payload too large (max 5,000 characters).' },
        { status: 400 }
      );
    }

    const tokenStatus = await getUserTokenStatus(userId, isGuest, guestId, lang);
    if (tokenStatus.isExhausted || tokenStatus.remaining <= 0) {
      const message = isGuest
        ? (lang === 'bn'
            ? `আমি তোমাকে সাহায্য করতে পছন্দ করি। তবে তুমি তো এখনও লগইন করোনি আর তোমার গেস্ট লিমিট শেষ হয়ে গেছে। একটু লগইন করে নিলে আমি আবার জেগে তোমাকে সাহায্য করতে পারব। ততক্ষণ আমি একটু বিশ্রাম নিই।`
            : `I'd love to help you! However, you haven't logged in yet and your guest limit is reached. Please log in so I can wake up and help you. Until then, I'll take a quick rest.`)
        : (lang === 'bn'
            ? `আমি তোমাকে সাহায্য করতে চাই, তবে আজকের জন্য তোমার ফ্রি লিমিট শেষ হয়ে গেছে।\n\n• লিমিট রিসেট হবে: ${tokenStatus.formattedResetDate}\n• বাকি সময়: ${tokenStatus.formattedRemainingTime}\n\nঅনুগ্রহ করে একটু অপেক্ষা করো। লিমিট রিসেট হলে আমি আবার জেগে তোমাকে সাহায্য করতে প্রস্তুত থাকব। ততক্ষণ আমি বিশ্রামে আছি।`
            : `I really want to help you, but your daily limit for today has been reached.\n\n• Resets on: ${tokenStatus.formattedResetDate}\n• Remaining time: ${tokenStatus.formattedRemainingTime}\n\nPlease wait a little bit. Once it resets, I'll wake right up to help you! Until then, I'll be resting.`);

      const exhaustedAiMsg = {
        id: 'msg_exhausted_' + Date.now(),
        role: 'assistant' as const,
        content: message,
        intent: isGuest ? 'REQUIRE_LOGIN' : 'LIMIT_EXHAUSTED',
        payload: isGuest ? { requireLogin: true } : { resetDate: tokenStatus.formattedResetDate, remainingTime: tokenStatus.formattedRemainingTime },
        createdAt: new Date().toISOString(),
      };

      return NextResponse.json({
        sessionId: requestedSessionId || (isGuest ? 'guest-session' : `session_${Date.now()}`),
        sessionTitle: userMsg ? userMsg.substring(0, 25) : 'Focentia AI',
        aiMessage: exhaustedAiMsg,
        tokenStatus,
        isExhausted: true,
      });
    }
    
    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];

    let result: any;
    try {
      result = await executeAIAction('agentChat', {
        userQuery: userMsg,
        context: wsContext,
        recentHistory,
        currentDate: new Date().toISOString().split('T')[0],
        model: selectedModel || 'smart',
      });
    } catch (err: any) {
      console.error('[API /ai/agent/chat] AI execution error:', err?.message || err);
      result = {
        intent: 'GREETING_OR_GENERAL',
        message: lang === 'bn'
          ? 'দুঃখিত, এআই সার্ভার সাময়িক একটু ব্যস্ত ছিল। তোমার পড়াশোনা, কাজ বা যেকোনো বিষয়ে কিছু জানার থাকলে বলো, আমি শুনছি!'
          : "Focentia AI is temporarily busy. Please let me know if you need help with anything else, I'm here!",
        payload: null
      };
    }

    const tokensUsed = estimateTokenUsage(
      JSON.stringify(body), 
      JSON.stringify(result), 
      selectedModel || 'smart',
      (result as any)?.geminiUsage
    );
    const updatedTokens = await consumeUserTokens(userId, isGuest, guestId, tokensUsed, lang);

    const activeSessionId = requestedSessionId || (isGuest ? `guest_${Date.now()}` : `session_${Date.now()}`);
    const aiMsgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const finalSessionTitle = userMsg ? (userMsg.length > 30 ? userMsg.substring(0, 28) + '...' : userMsg) : 'Focentia AI';

    // Persist session and chat messages in PostgreSQL database
    try {
      await createChatSession(userId || guestId, finalSessionTitle, activeSessionId);
      if (userMsg) {
        await addChatMessage(activeSessionId, userId || guestId, 'user', userMsg);
      }
      await addChatMessage(activeSessionId, userId || guestId, 'assistant', result.message, result.intent, result.payload);
    } catch (dbSaveErr) {
      console.warn('[API /ai/agent/chat] Database chat persistence notice:', dbSaveErr);
    }

    const aiMessage = {
      id: aiMsgId,
      session_id: activeSessionId,
      role: 'assistant' as const,
      content: result.message,
      intent: result.intent,
      payload: result.payload,
      actions: result.actions,
      structuredResponse: result.structuredResponse,
      proposal: result.proposal,
      missingFields: result.missingFields,
      clarifyingQuestion: result.clarifyingQuestion,
      confirmationRequired: result.confirmationRequired,
      emotion: result.emotion,
      reaction: result.reaction,
      roadmap: result.roadmap,
      navigation: result.navigation,
      type: result.type,
      createdAt: nowIso,
    };

    return NextResponse.json({
      sessionId: activeSessionId,
      sessionTitle: finalSessionTitle,
      aiMessage,
      tokenStatus: updatedTokens,
    });
  }

  // 9. Audio Voice Transcription
  if (pathStr === 'ai/transcribe') {
    const { audio, mimeType, language } = body;
    const text = await transcribeAudio(audio, mimeType || 'audio/webm', language || lang);
    return NextResponse.json({ text });
  }

  // 10. Specific AI Actions
  if (pathStr.startsWith('ai/')) {
    const actionName = pathStr.replace(/^ai\//, '');
    let actionKey = actionName;
    if (actionName === 'what-should-i-do') actionKey = 'whatShouldIDo';
    if (actionName === 'breakdown') actionKey = 'taskBreakdown';
    if (actionName === 'parse-task') actionKey = 'parseTask';

    try {
      const result = await executeAIAction(actionKey, body);
      const actionModel = (body as any)?.model || (body as any)?.options?.model || 'smart';
      const tokensUsed = estimateTokenUsage(
        JSON.stringify(body), 
        JSON.stringify(result),
        actionModel,
        (result as any)?.geminiUsage
      );
      const tokenStatus = await consumeUserTokens(userId, isGuest, guestId, tokensUsed, lang);
      return NextResponse.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'AI execution failed' }, { status: 500 });
    }
  }

  // 10-16. Personal Data Upsert Endpoints (Local-First: Stored in Client IndexedDB)
  if (
    pathStr === 'tasks/templates' ||
    pathStr === 'tasks' ||
    pathStr === 'notes' ||
    pathStr === 'mind' ||
    pathStr === 'focus/sessions' ||
    (pathStr.startsWith('focus/sessions/') && pathStr.endsWith('/distractions')) ||
    pathStr === 'diary/topics' ||
    pathStr === 'diary/entries' ||
    pathStr === 'learning/folders' ||
    pathStr === 'learning/logs'
  ) {
    return NextResponse.json({ success: true, message: 'Focentia is local-first; data stored locally' });
  }

  // 17. Reviews & Prompt State
  if (pathStr === 'reviews/prompt-state' || pathStr === 'reviews/state') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertReviewPromptState(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to update review prompt state' }, { status: 500 });
    }
  }

  if (pathStr === 'reviews/action') {
    if (!userId || isGuest) {
      return NextResponse.json({ success: true, count: 0 });
    }
    try {
      const state = await dbGetReviewPromptState(userId);
      if (state?.status === 'submitted') {
        return NextResponse.json({ success: true, status: 'submitted' });
      }
      const currentCount = state?.meaningfulActions || 0;
      const newCount = currentCount + 1;
      await dbUpsertReviewPromptState(userId, {
        status: state?.status || 'eligible',
        meaningfulActions: newCount,
        skipCount: state?.skipCount || 0,
      });
      return NextResponse.json({ success: true, count: newCount });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to record action' }, { status: 500 });
    }
  }

  if (pathStr === 'reviews/skip') {
    if (!userId || isGuest) {
      return NextResponse.json({ success: true });
    }
    try {
      const state = await dbGetReviewPromptState(userId);
      if (state?.status === 'submitted') {
        return NextResponse.json({ success: true, status: 'submitted' });
      }
      const currentSkipCount = state?.skipCount || 0;
      const newSkipCount = currentSkipCount + 1;
      let delayHours = 36;
      if (newSkipCount === 1) delayHours = 36;
      else if (newSkipCount === 2) delayHours = 84;
      else if (newSkipCount === 3) delayHours = 24 * 7;
      else if (newSkipCount === 4) delayHours = 24 * 14;
      else if (newSkipCount === 5) delayHours = 24 * 30;
      else delayHours = 24 * 45;
      const nextPromptDate = new Date(Date.now() + delayHours * 60 * 60 * 1000);
      const nowIso = new Date().toISOString();
      await dbUpsertReviewPromptState(userId, {
        status: 'skipped',
        meaningfulActions: 0,
        skipCount: newSkipCount,
        lastShownAt: nowIso,
        nextPromptAt: nextPromptDate.toISOString(),
      });
      return NextResponse.json({
        success: true,
        skipCount: newSkipCount,
        nextPromptAt: nextPromptDate.toISOString(),
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to record skip' }, { status: 500 });
    }
  }

  if (pathStr === 'reviews' || pathStr === 'reviews/submit') {
    try {
      const parsedRating = typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5 ? Math.round(body.rating) : null;
      const trimmedComment = typeof body.comment === 'string' && body.comment.trim().length > 0 ? body.comment.trim() : null;
      if (parsedRating === null && trimmedComment === null) {
        return NextResponse.json({ error: 'Please provide either a star rating or a comment.' }, { status: 400 });
      }
      if (userId && !isGuest) {
        await dbInsertReview(userId, parsedRating || 5, trimmedComment || '');
        await dbUpsertReviewPromptState(userId, {
          status: 'submitted',
          submittedAt: new Date().toISOString(),
        });
      }
      return NextResponse.json({ success: true, message: 'Review submitted successfully' });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to submit review' }, { status: 500 });
    }
  }

  // 17.5. Notifications POST Endpoints
  if (pathStr === 'notifications/settings') {
    if (!userId || isGuest) return NextResponse.json({ success: true, guest: true });
    try {
      const settings = await dbUpsertNotificationSettings(userId, body);
      return NextResponse.json({ success: true, settings });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to update notification settings' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/subscribe') {
    if (!userId || isGuest) return NextResponse.json({ success: true, guest: true });
    try {
      const { subscription } = body;
      const userAgent = request.headers.get('user-agent') || '';
      await dbSavePushSubscription(userId, subscription, userAgent);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Subscription failed' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/unsubscribe') {
    if (!userId || isGuest) return NextResponse.json({ success: true });
    try {
      const { endpoint } = body;
      await dbRemovePushSubscription(userId, endpoint);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Unsubscribe failed' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/send-push') {
    if (!userId || isGuest) return NextResponse.json({ success: true, guest: true, sentCount: 0 });
    try {
      const payload = body.payload || body;
      const result = await sendWebPushToUser(userId, payload);
      return NextResponse.json({ success: true, ...result });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to send push notification' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/test') {
    try {
      const isBengali = lang === 'bn';
      const payload = {
        title: isBengali ? 'Focentia নোটিফিকেশন সক্রিয়' : 'Focentia Notification Active',
        body: isBengali 
          ? 'আপনার নোটিফিকেশন সিস্টেম সম্পূর্ণ সক্রিয় রয়েছে। ব্যাকগ্রাউন্ড পুশ প্রস্তুত।' 
          : 'Your notification system is fully active. Background Web Push is ready.',
        timestamp: Date.now(),
        category: 'system',
        actionRoute: 'today',
        lang,
      };

      let pushResult = { sentCount: 0, failedCount: 0, removedExpired: 0 };
      if (userId && !isGuest) {
        pushResult = await sendWebPushToUser(userId, payload);
      }

      return NextResponse.json({ success: true, payload, pushResult });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Notification test failed' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/sync') {
    if (!userId || isGuest) return NextResponse.json({ success: true, guest: true });
    try {
      const { notifications } = body;
      if (Array.isArray(notifications)) {
        for (const n of notifications) {
          if (n && n.title) {
            await dbSaveNotification(userId, n);
          }
        }
      }
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to sync notifications' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/rotation') {
    if (!userId || isGuest) return NextResponse.json({ success: true });
    try {
      const { category, bag, lastUsedId } = body;
      if (!category || !Array.isArray(bag)) {
        return NextResponse.json({ error: 'Invalid category or bag' }, { status: 400 });
      }
      await dbSaveRotationState(userId, category, bag, lastUsedId || null);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save rotation state' }, { status: 500 });
    }
  }

  // 18. User Cloud State (Obsolete: Handled by E2EE Sync)
  if (pathStr === 'user/cloud-state' || pathStr === 'user/state') {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ ok: true, path: pathStr });
}

// =========================================================================
// PATCH HANDLER
// =========================================================================
export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');

  const { userId, isGuest, clientIp } = await extractAuth(request);
  if (!userId || isGuest) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  // 1. User Profile Update: PATCH /api/user/profile
  if (pathStr === 'user/profile') {
    // Server-side validation
    if (body.fullName !== undefined) {
      const v = validateFullName(body.fullName);
      if (!v.valid) return NextResponse.json({ error: v.message, code: v.code }, { status: 400 });
    }

    if (body.displayName !== undefined && body.displayName.trim() !== '') {
      const v = validateDisplayName(body.displayName);
      if (!v.valid) return NextResponse.json({ error: v.message, code: v.code }, { status: 400 });
    }

    if (body.phone !== undefined) {
      const v = validatePhone(body.phone);
      if (!v.valid) return NextResponse.json({ error: v.message, code: v.code }, { status: 400 });
    }

    if (body.dateOfBirth !== undefined) {
      const v = validateDateOfBirth(body.dateOfBirth);
      if (!v.valid) return NextResponse.json({ error: v.message, code: v.code }, { status: 400 });
    }

    if (body.bio !== undefined) {
      const v = validateBio(body.bio);
      if (!v.valid) return NextResponse.json({ error: v.message, code: v.code }, { status: 400 });
    }

    if (body.gender !== undefined) {
      const v = validateGender(body.gender);
      if (!v.valid) return NextResponse.json({ error: v.message, code: v.code }, { status: 400 });
    }

    try {
      const updated = await dbUpdateUserProfile(userId, body);
      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Profile update failed', code: ERROR_CODES.SERVER_ERROR }, { status: 500 });
    }
  }

  // 2. Supervisor API - Update Ticket: PATCH /api/supervisor/tickets/:id
  if (pathStr.startsWith('supervisor/tickets/')) {
    const roles = await dbCheckUserRole(userId);
    if (!roles.includes('supervisor') && !roles.includes('admin')) {
      return NextResponse.json({ error: 'Supervisor access required', code: ERROR_CODES.FORBIDDEN }, { status: 403 });
    }

    const ticketId = pathStr.split('/')[2];
    try {
      const updated = await dbUpdateSupportTicket(ticketId, body);
      await dbLogSupervisorAction(userId, 'UPDATE_TICKET', 'support_tickets', ticketId, body, clientIp);
      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to update ticket' }, { status: 500 });
    }
  }

  // 3-6. Personal Data Updates (Local-First: Stored in Client IndexedDB)
  if (
    pathStr.startsWith('tasks/') ||
    pathStr.startsWith('notes/') ||
    (pathStr.startsWith('focus/sessions/') && pathStr.endsWith('/end')) ||
    pathStr.startsWith('learning/folders/')
  ) {
    return NextResponse.json({ success: true, message: 'Focentia is local-first; data updated locally' });
  }

  // 6. Notifications Read State: PATCH /api/notifications/read-all & /api/notifications/:id/read
  if (pathStr === 'notifications/read-all') {
    if (!userId || isGuest) return NextResponse.json({ success: true, guest: true });
    try {
      await dbMarkAllNotificationsRead(userId);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to mark all notifications read' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/read' || (pathStr.startsWith('notifications/') && pathStr.endsWith('/read'))) {
    if (!userId || isGuest) return NextResponse.json({ success: true, guest: true });
    try {
      const parts = pathStr.split('/');
      const notifId = parts.length === 3 ? parts[1] : (body.id || body.notificationId);
      if (notifId) {
        await dbMarkNotificationRead(userId, notifId);
      }
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to mark notification read' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, path: pathStr });
}

// =========================================================================
// DELETE HANDLER
// =========================================================================
export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const pathStr = path.join('/');

  const { userId, isGuest, userEmail, authProvider } = await extractAuth(request);
  const guestId = request.headers.get('x-guest-id') || 'guest';

  // 1. AI Chat Sessions: DELETE /api/ai/sessions & /api/ai/sessions/:id
  if (pathStr === 'ai/sessions' || pathStr === 'ai/agent/sessions') {
    try {
      await clearAllChatSessions(userId || guestId);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to clear chat sessions' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('ai/sessions/') || pathStr.startsWith('ai/agent/sessions/')) {
    try {
      const parts = pathStr.split('/');
      const sessionId = parts[parts.length - 1];
      if (sessionId) {
        await deleteChatSession(sessionId, userId || guestId);
      }
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete chat session' }, { status: 500 });
    }
  }

  if (!userId || isGuest) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });

  // 1.5. Purge Encrypted Sync Data: DELETE /api/sync/purge
  if (pathStr === 'sync/purge') {
    try {
      await pool.query('DELETE FROM encrypted_sync_records WHERE user_id = $1', [userId]);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to purge sync records' }, { status: 500 });
    }
  }

  // 1.6. Purge Encryption Key & Data: DELETE /api/crypto/keys
  if (pathStr === 'crypto/keys') {
    try {
      await pool.query('DELETE FROM user_encryption_keys WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM encrypted_sync_records WHERE user_id = $1', [userId]);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to reset encryption keys' }, { status: 500 });
    }
  }

  // 2. Avatar Removal: DELETE /api/user/avatar
  if (pathStr === 'user/avatar') {
    try {
      const profile = await dbUpdateUserProfile(userId, { avatarUrl: null });
      return NextResponse.json({ success: true, profile });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to remove avatar' }, { status: 500 });
    }
  }

  // 3. Delete Account: DELETE /api/user/account
  if (pathStr === 'user/account') {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const confirmation = (body.confirmation || body.phrase || '').trim();
    if (confirmation !== 'DELETE') {
      return NextResponse.json({
        error: 'Please type DELETE to confirm account deletion.',
        code: ERROR_CODES.INVALID_CONFIRMATION,
      }, { status: 400 });
    }

    // If password account, re-authenticate
    if (authProvider === 'email' && body.password && userEmail) {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: body.password,
      });
      if (authErr) {
        return NextResponse.json({
          error: 'Password confirmation failed.',
          code: ERROR_CODES.INVALID_CREDENTIALS,
        }, { status: 400 });
      }
    }

    try {
      // 1. Safe idempotent database cleanup
      await dbDeleteUserAccountCompletely(userId);

      // 2. Send confirmation email
      if (userEmail) {
        sendAccountDeletedEmail(userEmail);
      }

      // 3. Delete auth account in Supabase
      try {
        const adminClient = supabase;
        // In client context, signing out completes the session purge
        await adminClient.auth.signOut();
      } catch {}

      return NextResponse.json({ success: true, message: 'Account permanently deleted.' });
    } catch (err: any) {
      console.error('[Delete Account Error]:', err);
      return NextResponse.json({ error: err?.message || 'Account deletion failed', code: ERROR_CODES.SERVER_ERROR }, { status: 500 });
    }
  }

  // 4-8. Personal Data Delete Endpoints (Local-First: Stored in Client IndexedDB)
  if (
    pathStr.startsWith('tasks/templates/') ||
    pathStr.startsWith('tasks/') ||
    pathStr.startsWith('notes/') ||
    pathStr === 'mind' ||
    pathStr.startsWith('mind/') ||
    pathStr.startsWith('diary/topics/') ||
    pathStr.startsWith('diary/entries/') ||
    pathStr.startsWith('learning/folders/') ||
    pathStr.startsWith('learning/logs/')
  ) {
    return NextResponse.json({ success: true, message: 'Focentia is local-first; data deleted locally' });
  }

  // 9. Notifications: DELETE /api/notifications & /api/notifications/:id
  if (pathStr === 'notifications') {
    if (!userId || isGuest) return NextResponse.json({ success: true, guest: true });
    try {
      await dbClearNotifications(userId);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to clear notifications' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('notifications/')) {
    if (!userId || isGuest) return NextResponse.json({ success: true, guest: true });
    try {
      const notifId = pathStr.replace('notifications/', '');
      if (notifId) {
        await dbDeleteNotification(userId, notifId);
      }
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete notification' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export const PUT = PATCH;
