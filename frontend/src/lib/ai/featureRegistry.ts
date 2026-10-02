/**
 * Focus Forge — Feature Registry
 * Central, production-grade map of all user-facing Focus Forge modules.
 * Used by the AI Agent to understand app capabilities, allowed tools,
 * routes, and confirmation policies without giving direct database access.
 */

import type { ActionType } from "@/types/aiAgent";

export interface FeatureDefinition {
  id: string;
  route: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  navigationAction: ActionType;
  allowedReadActions: string[];
  allowedWriteActions: ActionType[];
  destructiveActions: ActionType[];
  requiresConfirmationDefault: boolean;
}

export const FOCUS_FORGE_FEATURES: Record<string, FeatureDefinition> = {
  DASHBOARD: {
    id: "dashboard",
    route: "today",
    nameEn: "Dashboard",
    nameBn: "ড্যাশবোর্ড",
    descriptionEn: "Today's productivity overview, active tasks, stats, and daily progress.",
    descriptionBn: "আজকের কাজের সার্বিক চিত্র, চলমান কাজ, পরিসংখ্যান ও অগ্রগতি।",
    navigationAction: "open_dashboard",
    allowedReadActions: ["get_dashboard_summary", "get_today_progress"],
    allowedWriteActions: [],
    destructiveActions: [],
    requiresConfirmationDefault: false,
  },

  FOCUS: {
    id: "focus",
    route: "focus",
    nameEn: "Focus Timer",
    nameBn: "ফোকাস টাইমার",
    descriptionEn: "Pomodoro and deep work timer with ambient sounds, distraction tracking, and breaks.",
    descriptionBn: "পোমোডোরো ও ডিপ ওয়ার্ক টাইমার, সাউন্ড ও ডিস্ট্র্যাকশন ট্র্যাকিং।",
    navigationAction: "open_focus",
    allowedReadActions: ["get_current_focus_state"],
    allowedWriteActions: ["create_focus_session"],
    destructiveActions: [],
    requiresConfirmationDefault: true,
  },

  PLANNER: {
    id: "planner",
    route: "planner",
    nameEn: "Planner & Routine",
    nameBn: "প্ল্যানার ও রুটিন",
    descriptionEn: "Calendar-based daily schedule, time-blocking, task organization, and Big 3 priorities.",
    descriptionBn: "ক্যালেন্ডারভিত্তিক দৈনিক শিডিউল, টাইম-ব্লকিং এবং টাস্ক প্ল্যানিং।",
    navigationAction: "open_planner",
    allowedReadActions: ["get_today_tasks", "get_planner_schedule"],
    allowedWriteActions: [
      "create_task",
      "create_tasks",
      "update_task",
      "complete_task",
      "uncomplete_task",
      "copy_tasks_to_date"
    ],
    destructiveActions: ["delete_task"],
    requiresConfirmationDefault: true,
  },

  TASKS: {
    id: "tasks",
    route: "tasks",
    nameEn: "Notes & Files",
    nameBn: "নোটস ও ফাইলস",
    descriptionEn: "Rich-text notes, markdown documents, study guides, and workspace attachments.",
    descriptionBn: "স্টাডি নোটস, ডকুমেন্ট ও ফাইলস ম্যানেজমেন্ট।",
    navigationAction: "open_notes",
    allowedReadActions: ["get_notes_summary"],
    allowedWriteActions: ["create_note"],
    destructiveActions: ["delete_note"],
    requiresConfirmationDefault: true,
  },

  MIND_SPACE: {
    id: "mind",
    route: "mind",
    nameEn: "Mind Space",
    nameBn: "মাইন্ড স্পেস",
    descriptionEn: "Problem solver, creative idea capture, free write journaling, and thought capture.",
    descriptionBn: "সমস্যা সমাধান, আইডিয়া ক্যাপচার, ফ্রি রাইট ও ভাবনার উন্মুক্ত স্থান।",
    navigationAction: "open_mind",
    allowedReadActions: ["get_mind_items_summary"],
    allowedWriteActions: [
      "create_problem_solver",
      "create_idea",
      "create_free_write"
    ],
    destructiveActions: [],
    requiresConfirmationDefault: true,
  },

  DIARY: {
    id: "diary",
    route: "diary",
    nameEn: "My Diary",
    nameBn: "মাই ডায়েরি",
    descriptionEn: "Private daily reflections, thematic journaling topics, and emotional expression.",
    descriptionBn: "ব্যক্তিগত দিনলিপি, অনুভূতির প্রতিফলন ও ডায়েরি এন্ট্রি।",
    navigationAction: "open_diary",
    allowedReadActions: ["get_diary_topics_summary"],
    allowedWriteActions: ["create_diary_entry", "create_diary_topic"],
    destructiveActions: ["delete_diary_entry"],
    requiresConfirmationDefault: true,
  },

  TIME_LOG: {
    id: "learning",
    route: "learning",
    nameEn: "Time Log & Skill Builder",
    nameBn: "টাইম লগ ও স্কিল বিল্ডার",
    descriptionEn: "Subject and skill tracking, milestone roadmaps, and logged learning hours.",
    descriptionBn: "বিষয় ও স্কিল ট্র্যাকিং, রোডম্যাপ এবং শেখার সময় লগ।",
    navigationAction: "open_learning",
    allowedReadActions: ["get_learning_folders_summary"],
    allowedWriteActions: ["create_skill_roadmap", "log_activity"],
    destructiveActions: [],
    requiresConfirmationDefault: true,
  },

  SETTINGS: {
    id: "settings",
    route: "settings",
    nameEn: "Settings",
    nameBn: "সেটিংস",
    descriptionEn: "Preferences, theme, language, and AI privacy choices.",
    descriptionBn: "পছন্দসমূহ, থিম, ভাষা ও এআই প্রাইভেসি সেটিংস।",
    navigationAction: "open_settings",
    allowedReadActions: [],
    allowedWriteActions: [],
    destructiveActions: [],
    requiresConfirmationDefault: false,
  },
};

export const DESTRUCTIVE_ACTIONS: Set<ActionType> = new Set([
  "delete_task",
  "delete_note",
  "delete_diary_entry",
]);

export function isDestructiveAction(action: ActionType): boolean {
  return DESTRUCTIVE_ACTIONS.has(action);
}

export function requiresConfirmation(action: ActionType): boolean {
  if (action.startsWith("open_")) {
    return false;
  }
  return true;
}

export function getFeatureByAction(action: ActionType): FeatureDefinition | undefined {
  return Object.values(FOCUS_FORGE_FEATURES).find(
    (f) =>
      f.navigationAction === action ||
      f.allowedWriteActions.includes(action) ||
      f.destructiveActions.includes(action)
  );
}

export function getFeatureRoute(featureId: string): string {
  const upper = featureId.toUpperCase();
  if (FOCUS_FORGE_FEATURES[upper]) {
    return FOCUS_FORGE_FEATURES[upper].route;
  }
  const match = Object.values(FOCUS_FORGE_FEATURES).find((f) => f.id === featureId);
  return match?.route || "today";
}
