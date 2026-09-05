"use client";

import { useState, useRef, useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { useTranslation } from "../../hooks/useTranslation";
import { 
  Palette, Bell, Calendar, Tags, Globe, DownloadCloud, AlertTriangle, Info,
  Moon, Sun, ChevronRight, Check, X, BellRing, ArrowLeft
} from "lucide-react";
import notificationService from "../../services/notificationService";

// Reusable Toggle component ensuring perfectly centered knob and no layout shift
function Toggle({ checked, onChange, ariaLabel }: { checked: boolean, onChange: (c: boolean) => void, ariaLabel?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`toggle-switch shrink-0 ${checked ? "is-active" : ""}`}
    >
      <span className="toggle-knob" />
    </button>
  );
}

export default function SettingsPage() {
  const { state, updateState, resetState, showToast, navigateTo } = useAppContext();
  const { t } = useTranslation();
  
  // Local states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newCategory, setNewCategory] = useState("");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  
  // Danger zone modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetInput, setResetInput] = useState("");

  const [activeSection, setActiveSection] = useState("appearance");

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        showToast(t.settings.toasts.notifEnabled);
        updateState({ notifPreferences: { ...state.notifPreferences, enabled: true } });
      } else {
        showToast(t.settings.toasts.notifDenied, "error");
      }
    }
  };

  const handleTestNotification = async () => {
    if (notificationPermission !== 'granted') {
      await requestNotificationPermission();
      return;
    }
    const success = await notificationService.send({
      id: `test_notif_${Date.now()}`,
      title: "FocusForge Notification Active 🚀",
      body: "You will receive your Daily Morning Plan and scheduled task reminders on time!",
      tag: "test-notification",
    });
    if (success) {
      showToast(t.settings.testNotifSuccess || "Test notification sent!");
    } else {
      showToast(t.settings.toasts.notifDenied || "Notification blocked", "error");
    }
  };

  const setThemeMode = (mode: "dark" | "light") => {
    updateState({
      theme: {
        ...state.theme,
        mode,
        preset: mode === "light" ? "Cloud Blue" : "Midnight Blue",
        background: mode === "light" ? "#F5F8FC" : "#070A12",
      },
    });
    showToast(mode === "light" ? t.settings.toasts.lightTheme : t.settings.toasts.darkTheme, "info");
  };

  const updateNotifPref = (key: keyof typeof state.notifPreferences, value: any) => {
    updateState({ notifPreferences: { ...state.notifPreferences, [key]: value } });
  };

  const updateCalPref = (key: keyof typeof state.calendarPreferences, value: any) => {
    updateState({ calendarPreferences: { ...state.calendarPreferences, [key]: value } });
  };

  // Categories
  const handleAddCategory = () => {
    const cat = newCategory.trim();
    if (!cat) return;
    if (state.categories.includes(cat)) {
      showToast(t.settings.toasts.catExists, "error");
      return;
    }
    updateState({ categories: [...state.categories, cat] });
    setNewCategory("");
  };

  const removeCategory = (cat: string) => {
    updateState({ categories: state.categories.filter((c) => c !== cat) });
  };

  // Export/Import
  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focusforge_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t.settings.toasts.dataExported);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (confirm(t.settings.toasts.importWarning)) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target?.result as string);
          updateState(imported);
          showToast(t.settings.toasts.dataImported);
        } catch {
          showToast(t.settings.toasts.invalidJson, "error");
        }
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  const executeReset = () => {
    resetState();
    setShowResetModal(false);
    setResetInput("");
    showToast(t.settings.toasts.dataReset);
  };

  const sections = [
    { id: 'appearance', icon: Palette, label: t.settings.appearance },
    { id: 'notifications', icon: Bell, label: t.settings.notifications },
    { id: 'calendar', icon: Calendar, label: t.settings.calendarTasks },
    { id: 'categories', icon: Tags, label: t.settings.categories },
    { id: 'language', icon: Globe, label: t.settings.language },
    { id: 'data', icon: DownloadCloud, label: t.settings.dataBackup },
    { id: 'danger', icon: AlertTriangle, label: t.settings.dangerZone },
    { id: 'about', icon: Info, label: t.settings.aboutFocusForge },
  ];

  return (
    <div className={`fade-in max-w-5xl mx-auto pb-16 pt-6 px-4 sm:px-6 lg:px-8 ${state.lang === 'bn' ? 'font-bengali' : ''}`}>
      {/* Top Back Navigation Bar */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigateTo("today")}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shadow-xs"
          style={{
            borderColor: "var(--color-border-subtle)",
            color: "var(--color-text-primary)",
          }}
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={16} />
          <span>{state.lang === 'bn' ? "ড্যাশবোর্ডে ফিরে যান" : "Back to Dashboard"}</span>
        </button>
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {t.settings.title}
        </h1>
        <p className="text-sm mt-2 font-medium" style={{ color: "var(--color-text-muted)" }}>
          {t.settings.subtitle}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        
        {/* Navigation Sidebar */}
        <aside className="md:w-64 shrink-0">
          <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-4 md:pb-0 scrollbar-hide">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap border border-transparent ${
                  activeSection === sec.id 
                    ? "bg-purple-500/10 text-purple-500 border-purple-500/20" 
                    : "text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-300"
                }`}
                style={{ 
                  color: activeSection === sec.id ? "var(--color-purple-primary)" : "var(--color-text-muted)",
                  background: activeSection === sec.id ? "rgba(124, 58, 237, 0.08)" : "transparent",
                  borderColor: activeSection === sec.id ? "rgba(124, 58, 237, 0.15)" : "transparent"
                }}
              >
                <sec.icon size={18} className={activeSection === sec.id ? "opacity-100" : "opacity-60"} />
                {sec.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 max-w-2xl">
          <div className="space-y-8 animate-fade-in relative min-h-[400px]">
            
            {/* 1. APPEARANCE */}
            <div className={activeSection === 'appearance' ? 'block' : 'hidden'}>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t.settings.appearance}</h2>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>{t.settings.appearanceDesc}</p>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setThemeMode("dark")}
                  className={`group relative flex flex-col items-center justify-center w-32 h-24 rounded-2xl border transition-all cursor-pointer ${
                    state.theme.mode === "dark" 
                      ? "shadow-sm" 
                      : "hover:bg-white/[0.04]"
                  }`}
                  style={{
                    background: state.theme.mode === "dark" ? "rgba(59, 130, 246, 0.08)" : "var(--color-bg-secondary)",
                    borderColor: state.theme.mode === "dark" ? "var(--color-purple-primary)" : "var(--color-border-subtle)",
                    boxShadow: state.theme.mode === "dark" ? "0 0 16px rgba(59, 130, 246, 0.2)" : "none",
                    borderRadius: "16px"
                  }}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#070A12] border border-white/10 flex items-center justify-center mb-2">
                    <Moon size={16} className={state.theme.mode === "dark" ? "text-blue-400" : "text-zinc-400"} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {t.settings.dark}
                  </span>
                  {state.theme.mode === "dark" && (
                    <div 
                      className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "var(--color-purple-primary)" }}
                    >
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setThemeMode("light")}
                  className={`group relative flex flex-col items-center justify-center w-32 h-24 rounded-2xl border transition-all cursor-pointer ${
                    state.theme.mode === "light" 
                      ? "shadow-sm" 
                      : "hover:bg-white/[0.04]"
                  }`}
                  style={{
                    background: state.theme.mode === "light" ? "rgba(59, 130, 246, 0.08)" : "var(--color-bg-secondary)",
                    borderColor: state.theme.mode === "light" ? "var(--color-purple-primary)" : "var(--color-border-subtle)",
                    boxShadow: state.theme.mode === "light" ? "0 0 16px rgba(59, 130, 246, 0.2)" : "none",
                    borderRadius: "16px"
                  }}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F5F8FC] border border-black/10 flex items-center justify-center mb-2">
                    <Sun size={16} className={state.theme.mode === "light" ? "text-amber-500" : "text-zinc-600"} />
                  </div>
                  <span className="text-xs font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {t.settings.light}
                  </span>
                  {state.theme.mode === "light" && (
                    <div 
                      className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: "var(--color-purple-primary)" }}
                    >
                      <Check size={10} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* 2. NOTIFICATIONS */}
            <div className={activeSection === 'notifications' ? 'block' : 'hidden'}>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t.settings.notifications}</h2>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>{t.settings.notificationsDesc}</p>

              {/* Notification Permission Banner */}
              {notificationPermission !== 'granted' && (
                <div 
                  className="mb-8 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4" 
                  style={{ 
                    background: notificationPermission === 'denied' ? "rgba(239, 68, 68, 0.08)" : "rgba(59, 130, 246, 0.08)", 
                    border: notificationPermission === 'denied' ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid rgba(59, 130, 246, 0.2)" 
                  }}
                >
                  <div>
                    <h4 className={`text-sm font-semibold mb-1 ${notificationPermission === 'denied' ? 'text-red-500' : 'text-blue-400'}`}>
                      {notificationPermission === 'denied' ? (t.settings.notifDisabledTitle || "Notifications Blocked") : (t.settings.enableNotifications || "Enable Notifications")}
                    </h4>
                    <p className={`text-xs leading-relaxed max-w-lg ${notificationPermission === 'denied' ? 'text-red-400/80' : 'text-blue-300/80'}`}>
                      {notificationPermission === 'denied' 
                        ? (t.settings.permissionDeniedAlert || "Notification permission was blocked. Please allow notifications in your browser's site settings.")
                        : (t.settings.notifDisabledDesc || "Enable notifications to receive your daily plan and task reminders.")}
                    </p>
                  </div>
                  {notificationPermission !== 'denied' && (
                    <button 
                      onClick={requestNotificationPermission} 
                      className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
                    >
                      {t.settings.enableNotifBtn || "Enable Notifications"}
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {/* 1. Master Enable Notifications Switch */}
                <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                        {t.settings.enableNotifications || "Enable Notifications"}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                        {t.settings.enableNotificationsDesc || "Master switch for all FocusForge alerts and reminders."}
                      </p>
                    </div>
                    <Toggle 
                      checked={state.notifPreferences.enabled ?? true} 
                      onChange={(val) => updateNotifPref('enabled', val)} 
                    />
                  </div>
                </div>

                {/* 2. Daily Morning Plan Switch & Time Picker */}
                <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                        {t.settings.dailyMorningPlan || "Daily Morning Plan"}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                        {t.settings.dailyMorningPlanDesc || "Receive your scheduled plan summary every morning dynamically calculated from your actual tasks."}
                      </p>
                    </div>
                    <Toggle 
                      checked={state.notifPreferences.dailyMorningPlan ?? true} 
                      onChange={(val) => updateNotifPref('dailyMorningPlan', val)} 
                    />
                  </div>
                  {state.notifPreferences.dailyMorningPlan && (
                    <div className="mt-5 pt-5 border-t animate-fade-in" style={{ borderColor: "var(--color-border-subtle)" }}>
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>
                        {t.settings.dailyMorningPlanTime || "Daily Plan Notification Time"}
                      </label>
                      <input 
                        type="time" 
                        value={state.notifPreferences.dailyMorningPlanTime || "07:00"}
                        onChange={(e) => updateNotifPref('dailyMorningPlanTime', e.target.value)}
                        className="w-full sm:w-48 p-3 rounded-xl text-sm bg-transparent border outline-none transition-colors focus:border-[var(--color-purple-primary)]"
                        style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                      />
                    </div>
                  )}
                </div>

                {/* 3. Task Reminders Switch */}
                <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                        {t.settings.taskReminders}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                        {t.settings.taskRemindersDesc}
                      </p>
                    </div>
                    <Toggle 
                      checked={state.notifPreferences.taskReminders} 
                      onChange={(val) => updateNotifPref('taskReminders', val)} 
                    />
                  </div>
                </div>

                {/* 4. Optional Motivational Notifications Switch */}
                <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                        {t.settings.motivationalNotifications || "Optional Motivational Notifications"}
                      </h3>
                      <p className="text-xs mt-1 leading-relaxed max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                        {t.settings.motivationalNotificationsDesc || "Send a motivational greeting when you have no tasks planned for the day."}
                      </p>
                    </div>
                    <Toggle 
                      checked={state.notifPreferences.motivationalNotifications ?? true} 
                      onChange={(val) => updateNotifPref('motivationalNotifications', val)} 
                    />
                  </div>
                </div>

                {/* 5. Test Notification Action */}
                <div className="p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                      {t.settings.testNotification || "Send Test Notification"}
                    </h3>
                    <p className="text-xs mt-1 leading-relaxed max-w-sm" style={{ color: "var(--color-text-muted)" }}>
                      Test your device&apos;s audio chime and push alert popup.
                    </p>
                  </div>
                  <button 
                    onClick={handleTestNotification}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
                    style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                  >
                    <BellRing size={14} className="text-blue-400" />
                    {t.settings.testNotification || "Send Test Notification"}
                  </button>
                </div>

                <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t.settings.focusSessionReminder}</h3>
                      <p className="text-xs mt-1 leading-relaxed max-w-sm" style={{ color: "var(--color-text-muted)" }}>{t.settings.focusSessionReminderDesc}</p>
                    </div>
                    <Toggle 
                      checked={state.notifPreferences.focusSessionReminder} 
                      onChange={(val) => updateNotifPref('focusSessionReminder', val)} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. CALENDAR & TASKS */}
            <div className={activeSection === 'calendar' ? 'block' : 'hidden'}>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t.settings.calendarTasks}</h2>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>{t.settings.calendarTasksDesc}</p>
              
              <div className="space-y-4">
                <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <label className="block text-sm font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>{t.settings.defaultTaskReminder}</label>
                  <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>Default alert time for newly created tasks.</p>
                  <select 
                    value={state.calendarPreferences.defaultTaskReminder}
                    onChange={(e) => updateCalPref('defaultTaskReminder', parseInt(e.target.value))}
                    className="w-full sm:w-64 p-3 rounded-xl text-sm bg-transparent border outline-none transition-colors focus:border-[var(--color-purple-primary)]"
                    style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                  >
                    <option value={-1}>{t.settings.noReminder}</option>
                    {t.settings.reminderOpts.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="p-5 rounded-2xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <label className="block text-sm font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>{t.settings.weekStartsOn}</label>
                  <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>First day of the week in calendar views.</p>
                  <select 
                    value={state.calendarPreferences.weekStartsOn}
                    onChange={(e) => updateCalPref('weekStartsOn', e.target.value)}
                    className="w-full sm:w-64 p-3 rounded-xl text-sm bg-transparent border outline-none transition-colors focus:border-[var(--color-purple-primary)]"
                    style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                  >
                    <option value="saturday">{t.settings.saturday}</option>
                    <option value="sunday">{t.settings.sunday}</option>
                    <option value="monday">{t.settings.monday}</option>
                  </select>
                </div>

                <div className="p-5 rounded-2xl border flex items-center justify-between" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t.settings.showCompletedTasks}</h3>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{t.settings.showCompletedTasksDesc}</p>
                  </div>
                  <Toggle 
                    checked={state.calendarPreferences.showCompletedTasks} 
                    onChange={(val) => updateCalPref('showCompletedTasks', val)} 
                  />
                </div>
              </div>
            </div>

            {/* 4. CATEGORIES */}
            <div className={activeSection === 'categories' ? 'block' : 'hidden'}>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t.settings.categories}</h2>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>{t.settings.categoriesDesc}</p>
              
              <div className="p-6 rounded-2xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                <div className="flex flex-wrap gap-2.5 mb-8">
                  {state.categories.map((cat) => (
                    <div
                      key={cat}
                      className="group flex items-center gap-2 pl-4 pr-2 py-2 rounded-full border text-sm font-medium transition-all"
                      style={{ background: "rgba(124, 58, 237, 0.08)", borderColor: "rgba(124, 58, 237, 0.2)", color: "var(--color-purple-primary)" }}
                    >
                      <span>{cat}</span>
                      <button
                        onClick={() => removeCategory(cat)}
                        className="w-6 h-6 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-red-500 hover:text-white transition-all"
                        aria-label={`Remove category ${cat}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {state.categories.length === 0 && (
                    <p className="text-sm italic" style={{ color: "var(--color-text-muted)" }}>No categories defined yet.</p>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    placeholder={t.settings.addCategoryPlaceholder}
                    className="flex-1 max-w-sm p-3 rounded-xl text-sm bg-transparent border outline-none transition-colors focus:border-[var(--color-purple-primary)] shadow-sm"
                    style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-primary)" }}
                  />
                  <button 
                    onClick={handleAddCategory} 
                    className="px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-transform hover:scale-105 active:scale-95" 
                    style={{ background: "var(--color-purple-primary)", color: "white" }}
                  >
                    {t.settings.addBtn}
                  </button>
                </div>
              </div>
            </div>

            {/* 5. LANGUAGE */}
            <div className={activeSection === 'language' ? 'block' : 'hidden'}>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t.settings.language}</h2>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>{t.settings.languageDesc}</p>
              
              <div className="p-6 rounded-2xl border" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                <label className="block text-sm font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>{t.settings.appLanguage}</label>
                <div className="flex flex-col gap-3 max-w-sm">
                  <button 
                    onClick={() => updateState({ lang: 'en' })}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${state.lang === 'en' ? "border-[var(--color-purple-primary)] bg-[var(--color-purple-primary)]/10" : "border-transparent bg-black/5 dark:bg-white/5 hover:border-black/10 dark:hover:border-white/10"}`}
                  >
                    <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>English</span>
                    {state.lang === 'en' && <Check size={18} style={{ color: "var(--color-purple-primary)" }} />}
                  </button>
                  <button 
                    onClick={() => updateState({ lang: 'bn' })}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all font-bengali ${state.lang === 'bn' ? "border-[var(--color-purple-primary)] bg-[var(--color-purple-primary)]/10" : "border-transparent bg-black/5 dark:bg-white/5 hover:border-black/10 dark:hover:border-white/10"}`}
                  >
                    <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>বাংলা (Bengali)</span>
                    {state.lang === 'bn' && <Check size={18} style={{ color: "var(--color-purple-primary)" }} />}
                  </button>
                </div>
              </div>
            </div>

            {/* 6. DATA & BACKUP */}
            <div className={activeSection === 'data' ? 'block' : 'hidden'}>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t.settings.dataBackup}</h2>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>{t.settings.dataBackupDesc}</p>
              
              <div className="space-y-4">
                <div className="p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t.settings.exportData}</h3>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{t.settings.exportDataDesc}</p>
                  </div>
                  <button 
                    onClick={exportData} 
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 shrink-0 border" 
                    style={{ background: "transparent", color: "var(--color-text-primary)", borderColor: "var(--color-border-subtle)" }}
                  >
                    {t.settings.exportJson}
                  </button>
                </div>
                
                <div className="p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t.settings.importData}</h3>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>{t.settings.importDataDesc}</p>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80 shrink-0 border" 
                    style={{ background: "transparent", color: "var(--color-text-primary)", borderColor: "var(--color-border-subtle)" }}
                  >
                    {t.settings.importJson}
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json" onChange={importData} className="hidden" />
                </div>
              </div>
            </div>

            {/* 7. DANGER ZONE */}
            <div className={activeSection === 'danger' ? 'block' : 'hidden'}>
              <h2 className="text-xl font-bold mb-2 text-red-500">{t.settings.dangerZone}</h2>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-muted)" }}>{t.settings.dangerZoneDesc}</p>
              
              <div className="p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6" style={{ borderColor: "rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.03)" }}>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t.settings.resetAllData}</h3>
                  <p className="text-xs mt-1 max-w-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{t.settings.resetAllDataDesc}</p>
                </div>
                <button 
                  onClick={() => setShowResetModal(true)} 
                  className="px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors shrink-0"
                >
                  {t.settings.resetAllData}
                </button>
              </div>
            </div>

            {/* 8. ABOUT FOCUSFORGE */}
            <div className={activeSection === 'about' ? 'block' : 'hidden'}>
              <h2 className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>{t.settings.aboutFocusForge}</h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--color-text-muted)" }}>
                {t.settings.aboutDesc}
              </p>
              
              <div className="p-6 rounded-2xl border space-y-4 max-w-sm" style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-card)" }}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold" style={{ color: "var(--color-text-muted)" }}>{t.settings.version}</span>
                  <span className="font-bold px-2 py-1 rounded-md bg-black/5 dark:bg-white/5" style={{ color: "var(--color-text-primary)" }}>v1.0.0</span>
                </div>
                <div className="h-px w-full" style={{ background: "var(--color-border-subtle)" }} />
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold" style={{ color: "var(--color-text-muted)" }}>{t.settings.privacy}</span>
                  <span className="text-xs font-medium px-2 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400">
                    {t.settings.localStorageOnly}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md border rounded-3xl p-8 shadow-2xl scale-in" style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border-subtle)" }}>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-red-500 mb-2">{t.settings.resetConfirmTitle}</h3>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              {t.settings.resetConfirmDesc1}
              <br /><br />
              {t.settings.resetConfirmDesc2} <strong className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">RESET</strong> {t.settings.resetConfirmDesc3}
            </p>
            
            <input 
              type="text" 
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="RESET"
              className="w-full p-4 rounded-xl border-2 mb-8 outline-none focus:border-red-500 transition-colors bg-transparent text-center font-bold tracking-widest"
              style={{ color: "var(--color-text-primary)", borderColor: "var(--color-border-subtle)" }}
            />
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button 
                onClick={() => { setShowResetModal(false); setResetInput(""); }}
                className="w-full sm:w-1/2 px-4 py-3 rounded-xl text-sm font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--color-text-primary)" }}
              >
                {t.settings.cancel}
              </button>
              <button 
                onClick={executeReset}
                disabled={resetInput !== "RESET"}
                className={`w-full sm:w-1/2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${resetInput === "RESET" ? "bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-600 hover:-translate-y-0.5" : "bg-red-500/20 text-red-500/40 cursor-not-allowed"}`}
              >
                {t.settings.resetEverything}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
