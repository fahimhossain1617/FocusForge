"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useAnimateExit } from "../../hooks/useAnimateExit";
import FocusForgeTimePicker from "../ui/FocusForgeTimePicker";
import { X, AlertCircle } from "lucide-react";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDateStr: string; // "YYYY-MM-DD"
}

export default function AddTaskModal({
  isOpen,
  onClose,
  targetDateStr,
}: AddTaskModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { addTask, addTimeBlock, showToast, trackMeaningfulAction } = useAppContext();
  const { t } = useTranslation();
  const { shouldRender, isExiting } = useAnimateExit({ isOpen, durationMs: 200 });

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("11:00");
  const [category, setCategory] = useState("Study");
  const [error, setError] = useState<string | null>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setStartTime("10:00");
      setEndTime("11:00");
      setCategory("Study");
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Task title is required");
      return;
    }

    const taskId = Date.now();
    const effectiveDate = targetDateStr || new Date().toISOString().split("T")[0];

    // Create synchronized task
    addTask({
      id: taskId,
      name: trimmedTitle,
      title: trimmedTitle,
      targetDate: effectiveDate,
      date: effectiveDate,
      time: startTime,
      endTime: endTime,
      priority: "medium",
      reminderEnabled: true,
      reminderTime: startTime,
      category: category.trim() || "General",
      sourceType: "custom",
    });

    addTimeBlock({
      date: effectiveDate,
      startTime: startTime,
      endTime: endTime,
      label: trimmedTitle,
      category: category.trim() || "General",
      isBreak: false,
      taskId: taskId,
      sourceType: "custom",
    });

    if (typeof trackMeaningfulAction === "function") {
      trackMeaningfulAction("create_task");
    }
    if (typeof showToast === "function") {
      showToast(t.planner.addTask ? `${t.planner.addTask} saved` : "Task added successfully", "success");
    }

    onClose();
  };

  if (!shouldRender || !mounted) return null;

  const formattedDate = targetDateStr
    ? new Date(targetDateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/75 backdrop-blur-md overflow-y-auto pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="app-modal-panel relative w-full max-w-lg my-auto rounded-3xl border flex flex-col shadow-2xl overflow-hidden bg-white dark:bg-[#0f172a] border-slate-200 dark:border-blue-500/25"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t.planner.addTask || "Add Task"}
            </h2>
            {formattedDate && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                {formattedDate}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">Task Title *</label>
            <input
              type="text"
              placeholder="e.g. Study Mathematics / Complete Project Report"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-3 outline-none transition-colors text-sm text-slate-900 dark:text-white focus:border-[#223A5E] placeholder-slate-400 dark:placeholder-slate-500"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">
                Start Time
              </label>
              <FocusForgeTimePicker
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                ariaLabel="Start Time"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">
                End Time
              </label>
              <FocusForgeTimePicker
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                ariaLabel="End Time"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2 text-slate-700 dark:text-slate-300">Category</label>
            <input
              type="text"
              placeholder="e.g. Study, Work, Programming, Health"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-xl px-4 py-3 outline-none transition-colors text-sm text-slate-900 dark:text-white focus:border-[#223A5E] placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#223A5E] hover:bg-[#2E4E7B] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-[#223A5E]/20 cursor-pointer"
            >
              Save Task
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
