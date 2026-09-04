import type { Task } from "@/types";

export type AIAgentLanguage = "auto" | "bn" | "en";
export type AIAgentModel = "smart" | "fast" | "planning";
export type AIAgentIntent =
  | "TASK_MANAGEMENT" | "DAILY_PLANNING" | "GOAL_PLANNING"
  | "SCHEDULE_ANALYSIS" | "PRODUCTIVITY_ANALYSIS" | "NOTE_EXTRACTION"
  | "PRIORITY_SUGGESTION" | "DEADLINE_REPLANNING" | "CONTEXTUAL_PRODUCTIVITY_CHAT";

export interface WorkspaceContext {
  tasks: Task[];
  notesCount: number;
  timeBlocksCount: number;
  productivityScore: number;
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
  proposal?: ProposedAction[];
}
