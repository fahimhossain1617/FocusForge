"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { useTranslation } from "../hooks/useTranslation";
import { 
  LayoutDashboard, 
  Bot, 
  Files, 
  CalendarDays, 
  PencilLine, 
  GraduationCap, 
  Target, 
  Settings as SettingsIcon, 
  User as ProfileIcon,
  LogOut,
  LogIn,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  X,
  Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAnimateExit } from "../hooks/useAnimateExit";

interface NavItem {
  id: string;
  label: string;
  tagline?: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: "today", label: "Dashboard", tagline: "Your day at a glance", icon: LayoutDashboard },
  { id: "ai-agent", label: "AI Agent", tagline: "Productivity AI copilot", icon: Bot },
  { id: "tasks", label: "Notes & files", tagline: "Your notes, docs, and attachments", icon: Files },
  { id: "planner", label: "Planner", tagline: "Plan your day and week", icon: CalendarDays },
  { id: "mind", label: "Capture", tagline: "Write it down before you forget", icon: PencilLine },
  { id: "learning", label: "Skill builder", tagline: "Track what you're learning", icon: GraduationCap },
  { id: "focus", label: "Focus", tagline: "Start a focus session", icon: Target },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isTourActive?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ 
  isOpen, 
  onClose, 
  isTourActive,
  isCollapsed = false,
  onToggleCollapse 
}: SidebarProps) {
  const { state, navigateTo } = useAppContext();
  const { 
    user, 
    isGuest, 
    openAuth, 
    openAccountSwitcher,
    promptLogout, 
    logoutConfirmOpen, 
    confirmLogout, 
    cancelLogout 
  } = useAuth();
  const { t } = useTranslation();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close profile dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isProfileMenuOpen) {
        setIsProfileMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProfileMenuOpen]);

  const handleNav = (pageId: string) => {
    navigateTo(pageId);
    setIsProfileMenuOpen(false);
    onClose();
  };

  const isGuestMode = !user || isGuest;
  const isLight = state.theme?.mode === "light";
  const logoSrc = isLight ? "/logo-light.png" : "/icons/icon-192x192.png";

  const rawUserName = user?.fullName || user?.displayName?.replace(/^\+8800/, "+880").replace(/^8800/, "+880") || (user?.identifier ? user.identifier.replace(/^\+8800/, "+880").replace(/^8800/, "+880") : (state.lang === 'bn' ? "গেস্ট" : "Guest"));
  const userName = isGuestMode ? (state.lang === 'bn' ? "গেস্ট ইউজার" : "Guest User") : rawUserName.trim();
  const userSubtitle = isGuestMode 
    ? (state.lang === 'bn' ? "সাইন ইন করুন" : "Sign In") 
    : (user?.identifier || (state.lang === 'bn' ? "প্রো মেম্বার" : "Pro"));

  const backdrop = useAnimateExit({ isOpen: isOpen && !isTourActive, durationMs: 200 });
  const logoutAnim = useAnimateExit({ isOpen: logoutConfirmOpen, durationMs: 200 });

  return (
    <>
      {/* Mobile backdrop */}
      {backdrop.shouldRender && (
        <div
          className={`fixed inset-0 bg-[#223A5E]/38 backdrop-blur-sm z-40 md:hidden transition-opacity duration-260 ${backdrop.isExiting ? "motion-exit-fade" : "motion-overlay"}`}
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer / Desktop Rail */}
      <aside
        className={`sidebar fixed left-0 top-0 bottom-0 min-h-screen flex flex-col py-4 bg-white dark:bg-[#070a14] text-[#52627A] dark:text-muted-foreground border-r border-[#DCE5F0] dark:border-border transition-all duration-200 ease-in-out select-none shadow-[0_8px_28px_rgba(0,0,0,0.06)] dark:shadow-none w-[78%] max-w-[300px] px-3.5 ${
          isTourActive ? "z-[9999]" : "z-50"
        } ${
          isOpen ? "open translate-x-0 !translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        } ${
          isCollapsed ? "md:w-[76px] md:px-2" : "md:w-[260px] md:px-3.5"
        }`}
      >
        {/* ============================================================ */}
        {/* 1. TOP BRANDING ROW & COLLAPSE CONTROL                       */}
        {/* ============================================================ */}
        <div className="flex items-center justify-between mb-4 px-1 min-h-[40px]">
          {/* Logo & Name (Toggles sidebar collapse/expand on desktop, navigates to today on mobile) */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth >= 768 && onToggleCollapse) {
                onToggleCollapse();
              } else {
                handleNav("today");
              }
            }}
            className={`flex items-center gap-2.5 cursor-pointer rounded-xl p-1 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.04] outline-none focus-visible:ring-2 focus-visible:ring-[#5B8DEF] border-none text-left ${
              isCollapsed ? "md:w-full md:justify-center" : ""
            }`}
            title={isCollapsed ? "Expand sidebar (FocusForge)" : "Collapse sidebar (FocusForge)"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {/* FocusForge App Icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={logoSrc} 
              alt="FocusForge Logo" 
              className="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0" 
            />

            {/* Brand Title (Hidden when collapsed on desktop) */}
            <span className={`font-bold text-[17px] tracking-tight text-[#0F172A] dark:text-foreground whitespace-nowrap transition-opacity duration-200 block ${
              isCollapsed ? "md:hidden" : "md:block"
            }`}>
              FocusForge
            </span>
          </button>

          {/* Desktop Collapse / Expand Button */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5B8DEF] ${
                isCollapsed ? "mx-auto mt-1 mb-1" : "ml-auto"
              }`}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
          )}

          {/* Mobile Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors ml-auto cursor-pointer"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ============================================================ */}
        {/* 2. NAVIGATION ITEMS                                         */}
        {/* ============================================================ */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto overflow-x-hidden py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = state.activePage === item.id;

            const translationKeyMap: Record<string, { label: keyof typeof t.sidebar; tagline?: keyof typeof t.sidebar }> = {
              today: { label: 'dashboard', tagline: 'dashboardTagline' },
              mind: { label: 'myMind', tagline: 'myMindTagline' },
              tasks: { label: 'workspace', tagline: 'workspaceTagline' },
              planner: { label: 'planner', tagline: 'plannerTagline' },
              focus: { label: 'focus', tagline: 'focusTagline' },
              learning: { label: 'learningHub', tagline: 'learningHubTagline' },
              'ai-agent': { label: 'aiAgent', tagline: 'aiAgentTagline' },
              profile: { label: 'myProfile' },
              settings: { label: 'settings' }
            };

            const keys = translationKeyMap[item.id];
            const displayLabel = (keys?.label && t.sidebar[keys.label]) ? t.sidebar[keys.label] : item.label;
            const displayTagline = (keys?.tagline && t.sidebar[keys.tagline]) ? t.sidebar[keys.tagline] : item.tagline;

            return (
              <div key={item.id} className="relative group flex items-center w-full">
                <button
                  type="button"
                  data-tour={`tour-${item.id}`}
                  id={`nav-${item.id}`}
                  onClick={() => handleNav(item.id)}
                  className={`sidebar-nav-btn relative flex items-center rounded-xl text-left transition-colors duration-150 ease-out cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5B8DEF] w-full gap-3 px-3.5 min-h-[44px] ${
                    isCollapsed 
                      ? "md:justify-center md:w-11 md:h-11 md:mx-auto md:px-0 md:min-h-0 md:gap-0" 
                      : "md:w-full md:gap-3 md:px-3.5 md:min-h-[44px]"
                  } ${
                    isActive 
                      ? "sidebar-nav-btn-active text-[#223A5E] dark:text-foreground font-bold" 
                      : "text-[#52627A] dark:text-muted-foreground hover:bg-[#E8F1FC] dark:hover:bg-white/[0.06] hover:text-[#111827] dark:hover:text-foreground"
                  }`}
                  aria-label={displayLabel}
                >
                  {/* Sliding Active Indicator Bar */}
                  {isActive && (
                    <motion.div
                      layoutId="active-sidebar-pill"
                      className="sidebar-active-pill absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
                      transition={{ type: "spring", stiffness: 420, damping: 35, duration: 0.2 }}
                    >
                      <div className="sidebar-active-pill-bg absolute inset-0 rounded-xl bg-[#E7F0FF] dark:bg-blue-950/40" />
                      <div className="sidebar-active-pill-edge absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-[#5B8DEF] dark:bg-blue-400 shadow-[0_0_8px_#5B8DEF]" />
                    </motion.div>
                  )}

                  <span 
                    className={`sidebar-nav-icon relative z-10 flex items-center justify-center shrink-0 ${
                      isActive ? "text-[#223A5E] dark:text-blue-300" : "text-[#52627A] dark:text-muted-foreground group-hover:text-[#223A5E] dark:group-hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.1 : 1.75} />
                  </span>

                  {/* Navigation Label (Hidden when collapsed on desktop only) */}
                  <div className={`relative z-10 flex flex-col min-w-0 flex-1 block ${
                    isCollapsed ? "md:hidden" : "md:block"
                  }`}>
                    <span className={`sidebar-nav-label text-sm leading-tight break-words ${
                      isActive ? "text-[#223A5E] dark:text-foreground font-bold" : "font-medium"
                    }`}>
                      {displayLabel}
                    </span>
                  </div>
                </button>

                {/* Tooltip for Collapsed State */}
                {isCollapsed && (
                  <div className="hidden md:block pointer-events-none absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white dark:bg-[#1A2234] dark:text-slate-100 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0 border border-slate-700/50">
                    <div className="font-semibold">{displayLabel}</div>
                    {displayTagline && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">
                        {displayTagline}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ============================================================ */}
        {/* 3. BOTTOM USER PROFILE & SETTINGS AREA                      */}
        {/* ============================================================ */}
        <div className="mt-auto pt-3 border-t border-[#DCE5F0] dark:border-white/[0.06] relative" ref={profileRef}>
          {/* Profile Dropdown Popover (Box Card Style) */}
          <AnimatePresence>
            {isProfileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className={`absolute z-50 rounded-2xl border border-[#DCE5F0] dark:border-white/10 bg-white/95 dark:bg-[#0c101d]/95 backdrop-blur-2xl shadow-2xl p-2 mb-2 flex flex-col gap-1.5 ${
                  isCollapsed 
                    ? "left-full ml-3 bottom-0 w-64" 
                    : "bottom-full left-0 right-0 w-full"
                }`}
              >
                {/* User Info Box Card (Natural Rounded Box) */}
                <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/50 dark:border-white/[0.06] flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center shrink-0">
                    {user?.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={user.avatarUrl} 
                        alt={userName} 
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-[#5B8DEF]/40" 
                      />
                    ) : isGuestMode ? (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#E8F1FC] dark:bg-blue-950/60 border border-[#D0E1FD] dark:border-blue-900/40 text-[#0F172A] dark:text-blue-300">
                        <ProfileIcon size={16} strokeWidth={2.2} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#223A5E] text-white font-bold text-xs ring-1 ring-[#5B8DEF]/40 uppercase">
                        {userName ? userName[0].toUpperCase() : <ProfileIcon size={16} strokeWidth={2.2} />}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#2E9B73] ring-1.5 ring-white dark:ring-[#070a14]" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#0F172A] dark:text-foreground truncate leading-tight">
                      {userName}
                    </p>
                    <p className="text-[11px] text-[#52627A] dark:text-muted-foreground truncate leading-tight mt-0.5">
                      {user?.identifier || (isGuestMode ? (state.lang === 'bn' ? 'গেস্ট অ্যাকাউন্ট' : 'Guest Account') : 'user@focusforge.app')}
                    </p>
                  </div>
                </div>

                {/* Popover Actions (Clean Box Buttons, No Divider Lines) */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleNav("profile")}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#0F172A] dark:text-foreground hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                  >
                    <ProfileIcon size={14} className="text-[#5B8DEF]" />
                    <span>{t.sidebar.myProfile || "View Profile"}</span>
                  </button>

                  {isGuestMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        openAuth('login');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#5B8DEF] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors text-left cursor-pointer"
                    >
                      <LogIn size={14} className="text-[#5B8DEF]" />
                      <span>{t.auth.logIn || "Log In"}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          openAccountSwitcher();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[#0F172A] dark:text-foreground hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors text-left cursor-pointer"
                      >
                        <Users size={14} className="text-[#5B8DEF]" />
                        <span>Switch Account</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          promptLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
                      >
                        <LogOut size={14} className="text-rose-500" />
                        <span>{t.auth.logOut || "Log Out"}</span>
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded State Bottom Section (Always full on mobile, responsive on desktop) */}
          <div className={`items-center gap-2 p-1.5 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.05] flex ${isCollapsed ? "md:hidden" : "md:flex"}`}>
            {/* Clickable Profile Area (Avatar + Name) */}
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 min-w-0 flex-1 p-1 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/[0.06] transition-colors cursor-pointer text-left outline-none focus-visible:ring-2 focus-visible:ring-[#5B8DEF] group"
              aria-label="User Profile Menu"
              title={userName}
            >
              {/* Circular Profile Avatar */}
              <div className="relative flex items-center justify-center shrink-0">
                {user?.avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={user.avatarUrl} 
                    alt={userName} 
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-[#5B8DEF]/30 group-hover:ring-[#5B8DEF]/60 transition-all shadow-xs" 
                  />
                ) : isGuestMode ? (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#E8F1FC] dark:bg-blue-950/60 border border-[#D0E1FD] dark:border-blue-900/40 shadow-xs text-[#0F172A] dark:text-blue-300 transition-colors">
                    <ProfileIcon size={18} strokeWidth={2.2} />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#223A5E] text-white font-bold text-sm shadow-xs ring-2 ring-[#5B8DEF]/30 group-hover:ring-[#5B8DEF]/60 transition-all uppercase">
                    {userName ? userName[0].toUpperCase() : <ProfileIcon size={18} strokeWidth={2.2} />}
                  </div>
                )}
                {/* Active Status Indicator */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#2E9B73] ring-2 ring-white dark:ring-[#070a14]" />
              </div>

              {/* User Name & Subtitle */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm font-semibold text-[#0F172A] dark:text-foreground leading-tight truncate">
                  {userName}
                </span>
                <span className="text-[11px] text-[#52627A] dark:text-muted-foreground truncate leading-tight mt-0.5">
                  {userSubtitle}
                </span>
              </div>
            </button>

            {/* Independent Settings Icon Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNav("settings");
              }}
              className="p-2 rounded-xl text-[#52627A] dark:text-muted-foreground hover:text-[#0F172A] dark:hover:text-foreground hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5B8DEF]"
              aria-label={t.sidebar.settings || "Settings"}
              title={t.sidebar.settings || "Settings"}
            >
              <SettingsIcon size={18} />
            </button>
          </div>

          {/* Collapsed State Bottom Section (Icon Only) */}
          {isCollapsed && (
            <div className="hidden md:flex flex-col items-center gap-2">
              {/* Avatar Button */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="relative flex items-center justify-center w-11 h-11 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5B8DEF]"
                  aria-label="Profile Menu"
                >
                  <div className="relative flex items-center justify-center">
                    {user?.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={user.avatarUrl} 
                        alt={userName} 
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-[#5B8DEF]/30" 
                      />
                    ) : isGuestMode ? (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#E8F1FC] dark:bg-blue-950/60 border border-[#D0E1FD] dark:border-blue-900/40 text-[#0F172A] dark:text-blue-300">
                        <ProfileIcon size={18} strokeWidth={2.2} />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#223A5E] text-white font-bold text-sm ring-2 ring-[#5B8DEF]/30 uppercase">
                        {userName ? userName[0].toUpperCase() : <ProfileIcon size={18} strokeWidth={2.2} />}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#2E9B73] ring-2 ring-white dark:ring-[#070a14]" />
                  </div>
                </button>
                <div className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white dark:bg-[#1A2234] dark:text-slate-100 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0 border border-slate-700/50">
                  <div className="font-semibold">{userName}</div>
                  <div className="text-[10px] text-slate-400">{userSubtitle}</div>
                </div>
              </div>

              {/* Settings Icon Button */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => handleNav("settings")}
                  className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5B8DEF] ${
                    state.activePage === "settings"
                      ? "text-[#223A5E] dark:text-blue-300 bg-[#E7F0FF] dark:bg-blue-950/40"
                      : "text-[#52627A] dark:text-muted-foreground hover:text-[#0F172A] dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  }`}
                  aria-label={t.sidebar.settings || "Settings"}
                >
                  <SettingsIcon size={19} />
                </button>
                <div className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white dark:bg-[#1A2234] dark:text-slate-100 text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0 border border-slate-700/50">
                  <div className="font-semibold">{t.sidebar.settings || "Settings"}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {logoutAnim.shouldRender && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md ${logoutAnim.isExiting ? "motion-exit-fade" : "motion-overlay"}`}>
          <div className={`relative w-full max-w-sm rounded-3xl border border-[#DCE5F0] dark:border-white/10 bg-white dark:bg-[#111216] p-6 text-center shadow-2xl ${logoutAnim.isExiting ? "motion-exit-reveal" : "motion-scale-in"}`}>
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-500">
              <ShieldAlert size={24} />
            </div>

            <h3 className="text-lg font-semibold text-[#111827] dark:text-foreground mb-2">
              {t.auth.logOutConfirmTitle || "Confirm Logout"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-muted-foreground leading-relaxed mb-6">
              {t.auth.logOutConfirmDesc || "Are you sure you want to log out?"}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelLogout}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/10 border border-[#DCE5F0] dark:border-border transition-all cursor-pointer"
              >
                {t.auth.cancel || "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-all cursor-pointer shadow-lg shadow-red-600/30"
              >
                {t.auth.logOut || "Log Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
