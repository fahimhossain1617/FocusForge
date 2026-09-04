/**
 * FocusForge AI - Action Validator & Permissions Layer
 * Ensures AI agents can only perform allowed actions and sanitizes their inputs.
 */

import DOMPurify from 'dompurify';

export type AIActionName = 'create_task' | 'update_task' | 'complete_task' | 'get_tasks';

export interface ValidatedAction {
  name: AIActionName;
  args: Record<string, any>;
  isAllowed: boolean;
  reason?: string;
}

/**
 * Strips HTML and trims input to prevent XSS and malformed data.
 */
function sanitizeString(input: any): string | undefined {
  if (typeof input !== 'string') return undefined;
  // If running in browser, use DOMPurify, otherwise basic strip
  if (typeof window !== 'undefined' && typeof DOMPurify !== 'undefined' && DOMPurify.sanitize) {
    return DOMPurify.sanitize(input.trim(), { ALLOWED_TAGS: [] });
  }
  return input.replace(/<[^>]*>?/gm, '').trim();
}

/**
 * Validates and sanitizes arguments for create_task
 */
function validateCreateTask(args: any): ValidatedAction {
  const title = sanitizeString(args.title);
  if (!title) {
    return { name: 'create_task', args: {}, isAllowed: false, reason: 'Task title is required.' };
  }

  const sanitizedArgs = {
    title,
    priority: ['low', 'medium', 'high', 'urgent'].includes(args.priority) ? args.priority : 'medium',
    category: sanitizeString(args.category) || 'General',
    estimatedMinutes: typeof args.estimatedMinutes === 'number' ? Math.max(0, args.estimatedMinutes) : 30,
    targetDate: sanitizeString(args.targetDate) || new Date().toISOString().split('T')[0],
    notes: sanitizeString(args.notes) || '',
  };

  return { name: 'create_task', args: sanitizedArgs, isAllowed: true };
}

/**
 * Validates and sanitizes arguments for update_task
 */
function validateUpdateTask(args: any): ValidatedAction {
  if (typeof args.id !== 'number' && typeof args.id !== 'string') {
    return { name: 'update_task', args: {}, isAllowed: false, reason: 'Task ID is required for update.' };
  }

  const sanitizedArgs: Record<string, any> = { id: args.id };
  
  if (args.title) sanitizedArgs.title = sanitizeString(args.title);
  if (args.priority && ['low', 'medium', 'high', 'urgent'].includes(args.priority)) {
    sanitizedArgs.priority = args.priority;
  }
  if (args.category) sanitizedArgs.category = sanitizeString(args.category);
  if (typeof args.estimatedMinutes === 'number') {
    sanitizedArgs.estimatedMinutes = Math.max(0, args.estimatedMinutes);
  }
  if (args.targetDate) sanitizedArgs.targetDate = sanitizeString(args.targetDate);
  if (args.notes) sanitizedArgs.notes = sanitizeString(args.notes);

  return { name: 'update_task', args: sanitizedArgs, isAllowed: true };
}

/**
 * Validates arguments for complete_task
 */
function validateCompleteTask(args: any): ValidatedAction {
  if (typeof args.id !== 'number' && typeof args.id !== 'string') {
    return { name: 'complete_task', args: {}, isAllowed: false, reason: 'Task ID is required for completion.' };
  }
  return { name: 'complete_task', args: { id: args.id }, isAllowed: true };
}

/**
 * Validates arguments for get_tasks
 */
function validateGetTasks(args: any): ValidatedAction {
  const sanitizedArgs: Record<string, any> = {};
  if (args.status) sanitizedArgs.status = sanitizeString(args.status);
  if (args.date) sanitizedArgs.date = sanitizeString(args.date);
  
  return { name: 'get_tasks', args: sanitizedArgs, isAllowed: true };
}

/**
 * Main entry point for validating and sanitizing AI requested actions.
 */
export function validateAndSanitizeAction(name: string, args: any): ValidatedAction {
  // Hard refusal for any unpermitted actions
  if (['delete_task', 'execute_query', 'drop_table'].includes(name)) {
    console.warn(`[SECURITY WARNING] AI attempted unauthorized action: ${name}`);
    return { 
      name: name as AIActionName, 
      args: {}, 
      isAllowed: false, 
      reason: `SECURITY DENIAL: Action '${name}' is strictly forbidden.` 
    };
  }

  switch (name) {
    case 'create_task':
      return validateCreateTask(args);
    case 'update_task':
      return validateUpdateTask(args);
    case 'complete_task':
      return validateCompleteTask(args);
    case 'get_tasks':
      return validateGetTasks(args);
    default:
      return { 
        name: name as AIActionName, 
        args: {}, 
        isAllowed: false, 
        reason: `Action '${name}' is not recognized or permitted.` 
      };
  }
}

/**
 * The permitted tools schemas to feed into the Gemini SDK
 */
export const focusForgeAITools = [
  {
    functionDeclarations: [
      {
        name: 'create_task',
        description: 'Creates a new task in the user workspace. Always use this to add tasks when the user requests it.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'The title or name of the task' },
            priority: { type: 'STRING', description: 'Priority: urgent, high, medium, low' },
            category: { type: 'STRING', description: 'Category (e.g. Programming, Study, Personal)' },
            estimatedMinutes: { type: 'INTEGER', description: 'Estimated time to complete in minutes' },
            targetDate: { type: 'STRING', description: 'Due date in YYYY-MM-DD format' },
            notes: { type: 'STRING', description: 'Additional details or context' },
          },
          required: ['title'],
        },
      },
      {
        name: 'update_task',
        description: 'Updates an existing task. Use this when the user asks to modify a task.',
        parameters: {
          type: 'OBJECT',
          properties: {
            id: { type: 'NUMBER', description: 'The unique ID of the task to update' },
            title: { type: 'STRING' },
            priority: { type: 'STRING' },
            category: { type: 'STRING' },
            estimatedMinutes: { type: 'INTEGER' },
            targetDate: { type: 'STRING' },
            notes: { type: 'STRING' },
          },
          required: ['id'],
        },
      },
      {
        name: 'complete_task',
        description: 'Marks a task as completed.',
        parameters: {
          type: 'OBJECT',
          properties: {
            id: { type: 'NUMBER', description: 'The unique ID of the task to complete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_tasks',
        description: 'Retrieves a list of tasks for the user. Used to analyze workload.',
        parameters: {
          type: 'OBJECT',
          properties: {
            status: { type: 'STRING', description: 'Filter by status (e.g., not_started, completed)' },
            date: { type: 'STRING', description: 'Filter by date (YYYY-MM-DD)' },
          },
        },
      }
    ]
  }
];
