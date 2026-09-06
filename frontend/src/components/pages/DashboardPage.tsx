"use client";

import { useState, useRef } from "react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Shield, Play, CalendarDays, Clock, ArrowRight, Check, Plus, Flame } from "lucide-react";
import { getLocalDateString } from "../../services/taskService";

// --- Helpers ---
function getGreeting(t: any): string {
  const hour = new Date().getHours();
  if (hour < 6) return t.dashboard.greeting.night;
  if (hour < 12) return t.dashboard.greeting.morning;
  if (hour < 17) return t.dashboard.greeting.afternoon;
  if (hour < 21) return t.dashboard.greeting.evening;
  return t.dashboard.greeting.night;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatHoursMins(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime12hr(time24: string): string {
  if (!time24) return "";
  const [hourStr, minStr] = time24.split(":");
  let hour = parseInt(hourStr, 10);
  if (isNaN(hour)) return time24;
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minStr || "00"} ${ampm}`;
}

function getLast7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

// Real dynamic monthly data starting from day one
function getMonthlyData(actualWeeklyHours: number, completedTasksCount: number) {
  return [
    { name: "Week 1", hours: 0, tasks: 0 },
    { name: "Week 2", hours: 0, tasks: 0 },
    { name: "Week 3", hours: 0, tasks: 0 },
    { name: "This Week", hours: actualWeeklyHours, tasks: completedTasksCount, isCurrent: true },
  ];
}

interface DashboardPageProps {
  onOpenSidebar?: () => void;
}

export default function DashboardPage({ onOpenSidebar }: DashboardPageProps) {
  const { state, navigateTo, getDailyBig3, cycleTaskStatus, updateTask, updateTimeBlock } = useAppContext();
  const { t } = useTranslation();
  // Timezone-safe local date
  const today = getLocalDateString();
  
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // --- Unified Today's Tasks connected with Planner ---
  interface TodayTaskItem {
    key: string;
    type: 'task' | 'block';
    id: number | string;
    taskId?: number;
    blockId?: string;
    name: string;
    completed: boolean;
    time?: string;
    endTime?: string;
    category?: string;
    priority?: string;
  }

  const todayBlocks = (state.timeBlocks || []).filter((b) => b.date === today);
  const scheduledTasks = (state.tasks || []).filter(
    (t) => t.targetDate === today || t.date === today
  );

  const todayUnifiedTasks: TodayTaskItem[] = [];
  const processedBlockIds = new Set<string>();

  // 1. Every scheduled task for today gets its own single, distinct entry
  scheduledTasks.forEach((task) => {
    // Find linked timeBlock strictly by matching taskId
    const linkedBlock = todayBlocks.find(
      (b) => b.taskId != null && String(b.taskId) === String(task.id)
    );

    if (linkedBlock) {
      processedBlockIds.add(String(linkedBlock.id));
    }

    const isCompleted = Boolean(task.status === "completed" || task.completed === true);

    todayUnifiedTasks.push({
      key: `task-${task.id}`,
      type: 'task',
      id: task.id,
      taskId: task.id,
      blockId: linkedBlock?.id,
      name: task.name || task.title || "Untitled Task",
      completed: isCompleted,
      time: task.time || linkedBlock?.startTime,
      endTime: linkedBlock?.endTime,
      category: task.category || linkedBlock?.category,
      priority: task.priority,
    });
  });

  // 2. Only orphaned timeBlocks (if any) that have NO linked task
  todayBlocks.forEach((block) => {
    const blockIdStr = String(block.id);
    if (processedBlockIds.has(blockIdStr)) return;
    if (block.taskId != null && scheduledTasks.some((t) => String(t.id) === String(block.taskId))) return;

    todayUnifiedTasks.push({
      key: `block-${block.id}`,
      type: 'block',
      id: block.id,
      blockId: block.id,
      name: block.label || "Untitled Event",
      completed: Boolean(block.completed),
      time: block.startTime,
      endTime: block.endTime,
      category: block.category,
    });
  });

  // STABLE SORT: Sort ONLY by scheduled start time
  todayUnifiedTasks.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });

  const completedToday = todayUnifiedTasks.filter((t) => t.completed).length;
  const totalTasksToday = todayUnifiedTasks.length;
  const taskCompletionRate = totalTasksToday > 0 ? (completedToday / totalTasksToday) * 100 : 0;

  const handleToggleTask = (item: TodayTaskItem) => {
    const nextCompleted = !item.completed;

    if (item.type === 'task' && item.taskId != null) {
      updateTask(item.taskId, {
        completed: nextCompleted,
        status: nextCompleted ? "completed" : "not_started",
      });
      if (item.blockId) {
        updateTimeBlock(item.blockId, {
          completed: nextCompleted,
        });
      }
    } else if (item.type === 'block' && item.blockId != null) {
      updateTimeBlock(item.blockId, {
        completed: nextCompleted,
      });
    }
  };

  const big3 = getDailyBig3();
  const hasBig3 = big3.length > 0;
  const pendingTasks = state.tasks.filter((t) => t.status !== "completed");
  const nextFocus = hasBig3
    ? big3.find((t) => t.status !== "completed")
    : pendingTasks.sort((a, b) => {
        const po = { urgent: 0, high: 1, medium: 2, low: 3 };
        return (po[a.priority] || 3) - (po[b.priority] || 3);
      })[0];

  // --- Activity Data ---
  const todayActivities = state.activities.filter((a) => a.date === today);
  const totalMinutesToday = todayActivities.reduce((acc, a) => acc + a.totalMinutes, 0);

  // Focus Sessions
  const todaySessions = state.focusSessions.filter(
    (s) => s.startedAt.split("T")[0] === today && s.completed
  );
  const focusMinutesToday = todaySessions.reduce((a, s) => a + s.durationMinutes, 0);
  
  // Total Productive Time
  const totalProductiveMins = totalMinutesToday + focusMinutesToday;
  const targetProductiveMins = 4 * 60; // 4 hours target
  const productiveProgress = Math.min((totalProductiveMins / targetProductiveMins) * 100, 100);

  // --- Streak & Consistency ---
  const activeDates = new Set([
    ...state.activities.map((a) => a.date),
    ...state.focusSessions.filter((s) => s.completed).map((s) => s.startedAt.split("T")[0]),
  ]);
  let streakCount = 0;
  const checkDate = new Date();
  const todayStrDate = checkDate.toISOString().split("T")[0];
  if (!activeDates.has(todayStrDate)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (activeDates.has(checkDate.toISOString().split("T")[0])) {
    streakCount++;
    checkDate.setDate(checkDate.getDate() - 1);
  }
  const currentStreak = streakCount;
  const last7Days = getLast7Days();
  const weeklyData = last7Days.map(date => {
    const dayActivities = state.activities.filter(a => a.date === date);
    const daySessions = state.focusSessions.filter(s => s.startedAt.split("T")[0] === date && s.completed);
    
    let totalMins = 0;
    dayActivities.forEach(a => totalMins += a.totalMinutes);
    daySessions.forEach(s => totalMins += s.durationMinutes);
    
    const dayName = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
    const isFuture = new Date(date) > new Date(today);
    
    return {
      name: dayName,
      hours: Number((totalMins / 60).toFixed(1)),
      isToday: date === today,
      isFuture: isFuture,
      hasActivity: totalMins > 0
    };
  });

  const actualWeeklyHours = Number(weeklyData.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1));
  const weeklyHours = actualWeeklyHours;
  const displayWeeklyData = weeklyData;

  const activeDaysThisWeek = weeklyData.filter((d) => d.hasActivity && !d.isFuture);
  const bestDay = activeDaysThisWeek.length > 0 
    ? activeDaysThisWeek.reduce((prev, current) => (prev.hours > current.hours) ? prev : current)
    : { name: "-", hours: 0 };

  const completedTasksThisWeek = state.tasks.filter((t) => t.status === "completed" && last7Days.includes(t.targetDate || "")).length;
  const thisMonthPrefix = today.substring(0, 7);
  const completedTasksThisMonth = state.tasks.filter((t) => t.status === "completed" && (t.targetDate || "").startsWith(thisMonthPrefix)).length;

  const monthlyData = getMonthlyData(actualWeeklyHours, completedTasksThisWeek);
  const monthlyHours = Number(monthlyData.reduce((acc, curr) => acc + curr.hours, 0).toFixed(1));

  // --- Distractions ---
  const todayDistractions: { id: string; content: string; time: string; category?: string }[] = [];
  todaySessions.forEach((s) => {
    s.distractions.forEach((d) => {
      todayDistractions.push({
        id: d.id,
        content: d.content,
        time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    });
  });

  const handleTabChange = (tab: "weekly" | "monthly") => {
    setActiveTab(tab);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (distance > minSwipeDistance && activeTab === "weekly") {
      setActiveTab("monthly");
    }
    if (distance < -minSwipeDistance && activeTab === "monthly") {
      setActiveTab("weekly");
    }
  };

  // Custom Tooltip for Composed Chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 shadow-xl" style={{ backgroundColor: "var(--color-bg-elevated)", border: "1px solid var(--color-border-subtle)", borderRadius: "8px" }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{label}</p>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{data.hours}h Focused</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fade-in max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight truncate" style={{ color: "var(--color-text-primary)" }}>
              {getGreeting(t)}
            </h1>
            <p className="text-xs sm:text-sm mt-0.5 font-medium truncate" style={{ color: "var(--color-text-secondary)" }}>
              {formatDate()} &nbsp;·&nbsp; {t.dashboard.readyText}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full shadow-sm shrink-0" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-active)" }}>
          <Flame className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.currentStreak}</span>
            <span className="text-xs sm:text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{currentStreak} {t.dashboard.days}</span>
          </div>
        </div>
      </div>

      {/* First Row - Key Metrics (2 Equal Balanced Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Today's Focus */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.todaysFocus}</span>
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>{Math.floor(targetProductiveMins/60)}h {t.dashboard.goal}</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                {Math.floor(totalProductiveMins / 60)}h {totalProductiveMins % 60}m
              </span>
            </div>
            {/* THIN, SUBTLE PROGRESS BAR */}
            <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div 
                className="h-full rounded-full transition-all duration-1000" 
                style={{ width: `${productiveProgress}%`, background: "var(--color-purple-primary)" }} 
              />
            </div>
          </div>
        </div>

        {/* Today's Tasks Overview */}
        <div className="card p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.todaysTasks}</span>
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>{totalTasksToday - completedToday} {t.dashboard.remaining}</span>
          </div>
          <div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                {completedToday}
              </span>
              <span className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>/ {totalTasksToday}</span>
              <span className="text-xs ml-auto font-medium" style={{ color: "var(--color-success)" }}>{Math.round(taskCompletionRate)}%</span>
            </div>
            {/* THIN, SUBTLE PROGRESS BAR */}
            <div className="h-0.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div 
                className="h-full rounded-full transition-all duration-1000" 
                style={{ width: `${taskCompletionRate}%`, background: "var(--color-success)" }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Today's Tasks First, Then Your Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planning Section - Single Today's Tasks connected with Planner */}
        <div className="flex flex-col lg:order-1">
          <div className="card p-6 flex flex-col h-full justify-between">
            <div>
              <div className="flex justify-between items-center mb-5 pb-3 border-b" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(168, 85, 247, 0.12)", color: "var(--color-purple-bright)" }}>
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                      {t.dashboard.todaysTasks}
                    </h3>
                    <span className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
                      {completedToday} / {totalTasksToday} {t.dashboard.tasksDone}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => navigateTo("planner")} 
                  className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all hover:opacity-90 cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-purple-bright)", border: "1px solid var(--color-border-subtle)" }}
                >
                  <span>{t.dashboard.viewPlanner}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Task List */}
              <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
                {todayUnifiedTasks.map((task) => (
                  <div 
                    key={task.key} 
                    onClick={() => handleToggleTask(task)}
                    className="p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    style={{ 
                      background: task.completed ? "rgba(255,255,255,0.01)" : "var(--color-bg-secondary)", 
                      borderColor: task.completed ? "rgba(255,255,255,0.05)" : "var(--color-border-subtle)" 
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Checkbox button */}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTask(task);
                        }} 
                        className="w-5 h-5 flex items-center justify-center rounded-md border transition-all flex-shrink-0 cursor-pointer"
                        style={{ 
                          borderColor: task.completed ? "var(--color-success)" : "var(--color-border-active)", 
                          background: task.completed ? "var(--color-success)" : "rgba(255,255,255,0.03)" 
                        }}
                        aria-label="Toggle completed"
                      >
                        {task.completed && (
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <p 
                          className={`text-sm font-medium truncate transition-all ${
                            task.completed ? "line-through opacity-40" : "group-hover:opacity-90"
                          }`}
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {task.name}
                        </p>
                        
                        {/* Scheduled Time & Category Metadata */}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {task.time && (
                            <span 
                              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded"
                              style={{ background: "rgba(168, 85, 247, 0.1)", color: "var(--color-purple-bright)" }}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              {formatTime12hr(task.time)}
                              {task.endTime ? ` - ${formatTime12hr(task.endTime)}` : ""}
                            </span>
                          )}
                          {task.category && (
                            <span 
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text-muted)" }}
                            >
                              {task.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {todayUnifiedTasks.length === 0 && (
                  <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl" style={{ borderColor: "var(--color-border-subtle)" }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text-muted)" }}>
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
                      {t.dashboard.noPendingTasks}
                    </p>
                    <p className="text-[11px] mb-4 max-w-[220px]" style={{ color: "var(--color-text-muted)" }}>
                      {t.dashboard.noScheduledBlocks}
                    </p>
                    <button 
                      onClick={() => navigateTo("planner")} 
                      className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full transition-all hover:opacity-90 cursor-pointer shadow-sm"
                      style={{ background: "var(--color-purple-primary)", color: "white" }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t.planner.addNoteEvent}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Card - Your Progress */}
        <div className="card lg:col-span-2 overflow-hidden flex flex-col lg:order-2">
          {/* Card Header & Tabs */}
          <div className="p-6 pb-0 flex flex-row items-center justify-between gap-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{t.dashboard.yourProgress}</h2>
            <div className="relative inline-flex items-center p-0.5 rounded-full w-fit shrink-0 self-start sm:self-auto" style={{ background: "rgba(255,255,255,0.04)" }}>
              {/* Sliding Active Background */}
              <div 
                className="absolute top-0.5 bottom-0.5 rounded-full transition-transform duration-300 ease-out"
                style={{
                  width: "calc(50% - 2px)",
                  background: "rgba(255,255,255,0.1)",
                  transform: activeTab === "weekly" ? "translateX(0)" : "translateX(100%)",
                  left: "2px"
                }}
              />
              <button 
                onClick={() => handleTabChange("weekly")}
                className="relative z-10 px-3 py-1 rounded-full text-[11px] font-bold transition-colors duration-300 w-[64px]"
                style={{ 
                  color: activeTab === "weekly" ? "var(--color-text-primary)" : "var(--color-text-muted)"
                }}
              >
                {t.dashboard.weekly}
              </button>
              <button 
                onClick={() => handleTabChange("monthly")}
                className="relative z-10 px-3 py-1 rounded-full text-[11px] font-bold transition-colors duration-300 w-[64px]"
                style={{ 
                  color: activeTab === "monthly" ? "var(--color-text-primary)" : "var(--color-text-muted)"
                }}
              >
                {t.dashboard.monthly}
              </button>
            </div>
          </div>

          {/* Swipable Area */}
          <div className="relative w-full overflow-hidden flex-1">
            <div 
              className="flex w-[200%] h-full transition-transform duration-500 ease-in-out" 
              style={{ transform: activeTab === "weekly" ? "translateX(0%)" : "translateX(-50%)" }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEndHandler}
            >
              {/* Weekly View */}
              <div className="w-1/2 flex-shrink-0 flex flex-col p-6">
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{weeklyHours}h</span>
                {weeklyHours > 0 ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--color-success)" }}>↑ {weeklyHours}h {t.dashboard.vsLastWeek}</span>
                ) : (
                  <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--color-text-muted)" }}>0% {t.dashboard.vsLastWeek}</span>
                )}
              </div>
              <div className="flex-1 w-full h-[220px] mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  {/* HYBRID VISUALIZATION: ComposedChart with Bar + Line */}
                  <ComposedChart data={displayWeeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                    <Bar dataKey="hours" barSize={16} radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000}>
                      {displayWeeklyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isToday ? "var(--color-purple-primary)" : "var(--color-bg-elevated)"} 
                          opacity={entry.isFuture ? 0.3 : (entry.isToday ? 1 : 0.7)}
                        />
                      ))}
                    </Bar>
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="var(--color-purple-bright)" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: "var(--color-bg-base)", stroke: "var(--color-purple-bright)", strokeWidth: 2 }} 
                      activeDot={{ r: 5, fill: "var(--color-purple-primary)", stroke: "var(--color-bg-base)", strokeWidth: 2 }} 
                      isAnimationActive={true} 
                      animationDuration={1500} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t pt-6" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.focusTime}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{weeklyHours}h</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.tasksDone}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{completedTasksThisWeek}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.bestDay}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{bestDay.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.dailyAvg}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{(weeklyHours / 7).toFixed(1)}h</p>
                </div>
              </div>
            </div>

            {/* Monthly View */}
            <div className="w-1/2 flex-shrink-0 flex flex-col p-6">
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{monthlyHours}h</span>
                {monthlyHours > 0 ? (
                  <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--color-success)" }}>↑ {monthlyHours}h {t.dashboard.vsLastMonth}</span>
                ) : (
                  <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: "rgba(255, 255, 255, 0.05)", color: "var(--color-text-muted)" }}>0% {t.dashboard.vsLastMonth}</span>
                )}
              </div>
              <div className="flex-1 w-full h-[220px] mb-8">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                    <Bar dataKey="hours" barSize={16} radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000}>
                      {monthlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isCurrent ? "var(--color-purple-primary)" : "var(--color-bg-elevated)"} opacity={0.7} />
                      ))}
                    </Bar>
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="var(--color-purple-bright)" 
                      strokeWidth={2} 
                      dot={{ r: 3, fill: "var(--color-bg-base)", stroke: "var(--color-purple-bright)", strokeWidth: 2 }} 
                      activeDot={{ r: 5, fill: "var(--color-purple-primary)", stroke: "var(--color-bg-base)", strokeWidth: 2 }} 
                      isAnimationActive={true} 
                      animationDuration={1500} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t pt-6" style={{ borderColor: "var(--color-border-subtle)" }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.focusTime}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{monthlyHours}h</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.tasksDone}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{completedTasksThisMonth}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.bestWeek}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{monthlyHours > 0 ? "This Week" : "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.consistency}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{currentStreak > 0 ? `${Math.min(Math.round((currentStreak / 7) * 100), 100)}%` : "0%"}</p>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tertiary Row: Consistency & Distractions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Refined Consistency Tracker */}
        <div className="card p-6 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.consistency}</span>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t.dashboard.sevenDayActivity}</h3>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.04)", color: "var(--color-text-primary)" }}>
              {currentStreak} {t.dashboard.dayStreak}
            </span>
          </div>
          
          {/* Connected Dots Visual */}
          <div className="relative flex justify-between items-center w-full px-2 mt-4">
            {displayWeeklyData.map((day, idx) => {
              const isNextActive = idx < displayWeeklyData.length - 1 && displayWeeklyData[idx + 1].hasActivity;
              const isCurrentActive = day.hasActivity;
              
              return (
                <div key={idx} className="relative flex flex-col items-center flex-1">
                  {/* Connecting Line (Right) */}
                  {idx < displayWeeklyData.length - 1 && (
                    <div 
                      className="absolute top-[9px] left-[50%] w-full h-[2px] z-0 transition-colors duration-500"
                      style={{
                        background: isCurrentActive && isNextActive 
                          ? "var(--color-purple-primary)" 
                          : "rgba(255,255,255,0.06)",
                        opacity: isCurrentActive && isNextActive ? 0.7 : 1
                      }}
                    />
                  )}
                  
                  {/* Dot */}
                  <div 
                    className="w-[18px] h-[18px] rounded-full flex items-center justify-center z-10 relative transition-all duration-300"
                    style={{ 
                      background: day.hasActivity 
                        ? "var(--color-purple-primary)" 
                        : "var(--color-bg-base)",
                      border: day.isToday 
                        ? "2px solid var(--color-text-primary)" 
                        : day.hasActivity 
                          ? "2px solid var(--color-purple-primary)"
                          : "2px solid rgba(255,255,255,0.1)",
                      boxShadow: day.isToday && day.hasActivity ? "0 0 8px rgba(59, 130, 246, 0.4)" : "none",
                      opacity: day.isFuture ? 0.3 : 1
                    }}
                  >
                  </div>
                  
                  {/* Label */}
                  <span 
                    className="text-[10px] font-bold uppercase mt-3" 
                    style={{ 
                      color: day.isToday ? "var(--color-text-primary)" : "var(--color-text-muted)",
                      opacity: day.isFuture ? 0.5 : 1
                    }}
                  >
                    {day.name.charAt(0)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Distraction Tracker */}
        <div className="card p-6 flex flex-col justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider mb-4 block" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.distractionTracker}</span>
          {todayDistractions.length === 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(34, 197, 94, 0.15)" }}>
                <Shield size={20} color="#22C55E" />
              </div>
              <div>
                <h3 className="text-base font-bold mb-0.5" style={{ color: "var(--color-text-primary)" }}>0 {t.dashboard.interruptions}</h3>
                <p className="text-xs font-medium" style={{ color: "var(--color-success)" }}>{t.dashboard.perfectFocus}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(239, 68, 68, 0.15)" }}>
                 <span className="text-lg font-bold text-red-500">{todayDistractions.length}</span>
               </div>
               <div>
                 <h3 className="text-base font-bold mb-0.5" style={{ color: "var(--color-text-primary)" }}>{t.dashboard.interruptionsLogged}</h3>
                 <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>{t.dashboard.stayMindful}</p>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
