import { Task, RoutineTemplate } from "../types";
import { localDb } from "./localDbService";
import { supabase } from "../lib/supabaseClient";

async function getActiveUserId(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || "guest";
  } catch {
    return "guest";
  }
}

export function getLocalDateString(d?: Date): string {
  const date = d || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayTasks(tasks: Task[]): Task[] {
  const today = getLocalDateString();
  return (tasks || []).filter((t) => {
    const taskDate = (t.targetDate || t.date || "").trim();
    return !taskDate || taskDate === today;
  });
}

export function generateDailyPlanSummary(tasks: Task[], lang?: string): { count: number; title: string; body: string } {
  const todayTasks = getTodayTasks(tasks);
  const pending = todayTasks.filter((t) => !t.completed && t.status !== "completed");
  const isBn = lang === "bn";

  if (pending.length === 0) {
    return {
      count: 0,
      title: isBn ? "আজকের দিনের শুভ সূচনা" : "Great Start to the Day",
      body: isBn
        ? "আজকের জন্য কোনো নির্ধারিত টাস্ক বাকি নেই। নিজের লক্ষ্য নির্ধারণ করুন এবং দারুণ একটি দিন কাটান!"
        : "No pending tasks planned for today. Set your goals and have an inspiring day!",
    };
  }

  return {
    count: pending.length,
    title: isBn ? "আজকের দৈনিক পরিকল্পনা" : "Your Daily Plan",
    body: isBn
      ? `আজ আপনার ${pending.length}টি গুরুত্বপূর্ণ টাস্ক রয়েছে। প্রস্তুত হন এবং ফোকাস রাখুন!`
      : `You have ${pending.length} tasks scheduled for today. Let's make today count!`,
  };
}

/**
 * Fetch all routine templates from local-first database
 */
export async function fetchRoutineTemplatesFromBackend(): Promise<RoutineTemplate[]> {
  try {
    const userId = await getActiveUserId();
    const templates = await localDb.getAllForUser<RoutineTemplate>("routine_templates", userId, false);
    return templates;
  } catch (err) {
    console.warn("[taskService] Error fetching local routine templates:", err);
    return [];
  }
}

/**
 * Save or update a routine template in local-first database
 */
export async function saveRoutineTemplateToBackend(template: Partial<RoutineTemplate>): Promise<RoutineTemplate | null> {
  try {
    const userId = await getActiveUserId();
    const id = template.id || `tpl_${template.weekday || "routine"}_${Date.now()}`;
    const payload: RoutineTemplate = {
      id,
      weekday: template.weekday || "saturday",
      title: template.title || "",
      tasks: Array.isArray(template.tasks) ? template.tasks : [],
      userId,
      updatedAt: new Date().toISOString(),
      createdAt: template.createdAt || new Date().toISOString(),
    } as any;

    await localDb.put("routine_templates", payload as any);
    return payload;
  } catch (err) {
    console.warn("[taskService] Exception saving local routine template:", err);
    return null;
  }
}

/**
 * Delete a routine template from local-first database
 */
export async function deleteRoutineTemplateFromBackend(id: string): Promise<boolean> {
  try {
    const userId = await getActiveUserId();
    await localDb.softDelete("routine_templates", userId, id);
    return true;
  } catch (err) {
    console.warn("[taskService] Exception deleting local routine template:", err);
    return false;
  }
}

/**
 * Synchronize task creation or upsert to local-first database
 */
export async function syncTaskToBackend(task: Partial<Task>): Promise<Task | null> {
  try {
    const userId = await getActiveUserId();
    const taskTitle = (task.title || task.name || "").trim();
    if (!taskTitle) return null;

    const taskId = task.id || Date.now();
    const fullTask: any = {
      ...task,
      id: taskId,
      title: taskTitle,
      name: taskTitle,
      userId,
      updatedAt: new Date().toISOString(),
    };

    await localDb.put("tasks", fullTask);
    return fullTask;
  } catch (err) {
    console.warn("[taskService] Exception saving local task:", err);
    return null;
  }
}

/**
 * Synchronize task updates (status, completed, title, etc.) in local-first database
 */
export async function updateTaskInBackend(id: number, updates: Partial<Task>): Promise<Task | null> {
  try {
    const userId = await getActiveUserId();
    const existing = await localDb.get<any>("tasks", userId, id);
    if (!existing) return null;

    const merged = {
      ...existing,
      ...updates,
      userId,
      updatedAt: new Date().toISOString(),
    };

    await localDb.put("tasks", merged);
    return merged;
  } catch (err) {
    console.warn("[taskService] Exception updating local task:", err);
    return null;
  }
}

/**
 * Synchronize task deletion in local-first database
 */
export async function deleteTaskFromBackend(id: number | string): Promise<boolean> {
  try {
    const userId = await getActiveUserId();
    await localDb.softDelete("tasks", userId, id);
    return true;
  } catch (err) {
    console.warn("[taskService] Exception deleting local task:", err);
    return false;
  }
}

/**
 * Fetch tasks from local-first database with optional date filter
 */
export async function fetchTasksFromBackend(date?: string): Promise<Task[]> {
  try {
    const userId = await getActiveUserId();
    const tasks = await localDb.getAllForUser<Task>("tasks", userId, false);
    if (date) {
      return tasks.filter((t) => t.targetDate === date || t.date === date);
    }
    return tasks;
  } catch (err) {
    console.warn("[taskService] Exception fetching local tasks:", err);
    return [];
  }
}

/**
 * Toggle task completion in local-first database
 */
export async function toggleTaskCompletionInBackend(id: number, completed: boolean): Promise<Task | null> {
  return updateTaskInBackend(id, {
    completed,
    status: completed ? "completed" : "not_started",
  });
}
