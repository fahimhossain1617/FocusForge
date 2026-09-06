"use client";

import { useAppContext } from "../context/AppContext";
import { useTranslation } from "../hooks/useTranslation";
import { LayoutDashboard, PencilLine, CalendarDays, Target, GraduationCap, Settings as SettingsIcon, Files, User as ProfileIcon, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import UserMenu from "./auth/UserMenu";
import { useAnimateExit } from "../hooks/useAnimateExit";

const navGroups = [
  {
    items: [
      { id: "today", label: "Dashboard", tagline: "Your day at a glance", icon: LayoutDashboard },
      { id: "ai-agent", label: "AI Agent", tagline: "Productivity AI copilot", icon: Sparkles },
    ],
  },
  {
    items: [
      { id: "tasks", label: "Notes & files", tagline: "Your notes, docs, and attachments", icon: Files },
      { id: "planner", label: "Planner", tagline: "Plan your day and week", icon: CalendarDays },
      { id: "mind", label: "Capture", tagline: "Write it down before you forget", icon: PencilLine },
    ],
  },
  {
    items: [
      { id: "learning", label: "Skill builder", tagline: "Track what you're learning", icon: GraduationCap },
      { id: "focus", label: "Focus", tagline: "Start a focus session", icon: Target },
    ],
  },
  {
    items: [
      { id: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isTourActive?: boolean;
}

export default function Sidebar({ isOpen, onClose, isTourActive }: SidebarProps) {
  const { state, navigateTo } = useAppContext();
  const { user } = useAuth();
  const { t } = useTranslation();

  const handleNav = (pageId: string) => {
    navigateTo(pageId);
    onClose();
  };

  // User name display & dynamic responsive font sizing
  const isGuestMode = !user;
  const rawUserName = user?.fullName || user?.displayName?.replace(/^\+8800/, "+880").replace(/^8800/, "+880") || (user?.identifier ? user.identifier.replace(/^\+8800/, "+880").replace(/^8800/, "+880") : (state.lang === 'bn' ? "গেস্ট মোড" : "Guest Mode"));
  const userName = isGuestMode ? (state.lang === 'bn' ? "গেস্ট মোড" : "Guest Mode") : rawUserName.trim();

  // Dynamic pixel font size: adjusts based on name length to ensure single-line display beside avatar
  const getFontSizePx = (len: number): number => {
    if (len <= 5) return 24;
    if (len <= 8) return 20;
    if (len <= 11) return 18;
    if (len <= 15) return 16;
    if (len <= 19) return 14;
    return 13;
  };

  const fontSizePx = getFontSizePx(userName.length);
  const backdrop = useAnimateExit({ isOpen: isOpen && !isTourActive, durationMs: 200 });

  return (
    <>
      {/* Mobile backdrop */}
      {backdrop.shouldRender && (
        <div
          className={`fixed inset-0 bg-black/50 z-40 md:hidden ${backdrop.isExiting ? "motion-exit-fade" : "motion-overlay"}`}
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar w-60 min-h-screen flex flex-col py-6 px-3 fixed left-0 top-0 bottom-0 ${
          isTourActive ? "z-[9999]" : "z-40"
        } transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "open translate-x-0" : ""
        }`}
        style={{
          borderRight: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* User Profile Header (Photo + Name / Guest Mode) */}
        <div 
          className="px-3 mb-6 min-h-[40px] flex items-center gap-2.5 cursor-pointer group select-none"
          onClick={() => handleNav("profile")}
          title={isGuestMode ? (state.lang === 'bn' ? "গেস্ট মোড (প্রোফাইল প্রিভিউ দেখতে ক্লিক করুন)" : "Guest Mode (Click to preview profile)") : userName}
        >
          {/* User Photo / Avatar on the left */}
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={userName} 
              className="w-8 h-8 rounded-full object-cover border border-blue-500/30 shrink-0 shadow-sm" 
            />
          ) : isGuestMode ? (
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-blue-400 shrink-0 shadow-sm border border-blue-500/30 group-hover:border-blue-400/60 transition-colors"
              style={{
                background: "linear-gradient(135deg, rgba(30, 58, 138, 0.4), rgba(37, 99, 235, 0.3))"
              }}
            >
              <ProfileIcon size={14} className="text-blue-400" />
            </div>
          ) : (
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 shadow-sm border border-blue-500/30"
              style={{
                background: "linear-gradient(135deg, #1E3A8A, #2563EB)"
              }}
            >
              {userName ? userName[0].toUpperCase() : <ProfileIcon size={14} className="text-blue-300" />}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 
              className="tracking-tight truncate whitespace-nowrap transition-all duration-200" 
              style={{ 
                fontSize: `${fontSizePx}px`,
                fontWeight: 800,
                lineHeight: 1.15,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.025em"
              }}
            >
              {userName}
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-0.5 overflow-y-auto">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {groupIdx > 0 && (
                <div
                  className="h-px mx-3 my-2"
                  style={{ background: "var(--color-border-subtle)" }}
                />
              )}
              {group.items.map((item) => {
                const Icon = item.icon as React.ElementType;
                // Map item.id to the correct translation keys for label and tagline
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
                const displayTagline = (keys?.tagline && t.sidebar[keys.tagline]) ? t.sidebar[keys.tagline] : (item as { tagline?: string }).tagline;

                return (
                  <button
                    key={item.id}
                    data-tour={`tour-${item.id}`}
                    id={`nav-${item.id}`}
                    className={`nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-left w-full transition-all group ${
                      state.activePage === item.id ? "active" : ""
                    }`}
                    onClick={() => handleNav(item.id)}
                    title={displayTagline ? `${displayLabel} — ${displayTagline}` : displayLabel}
                  >
                    <span 
                      className="nav-icon flex items-center justify-center w-5 shrink-0 text-center transition-colors" 
                      style={{ color: state.activePage === item.id ? "var(--color-purple-bright)" : "var(--color-text-secondary)" }}
                    >
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    </span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span
                        className="nav-label font-medium leading-tight truncate text-[13px]"
                        style={{
                          color:
                            state.activePage === item.id
                              ? "var(--color-text-primary)"
                              : "var(--color-text-secondary)",
                        }}
                      >
                        {displayLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User / Authentication Entry Point */}
        <div className="mt-auto pt-3 px-2 border-t" style={{ borderTopColor: "var(--color-border-subtle)" }}>
          <UserMenu variant="sidebar" />
        </div>
      </aside>
    </>
  );
}
