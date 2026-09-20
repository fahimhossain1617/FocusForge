"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
  ShieldAlert
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
  { id: "settings", label: "Settings", tagline: "Preferences & controls", icon: SettingsIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isTourActive?: boolean;
}

export default function Sidebar({ isOpen, onClose, isTourActive }: SidebarProps) {
  const { state, navigateTo } = useAppContext();
  const { 
    user, 
    isGuest, 
    openAuth, 
    promptLogout, 
    logoutConfirmOpen, 
    confirmLogout, 
    cancelLogout 
  } = useAuth();
  const { t } = useTranslation();

  const handleNav = (pageId: string) => {
    navigateTo(pageId);
    onClose();
  };

  const isGuestMode = !user || isGuest;
  const rawUserName = user?.fullName || user?.displayName?.replace(/^\+8800/, "+880").replace(/^8800/, "+880") || (user?.identifier ? user.identifier.replace(/^\+8800/, "+880").replace(/^8800/, "+880") : (state.lang === 'bn' ? "গেস্ট মোড" : "Guest Mode"));
  const userName = isGuestMode ? (state.lang === 'bn' ? "গেস্ট মোড" : "Guest Mode") : rawUserName.trim();

  const backdrop = useAnimateExit({ isOpen: isOpen && !isTourActive, durationMs: 200 });
  const logoutAnim = useAnimateExit({ isOpen: logoutConfirmOpen, durationMs: 200 });

  return (
    <>
      {/* Mobile backdrop (Navy #223A5E at 38% opacity, light blur) */}
      {backdrop.shouldRender && (
        <div
          className={`fixed inset-0 bg-[#223A5E]/38 backdrop-blur-sm z-40 md:hidden transition-opacity duration-260 ${backdrop.isExiting ? "motion-exit-fade" : "motion-overlay"}`}
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`sidebar w-[78%] max-w-[300px] md:w-64 min-h-screen flex flex-col py-5 px-3 fixed left-0 top-0 bottom-0 bg-white dark:bg-[#070a14] text-[#52627A] dark:text-muted-foreground border-r border-[#DCE5F0] dark:border-border transition-transform duration-260 md:translate-x-0 select-none shadow-[0_8px_28px_rgba(0,0,0,0.06)] dark:shadow-none ${
          isTourActive ? "z-[9999]" : "z-40"
        } ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Top Profile / User Section (Centered Layout) */}
        <div 
          onClick={() => {
            if (isGuestMode) {
              openAuth('login');
            } else {
              handleNav("profile");
            }
          }}
          className="sidebar-profile-card flex flex-col items-center justify-center text-center p-2 mb-3 rounded-2xl cursor-pointer hover:bg-[#E8F1FC] dark:hover:bg-white/[0.04] border border-transparent hover:border-[#DCE5F0] dark:hover:border-transparent transition-colors group"
          title={isGuestMode ? (state.lang === 'bn' ? "গেস্ট মোড (লগইন করতে ক্লিক করুন)" : "Guest Mode (Click to Sign In)") : userName}
        >
          {/* Centered Circular Avatar Badge */}
          <div className="relative flex items-center justify-center">
            {user?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={user.avatarUrl} 
                alt={userName} 
                className="w-16 h-16 rounded-full object-cover ring-2 ring-[#5B8DEF]/30 group-hover:ring-[#5B8DEF]/60 transition-all shadow-sm" 
              />
            ) : isGuestMode ? (
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#E8F1FC] dark:bg-blue-950/60 border border-[#D0E1FD] dark:border-blue-900/40 shadow-xs text-[#0F172A] dark:text-blue-300 transition-colors">
                <ProfileIcon size={28} strokeWidth={2.2} className="text-[#0F172A] dark:text-blue-300" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#223A5E] text-white font-bold text-xl shadow-sm ring-2 ring-[#5B8DEF]/30 group-hover:ring-[#5B8DEF]/60 transition-all uppercase">
                {userName ? userName[0].toUpperCase() : <ProfileIcon size={28} strokeWidth={2.2} />}
              </div>
            )}
            {/* Active Status Indicator: #2E9B73 with white ring */}
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#2E9B73] ring-[2.5px] ring-white dark:ring-[#070a14] shadow-xs" />
          </div>

          {/* Centered User Name - Guaranteed 100% Full Name on Mobile, Tablet & PC */}
          <div className="mt-3 flex flex-col items-center w-full px-1">
            <h2 className="text-base sm:text-[17px] font-bold text-[#0F172A] dark:text-foreground tracking-tight text-center break-words whitespace-normal w-full leading-snug">
              {userName}
            </h2>
          </div>
        </div>

        {/* Navigation Items (Clean 42px height, 12px radius, smooth active pill) */}
        <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1">
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
              <button
                key={item.id}
                data-tour={`tour-${item.id}`}
                id={`nav-${item.id}`}
                onClick={() => handleNav(item.id)}
                className={`sidebar-nav-btn relative flex items-center gap-3 px-3.5 min-h-[44px] rounded-xl text-left w-full transition-colors duration-150 ease-out group cursor-pointer border focus-visible:ring-2 focus-visible:ring-[#5B8DEF] focus-visible:ring-offset-2 outline-none ${
                  isActive 
                    ? "sidebar-nav-btn-active border-transparent text-[#223A5E] dark:text-foreground font-bold" 
                    : "border-transparent text-[#52627A] dark:text-muted-foreground hover:bg-[#E8F1FC] dark:hover:bg-white/[0.06] hover:border-[#DCE5F0] dark:hover:border-transparent hover:text-[#111827] dark:hover:text-foreground"
                }`}
                title={displayTagline ? `${displayLabel} — ${displayTagline}` : displayLabel}
              >
                {/* Sliding Active Indicator Bar (Unified 200ms motion for both bg and right edge pip) */}
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-pill"
                    className="sidebar-active-pill absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
                    transition={{ type: "spring", stiffness: 420, damping: 35, duration: 0.2 }}
                  >
                    <div className="sidebar-active-pill-bg absolute inset-0 rounded-xl bg-[#E7F0FF] dark:bg-blue-950/40" />
                    {/* Active bar on the right: #5B8DEF */}
                    <div className="sidebar-active-pill-edge absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-[#5B8DEF] dark:bg-blue-400 shadow-[0_0_8px_#5B8DEF]" />
                  </motion.div>
                )}

                <span 
                  className={`sidebar-nav-icon relative z-10 flex items-center justify-center w-5 shrink-0 ${
                    isActive ? "text-[#223A5E] dark:text-blue-300" : "text-[#52627A] dark:text-muted-foreground group-hover:text-[#223A5E] dark:group-hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.1 : 1.75} />
                </span>

                <div className="relative z-10 flex flex-col min-w-0 flex-1">
                  <span className={`sidebar-nav-label text-sm leading-tight break-words ${isActive ? "text-[#223A5E] dark:text-foreground font-bold" : "font-medium"}`}>
                    {displayLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section / Log In button (Solid #223A5E Primary action for guests) */}
        <div className="mt-auto pt-3 space-y-1 border-t border-[#DCE5F0] dark:border-white/[0.06]">
          {isGuestMode ? (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-xl w-full bg-[#223A5E] hover:bg-[#2E4E7B] text-white font-semibold text-sm transition-all duration-150 ease-out active:scale-[0.98] shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-[#5B8DEF] focus-visible:ring-offset-2 outline-none group"
            >
              <LogIn size={16} className="text-white group-hover:scale-110 transition-transform" />
              <span>{t.auth.logIn || "Log In"}</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={promptLogout}
              className="flex items-center gap-3 px-3.5 h-[42px] rounded-xl text-left w-full text-[#52627A] dark:text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-all duration-150 ease-out active:scale-[0.98] group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20 transition-colors shrink-0">
                <LogOut size={14} className="group-hover:scale-110 transition-transform" />
              </div>
              <span className="font-medium text-sm">{t.auth.logOut || "Log Out"}</span>
            </button>
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
