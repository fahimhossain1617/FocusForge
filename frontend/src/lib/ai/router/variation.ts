/**
 * Glory AI Local-First Router — Response Variation & Shuffle-Bag Memory Engine
 * Enforces non-repeating replies by maintaining recent variant usage memory per intent.
 * Handles repeated identical queries progressively without looping.
 */

interface SessionVariationState {
  recentIndicesByIntent: Record<string, number[]>;
  lastQueryNormalized: string;
  repeatQueryCount: number;
}

const variationMemory: SessionVariationState = {
  recentIndicesByIntent: {},
  lastQueryNormalized: '',
  repeatQueryCount: 0,
};

export function getVariantFromPool(
  intentKey: string,
  pool: string[],
  userName?: string
): { reply: string; isRepeatedQuery: boolean; repeatCount: number } {
  if (!pool || pool.length === 0) {
    return {
      reply: 'আমি প্রস্তুত! কীভাবে সাহায্য করতে পারি?',
      isRepeatedQuery: false,
      repeatCount: 0,
    };
  }

  // Ensure history list exists
  if (!variationMemory.recentIndicesByIntent[intentKey]) {
    variationMemory.recentIndicesByIntent[intentKey] = [];
  }

  const recent = variationMemory.recentIndicesByIntent[intentKey];
  const maxHistory = Math.min(5, Math.max(1, pool.length - 1));

  // Determine available indices not in recent history
  let available = pool.map((_, i) => i).filter(i => !recent.includes(i));

  // If pool exhausted by recent history, reset recent history and pick from all
  if (available.length === 0) {
    variationMemory.recentIndicesByIntent[intentKey] = [];
    available = pool.map((_, i) => i);
  }

  // Shuffle pick
  const selectedIdx = available[Math.floor(Math.random() * available.length)];
  recent.push(selectedIdx);

  // Keep history bounded to maxHistory
  if (recent.length > maxHistory) {
    recent.shift();
  }

  let text = pool[selectedIdx];

  // Optionally inject user's display name if provided
  if (userName && userName.trim()) {
    text = text.replace(/(হ্যালো|বন্ধু|Hello|Hey friend)/i, (m) => `${m} ${userName}`);
  }

  return {
    reply: text,
    isRepeatedQuery: variationMemory.repeatQueryCount > 1,
    repeatCount: variationMemory.repeatQueryCount,
  };
}

/**
 * Tracks repeated query streaks and returns appropriate progressive prefix or redirect
 */
export function recordAndCheckRepeat(normalizedQuery: string, isBn: boolean): {
  isRepeat: boolean;
  repeatCount: number;
  progressiveLead?: string;
} {
  if (variationMemory.lastQueryNormalized === normalizedQuery && normalizedQuery.length > 2) {
    variationMemory.repeatQueryCount += 1;
  } else {
    variationMemory.lastQueryNormalized = normalizedQuery;
    variationMemory.repeatQueryCount = 1;
  }

  const count = variationMemory.repeatQueryCount;

  if (count === 2) {
    return {
      isRepeat: true,
      repeatCount: count,
      progressiveLead: isBn
        ? 'আবারও একই কথা? চলো আরেকভাবে দেখি—'
        : "Back again? Let's try this angle—",
    };
  }

  if (count >= 3) {
    return {
      isRepeat: true,
      repeatCount: count,
      progressiveLead: isBn
        ? 'আমি লক্ষ্য করছি তুমি একই বিষয়ে বারবার ভাবছো। চলো দ্বিধা না করে এখনই একটি ছোট পদক্ষেপ বেছে নিই:'
        : "I notice we keep revisiting this. Instead of looping, let's take one concrete step right now:",
    };
  }

  return {
    isRepeat: false,
    repeatCount: 1,
  };
}

export function resetVariationMemory(): void {
  variationMemory.recentIndicesByIntent = {};
  variationMemory.lastQueryNormalized = '';
  variationMemory.repeatQueryCount = 0;
}
