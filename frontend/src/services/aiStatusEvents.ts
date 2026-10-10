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
    labelBn: 'তোমার অনুরোধটি বুঝছি…',
    orbMood: 'thinking',
  },
  analyzing_goals: {
    event: 'analyzing_goals',
    labelEn: 'Reviewing your learning goals…',
    labelBn: 'শেখার লক্ষ্য ও অগ্রাধিকার পর্যালোচনা করছি…',
    orbMood: 'thinking',
  },
  generating_roadmap: {
    event: 'generating_roadmap',
    labelEn: 'Preparing your learning roadmap…',
    labelBn: 'তোমার লার্নিং রোডম্যাপ তৈরি করছি…',
    orbMood: 'working',
  },
  checking_schedule: {
    event: 'checking_schedule',
    labelEn: 'Checking your schedule & tasks…',
    labelBn: 'তোমার শিডিউল ও প্ল্যানার চেক করছি…',
    orbMood: 'working',
  },
  querying_records: {
    event: 'querying_records',
    labelEn: 'Retrieving your notes & records…',
    labelBn: 'তোমার সেভ করা রেকর্ড ও বিষয়গুলো দেখছি…',
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
    labelBn: 'পরিবর্তন সংরক্ষণ করছি…',
    orbMood: 'working',
  },
  navigating: {
    event: 'navigating',
    labelEn: 'Opening module…',
    labelBn: 'মডিউল খুলছি…',
    orbMood: 'working',
  },
  verifying: {
    event: 'verifying',
    labelEn: 'Verifying the result…',
    labelBn: 'ফলাফল যাচাই করছি…',
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
