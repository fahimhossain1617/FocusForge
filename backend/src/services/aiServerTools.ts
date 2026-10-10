/**
 * Focentia Secure Server-Side Application Tools
 * Phase 2 — Verified Application Capability Registry & Typed Tools (Backend)
 */

import {
  dbGetTasks,
  dbGetNotes,
  dbGetLearningData,
  dbGetDiaryTopics,
  dbGetFocusSessions,
  dbGetUserProfile,
} from './db';
import { validateProposedAction, VALID_NAVIGATION_ROUTES } from './aiActionValidator';

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  toolName: string;
}

/**
 * Redacts secrets, tokens, passwords from any text or object
 */
function sanitizeOutput(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    return data
      .replace(/(?:password|passwd|pwd|pass)\s*[:=]\s*[^\s,;]+/gi, '[REDACTED_CREDENTIAL]')
      .replace(/eyJ[a-zA-Z0-9_\-\.]{30,}/g, '[REDACTED_TOKEN]')
      .replace(/(?:AIzaSy|sk-[a-zA-Z0-9]{20,})[a-zA-Z0-9_\-]{15,}/g, '[REDACTED_KEY]');
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeOutput);
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      if (['password', 'token', 'secret', 'apiKey', 'access_token', 'refresh_token'].includes(key.toLowerCase())) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = sanitizeOutput(val);
      }
    }
    return cleaned;
  }
  return data;
}

// 1. search_planner_entries
export async function searchPlannerEntries(
  userId: string,
  args: { query?: string; startDate?: string; endDate?: string; status?: string }
): Promise<any[]> {
  if (!userId) return [];
  let tasks: any[] = [];
  try {
    tasks = (await dbGetTasks(userId, undefined, args.status)) || [];
  } catch {
    tasks = [];
  }
  let filtered = tasks;

  if (args.query) {
    const q = args.query.toLowerCase();
    filtered = filtered.filter(
      (t: any) =>
        t.title?.toLowerCase().includes(q) ||
        t.name?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q)
    );
  }

  if (args.startDate) {
    filtered = filtered.filter((t: any) => (t.targetDate || t.date || '') >= args.startDate!);
  }
  if (args.endDate) {
    filtered = filtered.filter((t: any) => (t.targetDate || t.date || '') <= args.endDate!);
  }

  return sanitizeOutput(
    filtered.slice(0, 50).map((t: any) => ({
      id: t.id,
      title: t.title || t.name,
      targetDate: t.targetDate || t.date,
      time: t.time || '10:00',
      endTime: t.endTime || '',
      priority: t.priority || 'medium',
      status: t.status || 'not_started',
      category: t.category || 'Study',
      tier: t.tier || 'now',
    }))
  );
}

// 2. get_planner_entries_for_date
export async function getPlannerEntriesForDate(
  userId: string,
  args: { date: string }
): Promise<{ date: string; taskCount: number; tasks: any[] }> {
  if (!userId || !args.date) {
    return { date: args.date || '', taskCount: 0, tasks: [] };
  }

  let tasks: any[] = [];
  try {
    tasks = (await dbGetTasks(userId, args.date)) || [];
  } catch {
    tasks = [];
  }

  const sanitizedTasks = tasks.map((t: any) => ({
    id: t.id,
    title: t.title || t.name,
    targetDate: t.targetDate || t.date,
    time: t.time || '10:00',
    endTime: t.endTime || '',
    priority: t.priority || 'medium',
    status: t.status || 'not_started',
    category: t.category || 'Study',
    estimatedMinutes: (t.estHours || 0) * 60 + (t.estMinutes || 0) || 30,
  }));

  return sanitizeOutput({
    date: args.date,
    taskCount: sanitizedTasks.length,
    tasks: sanitizedTasks,
  });
}

// 3. propose_planner_entries
export async function proposePlannerEntries(
  userId: string,
  args: { entries: Array<{ title: string; targetDate: string; time: string; estimatedMinutes?: number; priority?: string }> }
): Promise<{ valid: boolean; proposal: any; errors?: string[] }> {
  if (!userId) {
    return { valid: false, proposal: null, errors: ['User authentication required.'] };
  }

  if (!Array.isArray(args.entries) || args.entries.length === 0) {
    return { valid: false, proposal: null, errors: ['At least one planner entry is required.'] };
  }

  const validation = validateProposedAction({
    type: args.entries.length === 1 ? 'create_task' : 'create_tasks',
    parameters: args.entries.length === 1 ? args.entries[0] : { tasks: args.entries },
  });

  if (!validation.valid) {
    return { valid: false, proposal: null, errors: [validation.reason || 'Validation failed.'] };
  }

  return {
    valid: true,
    proposal: sanitizeOutput(validation.normalizedAction),
  };
}

// 4. get_time_log_topics
export async function getTimeLogTopics(
  userId: string,
  args?: { folderName?: string }
): Promise<{ folders: any[]; logs: any[] }> {
  if (!userId) return { folders: [], logs: [] };

  let folders: any[] = [];
  let logs: any[] = [];
  try {
    const data = await dbGetLearningData(userId);
    folders = data.folders || [];
    logs = data.logs || [];
  } catch {
    folders = [];
    logs = [];
  }

  if (args?.folderName) {
    const q = args.folderName.toLowerCase();
    folders = folders.filter((f: any) => f.name?.toLowerCase().includes(q));
    const matchingFolderIds = new Set(folders.map((f: any) => f.id));
    logs = logs.filter((l: any) => matchingFolderIds.has(l.folderId) || l.topics?.toLowerCase().includes(q));
  }

  return sanitizeOutput({
    folders: folders.map((f: any) => ({
      id: f.id,
      name: f.name,
      completed: f.completed || false,
      createdAt: f.createdAt,
    })),
    logs: logs.slice(0, 50).map((l: any) => ({
      id: l.id,
      folderId: l.folderId,
      date: l.date,
      watchMinutes: l.watchMinutes || 0,
      practiceMinutes: l.practiceMinutes || 0,
      topics: l.topics || '',
      practiceDetails: l.practiceDetails || '',
      blockers: l.blockers || '',
      importantTopics: l.importantTopics || '',
    })),
  });
}

// 5. search_notes_and_files
export async function searchNotesAndFiles(
  userId: string,
  args: { query: string; category?: string }
): Promise<any[]> {
  if (!userId) return [];
  let notes: any[] = [];
  try {
    notes = (await dbGetNotes(userId)) || [];
  } catch {
    notes = [];
  }
  const q = (args.query || '').toLowerCase();

  const filtered = notes.filter((n: any) => {
    const matchCategory = !args.category || n.category?.toLowerCase() === args.category.toLowerCase();
    if (!matchCategory) return false;
    if (!q) return true;

    const titleMatch = n.title?.toLowerCase().includes(q);
    const blockMatch = Array.isArray(n.blocks) && n.blocks.some((b: any) => b.content?.toLowerCase().includes(q));
    return titleMatch || blockMatch;
  });

  return sanitizeOutput(
    filtered.slice(0, 30).map((n: any) => ({
      id: n.id,
      title: n.title,
      category: n.category || 'General',
      blockCount: Array.isArray(n.blocks) ? n.blocks.length : 0,
      previewSnippet: Array.isArray(n.blocks) && n.blocks[0] ? n.blocks[0].content?.slice(0, 150) : '',
      updatedAt: n.updatedAt || n.createdAt,
    }))
  );
}

// 6. get_note_or_file_content
export async function getNoteOrFileContent(
  userId: string,
  args: { noteId?: number; title?: string }
): Promise<any | null> {
  if (!userId) return null;
  let notes: any[] = [];
  try {
    notes = (await dbGetNotes(userId)) || [];
  } catch {
    notes = [];
  }

  const found = notes.find((n: any) => {
    if (args.noteId !== undefined && n.id === args.noteId) return true;
    if (args.title && n.title?.toLowerCase() === args.title.toLowerCase()) return true;
    return false;
  });

  if (!found) return null;

  return sanitizeOutput({
    id: found.id,
    title: found.title,
    category: found.category || 'General',
    blocks: found.blocks || [],
    createdAt: found.createdAt,
    updatedAt: found.updatedAt,
  });
}

// 7. search_diary_entries
export async function searchDiaryEntries(
  userId: string,
  args: { query?: string; topicTitle?: string }
): Promise<any[]> {
  if (!userId) return [];
  let topics: any[] = [];
  try {
    topics = (await dbGetDiaryTopics(userId)) || [];
  } catch {
    topics = [];
  }
  const q = (args.query || '').toLowerCase();

  const results: any[] = [];
  for (const t of topics) {
    if (args.topicTitle && !t.title?.toLowerCase().includes(args.topicTitle.toLowerCase())) {
      continue;
    }

    const entries = Array.isArray(t.entries) ? t.entries : [];
    for (const entry of entries) {
      if (!q || entry.content?.toLowerCase().includes(q) || entry.title?.toLowerCase().includes(q)) {
        results.push({
          topicId: t.id,
          topicTitle: t.title,
          entryId: entry.id,
          entryTitle: entry.title || t.title,
          contentExcerpt: entry.content ? entry.content.slice(0, 200) : '',
          createdAt: entry.createdAt,
        });
      }
    }
  }

  return sanitizeOutput(results.slice(0, 30));
}

// 8. get_diary_entry
export async function getDiaryEntry(
  userId: string,
  args: { topicId?: string; entryId?: string; topicTitle?: string }
): Promise<any | null> {
  if (!userId) return null;
  let topics: any[] = [];
  try {
    topics = (await dbGetDiaryTopics(userId)) || [];
  } catch {
    topics = [];
  }

  for (const t of topics) {
    if (args.topicId && t.id === args.topicId) return sanitizeOutput(t);
    if (args.topicTitle && t.title?.toLowerCase() === args.topicTitle.toLowerCase()) return sanitizeOutput(t);
    if (args.entryId && Array.isArray(t.entries)) {
      const entry = t.entries.find((e: any) => e.id === args.entryId);
      if (entry) return sanitizeOutput({ topic: t.title, entry });
    }
  }

  return null;
}

// 9. get_performance_report
export async function getPerformanceReport(
  userId: string,
  args?: { timeframe?: 'daily' | 'weekly' | 'monthly' }
): Promise<any> {
  if (!userId) {
    return { focusMinutes: 0, completedTasks: 0, totalTasks: 0, learningMinutes: 0, productivityScore: 0 };
  }

  let tasks: any[] = [];
  let focusSessions: any[] = [];
  let learningData: any = { folders: [], logs: [] };
  let profile: any = null;

  try { tasks = (await dbGetTasks(userId)) || []; } catch {}
  try { focusSessions = (await dbGetFocusSessions(userId)) || []; } catch {}
  try { learningData = (await dbGetLearningData(userId)) || { folders: [], logs: [] }; } catch {}
  try { profile = (await dbGetUserProfile(userId)) || null; } catch {}

  const completedTasks = tasks.filter((t: any) => t.status === 'completed' || t.completed);
  const totalFocusMinutes = (focusSessions || []).reduce((acc: number, s: any) => acc + (s.durationMinutes || 0), 0);
  const totalLearningMinutes = (learningData.logs || []).reduce(
    (acc: number, l: any) => acc + (l.practiceMinutes || 0) + (l.watchMinutes || 0),
    0
  );

  return sanitizeOutput({
    timeframe: args?.timeframe || 'weekly',
    productivityScore: (profile as any)?.productivityScore || 75,
    streak: (profile as any)?.streak || 1,
    totalTasks: tasks.length,
    completedTasksCount: completedTasks.length,
    pendingTasksCount: tasks.length - completedTasks.length,
    totalFocusMinutes,
    totalFocusHours: Math.round((totalFocusMinutes / 60) * 10) / 10,
    totalLearningMinutes,
    totalLearningHours: Math.round((totalLearningMinutes / 60) * 10) / 10,
  });
}

// 10. get_available_app_destinations
export function getAvailableAppDestinations(): Record<string, { route: string; name: string; description: string }> {
  return {
    today: { route: 'today', name: "Today's Dashboard", description: 'Overview of Big 3, habits, streak and daily progress.' },
    planner: { route: 'planner', name: 'Planner & Daily Routine', description: 'Interactive time-slots, routine templates, and task lists.' },
    focus: { route: 'focus', name: 'Focus Session & Timer', description: 'Stopwatch count-up timer, deep work tracking, and distractions log.' },
    tasks: { route: 'tasks', name: 'Notes & Files', description: 'Block editor workspace with KaTeX, code blocks, and attachments.' },
    mind: { route: 'mind', name: 'Mind Space', description: 'Brain dump, Idea vault, and structured Problem solver.' },
    diary: { route: 'diary', name: 'My Diary', description: 'Topic-based personal journaling and emotional reflection.' },
    learning: { route: 'learning', name: 'Time Log & Learning Hub', description: 'Skill practice tracker, blockers, and important topics logs.' },
    profile: { route: 'profile', name: 'User Profile', description: 'Personal stats, productivity level, and streaks.' },
    settings: { route: 'settings', name: 'Application Settings', description: 'Theme customizations, E2EE key recovery, and preferences.' },
    notifications: { route: 'notifications', name: 'Notification Center', description: 'Push notification settings and routine alerts.' },
    privacy: { route: 'privacy', name: 'Privacy Policy', description: 'Focentia privacy commitments and local-first zero-knowledge data architecture.' },
    terms: { route: 'terms', name: 'Terms & Conditions', description: 'Focentia terms of service and user agreements.' },
  };
}

// 11. prepare_navigation
export function prepareNavigation(args: { route: string }): { valid: boolean; action: any; error?: string } {
  const rawKey = (args.route || '').replace(/^open_/, '').toLowerCase();
  const mappedRoute = VALID_NAVIGATION_ROUTES[rawKey];

  if (!mappedRoute) {
    return {
      valid: false,
      action: null,
      error: `Destination '${args.route}' is not a valid Focentia application destination.`,
    };
  }

  return {
    valid: true,
    action: {
      id: `nav_${Date.now()}`,
      type: `open_${mappedRoute}`,
      title: `Navigate to ${mappedRoute}`,
      parameters: { route: mappedRoute },
      confirmationRequired: false,
      navigationRoute: mappedRoute,
      status: 'ready',
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Universal Server-Side Tool Dispatcher
 */
export async function executeServerTool(
  toolName: string,
  args: any,
  userId: string
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'search_planner_entries':
        return { success: true, toolName, data: await searchPlannerEntries(userId, args || {}) };
      case 'get_planner_entries_for_date':
        return { success: true, toolName, data: await getPlannerEntriesForDate(userId, args || {}) };
      case 'propose_planner_entries':
        return { success: true, toolName, data: await proposePlannerEntries(userId, args || {}) };
      case 'get_time_log_topics':
        return { success: true, toolName, data: await getTimeLogTopics(userId, args) };
      case 'search_notes_and_files':
        return { success: true, toolName, data: await searchNotesAndFiles(userId, args || {}) };
      case 'get_note_or_file_content':
        return { success: true, toolName, data: await getNoteOrFileContent(userId, args || {}) };
      case 'search_diary_entries':
        return { success: true, toolName, data: await searchDiaryEntries(userId, args || {}) };
      case 'get_diary_entry':
        return { success: true, toolName, data: await getDiaryEntry(userId, args || {}) };
      case 'get_performance_report':
        return { success: true, toolName, data: await getPerformanceReport(userId, args) };
      case 'get_available_app_destinations':
        return { success: true, toolName, data: getAvailableAppDestinations() };
      case 'prepare_navigation':
        return { success: true, toolName, data: prepareNavigation(args || {}) };
      default:
        return { success: false, toolName, error: `Tool '${toolName}' not supported by Capability Registry.` };
    }
  } catch (err: any) {
    return { success: false, toolName, error: err.message || 'Tool execution error.' };
  }
}
