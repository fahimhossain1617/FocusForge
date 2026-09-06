"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatResetTime = formatResetTime;
exports.getUserTokenStatus = getUserTokenStatus;
exports.consumeUserTokens = consumeUserTokens;
exports.estimateTokenUsage = estimateTokenUsage;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const DEFAULT_TOTAL_TOKENS = 5000;
const RESET_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours rolling reset
let pool = null;
if (process.env.DATABASE_URL) {
    try {
        pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    catch (err) {
        console.warn('[AI Token Service] Could not initialize Postgres pool:', err);
    }
}
// In-memory fallback cache for guest users or when DB is not configured
const memoryStore = new Map();
function getNextResetDate() {
    return new Date(Date.now() + RESET_DURATION_MS);
}
function formatResetTime(resetDate, lang = 'bn') {
    const now = Date.now();
    const diffMs = Math.max(0, resetDate.getTime() - now);
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const toBnDigits = (num) => {
        const bnNums = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return num.toString().split('').map(d => bnNums[parseInt(d, 10)] ?? d).join('');
    };
    if (lang === 'bn') {
        const timeRemainingStr = hours > 0
            ? `${toBnDigits(hours)} ঘণ্টা ${toBnDigits(minutes)} মিনিট`
            : `${toBnDigits(minutes)} মিনিট`;
        const options = {
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
async function getUserTokenStatus(userId, isGuest = false, guestId, lang = 'bn') {
    const effectiveKey = (isGuest || !userId || userId === 'guest')
        ? `guest_${guestId || 'default'}`
        : userId;
    const now = new Date();
    // 1. Authenticated User with Database connection
    if (!isGuest && userId && userId !== 'guest' && pool) {
        try {
            const res = await pool.query('SELECT ai_tokens_total, ai_tokens_used, ai_tokens_reset_at FROM profiles WHERE id = $1', [userId]);
            if (res.rows.length > 0) {
                let total = res.rows[0].ai_tokens_total ?? DEFAULT_TOTAL_TOKENS;
                let used = res.rows[0].ai_tokens_used ?? 0;
                let resetAt = res.rows[0].ai_tokens_reset_at ? new Date(res.rows[0].ai_tokens_reset_at) : getNextResetDate();
                // Check if reset period has elapsed
                if (now >= resetAt) {
                    used = 0;
                    resetAt = getNextResetDate();
                    await pool.query('UPDATE profiles SET ai_tokens_used = $1, ai_tokens_reset_at = $2 WHERE id = $3', [used, resetAt.toISOString(), userId]);
                }
                const remaining = Math.max(0, total - used);
                const { formattedDate, formattedTimeRemaining } = formatResetTime(resetAt, lang);
                return {
                    total,
                    used,
                    remaining,
                    resetAt: resetAt.toISOString(),
                    isExhausted: remaining <= 0,
                    formattedResetDate: formattedDate,
                    formattedRemainingTime: formattedTimeRemaining,
                };
            }
        }
        catch (err) {
            console.warn('[AI Token Service] Failed to read from profiles table, using memory store:', err);
        }
    }
    // 2. Memory / Guest Store
    let record = memoryStore.get(effectiveKey);
    if (!record || now >= record.resetAt) {
        record = {
            total: DEFAULT_TOTAL_TOKENS,
            used: 0,
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
async function consumeUserTokens(userId, isGuest = false, guestId, tokensToConsume = 100, lang = 'bn') {
    const status = await getUserTokenStatus(userId, isGuest, guestId, lang);
    if (status.isExhausted || status.remaining <= 0) {
        const error = new Error('AI_TOKENS_EXHAUSTED');
        error.code = 'TOKENS_EXHAUSTED';
        error.tokenStatus = status;
        throw error;
    }
    const effectiveKey = (isGuest || !userId || userId === 'guest')
        ? `guest_${guestId || 'default'}`
        : userId;
    const newUsed = Math.min(status.total, status.used + tokensToConsume);
    const newRemaining = Math.max(0, status.total - newUsed);
    // Update in DB if authenticated
    if (!isGuest && userId && userId !== 'guest' && pool) {
        try {
            await pool.query('UPDATE profiles SET ai_tokens_used = $1 WHERE id = $2', [newUsed, userId]);
        }
        catch (err) {
            console.warn('[AI Token Service] DB update error, falling back to memory store:', err);
            const record = memoryStore.get(effectiveKey);
            if (record) {
                record.used = newUsed;
            }
        }
    }
    else {
        const record = memoryStore.get(effectiveKey);
        if (record) {
            record.used = newUsed;
        }
    }
    const resetDate = new Date(status.resetAt);
    const { formattedDate, formattedTimeRemaining } = formatResetTime(resetDate, lang);
    return {
        total: status.total,
        used: newUsed,
        remaining: newRemaining,
        resetAt: status.resetAt,
        isExhausted: newRemaining <= 0,
        formattedResetDate: formattedDate,
        formattedRemainingTime: formattedTimeRemaining,
    };
}
function estimateTokenUsage(promptText = '', responseText = '') {
    const combinedLength = (promptText?.length || 0) + (responseText?.length || 0);
    // ~4 characters per token on average for natural language & Bengali
    const calculated = Math.ceil(combinedLength / 4);
    return Math.max(15, calculated);
}
