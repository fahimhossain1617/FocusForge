"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { useAnimateExit } from "../../hooks/useAnimateExit";
import { formatTime12hr } from "../../utils/timeUtils";
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle
} from "lucide-react";

interface CopyTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDateStr: string; // The destination date from Planner (YYYY-MM-DD)
}

// Timezone-safe local date formatting helpers
function formatLocalDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

type PopoverViewMode = 'Weekly' | 'Monthly';
type PopoverSubView = 'Calendar' | 'MonthPicker' | 'YearPicker';

export default function CopyTasksModal({
  isOpen,
  onClose,
  targetDateStr,
}: CopyTasksModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { state, copyTasksToDate, showToast, trackMeaningfulAction } = useAppContext();
  const { t } = useTranslation();
  const { shouldRender } = useAnimateExit({ isOpen, durationMs: 200 });

  const realToday = useMemo(() => formatLocalDate(new Date()), []);

  // Destination date fixed to targetDateStr or today
  const destinationDate = targetDateStr || realToday;
  
  // Source date state
  const initialSourceDate = targetDateStr || realToday;
  const [sourceDate, setSourceDate] = useState<string>(initialSourceDate);

  // Date strip start date (shows 7 days starting from this date)
  const [stripStartDate, setStripStartDate] = useState<Date>(() => {
    const d = parseLocalDate(initialSourceDate);
    d.setDate(d.getDate() - 3);
    return d;
  });

  // Calendar Popover state
  const [showCalendarPopover, setShowCalendarPopover] = useState(false);
  const [popoverViewMode, setPopoverViewMode] = useState<PopoverViewMode>('Monthly');
  const [popoverSubView, setPopoverSubView] = useState<PopoverSubView>('Calendar');
  const [popoverViewDate, setPopoverViewDate] = useState<Date>(() => parseLocalDate(initialSourceDate));
  const popoverRef = useRef<HTMLDivElement>(null);

  // Selected tasks IDs from source date
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string | number>>(new Set());
  const [isCopying, setIsCopying] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultDest = targetDateStr || formatLocalDate(new Date());
      setSourceDate(defaultDest);
      const d = parseLocalDate(defaultDest);
      d.setDate(d.getDate() - 3);
      setStripStartDate(d);
      setPopoverViewDate(parseLocalDate(defaultDest));
      setPopoverViewMode('Monthly');
      setPopoverSubView('Calendar');
      setSelectedTaskIds(new Set());
      setIsCopying(false);
      setShowCalendarPopover(false);
    }
  }, [isOpen, targetDateStr]);

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCalendarPopover(false);
      }
    };
    if (showCalendarPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCalendarPopover]);

  // Set of dates that contain tasks across the entire app
  const datesWithTasks = useMemo(() => {
    const taskDates = new Set<string>();
    (state.tasks || []).forEach((t) => {
      if (t.targetDate) taskDates.add(t.targetDate);
      if (t.date) taskDates.add(t.date);
    });
    (state.timeBlocks || []).forEach((b) => {
      if (b.date) taskDates.add(b.date);
    });
    return taskDates;
  }, [state.tasks, state.timeBlocks]);

  // Map of date -> count of tasks (for badge display)
  const taskCountByDate = useMemo(() => {
    const counts = new Map<string, number>();
    (state.tasks || []).forEach((t) => {
      const d = t.targetDate || t.date;
      if (d) counts.set(d, (counts.get(d) || 0) + 1);
    });
    return counts;
  }, [state.tasks]);

  // Generate 7 days for the Date Strip
  const stripDays = useMemo(() => {
    const days: Array<{
      dateStr: string;
      dayNum: number;
      weekdayShort: string;
      monthShort: string;
      isToday: boolean;
      isSelected: boolean;
      hasTasks: boolean;
      taskCount: number;
    }> = [];

    const base = new Date(stripStartDate.getFullYear(), stripStartDate.getMonth(), stripStartDate.getDate());
    const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const dateStr = formatLocalDate(d);
      days.push({
        dateStr,
        dayNum: d.getDate(),
        weekdayShort: weekdayNames[d.getDay()],
        monthShort: monthNamesShort[d.getMonth()],
        isToday: dateStr === realToday,
        isSelected: dateStr === sourceDate,
        hasTasks: datesWithTasks.has(dateStr),
        taskCount: taskCountByDate.get(dateStr) || 0,
      });
    }

    return days;
  }, [stripStartDate, sourceDate, realToday, datesWithTasks, taskCountByDate]);

  // Select a source date and center the strip
  const handleSelectSourceDate = (dateStr: string) => {
    setSourceDate(dateStr);
    const d = parseLocalDate(dateStr);
    setPopoverViewDate(d);
    
    // Always center strip around selected date (3 days before, selected day, 3 days after)
    const centered = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 3);
    setStripStartDate(centered);
  };

  const handlePrevDay = () => {
    const d = parseLocalDate(sourceDate);
    d.setDate(d.getDate() - 1);
    handleSelectSourceDate(formatLocalDate(d));
  };

  const handleNextDay = () => {
    const d = parseLocalDate(sourceDate);
    d.setDate(d.getDate() + 1);
    handleSelectSourceDate(formatLocalDate(d));
  };

  const shiftStrip = (days: number) => {
    const d = parseLocalDate(sourceDate);
    d.setDate(d.getDate() + days);
    handleSelectSourceDate(formatLocalDate(d));
  };

  const jumpToToday = () => {
    handleSelectSourceDate(realToday);
  };

  // Popover calendar helpers
  const popYear = popoverViewDate.getFullYear();
  const popMonth = popoverViewDate.getMonth();
  const daysInPopMonth = new Date(popYear, popMonth + 1, 0).getDate();
  const firstDayOfPopMonth = new Date(popYear, popMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const changePopoverMonth = (offset: number) => {
    setPopoverViewDate(new Date(popYear, popMonth + offset, 1));
  };

  // Render Popover Subviews
  const renderPopoverMonthPicker = () => (
    <div className="grid grid-cols-3 gap-1.5 p-1">
      {monthNamesShort.map((m, i) => (
        <button
          key={m}
          onClick={() => {
            setPopoverViewDate(new Date(popYear, i, 1));
            setPopoverSubView('Calendar');
          }}
          className={`py-1.5 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            i === popMonth
              ? 'bg-[#223A5E] dark:bg-blue-600 text-white shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white'
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );

  const renderPopoverYearPicker = () => {
    const startYear = popYear - 5;
    return (
      <div className="grid grid-cols-3 gap-1.5 p-1 max-h-[150px] overflow-y-auto scrollbar-thin">
        {Array.from({ length: 12 }).map((_, i) => {
          const y = startYear + i;
          return (
            <button
              key={y}
              onClick={() => {
                setPopoverViewDate(new Date(y, popMonth, 1));
                setPopoverSubView('MonthPicker');
              }}
              className={`py-1.5 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                y === popYear
                  ? 'bg-[#223A5E] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white'
              }`}
            >
              {y}
            </button>
          );
        })}
      </div>
    );
  };

  const renderPopoverCalendarGrid = () => {
    const days = [];
    const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    if (popoverViewMode === 'Monthly') {
      // Padding before first day (Sunday-based)
      for (let i = 0; i < firstDayOfPopMonth; i++) {
        days.push(<div key={`pad-${i}`} className="h-6 w-6" />);
      }

      // Days of the month
      for (let day = 1; day <= daysInPopMonth; day++) {
        const d = new Date(popYear, popMonth, day);
        const dateStr = formatLocalDate(d);
        const isSelected = dateStr === sourceDate;
        const isToday = dateStr === realToday;
        const hasTasks = datesWithTasks.has(dateStr);

        days.push(
          <button
            key={day}
            onClick={() => {
              handleSelectSourceDate(dateStr);
              setShowCalendarPopover(false);
            }}
            className={`relative h-6 w-6 rounded-full text-xs font-medium flex items-center justify-center transition-all cursor-pointer mx-auto ${
              isSelected
                ? 'bg-[#223A5E] dark:bg-blue-600 text-white font-bold shadow-xs'
                : isToday
                ? 'border border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 font-bold'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white'
            }`}
          >
            <span>{day}</span>
            {hasTasks && (
              <span
                className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                  isSelected ? 'bg-white' : 'bg-blue-500 dark:bg-blue-400'
                }`}
              />
            )}
          </button>
        );
      }
    } else {
      // Weekly View Mode: 7 days around popoverViewDate
      const startOfWeek = new Date(popoverViewDate);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
        const dateStr = formatLocalDate(d);
        const isSelected = dateStr === sourceDate;
        const isToday = dateStr === realToday;
        const hasTasks = datesWithTasks.has(dateStr);

        days.push(
          <button
            key={i}
            onClick={() => {
              handleSelectSourceDate(dateStr);
              setShowCalendarPopover(false);
            }}
            className={`relative h-6 w-6 rounded-full text-xs font-medium flex items-center justify-center transition-all cursor-pointer mx-auto ${
              isSelected
                ? 'bg-[#223A5E] dark:bg-blue-600 text-white font-bold shadow-xs'
                : isToday
                ? 'border border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/15 font-bold'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-white'
            }`}
          >
            <span>{d.getDate()}</span>
            {hasTasks && (
              <span
                className={`w-1 h-1 rounded-full absolute bottom-0.5 ${
                  isSelected ? 'bg-white' : 'bg-blue-500 dark:bg-blue-400'
                }`}
              />
            )}
          </button>
        );
      }
    }

    return (
      <div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {daysOfWeek.map((d, i) => (
            <span key={i} className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
      </div>
    );
  };

  // Tasks for current sourceDate
  const sourceDateTasks = useMemo(() => {
    const tasksOnDate = (state.tasks || []).filter(
      (t) => t.targetDate === sourceDate || t.date === sourceDate
    );
    const blocksOnDate = (state.timeBlocks || []).filter((b) => b.date === sourceDate);

    const combined: Array<{
      id: string | number;
      title: string;
      startTime: string;
      endTime: string;
      category: string;
      priority: string;
      isBreak: boolean;
      notes: string;
    }> = [];

    const seenIds = new Set<string>();

    tasksOnDate.forEach((t) => {
      const matchingBlock = blocksOnDate.find((b) => String(b.taskId) === String(t.id));
      seenIds.add(String(t.id));
      combined.push({
        id: t.id,
        title: t.title || t.name || "Untitled Task",
        startTime: t.time || matchingBlock?.startTime || "10:00",
        endTime: t.endTime || matchingBlock?.endTime || "11:00",
        category: t.category || matchingBlock?.category || "General",
        priority: t.priority || "medium",
        isBreak: Boolean(matchingBlock?.isBreak),
        notes: t.notes || t.description || "",
      });
    });

    blocksOnDate.forEach((b) => {
      if (b.taskId && seenIds.has(String(b.taskId))) return;
      if (seenIds.has(String(b.id))) return;
      seenIds.add(String(b.id));
      combined.push({
        id: b.id,
        title: b.label || "Untitled Task",
        startTime: b.startTime || "10:00",
        endTime: b.endTime || "11:00",
        category: b.category || "General",
        priority: "medium",
        isBreak: Boolean(b.isBreak),
        notes: "",
      });
    });

    return combined.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [state.tasks, state.timeBlocks, sourceDate]);

  // Check destination tasks for duplicate detection
  const destinationTasks = useMemo(() => {
    const dTasks = (state.tasks || []).filter(
      (t) => t.targetDate === destinationDate || t.date === destinationDate
    );
    const dBlocks = (state.timeBlocks || []).filter((b) => b.date === destinationDate);
    return { dTasks, dBlocks };
  }, [state.tasks, state.timeBlocks, destinationDate]);

  const isTaskDuplicateOnDestination = (title: string, startTime: string) => {
    const normTitle = title.trim().toLowerCase();
    const hasTask = destinationTasks.dTasks.some(
      (t) => (t.title || t.name || "").trim().toLowerCase() === normTitle && t.time === startTime
    );
    const hasBlock = destinationTasks.dBlocks.some(
      (b) => (b.label || "").trim().toLowerCase() === normTitle && b.startTime === startTime
    );
    return hasTask || hasBlock;
  };

  // Selection handlers
  const handleToggleTask = (id: string | number) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allIds = sourceDateTasks.map((t) => t.id);
    setSelectedTaskIds(new Set(allIds));
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  // Category badge colors matching Focus Forge
  const getBadgeColor = (category: string, isBreak: boolean) => {
    if (isBreak) return "bg-gray-100 dark:bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-500/30";
    if (!category) return "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30";
    const colors = [
      "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30",
      "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/30",
      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30",
      "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30",
      "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/30",
    ];
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  // Handle Copy Execution
  const handleCopyTasks = async () => {
    if (selectedTaskIds.size === 0) {
      showToast(t.planner.noTasksSelected || "Please select at least one task to copy", "info");
      return;
    }

    setIsCopying(true);
    try {
      const idsArray = Array.from(selectedTaskIds);
      const result = copyTasksToDate({
        taskIds: idsArray,
        sourceDateStr: sourceDate,
        destinationDateStr: destinationDate,
        skipDuplicates: true,
      });

      if (result.copiedCount > 0) {
        showToast(
          `${result.copiedCount} task${result.copiedCount > 1 ? "s" : ""} copied`,
          "success"
        );
        if (typeof trackMeaningfulAction === "function") {
          trackMeaningfulAction("copy_tasks");
        }
        onClose();
      } else if (result.skippedCount > 0) {
        showToast(
          "Selected tasks already exist on destination date.",
          "info"
        );
      }
    } catch (err) {
      console.error("[CopyTasksModal] Error copying tasks:", err);
      showToast("Failed to copy tasks. Please try again.", "error");
    } finally {
      setIsCopying(false);
    }
  };

  if (!shouldRender || !mounted) return null;

  const parsedSource = parseLocalDate(sourceDate);
  const formattedSourceHeader = parsedSource.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
  const formattedSourceDateShort = parsedSource.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const selectedCount = selectedTaskIds.size;
  const isLightMode = state.theme?.mode === "light";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 dark:bg-black/75 backdrop-blur-md pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-theme={isLightMode ? "light" : "dark"}
        className="app-modal-panel relative w-full max-w-[420px] rounded-2xl border flex flex-col shadow-2xl overflow-hidden bg-white dark:bg-[#0c1424] border-[#DCE5F0] dark:border-blue-500/25 max-h-[85vh] my-auto"
      >
        {/* COMPACT MODAL HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#DCE5F0] dark:border-white/[0.08] bg-[#F7FAFE] dark:bg-white/[0.02]">
          <div>
            <h2 className="text-sm font-bold text-[#111827] dark:text-white tracking-tight leading-none">
              {t.planner.copyTasksModalTitle || "Copy Tasks"}
            </h2>
            <p className="text-[10px] text-[#52627A] dark:text-slate-400 mt-0.5 font-medium">
              {t.planner.selectTasksFrom || "Select tasks from another date"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white dark:bg-white/5 hover:bg-[#F3F7FC] dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 flex items-center justify-center text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* DATE STRIP & POPOVER NAVIGATION SECTION */}
        <div className="relative px-4 pt-2.5 pb-2 border-b border-[#DCE5F0] dark:border-white/[0.08] bg-[#F7FAFE] dark:bg-black/20">
          
          {/* Navigation Bar (Month display + Popover Trigger + Today) */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="relative flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#111827] dark:text-white">
                {parsedSource.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
              
              {/* Calendar Popover Trigger Button */}
              <button
                type="button"
                onClick={() => setShowCalendarPopover(!showCalendarPopover)}
                className={`w-6 h-6 rounded-lg border text-xs transition-all cursor-pointer flex items-center justify-center ${
                  showCalendarPopover
                    ? "bg-[#223A5E] dark:bg-blue-600 text-white border-transparent shadow-xs"
                    : "bg-white dark:bg-slate-800 border-[#DCE5F0] dark:border-white/10 text-[#52627A] dark:text-slate-300 hover:text-[#223A5E] dark:hover:text-blue-400 hover:border-[#5B8DEF]"
                }`}
                aria-label="Open Calendar Picker"
                title="Open Calendar Picker"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
              </button>

              {/* CALENDAR POPOVER */}
              {showCalendarPopover && (
                <div
                  ref={popoverRef}
                  className="calendar-popover absolute top-full left-0 mt-1 z-50 w-[265px] overflow-hidden rounded-2xl bg-white dark:bg-[#0c1424] border border-[#DCE5F0] dark:border-blue-500/25 shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Segmented Mode Tabs (Weekly / Monthly) */}
                  <div className="flex items-center justify-between p-1 m-1.5 rounded-xl bg-[#F3F7FC] dark:bg-[#070c16] border border-[#DCE5F0] dark:border-transparent">
                    {(['Weekly', 'Monthly'] as PopoverViewMode[]).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setPopoverViewMode(tab);
                          setPopoverSubView('Calendar');
                        }}
                        className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                          popoverViewMode === tab
                            ? 'bg-[#223A5E] dark:bg-blue-600 text-white font-bold shadow-xs'
                            : 'text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Month/Year Navigation Header */}
                  {popoverSubView === 'Calendar' && (
                    <div className="flex items-center justify-between px-2.5 py-1 border-b border-[#DCE5F0] dark:border-white/[0.05]">
                      <button
                        type="button"
                        onClick={() => changePopoverMonth(-1)}
                        className="p-1 hover:bg-[#F3F7FC] dark:hover:bg-white/10 rounded-lg text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer"
                        aria-label="Previous Month"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPopoverSubView('MonthPicker')}
                          className="text-xs font-bold text-[#111827] dark:text-white hover:text-[#5B8DEF] dark:hover:text-blue-400 transition-colors cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-[#F3F7FC] dark:hover:bg-white/5"
                        >
                          {monthNamesShort[popMonth]}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPopoverSubView('YearPicker')}
                          className="text-xs font-bold text-[#111827] dark:text-white hover:text-[#5B8DEF] dark:hover:text-blue-400 transition-colors cursor-pointer px-1.5 py-0.5 rounded-md hover:bg-[#F3F7FC] dark:hover:bg-white/5"
                        >
                          {popYear}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => changePopoverMonth(1)}
                        className="p-1 hover:bg-[#F3F7FC] dark:hover:bg-white/10 rounded-lg text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer"
                        aria-label="Next Month"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Popover Content */}
                  <div className="p-2 bg-white dark:bg-[#0c1424]">
                    {popoverSubView === 'MonthPicker'
                      ? renderPopoverMonthPicker()
                      : popoverSubView === 'YearPicker'
                      ? renderPopoverYearPicker()
                      : renderPopoverCalendarGrid()}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={jumpToToday}
              className="text-[11px] font-bold text-[#5B8DEF] hover:text-[#223A5E] dark:text-blue-400 hover:underline px-2 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
            >
              {t.planner.today || "Today"}
            </button>
          </div>

          {/* Horizontal Date Strip with Flanking Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Left Circular Navigation Button */}
            <button
              type="button"
              onClick={handlePrevDay}
              className="w-7 h-7 rounded-full bg-white dark:bg-white/5 hover:bg-[#F3F7FC] dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 flex items-center justify-center text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white transition-all cursor-pointer shrink-0 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]"
              aria-label="Previous Day"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* 7-Day Date Strip */}
            <div className="flex-1 grid grid-cols-7 gap-1 overflow-x-auto py-0.5">
              {stripDays.map((day) => (
                <button
                  key={day.dateStr}
                  type="button"
                  onClick={() => handleSelectSourceDate(day.dateStr)}
                  className={`relative py-1.5 px-0.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer group ${
                    day.isSelected
                      ? "bg-[#223A5E] dark:bg-blue-600 text-white font-bold shadow-xs scale-[1.02]"
                      : day.isToday
                      ? "bg-blue-50 dark:bg-blue-500/15 border border-[#5B8DEF]/40 dark:border-blue-500/30 text-[#223A5E] dark:text-blue-400 font-bold"
                      : "bg-white dark:bg-slate-900/60 border border-[#DCE5F0] dark:border-white/5 text-[#111827] dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:bg-[#F7FAFE] dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`text-[9px] uppercase tracking-wider font-semibold ${
                    day.isSelected ? "text-blue-100" : day.isToday ? "text-[#5B8DEF] dark:text-blue-400 font-bold" : "text-[#8290A5] dark:text-slate-500"
                  }`}>
                    {day.weekdayShort}
                  </span>
                  
                  <span className={`text-xs font-bold mt-0.5 ${day.isSelected ? "!text-white text-white" : ""}`}>
                    {String(day.dayNum).padStart(2, "0")}
                  </span>

                  {/* Task Indicator Dot */}
                  <div className="h-1 flex items-center justify-center mt-0.5">
                    {day.hasTasks && (
                      <span
                        className={`w-1 h-1 rounded-full ${
                          day.isSelected ? "bg-white shadow-xs" : "bg-[#5B8DEF] dark:bg-blue-400"
                        }`}
                        title={`${day.taskCount} task${day.taskCount > 1 ? "s" : ""}`}
                      />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Right Circular Navigation Button */}
            <button
              type="button"
              onClick={handleNextDay}
              className="w-7 h-7 rounded-full bg-white dark:bg-white/5 hover:bg-[#F3F7FC] dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 flex items-center justify-center text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white transition-all cursor-pointer shrink-0 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]"
              aria-label="Next Day"
              title="Next Day"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* TASK PREVIEW & SELECTION AREA (Scrollable Content) */}
        <div className="p-3.5 overflow-y-auto flex-1 max-h-[260px] bg-white dark:bg-transparent scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
          
          {/* Section Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#8290A5] dark:text-slate-500">
                {t.planner.tasksFrom || "Tasks from"}
              </span>
              <div className="text-xs font-bold text-[#111827] dark:text-white">
                {formattedSourceDateShort}
              </div>
            </div>

            {sourceDateTasks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSelectAll}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#F3F7FC] dark:bg-white/5 hover:bg-[#E8F1FC] dark:hover:bg-white/10 text-[#223A5E] dark:text-slate-300 border border-[#DCE5F0] dark:border-transparent transition-colors cursor-pointer"
                >
                  {t.planner.selectAll || "Select All"}
                </button>
                <button
                  onClick={handleClearSelection}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-[#52627A] hover:text-[#111827] dark:hover:text-slate-200 hover:bg-[#F3F7FC] dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {t.planner.clearSelection || "Clear"}
                </button>
              </div>
            )}
          </div>

          {/* Tasks List */}
          {sourceDateTasks.length > 0 ? (
            <div className="space-y-1.5">
              {sourceDateTasks.map((task) => {
                const isSelected = selectedTaskIds.has(task.id);
                const isDuplicate = isTaskDuplicateOnDestination(task.title, task.startTime);

                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`group relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? "bg-[#F0F6FF] dark:bg-blue-500/10 border-[#5B8DEF]/50 dark:border-blue-400/50 shadow-xs"
                        : "bg-white dark:bg-slate-900/50 border-[#DCE5F0] dark:border-white/5 hover:border-[#B8CCE4] dark:hover:border-white/15 hover:bg-[#F7FAFE]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {/* Custom Checkbox */}
                      <div
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                          isSelected
                            ? "bg-[#223A5E] dark:bg-blue-600 border-[#223A5E] dark:border-blue-600 text-white shadow-xs"
                            : "border-[#DCE5F0] dark:border-slate-600 bg-white dark:bg-slate-800 group-hover:border-[#5B8DEF]"
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <h4
                            className={`text-xs font-semibold truncate ${
                              isSelected ? "text-[#223A5E] dark:text-blue-100 font-bold" : "text-[#111827] dark:text-slate-200"
                            }`}
                            title={task.title}
                          >
                            {task.title}
                          </h4>

                          {task.category && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider font-semibold border shrink-0 ${getBadgeColor(
                                task.category,
                                task.isBreak
                              )}`}
                            >
                              {task.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 text-[10px] text-[#52627A] dark:text-slate-400 font-mono">
                            <Clock className="w-2.5 h-2.5 text-[#5B8DEF] dark:text-blue-400 shrink-0" />
                            {formatTime12hr(task.startTime)} – {formatTime12hr(task.endTime)}
                          </span>

                          {isDuplicate && (
                            <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.2 rounded flex items-center gap-0.5 font-medium ml-auto shrink-0">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Duplicate
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Compact Empty State */
            <div className="py-6 px-3 text-center bg-[#F7FAFE] dark:bg-white/[0.02] border border-dashed border-[#DCE5F0] dark:border-white/10 rounded-xl flex flex-col items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-[#8290A5] dark:text-slate-500 mb-1.5 stroke-[1.5]" />
              <p className="text-xs font-semibold text-[#111827] dark:text-slate-300">
                {t.planner.noTasksForDate || "No tasks found for this date."}
              </p>
              <p className="text-[10px] text-[#52627A] dark:text-slate-500 mt-0.5">
                {t.planner.chooseAnotherDate || "Choose another date on the strip above."}
              </p>
            </div>
          )}
        </div>

        {/* COMPACT LIGHT THEME MATCHED FOOTER */}
        <div className="px-4 py-2.5 border-t border-[#DCE5F0] dark:border-white/10 bg-[#F7FAFE] dark:bg-[#0c1424] flex items-center justify-end">
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border border-[#DCE5F0] dark:border-white/10 bg-white dark:bg-slate-800 text-[#223A5E] dark:text-slate-300 hover:bg-[#F3F7FC] dark:hover:bg-slate-700 transition-all text-center cursor-pointer"
            >
              {t.planner.cancel || "Cancel"}
            </button>
            <button
              type="button"
              disabled={selectedCount === 0 || isCopying}
              onClick={handleCopyTasks}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#223A5E] hover:bg-[#2E4E7B] dark:bg-blue-600 dark:hover:bg-blue-500 text-white transition-all text-center cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isCopying ? "..." : "Copy"}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
