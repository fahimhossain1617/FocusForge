"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useAnimateExit } from "../../hooks/useAnimateExit";
import { Weekday, RoutineTemplateTask } from "../../types";
import { formatTime12hr } from "../../utils/timeUtils";
import {
  Calendar,
  Clock,
  Bell,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";

interface ImportRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDateStr: string; // "YYYY-MM-DD"
}

const ALL_WEEKDAYS: { key: Weekday; label: string; short: string }[] = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

function getWeekdayFromDateStr(dateStr: string): Weekday {
  if (!dateStr) return "monday";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayIndex = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const mapping: Weekday[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return mapping[dayIndex] || "monday";
}


const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  urgent: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
  high: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  medium: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  low: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30" },
};

export default function ImportRoutineModal({
  isOpen,
  onClose,
  targetDateStr,
}: ImportRoutineModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { state, setState, importRoutineToDate: contextImportRoutineToDate, showToast, trackMeaningfulAction } = useAppContext();
  const { t } = useTranslation();
  const { shouldRender, isExiting } = useAnimateExit({ isOpen, durationMs: 200 });

  // Initial weekday matched to selected calendar date
  const defaultWeekday = useMemo(() => getWeekdayFromDateStr(targetDateStr), [targetDateStr]);
  const [selectedWeekday, setSelectedWeekday] = useState<Weekday>(defaultWeekday);

  // Sync selected weekday if target date changes when reopening
  useState(() => {
    setSelectedWeekday(defaultWeekday);
  });

  const formattedTargetDate = useMemo(() => {
    if (!targetDateStr) return "";
    const [y, m, d] = targetDateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [targetDateStr]);

  // Routine template for selected weekday
  const template = useMemo(() => {
    return (state.routineTemplates || []).find((tpl) => tpl.weekday === selectedWeekday);
  }, [state.routineTemplates, selectedWeekday]);

  const templateTasks = useMemo(() => {
    if (!template || !template.tasks) return [];
    return [...template.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [template]);

  // Existing daily tasks on this target date
  const existingDateTasks = useMemo(() => {
    if (!targetDateStr) return [];
    return (state.tasks || []).filter(
      (t) => t.targetDate === targetDateStr || t.date === targetDateStr
    );
  }, [state.tasks, targetDateStr]);

  // Duplicate Analysis
  const duplicateAnalysis = useMemo(() => {
    if (templateTasks.length === 0 || existingDateTasks.length === 0) {
      return { duplicateCount: 0, missingCount: templateTasks.length, duplicates: [] };
    }

    const duplicates: { tmplTask: RoutineTemplateTask; reason: string }[] = [];

    templateTasks.forEach((tmplTask) => {
      const match = existingDateTasks.find((existing) => {
        if (existing.sourceRoutineTaskId && existing.sourceRoutineTaskId === tmplTask.id) return true;
        const sameTitle =
          (existing.name || existing.title || "").trim().toLowerCase() ===
          tmplTask.title.trim().toLowerCase();
        const sameTime = existing.time === tmplTask.startTime;
        return sameTitle && sameTime;
      });

      if (match) {
        duplicates.push({
          tmplTask,
          reason: match.sourceRoutineTaskId ? "Already imported from this routine" : "Matching title and start time",
        });
      }
    });

    return {
      duplicateCount: duplicates.length,
      missingCount: templateTasks.length - duplicates.length,
      duplicates,
    };
  }, [templateTasks, existingDateTasks]);

  const handleExecuteImport = (mode: "all" | "missing_only") => {
    if (typeof contextImportRoutineToDate === "function") {
      contextImportRoutineToDate(selectedWeekday, targetDateStr, { mode });
      onClose();
      return;
    }

    // Direct fallback if context method is not yet bound
    if (!template || !template.tasks || template.tasks.length === 0) {
      if (typeof showToast === "function") showToast("No routine template found for " + selectedWeekday, "info");
      return;
    }

    const sortedTasks = [...template.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    let importedCount = 0;
    let skippedCount = 0;
    const newTasksToCreate: any[] = [];
    const newBlocksToCreate: any[] = [];

    sortedTasks.forEach((tmplTask, index) => {
      const isDuplicate = existingDateTasks.some((existing) => {
        if (existing.sourceRoutineTaskId && existing.sourceRoutineTaskId === tmplTask.id) return true;
        const sameTitle = (existing.name || existing.title || "").trim().toLowerCase() === tmplTask.title.trim().toLowerCase();
        const sameTime = existing.time === tmplTask.startTime;
        return sameTitle && sameTime;
      });

      if (isDuplicate && mode === "missing_only") {
        skippedCount++;
        return;
      }

      const newTaskId = Date.now() + Math.floor(Math.random() * 100000) + index;
      const createdTask = {
        id: newTaskId,
        name: tmplTask.title,
        title: tmplTask.title,
        description: tmplTask.notes || "",
        notes: tmplTask.notes || "",
        targetDate: targetDateStr,
        date: targetDateStr,
        time: tmplTask.startTime,
        endTime: tmplTask.endTime,
        priority: tmplTask.priority,
        estHours: 1,
        estMinutes: 60,
        status: "not_started",
        completed: false,
        reminderEnabled: tmplTask.reminderEnabled ?? false,
        reminderTime: tmplTask.reminderEnabled ? (tmplTask.reminderTime || tmplTask.startTime) : undefined,
        category: tmplTask.category || "",
        tier: tmplTask.priority === "urgent" || tmplTask.priority === "high" ? "now" : "next",
        sourceType: "routine",
        sourceRoutineId: template.id,
        sourceRoutineTaskId: tmplTask.id,
        importedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const createdBlock = {
        id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
        date: targetDateStr,
        startTime: tmplTask.startTime,
        endTime: tmplTask.endTime,
        label: tmplTask.title,
        category: tmplTask.category || "",
        isBreak: false,
        taskId: newTaskId,
        sourceType: "routine",
        sourceRoutineId: template.id,
        sourceRoutineTaskId: tmplTask.id,
      };

      newTasksToCreate.push(createdTask);
      newBlocksToCreate.push(createdBlock);
      importedCount++;
    });

    if (newTasksToCreate.length > 0) {
      setState((prev) => ({
        ...prev,
        tasks: [...prev.tasks, ...newTasksToCreate],
        timeBlocks: [...prev.timeBlocks, ...newBlocksToCreate],
      }));
      if (typeof trackMeaningfulAction === "function") trackMeaningfulAction("import_routine");
      if (typeof showToast === "function") showToast(importedCount + " routine task" + (importedCount > 1 ? "s" : "") + " imported for " + targetDateStr, "success");
      onClose();
    } else {
      if (skippedCount > 0 && typeof showToast === "function") {
        showToast("All routine tasks are already scheduled for this date.", "info");
      }
    }
  };

  if (!shouldRender || !mounted) return null;

  return createPortal(
    <div
      className={`${isExiting ? "motion-exit-fade" : "motion-overlay"} fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md overflow-y-auto pointer-events-auto`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${isExiting ? "motion-exit-reveal" : "motion-reveal"} relative w-full max-w-2xl my-auto rounded-3xl border flex flex-col shadow-2xl overflow-hidden max-h-[90vh]`}
        style={{
          background: "linear-gradient(155deg, rgba(16, 23, 38, 0.98), rgba(9, 13, 22, 0.99))",
          borderColor: "rgba(59, 130, 246, 0.22)",
          boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px rgba(37, 99, 235, 0.12)",
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.planner.importRoutine || "Import Routine"}
            </h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Target date:</span>
              <span className="font-semibold text-blue-400">{formattedTargetDate}</span>
            </p>
          </div>
        </div>

        {/* WEEKDAY SELECTOR (Pre-selected to matching day, allows switching) */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-slate-950/40">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-400">Select Routine Template:</span>
            {selectedWeekday === defaultWeekday && (
              <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                Matches {defaultWeekday}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {ALL_WEEKDAYS.map((day) => {
              const isActive = selectedWeekday === day.key;
              const dayTemplate = (state.routineTemplates || []).find((tpl) => tpl.weekday === day.key);
              const count = dayTemplate?.tasks?.length || 0;

              return (
                <button
                  key={day.key}
                  onClick={() => setSelectedWeekday(day.key)}
                  className={`flex-1 min-w-[72px] sm:min-w-[80px] py-2 px-1.5 rounded-xl text-xs font-semibold flex flex-col items-center gap-0.5 transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 border border-blue-400/40"
                      : "bg-white/[0.03] text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] border border-white/[0.06]"
                  }`}
                >
                  <span className="capitalize">{day.short}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                      isActive ? "bg-white/20 text-white" : count > 0 ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {/* DUPLICATE WARNING ALERT */}
          {duplicateAnalysis.duplicateCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 text-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-amber-300">
                  {duplicateAnalysis.duplicateCount} of {templateTasks.length} tasks already exist on this date.
                </p>
                <p className="text-amber-200/80 leading-relaxed">
                  Focus Forge prevents accidental duplicates. You can choose to import only the remaining missing tasks, or re-import all tasks.
                </p>
              </div>
            </div>
          )}

          {/* TEMPLATE TASKS PREVIEW */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>Routine Tasks Preview ({templateTasks.length})</span>
              </h3>
              {templateTasks.length > 0 && (
                <span className="text-xs text-slate-400 font-mono">
                  {formatTime12hr(templateTasks[0]?.startTime)} – {formatTime12hr(templateTasks[templateTasks.length - 1]?.endTime)}
                </span>
              )}
            </div>

            {templateTasks.length > 0 ? (
              <div className="space-y-2">
                {templateTasks.map((task) => {
                  const isDup = duplicateAnalysis.duplicates.some((d) => d.tmplTask.id === task.id);
                  const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isDup
                          ? "bg-amber-500/[0.04] border-amber-500/20 opacity-80"
                          : "bg-white/[0.03] border-white/[0.08]"
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white truncate">{task.title}</span>
                          <span
                            className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
                          >
                            {task.priority}
                          </span>
                          {task.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300">
                              {task.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-400" />
                            {formatTime12hr(task.startTime)} – {formatTime12hr(task.endTime)}
                          </span>

                          {task.reminderEnabled && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded font-sans">
                              <Bell size={10} /> {formatTime12hr(task.reminderTime || task.startTime)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="shrink-0">
                        {isDup ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                            Already Scheduled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                            <CheckCircle2 size={12} /> Ready
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 px-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-2">
                <Info className="w-8 h-8 text-slate-500" />
                <h4 className="text-sm font-bold text-white">No tasks in this routine template</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Open the Routine Library to add tasks for {selectedWeekday}.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MODAL ACTIONS FOOTER */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/5 border border-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {templateTasks.length > 0 && (
            <div className="flex items-center gap-2">
              {duplicateAnalysis.duplicateCount > 0 ? (
                <>
                  {duplicateAnalysis.missingCount > 0 && (
                    <button
                      onClick={() => handleExecuteImport("missing_only")}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Import {duplicateAnalysis.missingCount} Missing Tasks
                    </button>
                  )}
                  <button
                    onClick={() => handleExecuteImport("all")}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Re-import All ({templateTasks.length})
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleExecuteImport("all")}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  Import to This Date ({templateTasks.length} tasks)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
