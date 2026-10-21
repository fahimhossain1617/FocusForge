/**
 * Glory AI Local-First Router — Intent Handlers Engine
 * Executes deterministic, local responses with 0 Gemini tokens.
 * Returns response message, actions/buttons, orb emotions, and navigation routes.
 */

import type { NormalizedInput } from './normalize';
import type { ClassifiedIntent } from './intents';
import type { ActionRequest, WorkspaceContext } from '../../../types/aiAgent';
import { buildActionRequest } from '../aiActionValidator';
import { getVariantFromPool, recordAndCheckRepeat } from './variation';
import { setActiveFlow, extractTimeFromString, extractMinutesFromString } from './flows';

// Load Template Banks
import socialTemplates from './templates/social.json';
import motivationTemplates from './templates/motivation.json';
import appHelpTemplates from './templates/app_help.json';
import orbReactionTemplates from './templates/orb_reactions.json';

export interface HandlerResult {
  message: string;
  intent: string;
  actions: ActionRequest[];
  orbEmotion: string;
  navigationRoute?: string | null;
  handledLocally: boolean;
  tokenCost: number;
}

/**
 * Parses target date from text (today, tomorrow, 7th, 8th, etc.)
 */
function parseDatesFromText(text: string): string[] {
  const t = text.toLowerCase();
  const now = new Date();
  const dates: string[] = [];

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  if (t.includes('tomorrow') || t.includes('আগামীকাল') || t.includes('কাল') || t.includes('agamikal')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    dates.push(formatDate(tomorrow));
  } else if (t.includes('today') || t.includes('আজকে') || t.includes('আজ') || t.includes('ajke') || t.includes('aj')) {
    dates.push(formatDate(now));
  }

  // Convert Bengali digits to English digits
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  const normalizedDigits = t.replace(/[০-৯]/g, d => bnToEnMap[d] || d);

  // Day numbers like "7th", "8th", "7 and 8", "৭ তারিখ", "৮ তারিখ", "১০ তারিখে" (strip out time like 4pm first)
  const withoutTime = normalizedDigits.replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '');
  const dayMatches = withoutTime.match(/(?:\b|\D)(\d{1,2})(?:st|nd|rd|th|\s*তারিখ|\s*তারিখে)?(?:\b|\D)/g);
  if (dayMatches && (!dates.length || t.includes('and') || t.includes('ও') || t.includes('ebong'))) {
    dayMatches.forEach(m => {
      const numMatch = m.match(/\d{1,2}/);
      if (numMatch) {
        const dayNum = parseInt(numMatch[0], 10);
        if (dayNum >= 1 && dayNum <= 31) {
          const target = new Date(now.getFullYear(), now.getMonth(), dayNum);
          const iso = formatDate(target);
          if (!dates.includes(iso)) {
            dates.push(iso);
          }
        }
      }
    });
  }

  if (dates.length === 0) {
    dates.push(formatDate(now));
  }

  return dates;
}

/**
 * Extracts task names from scheduling request
 */
function extractTaskNames(text: string): string[] {
  const clean = text
    .replace(/\b(add|schedule|to my planner|in planner|tomorrow|today|at|on|প্ল্যানারে|যোগ করো|যোগ|করব)\b/gi, '')
    // Remove date patterns like "7th and 8th", "7th", "8th", etc.
    .replace(/\b\d{1,2}(?:st|nd|rd|th)?(?:\s+(?:and|&|ও|এবং)\s+\d{1,2}(?:st|nd|rd|th)?)?\b/gi, '')
    // Remove time patterns like "4pm", "10:00 am", etc.
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, '')
    .trim();

  // Check for conjunctions "and", "&", "ও", "এবং" between distinct task names
  const parts = clean.split(/\s*(?:and|&|ও|এবং|,)\s*/i).map(p => p.trim()).filter(Boolean);
  if (parts.length > 0) {
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1));
  }
  return [clean.length > 0 ? (clean.charAt(0).toUpperCase() + clean.slice(1)) : 'Study Task'];
}

export function handleLocalIntent(
  norm: NormalizedInput,
  classification: ClassifiedIntent,
  context?: WorkspaceContext,
  userName?: string
): HandlerResult {
  const isBn = norm.detectedLang === 'bn';
  const langKey: 'bn' | 'en' = isBn ? 'bn' : 'en';
  const text = norm.clean;

  // Check repetition
  const repeatInfo = recordAndCheckRepeat(text, isBn);
  const prefix = repeatInfo.progressiveLead ? `${repeatInfo.progressiveLead} ` : '';

  switch (classification.intent) {
    // 1. Social & Small Talk
    case 'GREETING': {
      const { reply } = getVariantFromPool('greetings', socialTemplates.greetings[langKey], userName);
      return {
        message: prefix + reply,
        intent: 'GREETING',
        actions: [],
        orbEmotion: 'happy',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'HOW_ARE_YOU': {
      const pool = (socialTemplates as any).how_are_you?.[langKey] || socialTemplates.greetings[langKey];
      const { reply } = getVariantFromPool('how_are_you', pool, userName);
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'happy',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'WHO_ARE_YOU': {
      const { reply } = getVariantFromPool('who_are_you', socialTemplates.who_are_you[langKey], userName);
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'attentive',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'WHAT_CAN_YOU_DO': {
      const { reply } = getVariantFromPool('what_can_you_do', socialTemplates.what_can_you_do[langKey], userName);
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'attentive',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'JOKES_AND_FUN': {
      const { reply } = getVariantFromPool('jokes', socialTemplates.jokes_and_fun[langKey], userName);
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'playful',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'COMPLIMENTS': {
      const { reply } = getVariantFromPool('compliments', socialTemplates.compliments[langKey], userName);
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'proud',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'FEELINGS_AND_AGE': {
      const { reply } = getVariantFromPool('feelings', socialTemplates.feelings_and_age[langKey], userName);
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'happy',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'BORED_OR_TIRED': {
      const reply = isBn
        ? 'ক্লান্তি বা একঘেয়েমি লাগলে জোর করার দরকার নেই। একটু হেঁটে এসো, এক গ্লাস পানি খাও। মন চাইলে মাত্র ১৫ মিনিটের একটি হালকা ফোকাস সেশন করতে পারো!'
        : "When fatigue or boredom hits, don't force it. Take a brief stretch, grab some water, or run a short 15-minute gentle session.";
      const act = buildActionRequest('open_focus', {}, isBn ? '১৫ মিনিট ফোকাস' : '15m Gentle Focus');
      return {
        message: prefix + reply,
        intent: 'FOCUS_SESSION',
        actions: act ? [act] : [],
        orbEmotion: 'sleepy',
        navigationRoute: 'focus',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'GOOD_NIGHT': {
      const { reply } = getVariantFromPool('good_night', socialTemplates.good_night[langKey], userName);
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'sleepy',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'LOVE_YOU': {
      const reply = isBn
        ? 'ধন্যবাদ বন্ধু! তোমার এই উষ্ণ ভালোবাসায় আমার নীল অর্ব আরও উজ্জ্বল হয়ে উঠল! চলো দিনটাকে সফল বানাই!'
        : "Thank you so much! That warms my blue orb up. Let's conquer today's goals together!";
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'happy',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'ACKNOWLEDGEMENT': {
      const { reply } = getVariantFromPool('ack', socialTemplates.acknowledgement[langKey], userName);
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'idle',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'USER_CORRECTION': {
      const reply = isBn
        ? 'ভুলটি ধরিয়ে দেওয়ার জন্য অনেক ধন্যবাদ! কোথায় ভুল হয়েছে বা তোমার কী প্রয়োজন আমাকে বলো, আমি ঠিক করে দিচ্ছি।'
        : 'Thank you for pointing that out! Please let me know what needs to be corrected or what you need, and I will fix it right away.';
      return {
        message: prefix + reply,
        intent: 'USER_CORRECTION',
        actions: [],
        orbEmotion: 'attentive',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'FAREWELL': {
      const { reply } = getVariantFromPool('farewells', socialTemplates.farewells[langKey], userName);
      return {
        message: prefix + reply,
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'happy',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 2. Emotional Support & Motivation
    case 'EXAM_FEAR': {
      const { reply } = getVariantFromPool('exam_fear', motivationTemplates.exam_fear[langKey], userName);
      const act = buildActionRequest(
        'open_focus',
        {},
        isBn ? motivationTemplates.exam_fear.actionButton.labelBn : motivationTemplates.exam_fear.actionButton.labelEn
      );
      return {
        message: prefix + reply,
        intent: 'FOCUS_SESSION',
        actions: act ? [act] : [],
        orbEmotion: 'caring',
        navigationRoute: 'focus',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'LONELINESS_SADNESS': {
      const { reply } = getVariantFromPool('loneliness', motivationTemplates.loneliness_and_sadness[langKey], userName);
      const act = buildActionRequest(
        'open_diary',
        {},
        isBn ? motivationTemplates.loneliness_and_sadness.actionButton.labelBn : motivationTemplates.loneliness_and_sadness.actionButton.labelEn
      );
      return {
        message: prefix + reply,
        intent: 'MY_DIARY',
        actions: act ? [act] : [],
        orbEmotion: 'caring',
        navigationRoute: 'diary',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'PROCRASTINATION_LAZINESS': {
      const { reply } = getVariantFromPool('procrastination', motivationTemplates.procrastination_and_laziness[langKey], userName);
      const act = buildActionRequest(
        'open_focus',
        {},
        isBn ? motivationTemplates.procrastination_and_laziness.actionButton.labelBn : motivationTemplates.procrastination_and_laziness.actionButton.labelEn
      );
      return {
        message: prefix + reply,
        intent: 'FOCUS_SESSION',
        actions: act ? [act] : [],
        orbEmotion: 'encouraging',
        navigationRoute: 'focus',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'CELEBRATING_PROGRESS': {
      const { reply } = getVariantFromPool('celebrate', motivationTemplates.celebrating_progress[langKey], userName);
      const act = buildActionRequest(
        'open_dashboard',
        {},
        isBn ? motivationTemplates.celebrating_progress.actionButton.labelBn : motivationTemplates.celebrating_progress.actionButton.labelEn
      );
      return {
        message: prefix + reply,
        intent: 'DASHBOARD',
        actions: act ? [act] : [],
        orbEmotion: 'celebrating',
        navigationRoute: 'today',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 3. Navigation Help
    case 'NAVIGATION_FOCUS': {
      const act = buildActionRequest('open_focus', {}, isBn ? 'ফোকাস সেশন খুলুন' : 'Open Focus Session');
      const messageBn = 'অবশ্যই! ফোকাস সেশনের অপশন নিচে দেওয়া হলো। চলো একসাথে সুন্দর অগ্রগতি করি!';
      const messageEn = "Here is the focus session option for you. Let's make wonderful progress together.";
      return {
        message: prefix + (isBn ? messageBn : messageEn),
        intent: 'FOCUS_SESSION',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'focus',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_PLANNER': {
      const act = buildActionRequest('open_planner', {}, isBn ? 'প্ল্যানার খুলুন' : 'Open Planner');
      const messageBn = 'অবশ্যই, তোমার Planner খুলে নেওয়ার অপশন নিচে দেওয়া হলো। এখানে দৈনিক টাইম-ব্লক ও রুটিন শিডিউল দেখতে পারবে।';
      const messageEn = 'Here is your Planner option. You can organize your daily schedule, time-blocks, and routines here.';
      return {
        message: prefix + (isBn ? messageBn : messageEn),
        intent: 'PLANNER_CREATE',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'planner',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_DIARY': {
      const act = buildActionRequest('open_diary', {}, isBn ? 'মাই ডায়েরি খুলুন' : 'Open My Diary');
      const messageBn = 'অবশ্যই, তোমার ব্যক্তিগত My Diary সেকশনের অপশন নিচে দেওয়া হলো। তোমার অনুভূতি ও চিন্তাগুলো নিশ্চিন্তে লিখে রাখতে পারো।';
      const messageEn = 'Here is your My Diary option. Your diary entries are private and secure.';
      return {
        message: prefix + (isBn ? messageBn : messageEn),
        intent: 'MY_DIARY',
        actions: act ? [act] : [],
        orbEmotion: 'caring',
        navigationRoute: 'diary',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_NOTES': {
      const act = buildActionRequest('open_notes', {}, isBn ? 'নোটস ও ফাইলস খুলুন' : 'Open Notes & Files');
      const messageBn = 'অবশ্যই, Notes & Files সেকশনের অপশন নিচে দেওয়া হলো। এখানে রিচ নোটস, স্টাডি মেটেরিয়াল ও ডকুমেন্ট গুছিয়ে রাখতে পারো।';
      const messageEn = 'Here is the Notes & Files option for you. You can organize your study notes, code, and documents here.';
      return {
        message: prefix + (isBn ? messageBn : messageEn),
        intent: 'NOTES_FILES',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'tasks',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_MIND': {
      const isProblemQuery = /(?:problem|issue|trouble|সমস্যা)/i.test(norm.raw);
      const messageBn = isProblemQuery
        ? 'কোনো সমস্যা বা চিন্তা থাকলে একদম মন খারাপ করো না। Mind Space-এর Problem Solver বা Free Flow-তে তোমার চিন্তাগুলো গুছিয়ে সহজ সমাধান বের করতে পারো।'
        : 'অবশ্যই, তোমার Mind Space অপশন নিচে দেওয়া হলো। যখনই মাথায় চিন্তা জমে উঠবে, গুছিয়ে নিতে পারো।';
      const messageEn = isProblemQuery
        ? "Whenever you face a problem or feel stuck, don't worry. You can organize your thoughts and resolve issues inside Mind Space's Problem Solver."
        : 'Here is the Mind Space option for you. Whenever your thoughts feel heavy, just drop by to organize your mind.';
      const act = buildActionRequest('open_mind', {}, isBn ? 'মাইন্ড স্পেস খুলুন' : 'Open Mind Space');
      return {
        message: prefix + (isBn ? messageBn : messageEn),
        intent: 'PROBLEM_SOLVER',
        actions: act ? [act] : [],
        orbEmotion: isProblemQuery ? 'caring' : 'attentive',
        navigationRoute: 'mind',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_LEARNING': {
      const act = buildActionRequest('open_learning', {}, isBn ? 'টাইম লগ খুলুন' : 'Open Time Log');
      const messageBn = 'অবশ্যই, Time Log ও স্কিল বিল্ডারের অপশন নিচে দেওয়া হলো। এখানে বিষয়ভিত্তিক পড়ার সময় ও স্ট্রাইক ট্র্যাক করতে পারবে।';
      const messageEn = 'Here is the Time Log option for you. You can track study hours, subject categories, and streaks here.';
      return {
        message: prefix + (isBn ? messageBn : messageEn),
        intent: 'LEARNING_HUB',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'learning',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_DASHBOARD': {
      const act = buildActionRequest('open_dashboard', {}, isBn ? 'ড্যাশবোর্ড খুলুন' : 'Open Dashboard');
      const messageBn = 'অবশ্যই, Dashboard-এর অপশন নিচে দেওয়া হলো। আজকের সার্বিক অগ্রগতি ও পারফরম্যান্স দেখে নিতে পারো।';
      const messageEn = "Here is the Dashboard option for you. Check today's focus time, tasks, and overall progress.";
      return {
        message: prefix + (isBn ? messageBn : messageEn),
        intent: 'DASHBOARD',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'today',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_SETTINGS': {
      const item = appHelpTemplates.navigation.settings;
      const act = buildActionRequest(item.actionType as any, {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'GREETING_OR_GENERAL',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: item.route,
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 4. Settings Sub-pages
    case 'SETTINGS_LANGUAGE': {
      const item = appHelpTemplates.settings_help.language;
      const act = buildActionRequest('open_settings', {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'GREETING_OR_GENERAL',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'settings',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'SETTINGS_THEME': {
      const item = appHelpTemplates.settings_help.theme;
      const act = buildActionRequest('open_settings', {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'GREETING_OR_GENERAL',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'settings',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'SETTINGS_PASSWORD': {
      const item = appHelpTemplates.settings_help.password;
      const act = buildActionRequest('open_settings', {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'GREETING_OR_GENERAL',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'settings',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'SETTINGS_NOTIFICATIONS': {
      const item = appHelpTemplates.settings_help.notifications;
      const act = buildActionRequest('open_settings', {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'GREETING_OR_GENERAL',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'settings',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'SETTINGS_DELETE_ACCOUNT': {
      const item = appHelpTemplates.settings_help.delete_account;
      const act = buildActionRequest('open_settings', {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'GREETING_OR_GENERAL',
        actions: act ? [act] : [],
        orbEmotion: 'serious',
        navigationRoute: 'settings',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'SETTINGS_SUPPORT': {
      const item = appHelpTemplates.settings_help.report_problem;
      const act = buildActionRequest('open_settings', {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'GREETING_OR_GENERAL',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'settings',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 5. Timer & Focus Actions
    case 'TIMER_ACTION': {
      const act = buildActionRequest(
        'open_timer',
        { tab: 'timer' },
        isBn ? 'টাইমার খুলুন' : 'Open Timer'
      );
      const replyBn = `অবশ্যই! আমাদের অ্যাপে স্টপওয়াচ টাইমার (Stopwatch Timer) সরাসরি বিদ্যমান। তুমি নিচের বাটন দিয়ে সরাসরি টাইমার চালু করতে পারো।`;
      const replyEn = `Sure! Our app includes a built-in Stopwatch Timer. You can start tracking time using the button below.`;

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'FOCUS_SESSION',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: 'focus',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'FOCUS_SESSION_ACTION': {
      const mins = extractMinutesFromString(text);
      if (!mins) {
        // Duration is missing: ask user for minutes
        setActiveFlow('focus_missing_duration', { goal: 'Deep Focus' });
        const askBn = `তুমি কত মিনিটের জন্য ফোকাস সেশন করতে চাও? (যেমন ১৫, ২৫, বা ৫০ মিনিট)`;
        const askEn = `How many minutes would you like to focus for? (e.g., 15, 25, or 50 minutes?)`;

        return {
          message: prefix + (isBn ? askBn : askEn),
          intent: 'FOCUS_SESSION',
          actions: [],
          orbEmotion: 'thinking',
          handledLocally: true,
          tokenCost: 0,
        };
      }

      // Duration was specified directly
      const act = buildActionRequest(
        'create_focus_session',
        { durationMinutes: mins, goal: 'Deep Focus', mode: 'deep' },
        isBn ? `ফোকাস সেশন শুরু (${mins} মিনিট)` : `Start Focus (${mins}m)`
      );
      const replyBn = `অবশ্যই! তোমার জন্য ${mins} মিনিটের ফোকাস সেশন প্রস্তুত করা হয়েছে। সেশন শুরু করতে নিচের বাটনে ট্যাপ করো।`;
      const replyEn = `Ready! I have set up a ${mins}-minute focus session for you. Tap below to begin.`;

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'FOCUS_SESSION',
        actions: act ? [act] : [],
        orbEmotion: 'focused',
        navigationRoute: 'focus',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 6. Planner Actions (Multi-turn time parsing)
    case 'PLANNER_ACTION': {
      const dates = parseDatesFromText(text);
      const rawTasks = extractTaskNames(text);

      const parsedTasks: Array<{ title: string; date: string }> = [];
      dates.forEach(d => {
        rawTasks.forEach(t => {
          parsedTasks.push({ title: t, date: d });
        });
      });

      // Check if time is explicitly stated in message
      const parsedTime = extractTimeFromString(text);

      if (!parsedTime) {
        // Time is missing: activate flow and ask user for time
        setActiveFlow('planner_missing_time', { tasks: parsedTasks });
        const taskTitles = parsedTasks.map(t => `'${t.title}' (${t.date})`).join(', ');
        const askBn = `প্ল্যানারে ${taskTitles} যোগ করতে প্রস্তুত! এটি কখন শিডিউল করব? (যেমন: সকাল ১০টা, বিকাল ৪টা, বা 10:00 AM)`;
        const askEn = `Ready to schedule ${taskTitles} in your Planner! What time should I add it? (e.g. 10:00 AM, 4:00 PM, or evening)`;

        return {
          message: prefix + (isBn ? askBn : askEn),
          intent: 'PLANNER_CREATE',
          actions: [],
          orbEmotion: 'thinking',
          handledLocally: true,
          tokenCost: 0,
        };
      }

      // Time was provided directly (formatted as HH:MM)
      const timeStr = parsedTime;
      const actions: ActionRequest[] = [];
      if (parsedTasks.length > 1) {
        const act = buildActionRequest('create_tasks', {
          tasks: parsedTasks.map(t => ({
            title: t.title,
            targetDate: t.date,
            time: timeStr,
            estimatedMinutes: 60,
            category: 'Study',
            priority: 'medium',
          })),
        }, isBn ? 'প্ল্যানারে কাজগুলো যোগ করবেন?' : 'Add tasks to Planner?');
        if (act) actions.push(act);
      } else if (parsedTasks.length === 1) {
        const single = parsedTasks[0];
        const act = buildActionRequest('create_task', {
          title: single.title,
          targetDate: single.date,
          time: timeStr,
          estimatedMinutes: 60,
          category: 'Study',
          priority: 'medium',
        }, isBn ? `প্ল্যানারে যোগ: ${single.title}` : `Add Task: ${single.title}`);
        if (act) actions.push(act);
      }

      const openAct = buildActionRequest('open_planner', {}, isBn ? 'প্ল্যানার খুলুন' : 'Open Planner');
      if (openAct) actions.push(openAct);

      const replyBn = `প্ল্যানারে কাজগুলো শিডিউল করার কার্ড প্রস্তুত। নিশ্চিত করতে কনফার্ম বাটনে ট্যাপ করো।`;
      const replyEn = `Created your task scheduling card. Confirm below to save it to your Planner.`;

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'PLANNER_CREATE',
        actions,
        orbEmotion: 'focused',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 6b. Task Deletion
    case 'TASK_DELETE': {
      const tasks = context?.tasks || [];
      const lower = text.toLowerCase();
      const matched = tasks.find(t => {
        const title = (t.title || '').toLowerCase().trim();
        return title && lower.includes(title);
      }) || (tasks.length > 0 ? tasks[0] : null);

      if (!matched) {
        const replyBn = 'মুছে ফেলার মতো কোনো টাস্ক খুঁজে পাওয়া যায়নি।';
        const replyEn = 'No tasks found to delete.';
        return {
          message: prefix + (isBn ? replyBn : replyEn),
          intent: 'PLANNER_CREATE',
          actions: [],
          orbEmotion: 'thinking',
          navigationRoute: 'planner',
          handledLocally: true,
          tokenCost: 0,
        };
      }

      const act = buildActionRequest(
        'delete_task',
        { taskId: matched.id, title: matched.title },
        isBn ? `টাস্ক মুছে ফেলুন: ${matched.title}` : `Delete Task: ${matched.title}`
      );

      const replyBn = `তুমি কি নিশ্চিত যে '${matched.title}' টাস্কটি মুছে ফেলতে চাও? নিশ্চিত করতে নিচের কনফার্ম বাটনে চাপ দাও।`;
      const replyEn = `Are you sure you want to delete the task '${matched.title}'? Please confirm below.`;

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'PLANNER_CREATE',
        actions: act ? [act] : [],
        orbEmotion: 'protective',
        navigationRoute: 'planner',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 6c. Notes Actions
    case 'NOTES_ACTION': {
      const actions: ActionRequest[] = [];
      const isDelete = text.includes('delete') || text.includes('মুছে') || text.includes('ডিলিট');
      if (isDelete) {
        const notes = context?.notesSummary || [];
        const matchedNote = notes.find((n: any) => text.toLowerCase().includes((n.title || '').toLowerCase())) || (notes[0] as any);
        if (matchedNote) {
          const act = buildActionRequest(
            'delete_note',
            { noteId: matchedNote.id, title: matchedNote.title },
            isBn ? `নোট মুছে ফেলুন: ${matchedNote.title}` : `Delete Note: ${matchedNote.title}`
          );
          if (act) actions.push(act);
          const replyBn = `তুমি কি নিশ্চিত যে '${matchedNote.title}' নোটটি মুছে ফেলতে চাও?`;
          const replyEn = `Are you sure you want to delete the note '${matchedNote.title}'?`;
          return {
            message: prefix + (isBn ? replyBn : replyEn),
            intent: 'NOTES_FILES',
            actions,
            orbEmotion: 'protective',
            navigationRoute: 'tasks',
            handledLocally: true,
            tokenCost: 0,
          };
        }
      }

      const cleanNoteTitle = text
        .replace(/\b(add note|save note|create note|write note|নোট|সেভ|সংরক্ষণ|যুক্ত|তৈরি|লিখব)\b/gi, '')
        .trim() || (isBn ? 'নতুন স্টাডি নোট' : 'New Study Note');

      const createNoteAct = buildActionRequest(
        'create_note',
        { title: cleanNoteTitle, content: '', category: 'Study' },
        isBn ? `নোট সংরক্ষণ: ${cleanNoteTitle}` : `Save Note: ${cleanNoteTitle}`
      );
      if (createNoteAct) actions.push(createNoteAct);

      const replyBn = `'${cleanNoteTitle}' নোটটি Notes & Files-এ সংরক্ষণ করার কার্ড নিচে তৈরি হয়েছে। নিশ্চিত করতে ট্যাপ করো।`;
      const replyEn = `Created an action card to save '${cleanNoteTitle}' in Notes & Files. Please confirm below.`;

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'NOTES_FILES',
        actions,
        orbEmotion: 'focused',
        navigationRoute: 'tasks',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 7. Diary Actions
    case 'DIARY_ACTION': {
      // Extract short topic or mood
      let topic = 'আজকের অনুভূতি';
      let topicEn = 'Today\'s Reflection';

      if (text.includes('exam') || text.includes('পরীক্ষা')) {
        topic = 'পরীক্ষার চিন্তা ও অনুভূতি';
        topicEn = 'Exam Reflections';
      } else if (text.includes('bad') || text.includes('খারাপ') || text.includes('sad')) {
        topic = 'মন খারাপের কথা';
        topicEn = 'Difficult Day';
      }

      const actions: ActionRequest[] = [];
      const createAct = buildActionRequest('create_diary_entry', {
        title: isBn ? topic : topicEn,
        topicTitle: isBn ? topic : topicEn,
        content: '',
        mood: 'reflective',
      }, isBn ? `ডায়েরিতে ফোল্ডার খুলুন: ${topic}` : `Create Diary Chapter: ${topicEn}`);

      const openAct = buildActionRequest('open_diary', {}, isBn ? 'মাই ডায়েরি খুলুন' : 'Open My Diary');
      if (createAct) actions.push(createAct);
      if (openAct) actions.push(openAct);

      const replyBn = `তোমার My Diary সম্পূর্ণ ব্যক্তিগত ও নিরাপদ। ডায়েরিতে '${topic}' এন্ট্রি যোগ করার কার্ড এবং ডায়েরি খোলার বাটন নিচে প্রস্তুত।`;
      const replyEn = `Your Diary is strictly private to you. Here is the action card to set up '${topicEn}' in My Diary.`;

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'MY_DIARY',
        actions,
        orbEmotion: 'caring',
        navigationRoute: 'diary',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 7. Time Log Actions
    case 'TIMELOG_ACTION': {
      const actions: ActionRequest[] = [];
      const openTimeLogAct = buildActionRequest('open_learning', {}, isBn ? 'টাইম লগ খুলুন' : 'Open Time Log');
      const openPlannerAct = buildActionRequest('open_planner', {}, isBn ? 'প্ল্যানার খুলুন' : 'Open Planner');
      if (openTimeLogAct) actions.push(openTimeLogAct);
      if (openPlannerAct) actions.push(openPlannerAct);

      const replyBn = `তুমি তোমার শেখার জার্নি আরও সহজ করতে পারো আমাদের টাইম লগ (Time Log) ফিচারের মাধ্যমে। যদি চাও নিজে সময় ফিক্স করে প্ল্যানারে শিডিউল করে রাখতে পারো, এতে শেখার প্রোগ্রেস বাড়বে এবং টাইম মেইন্টেইন সহজ হবে।\n\nপরবর্তীতে তুমি কোনো বিষয়ের রোডম্যাপ চাইলে আমাকে বললে আমি তোমার জন্য বিস্তারিত লার্নিং রোডম্যাপ তৈরি করে দেব।`;
      const replyEn = `You can make your learning journey smoother with our Time Log feature. If you want, you can also schedule your study time in the Planner to boost learning progress and maintain consistent time management.\n\nWhenever you want a structured learning roadmap, just let me know and I will create one for you!`;

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'LEARNING_HUB',
        actions,
        orbEmotion: 'focused',
        navigationRoute: 'learning',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 8. Learning / Teaching Requests (Glory Never Teaches)
    case 'LEARNING_TEACH_REQUEST': {
      const actions: ActionRequest[] = [];
      const openTimeLog = buildActionRequest('open_learning', {}, isBn ? 'টাইম লগ খুলুন' : 'Open Time Log');
      const openPlanner = buildActionRequest('open_planner', {}, isBn ? 'প্ল্যানার খুলুন' : 'Open Planner');
      const openFocus = buildActionRequest('open_focus', {}, isBn ? 'ফোকাস সেশন শুরু' : 'Start Focus');
      if (openTimeLog) actions.push(openTimeLog);
      if (openPlanner) actions.push(openPlanner);
      if (openFocus) actions.push(openFocus);

      const replyBn = `আমি মূলত একটি প্রোডাক্টিভিটি সঙ্গী—পড়াশোনার সময় ও রুটিন গুছিয়ে দেওয়াই আমার কাজ। বিষয়ভিত্তিক বিস্তারিত শেখার জন্য তুমি ইউটিউব টিউটোরিয়াল বা এআই টিউটর (যেমন Gemini, ChatGPT, Claude) ব্যবহার করতে পারো। তারপর শেখার সময়টুকু Time Log-এ ট্র্যাক করতে ও Planner-এ শিডিউল করতে আমি প্রস্তুত!`;
      const replyEn = `I am your FocusForge productivity companion! I don't directly teach or solve academic exercises. For deep subject learning, search YouTube or ask an AI tutor (Gemini, ChatGPT, Claude), then track your study hours in Time Log and schedule your revision in Planner!`;

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'GREETING_OR_GENERAL',
        actions,
        orbEmotion: 'thinking',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 9. Stats / Progress
    case 'STATS_PROGRESS': {
      const focusMins = context?.focusMinutesToday || 0;
      const tasksCount = context?.tasks?.length || 0;
      const completedCount = context?.completedTasksCount || 0;
      const score = context?.productivityScore || 0;
      const remainingTasks = Math.max(0, tasksCount - completedCount);

      const replyBn = `আজকের ড্যাশবোর্ড ও পারফরম্যান্স পরিসংখ্যান:\n• প্রোডাক্টিভিটি স্কোর: ${score}%\n• ফোকাস সময়: ${focusMins} মিনিট\n• সম্পন্ন টাস্ক: ${completedCount}টি\n• বাকি টাস্ক: ${remainingTasks}টি\n\nসম্পূর্ণ পারফরম্যান্স ও চার্ট দেখতে নিচের বাটনে ট্যাপ করো।`;
      const replyEn = `Today's Dashboard & Performance Stats:\n• Productivity Score: ${score}%\n• Focus Time: ${focusMins} minutes\n• Completed Tasks: ${completedCount}\n• Remaining Tasks: ${remainingTasks}\n\nCheck your Dashboard for complete performance charts.`;

      const act = buildActionRequest('open_dashboard', {}, isBn ? 'ড্যাশবোর্ড খুলুন' : 'Open Dashboard');
      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'DASHBOARD',
        actions: act ? [act] : [],
        orbEmotion: 'focused',
        navigationRoute: 'today',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 10. App Help
    case 'APP_HELP': {
      let helpTextBn = appHelpTemplates.features_help.focus_session.messageBn;
      let helpTextEn = appHelpTemplates.features_help.focus_session.messageEn;
      let targetRoute = 'focus';

      if (text.includes('routine') || text.includes('রুটিন')) {
        helpTextBn = appHelpTemplates.features_help.routines.messageBn;
        helpTextEn = appHelpTemplates.features_help.routines.messageEn;
        targetRoute = 'planner';
      } else if (text.includes('diary') || text.includes('ডায়েরি')) {
        helpTextBn = appHelpTemplates.features_help.diary_privacy.messageBn;
        helpTextEn = appHelpTemplates.features_help.diary_privacy.messageEn;
        targetRoute = 'diary';
      } else if (text.includes('orb') || text.includes('অর্ব')) {
        helpTextBn = appHelpTemplates.features_help.orb_reactions.messageBn;
        helpTextEn = appHelpTemplates.features_help.orb_reactions.messageEn;
        targetRoute = 'settings';
      }

      return {
        message: prefix + (isBn ? helpTextBn : helpTextEn),
        intent: 'GREETING_OR_GENERAL',
        actions: [],
        orbEmotion: 'attentive',
        navigationRoute: targetRoute,
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 11. Time Log Topics Query (Weak Topics, Important Topics)
    case 'TIMELOG_TOPIC_QUERY': {
      const learningTopics = context?.learningTopics || [];
      const lowerText = text.toLowerCase();

      const TOPIC_ALIASES: Record<string, string[]> = {
        java: ['java', 'জাভা', 'জাভাতে', 'জাভার'],
        python: ['python', 'পাইথন', 'পাইথনে', 'পাইথনের'],
        javascript: ['javascript', 'js', 'জাভাস্ক্রিপ্ট', 'জাভাস্ক্রিপ্টে'],
        react: ['react', 'রিঅ্যাক্ট', 'রিএক্ট', 'রিঅ্যাক্টে'],
        c: ['c', 'সি'],
        'c++': ['c++', 'cpp', 'সি++', 'সি প্লাস প্লাস'],
        math: ['math', 'mathematics', 'গণিত', 'ম্যাথ', 'ম্যাথে'],
        physics: ['physics', 'পদার্থ', 'ফিজিক্স', 'ফিজিক্সে'],
        chemistry: ['chemistry', 'রসায়ন', 'কেমিস্ট্রি'],
        biology: ['biology', 'জীববিজ্ঞান', 'বায়োলজি'],
        english: ['english', 'ইংরেজি', 'ইংলিশ', 'ইংরেজিতে'],
        bangla: ['bangla', 'bengali', 'বাংলা', 'বাংলাতে', 'বাংলায়']
      };

      // Find if a specific folder name is mentioned in user text (direct or via alias)
      const targetFolder = learningTopics.find(lt => {
        const name = (lt.name || '').toLowerCase().trim();
        if (!name) return false;
        if (lowerText.includes(name) || lowerText.includes(name.replace(/\s+/g, ''))) return true;
        for (const [key, aliases] of Object.entries(TOPIC_ALIASES)) {
          if (name.includes(key) && aliases.some(a => lowerText.includes(a))) {
            return true;
          }
        }
        return false;
      });

      const actions: ActionRequest[] = [];
      const openTimeLogAct = buildActionRequest('open_learning', {}, isBn ? 'টাইম লগ খুলুন' : 'Open Time Log');
      if (openTimeLogAct) actions.push(openTimeLogAct);

      if (targetFolder) {
        const impTopics = (targetFolder.importantTopics || []).filter(Boolean);
        const weakTopics = (targetFolder.weakTopics || []).filter(Boolean);
        const hasData = impTopics.length > 0 || weakTopics.length > 0;

        let reply = '';
        if (hasData) {
          if (isBn) {
            reply = `"${targetFolder.name}" ফোল্ডারের টপিক রিপোর্ট:\n\n` +
              `📌 গুরুত্বপূর্ণ টপিক (Important Topics):\n` +
              (impTopics.length > 0 ? impTopics.map(t => `• ${t}`).join('\n') : '• কোনো গুরুত্বপূর্ণ টপিক এন্ট্রি পাওয়া যায়নি।') +
              `\n\n⚠️ দুর্বল টপিক (Weak Topics / Blockers):\n` +
              (weakTopics.length > 0 ? weakTopics.map(t => `• ${t}`).join('\n') : '• কোনো দুর্বল টপিক এন্ট্রি পাওয়া যায়নি।') +
              `\n\n⏱️ মোট শেখার সময়: ${targetFolder.loggedMinutes || 0} মিনিট।`;
          } else {
            reply = `Topic report for "${targetFolder.name}":\n\n` +
              `📌 Important Topics:\n` +
              (impTopics.length > 0 ? impTopics.map(t => `• ${t}`).join('\n') : '• None logged yet.') +
              `\n\n⚠️ Weak Topics / Blockers:\n` +
              (weakTopics.length > 0 ? weakTopics.map(t => `• ${t}`).join('\n') : '• None logged yet.') +
              `\n\n⏱️ Total Logged Time: ${targetFolder.loggedMinutes || 0} minutes.`;
          }
        } else {
          if (isBn) {
            reply = `"${targetFolder.name}" ফোল্ডারে কোনো গুরুত্বপূর্ণ বা দুর্বল টপিক এন্ট্রি পাওয়া যায়নি। Time Log-এ সেশন যোগ করার সময় এগুলো লিখে সেভ করলে এখানে দেখতে পাবে।`;
          } else {
            reply = `No important or weak topics found for "${targetFolder.name}". You can add them while logging learning sessions in Time Log.`;
          }
        }

        return {
          message: prefix + reply,
          intent: 'TIMELOG_TOPIC_QUERY',
          actions,
          orbEmotion: hasData ? 'focused' : 'thinking',
          navigationRoute: 'learning',
          handledLocally: true,
          tokenCost: 0,
        };
      }

      // Check if user specifically requested a non-existent folder
      const folderKeywordMatch = text.match(/([A-Za-z\u0980-\u09FF]+)\s*(?:ফোল্ডার|বিষয়ে|বিষয়ে|সাবজেক্ট|টপিক)/i);
      if (folderKeywordMatch && folderKeywordMatch[1]) {
        const candidate = folderKeywordMatch[1].trim();
        const nonFolderWords = ['সব', 'সকল', 'কোন', 'কোনো', 'আমার', 'টাইম', 'লগ', 'লার্নিং', 'সবগুলো'];
        if (!nonFolderWords.includes(candidate.toLowerCase())) {
          const folderNames = learningTopics.map(f => f.name).join(', ');
          const notFoundBn = `"${candidate}" নামে কোনো ফোল্ডার বা বিষয় Time Log-এ খুঁজে পাওয়া যায়নি। তোমার বর্তমান ফোল্ডারগুলো হলো: ${folderNames || 'কোনো ফোল্ডার নেই'}।`;
          const notFoundEn = `No folder named "${candidate}" found in Time Log. Your existing folders are: ${folderNames || 'None'}。`;
          return {
            message: prefix + (isBn ? notFoundBn : notFoundEn),
            intent: 'TIMELOG_TOPIC_QUERY',
            actions,
            orbEmotion: 'thinking',
            navigationRoute: 'learning',
            handledLocally: true,
            tokenCost: 0,
          };
        }
      }

      // If no folders exist at all
      if (learningTopics.length === 0) {
        const replyBn = `তোমার Time Log-এ এখনও কোনো ফোল্ডার বা টপিক খুঁজে পাওয়া যায়নি। নতুন স্কিল বা বিষয় ট্র্যাক করতে Time Log খুলতে পারো।`;
        const replyEn = `No learning folders found in your Time Log. Open Time Log to create your first learning topic.`;
        return {
          message: prefix + (isBn ? replyBn : replyEn),
          intent: 'TIMELOG_TOPIC_QUERY',
          actions,
          orbEmotion: 'thinking',
          navigationRoute: 'learning',
          handledLocally: true,
          tokenCost: 0,
        };
      }

      // Summarize all folders
      let replyBn = `তোমার Time Log ফোল্ডারগুলোর গুরুত্বপূর্ণ ও দুর্বল টপিকসমূহ:\n`;
      let replyEn = `Here are the important and weak topics across your Time Log folders:\n`;

      learningTopics.forEach(folder => {
        const imp = (folder.importantTopics || []).filter(Boolean);
        const weak = (folder.weakTopics || []).filter(Boolean);
        const folderName = folder.name || 'Untitled';

        replyBn += `\n📁 ${folderName} (${folder.loggedMinutes || 0} মিনিট):\n`;
        replyBn += `  📌 গুরুত্বপূর্ণ: ${imp.length > 0 ? imp.join(', ') : 'পাওয়া যায়নি'}\n`;
        replyBn += `  ⚠️ দুর্বল: ${weak.length > 0 ? weak.join(', ') : 'পাওয়া যায়নি'}\n`;

        replyEn += `\n📁 ${folderName} (${folder.loggedMinutes || 0} mins):\n`;
        replyEn += `  📌 Important: ${imp.length > 0 ? imp.join(', ') : 'None'}\n`;
        replyEn += `  ⚠️ Weak: ${weak.length > 0 ? weak.join(', ') : 'None'}\n`;
      });

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'TIMELOG_TOPIC_QUERY',
        actions,
        orbEmotion: 'focused',
        navigationRoute: 'learning',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    // 12. Planner Schedule / Routine Query for Specific Dates
    case 'PLANNER_DATE_QUERY': {
      const dates = parseDatesFromText(norm.raw);
      const targetDate = dates[0];
      const allTasks = context?.tasks || [];

      // Format date for readable display
      const [, , dayStr] = targetDate.split('-');
      const dayNum = parseInt(dayStr, 10);
      const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const enToBnDigits = (n: number | string) => String(n).replace(/\d/g, d => bnDigits[Number(d)]);
      const displayDayBn = `${enToBnDigits(dayNum)} তারিখ`;
      const displayDayEn = `${dayNum}th`;

      // Filter tasks matching targetDate
      const matchedTasks = allTasks.filter(t => {
        if (!t.targetDate) return false;
        return t.targetDate === targetDate || t.targetDate.startsWith(targetDate);
      });

      const actions: ActionRequest[] = [];
      const openPlannerAct = buildActionRequest('open_planner', {}, isBn ? 'প্ল্যানার খুলুন' : 'Open Planner');
      if (openPlannerAct) actions.push(openPlannerAct);

      if (matchedTasks.length === 0) {
        const emptyBn = `${displayDayBn} (${targetDate}) তোমার প্ল্যানারে কোনো টাস্ক বা রুটিন শিডিউল করা খুঁজে পাওয়া যায়নি। তুমি চাইলে এই দিনের জন্য নতুন টাস্ক যোগ করতে পারো!`;
        const emptyEn = `No tasks or routines found scheduled in your Planner for ${displayDayEn} (${targetDate}). You can schedule new tasks anytime!`;
        return {
          message: prefix + (isBn ? emptyBn : emptyEn),
          intent: 'PLANNER_DATE_QUERY',
          actions,
          orbEmotion: 'thinking',
          navigationRoute: 'planner',
          handledLocally: true,
          tokenCost: 0,
        };
      }

      let replyBn = `${displayDayBn}-এর প্ল্যানার রুটিন ও টাস্কসমূহ (${matchedTasks.length}টি):\n\n`;
      let replyEn = `Planner routine and tasks for ${displayDayEn} (${matchedTasks.length}):\n\n`;

      matchedTasks.forEach((t, i) => {
        const title = t.title || 'Untitled Task';
        const time = t.time ? ` [⏰ ${t.time}]` : '';
        const priority = t.priority ? ` [${t.priority.toUpperCase()}]` : '';
        const statusIcon = t.status === 'completed' ? '✅' : '⏳';
        const statusTextBn = t.status === 'completed' ? 'সম্পন্ন' : 'বাকি';
        const statusTextEn = t.status === 'completed' ? 'Done' : 'Pending';

        replyBn += `${i + 1}. ${statusIcon} **${title}**${time}${priority} (${statusTextBn})\n`;
        replyEn += `${i + 1}. ${statusIcon} **${title}**${time}${priority} (${statusTextEn})\n`;
      });

      const completedCount = matchedTasks.filter(t => t.status === 'completed').length;
      replyBn += `\nমোট সম্পন্ন: ${enToBnDigits(completedCount)}/${enToBnDigits(matchedTasks.length)}টি।`;
      replyEn += `\nProgress: ${completedCount}/${matchedTasks.length} completed.`;

      return {
        message: prefix + (isBn ? replyBn : replyEn),
        intent: 'PLANNER_DATE_QUERY',
        actions,
        orbEmotion: 'focused',
        navigationRoute: 'planner',
        handledLocally: true,
        tokenCost: 0,
      };
    }

    default:
      return {
        message: '',
        intent: 'UNKNOWN',
        actions: [],
        orbEmotion: 'neutral',
        handledLocally: false,
        tokenCost: 0,
      };
  }
}
