"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useAnimateExit } from "../../hooks/useAnimateExit";
import { Weekday, RoutineTemplateTask, RoutineTemplate } from "../../types";
import FocusForgeTimePicker from "../ui/FocusForgeTimePicker";
import { formatTime12hr } from "../../utils/timeUtils";
import {
  X,
  Plus,
  Clock,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface RoutineLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeekday?: Weekday;
  targetDateStr?: string;
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

export default function RoutineLibraryModal({
  isOpen,
  onClose,
  initialWeekday = "monday",
  targetDateStr,
}: RoutineLibraryModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    state,
    setState,
    addRoutineTask: contextAddRoutineTask,
    updateRoutineTask: contextUpdateRoutineTask,
    deleteRoutineTask: contextDeleteRoutineTask,
    reorderRoutineTasks: contextReorderRoutineTasks,
    importRoutineToDate: contextImportRoutineToDate,
    showToast,
  } = useAppContext();
  const { t } = useTranslation();
  const { shouldRender, isExiting } = useAnimateExit({ isOpen, durationMs: 200 });

  const [activeWeekday, setActiveWeekday] = useState<Weekday>(initialWeekday);
  const [isEditingTask, setIsEditingTask] = useState<boolean>(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:30");
  const [formPriority, setFormPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [formCategory, setFormCategory] = useState("Study");
  const [formReminderEnabled, setFormReminderEnabled] = useState(false);
  const [formReminderTime, setFormReminderTime] = useState("08:45");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (initialWeekday) {
      setActiveWeekday(initialWeekday);
    }
  }, [initialWeekday, isOpen]);

  // Safe wrapper for adding routine tasks
  const handleAddRoutineTask = (weekday: Weekday, taskData: Omit<RoutineTemplateTask, "id" | "order">) => {
    if (typeof contextAddRoutineTask === "function") {
      contextAddRoutineTask(weekday, taskData);
      return;
    }
    setState((prev) => {
      const templates = [...(prev.routineTemplates || [])];
      let templateIndex = templates.findIndex((t) => t.weekday === weekday);
      const newTaskId = "rt_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

      if (templateIndex === -1) {
        const newTemplate: RoutineTemplate = {
          id: "routine_" + weekday,
          weekday,
          tasks: [{ ...taskData, id: newTaskId, order: 0 }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return { ...prev, routineTemplates: [...templates, newTemplate] };
      }

      const template = { ...templates[templateIndex] };
      const currentTasks = template.tasks || [];
      const nextOrder = currentTasks.length > 0 ? Math.max(...currentTasks.map((t) => t.order ?? 0)) + 1 : 0;
      template.tasks = [...currentTasks, { ...taskData, id: newTaskId, order: nextOrder }];
      template.updatedAt = new Date().toISOString();
      templates[templateIndex] = template;

      return { ...prev, routineTemplates: templates };
    });
  };

  // Safe wrapper for updating routine tasks
  const handleUpdateRoutineTask = (weekday: Weekday, taskId: string, updates: Partial<RoutineTemplateTask>) => {
    if (typeof contextUpdateRoutineTask === "function") {
      contextUpdateRoutineTask(weekday, taskId, updates);
      return;
    }
    setState((prev) => {
      const templates = [...(prev.routineTemplates || [])];
      const templateIndex = templates.findIndex((t) => t.weekday === weekday);
      if (templateIndex === -1) return prev;

      const template = { ...templates[templateIndex] };
      template.tasks = (template.tasks || []).map((t) => (t.id === taskId ? { ...t, ...updates } : t));
      template.updatedAt = new Date().toISOString();
      templates[templateIndex] = template;

      return { ...prev, routineTemplates: templates };
    });
  };

  // Safe wrapper for deleting routine tasks
  const handleDeleteRoutineTask = (weekday: Weekday, taskId: string) => {
    if (typeof contextDeleteRoutineTask === "function") {
      contextDeleteRoutineTask(weekday, taskId);
      return;
    }
    setState((prev) => {
      const templates = [...(prev.routineTemplates || [])];
      const templateIndex = templates.findIndex((t) => t.weekday === weekday);
      if (templateIndex === -1) return prev;

      const template = { ...templates[templateIndex] };
      template.tasks = (template.tasks || []).filter((t) => t.id !== taskId);
      template.updatedAt = new Date().toISOString();
      templates[templateIndex] = template;

      return { ...prev, routineTemplates: templates };
    });
  };

  // Safe wrapper for reordering routine tasks
  const handleReorderRoutineTasks = (weekday: Weekday, taskIds: string[]) => {
    if (typeof contextReorderRoutineTasks === "function") {
      contextReorderRoutineTasks(weekday, taskIds);
      return;
    }
    setState((prev) => {
      const templates = [...(prev.routineTemplates || [])];
      const templateIndex = templates.findIndex((t) => t.weekday === weekday);
      if (templateIndex === -1) return prev;

      const template = { ...templates[templateIndex] };
      const taskMap = new Map((template.tasks || []).map((t) => [t.id, t]));
      const reordered: RoutineTemplateTask[] = [];
      taskIds.forEach((id, index) => {
        const item = taskMap.get(id);
        if (item) {
          reordered.push({ ...item, order: index });
        }
      });
      template.tasks = reordered;
      template.updatedAt = new Date().toISOString();
      templates[templateIndex] = template;

      return { ...prev, routineTemplates: templates };
    });
  };

  // Current Template Tasks for Active Weekday
  const currentTemplate = useMemo(() => {
    return (state.routineTemplates || []).find((tpl) => tpl.weekday === activeWeekday);
  }, [state.routineTemplates, activeWeekday]);

  const tasksList = useMemo(() => {
    if (!currentTemplate || !currentTemplate.tasks) return [];
    return [...currentTemplate.tasks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [currentTemplate]);

  // Time Range & Summary Calculation
  const summary = useMemo(() => {
    if (tasksList.length === 0) return null;
    const sortedByTime = [...tasksList].sort((a, b) => a.startTime.localeCompare(b.startTime));
    const earliest = sortedByTime[0]?.startTime || "";
    const latest = sortedByTime.reduce((max, curr) => (curr.endTime > max ? curr.endTime : max), sortedByTime[0]?.endTime || "");
    return {
      count: tasksList.length,
      timeRange: earliest && latest ? `${formatTime12hr(earliest)} – ${formatTime12hr(latest)}` : "",
    };
  }, [tasksList]);

  const resetForm = () => {
    setFormTitle("");
    setFormStartTime("09:00");
    setFormEndTime("10:30");
    setFormPriority("medium");
    setFormCategory("Study");
    setFormReminderEnabled(false);
    setFormReminderTime("08:45");
    setFormNotes("");
    setFormError(null);
    setIsEditingTask(false);
    setEditingTaskId(null);
  };

  const handleOpenAddForm = () => {
    resetForm();
    if (tasksList.length > 0) {
      const lastTask = tasksList[tasksList.length - 1];
      setFormStartTime(lastTask.endTime || "09:00");
      // Default end time 1 hr later
      const [h, m] = (lastTask.endTime || "09:00").split(":").map(Number);
      const nextH = (h + 1) % 24;
      setFormEndTime(`${String(nextH).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`);
    }
    setIsEditingTask(true);
  };

  const handleOpenEditForm = (task: RoutineTemplateTask) => {
    setEditingTaskId(task.id);
    setFormTitle(task.title);
    setFormStartTime(task.startTime);
    setFormEndTime(task.endTime);
    setFormPriority(task.priority);
    setFormCategory(task.category || "Study");
    setFormReminderEnabled(Boolean(task.reminderEnabled));
    setFormReminderTime(task.reminderTime || task.startTime);
    setFormNotes(task.notes || "");
    setFormError(null);
    setIsEditingTask(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const titleTrimmed = formTitle.trim();
    if (!titleTrimmed) {
      setFormError("Task title is required");
      return;
    }

    if (editingTaskId) {
      // Update existing routine task
      handleUpdateRoutineTask(activeWeekday, editingTaskId, {
        title: titleTrimmed,
        startTime: formStartTime,
        endTime: formEndTime,
        priority: formPriority,
        category: formCategory,
        reminderEnabled: formReminderEnabled,
        reminderTime: formReminderEnabled ? formReminderTime : undefined,
        notes: formNotes.trim() || undefined,
      });
      if (typeof showToast === "function") showToast("Routine task updated", "success");
    } else {
      // Add new routine task
      handleAddRoutineTask(activeWeekday, {
        title: titleTrimmed,
        startTime: formStartTime,
        endTime: formEndTime,
        priority: formPriority,
        category: formCategory,
        reminderEnabled: formReminderEnabled,
        reminderTime: formReminderEnabled ? formReminderTime : undefined,
        notes: formNotes.trim() || undefined,
      });
      if (typeof showToast === "function") showToast("Routine task added", "success");
    }

    if (targetDateStr && typeof contextImportRoutineToDate === "function") {
      setTimeout(() => {
        contextImportRoutineToDate(activeWeekday, targetDateStr, { mode: "missing_only" });
      }, 50);
    }

    resetForm();
  };

  const handleDeleteTask = (taskId: string) => {
    handleDeleteRoutineTask(activeWeekday, taskId);
    if (typeof showToast === "function") showToast("Task removed from routine", "info");
    if (editingTaskId === taskId) {
      resetForm();
    }
  };

  const handleMoveTask = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tasksList.length) return;

    const newOrder = [...tasksList];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    handleReorderRoutineTasks(
      activeWeekday,
      newOrder.map((t) => t.id)
    );
  };

  const handleClose = () => {
    if (targetDateStr && typeof contextImportRoutineToDate === "function" && tasksList.length > 0) {
      contextImportRoutineToDate(activeWeekday, targetDateStr, { mode: "missing_only" });
    }
    onClose();
  };

  if (!shouldRender || !mounted) return null;

  return createPortal(
    <div
      className={`${isExiting ? "motion-exit-fade" : "motion-overlay"} fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md overflow-y-auto pointer-events-auto`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="app-modal-panel relative w-full max-w-3xl my-auto rounded-3xl border flex flex-col shadow-2xl overflow-hidden max-h-[90vh] bg-white dark:bg-[#0f172a] border-slate-200 dark:border-blue-500/25"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.planner.routineTemplates || "Your Routine"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.planner.routineSubtitle || "Create reusable weekly schedules once and import them into any date."}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* WEEKDAY SELECTOR TABS */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            {ALL_WEEKDAYS.map((day) => {
              const isActive = activeWeekday === day.key;
              const dayTemplate = (state.routineTemplates || []).find((tpl) => tpl.weekday === day.key);
              const count = dayTemplate?.tasks?.length || 0;

              return (
                <button
                  key={day.key}
                  onClick={() => {
                    setActiveWeekday(day.key);
                    resetForm();
                  }}
                  className={`flex-1 min-w-[64px] sm:min-w-[80px] py-1.5 px-1.5 rounded-xl text-xs font-semibold flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
                    isActive
                      ? "bg-[#223A5E] text-white shadow-sm border border-[#223A5E]"
                      : "bg-white dark:bg-white/[0.03] text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/[0.06]"
                  }`}
                >
                  <span className="capitalize text-xs font-bold">{day.short}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                      isActive
                        ? "bg-white/20 text-white"
                        : count > 0
                        ? "bg-blue-50 dark:bg-blue-500/15 text-[#223A5E] dark:text-blue-300 font-bold"
                        : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-500"
                    }`}
                  >
                    {count} {count === 1 ? "task" : "tasks"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-white dark:bg-transparent scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
          {/* DAY SUMMARY BAR */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#223A5E] shrink-0"></div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {activeWeekday} Routine
                </h3>
                {summary ? (
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {summary.count} {summary.count === 1 ? "task" : "tasks"} scheduled
                    {summary.timeRange ? ` · ${summary.timeRange}` : ""}
                  </p>
                ) : (
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">No tasks configured for this weekday</p>
                )}
              </div>
            </div>

            {!isEditingTask && (
              <button
                onClick={handleOpenAddForm}
                className="px-3.5 py-1.5 rounded-xl bg-[#223A5E] hover:bg-[#2E4E7B] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#223A5E]/20 cursor-pointer shrink-0"
                title="Add Task to Routine"
                aria-label="Add Task to Routine"
              >
                <Plus className="w-4 h-4" />
                <span>Add Task</span>
              </button>
            )}
          </div>

          {/* INLINE ADD/EDIT FORM */}
          {isEditingTask && (
            <form
              onSubmit={handleSaveTask}
              className="p-4 rounded-2xl border border-slate-200 dark:border-blue-500/25 bg-slate-50 dark:bg-slate-900/95 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  {editingTaskId ? "Edit Task" : "New Task for " + activeWeekday.toUpperCase()}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/5 border border-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-[#223A5E] hover:bg-[#2E4E7B] text-white text-xs font-bold transition-all shadow-md shadow-[#223A5E]/20 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">Task Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Morning Study Block"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 outline-none transition-colors text-xs text-slate-900 dark:text-white focus:border-[#223A5E] placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">Start Time</label>
                  <FocusForgeTimePicker
                    value={formStartTime}
                    onChange={(val) => setFormStartTime(val)}
                    ariaLabel="Start Time"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">End Time</label>
                  <FocusForgeTimePicker
                    value={formEndTime}
                    onChange={(val) => setFormEndTime(val)}
                    ariaLabel="End Time"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">Category</label>
                <input
                  type="text"
                  placeholder="e.g. Study, Work, Health, Personal..."
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 outline-none transition-colors text-xs text-slate-900 dark:text-white focus:border-[#223A5E] placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1 text-slate-700 dark:text-slate-300">Notes / Objectives (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional instructions or checklists..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2 outline-none transition-colors text-xs text-slate-900 dark:text-white focus:border-[#223A5E] resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>
            </form>
          )}

          {/* TASKS LIST */}
          <div className="space-y-2.5">
            {tasksList.length > 0 ? (
              tasksList.map((task, index) => {
                return (
                  <div
                    key={task.id}
                    className="group relative p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-blue-500/15 bg-white dark:bg-slate-900/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-[#223A5E]/40 shadow-xs"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Reorder Buttons (Desktop + Mobile) */}
                      <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                        <button
                          onClick={() => handleMoveTask(index, "up")}
                          disabled={index === 0}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title="Move up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveTask(index, "down")}
                          disabled={index === tasksList.length - 1}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition-colors"
                          title="Move down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Task Info */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">{task.title}</h4>
                          {task.category && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-medium">
                              {task.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1 font-mono text-[11px]">
                            <Clock className="w-3 h-3 text-[#223A5E] dark:text-blue-400" />
                            {formatTime12hr(task.startTime)} – {formatTime12hr(task.endTime)}
                          </span>
                        </div>

                        {task.notes && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2 pt-0.5">{task.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                      <button
                        onClick={() => handleOpenEditForm(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#223A5E] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
                        title="Edit task"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center text-[#223A5E] dark:text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {t.planner.noRoutineForDay || "You haven't created a routine for this day yet."}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm">
                    Add standard recurring tasks like study sessions, workouts, lectures, or focus blocks.
                  </p>
                </div>
                {!isEditingTask && (
                  <button
                    onClick={handleOpenAddForm}
                    className="mt-1 px-4 py-2 rounded-xl bg-[#223A5E] hover:bg-[#2E4E7B] text-white text-xs font-bold transition-all shadow-md shadow-[#223A5E]/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.planner.addTask || "Add Task"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER - SELECTED DATE */}
        {targetDateStr && (
          <div className="flex items-center px-5 py-3 border-t border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-slate-900/60 text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              Selected date: <span className="text-[#223A5E] dark:text-blue-400 font-bold font-mono">{targetDateStr}</span>
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
