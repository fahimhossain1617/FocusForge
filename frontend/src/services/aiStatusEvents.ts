/**
 * Focentia AI Status Events & Lifecycle Dispatcher
 * Phase 3 — Realistic Thinking & Working Status System
 */

export type AIStatusEvent =
  | 'idle'
  | 'understanding'
  | 'analyzing_goals'
  | 'generating_roadmap'
  | 'checking_schedule'
  | 'querying_records'
  | 'deep_research'
  | 'cross_referencing'
  | 'formulating_response'
  | 'synthesizing_solution'
  | 'finalizing_response'
  | 'waiting_confirmation'
  | 'executing_tool'
  | 'navigating'
  | 'verifying'
  | 'success'
  | 'error';

export interface AIStatusMessage {
  event: AIStatusEvent;
  labelEn: string;
  labelBn: string;
  orbMood: 'idle' | 'thinking' | 'working' | 'waiting_confirmation' | 'success' | 'concerned' | 'error';
}

export const AI_STATUS_DEFINITIONS: Record<AIStatusEvent, AIStatusMessage> = {
  idle: {
    event: 'idle',
    labelEn: 'Ready to help',
    labelBn: 'প্রস্তুত',
    orbMood: 'idle',
  },
  understanding: {
    event: 'understanding',
    labelEn: 'Understanding your request…',
    labelBn: 'তোমার কথাটা বুঝে নিচ্ছি…',
    orbMood: 'thinking',
  },
  analyzing_goals: {
    event: 'analyzing_goals',
    labelEn: 'Looking at your goals…',
    labelBn: 'তোমার লক্ষ্যগুলো দেখে নিচ্ছি…',
    orbMood: 'thinking',
  },
  generating_roadmap: {
    event: 'generating_roadmap',
    labelEn: 'Building your roadmap…',
    labelBn: 'সুন্দর একটি রোডম্যাপ সাজাচ্ছি…',
    orbMood: 'working',
  },
  checking_schedule: {
    event: 'checking_schedule',
    labelEn: 'Checking your schedule…',
    labelBn: 'তোমার রুটিন ও প্ল্যানার দেখছি…',
    orbMood: 'working',
  },
  querying_records: {
    event: 'querying_records',
    labelEn: 'Looking through your notes…',
    labelBn: 'তোমার নোট আর রেকর্ড খুঁজে দেখছি…',
    orbMood: 'working',
  },
  deep_research: {
    event: 'deep_research',
    labelEn: 'Thinking carefully…',
    labelBn: 'একটু ভেবে নিচ্ছি…',
    orbMood: 'thinking',
  },
  cross_referencing: {
    event: 'cross_referencing',
    labelEn: 'Organizing the details…',
    labelBn: 'প্রয়োজনীয় তথ্য গুছিয়ে নিচ্ছি…',
    orbMood: 'working',
  },
  formulating_response: {
    event: 'formulating_response',
    labelEn: 'Writing your answer…',
    labelBn: 'সহজভাবে উত্তরটি লিখছি…',
    orbMood: 'working',
  },
  synthesizing_solution: {
    event: 'synthesizing_solution',
    labelEn: 'Preparing your plan…',
    labelBn: 'সবকিছু সুন্দরভাবে গুছিয়ে নিচ্ছি…',
    orbMood: 'working',
  },
  finalizing_response: {
    event: 'finalizing_response',
    labelEn: 'Finishing up your response…',
    labelBn: 'লেখা প্রায় শেষ, গুছিয়ে নিচ্ছি…',
    orbMood: 'working',
  },
  waiting_confirmation: {
    event: 'waiting_confirmation',
    labelEn: 'Waiting for your confirmation…',
    labelBn: 'তোমার অনুমোদনের অপেক্ষায়…',
    orbMood: 'waiting_confirmation',
  },
  executing_tool: {
    event: 'executing_tool',
    labelEn: 'Saving your changes…',
    labelBn: 'পরিবর্তনগুলো সেভ করছি…',
    orbMood: 'working',
  },
  navigating: {
    event: 'navigating',
    labelEn: 'Opening this page…',
    labelBn: 'পেজটি খুলে দিচ্ছি…',
    orbMood: 'working',
  },
  verifying: {
    event: 'verifying',
    labelEn: 'Double-checking…',
    labelBn: 'একবার মিলিয়ে দেখছি…',
    orbMood: 'thinking',
  },
  success: {
    event: 'success',
    labelEn: 'Completed successfully',
    labelBn: 'সফলভাবে সম্পন্ন হয়েছে',
    orbMood: 'success',
  },
  error: {
    event: 'error',
    labelEn: 'Something went wrong',
    labelBn: 'একটি সমস্যা হয়েছে',
    orbMood: 'error',
  },
};

export function getStatusText(event: AIStatusEvent, isBn: boolean): string {
  const def = AI_STATUS_DEFINITIONS[event] || AI_STATUS_DEFINITIONS.idle;
  return isBn ? def.labelBn : def.labelEn;
}

export function detectContextualStatusEvent(userQuery: string): AIStatusEvent {
  const q = (userQuery || '').toLowerCase();

  if (
    q.includes('roadmap') ||
    q.includes('রোডম্যাপ') ||
    q.includes('শিখব') ||
    q.includes('how to learn') ||
    q.includes('path') ||
    q.includes('step by step')
  ) {
    return 'generating_roadmap';
  }

  if (
    q.includes('prioritize') ||
    q.includes('priority') ||
    q.includes('আগে কোনটা') ||
    q.includes('অগ্রাধিকার') ||
    q.includes('which should i learn')
  ) {
    return 'analyzing_goals';
  }

  if (
    q.includes('schedule') ||
    q.includes('planner') ||
    q.includes('routine') ||
    q.includes('প্ল্যানার') ||
    q.includes('রুটিন') ||
    q.includes('task')
  ) {
    return 'checking_schedule';
  }

  if (
    q.includes('note') ||
    q.includes('diary') ||
    q.includes('নোট') ||
    q.includes('ডায়েরি') ||
    q.includes('weak topic') ||
    q.includes('দুর্বল') ||
    q.includes('time log')
  ) {
    return 'querying_records';
  }

  return 'understanding';
}

export interface ProgressiveStage {
  delayMs: number;
  text: string;
  orbMood: 'thinking' | 'working';
}

export function getProgressiveStages(
  userQuery: string,
  modelMode: string = 'fast',
  isBn: boolean = true
): ProgressiveStage[] {
  const normMode = (modelMode || '').toLowerCase().trim();
  const isDeep = normMode === 'deep' || normMode === 'pro' || normMode === 'focentia-pro' || normMode === 'planning';
  const initialEvent = detectContextualStatusEvent(userQuery);
  const initialText = getStatusText(initialEvent, isBn);

  if (!isDeep) {
    // Focentia 2.1 — Fast, crisp, responsive
    return [
      { delayMs: 0, text: initialText, orbMood: 'thinking' },
      { delayMs: 700, text: isBn ? 'সহজভাবে উত্তরটি লিখছি…' : 'Writing your answer…', orbMood: 'working' },
    ];
  }

  // Focentia Pro — Deep analytical & structured research breakdown
  return [
    { delayMs: 0, text: isBn ? 'একটু ভেবে নিচ্ছি…' : 'Thinking carefully…', orbMood: 'thinking' },
    { delayMs: 1200, text: isBn ? 'প্রয়োজনীয় তথ্য গুছিয়ে নিচ্ছি…' : 'Organizing details…', orbMood: 'working' },
    { delayMs: 2800, text: isBn ? 'সবকিছু সুন্দরভাবে গুছিয়ে নিচ্ছি…' : 'Preparing your plan…', orbMood: 'working' },
    { delayMs: 4500, text: isBn ? 'লেখা প্রায় শেষ, গুছিয়ে নিচ্ছি…' : 'Finishing up your response…', orbMood: 'working' },
  ];
}
