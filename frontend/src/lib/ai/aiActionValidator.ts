/**
 * FocusForge AI - Action Validator & Permissions Layer
 * Ensures AI agent proposals are strictly validated, sanitized,
 * authorized for user-facing modules, and require explicit confirmation
 * before mutating any user workspace state.
 *
 * ZERO DIRECT DATABASE ACCESS. Application acts as the sole authority.
 */

import DOMPurify from 'dompurify';
import type { ActionType, ActionRequest } from '@/types/aiAgent';
import { isDestructiveAction, requiresConfirmation } from './featureRegistry';

export interface ValidatedAction {
  name: ActionType;
  args: Record<string, any>;
  isAllowed: boolean;
  reason?: string;
  isDestructive: boolean;
  requiresConfirmation: boolean;
  navigationRoute?: string;
}

/**
 * Strips HTML, scripts, and trims input to prevent XSS and malformed data.
 */
function sanitizeString(input: any): string | undefined {
  if (typeof input !== 'string') return undefined;
  if (typeof window !== 'undefined' && typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
    return DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] });
  }
  return input.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Validates date string in YYYY-MM-DD format
 */
function sanitizeDate(dateStr: any): string {
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Validates time string in HH:MM format
 */
function sanitizeTime(timeStr: any, defaultHour = 9): string {
  if (typeof timeStr === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) {
    return timeStr;
  }
  return `${String(defaultHour).padStart(2, '0')}:00`;
}

export function validateAndSanitizeAction(name: string, rawArgs: any): ValidatedAction {
  // 1. HARD SECURITY DENIAL: Arbitrary database queries, credentials, internal tables
  const forbiddenPatterns = [
    'sql', 'query', 'drop', 'delete_user', 'truncate', 'select', 'supabase', 
    'auth', 'password', 'token', 'credential', 'secret', 'bypass', 'eval', 'exec'
  ];
  if (forbiddenPatterns.some(p => name.toLowerCase().includes(p) && !['delete_task', 'delete_note', 'delete_diary_entry'].includes(name))) {
    return {
      name: name as ActionType,
      args: {},
      isAllowed: false,
      reason: `SECURITY DENIAL: Action '${name}' is strictly unauthorized.`,
      isDestructive: true,
      requiresConfirmation: true,
    };
  }

  const args = rawArgs && typeof rawArgs === 'object' ? rawArgs : {};

  // 2. NAVIGATION ACTIONS
  if (name.startsWith('open_')) {
    const routeMap: Record<string, string> = {
      open_dashboard: 'today',
      open_focus: 'focus',
      open_timer: 'focus',
      open_planner: 'planner',
      open_tasks: 'tasks',
      open_notes: 'tasks',
      open_mind: 'mind',
      open_problem_solver: 'mind',
      open_idea_space: 'mind',
      open_diary: 'diary',
      open_learning: 'learning',
      open_settings: 'settings',
    };
    const route = routeMap[name] || 'today';
    return {
      name: name as ActionType,
      args: args,
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: false,
      navigationRoute: route,
    };
  }

  // 3. FOCUS TIMER
  if (name === 'create_focus_session') {
    const mins = typeof args.durationMinutes === 'number' 
      ? Math.min(240, Math.max(5, Math.round(args.durationMinutes))) 
      : 25;
    const goal = sanitizeString(args.goal) || 'Deep Work Session';
    const mode = args.mode === 'pomodoro' ? 'pomodoro' : 'deep';

    return {
      name: 'create_focus_session',
      args: { durationMinutes: mins, goal, mode },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'focus',
    };
  }

  // 4. PLANNER & TASKS
  if (name === 'create_task') {
    const title = sanitizeString(args.title);
    if (!title) {
      return { name: 'create_task', args: {}, isAllowed: false, reason: 'Task title is required.', isDestructive: false, requiresConfirmation: true };
    }
    const mins = typeof args.estimatedMinutes === 'number' ? Math.max(5, Math.min(720, Math.round(args.estimatedMinutes))) : 30;
    const targetDate = sanitizeDate(args.targetDate || args.date);
    const time = sanitizeTime(args.time);
    const priority = ['urgent', 'high', 'medium', 'low'].includes(args.priority) ? args.priority : 'medium';
    const category = sanitizeString(args.category) || 'Study';
    const notes = sanitizeString(args.notes) || '';

    return {
      name: 'create_task',
      args: { title, estimatedMinutes: mins, targetDate, time, priority, category, notes },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'planner',
    };
  }

  if (name === 'create_tasks') {
    const rawTasks = Array.isArray(args.tasks) ? args.tasks : [];
    if (rawTasks.length === 0) {
      return { name: 'create_tasks', args: {}, isAllowed: false, reason: 'At least one task required.', isDestructive: false, requiresConfirmation: true };
    }
    const sanitizedTasks = rawTasks.slice(0, 10).map((t: any, idx: number) => {
      const title = sanitizeString(t.title) || `Planned Task ${idx + 1}`;
      const mins = typeof t.estimatedMinutes === 'number' ? Math.max(5, Math.min(720, Math.round(t.estimatedMinutes))) : 30;
      const targetDate = sanitizeDate(t.targetDate || t.date);
      const time = sanitizeTime(t.time, 9 + idx * 2);
      const priority = ['urgent', 'high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium';
      return {
        id: `task_${Date.now()}_${idx}`,
        title,
        estimatedMinutes: mins,
        targetDate,
        time,
        priority,
        category: sanitizeString(t.category) || 'Study',
      };
    });

    return {
      name: 'create_tasks',
      args: { tasks: sanitizedTasks },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'planner',
    };
  }

  if (name === 'complete_task' || name === 'uncomplete_task') {
    if (typeof args.id !== 'number' && typeof args.id !== 'string') {
      return { name: name as ActionType, args: {}, isAllowed: false, reason: 'Task ID is required.', isDestructive: false, requiresConfirmation: true };
    }
    return {
      name: name as ActionType,
      args: { id: args.id, title: sanitizeString(args.title) },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'planner',
    };
  }

  if (name === 'update_task') {
    if (typeof args.id !== 'number' && typeof args.id !== 'string') {
      return { name: 'update_task', args: {}, isAllowed: false, reason: 'Task ID is required.', isDestructive: false, requiresConfirmation: true };
    }
    const sanitizedUpdates: Record<string, any> = { id: args.id };
    if (args.title) sanitizedUpdates.title = sanitizeString(args.title);
    if (args.priority && ['urgent', 'high', 'medium', 'low'].includes(args.priority)) sanitizedUpdates.priority = args.priority;
    if (args.estimatedMinutes) sanitizedUpdates.estimatedMinutes = Math.max(5, Math.min(720, Math.round(args.estimatedMinutes)));
    if (args.targetDate) sanitizedUpdates.targetDate = sanitizeDate(args.targetDate);
    if (args.time) sanitizedUpdates.time = sanitizeTime(args.time);

    return {
      name: 'update_task',
      args: sanitizedUpdates,
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'planner',
    };
  }

  if (name === 'delete_task') {
    if (typeof args.id !== 'number' && typeof args.id !== 'string') {
      return { name: 'delete_task', args: {}, isAllowed: false, reason: 'Task ID is required.', isDestructive: true, requiresConfirmation: true };
    }
    return {
      name: 'delete_task',
      args: { id: args.id, title: sanitizeString(args.title) },
      isAllowed: true,
      isDestructive: true,
      requiresConfirmation: true,
      navigationRoute: 'planner',
    };
  }

  // 5. NOTES & FILES
  if (name === 'create_note') {
    const title = sanitizeString(args.title) || 'New Study Note';
    const content = sanitizeString(args.content) || '';
    const category = sanitizeString(args.category) || 'General';

    return {
      name: 'create_note',
      args: { title, content, category },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'tasks',
    };
  }

  if (name === 'delete_note') {
    if (typeof args.id !== 'number' && typeof args.id !== 'string') {
      return { name: 'delete_note', args: {}, isAllowed: false, reason: 'Note ID is required.', isDestructive: true, requiresConfirmation: true };
    }
    return {
      name: 'delete_note',
      args: { id: args.id, title: sanitizeString(args.title) },
      isAllowed: true,
      isDestructive: true,
      requiresConfirmation: true,
      navigationRoute: 'tasks',
    };
  }

  // 6. MIND SPACE
  if (name === 'create_problem_solver') {
    const problem = sanitizeString(args.problem) || 'Problem Statement';
    const solutionSteps = Array.isArray(args.solutionSteps)
      ? args.solutionSteps.map((s: any) => sanitizeString(s)).filter(Boolean)
      : [];

    return {
      name: 'create_problem_solver',
      args: { problem, solutionSteps },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'mind',
    };
  }

  if (name === 'create_idea') {
    const idea = sanitizeString(args.idea) || 'New Idea';
    const keyPoints = Array.isArray(args.keyPoints)
      ? args.keyPoints.map((k: any) => sanitizeString(k)).filter(Boolean)
      : [];
    const nextAction = sanitizeString(args.nextAction) || '';

    return {
      name: 'create_idea',
      args: { idea, keyPoints, nextAction },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'mind',
    };
  }

  if (name === 'create_free_write') {
    const content = sanitizeString(args.content) || '';
    return {
      name: 'create_free_write',
      args: { content },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'mind',
    };
  }

  // 7. DIARY
  if (name === 'create_diary_entry' || name === 'create_diary_topic') {
    const title = sanitizeString(args.title) || 'Today\'s Reflection';
    const content = sanitizeString(args.content) || '';
    const mood = sanitizeString(args.mood) || 'reflective';
    const topicTitle = sanitizeString(args.topicTitle) || 'Personal Journal';

    return {
      name: name as ActionType,
      args: { title, content, mood, topicTitle },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'diary',
    };
  }

  if (name === 'delete_diary_entry') {
    if (!args.topicId && !args.id) {
      return { name: 'delete_diary_entry', args: {}, isAllowed: false, reason: 'Topic/Entry ID is required.', isDestructive: true, requiresConfirmation: true };
    }
    return {
      name: 'delete_diary_entry',
      args: { topicId: args.topicId || args.id, title: sanitizeString(args.title) },
      isAllowed: true,
      isDestructive: true,
      requiresConfirmation: true,
      navigationRoute: 'diary',
    };
  }

  // 8. SKILL BUILDER / TIME LOG
  if (name === 'create_skill_roadmap') {
    const folderName = sanitizeString(args.folderName || args.skillName) || 'New Subject';
    const targetHours = typeof args.targetHours === 'number' ? Math.max(1, Math.min(1000, args.targetHours)) : 20;
    const roadmapSteps = Array.isArray(args.roadmapSteps)
      ? args.roadmapSteps.map((s: any) => sanitizeString(s)).filter(Boolean)
      : [];

    return {
      name: 'create_skill_roadmap',
      args: { folderName, targetHours, roadmapSteps },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'learning',
    };
  }

  if (name === 'log_activity') {
    const category = sanitizeString(args.category) || 'Study';
    const hours = typeof args.hours === 'number' ? Math.max(0, args.hours) : 1;
    const minutes = typeof args.minutes === 'number' ? Math.max(0, Math.min(59, args.minutes)) : 0;
    const date = sanitizeDate(args.date);
    const notes = sanitizeString(args.notes) || '';

    return {
      name: 'log_activity',
      args: { category, hours, minutes, date, notes },
      isAllowed: true,
      isDestructive: false,
      requiresConfirmation: true,
      navigationRoute: 'learning',
    };
  }

  return {
    name: name as ActionType,
    args: {},
    isAllowed: false,
    reason: `Action '${name}' is not recognized in Focentia.`,
    isDestructive: false,
    requiresConfirmation: false,
  };
}

/**
 * Builds a structured, typed ActionRequest object for UI rendering
 */
export function buildActionRequest(
  type: ActionType,
  parameters: Record<string, any>,
  titleBn?: string,
  titleEn?: string
): ActionRequest | null {
  const validated = validateAndSanitizeAction(type, parameters);
  if (!validated.isAllowed) {
    console.warn('[ActionValidator] Refused action creation:', validated.reason);
    return null;
  }

  const id = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const title = titleBn || titleEn || validated.name.replace(/_/g, ' ');

  // For multi-action tasks
  let items = undefined;
  if (type === 'create_tasks' && Array.isArray(validated.args.tasks)) {
    items = validated.args.tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      subtitle: `${t.estimatedMinutes}m • ${t.time || ''} • ${t.priority || 'medium'}`,
      selected: true,
      payload: t,
    }));
  }

  return {
    id,
    type: validated.name,
    title,
    parameters: validated.args,
    confirmationRequired: validated.requiresConfirmation,
    isDestructive: validated.isDestructive,
    status: 'pending',
    createdAt: new Date().toISOString(),
    navigationRoute: validated.navigationRoute,
    items,
  };
}
