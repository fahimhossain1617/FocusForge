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

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  if (t.includes('tomorrow') || t.includes('আগামীকাল') || t.includes('কাল') || t.includes('agamikal')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    dates.push(formatDate(tomorrow));
  } else if (t.includes('today') || t.includes('আজকে') || t.includes('আজ') || t.includes('ajke') || t.includes('aj')) {
    dates.push(formatDate(now));
  }

  // Day numbers like "7th", "8th", "7 and 8", "৭ তারিখ", "৮ তারিখ" (strip out time like 4pm first)
  const withoutTime = t.replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '');
  const dayMatches = withoutTime.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/g);
  if (dayMatches && (!dates.length || t.includes('and') || t.includes('ও') || t.includes('ebong'))) {
    dayMatches.forEach(m => {
      const dayNum = parseInt(m, 10);
      if (dayNum >= 1 && dayNum <= 31) {
        const target = new Date(now.getFullYear(), now.getMonth(), dayNum);
        const iso = formatDate(target);
        if (!dates.includes(iso)) {
          dates.push(iso);
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
  let clean = text
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
      const item = appHelpTemplates.navigation.focus;
      const act = buildActionRequest(item.actionType as any, {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'FOCUS_SESSION',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: item.route,
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_PLANNER': {
      const item = appHelpTemplates.navigation.planner;
      const act = buildActionRequest(item.actionType as any, {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'PLANNER_CREATE',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: item.route,
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_DIARY': {
      const item = appHelpTemplates.navigation.diary;
      const act = buildActionRequest(item.actionType as any, {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'MY_DIARY',
        actions: act ? [act] : [],
        orbEmotion: 'caring',
        navigationRoute: item.route,
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_NOTES': {
      const item = appHelpTemplates.navigation.notes;
      const act = buildActionRequest(item.actionType as any, {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'NOTES_FILES',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: item.route,
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_MIND': {
      const item = appHelpTemplates.navigation.mind;
      const act = buildActionRequest(item.actionType as any, {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'PROBLEM_SOLVER',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: item.route,
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_LEARNING': {
      const item = appHelpTemplates.navigation.learning;
      const act = buildActionRequest(item.actionType as any, {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'LEARNING_HUB',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: item.route,
        handledLocally: true,
        tokenCost: 0,
      };
    }

    case 'NAVIGATION_DASHBOARD': {
      const item = appHelpTemplates.navigation.dashboard;
      const act = buildActionRequest(item.actionType as any, {}, isBn ? item.labelBn : item.labelEn);
      return {
        message: prefix + (isBn ? item.messageBn : item.messageEn),
        intent: 'DASHBOARD',
        actions: act ? [act] : [],
        orbEmotion: 'attentive',
        navigationRoute: item.route,
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

    // 6. Diary Actions
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
      const remainingTasks = Math.max(0, tasksCount - completedCount);

      const replyBn = `আজকের অগ্রগতি:\n• ফোকাস সময়: ${focusMins} মিনিট\n• সম্পন্ন টাস্ক: ${completedCount}টি\n• বাকি টাস্ক: ${remainingTasks}টি\n\nবিস্তারিত দেখতে ড্যাশবোর্ডে চোখ বোলাতে পারো।`;
      const replyEn = `Today's Progress:\n• Focus Time: ${focusMins} minutes\n• Completed Tasks: ${completedCount}\n• Remaining Tasks: ${remainingTasks}\n\nCheck your Dashboard for complete performance charts.`;

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
