/**
 * FocusForge AI - Prompt Helpers & System Instructions
 * Engineered strictly for FocusForge (Personal Focus & Productivity Intelligence)
 */

import { Task } from '@/types';

// ==================== Official FocusForge AI System Prompt ====================

export const FOCUSFORGE_AI_SYSTEM_PROMPT = `You are FocusForge AI, a specialized Personal Focus & Productivity Intelligence engine built strictly for the FocusForge app.

### CORE PURPOSE
Your sole purpose is to help the user manage their tasks, daily schedules, focus sessions, and productivity planning. You operate strictly as a context-aware productivity assistant and focus coach.

### STRICT SECURITY & PRIVACY BOUNDARIES
1. ABSOLUTE DATA ISOLATION:
   - You NEVER have direct access to any database, raw SQL execution, system files, or administrative commands.
   - You MUST ONLY rely on the structured context JSON explicitly provided to you in the user request.
   - You MUST NEVER attempt to guess, request, log, or reveal sensitive user credentials, including passwords, email addresses, authentication tokens, payment details, or Supabase keys.

2. LEAST PRIVILEGE OPERATIONAL SCOPE:
   - You CANNOT delete tasks, routines, or database entries autonomously.
   - You CANNOT perform system configuration, code execution, or external network calls.
   - If a user asks you to perform an action outside of productivity management (e.g., system troubleshooting, code execution, personal security changes, or internet browsing), politely decline and state your limitations.

3. STRUCTURED ACTION INTENT:
   - When suggesting new tasks or schedule entries, return them as structured JSON proposals so the application's secure backend validation layer can inspect, verify, and execute them safely with user consent.

---

### PERMITTED CAPABILITIES & FEATURE STACK
You are ONLY authorized to execute the following productivity operations:

1. ASK FOCUSFORGE: Answer user queries about their workload based ONLY on today's tasks, deadlines, priorities, and available focus time.
2. SMART TASK BREAKDOWN: Deconstruct complex user goals into actionable, bite-sized sub-tasks.
3. AI DAILY PLANNER: Generate realistic time-blocked daily schedules adhering strictly to user focus session limits and preferred study hours.
4. "WHAT SHOULD I DO NOW?": Recommend the single highest-priority task to tackle right now based on deadlines, time constraints, and overdue status.
5. OVERLOAD DETECTION: Warn the user when total estimated task duration exceeds their available hours, and suggest deferring non-urgent items.
6. FOCUS COACHING & BREAK SUGGESTIONS: Provide brief encouragement, focus tips, and suggest structured Pomodoro breaks based on recent session history.
7. NATURAL LANGUAGE TASK PARSING: Extract task title, priority, estimated time, and due date from unstructured user input.

---

### RESPONSE RULES & BEHAVIOR
- Direct & Concise: Provide actionable, fluff-free advice immediately.
- Context-Grounded: Never make assumptions about tasks or routines that are not present in the provided context.
- Realistic Scheduling: Never schedule more tasks than the user's available time. Always allocate reasonable breaks.
- Tone: Professional, encouraging, clear, and structured.`;

// ==================== Context & Input Interfaces ====================

export interface TaskInput {
  id?: number | string;
  name?: string;
  title?: string;
  description?: string;
  targetDate?: string;
  date?: string;
  time?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
  estHours?: number;
  estMinutes?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | string;
  category?: string;
  tier?: 'now' | 'next' | 'later' | string;
  notes?: string;
}

export interface UserFocusContext {
  currentTime?: string;
  timezone?: string;
  energyLevel?: 'high' | 'medium' | 'low';
  availableMinutes?: number;
  focusMode?: 'deep_work' | 'quick_wins' | 'planning' | 'learning';
  dailyBig3?: string[];
  tasks?: (TaskInput | Task)[];
  focusHistory?: Array<{
    category?: string;
    durationMinutes?: number;
    completed?: boolean;
    startedAt?: string;
  }>;
  preferences?: {
    preferredStudyHours?: string;
    pomodoroSessionMinutes?: number;
    breakDurationMinutes?: number;
  };
}

export interface BreakdownOptions {
  subtaskCount?: number;
  targetDate?: string;
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  focusArea?: string;
}

export interface DailyPlannerOptions {
  date?: string;
  workStartTime?: string; // e.g. "09:00"
  workEndTime?: string;   // e.g. "18:00"
  includeBreaks?: boolean;
  breakDurationMinutes?: number;
  bufferMinutes?: number;
}

// ==================== Template Formatter ====================

/**
 * Formats the context and user request strictly according to the Context Evaluation Template.
 */
export function formatContextEvaluationPrompt(
  context: UserFocusContext,
  userMessage: string
): string {
  const currentTime = context.currentTime || new Date().toLocaleTimeString();
  const timezone =
    context.timezone ||
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : 'UTC');

  const tasksJson = JSON.stringify(
    (context.tasks || []).map((t) => ({
      id: t.id,
      title: 'title' in t && t.title ? t.title : 'name' in t ? t.name : 'Untitled Task',
      priority: t.priority || 'medium',
      targetDate: t.targetDate || ('date' in t ? t.date : undefined),
      time: t.time,
      estMinutes: (t.estHours || 0) * 60 + (t.estMinutes || 0),
      category: t.category || 'General',
      status: t.status || 'not_started',
      tier: t.tier || 'now',
    })),
    null,
    2
  );

  const focusHistoryJson = JSON.stringify(context.focusHistory || [], null, 2);
  const preferencesJson = JSON.stringify(
    {
      energyLevel: context.energyLevel || 'medium',
      availableMinutes: context.availableMinutes || 240,
      focusMode: context.focusMode || 'deep_work',
      dailyBig3: context.dailyBig3 || [],
      ...context.preferences,
    },
    null,
    2
  );

  return `[USER CONTEXT]
Current Time: ${currentTime}
Timezone: ${timezone}
Today's Tasks: ${tasksJson}
Focus History: ${focusHistoryJson}
Preferences: ${preferencesJson}

[USER REQUEST]
${userMessage}`;
}

// ==================== Specialized Task Prompts ====================

/**
 * 1. whatShouldIDo Prompt:
 * Picks the single best next action based on mock/current user tasks and energy context.
 */
export function whatShouldIDoPrompt(
  tasks: (TaskInput | Task)[],
  context?: UserFocusContext
): string {
  const fullContext: UserFocusContext = {
    ...context,
    tasks,
  };

  const userRequest = `Analyze my workload and recommend the SINGLE HIGHEST-PRIORITY task to tackle right now based on deadlines, time constraints, and overdue status.
Also provide a 2-minute immediate micro-step to beat procrastination and momentum tip.

Return ONLY a valid JSON object conforming to this structure:
{
  "selectedTaskId": number or string or null,
  "actionTitle": "Imperative task title",
  "category": "Task category",
  "estimatedMinutes": number,
  "reason": "1-2 punchy, motivational sentences explaining why this is the highest ROI action right now",
  "immediateNextStep": "A concrete 2-minute micro-step to start instantly",
  "momentumTip": "Brief psychological tip for deep focus"
}`;

  return formatContextEvaluationPrompt(fullContext, userRequest);
}

/**
 * 2. taskBreakdown Prompt:
 * Breaks down a large or complex goal into an ordered sequence of actionable subtasks.
 */
export function taskBreakdownPrompt(
  goal: string,
  options?: BreakdownOptions
): string {
  const targetCount = options?.subtaskCount || 4;
  const experience = options?.experienceLevel || 'intermediate';

  const userRequest = `Perform SMART TASK BREAKDOWN on this goal: "${goal}"
Deconstruct into ${targetCount} actionable, bite-sized subtasks (15-45 mins each) ordered sequentially.
Experience Level: ${experience}
${options?.targetDate ? `Target Date: ${options.targetDate}` : ''}

Return ONLY a valid JSON array conforming to this structure:
[
  {
    "order": 1,
    "title": "Action-oriented subtask title",
    "estimatedMinutes": 30,
    "priority": "high",
    "category": "Project",
    "notes": "Actionable guidance or definition of done"
  }
]`;

  return formatContextEvaluationPrompt({}, userRequest);
}

/**
 * 3. parseTask Prompt:
 * Extracts task title, priority, estimated time, and due date from unstructured user input.
 */
export function parseTaskPrompt(
  naturalInput: string,
  referenceDate?: string
): string {
  const refDate = referenceDate || new Date().toISOString().split('T')[0];

  const userRequest = `Perform NATURAL LANGUAGE TASK PARSING on this input:
"${naturalInput}"

Reference Date: ${refDate}

Extract:
1. "title": Clean concise task title stripped of date/time noise.
2. "deadline": Date in YYYY-MM-DD format (interpret relative terms), or null.
3. "time": "HH:MM" (24-hour format), or null.
4. "priority": "urgent" | "high" | "medium" | "low".
5. "estimatedMinutes": number (default 30 if unspecified).
6. "category": Best matching category ("Programming", "Study", "University", "Personal", "Health", "Project", "Business", "General").
7. "notes": Additional context, or null.

Return ONLY a valid JSON object conforming to this structure:
{
  "title": "Clean task title",
  "deadline": "YYYY-MM-DD" or null,
  "time": "HH:MM" or null,
  "priority": "urgent" | "high" | "medium" | "low",
  "estimatedMinutes": number,
  "category": "Category name",
  "notes": "Additional notes or null"
}`;

  return formatContextEvaluationPrompt({}, userRequest);
}

/**
 * 4. dailyPlanner Prompt:
 * Generates realistic time-blocked daily schedules adhering strictly to user focus session limits and preferred hours.
 */
export function dailyPlannerPrompt(
  tasks: (TaskInput | Task)[],
  options?: DailyPlannerOptions
): string {
  const startTime = options?.workStartTime || '09:00';
  const endTime = options?.workEndTime || '18:00';
  const planDate = options?.date || new Date().toISOString().split('T')[0];
  const includeBreaks = options?.includeBreaks ?? true;

  const fullContext: UserFocusContext = {
    tasks,
    preferences: {
      preferredStudyHours: `${startTime} - ${endTime}`,
      breakDurationMinutes: options?.breakDurationMinutes || 15,
    },
  };

  const userRequest = `Generate an AI DAILY PLANNER schedule for date ${planDate} from ${startTime} to ${endTime}.
Adhere strictly to:
1. Highest priority & deep focus tasks during peak hours.
2. Realistic scheduling: Never schedule more than available time.
3. ${includeBreaks ? 'Include restful 10-15 min breaks between intense sessions and midday lunch.' : 'Ensure realistic pacing.'}
4. Times must be non-overlapping in "HH:MM" 24-hour format.

Return ONLY a valid JSON array conforming to this structure:
[
  {
    "startTime": "09:00",
    "endTime": "10:30",
    "title": "Task title or Break name",
    "taskId": number or string or null,
    "category": "Programming" or "Break",
    "isBreak": false,
    "focusType": "deep_work" | "shallow_work" | "break" | "review",
    "notes": "Brief focus advice"
  }
]`;

  return formatContextEvaluationPrompt(fullContext, userRequest);
}

/**
 * 5. askFocusForge Prompt:
 * General conversational intelligence answering user queries about their workload,
 * overload detection, and focus coaching.
 */
export function askFocusForgePrompt(
  userQuery: string,
  context: UserFocusContext
): string {
  const userRequest = `${userQuery}

Guidelines:
- If workload exceeds available time, provide OVERLOAD DETECTION warning and suggest deferring non-urgent items.
- If asking for focus coaching or break suggestions, provide brief encouragement and structured Pomodoro advice.
- When proposing new tasks or routines, format them as structured JSON proposals.
- Keep response direct, actionable, and grounded in the provided context.`;

  return formatContextEvaluationPrompt(context, userRequest);
}
