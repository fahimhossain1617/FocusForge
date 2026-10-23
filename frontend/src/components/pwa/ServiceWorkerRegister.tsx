"use client";

import { useEffect } from "react";
import { subscribeUserToPush } from "../../utils/pushSubscription";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isLocalhost = Boolean(
      window.location.hostname === "localhost" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    // In local development (npm run dev), unregister stale service workers unless NEXT_PUBLIC_ENABLE_DEV_SW is true
    if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_DEV_SW !== "true") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      }).catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        }).catch(() => {});
      }
      return;
    }

    // Capture native PWA install prompt globally
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as { deferredPrompt: Event }).deferredPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa:beforeinstallprompt", { detail: e }));
    };

    const handleAppInstalled = () => {
      (window as unknown as { deferredPrompt: null }).deferredPrompt = null;
      (window as unknown as { isAppInstalled: boolean }).isAppInstalled = true;
      window.dispatchEvent(new CustomEvent("pwa:installed"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const register = () => {
      // updateViaCache: "none" prevents the browser from caching sw.js via HTTP
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          // Immediately check for updates from the server
          reg.update().catch(() => {});

          // If permission is already granted, ensure Web Push subscription is registered
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            subscribeUserToPush().catch(() => {});
          }

          // Register periodic background sync for Android / Chromium PWA offline reminder delivery
          if ("periodicSync" in reg) {
            try {
              (navigator as any).permissions?.query({ name: "periodic-background-sync" })
                .then((status: any) => {
                  if (status?.state === "granted") {
                    (reg as any).periodicSync.register("focentia-reminders", {
                      minInterval: 15 * 60 * 1000,
                    }).catch(() => {});
                  }
                })
                .catch(() => {});
            } catch {}
          }
        })
        .catch((err) => {
          console.warn("[PWA] ServiceWorker registration warning:", err);
        });
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "NAVIGATE" && event.data.route) {
        try {
          window.dispatchEvent(
            new CustomEvent("focusforge:navigate", {
              detail: {
                route: event.data.route,
                taskId: event.data.taskId,
                action: event.data.action,
              },
            })
          );
        } catch {}
        try {
          window.location.hash = event.data.route;
        } catch {}
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  return null;
}
