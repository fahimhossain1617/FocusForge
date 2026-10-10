import type { Task } from "@/types";
import type { LearningRoadmap } from "./roadmap";

export type AIAgentLanguage = "auto" | "bn" | "en";
export type AIAgentModel = "smart" | "fast" | "planning" | "focentia-2.1" | "focentia-pro";
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
  | "attentive"
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
  | "playful"
  | "laughing"
  | "focused"
  | "empathetic"
  | "proud"
  | "celebrating"
  | "serious"
  | "protective"
  | "sad"
  | "sleepy"
  | "resting"
  | "error"
  | "sulky"
  | "angry"
  | "excited";

export type AgentEmotion =
  | "neutral"
  | "happy"
  | "playful"
  | "laughing"
  | "curious"
  | "thinking"
  | "focused"
  | "empathetic"
  | "concerned"
  | "encouraging"
  | "supportive"
  | "proud"
  | "celebrating"
  | "serious"
  | "protective"
  | "sad"
  | "sleepy"
  | "sulky"
  | "angry"
  | "excited";

export type ActionType =
  // Navigation
  | "open_dashboard"
  | "open_today"
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
  | "open_profile"
  | "open_settings"
  | "open_notifications"
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
  | "ready"
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
  confirmationToken?: string;
  createdAtTimestamp?: number;
  expiresAt?: string;
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
  completedTasksCount?: number;
  completedTasksSummary?: string[];
  focusMinutesToday?: number;
  focusSessionsCount?: number;
  learningTopics?: Array<{
    name: string;
    targetHours?: number;
    loggedMinutes?: number;
    weakTopics?: string[];
    notes?: string;
  }>;
  notesSummary?: Array<{ title: string; category?: string }>;
  diarySummary?: Array<{ title: string; topicTitle?: string }>;
}

export interface ProposedAction {
  id: string;
  type: "create_task" | "complete_task" | "update_task";
  title: string;
  detail: string;
  payload: Partial<Task> & { taskId?: number };
}

export interface StructuredAIResponse {
  type: "text" | "clarification" | "action_proposal" | "action_result" | "roadmap" | "error";
  message: string;
  status: "success" | "pending_clarification" | "pending_confirmation" | "executed" | "error";
  missingFields?: string[];
  clarifyingQuestion?: string | null;
  proposal?: {
    actionType: ActionType | string;
    title: string;
    parameters: Record<string, any>;
    confirmationRequired: boolean;
    isDestructive?: boolean;
  } | null;
  confirmationRequired?: boolean;
  actionId?: string | null;
  navigation?: string | null;
  data?: Record<string, any> | null;
  intent?: AIAgentIntent;
  payload?: any;
  roadmap?: LearningRoadmap | null;
  actions?: ActionRequest[];
  emotion?: string;
  reaction?: string | null;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  intent?: AIAgentIntent;
  payload?: any;
  roadmap?: LearningRoadmap | null;
  actions?: ActionRequest[];
  structuredResponse?: StructuredAIResponse;
  emotion?: string;
  reaction?: "❤️" | "✨" | "👍" | "😊" | "🎯" | string | null;
  privacyMode?: PrivacyMode;
}

