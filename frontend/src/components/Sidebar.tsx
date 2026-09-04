"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useTranslation } from "../hooks/useTranslation";
import { LayoutDashboard, Brain, CalendarDays, Target, BookOpen, Settings as SettingsIcon, LayoutTemplate, Sun, Moon, User as ProfileIcon, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import UserMenu from "./auth/UserMenu";
import InstallPrompt from "./pwa/InstallPrompt";

const navGroups = [
  {
    items: [
      { id: "today", label: "Dashboard", icon: LayoutDashboard },
      { id: "mind", label: "My Mind", icon: Brain },
    ],
  },
  {
    items: [
      { id: "tasks", label: "Workspace", icon: LayoutTemplate },
      { id: "planner", label: "Planner", icon: CalendarDays },
      { id: "focus", label: "Focus", icon: Target },
    ],
  },
  {
    items: [
      { id: "learning", label: "Learning Hub", icon: BookOpen },
      { id: "ai-agent", label: "AI Agent", icon: Sparkles },
    ],
  },
  {
    items: [
      { id: "theme", label: "Theme", icon: "toggle" },
      { id: "settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { state, updateState, navigateTo } = useAppContext();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || state.theme?.mode || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme: "light" | "dark" = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    updateState({ theme: { ...state.theme, mode: newTheme } });
  };

  const handleNav = (pageId: string) => {
    navigateTo(pageId);
    onClose();
  };

  // User name display & dynamic responsive font sizing
  const rawUserName = user?.fullName || user?.displayName?.replace(/^\+8800/, "+880").replace(/^8800/, "+880") || (user?.identifier ? user.identifier.replace(/^\+8800/, "+880").replace(/^8800/, "+880") : "Guest");
  const userName = rawUserName.trim();

  // Dynamic pixel font size: adjusts based on name length to ensure single-line display beside avatar
  const getFontSizePx = (len: number): number => {
    if (len <= 5) return 26; // e.g. "fahim"
    if (len <= 8) return 22;
    if (len <= 11) return 19;
    if (len <= 15) return 17; // e.g. "Fahim Hossain"
    if (len <= 19) return 15;
    return 13;
  };

  const fontSizePx = getFontSizePx(userName.length);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`sidebar w-60 min-h-screen flex flex-col py-6 px-3 fixed left-0 top-0 bottom-0 z-40 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? "open translate-x-0" : ""
        }`}
        style={{
          borderRight: "1px solid var(--color-border-subtle)",
        }}
      >
        {/* User Profile Header (Photo + Name) */}
        <div className="px-3 mb-6 min-h-[40px] flex items-center gap-2.5">
          {/* User Photo / Avatar on the left */}
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={userName} 
              className="w-8 h-8 rounded-full object-cover border border-blue-500/30 shrink-0 shadow-sm" 
            />
          ) : (
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 shadow-sm border border-blue-500/30"
              style={{
                background: "linear-gradient(135deg, #1E3A8A, #2563EB)"
              }}
            >
              {userName && userName !== "Guest" ? userName[0].toUpperCase() : <ProfileIcon size={14} className="text-blue-300" />}
            </div>
          )}

          <h1 
            className="tracking-tight truncate whitespace-nowrap transition-all duration-200 select-none flex-1 min-w-0" 
            style={{ 
              fontSize: `${fontSizePx}px`,
              fontWeight: 800,
              lineHeight: 1.15,
              color: "var(--color-text-primary)",
              letterSpacing: "-0.025em"
            }}
            title={userName}
          >
            {userName}
          </h1>
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
                if (item.id === "theme") {
                  return (
                    <button
                      key={item.id}
                      className="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left"
                      onClick={toggleTheme}
                    >
                      <span className="nav-icon flex items-center justify-center w-5 text-center">
                        <div 
                          className="relative flex items-center rounded-full flex-shrink-0"
                          style={{
                            width: "40px",
                            height: "22px",
                            background: "rgba(255,255,255,0.08)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            padding: "1px",
                            boxSizing: "border-box",
                            marginLeft: "-10px"
                          }}
                        >
                          <div 
                            className="absolute rounded-full flex items-center justify-center"
                            style={{
                              width: "18px",
                              height: "18px",
                              background: mounted && theme === "light" ? "var(--accent-500)" : "var(--color-text-muted)",
                              transform: mounted && theme === "light" ? "translateX(18px)" : "translateX(0)",
                              transition: "transform 200ms ease, background 200ms ease"
                            }}
                          >
                            {mounted && theme === "light" ? <Sun size={10} color="white" /> : <Moon size={10} color="white" />}
                          </div>
                        </div>
                      </span>
                      <span className="nav-label font-medium" style={{ color: "var(--color-text-secondary)" }}>
                        {t.sidebar.theme}
                      </span>
                    </button>
                  );
                }

                const Icon = item.icon as React.ElementType;
                // Map item.id to the correct translation key
                const translationKeyMap: Record<string, keyof typeof t.sidebar> = {
                  today: 'dashboard',
                  mind: 'myMind',
                  tasks: 'workspace',
                  planner: 'planner',
                  focus: 'focus',
                  learning: 'learningHub',
                  profile: 'myProfile',
                  settings: 'settings'
                };
                const translationKey = translationKeyMap[item.id];
                const displayLabel = translationKey ? t.sidebar[translationKey] : item.label;

                return (
                  <button
                    key={item.id}
                    className={`nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm w-full text-left ${
                      state.activePage === item.id ? "active" : ""
                    }`}
                    onClick={() => handleNav(item.id)}
                  >
                    <span className="nav-icon flex items-center justify-center w-5 text-center" style={{ color: state.activePage === item.id ? "var(--color-purple-bright)" : "var(--color-text-secondary)" }}>
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    </span>
                    <span
                      className={`nav-label font-medium ${
                        state.activePage === item.id ? "" : ""
                      }`}
                      style={{
                        color:
                          state.activePage === item.id
                            ? "var(--color-text-primary)"
                            : "var(--color-text-secondary)",
                      }}
                    >
                      {displayLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User / Authentication Entry Point */}
        <div className="mt-auto pt-3 px-2 border-t" style={{ borderTopColor: "var(--color-border-subtle)" }}>
          <InstallPrompt variant="sidebar" />
          <UserMenu variant="sidebar" />
        </div>
      </aside>
    </>
  );
}
