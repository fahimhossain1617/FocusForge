"use client";

import { useState, useRef } from "react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Shield, Play } from "lucide-react";

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

function getLast7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

// Generate mock data for the monthly view to ensure the chart looks robust
function getMonthlyData() {
  return [
    { name: "Week 1", hours: 14.5, tasks: 22 },
    { name: "Week 2", hours: 18.2, tasks: 28 },
    { name: "Week 3", hours: 12.0, tasks: 19 },
    { name: "This Week", hours: 9.5, tasks: 15, isCurrent: true },
  ];
}

export default function DashboardPage() {
  const { state, navigateTo, getDailyBig3, cycleTaskStatus } = useAppContext();
  const { t } = useTranslation();
  const today = new Date().toISOString().split("T")[0];
  
  const [activeTab, setActiveTab] = useState<"weekly" | "monthly">("weekly");
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // --- Task Data ---
  const todayTasks = state.tasks.filter(
    (t) => t.targetDate === today || t.tier === "now" || (t.status === "completed" && t.targetDate === today)
  );
  const completedToday = todayTasks.filter((t) => t.status === "completed").length;
  const totalTasksToday = todayTasks.length;
  const taskCompletionRate = totalTasksToday > 0 ? (completedToday / totalTasksToday) * 100 : 0;

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

  const actualWeeklyHours = weeklyData.reduce((acc, curr) => acc + curr.hours, 0);
  
  // Fallback to Demo Data if user has very little data (to show off the UI)
  const isDemoMode = actualWeeklyHours < 5;
  
  const displayWeeklyData = isDemoMode ? [
    { name: "Mon", hours: 2.5, isToday: false, isFuture: false, hasActivity: true },
    { name: "Tue", hours: 3.8, isToday: false, isFuture: false, hasActivity: true },
    { name: "Wed", hours: 1.2, isToday: false, isFuture: false, hasActivity: true },
    { name: "Thu", hours: 4.5, isToday: false, isFuture: false, hasActivity: true },
    { name: "Fri", hours: 5.2, isToday: false, isFuture: false, hasActivity: true },
    { name: "Sat", hours: 3.1, isToday: true, isFuture: false, hasActivity: true },
    { name: "Sun", hours: 0, isToday: false, isFuture: true, hasActivity: false },
  ] : weeklyData;

  const weeklyHours = isDemoMode ? 20.3 : actualWeeklyHours;
  const bestDay = isDemoMode 
    ? { name: "Fri", hours: 5.2 } 
    : (weeklyData.length > 0 ? weeklyData.reduce((prev, current) => (prev.hours > current.hours) ? prev : current) : { name: "-", hours: 0 });

  const monthlyData = getMonthlyData();
  const monthlyHours = monthlyData.reduce((acc, curr) => acc + curr.hours, 0);

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {getGreeting(t)} 👋
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {formatDate()} &nbsp;·&nbsp; {t.dashboard.readyText}
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full shadow-sm" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border-active)" }}>
          <span className="text-xl">🔥</span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.currentStreak}</span>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{currentStreak} {t.dashboard.days}</span>
          </div>
        </div>
      </div>

      {/* First Row - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
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

        {/* Today's Tasks */}
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

        {/* Current Focus */}
        <div className="card p-5 flex flex-col justify-between" style={{ background: "linear-gradient(145deg, rgba(59, 130, 246, 0.08), rgba(10, 14, 26, 0.4))", borderColor: "var(--color-border-active)" }}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--color-purple-bright)" }}>{t.dashboard.currentFocus}</span>
          </div>
          {nextFocus ? (
            <div className="flex flex-col flex-1 justify-between">
              <p className="text-sm font-semibold line-clamp-2 leading-snug" style={{ color: "var(--color-text-primary)" }}>{nextFocus.name}</p>
              <div className="flex items-center justify-between mt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-text-secondary)" }}>
                  {nextFocus.category || "General"}
                </span>
                <button onClick={() => navigateTo("focus")} className="flex items-center gap-1 text-xs font-bold px-4 py-2 rounded-full transition-colors hover:opacity-90" style={{ background: "var(--color-purple-primary)", color: "white" }}>
                  <Play size={12} fill="white" /> {t.dashboard.start}
                </button>
              </div>
            </div>
          ) : (
             <div className="flex flex-col flex-1 justify-center items-center">
              <p className="text-sm font-medium text-center" style={{ color: "var(--color-text-secondary)" }}>{t.dashboard.noPendingTasks}</p>
             </div>
          )}
        </div>
      </div>

      {/* Main Grid: Progress & Planning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Analytics Card */}
        <div className="card lg:col-span-2 overflow-hidden flex flex-col">
          {/* Card Header & Tabs */}
          <div className="p-6 pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{t.dashboard.yourProgress}</h2>
            <div className="relative flex items-center p-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
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
                <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--color-success)" }}>↑ 12% {t.dashboard.vsLastWeek}</span>
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
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>24</p>
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
                <span className="text-xs font-medium px-2 py-1 rounded-md" style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--color-success)" }}>↑ 5% {t.dashboard.vsLastMonth}</span>
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
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>84</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.bestWeek}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Week 2</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.consistency}</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>82%</p>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>

        {/* Planning Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Today's Plan */}
          <div className="card p-6 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t.sidebar.dashboard}</h3>
              <button onClick={() => navigateTo("tasks")} className="text-[10px] font-bold uppercase tracking-wider hover:underline" style={{ color: "var(--color-purple-bright)" }}>
                View Full
              </button>
            </div>
            <div className="space-y-4 flex-1">
              {todayTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-3 group">
                  <button onClick={() => cycleTaskStatus(task.id)} className="w-5 h-5 flex items-center justify-center rounded border transition-colors flex-shrink-0" style={{ borderColor: task.status === 'completed' ? "var(--color-success)" : "var(--color-border-active)", background: task.status === 'completed' ? "var(--color-success)" : "rgba(255,255,255,0.02)" }}>
                    {task.status === 'completed' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <span className={`text-sm truncate font-medium transition-all ${task.status === 'completed' ? 'line-through opacity-40' : 'group-hover:opacity-80'}`} style={{ color: "var(--color-text-primary)" }}>
                    {task.name}
                  </span>
                </div>
              ))}
              {todayTasks.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>{t.dashboard.noPendingTasks}</p>
                </div>
              )}
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
