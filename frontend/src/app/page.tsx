"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import Sidebar from "../components/Sidebar";
import QuickCapture from "../components/QuickCapture";
import Toast from "../components/ui/Toast";
import DashboardPage from "../components/pages/DashboardPage";
import MyMindPage from "../components/pages/MyMindPage";
import WorkspacePage from "../components/pages/WorkspacePage";
import PlannerPage from "../components/pages/PlannerPage";
import FocusPage from "../components/pages/FocusPage";
import LearningHubPage from "../components/pages/LearningHubPage";
import SettingsPage from "../components/pages/SettingsPage";
import ProfilePage from "../components/pages/ProfilePage";
import AIAgentPage from "../components/ai-agent/AIAgentPage";
import AuthModal from "../components/auth/AuthModal";
import AuthGuardModal from "../components/auth/AuthGuardModal";

import InstallPrompt from "../components/pwa/InstallPrompt";
import { AppShellSkeleton, PageSkeleton } from "../components/ui/skeleton";
import { useDailyPlan } from "../hooks/useDailyPlan";

const pageComponents: Record<string, React.ComponentType> = {
  today: DashboardPage,
  mind: MyMindPage,
  tasks: WorkspacePage,
  planner: PlannerPage,
  focus: FocusPage,
  learning: LearningHubPage,
  profile: ProfilePage,
  settings: SettingsPage,
  "ai-agent": AIAgentPage,
};

export default function Home() {
  const { state, isLoaded, isPageLoading } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Activate daily plan and task reminder scheduler
  useDailyPlan();

  useEffect(() => {
    const root = document.documentElement;
    const isLight = state.theme.mode === "light";
    root.dataset.theme = isLight ? "light" : "dark";
    root.classList.toggle("dark", !isLight);
  }, [state.theme]);

  // Initial App Shell Skeleton while storage / backend data is loading
  if (!isLoaded) {
    return <AppShellSkeleton page={state.activePage || "today"} />;
  }

  const ActivePage = pageComponents[state.activePage] || DashboardPage;

  return (
    <div className={`flex min-h-screen ${state.lang === 'bn' ? 'font-bengali' : ''} overflow-x-hidden`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="flex-1 md:ml-60 w-full min-w-0 overflow-x-hidden">
        {/* Mobile Header */}
        <div 
          className="md:hidden flex items-center justify-between px-3.5 py-3 sticky top-0 z-30 transition-colors" 
          style={{ 
            borderBottom: "1px solid var(--color-border-subtle)", 
            background: "rgba(7, 10, 18, 0.90)", 
            backdropFilter: "blur(20px)" 
          }}
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              FocusForge
            </span>
          </div>

          <div className="flex items-center gap-2">
            <InstallPrompt variant="button" />
          </div>
        </div>

        {/* Page Content */}
        <div className="p-3.5 sm:p-5 md:p-8 lg:p-10 max-w-5xl mx-auto w-full min-w-0">
          {isPageLoading ? (
            <div className="fade-in">
              <PageSkeleton page={state.activePage} />
            </div>
          ) : (
            <div className="fade-in">
              <ActivePage />
            </div>
          )}
        </div>
      </main>

      {/* Global Components */}
      <QuickCapture />
      <Toast />
      <AuthModal />
      <AuthGuardModal />
    </div>
  );
}
