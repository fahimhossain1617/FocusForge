"use client";

import { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import EmptyState from "../ui/EmptyState";
import CalendarWidget from "../ui/CalendarWidget";
import { ChevronLeft, ChevronRight, Plus, X, AlignLeft, Calendar as CalendarIcon, Clock, Bell } from "lucide-react";

export default function PlannerPage() {
  const { state, addTimeBlock, deleteTimeBlock, updateTimeBlock, addTask, deleteTask } = useAppContext();
  const { t } = useTranslation();
  
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

  // Calendar Engine State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [realToday, setRealToday] = useState<string>(formatLocalDate(new Date()));
  
  // Side Drawer & Highlight State
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatLocalDate(new Date()));
  const [drawerDateStr, setDrawerDateStr] = useState<string | null>(null);
  
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
  
  // Blocks for drawer date
  const drawerDayBlocks = drawerDateStr 
    ? state.timeBlocks.filter((b) => b.date === drawerDateStr).sort((a, b) => a.startTime.localeCompare(b.startTime))
    : [];

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

  const formatTime12hr = (time24: string) => {
    if (!time24) return "";
    const [hourStr, minStr] = time24.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${minStr} ${ampm}`;
  };

  // Calculate prev, current, next for the carousel
  const prevDate = parseLocalDate(selectedDateStr);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevDateStr = formatLocalDate(prevDate);

  const nextDate = parseLocalDate(selectedDateStr);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = formatLocalDate(nextDate);

  return (
    <div className="planner-premium relative w-full min-h-[calc(100vh-80px)] overflow-hidden">
      
      {/* CYBER-NEON AURORA BACKGROUND */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none aurora-anim" />
      <div className="absolute top-1/4 right-1/4 translate-x-1/4 -translate-y-1/4 w-[50vw] h-[50vw] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none aurora-anim" style={{ animationDirection: 'reverse', animationDuration: '25s' }} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70vw] h-[40vw] bg-yellow-500/5 rounded-full blur-[150px] pointer-events-none aurora-anim" style={{ animationDelay: '-5s' }} />

      <div className="relative z-10 fade-in max-w-[1300px] mx-auto p-4 md:p-8 pb-20 h-full flex flex-col">
        
        {/* HEADER & QUICK DAY NAV */}
        <div className="relative z-50 flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-white to-indigo-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              {t.planner.title}
            </h1>
            <p className="text-sm mt-1 text-purple-200/60 font-medium">
              {t.planner.subtitle}
            </p>
          </div>

          <div className="planner-toolbar relative z-50 flex flex-col sm:flex-row items-center justify-between gap-3 p-2 w-full">
            
            {/* Quick Day Navigation (Carousel) */}
            <div className="planner-day-tabs flex items-center p-1 relative overflow-hidden w-full max-w-[320px] h-[36px] justify-between touch-manipulation">
              <button 
                onClick={() => jumpToDay(-1)} 
                className="absolute left-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-all z-10 w-[95px] text-center touch-manipulation"
              >
                {formatShortDate(prevDateStr)}
              </button>
              
              <div className="absolute left-1/2 -translate-x-1/2 z-20 transition-all duration-300">
                <button className="px-3 py-1.5 rounded-full text-xs font-bold text-black bg-gradient-to-r from-purple-500 to-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)] whitespace-nowrap touch-manipulation w-[100px] text-center">
                  {formatShortDate(selectedDateStr)}
                </button>
              </div>

              <button 
                onClick={() => jumpToDay(1)} 
                className="absolute right-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white/50 hover:text-white hover:bg-white/10 transition-all z-10 w-[95px] text-center touch-manipulation"
              >
                {formatShortDate(nextDateStr)}
              </button>
            </div>

            <div className="w-[1px] h-6 bg-white/10 mx-2 hidden md:block"></div>
            
            {/* Month Nav + Mini Calendar Picker */}
            <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
              <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-purple-500">
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

              <button onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-purple-500">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* MONTHLY GRID */}
        <div className="planner-calendar overflow-hidden flex-1 flex flex-col mb-8">
          
          {/* Days Header */}
          <div className="planner-weekdays grid grid-cols-7 p-2 sm:p-4 gap-1 sm:gap-2">
            {t.planner.weekDays.map(day => (
              <div key={day} className="text-center">
                <div className="inline-block px-1.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-black/40 border border-white/5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider sm:tracking-widest text-purple-200/50 shadow-inner">
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
                      onClick={(e) => { e.stopPropagation(); handleOpenDrawer(day.dateStr); setShowAddBlock(true); }}
                      className="hidden sm:flex opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-white/5 border border-white/10 items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
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
                        <span className="text-[8px] font-extrabold text-blue-400 leading-none">
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
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 shadow-[0_0_5px_currentColor] ${getBadgeColor(block.category, block.isBreak)}`}></div>
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
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              {t.planner.highlightsFor} {new Date(selectedDateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </h3>
          </div>
          
          <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {selectedDayBlocks.length > 0 ? (
              selectedDayBlocks.map(block => (
                <div key={block.id} className="planner-highlight-card min-w-[280px] max-w-[320px] p-5 transition-colors group relative overflow-hidden">
                  {/* Inner glowing accent */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${getBadgeColor(block.category, block.isBreak)} opacity-70 group-hover:opacity-100 transition-opacity`}></div>
                  
                  <div className="flex items-center justify-between mb-3 pl-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-300/70">
                      <Clock className="w-3.5 h-3.5" />
                      {formatTime12hr(block.startTime)} <span className="opacity-50">{t.planner.to}</span> {formatTime12hr(block.endTime)}
                    </div>
                    {block.category && (
                       <span className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] uppercase tracking-wider text-white/50">{block.category}</span>
                    )}
                  </div>
                  
                  <h4 className={`text-xl font-bold text-white mb-2 pl-2 ${block.isBreak ? 'italic opacity-50' : ''}`}>{block.label}</h4>
                  
                  <button onClick={() => { handleOpenDrawer(selectedDateStr); }} className="pl-2 text-xs font-semibold text-purple-500/80 hover:text-purple-400 transition-colors flex items-center gap-1 mt-4">
                    {t.planner.editDetails} <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="w-full bg-white/5 border border-white/5 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-white/30">
                <p className="text-sm font-medium mb-3">{t.planner.noHighlights}</p>
                <button onClick={() => { handleOpenDrawer(selectedDateStr); setShowAddBlock(true); }} className="px-5 py-2 rounded-xl bg-purple-600/20 text-purple-400 text-xs font-bold hover:bg-purple-600/30 transition-colors">
                  {t.planner.addNoteEvent}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* GLASSMORPHISM SIDE DRAWER (Retained and Polished) */}
      {drawerDateStr && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setDrawerDateStr(null)}></div>
          
          <div className="planner-drawer fixed top-0 right-0 h-full w-full max-w-[420px] z-50 slide-in-right flex flex-col p-6 overflow-y-auto" style={{ background: "var(--color-bg-card)", borderLeft: "1px solid var(--color-border-subtle)" }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {t.planner.editDetails}
              </h2>
              <button onClick={() => setDrawerDateStr(null)} className="p-2 rounded-full transition-colors hover:bg-black/10 dark:hover:bg-white/10" style={{ color: "var(--color-text-secondary)" }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {drawerDayBlocks.map((block) => {
              const linkedTask = state.tasks.find((t) => t.id === block.taskId);
              return (
                <div key={block.id} className="mb-4 p-4 rounded-xl border flex items-start justify-between" style={{ background: "var(--color-bg-secondary)", borderColor: "var(--color-border-subtle)" }}>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm" style={{ color: "var(--color-text-primary)" }}>{block.label}</h4>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        {formatTime12hr(block.startTime)} - {formatTime12hr(block.endTime)}
                      </p>
                      {linkedTask?.reminderEnabled && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-md">
                          <Bell size={11} /> {linkedTask.reminderTime || block.startTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      deleteTimeBlock(block.id);
                      if (block.taskId) deleteTask(block.taskId);
                    }} 
                    className="text-red-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                    aria-label="Delete task"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            
            {!showAddBlock ? (
              <button onClick={() => setShowAddBlock(true)} className="w-full mt-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm" style={{ background: "var(--color-purple-primary)", color: "white" }}>
                <Plus className="w-5 h-5" /> {t.planner.addNoteEvent}
              </button>
            ) : (
              <form onSubmit={handleAddBlockSubmit} className="mt-4 p-4 rounded-xl border space-y-4 animate-fade-in" style={{ background: "var(--color-bg-elevated)", borderColor: "var(--color-border-subtle)" }}>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-zinc-400">Task Title</label>
                  <input type="text" placeholder="e.g. Study Mathematics" value={newLabel} onChange={e => setNewLabel(e.target.value)} className="w-full bg-transparent border rounded-lg px-3 py-2 outline-none transition-colors text-sm" style={{ color: "var(--color-text-primary)", borderColor: "var(--color-border-subtle)" }} required />
                </div>

                <div className="flex gap-3">
                  <div className="w-1/2">
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">Start Time</label>
                    <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none border transition-colors bg-transparent text-sm" style={{ color: "var(--color-text-primary)", borderColor: "var(--color-border-subtle)" }} required />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-semibold mb-1 text-zinc-400">End Time</label>
                    <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none border transition-colors bg-transparent text-sm" style={{ color: "var(--color-text-primary)", borderColor: "var(--color-border-subtle)" }} required />
                  </div>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-zinc-400">Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPriority(p)}
                        className={`py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                          newPriority === p
                            ? "border-blue-500 bg-blue-500/20 text-blue-400"
                            : "border-white/10 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Individual Task Reminder Toggle */}
                <div className="p-3 rounded-xl border flex flex-col gap-2.5" style={{ borderColor: "var(--color-border-subtle)", background: "rgba(255,255,255,0.02)" }}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Bell size={15} className={newReminderEnabled ? "text-blue-400" : "text-zinc-500"} />
                      <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Enable Task Reminder</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={newReminderEnabled}
                      onChange={(e) => setNewReminderEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                    />
                  </label>

                  {newReminderEnabled && (
                    <div className="flex items-center justify-between pt-2 border-t animate-fade-in" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <span className="text-xs text-zinc-400">Reminder Time</span>
                      <input
                        type="time"
                        value={newReminderTime}
                        onChange={(e) => setNewReminderTime(e.target.value)}
                        className="rounded-lg px-2.5 py-1 text-xs outline-none border transition-colors bg-transparent font-medium"
                        style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddBlock(false)} className="w-1/2 py-2.5 rounded-xl font-semibold text-xs transition-colors border cursor-pointer" style={{ color: "var(--color-text-primary)", borderColor: "var(--color-border-subtle)", background: "transparent" }}>Cancel</button>
                  <button type="submit" className="w-1/2 py-2.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-sm" style={{ background: "var(--color-purple-primary)", color: "white" }}>Save Task</button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
