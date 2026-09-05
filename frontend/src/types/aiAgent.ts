import type { Task } from "@/types";

export type AIAgentLanguage = "auto" | "bn" | "en";
export type AIAgentModel = "smart" | "fast" | "planning";
export type AIAgentIntent =
  | "PROBLEM_SOLVER" | "IDEA_CAPTURE" | "NOTES_FILES" | "PLANNER_CREATE" 
  | "FOCUS_SESSION" | "LEARNING_HUB" | "GREETING_OR_GENERAL";

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
  intent?: AIAgentIntent;
  payload?: any;
}
