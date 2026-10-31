"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { useAppContext } from "@/context/AppContext";

export function isRunningAsInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith("android-app://") ||
      window.location.search.includes("source=pwa") ||
      window.location.search.includes("mode=app") ||
      Boolean((window as unknown as { isAppInstalled?: boolean }).isAppInstalled)
    );
  } catch {
    return false;
  }
}

// Module-level guard to prevent multiple simultaneous reload triggers
let isRefreshing = false;

export default function PWAUpdater() {
  const { state } = useAppContext();
  const isLight = state?.theme?.mode === "light";

  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [isInstalledApp, setIsInstalledApp] = useState<boolean>(false);
  const [isModalDismissed, setIsModalDismissed] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const isUpdatingRef = useRef<boolean>(false);
  const hadControllerRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsInstalledApp(isRunningAsInstalledApp());
    try {
      if (sessionStorage.getItem("focentia_update_modal_dismissed") === "true") {
        setIsModalDismissed(true);
      }
    } catch {}
  }, []);

  const executeServiceWorkerReload = useCallback(() => {
    try {
      localStorage.removeItem("focentia_has_pwa_update");
      sessionStorage.removeItem("focentia_update_banner_dismissed");
      sessionStorage.removeItem("focentia_update_modal_dismissed");
      delete (window as any).__focentia_has_pwa_update;
    } catch {}

    let hasReloaded = false;
    const triggerReload = () => {
      if (hasReloaded) return;
      hasReloaded = true;
      try {
        localStorage.removeItem("focentia_has_pwa_update");
      } catch {}
      window.location.reload();
    };

    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          triggerReload();
        },
        { once: true }
      );

      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          const worker = reg?.waiting || waitingWorker;
          if (worker) {
            worker.postMessage({ type: "SKIP_WAITING" });
          } else {
            triggerReload();
          }
        })
        .catch(() => {
          triggerReload();
        });

      setTimeout(() => {
        triggerReload();
      }, 800);
    } else {
      triggerReload();
    }
  }, [waitingWorker]);

  const handleRefresh = useCallback(() => {
    if (isUpdatingRef.current || isRefreshing) return;
    isUpdatingRef.current = true;
    isRefreshing = true;
    setIsUpdating(true);
    setProgress(12);

    const startTime = Date.now();
    const duration = 600;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(1, elapsed / duration);
      const nextVal = Math.min(100, Number((ratio * 100).toFixed(0)));
      setProgress(nextVal);
      if (ratio >= 1) {
        clearInterval(interval);
        executeServiceWorkerReload();
      }
    }, 30);
  }, [executeServiceWorkerReload]);

  const handleDismissModal = useCallback(() => {
    if (isUpdatingRef.current) return;
    setIsModalDismissed(true);
    try {
      sessionStorage.setItem("focentia_update_modal_dismissed", "true");
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("focentia:pwa_update_ready", {
          detail: { hasUpdate: true, dismissedModal: true },
        })
      );
    }
  }, []);

  // Bind global update trigger for navbar access across phone and desktop
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__focentia_trigger_pwa_update = handleRefresh;
    }
  }, [handleRefresh]);

  const notifyUpdateAvailable = useCallback((worker?: ServiceWorker | null) => {
    if (worker) {
      setWaitingWorker(worker);
    }
    setHasUpdate(true);
    if (typeof window !== "undefined") {
      const installed = isRunningAsInstalledApp();
      setIsInstalledApp(installed);
      const dismissed =
        !installed ||
        sessionStorage.getItem("focentia_update_modal_dismissed") === "true";
      (window as any).__focentia_has_pwa_update = true;
      try {
        localStorage.setItem("focentia_has_pwa_update", "true");
      } catch {}
      window.dispatchEvent(
        new CustomEvent("focentia:pwa_update_ready", {
          detail: { hasUpdate: true, dismissedModal: dismissed },
        })
      );
    }
  }, []);

  // When a waiting worker is detected, notify top navbar and save state
  useEffect(() => {
    if (waitingWorker) {
      notifyUpdateAvailable(waitingWorker);
    }
  }, [waitingWorker, notifyUpdateAvailable]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Check if an update was already pending
    try {
      if (localStorage.getItem("focentia_has_pwa_update") === "true") {
        notifyUpdateAvailable(null);
      }
    } catch {}

    hadControllerRef.current = Boolean(navigator.serviceWorker.controller);

    const attachRegistration = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting && navigator.serviceWorker.controller) {
        notifyUpdateAvailable(reg.waiting);
      }

      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            notifyUpdateAvailable(installingWorker);
          }
        };
      };
    };

    const checkForUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;

        attachRegistration(reg);

        if (reg.waiting && navigator.serviceWorker.controller) {
          notifyUpdateAvailable(reg.waiting);
          return;
        }

        await reg.update();

        if (reg.waiting && navigator.serviceWorker.controller) {
          notifyUpdateAvailable(reg.waiting);
        }
      } catch {
        // Ignored when offline or network fails
      }
    };

    navigator.serviceWorker.ready.then((reg) => {
      attachRegistration(reg);
      checkForUpdate();
    });

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

    const thirtyMinutesMs = 30 * 60 * 1000;
    const intervalId = setInterval(checkForUpdate, thirtyMinutesMs);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [notifyUpdateAvailable]);

  // Show centered modal ONLY for installed standalone PWA when update is available and not yet dismissed
  const shouldShowModal = hasUpdate && isInstalledApp && !isModalDismissed;

  if (!shouldShowModal) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-5 pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="focentia-system-update-title"
    >
      <div
        className={`pointer-events-auto relative w-full max-w-[336px] rounded-[28px] px-6 pt-7 pb-6 text-center transition-colors ${
          isLight
            ? "bg-[#FFFFFF] border border-[#CBD5E1] text-[#0F172A]"
            : "bg-[#0B132B] border border-[#233554] text-[#F8FAFC]"
        }`}
      >
        {/* Top-right Cross (X) button to ignore/dismiss */}
        <button
          type="button"
          onClick={handleDismissModal}
          disabled={isUpdating}
          aria-label="Ignore update for now"
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isLight
              ? "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          } ${isUpdating ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top small subtitle */}
        <p
          className={`text-[13px] font-medium tracking-wide mb-1.5 ${
            isLight ? "text-slate-500" : "text-slate-300/90"
          }`}
        >
          New Version Available
        </p>

        {/* Main Title */}
        <h2
          id="focentia-system-update-title"
          className={`text-[26px] font-bold tracking-tight leading-tight mb-2.5 ${
            isLight ? "text-[#0F172A]" : "text-white"
          }`}
        >
          System Update
        </h2>

        {/* Easy professional English description */}
        <p
          className={`text-[13.5px] leading-relaxed mb-6 px-1 ${
            isLight ? "text-slate-600" : "text-slate-300/90"
          }`}
        >
          A new update is ready to make your app faster and smoother.
        </p>

        {/* Progress Bar Track */}
        <div className="mb-2">
          <div
            className={`w-full h-3.5 rounded-full overflow-hidden p-[2px] border ${
              isLight
                ? "bg-slate-100 border-slate-200"
                : "bg-[#070D1F] border-[#1E293B]"
            }`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#22D3EE] via-[#3B82F6] to-[#4F46E5] transition-all duration-150"
              style={{ width: `${ isUpdating ? Math.max(12, progress) : 100 }%` }}
            />
          </div>
        </div>

        {/* Progress Label & Percentage */}
        <div
          className={`flex items-center justify-between text-[13px] font-medium mb-6 px-0.5 ${
            isLight ? "text-slate-600" : "text-slate-200"
          }`}
        >
          <span>Progress</span>
          <span>{isUpdating ? `${progress}%` : "100%"}</span>
        </div>

        {/* Bottom Pill Action Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isUpdating}
          className={`w-full py-3.5 rounded-full text-[15px] font-bold tracking-tight transition-transform active:scale-[0.98] ${
            isLight
              ? "bg-[#0F172A] text-white hover:bg-[#1E293B]"
              : "bg-white text-[#0B132B] hover:bg-slate-100"
          } ${isUpdating ? "opacity-80 cursor-wait" : ""}`}
        >
          {isUpdating ? "Updating..." : "Restart Now"}
        </button>
      </div>
    </div>
  );
}
