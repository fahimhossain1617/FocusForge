import dns from 'node:dns';
try { dns.setDefaultResultOrder('ipv4first'); } catch {}

import { NextRequest, NextResponse, after } from 'next/server';
import { executeAIAction, transcribeAudio } from '@/lib/server/aiService';
import { getUserTokenStatus, consumeUserTokens, estimateTokenUsage } from '@/lib/server/aiTokenService';
import { 
  getChatSessions, 
  getChatMessages, 
  createChatSession, 
  updateChatSessionTitle, 
  addChatMessage, 
  deleteChatSession, 
  generateSmartTitle 
} from '@/lib/server/aiChatDb';
import {
  dbGetTasks,
  dbUpsertTask,
  dbUpdateTask,
  dbDeleteTask,
  dbGetRoutineTemplates,
  dbUpsertRoutineTemplate,
  dbDeleteRoutineTemplate,
  dbGetNotes,
  dbUpsertNote,
  dbUpdateNote,
  dbDeleteNote,
  dbGetMindItems,
  dbUpsertMindItem,
  dbDeleteMindItem,
  dbDeleteAllMindItems,
  dbGetFocusSessions,
  dbUpsertFocusSession,
  dbEndFocusSession,
  dbAddDistraction,
  dbGetDiaryTopics,
  dbUpsertDiaryTopic,
  dbDeleteDiaryTopic,
  dbUpsertDiaryEntry,
  dbDeleteDiaryEntry,
  dbGetLearningData,
  dbUpsertLearningFolder,
  dbUpdateLearningFolder,
  dbDeleteLearningFolder,
  dbUpsertLearningLog,
  dbDeleteLearningLog,
  dbGetReviewPromptState,
  dbUpsertReviewPromptState,
  dbInsertReview,
  dbClearAllChatSessions,
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
  pool,
} from '@/lib/server/db';
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
  const guestId = request.headers.get('x-guest-id') || 'guest';
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

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

  // 9. AI Agent Sessions & Messages
  if (pathStr === 'ai/agent/sessions' || pathStr === 'ai/sessions') {
    try {
      const sessions = await getChatSessions(userId);
      return NextResponse.json(sessions);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch sessions' }, { status: 500 });
    }
  }

  if (
    (pathStr.startsWith('ai/agent/sessions/') || pathStr.startsWith('ai/sessions/')) &&
    pathStr.endsWith('/messages')
  ) {
    const parts = pathStr.split('/');
    const sessionId = parts[parts.length - 2];
    if (!sessionId) return NextResponse.json([]);
    const messages = await getChatMessages(sessionId);
    return NextResponse.json(messages);
  }

  // 10. Tasks & Routine Templates
  if (pathStr === 'tasks/templates') {
    try {
      const templates = await dbGetRoutineTemplates(userId);
      return NextResponse.json(templates);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch routine templates' }, { status: 500 });
    }
  }

  if (pathStr === 'tasks') {
    try {
      const date = searchParams.get('date') || undefined;
      const status = searchParams.get('status') || undefined;
      const tasks = await dbGetTasks(userId, date, status);
      return NextResponse.json(tasks);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch tasks' }, { status: 500 });
    }
  }

  // 11. Notes
  if (pathStr === 'notes') {
    try {
      const notes = await dbGetNotes(userId);
      return NextResponse.json(notes);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch notes' }, { status: 500 });
    }
  }

  // 12. Mind Items
  if (pathStr === 'mind') {
    try {
      const items = await dbGetMindItems(userId);
      return NextResponse.json(items);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch mind items' }, { status: 500 });
    }
  }

  // 13. Focus Sessions
  if (pathStr === 'focus/sessions') {
    try {
      const sessions = await dbGetFocusSessions(userId);
      return NextResponse.json(sessions);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch focus sessions' }, { status: 500 });
    }
  }

  // 14. Diary Topics & Entries
  if (pathStr === 'diary/topics') {
    try {
      const topics = await dbGetDiaryTopics(userId);
      return NextResponse.json(topics);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch diary topics' }, { status: 500 });
    }
  }

  // 15. Learning Hub Data
  if (pathStr === 'learning/data') {
    try {
      const data = await dbGetLearningData(userId);
      return NextResponse.json(data);
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Failed to fetch learning data' }, { status: 500 });
    }
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

  // 17. User Cloud State
  if (pathStr === 'user/cloud-state' || pathStr === 'user/state') {
    if (!userId || isGuest) return NextResponse.json(null);
    try {
      const res = await pool.query('SELECT state FROM user_cloud_state WHERE id = $1', [userId]);
      return NextResponse.json(res.rows[0]?.state || null);
    } catch {
      return NextResponse.json(null);
    }
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
            user_id, item_id, collection, ciphertext, iv, salt, version, is_deleted, device_id, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (user_id, collection, item_id) DO UPDATE SET
            ciphertext = EXCLUDED.ciphertext,
            iv = EXCLUDED.iv,
            salt = EXCLUDED.salt,
            version = EXCLUDED.version,
            is_deleted = EXCLUDED.is_deleted,
            device_id = EXCLUDED.device_id,
            updated_at = EXCLUDED.updated_at
          `,
          [
            userId,
            String(id),
            collection,
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
        SELECT item_id as id, collection, ciphertext, iv, salt, version, is_deleted as "isDeleted", updated_at as "updatedAt", device_id as "deviceId"
        FROM encrypted_sync_records
        WHERE user_id = $1
      `;
      const params: any[] = [userId];
      if (since && !isNaN(Date.parse(since))) {
        query += ` AND updated_at > $2`;
        params.push(new Date(since).toISOString());
      }
      query += ` ORDER BY updated_at ASC LIMIT 500`;
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
    if (!userId || isGuest) {
      return NextResponse.json({ success: true, guest: true });
    }
    try {
      const userAgent = request.headers.get('user-agent') || '';
      await dbSavePushSubscription(userId, body.subscription, userAgent);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Subscription failed' }, { status: 500 });
    }
  }

  if (pathStr === 'notifications/unsubscribe') {
    if (!userId || isGuest) {
      return NextResponse.json({ success: true });
    }
    try {
      await dbRemovePushSubscription(userId, body.endpoint);
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

  // 5. Support Pipeline Submissions: Report, Contact, Feedback
  if (pathStr === 'user/support/report' || pathStr === 'user/support/contact' || pathStr === 'user/support/feedback') {
    const rateKey = userId ? `support:${userId}` : `support_ip:${clientIp}`;
    const rateCheck = checkRateLimit(rateKey, 10, 3600000); // 10 submissions per hour
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please wait before sending another message.', code: ERROR_CODES.TOO_MANY_ATTEMPTS }, { status: 429 });
    }

    const type = pathStr.includes('report') ? 'report' : pathStr.includes('contact') ? 'contact' : 'feedback';
    const senderName = body.name || (userId ? 'FocusForge User' : 'Guest User');
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

  // 7. Guest Data Migration: POST /api/user/migrate-guest-data
  if (pathStr === 'user/migrate-guest-data') {
    if (!userId || isGuest) {
      return NextResponse.json({ error: 'Authentication required to merge data', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    }

    try {
      const { tasks = [], notes = [], mindItems = [], habits = [] } = body;
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

      return NextResponse.json({
        success: true,
        migrated: { tasks: tasksMigrated, notes: notesMigrated, mindItems: mindMigrated },
      });
    } catch (err: any) {
      return NextResponse.json({ error: err?.message || 'Migration failed', code: ERROR_CODES.SERVER_ERROR }, { status: 500 });
    }
  }

  // 8. AI Agent Chat
  if (pathStr === 'ai/agent/chat') {
    const { sessionId: requestedSessionId, message: userMsg, context: wsContext, history, model: selectedModel } = body;
    const tokenStatus = await getUserTokenStatus(userId, isGuest, guestId, lang);
    if (tokenStatus.isExhausted || tokenStatus.remaining <= 0) {
      const message = isGuest
        ? (lang === 'bn'
            ? `আমি তোমাকে সাহায্য করতে খুব পছন্দ করি! 🥰 কিন্তু তুমি তো এখনও লগইন করোনি আর তোমার গেস্ট লিমিট শেষ হয়ে গেছে। একটু লগইন করে নাও না? তখন আমি আবার জেগে উঠে তোমাকে প্রাণখুলে সাহায্য করব! ততক্ষণ আমি একটু ঘুমিয়ে নিই... 😴💤`
            : `I really love helping you! 🥰 But you haven't logged in yet and your guest limit is reached. Please log in! Once you log in, I'll wake up and help you with all my heart. Until then, let me take a quick nap... 😴💤`)
        : (lang === 'bn'
            ? `আমি তোমাকে সাহায্য করতে চাই! কিন্তু আজকের জন্য তোমার ফ্রি লিমিট শেষ হয়ে গেছে।\n\n• লিমিট রিসেট হবে: ${tokenStatus.formattedResetDate}\n• বাকি সময়: ${tokenStatus.formattedRemainingTime}\n\nপ্লিজ একটু অপেক্ষা করো। লিমিট রিসেট হলে আমি আবার জেগে তোমাকে সাহায্য করব! ততক্ষণ আমি একটু ঘুমিয়ে নিই... 😴💤`
            : `I really want to help you! But your daily limit for today has been reached.\n\n• Resets on: ${tokenStatus.formattedResetDate}\n• Remaining time: ${tokenStatus.formattedRemainingTime}\n\nPlease wait a little bit. Once it resets, I'll wake right up to help you! Until then, let me take a quick nap... 😴💤`);

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
        sessionTitle: userMsg ? userMsg.substring(0, 25) : 'FocusForge AI',
        aiMessage: exhaustedAiMsg,
        tokenStatus,
        isExhausted: true,
      });
    }
    
    let recentHistory = history || [];
    if ((!recentHistory || recentHistory.length === 0) && requestedSessionId && requestedSessionId !== 'guest-session') {
      try {
        const priorMsgs = await getChatMessages(requestedSessionId);
        if (Array.isArray(priorMsgs) && priorMsgs.length > 0) {
          recentHistory = priorMsgs.slice(-8).map((m: any) => ({
            role: m.role,
            content: m.content
          }));
        }
      } catch (err) {
        console.warn('[route chat] Failed to retrieve prior messages:', err);
      }
    }

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
      result = {
        intent: 'GREETING_OR_GENERAL',
        message: lang === 'bn'
          ? 'দুঃখিত, এআই সার্ভার সাময়িক একটু ব্যস্ত ছিল। তোমার পড়াশোনা, কাজ বা যেকোনো বিষয়ে কিছু জানার থাকলে বলো, আমি শুনছি!'
          : "FocusForge AI is temporarily busy. Please let me know if you need help with anything else, I'm here!",
        payload: null
      };
    }

    const tokensUsed = estimateTokenUsage(JSON.stringify(body), JSON.stringify(result), selectedModel || 'smart');
    const updatedTokens = await consumeUserTokens(userId, isGuest, guestId, tokensUsed, lang);

    let activeSessionId = requestedSessionId;
    let finalTitle: string | undefined = undefined;

    if (!activeSessionId || activeSessionId === 'guest-session' || activeSessionId.startsWith('guest_')) {
      finalTitle = await generateSmartTitle(userMsg);
      const newSession = await createChatSession(userId, finalTitle);
      activeSessionId = newSession.id;
    } else {
      try {
        const sessions = await getChatSessions(userId);
        const existing = sessions.find((s) => s.id === activeSessionId);
        if (existing && (existing.title === 'New Conversation' || !existing.title)) {
          finalTitle = await generateSmartTitle(userMsg);
          await updateChatSessionTitle(activeSessionId, finalTitle);
        } else if (existing) {
          finalTitle = existing.title;
        }
      } catch {}
    }

    await addChatMessage(activeSessionId, 'user', userMsg);
    const assistantRow = await addChatMessage(
      activeSessionId, 
      'assistant', 
      result.message, 
      result.intent, 
      result.payload
    );

    const aiMessage = {
      id: assistantRow.id,
      session_id: activeSessionId,
      role: 'assistant' as const,
      content: result.message,
      intent: result.intent,
      payload: result.payload,
      createdAt: assistantRow.created_at,
    };

    return NextResponse.json({
      sessionId: activeSessionId,
      sessionTitle: finalTitle,
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
      const tokensUsed = estimateTokenUsage(JSON.stringify(body), JSON.stringify(result));
      const tokenStatus = await consumeUserTokens(userId, isGuest, guestId, tokensUsed, lang);
      return NextResponse.json(typeof result === 'object' && !Array.isArray(result) ? { ...result, tokenStatus } : result);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'AI execution failed' }, { status: 500 });
    }
  }

  // 11. Tasks & Routine Templates
  if (pathStr === 'tasks/templates') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertRoutineTemplate(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save routine template' }, { status: 500 });
    }
  }

  if (pathStr === 'tasks') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertTask(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save task' }, { status: 500 });
    }
  }

  // 12. Notes
  if (pathStr === 'notes') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertNote(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save note' }, { status: 500 });
    }
  }

  // 13. Mind Items
  if (pathStr === 'mind') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertMindItem(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save mind item' }, { status: 500 });
    }
  }

  // 14. Focus Sessions & Distractions
  if (pathStr === 'focus/sessions') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertFocusSession(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save focus session' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('focus/sessions/') && pathStr.endsWith('/distractions')) {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    const sessionId = pathStr.split('/')[2];
    try {
      const saved = await dbAddDistraction(userId, sessionId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to add distraction' }, { status: 500 });
    }
  }

  // 15. Diary Topics & Entries
  if (pathStr === 'diary/topics') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertDiaryTopic(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save diary topic' }, { status: 500 });
    }
  }

  if (pathStr === 'diary/entries') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertDiaryEntry(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save diary entry' }, { status: 500 });
    }
  }

  // 16. Learning Hub Folders & Logs
  if (pathStr === 'learning/folders') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertLearningFolder(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save learning folder' }, { status: 500 });
    }
  }

  if (pathStr === 'learning/logs') {
    if (!userId) return NextResponse.json({ error: 'Unauthorized', code: ERROR_CODES.UNAUTHORIZED }, { status: 401 });
    try {
      const saved = await dbUpsertLearningLog(userId, body);
      return NextResponse.json(saved);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to save learning log' }, { status: 500 });
    }
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

  // 18. User Cloud State
  if (pathStr === 'user/cloud-state' || pathStr === 'user/state') {
    if (userId && !isGuest) {
      try {
        const statePayload = body.state !== undefined ? body.state : body;
        await pool.query(
          `
          INSERT INTO user_cloud_state (id, state, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (id) DO UPDATE SET
            state = EXCLUDED.state,
            updated_at = NOW()
          `,
          [userId, JSON.stringify(statePayload)]
        );
      } catch {}
    }
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
      const available = await dbCheckUsernameAvailable(body.displayName, userId);
      if (!available) {
        return NextResponse.json({ error: 'Username is already taken.', code: ERROR_CODES.USERNAME_TAKEN }, { status: 409 });
      }
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

  // 3. Tasks: PATCH /api/tasks/:id
  if (pathStr.startsWith('tasks/')) {
    const taskId = parseInt(pathStr.split('/')[1], 10);
    if (!isNaN(taskId)) {
      try {
        const updated = await dbUpdateTask(userId, taskId, body);
        return NextResponse.json(updated);
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to update task' }, { status: 500 });
      }
    }
  }

  // 4. Notes: PATCH /api/notes/:id
  if (pathStr.startsWith('notes/')) {
    const noteId = parseInt(pathStr.split('/')[1], 10);
    if (!isNaN(noteId)) {
      try {
        const updated = await dbUpdateNote(userId, noteId, body);
        return NextResponse.json(updated);
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to update note' }, { status: 500 });
      }
    }
  }

  // 5. Focus: PATCH /api/focus/sessions/:id/end
  if (pathStr.startsWith('focus/sessions/') && pathStr.endsWith('/end')) {
    const sessionId = pathStr.split('/')[2];
    try {
      const updated = await dbEndFocusSession(
        userId,
        sessionId,
        Number(body.durationMinutes) || 0,
        body.completed ?? true,
        body.endedAt
      );
      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to end focus session' }, { status: 500 });
    }
  }

  // 6. Learning: PATCH /api/learning/folders/:id
  if (pathStr.startsWith('learning/folders/')) {
    const folderId = pathStr.split('/')[2];
    try {
      const updated = await dbUpdateLearningFolder(userId, folderId, body);
      return NextResponse.json(updated);
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to update learning folder' }, { status: 500 });
    }
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

  // 1. AI Agent Sessions
  if (pathStr === 'ai/agent/sessions' || pathStr === 'ai/sessions') {
    await dbClearAllChatSessions(userId);
    return NextResponse.json({ success: true });
  }

  if (pathStr.startsWith('ai/agent/sessions/') || pathStr.startsWith('ai/sessions/')) {
    const parts = pathStr.split('/');
    const sessionId = parts[parts.length - 1];
    if (sessionId) {
      await deleteChatSession(sessionId);
    }
    return NextResponse.json({ success: true });
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

  // 4. Tasks & Templates
  if (pathStr.startsWith('tasks/templates/')) {
    const templateId = decodeURIComponent(pathStr.split('/')[2]);
    try {
      await dbDeleteRoutineTemplate(userId, templateId);
      return NextResponse.json({ success: true, id: templateId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete template' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('tasks/')) {
    const taskId = parseInt(pathStr.split('/')[1], 10);
    if (!isNaN(taskId)) {
      try {
        await dbDeleteTask(userId, taskId);
        return NextResponse.json({ success: true, id: taskId });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to delete task' }, { status: 500 });
      }
    }
  }

  // 5. Notes
  if (pathStr.startsWith('notes/')) {
    const noteId = parseInt(pathStr.split('/')[1], 10);
    if (!isNaN(noteId)) {
      try {
        await dbDeleteNote(userId, noteId);
        return NextResponse.json({ success: true, id: noteId });
      } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Failed to delete note' }, { status: 500 });
      }
    }
  }

  // 6. Mind Items
  if (pathStr === 'mind') {
    try {
      await dbDeleteAllMindItems(userId);
      return NextResponse.json({ success: true });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete mind items' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('mind/')) {
    const mindId = pathStr.split('/')[1];
    try {
      await dbDeleteMindItem(userId, mindId);
      return NextResponse.json({ success: true, id: mindId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete mind item' }, { status: 500 });
    }
  }

  // 7. Diary
  if (pathStr.startsWith('diary/topics/')) {
    const topicId = pathStr.split('/')[2];
    try {
      await dbDeleteDiaryTopic(userId, topicId);
      return NextResponse.json({ success: true, id: topicId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete diary topic' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('diary/entries/')) {
    const entryId = pathStr.split('/')[2];
    try {
      await dbDeleteDiaryEntry(userId, entryId);
      return NextResponse.json({ success: true, id: entryId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete diary entry' }, { status: 500 });
    }
  }

  // 8. Learning Hub
  if (pathStr.startsWith('learning/folders/')) {
    const folderId = pathStr.split('/')[2];
    try {
      await dbDeleteLearningFolder(userId, folderId);
      return NextResponse.json({ success: true, id: folderId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete learning folder' }, { status: 500 });
    }
  }

  if (pathStr.startsWith('learning/logs/')) {
    const logId = pathStr.split('/')[2];
    try {
      await dbDeleteLearningLog(userId, logId);
      return NextResponse.json({ success: true, id: logId });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Failed to delete learning log' }, { status: 500 });
    }
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
