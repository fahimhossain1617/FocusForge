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
  modelMode: string = 'smart',
  geminiUsage?: { totalTokenCount?: number }
): number {
  if (geminiUsage?.totalTokenCount && geminiUsage.totalTokenCount > 0) {
    return geminiUsage.totalTokenCount;
  }

  const promptChars = promptText?.length || 0;
  const responseChars = responseText?.length || 0;
  const promptTokens = Math.ceil(promptChars / 3.5);
  const responseTokens = Math.ceil(responseChars / 3.5);
  const baseTokens = Math.max(10, promptTokens + responseTokens);

  if (modelMode === 'fast') {
    return Math.max(8, Math.round(baseTokens * 0.75));
  } else if (modelMode === 'planning') {
    return Math.max(25, Math.round(baseTokens * 1.4));
  }

  return baseTokens;
}
