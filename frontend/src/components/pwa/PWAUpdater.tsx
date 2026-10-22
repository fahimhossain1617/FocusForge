"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

// Module-level guard to prevent reload loops
let isRefreshing = false;
const RELOAD_GUARD_KEY = "focentia_pwa_reloaded";

/**
 * Checks whether the current window/environment is running as an installed application:
 * - Standalone PWA mode (Android, Windows, macOS, Chrome OS)
 * - Minimal-UI / Fullscreen / Window-controls-overlay mode
 * - iOS Safari Standalone (Added to Home Screen)
 * - Android TWA / WebAPK wrapper (referrer: android-app://)
 * - Launch parameter (?source=pwa or ?mode=app)
 *
 * Regular web visitors navigating via URL links in a browser tab will return false.
 */
function isRunningAsInstalledApp(): boolean {
  if (typeof window === "undefined") return false;

  try {
    // 1. CSS Display Modes
    const isStandaloneDisplay =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
      window.matchMedia?.("(display-mode: window-controls-overlay)")?.matches;

    if (isStandaloneDisplay) return true;

    // 2. iOS Safari Add-to-Home-Screen standalone
    if ((window.navigator as unknown as { standalone?: boolean })?.standalone === true) {
      return true;
    }

    // 3. Android TWA / WebAPK wrapper
    if (typeof document !== "undefined" && document.referrer?.startsWith("android-app://")) {
      return true;
    }

    // 4. URL launch indicators from manifest start_url
    if (
      window.location.search.includes("source=pwa") ||
      window.location.search.includes("mode=app")
    ) {
      return true;
    }

    // 5. In-session install flag
    if (Boolean((window as unknown as { isAppInstalled?: boolean }).isAppInstalled)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export default function PWAUpdater() {
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const hadControllerRef = useRef<boolean>(false);

  // Safely read lang if AppContext is available
  let isBn = false;
  try {
    const appContext = useAppContext();
    isBn = appContext?.state?.lang === "bn";
  } catch {
    isBn = false;
  }

  // Checks whether the user is currently typing in an input/textarea/contenteditable
  const isUserTyping = useCallback((): boolean => {
    if (typeof document === "undefined") return false;
    const activeEl = document.activeElement;
    if (!activeEl) return false;
    const tagName = activeEl.tagName.toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      (activeEl as HTMLElement).isContentEditable
    );
  }, []);

  const handleRefresh = useCallback(() => {
    setIsUpdating(true);
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        } else {
          window.location.reload();
        }
      });
    } else {
      window.location.reload();
    }

    // Fallback reload if controllerchange does not fire within 1.2s
    setTimeout(() => {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          sessionStorage.setItem(RELOAD_GUARD_KEY, "true");
        } catch {}
        window.location.reload();
      }
    }, 1200);
  }, [waitingWorker]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // RULE: Only installed app users (phone/desktop standalone PWA) receive update prompts/refresh buttons.
    // Web link visitors in normal browser tabs always load live versions directly and must NOT be prompted or auto-reloaded.
    if (!isRunningAsInstalledApp()) {
      return;
    }

    // Record whether a controller was active when this component mounted (first install has no controller)
    hadControllerRef.current = Boolean(navigator.serviceWorker.controller);

    // Clear reload guard key after successful session resume
    try {
      const prevReloaded = sessionStorage.getItem(RELOAD_GUARD_KEY);
      if (prevReloaded === "true") {
        setTimeout(() => {
          try {
            sessionStorage.removeItem(RELOAD_GUARD_KEY);
          } catch {}
        }, 5000);
      }
    } catch {}

    const attachRegistration = (reg: ServiceWorkerRegistration) => {
      // Check if a worker is already waiting in installed state while a controller exists
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
        setShowBanner(true);
      }

      // Listen for new workers entering the pipeline
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(installingWorker);
            setShowBanner(true);
          }
        };
      };
    };

    const checkForUpdate = async () => {
      try {
        if (!isRunningAsInstalledApp()) return;

        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        attachRegistration(reg);

        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
          setShowBanner(true);
          return;
        }

        await reg.update();

        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
          setShowBanner(true);
        }
      } catch {
        // Ignored when offline or network fails
      }
    };

    // Listen for controllerchange: in installed app mode, reload ONLY if user initiated it via handleRefresh
    const handleControllerChange = () => {
      if (!hadControllerRef.current) {
        hadControllerRef.current = true;
        return;
      }

      if (!isRunningAsInstalledApp()) return;

      if (isRefreshing) return;

      try {
        if (sessionStorage.getItem(RELOAD_GUARD_KEY) === "true") {
          return;
        }
      } catch {}

      // If user is currently typing and didn't manually press refresh, defer auto-reload
      if (isUserTyping() && !isUpdating) {
        setShowBanner(true);
        return;
      }

      // If update was triggered by the user clicking Refresh
      if (isUpdating) {
        isRefreshing = true;
        try {
          sessionStorage.setItem(RELOAD_GUARD_KEY, "true");
        } catch {}
        window.location.reload();
      } else {
        // Show banner to let the user choose when to refresh, avoiding disruptive unexpected reloads
        setShowBanner(true);
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Initial check on mount once ready
    navigator.serviceWorker.ready.then((reg) => {
      attachRegistration(reg);
      checkForUpdate();
    });

    // Check on window focus and document visibilitychange (when visible)
    const handleFocus = () => {
      checkForUpdate();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Re-check periodically every 30 minutes while the app remains open
    const thirtyMinutesMs = 30 * 60 * 1000;
    const intervalId = setInterval(checkForUpdate, thirtyMinutesMs);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, [isUserTyping, isUpdating]);

  if (!showBanner) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Application update available"
      className="fixed bottom-20 sm:bottom-6 right-3 left-3 sm:left-auto sm:right-6 z-[999] pointer-events-auto select-none sm:w-[380px] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white/95 dark:bg-[#0c1322]/95 backdrop-blur-md border border-[#DCE5F0] dark:border-blue-500/30 text-[#1E293B] dark:text-white shadow-xl shadow-black/10 dark:shadow-black/40 p-3.5 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 dark:bg-blue-400" />
          </span>
          <div className="flex flex-col min-w-0">
            <p className="text-xs sm:text-sm font-semibold truncate leading-tight">
              {isBn ? "নতুন আপডেট পাওয়া গেছে" : "New version available"}
            </p>
            <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate leading-tight mt-0.5">
              {isBn ? "লেটেস্ট বিল্ড পেতে রিফ্রেশ করুন" : "Tap Refresh to load the latest build"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isUpdating}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? "animate-spin" : ""}`} />
            <span>
              {isUpdating
                ? isBn
                  ? "আপডেট হচ্ছে..."
                  : "Updating..."
                : isBn
                ? "রিফ্রেশ"
                : "Refresh"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss update banner"
            className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
