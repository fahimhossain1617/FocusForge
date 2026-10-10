/**
 * Glory AI Local-First Router — Quota Gate System
 * Validates token availability before allowing any network Gemini calls.
 * Local responses cost 0 tokens and never hit quota.
 */

import { getAITokenStatus, type TokenStatus } from '../../../services/aiAgentService';

export interface QuotaGateResult {
  allowed: boolean;
  tokenStatus?: TokenStatus;
  exhaustedMessage?: string;
  isGuest?: boolean;
}

export async function checkQuotaGate(
  isAuth: boolean,
  lang: string = 'bn'
): Promise<QuotaGateResult> {
  try {
    const status = await getAITokenStatus(lang);
    
    // Check if remaining tokens are sufficient for a Gemini call (minimum ~100 tokens)
    if (status.isExhausted || status.remaining < 50) {
      const isBn = lang === 'bn';
      const isGuest = !isAuth;

      let msg = '';
      if (isGuest) {
        msg = isBn
          ? 'তোমার গেস্ট ব্যবহারের ফ্রি লিমিট শেষ হয়ে গেছে। ক্লাউড এআই ফিচার এবং ৫,০০০ টোকেন কোটা সক্রিয় করতে একটু লগইন করে নাও। তবে লোকাল সব ফিচার (টাইমার, প্ল্যানার, ডায়েরি) এখনও সম্পূর্ণ চালু রয়েছে!'
          : "Your guest token quota is exhausted. Please log in to unlock 5,000 full tokens and cloud AI sync. Note that all local features (Focus Timer, Planner, Diary) continue to work normally!";
      } else {
        const resetInfo = status.formattedResetDate ? `\n• রিসেট হবে: ${status.formattedResetDate}` : '';
        const remainTime = status.formattedRemainingTime ? `\n• অবশিষ্ট সময়: ${status.formattedRemainingTime}` : '';
        msg = isBn
          ? `আজকের জন্য তোমার দৈনিক এআই লিমিট শেষ হয়েছে।${resetInfo}${remainTime}\n\nলিমিট রিসেট হলে আমি আবার প্রস্তুত থাকব। ততক্ষণ লোকাল রুটিন, ফোকাস টাইমার ও ডায়েরি ব্যবহার করতে পারো!`
          : `Your daily AI token limit has been reached for today.${resetInfo}${remainTime}\n\nOnce reset, I'll be fully ready to assist you again. In the meantime, all local Focus timers, Planner, and Diary remain active!`;
      }

      return {
        allowed: false,
        tokenStatus: status,
        exhaustedMessage: msg,
        isGuest,
      };
    }

    return {
      allowed: true,
      tokenStatus: status,
    };
  } catch (err) {
    console.warn('[Quota Gate] Could not check server quota, allowing graceful local continuation:', err);
    return {
      allowed: true,
    };
  }
}
