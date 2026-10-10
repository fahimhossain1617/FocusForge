/**
 * Glory AI Local-First Router — Intent Classification Engine
 * Classifies user queries across 30+ local intent patterns (English, Bengali, Banglish)
 * with confidence scoring. Zero Gemini tokens.
 */

import type { NormalizedInput } from './normalize';

export type LocalIntentType =
  | 'GREETING'
  | 'FAREWELL'
  | 'WHO_ARE_YOU'
  | 'WHAT_CAN_YOU_DO'
  | 'JOKES_AND_FUN'
  | 'COMPLIMENTS'
  | 'FEELINGS_AND_AGE'
  | 'BORED_OR_TIRED'
  | 'LOVE_YOU'
  | 'ACKNOWLEDGEMENT'
  | 'GOOD_NIGHT'
  | 'EXAM_FEAR'
  | 'LONELINESS_SADNESS'
  | 'PROCRASTINATION_LAZINESS'
  | 'CELEBRATING_PROGRESS'
  | 'NAVIGATION_FOCUS'
  | 'NAVIGATION_PLANNER'
  | 'NAVIGATION_DIARY'
  | 'NAVIGATION_NOTES'
  | 'NAVIGATION_MIND'
  | 'NAVIGATION_LEARNING'
  | 'NAVIGATION_DASHBOARD'
  | 'NAVIGATION_SETTINGS'
  | 'SETTINGS_LANGUAGE'
  | 'SETTINGS_THEME'
  | 'SETTINGS_PASSWORD'
  | 'SETTINGS_NOTIFICATIONS'
  | 'SETTINGS_DELETE_ACCOUNT'
  | 'SETTINGS_SUPPORT'
  | 'TIMER_ACTION'
  | 'FOCUS_SESSION_ACTION'
  | 'PLANNER_ACTION'
  | 'DIARY_ACTION'
  | 'TIMELOG_ACTION'
  | 'LEARNING_TEACH_REQUEST'
  | 'STATS_PROGRESS'
  | 'APP_HELP'
  | 'BIG_TASK_ROADMAP'
  | 'UNKNOWN';

export interface ClassifiedIntent {
  intent: LocalIntentType;
  confidence: number;
  extractedParams?: Record<string, any>;
  isBigTask: boolean;
}

// 1. Social & Small Talk Patterns
const GREETING_REGEX = /^(hi|hello|hey|heyy|salam|assalamu\s*alaikum|halo|hiya|good\s*morning|good\s*afternoon|good\s*evening|shuvo\s*shokal|সুপ্রভাত|শুভ\s*সকাল|শুভ\s*সন্ধ্যা|সালাম|আসসালামু\s*আলাইকুম|কেমন\s*আছো|কেমন\s*আছিস|কেমন\s*আছেন|কী\s*খবর|কি\s*খবর|কি\s*অবস্থা|kemon\s*achho|kemon\s*acho|kemon\s*aso|ki\s*khobor|ki\s*obostha|halo\s*glory|hey\s*glory|hello\s*glory)$/i;
const FAREWELL_REGEX = /\b(bye|goodbye|see\s*you|tata|allah\s*hafez|বিদায়|বাই|পরে\s*কথা\s*হবে|আল্লাহ\s*হাফেজ|ta\s*ta|pore\s*kotha\s*hobe)\b/i;
const WHO_ARE_YOU_REGEX = /\b(who\s*are\s*you|introduce\s*yourself|what('s|\s+is)\s+your\s+name|who\s+made\s+you|are\s+you\s+a\s+robot|tell\s+me\s+about\s+focusforge|তুমি\s*কে|তোমার\s*নাম\s*কী|তোমার\s*পরিচয়|তুমি\s*কি\s*রোবট|তোমার\s*কাজ\s*কী|tumi\s*ke|tomar\s*naam\s*ki|tumi\s*ki\s*robot|who\s*is\s*glory)\b/i;
const WHAT_CAN_YOU_DO_REGEX = /\b(what\s*can\s*you\s*do|what\s*do\s*you\s*do|features\s*of\s*focusforge|what\s*features\s*do\s*you\s*have|কী\s*করতে\s*পারো|তোমার\s*কাজ\s*কী|কীভাবে\s*সাহায্য\s*করবে|tumi\s*ki\s*korte\s*paro)\b/i;
const JOKES_REGEX = /\b(tell\s*me\s*a\s*joke|joke|make\s*me\s*laugh|funny|কৌতুক|মজার\s*কিছু|হাসাও|joke\s*bolo|koutuk)\b/i;
const COMPLIMENT_REGEX = /\b(you\s*are\s*great|you\s*are\s*awesome|good\s*job|nice|love\s*you\s*glory|thank\s*you|thanks|ধন্যবাদ|থ্যাংক\s*ইউ|দারুণ|তুমি\s*সেরা|valo\s*laglo|dhonnobad|thx)\b/i;
const FEELINGS_AGE_REGEX = /\b(how\s*old\s*are\s*you|your\s*age|how\s*do\s*you\s*feel|তোমার\s*বয়স\s*কত|তোমার\s*বয়স|কেমন\s*অনুভব\s*করছো|tomar\s*boyos|tomar\s*age)\b/i;
const BORED_TIRED_REGEX = /\b(i('m|\s+am)\s+bored|i('m|\s+am)\s+tired|exhausted|feeling\s+sleepy|বোরিং\s*লাগছে|ক্লান্ত\s*লাগছে|ঘুম\s*পাচ্ছে|boring\s*lagche|klanto\s*lagche)\b/i;
const GOOD_NIGHT_REGEX = /\b(good\s*night|night\s*glory|sleep\s*well|শুভ\s*রাত্রি|ঘুমাব|shuvo\s*ratri|ghumaite\s*jai|ghumiye\s*pori)\b/i;
const LOVE_YOU_REGEX = /\b(i\s*love\s*you|love\s*you|তোমাকে\s*ভালোবাসি|bhalobashi\s*tomake)\b/i;
const ACK_REGEX = /^(ok|okay|hmm|hm|yes|no|yup|nope|thik\s*ache|আচ্ছা|ঠিক\s*আছে|হ্যাঁ|না|bujhlam|got\s*it|sure)$/i;

// 2. Emotional Support & Motivation Patterns
const EXAM_FEAR_REGEX = /\b(scared\s*of\s*my\s*exam|exam\s*fear|fear\s*of\s*failure|scared\s*of\s*future|no\s*confidence|fail\s*করব|পরীক্ষার\s*ভয়|ভয়\s*করছে|আত্মবিশ্বাস\s*পাচ্ছি\s*না|ভবিষ্যৎ\s*নিয়ে\s*ভয়|porikhar\s*bhoy|fail\s*korbo|fear\s*exam)\b/i;
const LONELINESS_REGEX = /\b(feel\s*alone|lonely|feeling\s*sad|depressed|stress|stressed|burnout|overwhelmed|কেউ\s*নেই|একা\s*লাগছে|মন\s*খারাপ|কষ্ট\s*হচ্ছে|চাপ\s*সহ্য\s*হচ্ছে\s*না|eka\s*lagche|mon\s*kharap|lonely\s*lagche)\b/i;
const PROCRASTINATION_REGEX = /\b(can('t|\s*not)\s*focus|procrastinat(ing|ion)|phone\s*addiction|distract(ed|ion)|don('t|\s*not)\s*feel\s*like\s*studying|i('m|\s+am)\s+lazy|মন\s*বসছে\s*না|পড়তে\s*ইচ্ছে\s*করছে\s*না|আলসেমি\s*লাগছে|ফোনে\s*সময়\s*নষ্ট|পড়ায়\s*মন\s*নেই|porte\s*icche\s*korche\s*na|mon\s*boshe\s*na|alashemi)\b/i;
const CELEBRATING_REGEX = /\b(i\s*finished\s*my\s*task|finished\s*studying|completed\s*task|studied\s*for\s*\d+\s*hours|কাজ\s*শেষ\s*করেছি|পড়া\s*শেষ|টাস্ক\s*কমপ্লিট|shob\s*porlam|shesh\s*korchi|finished\s*today)\b/i;

// 3. Navigation Patterns
const NAV_FOCUS_REGEX = /\b(take\s*me\s*to\s*focus|where\s*is\s*focus|open\s*focus|go\s*to\s*focus|ফোকাসে\s*যাও|ফোকাস\s*টাইমার\s*খুলুন|ফোকাস\s*খোলো|open\s*pomodoro)\b/i;
const NAV_PLANNER_REGEX = /\b(take\s*me\s*to\s*planner|where\s*is\s*planner|open\s*planner|go\s*to\s*planner|প্ল্যানারে\s*যাও|প্ল্যানার\s*খুলুন|প্ল্যানার\s*খোলো)\b/i;
const NAV_DIARY_REGEX = /\b(take\s*me\s*to\s*diary|where\s*is\s*diary|open\s*diary|my\s*diary|ডায়েরিতে\s*যাও|ডায়েরি\s*খুলুন|ডায়েরি\s*খোলো)\b/i;
const NAV_NOTES_REGEX = /\b(take\s*me\s*to\s*notes|where\s*is\s*notes|notes\s*and\s*files|open\s*notes|নোটস\s*খুলুন|নোটসে\s*যাও|নোটস\s*ও\s*ফাইলস)\b/i;
const NAV_MIND_REGEX = /\b(take\s*me\s*to\s*mind|open\s*mind\s*space|problem\s*solver|idea\s*vault|free\s*flow|মাইন্ড\s*স্পেস\s*খুলুন|মাইন্ড\s*স্পেসে\s*যাও)\b/i;
const NAV_LEARNING_REGEX = /\b(take\s*me\s*to\s*time\s*log|open\s*time\s*log|where\s*is\s*time\s*log|skill\s*builder|টাইম\s*লগ\s*খুলুন|টাইম\s*লগে\s*যাও)\b/i;
const NAV_DASHBOARD_REGEX = /\b(take\s*me\s*to\s*dashboard|open\s*dashboard|open\s*home|ড্যাশবোর্ড\s*খুলুন|ড্যাশবোর্ডে\s*যাও|হোম\s*পেজে\s*যাও)\b/i;
const NAV_SETTINGS_REGEX = /\b(take\s*me\s*to\s*settings|open\s*settings|সেটিংসে\s*যাও|সেটিংস\s*খুলুন)\b/i;

// Settings sub-pages
const SETTINGS_LANG_REGEX = /\b(change\s*language|language\s*settings|how\s*do\s*i\s*change\s*language|বাংলা\s*করব\s*কীভাবে|ভাষা\s*পরিবর্তন|bhasha\s*change)\b/i;
const SETTINGS_THEME_REGEX = /\b(change\s*theme|dark\s*mode|light\s*mode|theme\s*settings|থিম\s*পরিবর্তন|ডার্ক\s*মোড|theme\s*change)\b/i;
const SETTINGS_PASS_REGEX = /\b(change\s*password|reset\s*password|পাসওয়ার্ড\s*পরিবর্তন|পাসওয়ার্ড\s*রিসেট|password\s*change)\b/i;
const SETTINGS_NOTIF_REGEX = /\b(notification\s*settings|quiet\s*hours|turn\s*off\s*notifications|নোটিফিকেশন\s*বন্ধ|নোটিফিকেশন\s*সেটিংস)\b/i;
const SETTINGS_DELETE_REGEX = /\b(delete\s*account|delete\s*my\s*account|remove\s*account|অ্যাকাউন্ট\s*ডিলিট|account\s*delete)\b/i;
const SETTINGS_SUPPORT_REGEX = /\b(contact\s*support|report\s*a\s*problem|report\s*bug|feedback|সমস্যা\s*রিপোর্ট|সাপোর্টে\s*যোগাযোগ)\b/i;

// 4. Productivity Actions
const TIMER_ACTION_REGEX = /(?:\b(timer|stopwatch|count\s*up|need\s*a\s*timer|give\s*me\s*a\s*timer|open\s*timer|start\s*timer)\b|টাইমার|স্টপওয়াচ|টাইমার\s*চাই|টাইমার\s*লাগবে|টাইমার\s*দাও|টাইমার\s*অপশন|স্টপওয়াচ\s*চাই|স্টপওয়াচ\s*লাগবে)/i;
const FOCUS_SESSION_ACTION_REGEX = /(?:\b(focus\s*session|start\s*focus|deep\s*focus|pomodoro|let('s|\s+us)\s+focus|want\s+to\s+focus)\b|ফোকাস\s*সেশন|ফোকাস\s*করব|ফোকাস\s*শুরু|ডিপ\s*ফোকাস|পোমোডোরো|ফোকাস\s*টাইমার)/i;
const PLANNER_ACTION_REGEX = /(?:\b(add\s+(.*)\s+(to\s+my\s+planner|in\s+planner|tomorrow|today|on\s+.*)|schedule\s+(.*)|add\s+these\s+tasks|schedule\s+task)\b|প্ল্যানারে\s+(.*)\s+যোগ|রুটিনে\s+(.*)\s+যোগ)/i;
const DIARY_ACTION_REGEX = /(?:\b(want\s*to\s*write\s*a\s*diary|create\s*a\s*diary|make\s*a\s*diary\s*folder|my\s*mood\s*is\s*bad\s*today)\b|ডায়েরি\s*লিখতে\s*চাই|ডায়েরি\s*তৈরি\s*করো|ডায়েরি\s*ফোল্ডার|ডায়েরিতে\s*লিখব)/i;
const TIMELOG_ACTION_REGEX = /(?:\b(want\s*to\s*learn\s*(.*)|learn\s+(java|python|c\+\+|javascript|react|physics|math|biology|chemistry|english)|track\s*hours|java\s*shikhte\s*chai)\b|টাইম\s*লগে\s*যোগ|শিখতে\s*চাই|পড়তে\s*চাই|জাভা|পাইথন|প্রোগ্রামিং|জাভা\s*শিখব|জাভা\s*শিখতে\s*চাই|কোডিং\s*শিখব)/i;
const TEACH_REQUEST_REGEX = /\b(teach\s*me|explain\s*(this|that|quantum|calculus|oop|newton)|solve\s*this|solve\s*my\s*math|আমাকে\s*শেখাও|আমাকে\s*বুঝিয়ে\s*দাও|সমাধান\s*করে\s*দাও|shikhao\s*amake|bujhiye\s*dao)\b/i;
const STATS_PROGRESS_REGEX = /\b(how\s*much\s*did\s*i\s*focus\s*today|how\s*many\s*tasks\s*left|today('s|\s+)\s*stats|my\s*streak|আজকে\s*কতক্ষণ\s*পড়েছি|কয়টা\s*কাজ\s*বাকি|আজকের\s*পরিসংখ্যান|ajke\s*koto\s*shomoy)\b/i;

// 5. App Help Questions
const APP_HELP_REGEX = /\b(how\s*to\s*start\s*a\s*focus\s*session|how\s*routines\s*work|how\s*does\s*planner\s*work|is\s*diary\s*private|what\s*does\s*the\s*orb\s*do|ফোকাস\s*সেশন\s*কীভাবে\s*চালায়|রুটিন\s*কীভাবে\s*কাজ\s*করে|ডায়েরি\s*কি\s*প্রাইভেট|অর্ব\s*কী\s*করে)\b/i;

// 6. Big Task / Roadmap Patterns (Gemini Allowed)
const ROADMAP_REGEX = /\b(roadmap|complete\s*(.*)\s*roadmap|30\s*day\s*plan|study\s*timetable\s*generation|goal\s*breakdown|রোডম্যাপ|৩০\s*দিনের\s*প্ল্যান|লার্নিং\s*রোডম্যাপ)\b/i;

export function classifyIntent(norm: NormalizedInput): ClassifiedIntent {
  const text = norm.clean;

  // 1. Check big tasks (Gemini allowed)
  if (ROADMAP_REGEX.test(text)) {
    return {
      intent: 'BIG_TASK_ROADMAP',
      confidence: 0.95,
      isBigTask: true,
    };
  }

  // 2. Social / Small Talk
  if (GREETING_REGEX.test(text)) {
    return { intent: 'GREETING', confidence: 0.98, isBigTask: false };
  }
  if (WHO_ARE_YOU_REGEX.test(text)) {
    return { intent: 'WHO_ARE_YOU', confidence: 0.95, isBigTask: false };
  }
  if (WHAT_CAN_YOU_DO_REGEX.test(text)) {
    return { intent: 'WHAT_CAN_YOU_DO', confidence: 0.95, isBigTask: false };
  }
  if (JOKES_REGEX.test(text)) {
    return { intent: 'JOKES_AND_FUN', confidence: 0.95, isBigTask: false };
  }
  if (COMPLIMENT_REGEX.test(text)) {
    return { intent: 'COMPLIMENTS', confidence: 0.92, isBigTask: false };
  }
  if (FEELINGS_AGE_REGEX.test(text)) {
    return { intent: 'FEELINGS_AND_AGE', confidence: 0.90, isBigTask: false };
  }
  if (BORED_TIRED_REGEX.test(text)) {
    return { intent: 'BORED_OR_TIRED', confidence: 0.92, isBigTask: false };
  }
  if (GOOD_NIGHT_REGEX.test(text)) {
    return { intent: 'GOOD_NIGHT', confidence: 0.95, isBigTask: false };
  }
  if (LOVE_YOU_REGEX.test(text)) {
    return { intent: 'LOVE_YOU', confidence: 0.95, isBigTask: false };
  }
  if (FAREWELL_REGEX.test(text)) {
    return { intent: 'FAREWELL', confidence: 0.95, isBigTask: false };
  }
  if (ACK_REGEX.test(text)) {
    return { intent: 'ACKNOWLEDGEMENT', confidence: 0.95, isBigTask: false };
  }

  // 3. Motivation & Emotional Support
  if (EXAM_FEAR_REGEX.test(text)) {
    return { intent: 'EXAM_FEAR', confidence: 0.92, isBigTask: false };
  }
  if (LONELINESS_REGEX.test(text)) {
    return { intent: 'LONELINESS_SADNESS', confidence: 0.92, isBigTask: false };
  }
  if (PROCRASTINATION_REGEX.test(text)) {
    return { intent: 'PROCRASTINATION_LAZINESS', confidence: 0.92, isBigTask: false };
  }
  if (CELEBRATING_REGEX.test(text)) {
    return { intent: 'CELEBRATING_PROGRESS', confidence: 0.90, isBigTask: false };
  }

  // 4. Settings Sub-pages
  if (SETTINGS_LANG_REGEX.test(text)) {
    return { intent: 'SETTINGS_LANGUAGE', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_THEME_REGEX.test(text)) {
    return { intent: 'SETTINGS_THEME', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_PASS_REGEX.test(text)) {
    return { intent: 'SETTINGS_PASSWORD', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_NOTIF_REGEX.test(text)) {
    return { intent: 'SETTINGS_NOTIFICATIONS', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_DELETE_REGEX.test(text)) {
    return { intent: 'SETTINGS_DELETE_ACCOUNT', confidence: 0.95, isBigTask: false };
  }
  if (SETTINGS_SUPPORT_REGEX.test(text)) {
    return { intent: 'SETTINGS_SUPPORT', confidence: 0.95, isBigTask: false };
  }

  // 5. Navigation & Focus Actions
  if (FOCUS_SESSION_ACTION_REGEX.test(text)) {
    return { intent: 'FOCUS_SESSION_ACTION', confidence: 0.95, isBigTask: false };
  }
  if (TIMER_ACTION_REGEX.test(text)) {
    return { intent: 'TIMER_ACTION', confidence: 0.95, isBigTask: false };
  }
  if (NAV_FOCUS_REGEX.test(text)) {
    return { intent: 'NAVIGATION_FOCUS', confidence: 0.95, isBigTask: false };
  }
  if (NAV_PLANNER_REGEX.test(text)) {
    return { intent: 'NAVIGATION_PLANNER', confidence: 0.95, isBigTask: false };
  }
  if (NAV_DIARY_REGEX.test(text)) {
    return { intent: 'NAVIGATION_DIARY', confidence: 0.95, isBigTask: false };
  }
  if (NAV_NOTES_REGEX.test(text)) {
    return { intent: 'NAVIGATION_NOTES', confidence: 0.95, isBigTask: false };
  }
  if (NAV_MIND_REGEX.test(text)) {
    return { intent: 'NAVIGATION_MIND', confidence: 0.95, isBigTask: false };
  }
  if (NAV_LEARNING_REGEX.test(text)) {
    return { intent: 'NAVIGATION_LEARNING', confidence: 0.95, isBigTask: false };
  }
  if (NAV_DASHBOARD_REGEX.test(text)) {
    return { intent: 'NAVIGATION_DASHBOARD', confidence: 0.95, isBigTask: false };
  }
  if (NAV_SETTINGS_REGEX.test(text)) {
    return { intent: 'NAVIGATION_SETTINGS', confidence: 0.95, isBigTask: false };
  }

  // 6. Productivity Actions
  if (PLANNER_ACTION_REGEX.test(text)) {
    return { intent: 'PLANNER_ACTION', confidence: 0.92, isBigTask: false };
  }
  if (DIARY_ACTION_REGEX.test(text)) {
    return { intent: 'DIARY_ACTION', confidence: 0.92, isBigTask: false };
  }
  if (TIMELOG_ACTION_REGEX.test(text)) {
    return { intent: 'TIMELOG_ACTION', confidence: 0.90, isBigTask: false };
  }
  if (TEACH_REQUEST_REGEX.test(text)) {
    return { intent: 'LEARNING_TEACH_REQUEST', confidence: 0.92, isBigTask: false };
  }
  if (STATS_PROGRESS_REGEX.test(text)) {
    return { intent: 'STATS_PROGRESS', confidence: 0.90, isBigTask: false };
  }
  if (APP_HELP_REGEX.test(text)) {
    return { intent: 'APP_HELP', confidence: 0.90, isBigTask: false };
  }

  // Fallback
  return {
    intent: 'UNKNOWN',
    confidence: 0.2,
    isBigTask: false,
  };
}
