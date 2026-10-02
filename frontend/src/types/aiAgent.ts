import type { Task } from "@/types";

export type AIAgentLanguage = "auto" | "bn" | "en";
export type AIAgentModel = "smart" | "fast" | "planning";
export type AIAgentIntent =
  | "NAVIGATION"
  | "PROBLEM_SOLVER" 
  | "IDEA_CAPTURE" 
  | "NOTES_FILES" 
  | "PLANNER_CREATE" 
  | "FOCUS_SESSION" 
  | "LEARNING_HUB" 
  | "SKILL_BUILDER" 
  | "MY_DIARY" 
  | "DIARY_ENTRY" 
  | "DASHBOARD"
  | "GREETING_OR_GENERAL" 
  | "REQUIRE_LOGIN" 
  | "LIMIT_EXHAUSTED" 
  | "FAILED_TO_SEND";

export type PrivacyMode = "improvement" | "private" | "disappearing";

export type OrbState =
  | "idle"
  | "listening"
  | "thinking"
  | "composing"
  | "working"
  | "waiting_confirmation"
  | "success"
  | "supportive"
  | "happy"
  | "curious"
  | "concerned"
  | "encouraging"
  | "error";

export type ActionType =
  // Navigation
  | "open_dashboard"
  | "open_focus"
  | "open_planner"
  | "open_tasks"
  | "open_notes"
  | "open_mind"
  | "open_problem_solver"
  | "open_idea_space"
  | "open_diary"
  | "open_learning"
  | "open_skill_builder"
  | "open_settings"
  // Focus
  | "create_focus_session"
  // Planner & Tasks
  | "create_task"
  | "create_planner_task"
  | "create_tasks"
  | "create_multiple_tasks"
  | "update_task"
  | "complete_task"
  | "uncomplete_task"
  | "delete_task"
  | "copy_tasks_to_date"
  // Notes
  | "create_note"
  | "delete_note"
  // Mind Space
  | "create_problem_solver"
  | "create_problem"
  | "create_idea"
  | "create_free_write"
  // Diary
  | "create_diary_entry"
  | "create_diary_topic"
  | "delete_diary_entry"
  // Skill Builder / Time Log
  | "create_skill_roadmap"
  | "create_skill"
  | "create_learning_topic"
  | "log_activity";

export type ActionStatus =
  | "pending"
  | "confirmed"
  | "executing"
  | "completed"
  | "cancelled"
  | "failed";

export interface ActionItem {
  id: string;
  title: string;
  subtitle?: string;
  selected?: boolean;
  payload?: any;
}

export interface ActionRequest {
  id: string;
  type: ActionType;
  title: string;
  description?: string;
  parameters: Record<string, any>;
  confirmationRequired: boolean;
  isDestructive?: boolean;
  status: ActionStatus;
  createdAt: string;
  resultMessage?: string;
  navigationRoute?: string;
  items?: ActionItem[]; // For multi-action planning (e.g. 3 tasks)
}

export interface WorkspaceContext {
  tasks: Task[];
  notesCount: number;
  timeBlocksCount: number;
  productivityScore: number;
  instructions?: string;
  currentDate?: string;
  activeFocusSession?: {
    isRunning: boolean;
    taskName?: string;
    remainingMinutes?: number;
  } | null;
}

export interface ProposedAction {
  id: string;
  type: "create_task" | "complete_task" | "update_task";
  title: string;
  detail: string;
  payload: Partial<Task> & { taskId?: number };
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  intent?: AIAgentIntent;
  payload?: any;
  actions?: ActionRequest[];
  emotion?: string;
  reaction?: "❤️" | "✨" | "👍" | "😊" | "🎯" | string | null;
  privacyMode?: PrivacyMode;
}
