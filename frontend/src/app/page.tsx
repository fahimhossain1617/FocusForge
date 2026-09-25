"use client";

import { Suspense, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import QuickCapture from "../components/QuickCapture";
import Toast from "../components/ui/Toast";
import AuthModal from "../components/auth/AuthModal";
import AuthGuardModal from "../components/auth/AuthGuardModal";
import { OnboardingModal, ProductTour } from "../components/onboarding";
import { ReviewModal } from "../components/review";
import { onboardingStorage } from "../services/onboardingStorage";
import { userService } from "../services/userService";

import {
  AppShellSkeleton,
  PageSkeleton,
  DashboardSkeleton,
  MyMindSkeleton,
  WorkspaceSkeleton,
  PlannerSkeleton,
  FocusSkeleton,
  LearningHubSkeleton,
  ProfileSkeleton,
  SettingsSkeleton,
  AIAgentSkeleton,
} from "../components/ui/skeleton";
import { useDailyPlan } from "../hooks/useDailyPlan";
import { useReviewPrompt } from "../hooks/useReviewPrompt";

import DashboardPage from "../components/pages/DashboardPage";
import MyMindPage from "../components/pages/MyMindPage";
import WorkspacePage from "../components/pages/WorkspacePage";
import PlannerPage from "../components/pages/PlannerPage";
import FocusPage from "../components/pages/FocusPage";
import LearningHubPage from "../components/pages/LearningHubPage";
import ProfilePage from "../components/pages/ProfilePage";
import SettingsPage from "../components/pages/SettingsPage";
import AIAgentPage from "../components/ai-agent/AIAgentPage";
import BottomNav from "../components/navigation/BottomNav";
import MobileHeader from "../components/navigation/MobileHeader";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Restore persisted sidebar collapsed state
  useEffect(() => {
    try {
      const saved = localStorage.getItem("focusforge_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("focusforge_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Activate daily plan and task reminder scheduler
  useDailyPlan();

  // Smart Review & Feedback System Hook
  const {
    isOpen: showReviewModal,
    isSubmitting: isReviewSubmitting,
    skip: skipReview,
    submit: submitReview,
  } = useReviewPrompt();

  useEffect(() => {
    const root = document.documentElement;
    const mode = state.theme.mode;

    const applyTheme = (isLight: boolean) => {
      root.dataset.theme = isLight ? "light" : "dark";
      root.classList.toggle("dark", !isLight);
      root.classList.toggle("light", isLight);
      root.style.colorScheme = isLight ? "light" : "dark";
    };

    if (mode === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(!mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(!e.matches);
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      const isLight = mode === "light";
      applyTheme(isLight);
    }
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
  const isLight = state.theme?.mode === "light";

  return (
    <div className={`flex min-h-screen ${state.activePage === 'ai-agent' ? 'h-dvh max-h-dvh overflow-hidden' : ''} ${state.lang === 'bn' ? 'font-bengali' : ''} overflow-x-hidden ${isLight ? 'bg-[#F3F7FC]' : 'bg-[#0A0E1A]'}`}>
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isTourActive={showTour} 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Main Content */}
      <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-[260px]'} w-full min-w-0 flex flex-col transition-[margin] duration-200 ease-in-out ${
        state.activePage === 'ai-agent' ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-screen overflow-x-hidden'
      }`}>
        {/* Mobile / Compact Header: [ App Icon ] FocusForge ... [ Bell ] */}
        <MobileHeader />

        {/* Page Content */}
        <div className={`w-full min-w-0 ${
          state.activePage === 'ai-agent'
            ? 'flex-1 flex flex-col p-0 min-h-0 max-w-none w-full h-full overflow-hidden'
            : state.activePage === 'planner'
            ? 'flex-1 flex flex-col p-0 max-w-none pb-[calc(5rem+env(safe-area-inset-bottom,16px))] md:pb-0'
            : state.activePage === 'today'
            ? 'flex-1 px-3.5 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,16px))] md:pb-8 max-w-[1600px] mx-auto'
            : 'flex-1 px-3.5 sm:px-6 md:px-8 pt-4 sm:pt-6 md:pt-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,16px))] md:pb-10 max-w-7xl mx-auto'
        }`}>
          <Suspense fallback={<PageSkeleton page={state.activePage} />}>
            {isPageLoading ? (
              <div className={`app-page-transition ${state.activePage === 'ai-agent' ? 'flex-1 flex flex-col h-full' : ''}`} key={`loading-${state.activePage}`}>
                <PageSkeleton page={state.activePage} />
              </div>
            ) : (
              <div className={`app-page-transition ${state.activePage === 'ai-agent' ? 'flex-1 flex flex-col h-full' : ''}`} key={state.activePage}>
                <ActivePage onOpenSidebar={() => setSidebarOpen(true)} />
              </div>
            )}
          </Suspense>
        </div>
      </main>

      {/* Responsive Mobile Bottom Navigation */}
      <BottomNav />

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

      {/* Smart Review & Feedback Modal */}
      <ReviewModal
        isOpen={showReviewModal && !showOnboarding && !showTour}
        onClose={skipReview}
        onSubmit={submitReview}
        isSubmitting={isReviewSubmitting}
      />
    </div>
  );
}
