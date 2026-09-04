"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Brain,
  ListPlus,
  Calendar,
  Zap,
  MessageSquare,
  AlertCircle,
  Check,
  Loader2,
  Clock,
  CheckCircle2,
  Play,
  RotateCw,
  Send,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useFocusForgeAI } from "@/hooks/useFocusForgeAI";
import { useAppContext } from "@/context/AppContext";

interface FocusForgeAIAssistantProps {
  onClose?: () => void;
  defaultTab?: "ask" | "whatNext" | "breakdown" | "parse" | "planner";
}

export default function FocusForgeAIAssistant({
  onClose,
  defaultTab = "ask",
}: FocusForgeAIAssistantProps) {
  const [activeTab, setActiveTab] = useState<
    "ask" | "whatNext" | "breakdown" | "parse" | "planner"
  >(defaultTab);

  const { state, addTask, updateTask, showToast } = useAppContext();
  const tasks = state.tasks;
  const {
    isLoading,
    activeAction,
    error,
    isConfigured,
    whatShouldIDoResult,
    taskBreakdownResult,
    parsedTaskResult,
    dailyPlanResult,
    assistantResponse,
    askWhatShouldIDo,
    breakdownTask,
    parseTaskInput,
    planDay,
    askAssistant,
    executeAgentTask,
    agentActionResponse,
    clearError,
  } = useFocusForgeAI({
    onSuccess: (action) => {
      if (action === "askFocusForge") showToast("FocusForge AI responded!", "success");
      if (action === "executeAgenticTask") showToast("Agent proposed actions!", "success");
      if (action === "whatShouldIDo") showToast("Picked optimal next action!", "success");
      if (action === "taskBreakdown") showToast("Task breakdown generated!", "success");
      if (action === "parseTask") showToast("Task parsed successfully!", "success");
      if (action === "dailyPlanner") showToast("Daily plan generated!", "success");
    },
    onError: (_, err) => {
      showToast(err.message || "AI request failed", "error");
    },
  });

  // Mock tasks for quick prototyping if user has no tasks yet
  const mockTasks = useMemo(
    () => [
      {
        id: 101,
        name: "Refactor Database Schema for Next.js 16",
        priority: "high" as const,
        category: "Programming",
        estHours: 1,
        estMinutes: 30,
        status: "not_started" as const,
        notes: "Migrate Postgres tables and add indexes",
        tier: "now" as const,
        targetDate: new Date().toISOString().split("T")[0],
      },
      {
        id: 102,
        name: "Prepare Slide Deck for Investor Demo",
        priority: "urgent" as const,
        category: "Business",
        estHours: 0,
        estMinutes: 45,
        status: "not_started" as const,
        notes: "Focus on AI productivity metrics",
        tier: "now" as const,
        targetDate: new Date().toISOString().split("T")[0],
      },
      {
        id: 103,
        name: "Review React 19 Compiler Documentation",
        priority: "medium" as const,
        category: "Study",
        estHours: 0,
        estMinutes: 30,
        status: "not_started" as const,
        notes: "Note changes in useMemo/useCallback",
        tier: "next" as const,
        targetDate: new Date().toISOString().split("T")[0],
      },
    ],
    []
  );

  const currentTasks = tasks && tasks.length > 0 ? tasks : mockTasks;

  // Compute workload statistics
  const totalWorkloadMinutes = useMemo(() => {
    return currentTasks.reduce(
      (acc, t) => acc + (t.estHours || 0) * 60 + (t.estMinutes || 0),
      0
    );
  }, [currentTasks]);

  // Local inputs
  const [askQuery, setAskQuery] = useState("");
  const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low">("high");
  const [availableTime, setAvailableTime] = useState<number>(180); // 3 hours
  const [goalText, setGoalText] = useState("Launch MVP landing page with payment checkout");
  const [subtaskCount, setSubtaskCount] = useState(4);
  const [naturalInput, setNaturalInput] = useState(
    "Submit project report to supervisor tomorrow at 4pm high priority"
  );
  const [addedSubtasks, setAddedSubtasks] = useState<Record<number, boolean>>({});

  const isOverloaded = totalWorkloadMinutes > availableTime;

  // Handlers
  const handleAskFocusForge = async (customQuery?: string) => {
    clearError();
    const query = (customQuery || askQuery).trim();
    if (!query) return;

    const res = await executeAgentTask(query, {
      currentTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      energyLevel,
      availableMinutes: availableTime,
      tasks: currentTasks,
      preferences: {
        preferredStudyHours: "09:00 - 18:00",
        pomodoroSessionMinutes: 25,
        breakDurationMinutes: 5,
      },
    });

    if (res && res.actions) {
      res.actions.forEach((action) => {
        if (!action.isAllowed) {
          showToast(`Action blocked: ${action.reason}`, "error");
          return;
        }

        if (action.name === 'create_task') {
          addTask({
            name: action.args.title,
            priority: action.args.priority,
            category: action.args.category,
            estHours: Math.floor((action.args.estimatedMinutes || 30) / 60),
            estMinutes: (action.args.estimatedMinutes || 30) % 60,
            targetDate: action.args.targetDate,
            notes: action.args.notes,
          });
          showToast(`Created task: ${action.args.title}`, "success");
        } else if (action.name === 'update_task') {
          updateTask(action.args.id, {
            name: action.args.title,
            priority: action.args.priority,
            category: action.args.category,
            estHours: action.args.estimatedMinutes !== undefined ? Math.floor(action.args.estimatedMinutes / 60) : undefined,
            estMinutes: action.args.estimatedMinutes !== undefined ? action.args.estimatedMinutes % 60 : undefined,
            targetDate: action.args.targetDate,
            notes: action.args.notes,
          });
          showToast(`Updated task ID: ${action.args.id}`, "success");
        } else if (action.name === 'complete_task') {
          updateTask(action.args.id, { status: 'completed' });
          showToast(`Completed task ID: ${action.args.id}`, "success");
        }
      });
    }
  };

  const handleWhatShouldIDo = () => {
    clearError();
    askWhatShouldIDo(currentTasks, {
      energyLevel,
      availableMinutes: availableTime,
      currentTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  };

  const handleBreakdown = () => {
    clearError();
    setAddedSubtasks({});
    breakdownTask(goalText, { subtaskCount });
  };

  const handleParse = () => {
    clearError();
    parseTaskInput(naturalInput);
  };

  const handlePlanDay = () => {
    clearError();
    planDay(currentTasks, {
      workStartTime: "09:00",
      workEndTime: "18:00",
      includeBreaks: true,
      breakDurationMinutes: 15,
    });
  };

  const handleAddParsedToTasks = () => {
    if (!parsedTaskResult) return;
    addTask({
      name: parsedTaskResult.title,
      targetDate: parsedTaskResult.deadline || new Date().toISOString().split("T")[0],
      time: parsedTaskResult.time || "09:00",
      priority: parsedTaskResult.priority || "medium",
      category: parsedTaskResult.category || "General",
      estHours: Math.floor((parsedTaskResult.estimatedMinutes || 30) / 60),
      estMinutes: (parsedTaskResult.estimatedMinutes || 30) % 60,
      status: "not_started",
      tier: "now",
      notes: parsedTaskResult.notes || "Parsed via FocusForge AI",
    });
    showToast(`Added "${parsedTaskResult.title}" to your tasks!`, "success");
  };

  const handleAddSubtask = (
    item: { title: string; estimatedMinutes: number; priority: "urgent" | "high" | "medium" | "low"; category: string; notes: string },
    index: number
  ) => {
    addTask({
      name: item.title,
      targetDate: new Date().toISOString().split("T")[0],
      priority: item.priority || "medium",
      category: item.category || "Project",
      estHours: Math.floor(item.estimatedMinutes / 60),
      estMinutes: item.estimatedMinutes % 60,
      status: "not_started",
      tier: "now",
      notes: item.notes,
    });
    setAddedSubtasks((prev) => ({ ...prev, [index]: true }));
    showToast(`Subtask added: "${item.title}"`, "success");
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl border bg-[var(--color-bg-elevated)] border-[var(--color-border-subtle)] shadow-2xl overflow-hidden text-[var(--color-text-primary)]">
      {/* Header */}
      <div className="p-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">FocusForge AI Engine</h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                Gemini 3.6 Flash
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <ShieldCheck className="w-3 h-3" /> Secure Sandbox
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Personal cognitive focus & productivity intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              API Connected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-3 h-3" />
              API Key Missing
            </span>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-[var(--color-text-muted)] hover:text-white transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Overload Banner if tasks exceed available time */}
      {isOverloaded && (
        <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Overload Warning:</strong> Tasks total ~{Math.round(totalWorkloadMinutes / 60)}h {totalWorkloadMinutes % 60}m, exceeding your {Math.round(availableTime / 60)}h available time.
            </span>
          </div>
          <button
            onClick={() => {
              setActiveTab("ask");
              handleAskFocusForge("I am overloaded today. What should I defer and prioritize?");
            }}
            className="text-[11px] font-semibold underline hover:text-amber-100 shrink-0"
          >
            Get Deferral Advice →
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-5 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] text-center">
        <button
          onClick={() => setActiveTab("ask")}
          className={`py-3 px-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all border-b-2 ${
            activeTab === "ask"
              ? "border-violet-500 text-violet-400 bg-violet-500/5 font-semibold"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Ask AI</span>
        </button>

        <button
          onClick={() => setActiveTab("whatNext")}
          className={`py-3 px-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all border-b-2 ${
            activeTab === "whatNext"
              ? "border-violet-500 text-violet-400 bg-violet-500/5 font-semibold"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Brain className="w-4 h-4" />
          <span>What Next</span>
        </button>

        <button
          onClick={() => setActiveTab("breakdown")}
          className={`py-3 px-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all border-b-2 ${
            activeTab === "breakdown"
              ? "border-violet-500 text-violet-400 bg-violet-500/5 font-semibold"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <ListPlus className="w-4 h-4" />
          <span>Breakdown</span>
        </button>

        <button
          onClick={() => setActiveTab("parse")}
          className={`py-3 px-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all border-b-2 ${
            activeTab === "parse"
              ? "border-violet-500 text-violet-400 bg-violet-500/5 font-semibold"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Natural Parser</span>
        </button>

        <button
          onClick={() => setActiveTab("planner")}
          className={`py-3 px-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-all border-b-2 ${
            activeTab === "planner"
              ? "border-violet-500 text-violet-400 bg-violet-500/5 font-semibold"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Daily Planner</span>
        </button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="m-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={clearError} className="text-xs underline hover:text-rose-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      <div className="p-6">
        {/* ================= TAB 0: ASK FOCUSFORGE ================= */}
        {activeTab === "ask" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[var(--color-border-subtle)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Ask FocusForge AI Assistant</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    Query your workload, request Pomodoro break pacing, or evaluate study capacity.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[var(--color-text-muted)] block uppercase">Available Time</span>
                  <select
                    value={availableTime}
                    onChange={(e) => setAvailableTime(Number(e.target.value))}
                    className="text-xs bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg px-2 py-1 focus:outline-none focus:border-violet-500 mt-1"
                  >
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                    <option value={360}>6 hours</option>
                  </select>
                </div>
              </div>

              {/* Query Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={askQuery}
                  onChange={(e) => setAskQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAskFocusForge()}
                  placeholder="e.g. Can I realistically finish my programming tasks today without burnout?"
                  className="flex-1 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => handleAskFocusForge()}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-lg shadow-violet-600/25 transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isLoading && activeAction === "executeAgenticTask" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Ask
                </button>
              </div>

              {/* Quick Prompts */}
              <div className="flex flex-wrap gap-2 text-[11px] pt-1 text-[var(--color-text-muted)]">
                <span>Quick questions:</span>
                <button
                  onClick={() => {
                    setAskQuery("Am I overloaded today based on my task list?");
                    handleAskFocusForge("Am I overloaded today based on my task list?");
                  }}
                  className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-violet-500/20 hover:text-violet-300 transition"
                >
                  Am I overloaded today?
                </button>
                <button
                  onClick={() => {
                    setAskQuery("Suggest structured Pomodoro breaks for my afternoon session.");
                    handleAskFocusForge("Suggest structured Pomodoro breaks for my afternoon session.");
                  }}
                  className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-violet-500/20 hover:text-violet-300 transition"
                >
                  Suggest Pomodoro breaks
                </button>
                <button
                  onClick={() => {
                    setAskQuery("Which task should I defer to tomorrow?");
                    handleAskFocusForge("Which task should I defer to tomorrow?");
                  }}
                  className="px-2 py-0.5 rounded-full bg-white/5 hover:bg-violet-500/20 hover:text-violet-300 transition"
                >
                  What should I defer?
                </button>
              </div>
            </div>

            {/* AI Response Display */}
            {(agentActionResponse?.message || assistantResponse) ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-950/30 via-indigo-950/20 to-[var(--color-bg-base)] border border-violet-500/30 space-y-3 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-violet-500/20 text-violet-300 flex items-center justify-center text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                    FocusForge Intelligence
                  </span>
                </div>
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {agentActionResponse?.message || assistantResponse}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-violet-400/60" />
                <p className="text-sm font-medium">Context-Aware Productivity Assistant</p>
                <p className="text-xs mt-1">
                  Ask about your workload, detect overload, or get tailored Pomodoro coaching based on today&apos;s tasks.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 1: WHAT SHOULD I DO ================= */}
        {activeTab === "whatNext" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-[var(--color-border-subtle)]">
              <div>
                <h3 className="text-sm font-semibold">1. Next Action Recommendation</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Gemini analyzes your task list, deadlines, energy, and available time to eliminate decision fatigue.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                    Energy
                  </label>
                  <select
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(e.target.value as "high" | "medium" | "low")}
                    className="text-xs bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500"
                  >
                    <option value="high">⚡ High Energy</option>
                    <option value="medium">🔋 Medium Energy</option>
                    <option value="low">☕ Low Energy</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider block mb-1">
                    Available Time
                  </label>
                  <select
                    value={availableTime}
                    onChange={(e) => setAvailableTime(Number(e.target.value))}
                    className="text-xs bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                  </select>
                </div>

                <button
                  onClick={handleWhatShouldIDo}
                  disabled={isLoading}
                  className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-lg shadow-violet-600/25 transition disabled:opacity-50 cursor-pointer"
                >
                  {isLoading && activeAction === "whatShouldIDo" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  Pick My Action
                </button>
              </div>
            </div>

            {/* Results Display */}
            {whatShouldIDoResult ? (
              <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-950/40 via-indigo-950/20 to-[var(--color-bg-base)] border border-violet-500/30 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      Recommended Focus
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{whatShouldIDoResult.estimatedMinutes} mins
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                    {whatShouldIDoResult.category}
                  </span>
                </div>

                <h4 className="text-xl font-bold text-white tracking-tight">
                  {whatShouldIDoResult.actionTitle}
                </h4>

                <p className="text-sm text-slate-300 leading-relaxed">
                  {whatShouldIDoResult.reason}
                </p>

                {/* 2-minute micro action */}
                <div className="p-3.5 rounded-xl bg-violet-900/30 border border-violet-500/40 flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-violet-500/30 text-violet-200 shrink-0 mt-0.5">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-violet-300 font-bold">
                      Immediate 2-Minute Micro-Action (Beat Procrastination)
                    </div>
                    <div className="text-xs text-white mt-1 font-medium">
                      {whatShouldIDoResult.immediateNextStep}
                    </div>
                  </div>
                </div>

                {whatShouldIDoResult.momentumTip && (
                  <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 italic">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Focus Tip: {whatShouldIDoResult.momentumTip}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                <Brain className="w-8 h-8 mx-auto mb-2 text-violet-400/60" />
                <p className="text-sm font-medium">Ready to cut through the noise?</p>
                <p className="text-xs mt-1">
                  Click &ldquo;Pick My Action&rdquo; to let Gemini pick your highest ROI task right now.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: TASK BREAKDOWN ================= */}
        {activeTab === "breakdown" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-semibold block text-[var(--color-text-primary)]">
                Enter a large goal or complex task to decompose:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="e.g. Build an authentication system with OAuth & NextAuth"
                  className="flex-1 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-violet-500"
                />
                <select
                  value={subtaskCount}
                  onChange={(e) => setSubtaskCount(Number(e.target.value))}
                  className="bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-violet-500"
                >
                  <option value={3}>3 steps</option>
                  <option value={4}>4 steps</option>
                  <option value={5}>5 steps</option>
                  <option value={6}>6 steps</option>
                </select>
                <button
                  onClick={handleBreakdown}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-lg shadow-violet-600/25 transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isLoading && activeAction === "taskBreakdown" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ListPlus className="w-4 h-4" />
                  )}
                  Break It Down
                </button>
              </div>
            </div>

            {/* Subtasks Output */}
            {taskBreakdownResult && taskBreakdownResult.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] px-1">
                  <span>Generated Subtasks ({taskBreakdownResult.length})</span>
                  <span>Click to add directly into your task list</span>
                </div>

                <div className="space-y-2.5">
                  {taskBreakdownResult.map((subtask, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-[var(--color-border-subtle)] hover:border-violet-500/40 transition flex items-start justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {subtask.order || idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                            {subtask.title}
                          </div>
                          {subtask.notes && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                              {subtask.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[var(--color-text-muted)] flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {subtask.estimatedMinutes}m
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold ${
                                subtask.priority === "urgent"
                                  ? "bg-rose-500/20 text-rose-300"
                                  : subtask.priority === "high"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-blue-500/20 text-blue-300"
                              }`}
                            >
                              {subtask.priority}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddSubtask(subtask, idx)}
                        disabled={addedSubtasks[idx]}
                        className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                          addedSubtasks[idx]
                            ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300 cursor-default"
                            : "bg-violet-600/10 border-violet-500/30 text-violet-300 hover:bg-violet-600 hover:text-white"
                        }`}
                      >
                        {addedSubtasks[idx] ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Added
                          </>
                        ) : (
                          <>+ Add Task</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                <ListPlus className="w-8 h-8 mx-auto mb-2 text-violet-400/60" />
                <p className="text-sm font-medium">Decompose overwhelming projects</p>
                <p className="text-xs mt-1">
                  Type any high-level objective and let Gemini generate a sequential execution plan.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: NATURAL LANGUAGE PARSER ================= */}
        {activeTab === "parse" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-semibold block text-[var(--color-text-primary)]">
                Type or paste a task in everyday natural language:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  placeholder="e.g. Call client about contract revision tomorrow 11am urgent"
                  className="flex-1 bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-violet-500"
                />
                <button
                  onClick={handleParse}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-lg shadow-violet-600/25 transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isLoading && activeAction === "parseTask" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Parse Task
                </button>
              </div>
            </div>

            {/* Parsed Result Display */}
            {parsedTaskResult ? (
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-[var(--color-border-subtle)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Structured Task Output
                  </span>
                  <button
                    onClick={handleAddParsedToTasks}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow transition cursor-pointer"
                  >
                    + Add to Workspace Tasks
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase block mb-0.5">
                      Title
                    </span>
                    <span className="font-semibold text-sm text-[var(--color-text-primary)]">
                      {parsedTaskResult.title}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase block mb-0.5">
                      Deadline / Time
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {parsedTaskResult.deadline || "No specific date"}
                      {parsedTaskResult.time ? ` at ${parsedTaskResult.time}` : ""}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase block mb-0.5">
                      Priority & Duration
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          parsedTaskResult.priority === "urgent"
                            ? "bg-rose-500/20 text-rose-300"
                            : parsedTaskResult.priority === "high"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {parsedTaskResult.priority}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        ~{parsedTaskResult.estimatedMinutes} mins
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)]">
                    <span className="text-[10px] text-[var(--color-text-muted)] uppercase block mb-0.5">
                      Category
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      {parsedTaskResult.category || "General"}
                    </span>
                  </div>
                </div>

                {parsedTaskResult.notes && (
                  <p className="text-xs text-[var(--color-text-muted)] italic">
                    Notes: {parsedTaskResult.notes}
                  </p>
                )}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                <Zap className="w-8 h-8 mx-auto mb-2 text-violet-400/60" />
                <p className="text-sm font-medium">Quick capture without forms</p>
                <p className="text-xs mt-1">
                  Type naturally, and Gemini extracts clean titles, deadlines, priorities, and time estimates.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: DAILY PLANNER ================= */}
        {activeTab === "planner" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-[var(--color-border-subtle)]">
              <div>
                <h3 className="text-sm font-semibold">4. AI Smart Time-Blocking</h3>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  Organizes today&apos;s tasks into deep work blocks, buffer slots, and energy-preserving breaks.
                </p>
              </div>

              <button
                onClick={handlePlanDay}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs shadow-lg shadow-violet-600/25 transition disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isLoading && activeAction === "dailyPlanner" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCw className="w-4 h-4" />
                )}
                Generate Daily Schedule
              </button>
            </div>

            {/* Daily Plan Schedule Timeline */}
            {dailyPlanResult && dailyPlanResult.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs text-[var(--color-text-muted)] px-1">
                  Optimized Schedule ({dailyPlanResult.length} time blocks)
                </div>

                <div className="relative pl-6 space-y-3 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[var(--color-border-subtle)]">
                  {dailyPlanResult.map((slot, index) => (
                    <div
                      key={index}
                      className={`relative p-3.5 rounded-xl border transition ${
                        slot.isBreak
                          ? "bg-emerald-950/15 border-emerald-500/20 text-emerald-200"
                          : slot.focusType === "deep_work"
                          ? "bg-violet-950/25 border-violet-500/30 text-[var(--color-text-primary)]"
                          : "bg-white/[0.02] border-[var(--color-border-subtle)] text-[var(--color-text-primary)]"
                      }`}
                    >
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-6 top-4 w-2.5 h-2.5 rounded-full ring-4 ring-[var(--color-bg-elevated)] ${
                          slot.isBreak ? "bg-emerald-400" : "bg-violet-500"
                        }`}
                      />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-violet-400">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded uppercase font-semibold ${
                              slot.isBreak
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-violet-500/20 text-violet-300"
                            }`}
                          >
                            {slot.focusType || (slot.isBreak ? "Break" : "Task")}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          {slot.category}
                        </span>
                      </div>

                      <div className="text-sm font-semibold mt-1.5">{slot.title}</div>

                      {slot.notes && (
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          {slot.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl border border-dashed border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-violet-400/60" />
                <p className="text-sm font-medium">Automatic Time Blocking</p>
                <p className="text-xs mt-1">
                  Click &ldquo;Generate Daily Schedule&rdquo; to turn your task list into an organized timeline.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
