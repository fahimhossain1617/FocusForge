/**
 * FocusForge AI - Gemini Client Service (Refactored to use Backend)
 * 
 * This file no longer talks to Google GenAI directly from the browser.
 * It forwards all requests to the strict, whitelisted FocusForge backend.
 */

import { fetchBackend } from '../apiClient';
import {
  TaskInput,
  UserFocusContext,
  BreakdownOptions,
  DailyPlannerOptions,
} from './prompts';
import { Task } from '@/types';
import { ValidatedAction } from './aiActionValidator';

// ==================== Output Interfaces (Kept identical to prevent UI breaks) ====================

export interface WhatShouldIDoResult {
  selectedTaskId: number | string | null;
  actionTitle: string;
  category: string;
  estimatedMinutes: number;
  reason: string;
  immediateNextStep: string;
  momentumTip: string;
}

export interface SubTaskItem {
  order: number;
  title: string;
  estimatedMinutes: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: string;
  notes: string;
}

export interface ParsedTaskResult {
  title: string;
  deadline: string | null;
  time: string | null;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  estimatedMinutes: number;
  category: string;
  notes: string | null;
}

export interface DailyPlanSlot {
  startTime: string;
  endTime: string;
  title: string;
  taskId: number | string | null;
  category: string;
  isBreak: boolean;
  focusType: 'deep_work' | 'shallow_work' | 'break' | 'review';
  notes: string;
}

export interface AgentActionResponse {
  message: string;
  actions: ValidatedAction[];
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
}

// For backwards compatibility where components check if API key exists
export function getGeminiApiKey(): string {
  return "managed-by-backend"; 
}

// ==================== Core AI Functions (Proxied to backend) ====================

export async function getWhatShouldIDo(
  tasks: (TaskInput | Task)[],
  context?: UserFocusContext,
  options?: GenerateOptions
): Promise<WhatShouldIDoResult> {
  return fetchBackend<WhatShouldIDoResult>('/api/ai/what-should-i-do', {
    method: 'POST',
    body: JSON.stringify({ tasks, context, options }),
  });
}

export async function getTaskBreakdown(
  goal: string,
  breakdownOptions?: BreakdownOptions,
  options?: GenerateOptions
): Promise<SubTaskItem[]> {
  return fetchBackend<SubTaskItem[]>('/api/ai/breakdown', {
    method: 'POST',
    body: JSON.stringify({ goal, breakdownOptions, options }),
  });
}

export async function parseNaturalTask(
  naturalInput: string,
  referenceDate?: string,
  options?: GenerateOptions
): Promise<ParsedTaskResult> {
  return fetchBackend<ParsedTaskResult>('/api/ai/parse-task', {
    method: 'POST',
    body: JSON.stringify({ naturalInput, referenceDate, options }),
  });
}

export async function getDailyPlan(
  tasks: (TaskInput | Task)[],
  plannerOptions?: DailyPlannerOptions,
  options?: GenerateOptions
): Promise<DailyPlanSlot[]> {
  return fetchBackend<DailyPlanSlot[]>('/api/ai/daily-plan', {
    method: 'POST',
    body: JSON.stringify({ tasks, plannerOptions, options }),
  });
}

export async function askFocusForge(
  userQuery: string,
  context: UserFocusContext,
  options?: GenerateOptions
): Promise<string> {
  const result = await fetchBackend<{ response: string }>('/api/ai/ask', {
    method: 'POST',
    body: JSON.stringify({ userQuery, context, options }),
  });
  return result.response;
}

export async function executeActionAgent(
  userQuery: string,
  context: UserFocusContext,
  options?: GenerateOptions
): Promise<AgentActionResponse> {
  return fetchBackend<AgentActionResponse>('/api/ai/execute-agent', {
    method: 'POST',
    body: JSON.stringify({ userQuery, context, options }),
  });
}

export async function generateCustomAiText(
  prompt: string,
  modelName?: string
): Promise<string> {
  const result = await fetchBackend<{ response: string }>('/api/ai/custom', {
    method: 'POST',
    body: JSON.stringify({ prompt, modelName }),
  });
  return result.response;
}
