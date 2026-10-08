"use client";

import { Suspense, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import QuickCapture from "../components/QuickCapture";
import Toast from "../components/ui/Toast";
import NotificationBanner from "../components/navigation/NotificationBanner";
import AuthModal from "../components/auth/AuthModal";
import AuthGuardModal from "../components/auth/AuthGuardModal";
import { OnboardingModal } from "../components/onboarding";
import { ReviewModal } from "../components/review";
import { onboardingStorage } from "../services/onboardingStorage";
import { userService } from "../services/userService";
import { useEncryption } from "../hooks/useEncryption";
import PassphraseSetupModal from "../components/encryption/PassphraseSetupModal";
import PassphraseUnlockModal from "../components/encryption/PassphraseUnlockModal";

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
import { useNotificationPermissionPrompt } from "../hooks/useNotificationPermissionPrompt";
import NotificationPermissionPrompt from "../components/notifications/NotificationPermissionPrompt";

import DashboardPage from "../components/pages/DashboardPage";
import MyMindPage from "../components/pages/MyMindPage";
import WorkspacePage from "../components/pages/WorkspacePage";
import PlannerPage from "../components/pages/PlannerPage";
import FocusPage from "../components/pages/FocusPage";
import LearningHubPage from "../components/pages/LearningHubPage";
import ProfilePage from "../components/pages/ProfilePage";
import SettingsPage from "../components/pages/SettingsPage";
import AIAgentPage from "../components/ai-agent/AIAgentPage";
import NotificationsPage from "../components/pages/NotificationsPage";
import BottomNav from "../components/navigation/BottomNav";
import MobileHeader from "../components/navigation/MobileHeader";
import DiaryHome from "../components/diary/DiaryHome";

const pageComponents: Record<string, React.ComponentType<{ onOpenSidebar?: () => void }>> = {
  today: DashboardPage,
  mind: MyMindPage,
  diary: DiaryHome,
  tasks: WorkspacePage,
  planner: PlannerPage,
  focus: FocusPage,
  learning: LearningHubPage,
  profile: ProfilePage,
  settings: SettingsPage,
  "ai-agent": AIAgentPage,
  notifications: NotificationsPage,
};

export default function Home() {
  const { state, isLoaded, isPageLoading, navigateTo } = useAppContext();
  const { user, isGuest, isLoading: isAuthLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [launchDone, setLaunchDone] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    if (!document.documentElement.classList.contains("ff-launch")) return true;
    return Boolean((window as any).__ffLaunchDone);
  });

  // Zero-Knowledge Client-Side Encryption Hook
  const {
    needsSetup: encryptionNeedsSetup,
    needsUnlock: encryptionNeedsUnlock,
    setupVault,
    unlockVault,
  } = useEncryption(user?.id);

  const [dismissedEncryptionSetup, setDismissedEncryptionSetup] = useState(false);
  const [dismissedEncryptionUnlock, setDismissedEncryptionUnlock] = useState(false);

  // If page was loaded with a password recovery hash/query, redirect immediately to reset password
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      if (hash.includes("type=recovery") || search.includes("type=recovery")) {
        window.location.href = `/reset-password${hash || search}`;
      }
    }
  }, []);

  // Signal app readiness once first real render mounts and data/auth are settled
  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (typeof window !== "undefined" && typeof (window as any).__ffReady === "function") {
        (window as any).__ffReady();
      }
    });

    const readyTimer = setTimeout(() => {
      if (typeof window !== "undefined" && typeof (window as any).__ffReady === "function") {
        (window as any).__ffReady();
      }
    }, 1000);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(readyTimer);
    };
  }, [isLoaded, isAuthLoading]);

  // Gate onboarding and modals until launch animation completes
  useEffect(() => {
    if (launchDone) return;
    const handleLaunchDone = () => {
      setLaunchDone(true);
    };
    window.addEventListener("ff:launch-done", handleLaunchDone);
    const fallbackTimer = setTimeout(handleLaunchDone, 1500);
    return () => {
      window.removeEventListener("ff:launch-done", handleLaunchDone);
      clearTimeout(fallbackTimer);
    };
  }, [launchDone]);

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

  // Smart Contextual Notification Permission Prompt Hook
  const {
    isOpen: showNotificationPermissionPrompt,
    handleEnable: handleEnableNotificationPermission,
    handleLater: handleLaterNotificationPermission,
  } = useNotificationPermissionPrompt();

  useEffect(() => {
    const root = document.documentElement;
    const mode = state.theme.mode;

    const applyTheme = (isLight: boolean) => {
      root.dataset.theme = isLight ? "light" : "dark";
      root.classList.toggle("dark", !isLight);
      root.classList.toggle("light", isLight);
      root.style.colorScheme = isLight ? "light" : "dark";
      const themeHex = isLight ? "#F3F7FC" : "#090c19";
      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      metaTags.forEach((tag) => tag.setAttribute("content", themeHex));
      const ffTheme = document.getElementById("ff-theme-color");
      if (ffTheme) ffTheme.setAttribute("content", themeHex);
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
    setShowOnboarding(false);
  };

  // Initial App Shell Skeleton while storage / backend data is loading
  if (!isLoaded) {
    return <AppShellSkeleton page={state.activePage || "today"} />;
  }

  const ActivePage = pageComponents[state.activePage] || DashboardPage;
  const isLight = state.theme?.mode === "light";

  return (
    <div className={`flex h-screen h-dvh max-h-screen max-h-dvh w-full overflow-hidden ${state.lang === 'bn' ? 'font-bengali' : ''} ${isLight ? 'bg-[#F3F7FC]' : 'bg-[#0A0E1A]'}`}>
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Main Content - Primary Viewport Scroll Container */}
      <main className={`flex-1 ${sidebarCollapsed ? 'md:ml-[76px]' : 'md:ml-[260px]'} w-full min-w-0 h-full min-h-0 flex flex-col overflow-y-auto overflow-x-hidden transition-[margin] duration-200 ease-in-out`}>
        {/* Mobile / Compact Header: [ App Icon ] FocusForge ... [ Bell ] */}
        <MobileHeader />

        {/* Page Content */}
        <div className={`w-full min-w-0 ${
          state.activePage === 'ai-agent'
            ? 'flex-1 flex flex-col p-0 min-h-0 max-w-none w-full h-full overflow-hidden'
            : state.activePage === 'planner'
            ? 'flex-1 flex flex-col p-0 max-w-none pb-[calc(5rem+env(safe-area-inset-bottom,16px))] md:pb-0'
            : state.activePage === 'today'
            ? 'flex-1 px-3.5 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-5 pb-[calc(4.5rem+env(safe-area-inset-bottom,16px))] md:pb-8 max-w-[1600px] mx-auto'
            : 'flex-1 px-3.5 sm:px-6 md:px-8 pt-3 sm:pt-4 md:pt-5 pb-[calc(4.5rem+env(safe-area-inset-bottom,16px))] md:pb-10 max-w-7xl mx-auto'
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
      <NotificationBanner />
      <NotificationPermissionPrompt
        isOpen={showNotificationPermissionPrompt && !showOnboarding && launchDone}
        onEnable={handleEnableNotificationPermission}
        onLater={handleLaterNotificationPermission}
      />
      <AuthModal />
      <AuthGuardModal />

      {/* First-Time User Modern Minimal Onboarding */}
      <OnboardingModal
        isOpen={showOnboarding && launchDone}
        onEnterApp={handleEnterAppFromOnboarding}
      />

      {/* Smart Review & Feedback Modal */}
      <ReviewModal
        isOpen={showReviewModal && !showOnboarding && launchDone}
        onClose={skipReview}
        onSubmit={submitReview}
        isSubmitting={isReviewSubmitting}
      />

      {/* Zero-Knowledge Envelope Encryption Setup Modal (Authenticated users only, after onboarding) */}
      <PassphraseSetupModal
        isOpen={!isGuest && Boolean(user?.id) && encryptionNeedsSetup && !dismissedEncryptionSetup && !showOnboarding && launchDone}
        onComplete={setupVault}
        onDismiss={() => setDismissedEncryptionSetup(true)}
        lang={state.lang}
      />

      {/* Returning Device Passphrase Unlock Modal (Authenticated users only, after onboarding) */}
      <PassphraseUnlockModal
        isOpen={!isGuest && Boolean(user?.id) && encryptionNeedsUnlock && !dismissedEncryptionUnlock && !showOnboarding && launchDone}
        onUnlock={unlockVault}
        onCancel={() => setDismissedEncryptionUnlock(true)}
        lang={state.lang}
      />
    </div>
  );
}
