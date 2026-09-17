"use client";

import React from "react";
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
      {/* Mobile backdrop */}
      {backdrop.shouldRender && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden ${backdrop.isExiting ? "motion-exit-fade" : "motion-overlay"}`}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`w-64 min-h-screen flex flex-col py-6 px-3.5 fixed left-0 top-0 bottom-0 bg-[#070a14] text-muted-foreground border-r border-border transition-transform duration-300 md:translate-x-0 select-none ${
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
          className="flex flex-col items-center justify-center text-center p-3 mb-4 rounded-2xl cursor-pointer hover:bg-white/[0.03] transition-all group"
          title={isGuestMode ? (state.lang === 'bn' ? "গেস্ট মোড (লগইন করতে ক্লিক করুন)" : "Guest Mode (Click to Sign In)") : userName}
        >
          {/* Centered Circular Avatar */}
          <div className="relative flex items-center justify-center">
            {user?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={user.avatarUrl} 
                alt={userName} 
                className="w-14 h-14 rounded-full object-cover ring-2 ring-blue-500/30 group-hover:ring-blue-400/60 transition-all shadow-md" 
              />
            ) : isGuestMode ? (
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-tr from-blue-950/60 to-indigo-950/40 border border-blue-500/30 group-hover:border-blue-400/60 shadow-md text-blue-400 transition-colors">
                <ProfileIcon size={24} className="group-hover:scale-110 transition-transform" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-700 text-white font-bold text-lg shadow-md ring-2 ring-blue-500/30 group-hover:ring-blue-400/60 transition-all uppercase">
                {userName ? userName[0].toUpperCase() : <ProfileIcon size={24} />}
              </div>
            )}
            {/* Active Status Indicator */}
            <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0c0d11] shadow-sm" />
          </div>

          {/* Centered User Name */}
          <div className="mt-2.5 flex flex-col items-center w-full px-2">
            <h2 className="text-xs sm:text-sm md:text-[15px] font-semibold text-foreground tracking-tight text-center break-words max-w-full leading-snug">
              {userName}
            </h2>
          </div>
        </div>

        {/* Navigation Items */}
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
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left w-full transition-colors group cursor-pointer ${
                  isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                }`}
                title={displayTagline ? `${displayLabel} — ${displayTagline}` : displayLabel}
              >
                {/* Sliding Active Pill Animation (Dark Navy/Royal Blue glow without purple) */}
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-950/40 via-blue-900/30 to-blue-600/35 border border-blue-500/25 overflow-hidden pointer-events-none"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  >
                    {/* Soft blue illumination fading from right */}
                    <div className="absolute right-0 inset-y-0 w-20 bg-gradient-to-l from-blue-500/30 via-blue-500/10 to-transparent pointer-events-none" />
                    {/* Sleek royal blue right edge indicator */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-l-full bg-blue-400 shadow-[0_0_12px_#60a5fa]" />
                  </motion.div>
                )}

                <span 
                  className={`relative z-10 flex items-center justify-center w-5 shrink-0 transition-colors ${
                    isActive ? "text-blue-300" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.8} />
                </span>

                <div className="relative z-10 flex flex-col min-w-0 flex-1">
                  <span className={`text-xs sm:text-[13px] md:text-sm font-medium leading-tight break-words ${isActive ? "text-foreground font-semibold" : ""}`}>
                    {displayLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section / Log out / Auth Button */}
        <div className="mt-auto pt-4 space-y-1">
          {isGuestMode ? (
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left w-full text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 group-hover:border-blue-500/40 transition-colors shrink-0">
                <LogIn size={14} className="group-hover:scale-110 transition-transform" />
              </div>
              <span className="font-medium text-sm">{t.auth.logIn || "Log In"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={promptLogout}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left w-full text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors group cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 group-hover:border-red-500/40 transition-colors shrink-0">
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
          <div className={`relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#111216] p-6 text-center shadow-2xl ${logoutAnim.isExiting ? "motion-exit-reveal" : "motion-scale-in"}`}>
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 text-red-500">
              <ShieldAlert size={24} />
            </div>

            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t.auth.logOutConfirmTitle || "Confirm Logout"}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              {t.auth.logOutConfirmDesc || "Are you sure you want to log out?"}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelLogout}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-white/10 border border-border transition-all cursor-pointer"
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
