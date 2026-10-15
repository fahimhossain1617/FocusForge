import { pool } from './db';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_AUTH_TOKENS = 5000;
const DEFAULT_GUEST_TOKENS = 1000;
const RESET_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours rolling reset

let columnsChecked = false;
async function ensureTokenColumns() {
  if (columnsChecked) return;
  try {
    await pool.query(`
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_tokens_total INT DEFAULT 5000;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_tokens_used INT DEFAULT 0;
      ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_tokens_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours';
    `);
    columnsChecked = true;
  } catch (err) {
    console.warn('[aiTokenService] Token columns check notice:', err);
  }
}

export interface TokenStatus {
  total: number;
  used: number;
  remaining: number;
  resetAt: string;
  isExhausted: boolean;
  formattedResetDate?: string;
  formattedRemainingTime?: string;
}

// In-memory fallback cache for guest users or when DB is not configured
const memoryStore = new Map<string, { total: number; used: number; resetAt: Date }>();

function getNextResetDate(): Date {
  return new Date(Date.now() + RESET_DURATION_MS);
}

export function formatResetTime(resetDate: Date, lang: string = 'bn'): { formattedDate: string; formattedTimeRemaining: string } {
  const now = Date.now();
  const diffMs = Math.max(0, resetDate.getTime() - now);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const toBnDigits = (num: number): string => {
    const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(d => bnNums[parseInt(d, 10)] ?? d).join('');
  };

  if (lang === 'bn') {
    const timeRemainingStr = hours > 0
      ? `${toBnDigits(hours)} ঘণ্টা ${toBnDigits(minutes)} মিনিট`
      : `${toBnDigits(minutes)} মিনিট`;

    const options: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const dateStr = resetDate.toLocaleDateString('bn-BD', options);
    return { formattedDate: dateStr, formattedTimeRemaining: timeRemainingStr };
  }

  const timeRemainingStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const dateStr = resetDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return { formattedDate: dateStr, formattedTimeRemaining: timeRemainingStr };
}

export async function getUserTokenStatus(
  userId?: string | null,
  isGuest: boolean = false,
  guestId?: string,
  lang: string = 'bn'
): Promise<TokenStatus> {
  const effectiveKey = (isGuest || !userId || userId === 'guest')
    ? `guest_${guestId || 'default'}`
    : userId;

  const quota = isGuest ? DEFAULT_GUEST_TOKENS : DEFAULT_AUTH_TOKENS;
  const now = new Date();

  // 1. Authenticated User with Database connection
  if (!isGuest && userId && userId !== 'guest' && pool) {
    try {
      await ensureTokenColumns();
      const res = await pool.query(
        `SELECT 
           COALESCE(ai_tokens_total, 5000) AS total,
           CASE WHEN ai_tokens_reset_at IS NULL OR ai_tokens_reset_at <= NOW() THEN 0 ELSE COALESCE(ai_tokens_used, 0) END AS used,
           CASE WHEN ai_tokens_reset_at IS NULL OR ai_tokens_reset_at <= NOW() THEN NOW() + INTERVAL '24 hours' ELSE ai_tokens_reset_at END AS reset_at
         FROM public.profiles
         WHERE id = $1`,
        [userId]
      );

      if (res.rows.length > 0) {
        const total = Number(res.rows[0].total) || DEFAULT_AUTH_TOKENS;
        const used = Number(res.rows[0].used) || 0;
        const resetAtDate = new Date(res.rows[0].reset_at);
        const remaining = Math.max(0, total - used);
        const { formattedDate, formattedTimeRemaining } = formatResetTime(resetAtDate, lang);

        return {
          total,
          used,
          remaining,
          resetAt: resetAtDate.toISOString(),
          isExhausted: remaining <= 0,
          formattedResetDate: formattedDate,
          formattedRemainingTime: formattedTimeRemaining,
        };
      }
    } catch (err: any) {
      console.error('[AI Token Service Backend] Failed to read from profiles table for auth user:', err?.message);
      const now = new Date();
      const retryReset = new Date(now.getTime() + 60 * 1000);
      const { formattedDate, formattedTimeRemaining } = formatResetTime(retryReset, lang);
      return {
        total: DEFAULT_AUTH_TOKENS,
        used: DEFAULT_AUTH_TOKENS,
        remaining: 0,
        resetAt: retryReset.toISOString(),
        isExhausted: true,
        formattedResetDate: formattedDate,
        formattedRemainingTime: formattedTimeRemaining,
      };
    }
  }

  // 2. Memory / Guest Store
  let record = memoryStore.get(effectiveKey);
  if (!record || now >= record.resetAt || record.total !== quota) {
    record = {
      total: quota,
      used: record?.used && record.total === quota ? record.used : 0,
      resetAt: getNextResetDate(),
    };
    memoryStore.set(effectiveKey, record);
  }

  const remaining = Math.max(0, record.total - record.used);
  const { formattedDate, formattedTimeRemaining } = formatResetTime(record.resetAt, lang);

  return {
    total: record.total,
    used: record.used,
    remaining,
    resetAt: record.resetAt.toISOString(),
    isExhausted: remaining <= 0,
    formattedResetDate: formattedDate,
    formattedRemainingTime: formattedTimeRemaining,
  };
}

export async function consumeUserTokens(
  userId?: string | null,
  isGuest: boolean = false,
  guestId?: string,
  tokensToConsume: number = 100,
  lang: string = 'bn'
): Promise<TokenStatus> {
  const safeTokens = Math.max(1, Math.min(100, Math.round(tokensToConsume)));

  // Atomic check-and-deduct in PostgreSQL for authenticated users
  if (!isGuest && userId && userId !== 'guest' && pool) {
    try {
      const { rows } = await pool.query(
        `UPDATE public.profiles
         SET 
           ai_tokens_used = CASE 
             WHEN ai_tokens_reset_at IS NULL OR ai_tokens_reset_at <= NOW() THEN $1 
             ELSE COALESCE(ai_tokens_used, 0) + $1 
           END,
           ai_tokens_reset_at = CASE 
             WHEN ai_tokens_reset_at IS NULL OR ai_tokens_reset_at <= NOW() THEN NOW() + INTERVAL '24 hours' 
             ELSE ai_tokens_reset_at 
           END,
           updated_at = NOW()
         WHERE id = $2
           AND (
             ((ai_tokens_reset_at IS NULL OR ai_tokens_reset_at <= NOW()) AND COALESCE(ai_tokens_total, 5000) >= $1)
             OR (ai_tokens_reset_at > NOW() AND (COALESCE(ai_tokens_total, 5000) - COALESCE(ai_tokens_used, 0)) >= $1)
           )
         RETURNING ai_tokens_total, ai_tokens_used, ai_tokens_reset_at`,
        [safeTokens, userId]
      );

      if (rows.length > 0) {
        const total = Number(rows[0].ai_tokens_total) || DEFAULT_AUTH_TOKENS;
        const used = Number(rows[0].ai_tokens_used) || 0;
        const resetAtDate = new Date(rows[0].ai_tokens_reset_at);
        const remaining = Math.max(0, total - used);
        const { formattedDate, formattedTimeRemaining } = formatResetTime(resetAtDate, lang);
        return {
          total,
          used,
          remaining,
          resetAt: resetAtDate.toISOString(),
          isExhausted: remaining <= 0,
          formattedResetDate: formattedDate,
          formattedRemainingTime: formattedTimeRemaining,
        };
      } else {
        const status = await getUserTokenStatus(userId, isGuest, guestId, lang);
        const error: any = new Error('AI_TOKENS_EXHAUSTED');
        error.code = 'TOKENS_EXHAUSTED';
        error.tokenStatus = status;
        throw error;
      }
    } catch (err: any) {
      if (err.code === 'TOKENS_EXHAUSTED') throw err;
      console.error('[AI Token Service Backend] DB atomic update error for auth user:', err?.message);
      const now = new Date();
      const retryReset = new Date(now.getTime() + 60 * 1000);
      const { formattedDate, formattedTimeRemaining } = formatResetTime(retryReset, lang);
      const error: any = new Error(
        lang === 'bn'
          ? 'সার্ভার ডেটাবেস সংযোগে সমস্যা হয়েছে, টোকেন কোটা আপডেট করা যাচ্ছে না। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।'
          : 'Database connection error while updating token quota. Please try again shortly.'
      );
      error.code = 'DB_TOKEN_ERROR';
      error.tokenStatus = {
        total: DEFAULT_AUTH_TOKENS,
        used: DEFAULT_AUTH_TOKENS,
        remaining: 0,
        resetAt: retryReset.toISOString(),
        isExhausted: true,
        formattedResetDate: formattedDate,
        formattedRemainingTime: formattedTimeRemaining,
      };
      throw error;
    }
  }

  const status = await getUserTokenStatus(userId, isGuest, guestId, lang);
  if (status.isExhausted || status.remaining <= 0) {
    const error: any = new Error('AI_TOKENS_EXHAUSTED');
    error.code = 'TOKENS_EXHAUSTED';
    error.tokenStatus = status;
    throw error;
  }

  const effectiveKey = (isGuest || !userId || userId === 'guest')
    ? `guest_${guestId || 'default'}`
    : userId || 'unknown';

  const newUsed = Math.min(status.total, status.used + safeTokens);
  const newRemaining = Math.max(0, status.total - newUsed);

  const record = memoryStore.get(effectiveKey);
  if (record) {
    record.used = newUsed;
  }

  return {
    ...status,
    used: newUsed,
    remaining: newRemaining,
    isExhausted: newRemaining <= 0,
  };
}

export function estimateTokenUsage(
  promptText: string = '', 
  responseText: string = '', 
  modelMode: string = 'smart',
  geminiUsage?: { totalTokenCount?: number }
): number {
  const normalizedMode = (modelMode || '').toLowerCase().trim();
  const isPlanning = 
    normalizedMode === 'planning' || 
    normalizedMode === 'deep' || 
    normalizedMode === 'pro' || 
    normalizedMode === 'focentia-pro';

  if (isPlanning) {
    // Focentia Pro / Deep Planning: strictly 25 to 30 tokens per interaction
    const responseLen = typeof responseText === 'string' ? responseText.length : 0;
    if (responseLen > 350 || (geminiUsage?.totalTokenCount && geminiUsage.totalTokenCount > 1500)) {
      return 30;
    } else if (responseLen > 150) {
      return 28;
    }
    return 25;
  }

  // Focentia 2.0 / 2.1 / Fast / Standard Mode: 4 to 5 tokens (strictly capped at max 6 tokens)
  const promptLen = typeof promptText === 'string' ? promptText.length : 0;
  const responseLen = typeof responseText === 'string' ? responseText.length : 0;
  
  if (responseLen > 400 || (geminiUsage?.totalTokenCount && geminiUsage.totalTokenCount > 1200)) {
    return 6; // Maximum 6 tokens for larger replies
  } else if (responseLen > 150 || promptLen > 250) {
    return 5; // 5 tokens for medium replies
  }
  return 4; // Standard 4 tokens for short/crisp replies
}

