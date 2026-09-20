"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import EmptyState from "../ui/EmptyState";
import CalendarWidget from "../ui/CalendarWidget";
import { ChevronLeft, ChevronRight, Plus, X, AlignLeft, Calendar as CalendarIcon, Clock, Bell, Layers, Sparkles, Copy } from "lucide-react";
import { useAnimateExit } from "../../hooks/useAnimateExit";
import FocusForgeTimePicker from "../ui/FocusForgeTimePicker";
import AddTaskModal from "../planner/AddTaskModal";
import CopyTasksModal from "../planner/CopyTasksModal";
import PlannerEmptyIllustration from "../planner/PlannerEmptyIllustration";
import { Weekday } from "../../types";
import { formatTime12hr } from "../../utils/timeUtils";

export default function PlannerPage() {
  const { state, addTimeBlock, deleteTimeBlock, updateTimeBlock, addTask, deleteTask } = useAppContext();
  const { t } = useTranslation();
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const drawerContentRef = useRef<HTMLDivElement>(null);
  
  // Timezone-safe local date formatting helpers
  const formatLocalDate = (d: Date = new Date()): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const parseLocalDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const getWeekdayFromDate = (dateStr: string): Weekday => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const mapping: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return mapping[date.getDay()] || 'monday';
  };

  // Calendar Engine State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [realToday, setRealToday] = useState<string>(formatLocalDate(new Date()));
  
  // Side Drawer & Highlight State
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatLocalDate(new Date()));
  const [drawerDateStr, setDrawerDateStr] = useState<string | null>(null);

  // Modals State
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showCopyTasksModal, setShowCopyTasksModal] = useState(false);

  // Handle cross-navigation from Dashboard (e.g. 3-dots on a task)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const applySelectedDate = (dateStr: string, openDrawer: boolean = false) => {
      setSelectedDateStr(dateStr);
      setCurrentDate(parseLocalDate(dateStr));
      if (openDrawer) {
        setDrawerDateStr(dateStr);
      }
    };

    const handleOpenDate = (e: any) => {
      if (e.detail?.date) {
        applySelectedDate(e.detail.date, Boolean(e.detail.openDrawer));
      }
    };

    window.addEventListener("focusforge:open_planner_date", handleOpenDate);

    // Check sessionStorage on mount
    const savedDate = sessionStorage.getItem("focusforge_planner_selected_date");
    const shouldOpenDrawer = sessionStorage.getItem("focusforge_planner_open_drawer");
    if (savedDate) {
      applySelectedDate(savedDate, shouldOpenDrawer === "true");
      sessionStorage.removeItem("focusforge_planner_selected_date");
      sessionStorage.removeItem("focusforge_planner_open_drawer");
    }

    return () => {
      window.removeEventListener("focusforge:open_planner_date", handleOpenDate);
    };
  }, []);
  
  // Form State inside Drawer
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newStart, setNewStart] = useState("18:00");
  const [newEnd, setNewEnd] = useState("19:00");
  const [newLabel, setNewLabel] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newIsBreak, setNewIsBreak] = useState(false);
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium");
  const [newReminderEnabled, setNewReminderEnabled] = useState(false);
  const [newReminderTime, setNewReminderTime] = useState("09:00");

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    e.dataTransfer.setData("blockId", blockId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const blockId = e.dataTransfer.getData("blockId");
    if (blockId) {
      updateTimeBlock(blockId, { date: targetDate });
    }
  };

  // Auto-refresh "Today" at midnight
  useEffect(() => {
    const interval = setInterval(() => {
      const now = formatLocalDate(new Date());
      if (now !== realToday) {
        setRealToday(now);
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [realToday]);

  // Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  
  // Adjust so Monday is first day of week (0 = Mon, 6 = Sun)
  const firstDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

  const calendarDays = useMemo(() => {
    const days = [];
    
    // Previous Month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOffset - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      const dateStr = formatLocalDate(d);
      days.push({ dayNum: prevMonthDays - i, isCurrentMonth: false, dateStr });
    }
    
    // Current Month
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = formatLocalDate(d);
      days.push({ dayNum: i, isCurrentMonth: true, dateStr });
    }
    
    // Next Month padding (fill up to exact weeks: 35 or 42 cells depending on need)
    const totalCellsNeeded = days.length > 35 ? 42 : 35;
    const remaining = totalCellsNeeded - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = formatLocalDate(d);
      days.push({ dayNum: i, isCurrentMonth: false, dateStr });
    }
    
    return days;
  }, [year, month, daysInMonth, firstDayOffset]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const changeMonth = (offset: number) => {
    const newDate = new Date(year, month + offset, 1);
    const currentSelectedDay = parseLocalDate(selectedDateStr).getDate();
    const maxDaysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    const clampedDay = Math.min(currentSelectedDay, maxDaysInNewMonth);
    const newSelectedDate = new Date(newDate.getFullYear(), newDate.getMonth(), clampedDay);
    
    setCurrentDate(newDate);
    setSelectedDateStr(formatLocalDate(newSelectedDate));
  };

  const jumpToToday = () => {
    const now = new Date();
    const todayStr = formatLocalDate(now);
    setCurrentDate(now);
    setSelectedDateStr(todayStr);
  };

  const handleOpenDrawer = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setDrawerDateStr(dateStr);
    setShowAddBlock(false);
  };

  const handleAddBlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !drawerDateStr) return;

    const taskId = Date.now();
    const taskTitle = newLabel.trim();

    // Create synchronized task with reminders
    addTask({
      id: taskId,
      name: taskTitle,
      title: taskTitle,
      targetDate: drawerDateStr,
      date: drawerDateStr,
      time: newStart,
      priority: newPriority,
      reminderEnabled: newReminderEnabled,
      reminderTime: newReminderEnabled ? (newReminderTime || newStart) : undefined,
      category: newCategory,
    });

    addTimeBlock({
      date: drawerDateStr,
      startTime: newStart,
      endTime: newEnd,
      label: taskTitle,
      category: newCategory,
      isBreak: newIsBreak,
      taskId: taskId,
    });

    setNewLabel("");
    setNewReminderEnabled(false);
    setShowAddBlock(false);
  };

  // Pure task data isolation: Get strictly isolated tasks & timeblocks for a specific date
  const getItemsForDay = useMemo(() => {
    return (dateStr: string) => {
      const tasksOnDate = (state.tasks || []).filter(
        (t) => t.targetDate === dateStr || t.date === dateStr
      );
      const blocksOnDate = (state.timeBlocks || []).filter((b) => b.date === dateStr);

      const combined: Array<{
        id: string | number;
        taskId?: number | string;
        blockId?: string;
        label: string;
        startTime: string;
        endTime: string;
        category: string;
        priority?: string;
        isBreak: boolean;
        completed: boolean;
        sourceType?: string;
      }> = [];

      const seenTaskIds = new Set<string>();
      const seenBlockIds = new Set<string>();

      blocksOnDate.forEach((b) => {
        seenBlockIds.add(String(b.id));
        const linkedTask = b.taskId
          ? (state.tasks || []).find((t) => String(t.id) === String(b.taskId))
          : undefined;
        if (linkedTask) {
          seenTaskIds.add(String(linkedTask.id));
        }
        combined.push({
          id: b.id,
          taskId: b.taskId,
          blockId: b.id,
          label: b.label || linkedTask?.name || linkedTask?.title || "Untitled Task",
          startTime: b.startTime || "10:00",
          endTime: b.endTime || "11:00",
          category: b.category || linkedTask?.category || "General",
          priority: linkedTask?.priority || "medium",
          isBreak: Boolean(b.isBreak),
          completed: Boolean(linkedTask?.completed || linkedTask?.status === "completed"),
          sourceType: b.sourceType || linkedTask?.sourceType,
        });
      });

      tasksOnDate.forEach((t) => {
        if (seenTaskIds.has(String(t.id))) return;
        seenTaskIds.add(String(t.id));
        combined.push({
          id: `task-${t.id}`,
          taskId: t.id,
          blockId: undefined,
          label: t.title || t.name || "Untitled Task",
          startTime: t.time || "10:00",
          endTime: t.endTime || "11:00",
          category: t.category || "General",
          priority: t.priority || "medium",
          isBreak: false,
          completed: Boolean(t.completed || t.status === "completed"),
          sourceType: t.sourceType,
        });
      });

      return combined.sort((a, b) => a.startTime.localeCompare(b.startTime));
    };
  }, [state.tasks, state.timeBlocks]);

  // Items for selected date (highlight cards)
  const selectedDayItems = useMemo(
    () => getItemsForDay(selectedDateStr),
    [getItemsForDay, selectedDateStr]
  );
  
  // Items for drawer date with exit persistence
  const [lastActiveDrawerDate, setLastActiveDrawerDate] = useState<string | null>(null);
  useEffect(() => {
    if (drawerDateStr) {
      setLastActiveDrawerDate(drawerDateStr);
      if (drawerContentRef.current) {
        drawerContentRef.current.scrollTop = 0;
      }
    }
  }, [drawerDateStr]);
  const activeDrawerDate = drawerDateStr || lastActiveDrawerDate;
  const drawerDayItems = useMemo(
    () => (activeDrawerDate ? getItemsForDay(activeDrawerDate) : []),
    [getItemsForDay, activeDrawerDate]
  );
  const drawerAnim = useAnimateExit({ isOpen: Boolean(drawerDateStr), durationMs: 220 });

  const getBadgeColor = (category: string, isBreak: boolean) => {
    if (isBreak) return 'bg-slate-400 dark:bg-slate-500';
    if (!category) return 'bg-[#5B8DEF] dark:bg-blue-400';
    const colors = [
      'bg-[#5B8DEF] dark:bg-blue-400',
      'bg-[#3B82F6] dark:bg-blue-500',
      'bg-[#0EA5E9] dark:bg-sky-400',
      'bg-[#10B981] dark:bg-emerald-400',
      'bg-[#6366F1] dark:bg-indigo-400',
    ];
    let hash = 0;
    for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const jumpToDay = (offsetFromSelected: number) => {
    const d = parseLocalDate(selectedDateStr);
    d.setDate(d.getDate() + offsetFromSelected);
    const dateStr = formatLocalDate(d);
    
    // Also update calendar month view if we jump across a month or year boundary
    if (d.getMonth() !== currentDate.getMonth() || d.getFullYear() !== currentDate.getFullYear()) {
      setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    setSelectedDateStr(dateStr);
  };

  const formatShortDate = (dateString: string) => {
    const d = parseLocalDate(dateString);
    
    if (dateString === realToday) return t.planner.today;
    
    const dYesterday = parseLocalDate(realToday);
    dYesterday.setDate(dYesterday.getDate() - 1);
    if (dateString === formatLocalDate(dYesterday)) return t.planner.yesterday;
    
    const dTomorrow = parseLocalDate(realToday);
    dTomorrow.setDate(dTomorrow.getDate() + 1);
    if (dateString === formatLocalDate(dTomorrow)) return t.planner.tomorrow;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Calculate prev, current, next for the carousel
  const prevDate = parseLocalDate(selectedDateStr);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = formatLocalDate(prevDate);

  const nextDate = parseLocalDate(selectedDateStr);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = formatLocalDate(nextDate);

  return (
    <div className="planner-premium motion-page relative w-full min-h-[calc(100vh-80px)]">
      
      <div className="motion-stagger relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 pb-20 h-full flex flex-col">
        
        {/* HEADER */}
        <div className="relative z-50 mb-6 sm:mb-8">
          <h1 className="text-base md:text-lg font-semibold tracking-tight text-foreground">
            {t.planner.title}
          </h1>
          <p className="text-xs sm:text-sm mt-0.5 text-muted-foreground font-normal">
            {t.planner.subtitle}
          </p>
        </div>

        {/* QUICK DAY NAV & TOOLBAR */}
        <div className="planner-toolbar relative z-50 flex flex-col sm:flex-row items-center justify-between gap-3 p-2 w-full mb-6 sm:mb-8">
          
          {/* Quick Day Navigation (Carousel) */}
          <div className="planner-day-tabs flex items-center p-1 relative overflow-hidden w-full max-w-[320px] h-[36px] justify-between touch-manipulation">
            <button 
              type="button"
              onClick={() => jumpToDay(-1)} 
              className="absolute left-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors z-10 w-[95px] text-center touch-manipulation cursor-pointer"
            >
              {formatShortDate(prevDateStr)}
            </button>
            
            <div className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-300">
              <button 
                type="button"
                className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-[#223A5E] hover:bg-[#2E4E7B] transition-colors whitespace-nowrap touch-manipulation w-[100px] text-center cursor-pointer shadow-none"
              >
                {formatShortDate(selectedDateStr)}
              </button>
            </div>

            <button 
              type="button"
              onClick={() => jumpToDay(1)} 
              className="absolute right-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors z-10 w-[95px] text-center touch-manipulation cursor-pointer"
            >
              {formatShortDate(nextDateStr)}
            </button>
          </div>
          
          {/* Month Nav + Mini Calendar Picker */}
          <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
            {/* Previous Month Circular Button */}
            <button 
              type="button"
              onClick={() => changeMonth(-1)} 
              className="w-8 h-8 rounded-full bg-white dark:bg-white/5 hover:bg-[#F3F7FC] dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 flex items-center justify-center text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]"
              aria-label="Previous Month"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-foreground text-center whitespace-nowrap px-1">
                {monthNames[month]} {year}
              </span>
              
              {/* Custom Popup Calendar Widget */}
              <CalendarWidget 
                currentDate={currentDate} 
                selectedDateStr={selectedDateStr}
                onDateSelect={(date) => {
                  setCurrentDate(date);
                  setSelectedDateStr(formatLocalDate(date));
                }}
                onAddEvent={() => {
                  handleOpenDrawer(selectedDateStr);
                  setShowAddBlock(true);
                }}
              />
            </div>

            {/* Next Month Circular Button */}
            <button 
              type="button"
              onClick={() => changeMonth(1)} 
              className="w-8 h-8 rounded-full bg-white dark:bg-white/5 hover:bg-[#F3F7FC] dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-white/10 flex items-center justify-center text-[#52627A] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#5B8DEF]"
              aria-label="Next Month"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MONTHLY GRID */}
        <div className="planner-calendar overflow-hidden flex-1 flex flex-col mb-8">
          
          {/* Days Header */}
          <div className="planner-weekdays grid grid-cols-7 p-2 sm:p-4 gap-1 sm:gap-2">
            {t.planner.weekDays.map(day => (
              <div key={day} className="text-center">
                <div className="inline-block px-1.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-slate-600 dark:text-slate-300 shadow-xs">
                  {day.slice(0, 3)}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 bg-slate-200/50 dark:bg-white/5 gap-[1px] flex-1">
            {calendarDays.map((day, i) => {
              const isToday = day.dateStr === realToday;
              const isSelected = day.dateStr === selectedDateStr;
              const itemsForDay = getItemsForDay(day.dateStr);
              
              return (
                <div 
                  key={i} 
                  className={`planner-day-cell relative aspect-square sm:aspect-auto min-h-[50px] xs:min-h-[58px] sm:min-h-[90px] md:min-h-[120px] p-1.5 sm:p-3 transition-all duration-300 group flex flex-col justify-between sm:justify-start ${!day.isCurrentMonth ? 'opacity-35' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day.dateStr)}
                  onClick={() => { setSelectedDateStr(day.dateStr); setDrawerDateStr(day.dateStr); }}
                >
                  {/* Subtle Border Outline */}
                  <div className={`absolute inset-0 border border-transparent group-hover:border-blue-500/25 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 ${isSelected ? 'border-blue-500/40 opacity-100' : ''}`}></div>
                  
                  {/* Header */}
                  <div className="flex items-center justify-between relative z-10 mb-0.5 sm:mb-3">
                    <div className={`w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold transition-all ${
                      isToday 
                        ? 'is-today-badge bg-[#EAF1FB] dark:bg-blue-500/20 border border-[#5B8DEF]/40 dark:border-blue-400/30 text-[#223A5E] dark:text-blue-300 font-bold shadow-xs' 
                        : isSelected 
                        ? 'text-[#223A5E] dark:text-blue-400 font-bold bg-blue-100/60 dark:bg-blue-500/15 sm:bg-transparent' 
                        : 'text-[#52627A] dark:text-zinc-400 group-hover:text-[#111827] dark:group-hover:text-zinc-200'
                    }`}>
                      <span className={isToday ? 'text-[#223A5E] dark:text-blue-300 font-bold' : ''}>
                        {day.dayNum}
                      </span>
                    </div>
                    
                    {/* Quick Add Button (Desktop only) */}
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedDateStr(day.dateStr); setDrawerDateStr(day.dateStr); setShowAddTaskModal(true); }}
                      className="hidden sm:flex opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-[#EBF3FE] dark:bg-blue-500/20 border border-[#D0E1FD] dark:border-blue-500/30 items-center justify-center text-[#1D4ED8] dark:text-blue-300 hover:bg-[#DBEAFE] dark:hover:bg-blue-500/30 transition-all cursor-pointer shadow-xs"
                      title="Add Task"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Mobile View: Clean Box-Style Task Dot Indicators */}
                  {itemsForDay.length > 0 && (
                    <div className="sm:hidden flex flex-wrap items-center justify-center gap-1 w-full mt-auto pb-0.5 relative z-10">
                      {itemsForDay.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-xs ${getBadgeColor(item.category, item.isBreak)}`}
                        />
                      ))}
                      {itemsForDay.length > 3 && (
                        <span className="text-[8px] font-bold text-blue-600 dark:text-blue-400 leading-none">
                          +{itemsForDay.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Desktop View: Full Rich Task Badges Container */}
                  <div className="hidden sm:block space-y-1.5 relative z-10">
                    {itemsForDay.slice(0, 4).map(item => (
                      <div 
                        key={item.id}
                        draggable={Boolean(item.blockId)}
                        onDragStart={(e) => { 
                          if (item.blockId) {
                            e.stopPropagation(); 
                            handleDragStart(e, item.blockId); 
                          }
                        }}
                        className={`group/block relative w-full px-2 py-1 rounded-[4px] text-[10px] font-bold truncate transition-all hover:brightness-105 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.04] flex items-center gap-1.5 shadow-xs ${item.completed ? 'opacity-60 line-through' : ''}`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getBadgeColor(item.category, item.isBreak)}`}></div>
                        <span className="truncate flex-1 text-slate-700 dark:text-white/80" style={{ opacity: item.isBreak ? 0.5 : 1 }}>
                          {item.label}
                        </span>

                        {/* Hover Preview Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/block:opacity-100 pointer-events-none transition-all z-50 transform translate-y-[10px] group-hover/block:translate-y-0 w-max max-w-[200px]">
                          <div className="bg-slate-900/95 dark:bg-black/90 text-white backdrop-blur-xl border border-slate-700 dark:border-white/10 p-3 rounded-xl shadow-2xl text-left whitespace-normal">
                            <div className="text-xs font-bold text-white mb-1">{item.label}</div>
                            <div className="text-[10px] text-blue-300 dark:text-purple-300/70 flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" /> {formatTime12hr(item.startTime)} - {formatTime12hr(item.endTime)}
                            </div>
                            {item.category && <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-[8px] uppercase tracking-wider text-white/80">{item.category}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {itemsForDay.length > 4 && (
                      <div className="text-[10px] text-slate-500 dark:text-white/30 text-center font-bold pt-1">
                        +{itemsForDay.length - 4} {t.planner.more}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HIGHLIGHT CARDS SECTION (BOTTOM) */}
        <div className="fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <h3 className="text-lg font-bold text-foreground tracking-wide">
                {t.planner.highlightsFor} {parseLocalDate(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
            </div>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
            {selectedDayItems.length > 0 ? (
              selectedDayItems.map(item => {
                return (
                  <div key={item.id} className="planner-highlight-card min-w-[280px] max-w-[320px] p-5 transition-colors group relative overflow-hidden">
                    {/* Inner glowing accent */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${getBadgeColor(item.category, item.isBreak)} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                    
                    <div className="flex items-center justify-between mb-3 pl-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        {formatTime12hr(item.startTime)} <span className="opacity-50">{t.planner.to}</span> {formatTime12hr(item.endTime)}
                      </div>
                      {item.category && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[9px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-medium">
                          {item.category}
                        </span>
                      )}
                    </div>
                    
                    <h4 className={`text-xl font-bold text-foreground mb-2 pl-2 break-words line-clamp-2 ${item.isBreak ? 'italic opacity-60' : ''} ${item.completed ? 'line-through opacity-70' : ''}`} title={item.label}>
                      {item.label || "Untitled Task"}
                    </h4>
                    
                    <button 
                      type="button"
                      onClick={() => { handleOpenDrawer(selectedDateStr); }} 
                      className="pl-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center gap-1 mt-4 cursor-pointer"
                    >
                      {t.planner.editDetails} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="w-full bg-white dark:bg-white/[0.02] border border-[#DCE5F0] dark:border-white/[0.07] border-dashed rounded-2xl py-8 px-4 sm:py-10 flex flex-col items-center justify-center text-center transition-all">
                <PlannerEmptyIllustration className="w-24 h-20 sm:w-28 sm:h-24 mb-3" />
                <p className="text-xs sm:text-sm font-semibold text-[#52627A] dark:text-zinc-400 tracking-tight">
                  {t.planner.noHighlights || "No highlights for this date."}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* GLASSMORPHISM SIDE DRAWER */}
      {mounted && drawerAnim.shouldRender && createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          <div 
            className={`${drawerAnim.isExiting ? "motion-exit-fade" : "motion-overlay"} fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[9998]`} 
            onClick={() => setDrawerDateStr(null)}
          />
          
          <div 
            ref={drawerContentRef}
            className={`planner-drawer ${drawerAnim.isExiting ? "motion-exit-drawer" : "motion-drawer"} fixed top-0 right-0 h-full w-full max-w-[420px] z-[9999] flex flex-col p-6 overflow-y-auto shadow-2xl bg-white dark:bg-[#0c1424] border-l border-slate-200 dark:border-blue-500/15`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {t.planner.editDetails}
              </h2>
              <button 
                type="button"
                onClick={() => setDrawerDateStr(null)} 
                className="p-2 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                aria-label="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {drawerDayItems.map((item) => {
              return (
                <div key={item.id} className="mb-3 p-3.5 rounded-xl border border-slate-200 dark:border-blue-500/15 bg-slate-50 dark:bg-slate-900/75 flex items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className={`font-semibold text-sm text-foreground break-words line-clamp-1 ${item.completed ? 'line-through opacity-70' : ''}`} title={item.label}>
                      {item.label || "Untitled Task"}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <Clock className="w-3 h-3 text-blue-500 dark:text-blue-400 shrink-0" />
                      <span>{formatTime12hr(item.startTime)} – {formatTime12hr(item.endTime)}</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.blockId) deleteTimeBlock(item.blockId);
                      if (item.taskId) deleteTask(item.taskId);
                    }} 
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors p-1.5 rounded-lg cursor-pointer shrink-0"
                    aria-label="Delete task"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
              <button 
                type="button"
                onClick={() => setShowAddTaskModal(true)} 
                className="btn-primary w-full sm:flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{t.planner.addTask || "Add Task"}</span>
              </button>
              <button 
                type="button"
                onClick={() => setShowCopyTasksModal(true)} 
                className="btn-secondary w-full sm:flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-none active:scale-[0.98]"
              >
                <Copy className="w-4 h-4 shrink-0" />
                <span>{t.planner.copyTasks || "Copy Tasks"}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ADD TASK MODAL POPUP */}
      <AddTaskModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        targetDateStr={drawerDateStr || selectedDateStr || realToday}
      />

      {/* COPY TASKS MODAL POPUP */}
      <CopyTasksModal
        isOpen={showCopyTasksModal}
        onClose={() => setShowCopyTasksModal(false)}
        targetDateStr={drawerDateStr || selectedDateStr || realToday}
      />
    </div>
  );
}
