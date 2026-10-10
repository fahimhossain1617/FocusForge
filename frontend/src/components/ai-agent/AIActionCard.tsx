"use client";

import React, { useState } from "react";
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Target, 
  FileText, 
  BookOpen, 
  Lightbulb, 
  Compass, 
  Check, 
  X, 
  AlertTriangle, 
  Loader2 
} from "lucide-react";
import type { ActionRequest, ActionItem } from "@/types/aiAgent";

interface AIActionCardProps {
  action: ActionRequest;
  isBn?: boolean;
  onConfirm: (actionId: string, selectedItemIds?: string[], updatedItemsOrAction?: any) => void;
  onCancel: (actionId: string) => void;
  onNavigate?: (route: string) => void;
}

export function AIActionCard({
  action,
  isBn = false,
  onConfirm,
  onCancel,
  onNavigate,
}: AIActionCardProps) {
  // For multi-action planning
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (action.items && action.items.length > 0) {
      return action.items.map((i) => i.id);
    }
    return [];
  });

  // Track editable study times per item
  const [itemTimes, setItemTimes] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (action.items && action.items.length > 0) {
      action.items.forEach((item, idx) => {
        const startHour = 10 + idx * 2;
        map[item.id] = (item as any).time || item.payload?.time || `${String(startHour).padStart(2, "0")}:00`;
      });
    }
    return map;
  });

  // Track single task time
  const [singleTaskTime, setSingleTaskTime] = useState<string>(() => {
    return action.parameters?.time || "10:00";
  });

  const toggleItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getActionIcon = () => {
    switch (action.type) {
      case "create_focus_session":
        return <Target className="w-4 h-4 text-emerald-400" />;
      case "create_task":
      case "create_tasks":
      case "update_task":
      case "complete_task":
      case "delete_task":
      case "copy_tasks_to_date":
        return <Calendar className="w-4 h-4 text-sky-400" />;
      case "create_note":
      case "delete_note":
        return <FileText className="w-4 h-4 text-amber-400" />;
      case "create_diary_entry":
      case "create_diary_topic":
      case "delete_diary_entry":
        return <BookOpen className="w-4 h-4 text-pink-400" />;
      case "create_problem_solver":
      case "create_idea":
      case "create_free_write":
        return <Lightbulb className="w-4 h-4 text-violet-400" />;
      case "create_skill_roadmap":
      case "log_activity":
        return <Clock className="w-4 h-4 text-teal-400" />;
      default:
        return <Compass className="w-4 h-4 text-blue-400" />;
    }
  };

  const getActionBadgeLabel = () => {
    if (action.type.startsWith("open_")) {
      return isBn ? "নেভিগেশন" : "Navigation";
    }
    if (action.isDestructive) {
      return isBn ? "স্থায়ীভাবে মুছে ফেলা" : "Permanent Deletion";
    }
    switch (action.type) {
      case "create_focus_session":
        return isBn ? "ফোকাস সেশন" : "Focus Session";
      case "create_task":
      case "create_tasks":
        return isBn ? "প্ল্যানারে যোগ" : "Add to Planner";
      case "complete_task":
        return isBn ? "টাস্ক সম্পন্ন" : "Complete Task";
      case "create_note":
        return isBn ? "নোটস ও ফাইলস" : "Notes & Files";
      case "create_diary_entry":
        return isBn ? "ডায়েরি এন্ট্রি" : "Diary Entry";
      case "create_problem_solver":
        return isBn ? "সমস্যা সমাধান" : "Problem Solver";
      case "create_idea":
        return isBn ? "আইডিয়া বক্স" : "Idea Capture";
      case "create_skill_roadmap":
        return isBn ? "স্কিল রোডম্যাপ" : "Skill Roadmap";
      default:
        return isBn ? "অ্যাকশন প্রস্তাব" : "Proposed Action";
    }
  };

  const getConfirmButtonText = () => {
    if (action.type === "create_focus_session") {
      return isBn ? "ফোকাস শুরু করুন" : "Start Focus";
    }
    if (action.type === "create_tasks") {
      return isBn
        ? `যোগ করুন (${selectedIds.length})`
        : `Add Selected (${selectedIds.length})`;
    }
    if (action.type === "create_task") {
      return isBn ? "টাস্ক যোগ করুন" : "Add Task";
    }
    if (action.type === "complete_task") {
      return isBn ? "সম্পন্ন করুন" : "Mark Complete";
    }
    if (action.isDestructive) {
      return isBn ? "মুছে ফেলুন" : "Confirm Delete";
    }
    if (action.type === "create_note") {
      return isBn ? "নোট তৈরি করুন" : "Create Note";
    }
    if (action.type === "create_diary_entry") {
      return isBn ? "ডায়েরি লিখুন" : "Save Entry";
    }
    return isBn ? "নিশ্চিত করুন" : "Confirm";
  };

  const isExecuting = action.status === "executing";
  const isCompleted = action.status === "completed";
  const isCancelled = action.status === "cancelled";
  const isFailed = action.status === "failed";
  const isPending = action.status === "pending";

  return (
    <div
      className={`mt-2.5 mb-1 rounded-xl p-3.5 border transition-all text-left max-w-md w-full ${
        action.isDestructive
          ? "bg-rose-500/10 border-rose-500/30 text-rose-200"
          : isCompleted
          ? "bg-emerald-500/10 border-emerald-500/30 text-foreground"
          : "bg-background/80 dark:bg-[#121929] border-border/80 text-foreground shadow-lg backdrop-blur-md"
      }`}
      role="region"
      aria-label={action.title}
    >
      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2 text-xs font-semibold">
          {getActionIcon()}
          <span className="uppercase tracking-wider text-[11px] text-muted-foreground font-mono">
            {getActionBadgeLabel()}
          </span>
        </div>
        {action.isDestructive && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            {isBn ? "সতর্কতা" : "Caution"}
          </span>
        )}
      </div>

      {/* Action Title & Main Description */}
      <div className="text-sm font-semibold text-foreground mb-1 leading-snug">
        {action.title}
      </div>

      {action.description && (
        <div className="text-xs text-muted-foreground mb-2 whitespace-pre-line leading-relaxed">
          {action.description}
        </div>
      )}

      {/* Focus Timer Details */}
      {action.type === "create_focus_session" && (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-3 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {action.parameters.durationMinutes || 25} {isBn ? "মিনিট" : "minutes"} • {action.parameters.goal || "Deep Work"}
          </span>
        </div>
      )}

      {/* Planner Single Task Details */}
      {action.type === "create_task" && action.parameters.targetDate && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
          <span className="bg-muted/40 px-2 py-1 rounded-md border border-border/40 font-mono">
            📅 {action.parameters.targetDate}
          </span>
          <div className="flex items-center gap-1.5 bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
            <span className="text-[11px] font-mono">⏰</span>
            <input
              type="time"
              value={singleTaskTime}
              disabled={!isPending}
              onChange={(e) => setSingleTaskTime(e.target.value)}
              className="bg-transparent text-[11px] font-mono text-foreground focus:outline-none cursor-pointer"
              title={isBn ? "পড়ার সময় নির্বাচন করুন" : "Select study time"}
            />
          </div>
          {action.parameters.estimatedMinutes && (
            <span className="bg-muted/40 px-2 py-1 rounded-md border border-border/40">
              ⏱ {action.parameters.estimatedMinutes}m
            </span>
          )}
        </div>
      )}

      {/* Multi-Task Planning List with Checkboxes & Interactive Time Selectors */}
      {action.type === "create_tasks" && action.items && action.items.length > 0 && (
        <div className="space-y-1.5 my-2.5 bg-muted/20 p-2 rounded-xl border border-border/40 max-h-56 overflow-y-auto">
          {action.items.map((item: ActionItem) => {
            const isChecked = selectedIds.includes(item.id);
            const currentTime = itemTimes[item.id] || "10:00";
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-2 p-2 rounded-lg text-xs transition-colors ${
                  isChecked
                    ? "bg-primary/10 border border-primary/30 text-foreground font-medium"
                    : "bg-background/40 hover:bg-muted/30 text-muted-foreground"
                }`}
              >
                <label className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={!isPending}
                    onChange={() => toggleItem(item.id)}
                    className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-[10px] text-muted-foreground truncate">{item.subtitle}</div>
                    )}
                  </div>
                </label>

                {/* Interactive Time Selector */}
                <div
                  className="flex items-center gap-1 shrink-0 bg-background/80 px-1.5 py-0.5 rounded border border-border/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Clock className="w-3 h-3 text-muted-foreground/70" />
                  <input
                    type="time"
                    value={currentTime}
                    disabled={!isPending}
                    onChange={(e) => {
                      const val = e.target.value;
                      setItemTimes((prev) => ({ ...prev, [item.id]: val }));
                    }}
                    className="bg-transparent text-[11px] font-mono text-foreground focus:outline-none cursor-pointer"
                    title={isBn ? "পড়ার সময় নির্বাচন করুন" : "Select study time"}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes / Diary Content preview */}
      {(action.type === "create_note" || action.type === "create_diary_entry") && action.parameters.content && (
        <div className="text-xs bg-muted/20 p-2.5 rounded-lg border border-border/30 text-muted-foreground italic mb-3 line-clamp-3">
          &ldquo;{action.parameters.content}&rdquo;
        </div>
      )}

      {/* Problem Solver steps preview */}
      {action.type === "create_problem_solver" && Array.isArray(action.parameters.solutionSteps) && (
        <div className="text-xs bg-muted/20 p-2.5 rounded-lg border border-border/30 mb-3 space-y-1">
          <div className="font-semibold text-foreground text-[11px]">
            {isBn ? "পরিকল্পিত ধাপসমূহ:" : "Action Steps:"}
          </div>
          {action.parameters.solutionSteps.map((step: string, idx: number) => (
            <div key={idx} className="text-muted-foreground text-[11px] truncate">
              {idx + 1}. {step}
            </div>
          ))}
        </div>
      )}

      {/* STATUS = COMPLETED (Success state with reliable deep link navigation) */}
      {isCompleted && (
        <div className="pt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>{action.resultMessage || (isBn ? "সম্পন্ন হয়েছে" : "Completed")}</span>
          </div>
          {(() => {
            const targetNav = action.navigationRoute || (
              action.type.includes("task") || action.type.includes("planner")
                ? "planner"
                : action.type.includes("focus")
                ? "focus"
                : action.type.includes("skill") || action.type.includes("learning")
                ? "learning"
                : action.type.includes("diary")
                ? "diary"
                : action.type.includes("note")
                ? "tasks"
                : action.type.includes("mind") || action.type.includes("idea") || action.type.includes("problem")
                ? "mind"
                : null
            );
            if (!targetNav || !onNavigate) return null;
            return (
              <button
                type="button"
                onClick={() => onNavigate(targetNav)}
                className="px-3 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors flex items-center gap-1.5 shadow-none"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>
                  {targetNav === "focus"
                    ? isBn ? "ফোকাস খুলুন" : "Open Focus"
                    : targetNav === "planner"
                    ? isBn ? "প্ল্যানার দেখুন" : "View Planner"
                    : targetNav === "diary"
                    ? isBn ? "ডায়েরি দেখুন" : "View Diary"
                    : targetNav === "mind"
                    ? isBn ? "মাইন্ড হাব খুলুন" : "Open Mind Hub"
                    : targetNav === "tasks"
                    ? isBn ? "নোটস খুলুন" : "Open Notes"
                    : targetNav === "learning"
                    ? isBn ? "টাইম লগ খুলুন" : "Open Time Log"
                    : isBn ? "ফিচার খুলুন" : "Open"}
                </span>
              </button>
            );
          })()}
        </div>
      )}

      {/* STATUS = CANCELLED */}
      {isCancelled && (
        <div className="pt-1 text-xs text-muted-foreground italic flex items-center gap-1.5">
          <X className="w-3.5 h-3.5" />
          <span>{isBn ? "বাতিল করা হয়েছে" : "Cancelled"}</span>
        </div>
      )}

      {/* STATUS = FAILED */}
      {isFailed && (
        <div className="pt-1.5 flex items-center justify-between text-xs text-rose-400">
          <span>{action.resultMessage || (isBn ? "সম্পন্ন করা যায়নি" : "Failed to execute")}</span>
          <button
            type="button"
            onClick={() => onConfirm(action.id, selectedIds)}
            className="text-[11px] underline font-medium hover:text-rose-300"
          >
            {isBn ? "পুনরায় চেষ্টা" : "Retry"}
          </button>
        </div>
      )}

      {/* STATUS = PENDING: ACTION BUTTONS (CONFIRM / CANCEL) */}
      {isPending && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-1">
          <button
            type="button"
            disabled={isExecuting || (action.type === "create_tasks" && selectedIds.length === 0)}
            onClick={() => {
              if (action.type === "create_tasks" && action.items) {
                const updatedItems = action.items.map((item) => ({
                  ...item,
                  time: itemTimes[item.id] || (item as any).time || "10:00",
                  payload: {
                    ...(item.payload || {}),
                    time: itemTimes[item.id] || item.payload?.time || "10:00",
                  },
                }));
                onConfirm(action.id, selectedIds, updatedItems);
              } else if (action.type === "create_task") {
                const updatedAction = {
                  ...action,
                  parameters: {
                    ...action.parameters,
                    time: singleTaskTime,
                  },
                };
                onConfirm(action.id, undefined, updatedAction);
              } else {
                onConfirm(action.id, selectedIds);
              }
            }}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-none ${
              action.isDestructive
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isBn ? "কাজ হচ্ছে…" : "Working…"}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{getConfirmButtonText()}</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isExecuting}
            onClick={() => onCancel(action.id)}
            className="px-3 py-2 rounded-xl text-xs font-medium border border-border bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>{isBn ? "এখন নয়" : "Cancel"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default AIActionCard;
