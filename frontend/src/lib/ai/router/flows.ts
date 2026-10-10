/**
 * Glory AI Local-First Router — Multi-Step Conversational Flows
 * Handles multi-turn state (e.g., asking for missing task time in Planner,
 * roadmap level clarification, and multi-date scheduling).
 */

import type { ActionRequest } from '../../../types/aiAgent';
import { buildActionRequest } from '../aiActionValidator';

export interface PendingFlowState {
  flowType: 'planner_missing_time' | 'focus_missing_duration' | 'roadmap_missing_level' | 'confirm_recurring';
  data: any;
  timestamp: number;
}

let activeFlow: PendingFlowState | null = null;

export function getActiveFlow(): PendingFlowState | null {
  if (!activeFlow) return null;
  // Expire flows older than 10 minutes
  if (Date.now() - activeFlow.timestamp > 10 * 60 * 1000) {
    activeFlow = null;
    return null;
  }
  return activeFlow;
}

export function setActiveFlow(flowType: PendingFlowState['flowType'], data: any): void {
  activeFlow = {
    flowType,
    data,
    timestamp: Date.now(),
  };
}

export function clearActiveFlow(): void {
  activeFlow = null;
}

/**
 * Parses time expressions from user input (e.g., "10am", "4:30 pm", "সকাল ১০টা", "বিকাল ৪টা", "14:00")
 */
export function extractTimeFromString(text: string): string | null {
  const t = text.trim().toLowerCase();

  // 12-hour format with am/pm: "10:30 am", "4 pm", "10am"
  const ampmMatch = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const min = ampmMatch[2] ? ampmMatch[2].padStart(2, '0') : '00';
    const isPm = ampmMatch[3].toLowerCase() === 'pm';
    if (isPm && hour < 12) hour += 12;
    if (!isPm && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${min}`;
  }

  // 24-hour format: "14:00", "09:30"
  const time24Match = t.match(/\b(\d{1,2}):(\d{2})\b/);
  if (time24Match) {
    const hour = parseInt(time24Match[1], 10);
    const min = time24Match[2];
    if (hour >= 0 && hour <= 23) {
      return `${String(hour).padStart(2, '0')}:${min}`;
    }
  }

  // Bengali time phrases: "সকাল ১০টা", "বিকাল ৪টা", "রাত ৯টা", "দুপুর ১২টা"
  const bnMatch = t.match(/(সকাল|দুপুর|বিকাল|সন্ধ্যা|রাত)\s*(\d{1,2}|[০-৯]{1,2})\s*টা/);
  if (bnMatch) {
    const period = bnMatch[1];
    let rawH = bnMatch[2];
    // Convert Bengali digits if needed
    const bnDigits: Record<string, string> = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
    rawH = rawH.split('').map(c => bnDigits[c] || c).join('');
    let hour = parseInt(rawH, 10);

    if (period === 'বিকাল' || period === 'সন্ধ্যা' || period === 'রাত') {
      if (hour < 12) hour += 12;
    } else if (period === 'দুপুর' && hour !== 12 && hour < 6) {
      hour += 12;
    }
    return `${String(hour).padStart(2, '0')}:00`;
  }

  // Banglish time phrases: "shokal 10ta", "bikel 4ta", "raat 9ta"
  const banglishMatch = t.match(/(shokal|dupur|bikel|shondha|raat)\s*(\d{1,2})\s*(?:ta)?/i);
  if (banglishMatch) {
    const period = banglishMatch[1].toLowerCase();
    let hour = parseInt(banglishMatch[2], 10);
    if ((period === 'bikel' || period === 'shondha' || period === 'raat') && hour < 12) {
      hour += 12;
    }
    return `${String(hour).padStart(2, '0')}:00`;
  }

  // Standalone hour: "10 ta", "10 o'clock", "at 10"
  const standaloneMatch = t.match(/\b(?:at\s*)?(\d{1,2})\s*(?:ta|o'?clock)?\b/i);
  if (standaloneMatch) {
    const hour = parseInt(standaloneMatch[1], 10);
    if (hour >= 1 && hour <= 24) {
      const h = hour === 24 ? 0 : hour;
      return `${String(h).padStart(2, '0')}:00`;
    }
  }

  return null;
}

/**
 * Parses minutes or duration from user input (e.g., "15m", "25 minutes", "১০ মিনিট", "45", "1 hour")
 */
export function extractMinutesFromString(text: string): number | null {
  if (!text) return null;
  const t = text.trim().toLowerCase();

  // Convert Bengali numerals to English numerals
  const bnDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
  };
  const normalizedText = t.split('').map(c => bnDigits[c] || c).join('');

  // 1. Hours: "1 hour", "2 hrs", "১ ঘণ্টা", "1.5 hours"
  const hourMatch = normalizedText.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|ঘণ্টা|ঘন্টা)\b/i);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    if (!isNaN(hours) && hours > 0) {
      return Math.min(300, Math.round(hours * 60));
    }
  }

  // 2. Minutes with unit: "15 min", "25 mins", "30 minutes", "10m", "১৫ মিনিট", "২০ মিঃ"
  const minMatch = normalizedText.match(/\b(\d+)\s*(?:minutes?|mins?|min|m|মিনিট|মিঃ)\b/i);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    if (!isNaN(mins) && mins > 0) {
      return Math.min(300, mins);
    }
  }

  // 3. Standalone number when answering a prompt (e.g., "25", "50", "15", "১০")
  const standaloneMatch = normalizedText.match(/^\s*(\d+)\s*$/);
  if (standaloneMatch) {
    const mins = parseInt(standaloneMatch[1], 10);
    if (!isNaN(mins) && mins >= 1 && mins <= 240) {
      return mins;
    }
  }

  // 4. "for 25", "about 30"
  const forMatch = normalizedText.match(/\b(?:for|around|about|প্রায়)\s*(\d+)\b/i);
  if (forMatch) {
    const mins = parseInt(forMatch[1], 10);
    if (!isNaN(mins) && mins >= 1 && mins <= 240) {
      return mins;
    }
  }

  return null;
}

/**
 * Attempts to resolve an active multi-turn flow with the latest user message
 */
export function processFlowTurn(
  userText: string,
  isBn: boolean
): {
  handled: boolean;
  reply: string;
  actions: ActionRequest[];
  intent?: string;
  orbEmotion?: string;
  navigationRoute?: string | null;
} | null {
  const current = getActiveFlow();
  if (!current) return null;

  // Case 1: Waiting for task time in planner
  if (current.flowType === 'planner_missing_time') {
    const parsedTime = extractTimeFromString(userText) || '10:00';
    const pendingTasks = current.data.tasks || [];

    const actions: ActionRequest[] = [];
    if (pendingTasks.length > 1) {
      const formattedTasks = pendingTasks.map((t: any, idx: number) => {
        // If multiple tasks, space them by 1 hour
        const [h, m] = parsedTime.split(':').map(Number);
        const taskHour = (h + idx) % 24;
        const taskTime = `${String(taskHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        return {
          title: t.title,
          targetDate: t.date,
          time: taskTime,
          estimatedMinutes: 60,
          category: 'Study',
          priority: 'medium',
        };
      });

      const act = buildActionRequest(
        'create_tasks',
        { tasks: formattedTasks },
        isBn ? 'প্ল্যানারে এই কাজগুলো যোগ করবেন?' : 'Add these tasks to Planner?'
      );
      if (act) actions.push(act);
    } else if (pendingTasks.length === 1) {
      const single = pendingTasks[0];
      const act = buildActionRequest(
        'create_task',
        {
          title: single.title,
          targetDate: single.date,
          time: parsedTime,
          estimatedMinutes: 60,
          category: 'Study',
          priority: 'medium',
        },
        isBn ? `প্ল্যানারে যোগ: ${single.title} (${parsedTime})` : `Add Task: ${single.title} at ${parsedTime}`
      );
      if (act) actions.push(act);
    }

    clearActiveFlow();

    const titleList = pendingTasks.map((t: any) => `'${t.title}'`).join(', ');
    const replyBn = `ঠিক আছে! সময় হিসেবে ${parsedTime} নির্ধারণ করেছি। প্ল্যানারে ${titleList} যুক্ত করার কার্ডটি নিচে দেওয়া হলো। অনুমোদনের পর 'Open Planner' দিয়ে দেখে নিতে পারবে।`;
    const replyEn = `Got it! Set the time to ${parsedTime}. Here is the confirmation card to add ${titleList} to your Planner. You can review it using 'Open Planner'.`;

    return {
      handled: true,
      reply: isBn ? replyBn : replyEn,
      actions,
      intent: 'PLANNER_CREATE',
      orbEmotion: 'focused',
      navigationRoute: 'planner',
    };
  }

  // Case 2: Waiting for focus session duration
  if (current.flowType === 'focus_missing_duration') {
    if (userText.match(/\b(cancel|stop|nevermind|no|বাতিল|দরকার\s*নেই|না)\b/i)) {
      clearActiveFlow();
      return {
        handled: true,
        reply: isBn ? 'ঠিক আছে, ফোকাস সেশন বাতিল করা হয়েছে।' : 'Understood, cancelled the focus session.',
        actions: [],
        intent: 'GREETING_OR_GENERAL',
        orbEmotion: 'idle',
        navigationRoute: null,
      };
    }

    const mins = extractMinutesFromString(userText) || 25;
    const goal = current.data?.goal || 'Deep Focus';
    const act = buildActionRequest(
      'create_focus_session',
      { durationMinutes: mins, goal, mode: 'deep' },
      isBn ? `ফোকাস সেশন শুরু (${mins} মিনিট)` : `Start Focus (${mins}m)`
    );

    clearActiveFlow();

    const replyBn = `অবশ্যই! তোমার জন্য ${mins} মিনিটের ফোকাস সেশন প্রস্তুত করা হয়েছে। সেশন শুরু করতে নিচের বাটনে ট্যাপ করো।`;
    const replyEn = `All set! Prepared a ${mins}-minute focus session for you. Tap below to begin.`;

    return {
      handled: true,
      reply: isBn ? replyBn : replyEn,
      actions: act ? [act] : [],
      intent: 'FOCUS_SESSION',
      orbEmotion: 'focused',
      navigationRoute: 'focus',
    };
  }

  // Case 3: Waiting for roadmap level
  if (current.flowType === 'roadmap_missing_level') {
    const lvlText = userText.toLowerCase();
    let level = 'beginner';
    if (lvlText.includes('inter') || lvlText.includes('মাঝারি') || lvlText.includes('intermediate')) {
      level = 'intermediate';
    } else if (lvlText.includes('adv') || lvlText.includes('উন্নত') || lvlText.includes('advanced')) {
      level = 'advanced';
    }

    current.data.targetLevel = level;
    clearActiveFlow();
    // Flow handled: signals to proceed to Gemini with targetLevel populated
    return {
      handled: true,
      reply: isBn ? `বুঝেছি, ${level} লেভেলের জন্য রোডম্যাপ তৈরি করছি...` : `Understood, building the roadmap for ${level} level...`,
      actions: [],
      intent: 'LEARNING_HUB',
      orbEmotion: 'focused',
      navigationRoute: 'learning',
    };
  }

  return null;
}
