"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const isLocalhost = Boolean(
      window.location.hostname === "localhost" ||
      window.location.hostname === "[::1]" ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    // In local development, unregister any stale service workers to prevent Turbopack/HMR chunk caching errors
    if (process.env.NODE_ENV === "development" || isLocalhost) {
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

    let refreshing = false;
    const hadController = Boolean(navigator.serviceWorker.controller);

    // When the new service worker takes over, reload the page ONLY if an older controller was already active (i.e. an update, NOT initial install)
    const handleControllerChange = () => {
      if (hadController && !refreshing) {
        refreshing = true;
        console.log("[PWA] Controller updated. Reloading page to apply updates...");
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Capture native PWA install prompt globally
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as unknown as { deferredPrompt: Event }).deferredPrompt = e;
    };

    const handleAppInstalled = () => {
      (window as unknown as { deferredPrompt: null }).deferredPrompt = null;
      (window as unknown as { isAppInstalled: boolean }).isAppInstalled = true;
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

          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("[PWA] New FocusForge version downloaded. Activating now...");
                  // Tell new worker to skip waiting and activate immediately
                  installingWorker.postMessage({ type: "SKIP_WAITING" });
                }
              };
            }
          };

          // Periodically check for updates (every 2.5 minutes)
          const interval = setInterval(() => {
            reg.update().catch(() => {});
          }, 2.5 * 60 * 1000);

          // Check for updates whenever user returns to the tab or app
          const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
              reg.update().catch(() => {});
            }
          };

          document.addEventListener("visibilitychange", handleVisibilityChange);
          window.addEventListener("focus", handleVisibilityChange);

          return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleVisibilityChange);
          };
        })
        .catch((err) => {
          console.warn("[PWA] ServiceWorker registration warning:", err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
