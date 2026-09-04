import { Task } from "../types";

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
        title: "শুভ সকাল 👋",
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
        "চলুন আজকের দিনটি প্রোডাক্টিভ করে তুলি! 🚀",
      ].join("\n");
      return { title: "শুভ সকাল 👋", body, count: totalCount };
    } else {
      const topFive = sorted.slice(0, 5).map((t) => `• ${t.title || t.name}`);
      const remaining = totalCount - 5;
      const body = [
        "আজকের জন্য আপনার পরিকল্পনা:",
        ...topFive,
        `+ আরও ${remaining}টি টাস্ক`,
        "",
        `মোট: ${totalCount}টি টাস্ক।`,
        "চলুন আজকের দিনটি প্রোডাক্টিভ করে তুলি! 🚀",
      ].join("\n");
      return { title: "শুভ সকাল 👋", body, count: totalCount };
    }
  }

  // English
  if (totalCount === 0) {
    return {
      title: "Good Morning 👋",
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
      "Let's make today productive! 🚀",
    ].join("\n");
    return { title: "Good Morning 👋", body, count: totalCount };
  } else {
    const topFive = sorted.slice(0, 5).map((t) => `• ${t.title || t.name}`);
    const remaining = totalCount - 5;
    const body = [
      "Here is your plan for today:",
      ...topFive,
      `+ ${remaining} more task${remaining > 1 ? "s" : ""}`,
      "",
      `Total: ${totalCount} tasks planned today.`,
      "Let's make today productive! 🚀",
    ].join("\n");
    return { title: "Good Morning 👋", body, count: totalCount };
  }
}
