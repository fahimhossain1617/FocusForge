import { Task, RoutineTemplate } from "../types";
import { fetchBackend } from "../lib/apiClient";
import { supabase } from "../lib/supabaseClient";

/**
 * Fetch all routine templates from backend /api/tasks/templates with direct Supabase fallback
 */
export async function fetchRoutineTemplatesFromBackend(): Promise<RoutineTemplate[]> {
  try {
    const res = await fetchBackend<RoutineTemplate[]>('/api/tasks/templates');
    if (Array.isArray(res)) return res;
  } catch (err) {
    console.warn('[taskService] Failed to fetch routine templates from backend, trying direct Supabase:', err);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('routine_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (!error && Array.isArray(data)) {
        return data.map((r) => ({
          id: r.id,
          weekday: r.weekday,
          title: r.title || '',
          tasks: Array.isArray(r.tasks) ? r.tasks : [],
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
      }
    }
  } catch (sbErr) {
    console.warn('[taskService] Supabase direct routine templates fetch notice:', sbErr);
  }

  return [];
}

/**
 * Save or update a routine template in backend /api/tasks/templates with direct Supabase fallback
 */
export async function saveRoutineTemplateToBackend(template: Partial<RoutineTemplate>): Promise<RoutineTemplate | null> {
  try {
    const res = await fetchBackend<RoutineTemplate>('/api/tasks/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
    if (res && res.weekday) return res;
  } catch (err) {
    console.warn('[taskService] Failed to save routine template via API, trying direct Supabase:', err);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && template.weekday) {
      const payload = {
        id: template.id || `tpl_${template.weekday}_${Date.now()}`,
        user_id: user.id,
        weekday: template.weekday.toLowerCase(),
        title: (template.title || '').trim(),
        tasks: Array.isArray(template.tasks) ? template.tasks : [],
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('routine_templates')
        .upsert(payload, { onConflict: 'user_id,weekday' })
        .select()
        .single();
      if (!error && data) {
        return {
          id: data.id,
          weekday: data.weekday,
          title: data.title || '',
          tasks: Array.isArray(data.tasks) ? data.tasks : [],
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };
      }
    }
  } catch (sbErr) {
    console.warn('[taskService] Supabase direct routine template save notice:', sbErr);
  }

  return null;
}

/**
 * Delete a routine template from backend /api/tasks/templates/:id with direct Supabase fallback
 */
export async function deleteRoutineTemplateFromBackend(id: string): Promise<boolean> {
  try {
    await fetchBackend(`/api/tasks/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err) {
    console.warn('[taskService] Failed to delete routine template via API, trying direct Supabase:', err);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('routine_templates').delete().eq('id', id).eq('user_id', user.id);
      return true;
    }
  } catch (sbErr) {
    console.warn('[taskService] Supabase direct routine template delete notice:', sbErr);
  }

  return false;
}

/**
 * Synchronize task creation or upsert to backend /api/tasks with direct Supabase fallback
 */
export async function syncTaskToBackend(task: Partial<Task>): Promise<Task | null> {
  try {
    const res = await fetchBackend<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    if (res && (res.title || res.name)) return res;
  } catch (err) {
    console.warn('[taskService] Network offline / sync warning (trying direct Supabase):', err);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const taskTitle = (task.title || task.name || '').trim();
      if (taskTitle) {
        const payload: Record<string, any> = {
          user_id: user.id,
          name: taskTitle,
          title: taskTitle,
          description: task.description || task.notes || null,
          target_date: task.targetDate || task.date || null,
          time: task.time || null,
          end_time: task.endTime || null,
          priority: task.priority || 'medium',
          est_hours: Number(task.estHours) || 0,
          est_minutes: Number(task.estMinutes) || 0,
          status: task.status || 'not_started',
          completed: Boolean(task.completed),
          reminder_enabled: Boolean(task.reminderEnabled),
          reminder_time: task.reminderTime || null,
          category: task.category || null,
          notes: task.notes || null,
          tier: task.tier || 'now',
          source_type: task.sourceType || 'custom',
          source_routine_id: task.sourceRoutineId || null,
          source_routine_task_id: task.sourceRoutineTaskId || null,
          imported_at: task.importedAt || null,
          updated_at: new Date().toISOString(),
        };
        if (task.id && typeof task.id === 'number') payload.id = task.id;
        const { data, error } = await supabase.from('tasks').upsert(payload).select().single();
        if (!error && data) return data as any;
      }
    }
  } catch (sbErr) {
    console.warn('[taskService] Supabase direct task save notice:', sbErr);
  }

  return null;
}

/**
 * Synchronize task updates (status, completed, title, etc.) to backend /api/tasks/:id
 */
export async function updateTaskInBackend(id: number, updates: Partial<Task>): Promise<Task | null> {
  try {
    const res = await fetchBackend<Task>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (res) return res;
  } catch (err) {
    console.warn('[taskService] Network offline / update warning (trying direct Supabase):', err);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate;
      else if (updates.date !== undefined) dbUpdates.target_date = updates.date;
      if (updates.time !== undefined) dbUpdates.time = updates.time;
      if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      const { data, error } = await supabase.from('tasks').update(dbUpdates).eq('id', id).eq('user_id', user.id).select().single();
      if (!error && data) return data as any;
    }
  } catch (sbErr) {
    console.warn('[taskService] Supabase direct task update notice:', sbErr);
  }

  return null;
}

/**
 * Synchronize task deletion to backend /api/tasks/:id
 */
export async function deleteTaskFromBackend(id: number): Promise<boolean> {
  try {
    await fetchBackend(`/api/tasks/${id}`, {
      method: 'DELETE',
    });
    return true;
  } catch (err) {
    console.warn('[taskService] Failed to delete task via API, trying direct Supabase:', err);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id);
      return true;
    }
  } catch (sbErr) {
    console.warn('[taskService] Supabase direct task delete notice:', sbErr);
  }

  return false;
}

/**
 * Fetch tasks from backend /api/tasks with optional date filter
 */
export async function fetchTasksFromBackend(date?: string): Promise<Task[]> {
  try {
    const url = date ? `/api/tasks?date=${encodeURIComponent(date)}` : '/api/tasks';
    const tasks = await fetchBackend<Task[]>(url);
    if (Array.isArray(tasks)) return tasks;
  } catch (err) {
    console.warn('[taskService] Failed to fetch tasks from API, trying direct Supabase:', err);
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return data.map((row: any) => {
          const targetDateStr = row.target_date ? (row.target_date.includes('T') ? row.target_date.split('T')[0] : row.target_date) : '';
          return {
            id: row.id,
            name: row.name || row.title || '',
            title: row.title || row.name || '',
            description: row.description || '',
            targetDate: targetDateStr,
            date: targetDateStr,
            time: row.time || '',
            endTime: row.end_time || '',
            priority: row.priority || 'medium',
            estHours: row.est_hours || 0,
            estMinutes: row.est_minutes || 0,
            status: row.status || 'not_started',
            completed: row.completed ?? (row.status === 'completed'),
            reminderEnabled: row.reminder_enabled ?? false,
            reminderTime: row.reminder_time || '',
            category: row.category || '',
            notes: row.notes || '',
            tier: row.tier || 'now',
            sourceType: row.source_type || 'custom',
            sourceRoutineId: row.source_routine_id || undefined,
            sourceRoutineTaskId: row.source_routine_task_id || undefined,
            importedAt: row.imported_at || undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        });
      }
    }
  } catch (sbErr) {
    console.warn('[taskService] Supabase direct tasks fetch notice:', sbErr);
  }

  return [];
}

/**
 * Returns a date string formatted as YYYY-MM-DD using the user's LOCAL timezone.
 * Avoids any UTC offset / midnight drift bugs.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get all tasks scheduled for a specific date (YYYY-MM-DD).
 * Checks both `targetDate` and `date` properties.
 */
export function getTasksForDate(tasks: Task[], dateStr: string): Task[] {
  if (!tasks || !Array.isArray(tasks)) return [];
  return tasks.filter((t) => (t.targetDate === dateStr || t.date === dateStr));
}

/**
 * Get all tasks scheduled for today in the user's local timezone.
 */
export function getTodayTasks(tasks: Task[]): Task[] {
  const today = getLocalDateString();
  return getTasksForDate(tasks, today);
}

/**
 * Get incomplete tasks scheduled for today.
 */
export function getIncompleteTasksForToday(tasks: Task[]): Task[] {
  return getTodayTasks(tasks).filter(
    (t) => t.status !== "completed" && !t.completed
  );
}

/**
 * Priority order sorting helper.
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  const priorityRank: Record<string, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...tasks].sort((a, b) => {
    const rankA = priorityRank[a.priority] ?? 2;
    const rankB = priorityRank[b.priority] ?? 2;
    return rankA - rankB;
  });
}

/**
 * Get all tasks that have reminders enabled.
 */
export function getTasksWithReminders(tasks: Task[]): Task[] {
  if (!tasks || !Array.isArray(tasks)) return [];
  return tasks.filter((t) => t.reminderEnabled && Boolean(t.reminderTime));
}

export interface DailyPlanSummary {
  title: string;
  body: string;
  count: number;
}

/**
 * Dynamically generates the Daily Morning Plan notification content
 * strictly from the user's actual tasks for the current date.
 */
export function generateDailyPlanSummary(
  tasks: Task[],
  lang: "en" | "bn" = "en"
): DailyPlanSummary {
  const todayTasks = getIncompleteTasksForToday(tasks);
  const sorted = sortTasksByPriority(todayTasks);
  const totalCount = sorted.length;

  if (lang === "bn") {
    if (totalCount === 0) {
      return {
        title: "শুভ সকাল",
        body: "আজকের জন্য কোনো নির্ধারিত টাস্ক নেই। চমৎকার একটি দিন কাটুক!",
        count: 0,
      };
    }

    let taskLines: string[] = [];
    if (totalCount <= 5) {
      taskLines = sorted.map((t) => `• ${t.title || t.name}`);
      const body = [
        "আজকের জন্য আপনার পরিকল্পনা:",
        ...taskLines,
        "",
        `আজ আপনার ${totalCount}টি টাস্ক নির্ধারিত রয়েছে।`,
        "চলুন আজকের দিনটি প্রোডাক্টিভ করে তুলি!",
      ].join("\n");
      return { title: "শুভ সকাল", body, count: totalCount };
    } else {
      const topFive = sorted.slice(0, 5).map((t) => `• ${t.title || t.name}`);
      const remaining = totalCount - 5;
      const body = [
        "আজকের জন্য আপনার পরিকল্পনা:",
        ...topFive,
        `+ আরও ${remaining}টি টাস্ক`,
        "",
        `মোট: ${totalCount}টি টাস্ক।`,
        "চলুন আজকের দিনটি প্রোডাক্টিভ করে তুলি!",
      ].join("\n");
      return { title: "শুভ সকাল", body, count: totalCount };
    }
  }

  // English
  if (totalCount === 0) {
    return {
      title: "Good Morning",
      body: "You have no tasks scheduled for today. Have a peaceful, restful day or capture a new goal!",
      count: 0,
    };
  }

  if (totalCount <= 5) {
    const taskLines = sorted.map((t) => `• ${t.title || t.name}`);
    const body = [
      "Here is your plan for today:",
      ...taskLines,
      "",
      `You have ${totalCount} task${totalCount > 1 ? "s" : ""} planned today.`,
      "Let's make today productive!",
    ].join("\n");
    return { title: "Good Morning", body, count: totalCount };
  } else {
    const topFive = sorted.slice(0, 5).map((t) => `• ${t.title || t.name}`);
    const remaining = totalCount - 5;
    const body = [
      "Here is your plan for today:",
      ...topFive,
      `+ ${remaining} more task${remaining > 1 ? "s" : ""}`,
      "",
      `Total: ${totalCount} tasks planned today.`,
      "Let's make today productive!",
    ].join("\n");
    return { title: "Good Morning", body, count: totalCount };
  }
}
