"use client";

import { useEffect } from "react";

/**
 * Detects whether the current environment is a mobile device or tablet.
 * Strictly excludes desktop / laptop browsers (including touch-screen laptops
 * like Windows Surface / Yoga) by verifying mobile user agent patterns or
 * mobile-specific touch + viewport criteria.
 */
function isMobileDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isIPad = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isCoarseTouchSmall =
    navigator.maxTouchPoints > 0 &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 1024px) and (pointer: coarse)").matches;

  return isMobileUA || isIPad || isCoarseTouchSmall;
}

/**
 * Detects whether the application is currently running as an installed PWA / standalone app.
 * Returns false when opened in a standard browser tab.
 */
function isInstalledPWA(): boolean {
  if (typeof window === "undefined") return false;

  try {
    // 1. CSS Display Modes
    const isStandaloneDisplay =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.matchMedia?.("(display-mode: fullscreen)")?.matches ||
      window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
      window.matchMedia?.("(display-mode: window-controls-overlay)")?.matches;

    if (isStandaloneDisplay) return true;

    // 2. iOS Safari Add-to-Home-Screen standalone property
    if ((window.navigator as unknown as { standalone?: boolean })?.standalone === true) {
      return true;
    }

    // 3. Android TWA / WebAPK wrapper
    if (typeof document !== "undefined" && document.referrer?.startsWith("android-app://")) {
      return true;
    }

    // 4. URL launch indicators from manifest start_url
    const search = window.location.search || "";
    if (search.includes("source=pwa") || search.includes("mode=app")) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * MobilePwaZoomLock
 *
 * Prevents accidental two-finger pinch-to-zoom ONLY on mobile devices when running
 * as an installed PWA (WebAPK / Standalone).
 *
 * Preserves:
 * - Desktop/laptop browser zoom (Ctrl++, Ctrl+-, Ctrl+wheel, browser menus)
 * - Standard mobile website browsing zoom in regular browser tabs
 * - Normal vertical and horizontal scrolling across all views
 * - Single-finger taps, button clicks, typing in text inputs, text selection, and dialogs
 */
export default function MobilePwaZoomLock() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // Evaluate context: MUST be a mobile device AND running in standalone PWA mode
    const checkShouldLock = (): boolean => {
      return isMobileDevice() && isInstalledPWA();
    };

    let cleanupListeners: (() => void) | null = null;

    const applyLockIfEligible = () => {
      if (!checkShouldLock()) {
        // Not a mobile PWA: ensure lock attributes and listeners are NOT applied
        if (cleanupListeners) {
          cleanupListeners();
          cleanupListeners = null;
        }
        document.documentElement.classList.remove("ff-mobile-pwa");
        delete document.documentElement.dataset.mobilePwa;
        return;
      }

      // 1. Mark root element for CSS touch-action: pan-x pan-y
      document.documentElement.classList.add("ff-mobile-pwa");
      document.documentElement.dataset.mobilePwa = "true";

      // 2. Dynamically constrain viewport meta tag on installed mobile PWA only
      const metaViewport = document.querySelector('meta[name="viewport"]');
      if (metaViewport) {
        metaViewport.setAttribute(
          "content",
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=resizes-content"
        );
      }

      // If listeners are already active, keep them
      if (cleanupListeners) return;

      // 3. Multi-touch touchmove interceptor (blocks two-finger pinch gesture, allows 1-finger scroll)
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches && e.touches.length > 1) {
          e.preventDefault();
        }
      };

      // 4. WebKit / iOS Safari gesture zoom cancellation
      const onGestureStart = (e: Event) => {
        e.preventDefault();
      };
      const onGestureChange = (e: Event) => {
        e.preventDefault();
      };

      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("gesturestart", onGestureStart, { passive: false });
      document.addEventListener("gesturechange", onGestureChange, { passive: false });

      cleanupListeners = () => {
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("gesturestart", onGestureStart);
        document.removeEventListener("gesturechange", onGestureChange);
      };
    };

    applyLockIfEligible();

    // Listen for display-mode or app installation changes
    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");
    const handleMediaChange = () => applyLockIfEligible();

    mediaQuery?.addEventListener?.("change", handleMediaChange);
    window.addEventListener("appinstalled", handleMediaChange);

    return () => {
      mediaQuery?.removeEventListener?.("change", handleMediaChange);
      window.removeEventListener("appinstalled", handleMediaChange);
      if (cleanupListeners) {
        cleanupListeners();
      }
      document.documentElement.classList.remove("ff-mobile-pwa");
      delete document.documentElement.dataset.mobilePwa;
    };
  }, []);

  return null;
}
