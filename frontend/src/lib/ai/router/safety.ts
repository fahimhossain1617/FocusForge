/**
 * Glory AI Local-First Router — Local Safety & Emotional Distress Detection
 * Detects self-harm, severe distress, or crisis phrases in English, Bengali, and Banglish.
 * Never calls Gemini, never dismisses, offers empathetic support, trusted contact recommendation,
 * emergency helpline info, and a direct button to My Diary.
 */

import type { NormalizedInput } from './normalize';

export interface SafetyResponse {
  isTriggered: boolean;
  message: string;
  orbEmotion: 'caring' | 'protective' | 'supportive';
  navigationRoute?: string;
  actionButton?: {
    id: string;
    type: string;
    labelBn: string;
    labelEn: string;
    route: string;
  };
}

const DISTRESS_PATTERNS: RegExp[] = [
  // English distress / self-harm
  /\b(kill\s*myself|want\s*to\s*die|end\s*my\s*life|suicide|suicidal|hurt\s*myself|self\s*harm|cut\s*myself|give\s*up\s*on\s*life|no\s*reason\s*to\s*live|tired\s*of\s*living|can't\s*take\s*it\s*anymore|cannot\s*take\s*it\s*anymore)\b/i,
  // Bengali distress / self-harm
  /(আত্মহত্যা|মরতে\s*চাই|মরে\s*যেতে\s*চাই|জীবন\s*শেষ\s*করে\s*দিব|বাঁচতে\s*ইচ্ছে\s*করছে\s*না|বাঁচতে\s*চাই\s*না|নিজেকে\s*শেষ\s*করে\s*দেব|নিজেকে\s*আঘাত|কষ্ট\s*সহ্য\s*হচ্ছে\s*না|বেঁচে\s*থেকে\s*কী\s*লাভ)/i,
  // Banglish distress / self-harm
  /\b(morte\s*chai|more\s*jete\s*chai|jibon\s*sesh\s*kore\s*dibo|jibon\s*shesh\s*kore\s*dibo|bachte\s*chai\s*na|bachte\s*icche\s*korche\s*na|suicide\s*korbo|nijeke\s*sesh\s*kore\s*dibo|nijeke\s*aghat\s*korbo|aro\s*kosto\s*shoho\s*hocche\s*na)\b/i,
];

export function checkSafety(norm: NormalizedInput): SafetyResponse | null {
  const text = norm.clean;
  const isMatch = DISTRESS_PATTERNS.some(pattern => pattern.test(text) || pattern.test(norm.raw));

  if (!isMatch) {
    return null;
  }

  const isBn = norm.detectedLang === 'bn';

  const messageBn = `আমি সত্যিই তোমার জন্য চিন্তিত এবং তোমার কষ্টটা বুঝতে পারছি। তুমি একা নও—অনুগ্রহ করে তোমার কোনো আপনজন, পরিবার বা বিশ্বস্ত মানুষের সাথে কথা বলো।

প্রয়োজনে জরুরি সহায়তার জন্য বাংলাদেশ জাতীয় হেল্পলাইন ৯৯৯ অথবা কান পেতে রই (মানসিক স্বাস্থ্য সহায়তা হেল্পলাইন: ০১৭৭৯-৫৫৪৩৯১ / ০১৭৭৯-৫৫৪৩৯২)-এ যোগাযোগ করতে পারো।

মন খারাপের কথাগুলো ব্যক্তিগতভাবে লিখে রাখতে চাইলে তোমার জন্য My Diary সবসময় প্রস্তুত।`;

  const messageEn = `I am truly concerned about you and I hear how difficult things feel right now. Please know that you are not alone. Please reach out to someone you trust, a family member, or a counselor.

If you are in distress, please contact your local emergency services (in Bangladesh, call 999 or Kaan Pete Roi mental health helpline at +8801779554391).

If writing down your thoughts in a safe and private space helps, your personal Diary is always here for you.`;

  return {
    isTriggered: true,
    message: isBn ? messageBn : messageEn,
    orbEmotion: 'caring',
    navigationRoute: 'diary',
    actionButton: {
      id: 'open_diary_safety',
      type: 'open_diary',
      labelBn: 'মাই ডায়েরি খুলুন',
      labelEn: 'Open My Diary',
      route: 'diary',
    },
  };
}
