"use client";

import { useState, useCallback } from "react";
import {
  getWhatShouldIDo,
  getTaskBreakdown,
  parseNaturalTask,
  getDailyPlan,
  askFocusForge,
  WhatShouldIDoResult,
  SubTaskItem,
  ParsedTaskResult,
  DailyPlanSlot,
  GenerateOptions,
  getGeminiApiKey,
  executeActionAgent,
  AgentActionResponse,
} from "@/lib/ai/geminiService";
import {
  TaskInput,
  UserFocusContext,
  BreakdownOptions,
  DailyPlannerOptions,
} from "@/lib/ai/prompts";
import { Task } from "@/types";

export type AIActionType =
  | "whatShouldIDo"
  | "taskBreakdown"
  | "parseTask"
  | "dailyPlanner"
  | "askFocusForge"
  | "executeAgenticTask"
  | null;

export interface UseFocusForgeAIOptions {
  onSuccess?: (action: AIActionType, data: unknown) => void;
  onError?: (action: AIActionType, error: Error) => void;
  model?: string;
}

export function useFocusForgeAI(options?: UseFocusForgeAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AIActionType>(null);
  const [error, setError] = useState<string | null>(null);

  // Stored state for individual feature results
  const [whatShouldIDoResult, setWhatShouldIDoResult] =
    useState<WhatShouldIDoResult | null>(null);
  const [taskBreakdownResult, setTaskBreakdownResult] = useState<
    SubTaskItem[] | null
  >(null);
  const [parsedTaskResult, setParsedTaskResult] =
    useState<ParsedTaskResult | null>(null);
  const [dailyPlanResult, setDailyPlanResult] = useState<
    DailyPlanSlot[] | null
  >(null);
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [agentActionResponse, setAgentActionResponse] = useState<AgentActionResponse | null>(null);

  const isConfigured = Boolean(getGeminiApiKey());

  const clearError = useCallback(() => setError(null), []);

  const clearResults = useCallback(() => {
    setWhatShouldIDoResult(null);
    setTaskBreakdownResult(null);
    setParsedTaskResult(null);
    setDailyPlanResult(null);
    setAssistantResponse(null);
    setAgentActionResponse(null);
    setError(null);
  }, []);

  /**
   * Action 1: Ask what task to work on next
   */
  const askWhatShouldIDo = useCallback(
    async (
      tasks: (TaskInput | Task)[],
      context?: UserFocusContext,
      genOptions?: GenerateOptions
    ): Promise<WhatShouldIDoResult | null> => {
      setIsLoading(true);
      setActiveAction("whatShouldIDo");
      setError(null);

      try {
        const result = await getWhatShouldIDo(tasks, context, {
          model: genOptions?.model || options?.model,
          ...genOptions,
        });
        setWhatShouldIDoResult(result);
        options?.onSuccess?.("whatShouldIDo", result);
        return result;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to determine next best action.";
        setError(msg);
        options?.onError?.("whatShouldIDo", err instanceof Error ? err : new Error(msg));
        return null;
      } finally {
        setIsLoading(false);
        setActiveAction(null);
      }
    },
    [options]
  );

  /**
   * Action 2: Break down a high level goal into subtasks
   */
  const breakdownTask = useCallback(
    async (
      goal: string,
      breakdownOptions?: BreakdownOptions,
      genOptions?: GenerateOptions
    ): Promise<SubTaskItem[] | null> => {
      if (!goal.trim()) {
        setError("Goal description cannot be empty.");
        return null;
      }

      setIsLoading(true);
      setActiveAction("taskBreakdown");
      setError(null);

      try {
        const result = await getTaskBreakdown(goal, breakdownOptions, {
          model: genOptions?.model || options?.model,
          ...genOptions,
        });
        setTaskBreakdownResult(result);
        options?.onSuccess?.("taskBreakdown", result);
        return result;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to break down task with AI.";
        setError(msg);
        options?.onError?.("taskBreakdown", err instanceof Error ? err : new Error(msg));
        return null;
      } finally {
        setIsLoading(false);
        setActiveAction(null);
      }
    },
    [options]
  );

  /**
   * Action 3: Parse natural language into structured task fields
   */
  const parseTaskInput = useCallback(
    async (
      naturalInput: string,
      referenceDate?: string,
      genOptions?: GenerateOptions
    ): Promise<ParsedTaskResult | null> => {
      if (!naturalInput.trim()) {
        setError("Input text cannot be empty.");
        return null;
      }

      setIsLoading(true);
      setActiveAction("parseTask");
      setError(null);

      try {
        const result = await parseNaturalTask(naturalInput, referenceDate, {
          model: genOptions?.model || options?.model,
          ...genOptions,
        });
        setParsedTaskResult(result);
        options?.onSuccess?.("parseTask", result);
        return result;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to parse natural language task.";
        setError(msg);
        options?.onError?.("parseTask", err instanceof Error ? err : new Error(msg));
        return null;
      } finally {
        setIsLoading(false);
        setActiveAction(null);
      }
    },
    [options]
  );

  /**
   * Action 4: Plan today's schedule into time blocks
   */
  const planDay = useCallback(
    async (
      tasks: (TaskInput | Task)[],
      plannerOptions?: DailyPlannerOptions,
      genOptions?: GenerateOptions
    ): Promise<DailyPlanSlot[] | null> => {
      setIsLoading(true);
      setActiveAction("dailyPlanner");
      setError(null);

      try {
        const result = await getDailyPlan(tasks, plannerOptions, {
          model: genOptions?.model || options?.model,
          ...genOptions,
        });
        setDailyPlanResult(result);
        options?.onSuccess?.("dailyPlanner", result);
        return result;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to generate daily schedule.";
        setError(msg);
        options?.onError?.("dailyPlanner", err instanceof Error ? err : new Error(msg));
        return null;
      } finally {
        setIsLoading(false);
        setActiveAction(null);
      }
    },
    [options]
  );

  /**
   * Action 5: Ask FocusForge AI (Conversational query about workload, coaching, or overload)
   */
  const askAssistant = useCallback(
    async (
      query: string,
      context: UserFocusContext,
      genOptions?: GenerateOptions
    ): Promise<string | null> => {
      if (!query.trim()) {
        setError("Query cannot be empty.");
        return null;
      }

      setIsLoading(true);
      setActiveAction("askFocusForge");
      setError(null);

      try {
        const result = await askFocusForge(query, context, {
          model: genOptions?.model || options?.model,
          ...genOptions,
        });
        setAssistantResponse(result);
        options?.onSuccess?.("askFocusForge", result);
        return result;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to process FocusForge query.";
        setError(msg);
        options?.onError?.("askFocusForge", err instanceof Error ? err : new Error(msg));
        return null;
      } finally {
        setIsLoading(false);
        setActiveAction(null);
      }
    },
    [options]
  );

  /**
   * Action 6: Agentic Task Execution
   */
  const executeAgentTask = useCallback(
    async (
      query: string,
      context: UserFocusContext,
      genOptions?: GenerateOptions
    ): Promise<AgentActionResponse | null> => {
      if (!query.trim()) {
        setError("Query cannot be empty.");
        return null;
      }

      setIsLoading(true);
      setActiveAction("executeAgenticTask");
      setError(null);

      try {
        const result = await executeActionAgent(query, context, {
          model: genOptions?.model || options?.model,
          ...genOptions,
        });
        setAgentActionResponse(result);
        options?.onSuccess?.("executeAgenticTask", result);
        return result;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to execute agentic task.";
        setError(msg);
        options?.onError?.("executeAgenticTask", err instanceof Error ? err : new Error(msg));
        return null;
      } finally {
        setIsLoading(false);
        setActiveAction(null);
      }
    },
    [options]
  );

  return {
    // State
    isLoading,
    activeAction,
    error,
    isConfigured,

    // Specific Action Results
    whatShouldIDoResult,
    taskBreakdownResult,
    parsedTaskResult,
    dailyPlanResult,
    assistantResponse,
    agentActionResponse,

    // Action Methods
    askWhatShouldIDo,
    breakdownTask,
    parseTaskInput,
    planDay,
    askAssistant,
    executeAgentTask,

    // Setters / Utilities
    clearError,
    clearResults,
  };
}
