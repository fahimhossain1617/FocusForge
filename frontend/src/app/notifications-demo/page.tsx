"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { NotificationOrbAvatar } from "../../components/navigation/NotificationOrbAvatar";
import { NotificationBanner } from "../../components/navigation/NotificationBanner";
import NotificationCenter from "../../components/navigation/NotificationCenter";
import { notificationService } from "../../services/notificationService";
import { notificationRotationManager } from "../../services/notificationTemplates";
import { NotificationCategory } from "../../types";
import NotificationPermissionPrompt from "../../components/notifications/NotificationPermissionPrompt";
import { useNotificationPermissionPrompt } from "../../hooks/useNotificationPermissionPrompt";
import notificationPromptService from "../../services/notificationPromptService";
import { 
  Bell, 
  Sparkles, 
  Moon, 
  Sun, 
  Languages, 
  Play, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  Flame, 
  Target,
  RotateCw
} from "lucide-react";

export default function NotificationsDemoPage() {
  const [isDark, setIsDark] = useState(true);
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>("daily_plan");
  const [lastTriggeredTemplate, setLastTriggeredTemplate] = useState<string>("");

  const isBn = lang === "bn";

  const {
    isOpen: isPermissionPromptOpen,
    handleEnable: handleEnablePermission,
    handleLater: handleLaterPermission,
    triggerManually: triggerPermissionPrompt,
    resetForTesting: resetPermissionPrompt,
  } = useNotificationPermissionPrompt();

  const [mounted, setMounted] = useState(false);
  const [promptStats, setPromptStats] = useState({
    dailyDate: "",
    dailyCount: 0,
    totalActionsSincePrompt: 0,
    hasGranted: false,
    permission: "default",
    isSupported: true,
  });

  useEffect(() => {
    setMounted(true);
    setPromptStats(notificationPromptService.getDebugStats());
  }, []);

  const refreshStats = () => {
    setPromptStats(notificationPromptService.getDebugStats());
  };

  // Trigger live interactive notification banner
  const triggerNotification = (category: NotificationCategory, customTitle?: string) => {
    setActiveCategory(category);
    const template = notificationRotationManager.getNext(
      category, 
      lang, 
      { taskName: isBn ? "ডাটাবেস অ্যাসাইনমেন্ট" : "DBMS Assignment", skillName: isBn ? "পাইথন প্রোগ্রামিং" : "Python Programming", count: 7 },
      "demo_user"
    );

    setLastTriggeredTemplate(template.message);

    // Dispatch live in-app notification banner
    notificationService.send({
      category,
      templateId: template.templateId,
      appTag: template.appTag,
      title: customTitle || template.title,
      body: template.message,
      orbMood: template.orbMood,
      type: "system",
      taskId: 101,
      actionRoute: "today",
      actions: [
        { label: isBn ? "টাস্ক খুলুন" : "Open task", onClick: () => {}, variant: "primary" },
        { label: isBn ? "১০মি দেরি" : "Snooze 10m", onClick: () => {}, variant: "secondary" }
      ]
    });
  };

  const orbReactionsList = [
    { mood: "curious", title: isBn ? "কৌতূহলী (Curious)" : "Curious", desc: isBn ? "দৈনিক প্ল্যান ও নতুন শুরু" : "Daily Plan / AI suggestions" },
    { mood: "attentive", title: isBn ? "মনোযোগী (Attentive)" : "Attentive", desc: isBn ? "টাস্ক শুরু ও সিস্টেম নোটিফিকেশন" : "Task start & due soon" },
    { mood: "concerned", title: isBn ? "চিন্তিত/সহায়ক (Concerned)" : "Concerned", desc: isBn ? "ফোকাস সেশন বাকি থাকলে" : "Missing Focus sessions" },
    { mood: "proud", title: isBn ? "গর্বিত (Proud)" : "Proud", desc: isBn ? "টাস্ক সমাপ্তি ও স্ট্রিক অর্জন" : "Milestones & Streaks" },
    { mood: "celebrating", title: isBn ? "উল্লাস (Cheering)" : "Cheering", desc: isBn ? "Done বাটনে চাপ দিলে ২ সেকেন্ড" : "Triggered for 2s on Done" },
    { mood: "thinking", title: isBn ? "ভাবুক (Thinking)" : "Thinking", desc: isBn ? "নিষ্ক্রিয়তার সঙ্গী তাগিদ" : "Inactivity gentle nudge" },
    { mood: "sleepy", title: isBn ? "শান্ত/ঘুমন্ত (Sleepy)" : "Sleepy", desc: isBn ? "বিরতি ও কুয়ায়েট আওয়ার্স" : "Break time & Quiet hours" },
    { mood: "playful", title: isBn ? "চঞ্চল (Playful)" : "Playful", desc: isBn ? "মজার মুহূর্ত ও অগ্রগতি" : "Playful check-ins" },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans ${isDark ? "bg-[#0A1224] text-[#EAF1FF]" : "bg-[#EEF3FB] text-[#0B1F54]"}`}>
      {/* Live In-App Notification Banner Component */}
      <NotificationBanner />

      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md px-6 py-4 flex items-center justify-between ${isDark ? "bg-[#101B35]/90 border-[#22346B]" : "bg-white/90 border-[#D5DEEE]"}`}>
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className={`p-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors ${isDark ? "hover:bg-[#152345] text-[#8DA2CC]" : "hover:bg-[#E2EAF5] text-[#5B6B8C]"}`}
          >
            <ArrowLeft size={18} />
            <span>{isBn ? "অ্যাপে ফিরুন" : "Back to App"}</span>
          </Link>
          <div className="h-5 w-[1px] bg-gray-400/30" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              F
            </div>
            <div>
              <h1 className="text-base font-bold leading-none">Focentia Notification System</h1>
              <p className="text-[11px] opacity-70 mt-0.5">{isBn ? "লাইভ ডিজাইন ও ফিচার টেস্ট ল্যাব" : "Live Design & Feature Test Lab"}</p>
            </div>
          </div>
        </div>

        {/* Global Controls: Theme, Language, Notification Center */}
        <div className="flex items-center gap-2.5">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setLang(lang === "bn" ? "en" : "bn")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isDark ? "bg-[#101B35] border-[#22346B] text-[#EAF1FF] hover:border-blue-500" : "bg-white border-[#D5DEEE] text-[#0B1F54] hover:border-blue-500"
            }`}
          >
            <Languages size={15} className="text-blue-500" />
            <span>{lang === "bn" ? "বাংলা (BN)" : "English (EN)"}</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              isDark ? "bg-[#101B35] border-[#22346B] text-yellow-400 hover:bg-[#152345]" : "bg-white border-[#D5DEEE] text-blue-600 hover:bg-[#E2EAF5]"
            }`}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Open Notification Center Drawer */}
          <button
            type="button"
            onClick={() => setIsNotifCenterOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/25 cursor-pointer transition-all active:scale-95"
          >
            <Bell size={15} />
            <span>{isBn ? "নোটিফিকেশন সেন্টার খুলুন" : "Open Notification Center"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Hero Section */}
        <div className={`p-8 rounded-3xl border relative overflow-hidden ${isDark ? "bg-[#101B35] border-[#22346B]" : "bg-white border-[#D5DEEE]"}`}>
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} />
              <span>Production Ready System</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isBn ? "লাইভ নোটিফিকেশন ইন্টারঅ্যাকশন ডেমো" : "Live Notification Interaction Demo"}
            </h2>
            <p className={`text-sm leading-relaxed ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
              {isBn 
                ? "নিচের যেকোনো বাটনে ক্লিক করে সাথে সাথে রিয়েল-টাইম ব্যানার নোটিফিকেশন ট্রিগার করুন। shuffle-bag রোটেশন অ্যালগরিদম পরীক্ষা করতে একই বাটনে একাধিকবার ক্লিক করুন (একই মেসেজ পরপর রিপিট হবে না)।"
                : "Click any button below to trigger real-time banner notifications with custom Orb face emotions. Click the same button repeatedly to test the shuffle-bag rotation algorithm (no consecutive duplicate templates)."}
            </p>
          </div>
        </div>

        {/* SECTION 0: Contextual Notification Permission Prompt Test */}
        <section className={`p-6 rounded-2xl border space-y-4 ${isDark ? "bg-[#101B35] border-[#22346B]" : "bg-white border-[#D5DEEE]"}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold">
                {isBn ? "স্মার্ট নোটিফিকেশন পারমিশন প্রম্পট (Non-intrusive Contextual Prompt)" : "Smart Notification Permission Prompt"}
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
                {isBn
                  ? "টাস্ক যোগ বা ফিচার ব্যবহারের পর স্বয়ংক্রিয়ভাবে ওঠে (ডেইলি সর্বোচ্চ ২ বার, কোনো ব্যাকগ্রাউন্ড ব্লার/কালো ছাড়া)"
                  : "Triggers after task creation or 2-3 feature interactions (max 2/day, zero background dim/blur)"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  resetPermissionPrompt();
                  refreshStats();
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isDark ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                {isBn ? "কাউন্টার রিসেট করুন" : "Reset Daily Limit"}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerPermissionPrompt();
                  refreshStats();
                }}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                {isBn ? "প্রম্পট টেস্ট করুন" : "Trigger Permission Prompt"}
              </button>
            </div>
          </div>

          {/* Prompt Status Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0A1224] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <span className="opacity-60 block text-[10px] uppercase font-bold">{isBn ? "অনুমতি স্ট্যাটাস" : "Permission Status"}</span>
              <span suppressHydrationWarning className="font-bold text-sm mt-0.5 block capitalize">{mounted ? promptStats.permission : "—"}</span>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0A1224] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <span className="opacity-60 block text-[10px] uppercase font-bold">{isBn ? "আজকের প্রম্পট সংখ্যা" : "Today's Prompts"}</span>
              <span suppressHydrationWarning className="font-bold text-sm mt-0.5 block">{mounted ? promptStats.dailyCount : 0} / 2 {isBn ? "বার" : "max"}</span>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0A1224] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <span className="opacity-60 block text-[10px] uppercase font-bold">{isBn ? "অ্যাকশন কাউন্টার" : "Action Counter"}</span>
              <span suppressHydrationWarning className="font-bold text-sm mt-0.5 block">{mounted ? promptStats.totalActionsSincePrompt : 0} {isBn ? "টি কাজ" : "actions"}</span>
            </div>
            <div className={`p-3 rounded-xl border ${isDark ? "bg-[#0A1224] border-slate-800" : "bg-slate-50 border-slate-200"}`}>
              <span className="opacity-60 block text-[10px] uppercase font-bold">{isBn ? "ব্রাউজার সাপোর্ট" : "Browser Support"}</span>
              <span suppressHydrationWarning className="font-bold text-sm mt-0.5 block">{mounted ? (promptStats.isSupported ? "Supported" : "Not Supported") : "—"}</span>
            </div>
          </div>
        </section>

        {/* SECTION 1: Live Interactive Triggers */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Play size={18} className="text-blue-500" />
              <span>{isBn ? "১. সরাসরি নোটিফিকেশন ট্রিগার করুন" : "1. Trigger Live Notifications"}</span>
            </h3>
            <span className="text-xs opacity-60">
              {isBn ? "ক্লিক করলেই স্ক্রিনের উপরে স্লাইড-ইন হবে" : "Slides in at the top of the screen"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Daily Morning Plan */}
            <button
              type="button"
              onClick={() => triggerNotification("daily_plan")}
              className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all hover:scale-[1.02] cursor-pointer group ${
                isDark ? "bg-[#101B35] border-[#22346B] hover:border-blue-500" : "bg-white border-[#D5DEEE] hover:border-blue-500 shadow-sm"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Target size={24} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  {isBn ? "আজকের প্ল্যান" : "DAILY PLAN"}
                </div>
                <h4 className="text-sm font-bold mt-0.5">{isBn ? "আজকের প্ল্যান তৈরি" : "Plan is Ready"}</h4>
                <p className={`text-xs mt-1 line-clamp-2 ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
                  {isBn ? "সকালে ব্যবহারকারীর জন্য দিনের প্রথম প্রেরণা।" : "Morning gentle companion prompt."}
                </p>
              </div>
            </button>

            {/* 2. Focus Reminder */}
            <button
              type="button"
              onClick={() => triggerNotification("focus_reminder")}
              className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all hover:scale-[1.02] cursor-pointer group ${
                isDark ? "bg-[#101B35] border-[#22346B] hover:border-blue-500" : "bg-white border-[#D5DEEE] hover:border-blue-500 shadow-sm"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  {isBn ? "ফোকাস রিমাইন্ডার" : "FOCUS REMINDER"}
                </div>
                <h4 className="text-sm font-bold mt-0.5">{isBn ? "ফোকাস সেশন বাকি" : "Focus Session Waiting"}</h4>
                <p className={`text-xs mt-1 line-clamp-2 ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
                  {isBn ? "দিনের বেলা বা সন্ধ্যায় ছোট সেশনের আন্তরিক আহবান।" : "Midday/evening encouragement."}
                </p>
              </div>
            </button>

            {/* 3. Task Start Reminder */}
            <button
              type="button"
              onClick={() => triggerNotification("task_start", isBn ? "টাস্ক শুরু করার সময় হয়েছে" : "Study Session Starting")}
              className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all hover:scale-[1.02] cursor-pointer group ${
                isDark ? "bg-[#101B35] border-[#22346B] hover:border-blue-500" : "bg-white border-[#D5DEEE] hover:border-blue-500 shadow-sm"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  {isBn ? "টাস্ক শুরু" : "TASK START"}
                </div>
                <h4 className="text-sm font-bold mt-0.5">{isBn ? "টাস্ক শুরু রিমাইন্ডার" : "Scheduled Task Start"}</h4>
                <p className={`text-xs mt-1 line-clamp-2 ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
                  {isBn ? "শিডিউল করা কাজের নির্দিষ্ট সময়ে রিমাইন্ডার।" : "Triggers at scheduled start time."}
                </p>
              </div>
            </button>

            {/* 4. Task Due Soon (Pre-Reminder) */}
            <button
              type="button"
              onClick={() => triggerNotification("task_pre_reminder", isBn ? "টাস্কের ৩০ মিনিট বাকি" : "Due in 30 minutes")}
              className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all hover:scale-[1.02] cursor-pointer group ${
                isDark ? "bg-[#101B35] border-[#22346B] hover:border-blue-500" : "bg-white border-[#D5DEEE] hover:border-blue-500 shadow-sm"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Clock size={24} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  {isBn ? "আসন্ন টাস্ক" : "TASK DUE SOON"}
                </div>
                <h4 className="text-sm font-bold mt-0.5">{isBn ? "৩০ মিনিট আগের প্রি-রিমাইন্ডার" : "30-min Pre-reminder"}</h4>
                <p className={`text-xs mt-1 line-clamp-2 ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
                  {isBn ? "জরুরি বা বড় টাস্কের আগে আগাম প্রস্তুতি।" : "Advance notification for important tasks."}
                </p>
              </div>
            </button>

            {/* 5. Inactivity Gentle Nudge */}
            <button
              type="button"
              onClick={() => triggerNotification("inactivity")}
              className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all hover:scale-[1.02] cursor-pointer group ${
                isDark ? "bg-[#101B35] border-[#22346B] hover:border-blue-500" : "bg-white border-[#D5DEEE] hover:border-blue-500 shadow-sm"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <RotateCw size={24} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  {isBn ? "সঙ্গী তাগিদ" : "GENTLE NUDGE"}
                </div>
                <h4 className="text-sm font-bold mt-0.5">{isBn ? "নিষ্ক্রিয়তার সঙ্গী মেসেজ" : "Meaningful Inactivity"}</h4>
                <p className={`text-xs mt-1 line-clamp-2 ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
                  {isBn ? "অ্যাপ খোলার বদলে নির্দিষ্ট কাজে ফেরার তাগিদ।" : "Action-specific companion nudge."}
                </p>
              </div>
            </button>

            {/* 6. Streak Milestone */}
            <button
              type="button"
              onClick={() => triggerNotification("streak_milestone", isBn ? "৭ দিনের ফোকাস স্ট্রিক!" : "7-Day Focus Streak!")}
              className={`p-5 rounded-2xl border text-left flex items-start gap-4 transition-all hover:scale-[1.02] cursor-pointer group ${
                isDark ? "bg-[#101B35] border-[#22346B] hover:border-blue-500" : "bg-white border-[#D5DEEE] hover:border-blue-500 shadow-sm"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Flame size={24} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  {isBn ? "স্ট্রিক ও অর্জন" : "STREAK MILESTONE"}
                </div>
                <h4 className="text-sm font-bold mt-0.5">{isBn ? "স্ট্রিক উদযাপন" : "Streak Celebration"}</h4>
                <p className={`text-xs mt-1 line-clamp-2 ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
                  {isBn ? "গর্বিত গোল্ডেন স্পার্কল অর্ব ফেভারিট।" : "Proud golden star Orb expression."}
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* SECTION 2: Exact Design Anatomy from PDF Spec */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-blue-500" />
            <span>{isBn ? "২. নোটিফিকেশন ডিজাইন অ্যানাটমি (PDF স্পেক)" : "2. Notification Design Anatomy (PDF Spec)"}</span>
          </h3>

          <div className={`p-6 rounded-3xl border flex flex-col items-center justify-center gap-6 ${isDark ? "bg-[#101B35] border-[#22346B]" : "bg-white border-[#D5DEEE]"}`}>
            {/* Live Rendered Notification Card */}
            <div className={`w-full max-w-[720px] rounded-[18px] p-4 flex flex-col gap-3.5 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.25)] border ${
              isDark ? "bg-[#101B35] text-[#EAF1FF] border-[#22346B]" : "bg-[#FFFFFF] text-[#0B1F54] border-[#D5DEEE]"
            }`}>
              <div className="flex items-center gap-3.5 w-full">
                {/* 1. App Logo Tile: 46x46, radius 13 */}
                <div className={`w-[46px] h-[46px] rounded-[13px] shrink-0 flex items-center justify-center border overflow-hidden ${
                  isDark ? "bg-[#0A1224] border-[#22346B]" : "bg-[#EEF3FB] border-[#D5DEEE]"
                }`}>
                  <img
                    src="/icons/icon-192x192.png"
                    alt="Focentia"
                    className="w-full h-full object-cover scale-110"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/logo.png";
                    }}
                  />
                </div>

                {/* 2. Text Area */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className={`text-[9.5px] font-bold uppercase tracking-wider mb-0.5 ${isDark ? "text-[#3B82F6]" : "text-[#1D4ED8]"}`}>
                    {isBn ? "ফোসেন্টিয়া - টাস্ক ডিউ" : "FOCENTIA - TASK DUE"}
                  </div>
                  <h4 className={`text-[14.5px] font-bold leading-tight truncate ${isDark ? "text-[#EAF1FF]" : "text-[#0B1F54]"}`}>
                    {isBn ? "ডিবিএমএস অ্যাসাইনমেন্ট জমা দিন" : "Submit DBMS assignment"}
                  </h4>
                  <p className={`text-[11px] leading-snug mt-0.5 ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
                    {isBn ? "আর ৩০ মিনিট বাকি - কোর্সওয়ার্ক" : "Due in 30 minutes - Coursework"}
                  </p>
                </div>

                {/* 3. Orb Avatar Reaction */}
                <NotificationOrbAvatar mood="attentive" size={62} className="mr-1 shrink-0" />
              </div>

              {/* 4. Action Buttons (Max 2, 30px pill height) */}
              <div className="flex items-center gap-2 pt-1 border-t border-black/5 dark:border-white/5">
                <button 
                  type="button" 
                  onClick={() => triggerNotification("daily_plan")}
                  className={`h-[30px] px-4 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    isDark ? "bg-[#3B82F6] text-white hover:bg-blue-600" : "bg-[#1D4ED8] text-white hover:bg-blue-700"
                  }`}
                >
                  {isBn ? "টাস্ক খুলুন" : "Open task"}
                </button>
                <button 
                  type="button" 
                  className={`h-[30px] px-4 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    isDark ? "bg-[#0A1224] text-[#EAF1FF] hover:bg-[#152345]" : "bg-[#EEF3FB] text-[#0B1F54] hover:bg-[#E2EAF5]"
                  }`}
                >
                  {isBn ? "১০মি দেরি" : "Snooze 10m"}
                </button>
              </div>
            </div>

            {/* Spec annotations */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs w-full max-w-[720px] pt-4 border-t border-gray-400/20">
              <div>
                <span className="font-bold block">1. Logo Tile</span>
                <span className="opacity-60 text-[11px]">46x46 px (radius 13)</span>
              </div>
              <div>
                <span className="font-bold block">2. Typography</span>
                <span className="opacity-60 text-[11px]">9.5pt Tag / 14.5pt Title</span>
              </div>
              <div>
                <span className="font-bold block">3. Orb Face Chip</span>
                <span className="opacity-60 text-[11px]">56x56 px (#0A1224 Navy)</span>
              </div>
              <div>
                <span className="font-bold block">4. Action Buttons</span>
                <span className="opacity-60 text-[11px]">30px Pill Shape (Max 2)</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: Orb Reaction Moods Gallery */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles size={18} className="text-blue-500" />
              <span>{isBn ? "৩. অর্ব ফেসিয়াল রিঅ্যাকশন সেট (Zero Unicode Emojis)" : "3. Orb Face Reaction Set (Zero Unicode Emojis)"}</span>
            </h3>
            <span className="text-xs opacity-60">
              {isBn ? "প্রতিটি নোটিফিকেশন টাইপের সাথে নির্দিষ্ট ফেসিয়াল এক্সপ্রেশন" : "Mapped strictly to message context"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {orbReactionsList.map((orb) => (
              <div 
                key={orb.mood}
                className={`p-4 rounded-2xl border flex flex-col items-center text-center gap-3 transition-all hover:scale-105 ${
                  isDark ? "bg-[#101B35] border-[#22346B]" : "bg-white border-[#D5DEEE] shadow-sm"
                }`}
              >
                <NotificationOrbAvatar mood={orb.mood} size={64} />
                <div>
                  <h4 className="text-xs font-bold">{orb.title}</h4>
                  <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#8DA2CC]" : "text-[#5B6B8C]"}`}>
                    {orb.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Contextual Notification Permission Prompt */}
      <NotificationPermissionPrompt
        isOpen={isPermissionPromptOpen}
        onEnable={async () => {
          await handleEnablePermission();
          refreshStats();
        }}
        onLater={() => {
          handleLaterPermission();
          refreshStats();
        }}
      />

      {/* Slide-over Notification Center Modal */}
      <NotificationCenter
        isOpen={isNotifCenterOpen}
        onClose={() => setIsNotifCenterOpen(false)}
      />
    </div>
  );
}
