/**
 * AI Action Registry
 * Enforces the "Absolute AI Restriction" policy.
 * The AI cannot execute arbitrary functions or query the database directly.
 * It is only allowed to return structured outputs mapping to these registered actions.
 */

export const ALLOWED_AI_ACTIONS = {
    WHAT_SHOULD_I_DO: 'whatShouldIDo',
    TASK_BREAKDOWN: 'taskBreakdown',
    PARSE_TASK: 'parseTask',
    DAILY_PLANNER: 'dailyPlanner',
    ASK_FOCUS_FORGE: 'askFocusForge',
    EXECUTE_AGENTIC_TASK: 'executeAgenticTask',
    AGENT_CHAT: 'agentChat',
    CUSTOM_AI: 'customAi',
  } as const;
  
  export type AllowedAIAction = typeof ALLOWED_AI_ACTIONS[keyof typeof ALLOWED_AI_ACTIONS];
  
  /**
   * Validates if a requested action is in the whitelist.
   */
  export const isActionAllowed = (actionName: string): actionName is AllowedAIAction => {
    return Object.values(ALLOWED_AI_ACTIONS).includes(actionName as AllowedAIAction);
  };
  
  /**
   * Schemas/Types expected to be returned by each action
   * (Matches the frontend types to ensure seamless integration)
   */
  
  export interface SubTaskItem {
    id: string;
    title: string;
    estimatedMinutes: number;
    difficulty: "easy" | "medium" | "hard";
    dependencies?: string[];
  }
  
  export interface ParsedTaskResult {
    title: string;
    category?: string;
    priority: "low" | "medium" | "high" | "urgent";
    estimatedMinutes: number;
    targetDate?: string; // ISO string or simple date
  }
  
  export interface WhatShouldIDoResult {
    recommendedTaskId: number;
    reasoning: string;
    motivationMsg: string;
  }
  
  export interface DailyPlanSlot {
    startTime: string; // "HH:MM"
    endTime: string;
    taskId?: number;
    title: string;
    isBreak: boolean;
  }
  
  export interface AgentActionResponse {
    actionTaken: string;
    details: string;
    affectedTaskIds?: number[];
  }
  
