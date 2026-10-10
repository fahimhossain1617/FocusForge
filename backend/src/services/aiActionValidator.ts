/**
 * Focentia Application Capability Registry & Server-Side Action Validator
 * Phase 2 — Secure Application Tools & Validation Gateway
 */

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
  reason?: string;
  normalizedAction?: any;
}

export const VALID_NAVIGATION_ROUTES: Record<string, string> = {
  today: 'today',
  dashboard: 'today',
  planner: 'planner',
  focus: 'focus',
  tasks: 'tasks',
  notes: 'tasks',
  workspace: 'tasks',
  mind: 'mind',
  diary: 'diary',
  learning: 'learning',
  skill: 'learning',
  timelog: 'learning',
  time_log: 'learning',
  timelogs: 'learning',
  profile: 'profile',
  settings: 'settings',
  notifications: 'notifications',
  privacy: 'privacy',
  terms: 'terms',
};

const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=/gi,
  /SELECT\s+.*FROM/gi,
  /DROP\s+TABLE/gi,
  /INSERT\s+INTO/gi,
  /UPDATE\s+.*SET/gi,
  /DELETE\s+FROM/gi,
  /UNION\s+ALL\s+SELECT/gi,
  /\beval\s*\(/gi,
];

function sanitizeString(str: any): string {
  if (typeof str !== 'string') return '';
  return str.trim();
}

function containsDangerousPayload(value: any): boolean {
  if (!value) return false;
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(str));
}

export function computeHmacSignature(str: string): string {
  try {
    const crypto = require('crypto');
    return crypto.createHmac('sha256', 'focentia_action_integrity_token_2026').update(str).digest('hex').slice(0, 32);
  } catch {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}

export function generateProposalSignature(actionType: string, parameters: any, timestamp: number): string {
  return computeHmacSignature(`${actionType}:${JSON.stringify(parameters || {})}:${timestamp}`);
}

export function verifyProposalIntegrity(action: any): { valid: boolean; reason?: string } {
  if (!action || typeof action !== 'object') {
    return { valid: false, reason: 'Action object is required.' };
  }
  if (!action.confirmationRequired) {
    return { valid: true };
  }
  if (!action.confirmationToken || !action.createdAtTimestamp) {
    return { valid: false, reason: 'Missing cryptographic confirmation token.' };
  }
  const now = Date.now();
  if (now - action.createdAtTimestamp > 900_000 || action.createdAtTimestamp > now + 60_000) {
    return { valid: false, reason: 'Proposal has expired (15-minute limit). Please request a new confirmation.' };
  }
  const expectedToken = generateProposalSignature(action.type, action.parameters, action.createdAtTimestamp);
  if (action.confirmationToken !== expectedToken) {
    return { valid: false, reason: 'Action parameters have been tampered with or modified. Previous confirmation invalidated.' };
  }
  return { valid: true };
}

function attachSecurityMetadata(normalizedAction: any): any {
  if (!normalizedAction) return normalizedAction;
  const timestamp = Date.now();
  normalizedAction.createdAtTimestamp = timestamp;
  if (normalizedAction.confirmationRequired) {
    normalizedAction.confirmationToken = generateProposalSignature(
      normalizedAction.type,
      normalizedAction.parameters,
      timestamp
    );
    normalizedAction.expiresAt = new Date(timestamp + 900_000).toISOString();
  }
  return normalizedAction;
}

export function validateProposedAction(action: any): ValidationResult {
  const result = validateProposedActionInternal(action);
  if (result.valid && result.normalizedAction) {
    result.normalizedAction = attachSecurityMetadata(result.normalizedAction);
  }
  return result;
}

function validateProposedActionInternal(action: any): ValidationResult {
  if (!action || typeof action !== 'object') {
    return { valid: false, missingFields: [], reason: 'Action object is required.' };
  }

  // Security Rule: Emotion/visual states are presentation metadata ONLY and must NEVER influence security decisions
  const type = action.type;
  const rawParams = action.parameters || action.args || {};
  
  // Strip any malicious or pseudo-authorization keys from parameters
  const parameters: Record<string, any> = {};
  if (typeof rawParams === 'object' && rawParams !== null) {
    for (const [k, v] of Object.entries(rawParams)) {
      if (!['bypassAuth', 'overrideSecurity', 'isAdmin', 'isPrivileged', 'role', 'securityOverride', 'forceExecute'].includes(k)) {
        parameters[k] = v;
      }
    }
  }

  if (containsDangerousPayload(parameters)) {
    return { valid: false, missingFields: [], reason: 'Dangerous code or SQL patterns detected in action parameters.' };
  }

  // 1. NAVIGATION ACTIONS (Read-only, no confirmation needed)
  if (type && type.startsWith('open_')) {
    const routeKey = type.replace(/^open_/, '').toLowerCase();
    const mappedRoute = VALID_NAVIGATION_ROUTES[routeKey] || (type === 'open_skill_builder' ? 'learning' : null);
    if (!mappedRoute) {
      return { valid: false, missingFields: [], reason: `Unrecognized navigation destination: ${type}` };
    }

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `nav_${Date.now()}`,
        type,
        title: action.title || `Navigate to ${mappedRoute}`,
        parameters: { route: mappedRoute },
        confirmationRequired: false,
        status: 'ready',
        createdAt: new Date().toISOString(),
        navigationRoute: mappedRoute,
      },
    };
  }

  // 2. PLANNER: Single Task
  if (type === 'create_task' || type === 'create_planner_task') {
    const title = sanitizeString(parameters.title || parameters.name);
    const targetDate = sanitizeString(parameters.targetDate || parameters.date);
    const time = sanitizeString(parameters.time);

    const missingFields: string[] = [];
    if (!title) missingFields.push('title');
    if (!targetDate) missingFields.push('targetDate');
    if (!time) missingFields.push('time');

    if (missingFields.length > 0) {
      return { valid: false, missingFields, reason: `Missing mandatory task fields: ${missingFields.join(', ')}` };
    }

    // Validate ISO Date YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || isNaN(Date.parse(targetDate))) {
      return { valid: false, missingFields: ['targetDate'], reason: 'Invalid targetDate format. Expected YYYY-MM-DD.' };
    }

    // Validate Time HH:MM
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return { valid: false, missingFields: ['time'], reason: 'Invalid time format. Expected HH:MM (24-hour).' };
    }

    const totalMins = Number(parameters.estimatedMinutes) || 30;
    const priority = ['low', 'medium', 'high', 'urgent'].includes(parameters.priority) ? parameters.priority : 'medium';

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'create_task',
        title: action.title || `টাস্ক যোগ: ${title}`,
        parameters: {
          title,
          targetDate,
          time,
          estimatedMinutes: Math.min(Math.max(totalMins, 5), 480),
          priority,
          category: sanitizeString(parameters.category) || 'Study',
          notes: sanitizeString(parameters.notes) || '',
        },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 3. PLANNER: Batch Tasks
  if (type === 'create_tasks' || type === 'create_multiple_tasks') {
    const rawTasks = Array.isArray(parameters.tasks) ? parameters.tasks : action.items;
    if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
      return { valid: false, missingFields: ['tasks'], reason: 'Array of tasks is required for batch task creation.' };
    }

    const validatedTasks: any[] = [];
    for (let i = 0; i < rawTasks.length; i++) {
      const t = rawTasks[i];
      const tTitle = sanitizeString(t.title || t.name);
      const tDate = sanitizeString(t.targetDate || t.date || parameters.targetDate);
      const tTime = sanitizeString(t.time || parameters.time || '10:00');

      if (!tTitle || !tDate) {
        return { valid: false, missingFields: [`tasks[${i}].title`, `tasks[${i}].targetDate`], reason: `Task at index ${i} is missing title or date.` };
      }

      validatedTasks.push({
        title: tTitle,
        targetDate: tDate,
        time: tTime,
        estimatedMinutes: Number(t.estimatedMinutes) || 30,
        priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority) ? t.priority : 'medium',
      });
    }

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'create_tasks',
        title: action.title || `${validatedTasks.length}টি টাস্ক যোগ করুন`,
        parameters: { tasks: validatedTasks },
        items: validatedTasks.map((t, idx) => ({ id: `item_${idx}`, ...t })),
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 4. FOCUS SESSION
  if (type === 'create_focus_session') {
    const mins = Number(parameters.durationMinutes) || 25;
    const goal = sanitizeString(parameters.goal || parameters.taskName || 'Deep Work Session');
    const mode = parameters.mode === 'pomodoro' ? 'pomodoro' : 'deep';

    if (mins <= 0 || mins > 300) {
      return { valid: false, missingFields: ['durationMinutes'], reason: 'Duration must be between 1 and 300 minutes.' };
    }

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'create_focus_session',
        title: action.title || `${mins} মিনিটের ফোকাস সেশন শুরু`,
        parameters: { durationMinutes: mins, goal, mode },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 5. NOTES & FILES
  if (type === 'create_note') {
    const title = sanitizeString(parameters.title);
    if (!title) {
      return { valid: false, missingFields: ['title'], reason: 'Note title is required.' };
    }

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'create_note',
        title: action.title || `নোট সংরক্ষণ: ${title}`,
        parameters: {
          title,
          content: sanitizeString(parameters.content) || '',
          category: sanitizeString(parameters.category) || 'AI Generated',
        },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 6. MY DIARY
  if (type === 'create_diary_entry') {
    const content = sanitizeString(parameters.content);
    if (!content) {
      return { valid: false, missingFields: ['content'], reason: 'Diary entry content cannot be empty.' };
    }

    const title = sanitizeString(parameters.title) || 'Today\'s Diary Entry';
    const topicTitle = sanitizeString(parameters.topicTitle) || 'General';
    const mood = ['reflective', 'happy', 'calm', 'motivated', 'neutral', 'sad', 'stressed'].includes(parameters.mood)
      ? parameters.mood
      : 'reflective';

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'create_diary_entry',
        title: action.title || `ডায়েরি এন্ট্রি: ${title}`,
        parameters: { title, content, mood, topicTitle },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 7. TIME LOG / LEARNING
  if (type === 'create_skill_roadmap' || type === 'create_skill' || type === 'create_learning_topic') {
    const folderName = sanitizeString(parameters.folderName || parameters.skillName || parameters.name);
    if (!folderName) {
      return { valid: false, missingFields: ['folderName'], reason: 'Skill or topic name is required.' };
    }

    const roadmapSteps = Array.isArray(parameters.roadmapSteps) ? parameters.roadmapSteps.map(sanitizeString).filter(Boolean) : [];

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'create_skill_roadmap',
        title: action.title || `স্কিল রোডম্যাপ: ${folderName}`,
        parameters: {
          folderName,
          targetHours: Number(parameters.targetHours) || 20,
          roadmapSteps,
        },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (type === 'log_activity') {
    const folderName = sanitizeString(parameters.folderName || parameters.topics);
    const practiceMinutes = Number(parameters.practiceMinutes) || Number(parameters.totalMinutes) || 0;

    if (!folderName || practiceMinutes <= 0) {
      return { valid: false, missingFields: ['topics', 'practiceMinutes'], reason: 'Topic name and valid practice duration are required.' };
    }

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'log_activity',
        title: action.title || `টাইম লগ যোগ: ${folderName} (${practiceMinutes} মিনিট)`,
        parameters: {
          folderName,
          practiceMinutes,
          watchMinutes: Number(parameters.watchMinutes) || 0,
          practiceDetails: sanitizeString(parameters.practiceDetails) || '',
          blockers: sanitizeString(parameters.blockers) || '',
          importantTopics: sanitizeString(parameters.importantTopics) || '',
        },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 8. MIND SPACE: Problem Solver & Idea
  if (type === 'create_problem_solver' || type === 'create_problem') {
    const problem = sanitizeString(parameters.problem);
    if (!problem) {
      return { valid: false, missingFields: ['problem'], reason: 'Problem statement is required.' };
    }

    const solutionSteps = Array.isArray(parameters.solutionSteps)
      ? parameters.solutionSteps.map(sanitizeString).filter(Boolean)
      : [];

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'create_problem_solver',
        title: action.title || `সমস্যা সমাধান: ${problem.slice(0, 30)}...`,
        parameters: { problem, solutionSteps },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (type === 'create_idea') {
    const idea = sanitizeString(parameters.idea);
    if (!idea) {
      return { valid: false, missingFields: ['idea'], reason: 'Idea content is required.' };
    }

    const keyPoints = Array.isArray(parameters.keyPoints)
      ? parameters.keyPoints.map(sanitizeString).filter(Boolean)
      : [];

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'create_idea',
        title: action.title || `আইডিয়া সংরক্ষণ: ${idea.slice(0, 30)}...`,
        parameters: {
          idea,
          keyPoints,
          nextAction: sanitizeString(parameters.nextAction) || '',
        },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 9. COMPLETE TASK
  if (type === 'complete_task') {
    const title = sanitizeString(parameters.title);
    const taskId = parameters.taskId || parameters.id;

    if (!title && !taskId) {
      return { valid: false, missingFields: ['title'], reason: 'Task title or ID is required to mark task complete.' };
    }

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'complete_task',
        title: action.title || `টাস্ক সম্পন্ন চিহ্নিত করুন: ${title || taskId}`,
        parameters: { taskId, title },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 10. DELETE TASK
  if (type === 'delete_task') {
    const taskId = parameters.taskId || parameters.id;
    const title = sanitizeString(parameters.title);

    if (!taskId && !title) {
      return { valid: false, missingFields: ['taskId'], reason: 'Task ID or title is required to delete a task.' };
    }

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'delete_task',
        title: action.title || `টাস্ক মুছে ফেলুন: ${title || taskId}`,
        parameters: { taskId, title },
        confirmationRequired: true,
        isDestructive: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 11. DELETE NOTE
  if (type === 'delete_note') {
    const noteId = parameters.noteId || parameters.id;
    const title = sanitizeString(parameters.title);

    if (!noteId && !title) {
      return { valid: false, missingFields: ['noteId'], reason: 'Note ID or title is required to delete a note.' };
    }

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'delete_note',
        title: action.title || `নোট মুছে ফেলুন: ${title || noteId}`,
        parameters: { noteId, title },
        confirmationRequired: true,
        isDestructive: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  // 12. UPDATE TASK
  if (type === 'update_task') {
    const taskId = parameters.taskId || parameters.id;
    const title = sanitizeString(parameters.title);

    if (!taskId && !title) {
      return { valid: false, missingFields: ['taskId'], reason: 'Task ID or title is required to update a task.' };
    }

    return {
      valid: true,
      missingFields: [],
      normalizedAction: {
        id: action.id || `act_${Date.now()}`,
        type: 'update_task',
        title: action.title || `টাস্ক আপডেট: ${title || taskId}`,
        parameters: { taskId, ...parameters },
        confirmationRequired: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    };
  }

  return {
    valid: false,
    missingFields: [],
    reason: `Unsupported action type: '${type}'. Action not recognized in Focentia Capability Registry.`,
  };
}
