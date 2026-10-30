"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// Module-level guard to prevent multiple simultaneous reload triggers
let isRefreshing = false;

export default function PWAUpdater() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [, setIsUpdating] = useState<boolean>(false);
  const isUpdatingRef = useRef<boolean>(false);
  const hadControllerRef = useRef<boolean>(false);

  const handleRefresh = useCallback(() => {
    if (isUpdatingRef.current || isRefreshing) return;
    isUpdatingRef.current = true;
    isRefreshing = true;
    setIsUpdating(true);

    try {
      localStorage.removeItem("focentia_has_pwa_update");
      sessionStorage.removeItem("focentia_update_banner_dismissed");
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
      // 1. One-shot listener for controllerchange so we reload the exact moment new worker activates
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          triggerReload();
        },
        { once: true }
      );

      // 2. Instruct the waiting service worker to immediately skip waiting and claim client
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

      // 3. Fallback reload if controllerchange does not fire within 850ms
      setTimeout(() => {
        triggerReload();
      }, 850);
    } else {
      triggerReload();
    }
  }, [waitingWorker]);

  // Bind global update trigger for navbar access across phone and desktop
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__focentia_trigger_pwa_update = handleRefresh;
    }
  }, [handleRefresh]);

  // When a waiting worker is detected, notify top navbar and save state
  useEffect(() => {
    if (waitingWorker) {
      if (typeof window !== "undefined") {
        (window as any).__focentia_has_pwa_update = true;
        try {
          localStorage.setItem("focentia_has_pwa_update", "true");
        } catch {}
        window.dispatchEvent(
          new CustomEvent("focentia:pwa_update_ready", { detail: { hasUpdate: true } })
        );
      }
    }
  }, [waitingWorker]);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Check if an update was already pending
    try {
      if (localStorage.getItem("focentia_has_pwa_update") === "true") {
        (window as any).__focentia_has_pwa_update = true;
        window.dispatchEvent(
          new CustomEvent("focentia:pwa_update_ready", { detail: { hasUpdate: true } })
        );
      }
    } catch {}

    hadControllerRef.current = Boolean(navigator.serviceWorker.controller);

    const attachRegistration = (reg: ServiceWorkerRegistration) => {
      // Check if a worker is already waiting in installed state while a controller exists
      if (reg.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(reg.waiting);
        try {
          localStorage.setItem("focentia_has_pwa_update", "true");
        } catch {}
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("focentia:pwa_update_ready", { detail: { hasUpdate: true } })
          );
        }
      }

      // Listen for new incoming workers entering the pipeline
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.onstatechange = () => {
          if (
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setWaitingWorker(installingWorker);
            try {
              localStorage.setItem("focentia_has_pwa_update", "true");
            } catch {}
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("focentia:pwa_update_ready", { detail: { hasUpdate: true } })
              );
            }
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
          setWaitingWorker(reg.waiting);
          try {
            localStorage.setItem("focentia_has_pwa_update", "true");
          } catch {}
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("focentia:pwa_update_ready", { detail: { hasUpdate: true } })
            );
          }
          return;
        }

        await reg.update();

        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
          try {
            localStorage.setItem("focentia_has_pwa_update", "true");
          } catch {}
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("focentia:pwa_update_ready", { detail: { hasUpdate: true } })
            );
          }
        }
      } catch {
        // Ignored when offline or network fails
      }
    };

    // Initial check on mount once ready
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

    // Periodic check every 30 minutes
    const thirtyMinutesMs = 30 * 60 * 1000;
    const intervalId = setInterval(checkForUpdate, thirtyMinutesMs);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Update prompt is exclusively integrated into the top navbar (MobileHeader & Desktop nav).
  // Zero bottom popup banners/cards underneath the navbar.
  return null;
}
