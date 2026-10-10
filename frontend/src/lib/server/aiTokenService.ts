const DEFAULT_AUTH_TOKENS = 5000;
const DEFAULT_GUEST_TOKENS = 1000;
const RESET_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours rolling reset

export interface TokenStatus {
  total: number;
  used: number;
  remaining: number;
  resetAt: string;
  isExhausted: boolean;
  formattedResetDate?: string;
  formattedRemainingTime?: string;
}

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
  let record = memoryStore.get(effectiveKey);

  if (!record || record.resetAt <= now || record.total !== quota) {
    record = {
      total: quota,
      used: record?.used && record.total === quota ? record.used : 0,
      resetAt: getNextResetDate(),
    };
    memoryStore.set(effectiveKey, record);
  }

  const remaining = Math.max(0, record.total - record.used);
  const isExhausted = remaining <= 0;
  const { formattedDate, formattedTimeRemaining } = formatResetTime(record.resetAt, lang);

  return {
    total: record.total,
    used: record.used,
    remaining,
    resetAt: record.resetAt.toISOString(),
    isExhausted,
    formattedResetDate: formattedDate,
    formattedRemainingTime: formattedTimeRemaining,
  };
}

export async function consumeUserTokens(
  userId: string | null | undefined,
  isGuest: boolean = false,
  guestId: string | undefined,
  tokensToConsume: number,
  lang: string = 'bn'
): Promise<TokenStatus> {
  const effectiveKey = (isGuest || !userId || userId === 'guest')
    ? `guest_${guestId || 'default'}`
    : userId;

  const quota = isGuest ? DEFAULT_GUEST_TOKENS : DEFAULT_AUTH_TOKENS;
  const now = new Date();
  let record = memoryStore.get(effectiveKey);

  if (!record || record.resetAt <= now || record.total !== quota) {
    record = {
      total: quota,
      used: 0,
      resetAt: getNextResetDate(),
    };
  }

  record.used = Math.min(record.total, record.used + tokensToConsume);
  memoryStore.set(effectiveKey, record);

  return getUserTokenStatus(userId, isGuest, guestId, lang);
}

export function estimateTokenUsage(
  promptText: string = '', 
  responseText: string = '',
  modelMode: string = 'fast',
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

