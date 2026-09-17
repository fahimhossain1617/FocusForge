"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import EmptyState from "../ui/EmptyState";
import CalendarWidget from "../ui/CalendarWidget";
import { ChevronLeft, ChevronRight, Plus, X, AlignLeft, Calendar as CalendarIcon, Clock, Bell, Layers, ArrowDownToLine, Sparkles } from "lucide-react";
import { useAnimateExit } from "../../hooks/useAnimateExit";
import FocusForgeTimePicker from "../ui/FocusForgeTimePicker";
import RoutineLibraryModal from "../planner/RoutineLibraryModal";
import ImportRoutineModal from "../planner/ImportRoutineModal";
import AddTaskModal from "../planner/AddTaskModal";
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
  const [showRoutineLibrary, setShowRoutineLibrary] = useState(false);
  const [showImportRoutine, setShowImportRoutine] = useState(false);

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
    setCurrentDate(newDate);
    setSelectedDateStr(formatLocalDate(newDate));
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

  // Blocks for selected date (highlight cards)
  const selectedDayBlocks = state.timeBlocks.filter((b) => b.date === selectedDateStr).sort((a, b) => a.startTime.localeCompare(b.startTime));
  
  // Blocks for drawer date with exit persistence
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
  const drawerDayBlocks = activeDrawerDate 
    ? state.timeBlocks.filter((b) => b.date === activeDrawerDate).sort((a, b) => a.startTime.localeCompare(b.startTime))
    : [];
  const drawerAnim = useAnimateExit({ isOpen: Boolean(drawerDateStr), durationMs: 220 });

  const getBadgeColor = (category: string, isBreak: boolean) => {
    if (isBreak) return 'bg-gray-500';
    if (!category) return 'bg-purple-500';
    const colors = ['bg-blue-400', 'bg-green-400', 'bg-pink-400', 'bg-yellow-400', 'bg-purple-400'];
    let hash = 0;
    for(let i=0; i<category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const jumpToDay = (offsetFromSelected: number) => {
    const d = parseLocalDate(selectedDateStr);
    d.setDate(d.getDate() + offsetFromSelected);
    const dateStr = formatLocalDate(d);
    
    // Also update calendar month view if we jump to a different month
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
              onClick={() => jumpToDay(-1)} 
              className="absolute left-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10 w-[95px] text-center touch-manipulation cursor-pointer"
            >
              {formatShortDate(prevDateStr)}
            </button>
            
            <div className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-300">
              <button className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors whitespace-nowrap touch-manipulation w-[100px] text-center cursor-pointer">
                {formatShortDate(selectedDateStr)}
              </button>
            </div>

            <button 
              onClick={() => jumpToDay(1)} 
              className="absolute right-1 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-10 w-[95px] text-center touch-manipulation cursor-pointer"
            >
              {formatShortDate(nextDateStr)}
            </button>
          </div>
          
          {/* Month Nav + Mini Calendar Picker */}
          <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
            <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-blue-400">
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-bold tracking-wide text-white drop-shadow-md text-center whitespace-nowrap">
                {parseLocalDate(selectedDateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
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

            <button onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-blue-400">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MONTHLY GRID */}
        <div className="planner-calendar overflow-hidden flex-1 flex flex-col mb-8">
          
          {/* Days Header */}
          <div className="planner-weekdays grid grid-cols-7 p-2 sm:p-4 gap-1 sm:gap-2">
            {t.planner.weekDays.map(day => (
              <div key={day} className="text-center">
                <div className="inline-block px-1.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-800/60 border border-slate-700/50 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-slate-300 shadow-inner">
                  {day.slice(0, 3)}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7 bg-white/5 gap-[1px] flex-1">
            {calendarDays.map((day, i) => {
              const isToday = day.dateStr === realToday;
              const isSelected = day.dateStr === selectedDateStr;
              const blocksForDay = state.timeBlocks.filter(b => b.date === day.dateStr).sort((a,b) => a.startTime.localeCompare(b.startTime));
              
              return (
                <div 
                  key={i} 
                  className={`planner-day-cell relative aspect-square sm:aspect-auto min-h-[50px] xs:min-h-[58px] sm:min-h-[90px] md:min-h-[120px] p-1.5 sm:p-3 transition-all duration-300 group flex flex-col justify-between sm:justify-start ${!day.isCurrentMonth ? 'opacity-30' : ''} ${isSelected ? 'is-selected' : ''}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, day.dateStr)}
                  onClick={() => { setSelectedDateStr(day.dateStr); setDrawerDateStr(day.dateStr); }}
                >
                  {/* Subtle Border Outline (Gentle on eyes, no harsh glow) */}
                  <div className={`absolute inset-0 border border-transparent group-hover:border-blue-500/20 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 ${isSelected ? 'border-blue-500/35 opacity-100' : ''}`}></div>
                  
                  {/* Header */}
                  <div className="flex items-center justify-between relative z-10 mb-0.5 sm:mb-3">
                    <div className={`w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold transition-all ${isToday ? 'bg-blue-600 text-white shadow-sm' : isSelected ? 'text-blue-400 font-bold bg-blue-500/15 sm:bg-transparent' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                      {day.dayNum}
                    </div>
                    
                    {/* Quick Add Button (Desktop only) */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedDateStr(day.dateStr); setDrawerDateStr(day.dateStr); setShowAddTaskModal(true); }}
                      className="hidden sm:flex opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-white/5 border border-white/10 items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                      title="Add Task"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Mobile View: Clean Box-Style Task Dot Indicators */}
                  {blocksForDay.length > 0 && (
                    <div className="sm:hidden flex flex-wrap items-center justify-center gap-1 w-full mt-auto pb-0.5 relative z-10">
                      {blocksForDay.slice(0, 3).map((block) => (
                        <span
                          key={block.id}
                          className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-xs ${getBadgeColor(block.category, block.isBreak)}`}
                        />
                      ))}
                      {blocksForDay.length > 3 && (
                        <span className="text-[8px] font-bold text-blue-400 leading-none">
                          +{blocksForDay.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Desktop View: Full Rich Task Badges Container */}
                  <div className="hidden sm:block space-y-1.5 relative z-10">
                    {blocksForDay.slice(0, 4).map(block => (
                      <div 
                        key={block.id}
                        draggable
                        onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, block.id); }}
                        className="group/block relative w-full px-2 py-1 rounded-[4px] text-[10px] font-bold truncate transition-all hover:brightness-125 border border-white/5 flex items-center gap-1.5 shadow-sm"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0  ${getBadgeColor(block.category, block.isBreak)}`}></div>
                        <span className="truncate flex-1 text-white/80" style={{ opacity: block.isBreak ? 0.5 : 1 }}>
                          {block.label}
                        </span>

                        {/* Hover Preview Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/block:opacity-100 pointer-events-none transition-all z-50 transform translate-y-[10px] group-hover/block:translate-y-0 w-max max-w-[200px]">
                          <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl text-left whitespace-normal">
                            <div className="text-xs font-bold text-white mb-1">{block.label}</div>
                            <div className="text-[10px] text-purple-300/70 flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" /> {formatTime12hr(block.startTime)} - {formatTime12hr(block.endTime)}
                            </div>
                            {block.category && <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-[8px] uppercase tracking-wider text-white/60">{block.category}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {blocksForDay.length > 4 && (
                      <div className="text-[10px] text-white/30 text-center font-bold pt-1">
                        +{blocksForDay.length - 4} {t.planner.more}
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
              <h3 className="text-lg font-bold text-white tracking-wide">
                {t.planner.highlightsFor} {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportRoutine(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-blue-400" />
                {t.planner.importRoutine || "Import Routine"}
              </button>
            </div>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {selectedDayBlocks.length > 0 ? (
              selectedDayBlocks.map(block => {
                const linkedTask = state.tasks.find((t) => t.id === block.taskId);
                const isRoutine = block.sourceType === 'routine' || linkedTask?.sourceType === 'routine';

                return (
                  <div key={block.id} className="planner-highlight-card min-w-[280px] max-w-[320px] p-5 transition-colors group relative overflow-hidden">
                    {/* Inner glowing accent */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${getBadgeColor(block.category, block.isBreak)} opacity-70 group-hover:opacity-100 transition-opacity`}></div>
                    
                    <div className="flex items-center justify-between mb-3 pl-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTime12hr(block.startTime)} <span className="opacity-50">{t.planner.to}</span> {formatTime12hr(block.endTime)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isRoutine ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-[9px] font-bold text-blue-300 uppercase tracking-wider">
                            {t.planner.routineBadge || "Routine"}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {t.planner.customBadge || "Custom"}
                          </span>
                        )}
                        {block.category && (
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] uppercase tracking-wider text-slate-400">{block.category}</span>
                        )}
                      </div>
                    </div>
                    
                    <h4 className={`text-xl font-bold text-white mb-2 pl-2 ${block.isBreak ? 'italic opacity-50' : ''}`}>{block.label}</h4>
                    
                    <button onClick={() => { handleOpenDrawer(selectedDateStr); }} className="pl-2 text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 mt-4 cursor-pointer">
                      {t.planner.editDetails} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="w-full bg-white/[0.03] border border-white/[0.08] border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 text-center">
                <p className="text-sm font-medium mb-3">{t.planner.noHighlights}</p>
                <div className="flex items-center gap-2.5 flex-wrap justify-center">
                  <button onClick={() => setShowImportRoutine(true)} className="px-4 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5">
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    {t.planner.importRoutine || "Import Routine"}
                  </button>
                  <button onClick={() => { setSelectedDateStr(selectedDateStr); setDrawerDateStr(selectedDateStr); setShowAddTaskModal(true); }} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    {t.planner.addTask || "Add Task"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* GLASSMORPHISM SIDE DRAWER */}
      {mounted && drawerAnim.shouldRender && createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-auto">
          <div 
            className={`${drawerAnim.isExiting ? "motion-exit-fade" : "motion-overlay"} fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]`} 
            onClick={() => setDrawerDateStr(null)}
          />
          
          <div 
            ref={drawerContentRef}
            className={`planner-drawer ${drawerAnim.isExiting ? "motion-exit-drawer" : "motion-drawer"} fixed top-0 right-0 h-full w-full max-w-[420px] z-[9999] flex flex-col p-6 overflow-y-auto shadow-2xl`} 
            style={{ 
              background: "linear-gradient(145deg, rgba(16, 22, 36, 0.98), rgba(11, 15, 26, 0.99))", 
              borderLeft: "1px solid rgba(59, 130, 246, 0.14)" 
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {t.planner.editDetails}
              </h2>
              <button onClick={() => setDrawerDateStr(null)} className="p-2 rounded-full transition-colors hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {drawerDayBlocks.map((block) => {
              const linkedTask = state.tasks.find((t) => String(t.id) === String(block.taskId));
              const isRoutine = block.sourceType === 'routine' || linkedTask?.sourceType === 'routine';

              return (
                <div key={block.id} className="mb-4 p-4 rounded-xl border flex items-start justify-between" style={{ background: "rgba(15, 23, 42, 0.75)", borderColor: "rgba(59, 130, 246, 0.14)" }}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-white">{block.label}</h4>
                      {isRoutine ? (
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/15 border border-blue-500/30 text-[9px] font-bold text-blue-300">
                          Routine
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400">
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-xs text-slate-400">
                        {formatTime12hr(block.startTime)} - {formatTime12hr(block.endTime)}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTimeBlock(block.id);
                      if (block.taskId) deleteTask(block.taskId);
                    }} 
                    className="text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors p-1.5 rounded-lg cursor-pointer"
                    aria-label="Delete task"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-2.5">
              <button 
                onClick={() => setShowAddTaskModal(true)} 
                className="w-full sm:flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>{t.planner.addTask || "Add Task"}</span>
              </button>
              <button 
                onClick={() => setShowRoutineLibrary(true)} 
                className="w-full sm:flex-1 py-3 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 hover:text-white active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{t.planner.createRoutine || "Create Routine"}</span>
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

      {/* ROUTINE LIBRARY MODAL */}
      <RoutineLibraryModal
        isOpen={showRoutineLibrary}
        onClose={() => setShowRoutineLibrary(false)}
        initialWeekday={getWeekdayFromDate(selectedDateStr)}
      />

      {/* IMPORT ROUTINE MODAL */}
      <ImportRoutineModal
        isOpen={showImportRoutine}
        onClose={() => setShowImportRoutine(false)}
        targetDateStr={selectedDateStr}
      />
    </div>
  );
}
