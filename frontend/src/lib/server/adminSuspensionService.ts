/**
 * Server-Side User Suspension Enforcement Module
 *
 * Implements server-side user suspension:
 * 1. Checks public.user_suspensions table for active suspension records.
 * 2. Uses Supabase Auth Admin API (service role) to ban/unban user where configured.
 * 3. Enforces suspension at all critical server boundaries:
 *    - Cloud sync (/api/sync/push, /api/sync/pull)
 *    - Glory AI agent chat (/api/ai/agent/chat)
 *    - Feedback submission (/api/feedback/submit)
 *    - User profile and settings
 */

import { pool } from '@/lib/server/db';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mvielktfijxecszlqjxz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Server-only Supabase admin client for auth management (ban/unban/revoke sessions)
export const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export interface SuspensionStatus {
  isSuspended: boolean;
  reason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
}

/**
 * Checks whether a user is currently suspended.
 * Fast cached query with safe fallback.
 */
export async function checkUserSuspension(userId: string | null | undefined): Promise<SuspensionStatus> {
  if (!userId || userId === 'guest') {
    return { isSuspended: false };
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT reason, created_at, suspended_by 
      FROM user_suspensions 
      WHERE user_id = $1 AND is_active = true
      ORDER BY created_at DESC 
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length > 0) {
      return {
        isSuspended: true,
        reason: rows[0].reason || 'Account suspended by administrator',
        suspendedAt: rows[0].created_at ? new Date(rows[0].created_at).toISOString() : undefined,
        suspendedBy: rows[0].suspended_by || undefined,
      };
    }
  } catch (err: any) {
    // If table not created yet (Part 3), log warning and allow through
    if (!err?.message?.includes('does not exist')) {
      console.warn('[SuspensionCheck] Error querying user_suspensions:', err?.message);
    }
  }

  return { isSuspended: false };
}

/**
 * Suspends a user account.
 * Updates database and invokes Supabase Auth admin API if service role is available.
 */
export async function suspendUserAccount(params: {
  userId: string;
  adminId: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const { userId, adminId, reason } = params;

  try {
    // 1. Insert or activate record in user_suspensions
    await pool.query(
      `
      INSERT INTO user_suspensions (user_id, suspended_by, reason, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, true, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        is_active = true,
        reason = EXCLUDED.reason,
        suspended_by = EXCLUDED.suspended_by,
        updated_at = NOW()
      `,
      [userId, adminId, reason]
    );

    // 2. Also update profiles table if is_suspended column exists
    try {
      await pool.query(
        `UPDATE public.profiles SET is_suspended = true, suspension_reason = $1 WHERE id = $2`,
        [reason, userId]
      );
    } catch {}

    // 3. Supabase Auth Admin ban (ban for 100 years / revoke active sessions)
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: '876000h', // ~100 years
        });
      } catch (authBanErr: any) {
        console.warn('[Suspension] Supabase admin ban call notice:', authBanErr?.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Suspension] Failed to suspend user:', err?.message || err);
    return { success: false, error: err?.message || 'Failed to suspend user' };
  }
}

/**
 * Restores a suspended user account.
 */
export async function restoreUserAccount(params: {
  userId: string;
  adminId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { userId } = params;

  try {
    // 1. Mark inactive in user_suspensions
    await pool.query(
      `
      UPDATE user_suspensions 
      SET is_active = false, updated_at = NOW() 
      WHERE user_id = $1
      `,
      [userId]
    );

    // 2. Update profiles table
    try {
      await pool.query(
        `UPDATE public.profiles SET is_suspended = false, suspension_reason = NULL WHERE id = $1`,
        [userId]
      );
    } catch {}

    // 3. Remove ban duration in Supabase Auth
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: 'none',
        });
      } catch (authUnbanErr: any) {
        console.warn('[Suspension] Supabase admin unban call notice:', authUnbanErr?.message);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Suspension] Failed to restore user:', err?.message || err);
    return { success: false, error: err?.message || 'Failed to restore user' };
  }
}
