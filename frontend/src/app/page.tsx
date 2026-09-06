"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
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
import { OnboardingModal, ProductTour } from "../components/onboarding";
import { onboardingStorage } from "../services/onboardingStorage";
import { userService } from "../services/userService";

import { AppShellSkeleton, PageSkeleton } from "../components/ui/skeleton";
import { useDailyPlan } from "../hooks/useDailyPlan";

const pageComponents: Record<string, React.ComponentType<{ onOpenSidebar?: () => void }>> = {
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
  const { state, isLoaded, isPageLoading, navigateTo } = useAppContext();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Activate daily plan and task reminder scheduler
  useDailyPlan();

  useEffect(() => {
    const root = document.documentElement;
    const isLight = state.theme.mode === "light";
    root.dataset.theme = isLight ? "light" : "dark";
    root.classList.toggle("dark", !isLight);
  }, [state.theme]);

  // First-time onboarding & interactive tour check
  useEffect(() => {
    if (!isLoaded || isAuthLoading || onboardingChecked) return;

    async function checkOnboarding() {
      try {
        if (user && user.id) {
          const dbState = await userService.fetchOnboardingState(user.id);
          if (dbState && dbState.onboardingCompleted) {
            setShowOnboarding(false);
            setShowTour(false);
          } else {
            const local = onboardingStorage.getLocalState();
            if (local?.onboardingCompleted) {
              await userService.saveOnboardingState(user.id, {
                onboardingCompleted: true,
                preferredLanguage: local.preferredLanguage,
                preferredTheme: local.preferredTheme,
                accountMode: "authenticated",
                productTourCompleted: true,
              });
              setShowOnboarding(false);
              setShowTour(false);
            } else {
              navigateTo("today");
              setShowOnboarding(true);
            }
          }
        } else {
          // Guest check
          const local = onboardingStorage.getLocalState();
          if (local && local.onboardingCompleted) {
            setShowOnboarding(false);
            setShowTour(false);
          } else {
            navigateTo("today");
            setShowOnboarding(true);
          }
        }
      } catch (err) {
        console.warn("[Onboarding check error]:", err);
      } finally {
        setOnboardingChecked(true);
      }
    }

    checkOnboarding();
  }, [isLoaded, isAuthLoading, user, onboardingChecked, navigateTo]);

  const handleEnterAppFromOnboarding = () => {
    navigateTo("today");
    setSidebarOpen(false);
    setShowOnboarding(false);
    setShowTour(true);
  };

  const handleCompleteTour = async () => {
    setSidebarOpen(false);
    setShowTour(false);
    const lang = state.lang === "bn" ? "bn" : "en";
    const themeMode = state.theme?.mode === "light" ? "light" : "dark";

    onboardingStorage.saveLocalState({
      onboardingCompleted: true,
      productTourCompleted: true,
      preferredLanguage: lang,
      preferredTheme: themeMode,
      accountMode: user ? "authenticated" : "guest",
    });

    if (user?.id) {
      await userService.saveOnboardingState(user.id, {
        onboardingCompleted: true,
        productTourCompleted: true,
        preferredLanguage: lang,
        preferredTheme: themeMode,
        accountMode: "authenticated",
      });
    }
  };

  // Initial App Shell Skeleton while storage / backend data is loading
  if (!isLoaded) {
    return <AppShellSkeleton page={state.activePage || "today"} />;
  }

  const ActivePage = pageComponents[state.activePage] || DashboardPage;

  return (
    <div className={`flex min-h-screen ${state.lang === 'bn' ? 'font-bengali' : ''} overflow-x-hidden`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isTourActive={showTour} />

      {/* Main Content */}
      <main className="flex-1 md:ml-60 w-full min-w-0 overflow-x-hidden">
        {/* Universal Mobile Header with persistent 3-line Hamburger Menu */}
        <header 
          className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b backdrop-blur-xl"
          style={{
            backgroundColor: "rgba(10, 14, 26, 0.85)",
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
              style={{
                backgroundColor: "var(--color-bg-card)",
                borderColor: "var(--color-border-subtle)",
                color: "var(--color-text-primary)",
              }}
              aria-label="Open navigation menu"
              title={state.lang === 'bn' ? "মেনু খুলুন" : "Open Menu"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-base font-bold tracking-tight truncate text-white">
              {state.activePage === 'ai-agent'
                ? (state.lang === 'bn' ? 'ফোকাস ফোর্স AI এজেন্ট' : 'FocusForge AI Agent')
                : state.activePage === 'tasks'
                ? (state.lang === 'bn' ? 'নোটস ও ফাইলস' : 'Notes & Files')
                : state.activePage === 'planner'
                ? (state.lang === 'bn' ? 'প্ল্যানার' : 'Planner')
                : state.activePage === 'mind'
                ? (state.lang === 'bn' ? 'ক্যাপচার' : 'Capture')
                : state.activePage === 'learning'
                ? (state.lang === 'bn' ? 'স্কিল বিল্ডার' : 'Skill Builder')
                : state.activePage === 'focus'
                ? (state.lang === 'bn' ? 'ফোকাস' : 'Focus')
                : state.activePage === 'settings'
                ? (state.lang === 'bn' ? 'সেটিংস' : 'Settings')
                : state.activePage === 'profile'
                ? (state.lang === 'bn' ? 'আমার প্রোফাইল' : 'Profile')
                : 'FocusForge'}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-3.5 sm:p-5 md:p-8 lg:p-10 max-w-5xl mx-auto w-full min-w-0">
          {isPageLoading ? (
            <div className="fade-in">
              <PageSkeleton page={state.activePage} />
            </div>
          ) : (
            <div className="fade-in">
              <ActivePage onOpenSidebar={() => setSidebarOpen(true)} />
            </div>
          )}
        </div>
      </main>

      {/* Global Components */}
      <QuickCapture />
      <Toast />
      <AuthModal />
      <AuthGuardModal />

      {/* First-Time User Onboarding & Interactive Tour */}
      <OnboardingModal
        isOpen={showOnboarding}
        onEnterApp={handleEnterAppFromOnboarding}
      />
      {showTour && (
        <ProductTour
          isOpen={showTour}
          onCompleteTour={handleCompleteTour}
          isSidebarOpen={sidebarOpen}
          onSetSidebarOpen={setSidebarOpen}
        />
      )}
    </div>
  );
}
