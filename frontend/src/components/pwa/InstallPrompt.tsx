"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallPromptProps {
  variant?: "sidebar" | "banner" | "button";
}

export default function InstallPrompt({ variant = "sidebar" }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const { showToast, state } = useAppContext();

  // Helper to detect if running as an installed PWA / standalone application
  const detectStandalone = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith("android-app://")
    );
  }, []);

  // Check installation status via browser APIs
  const checkInstallStatus = useCallback(async () => {
    // 1. Check if currently running inside the installed standalone PWA
    if (detectStandalone()) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if installed on device via getInstalledRelatedApps (supported in Chrome 101+)
    if (typeof navigator !== "undefined" && "getInstalledRelatedApps" in navigator) {
      try {
        const relatedApps = await (navigator as unknown as { getInstalledRelatedApps: () => Promise<unknown[]> }).getInstalledRelatedApps();
        if (relatedApps && relatedApps.length > 0) {
          setIsInstalled(true);
          return;
        } else {
          // If user uninstalled the app and opened browser, it will be empty
          setIsInstalled(false);
        }
      } catch (e) {
        // Silently continue if permissions or context restrict access
      }
    }
  }, [detectStandalone]);

  useEffect(() => {
    setMounted(true);
    checkInstallStatus();

    // 3. Listen for display-mode changes (e.g. user opens app or launches standalone)
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
      } else {
        checkInstallStatus();
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleMediaChange);
    }

    // 4. Capture native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstalled(false);
    };

    // 5. Handle appinstalled event: Immediately hide entire installation UI
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast("FocusForge installed successfully!", "success");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [checkInstallStatus, showToast]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          // Immediately hide installation UI
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("[PWA] Prompt error:", err);
      }
    } else {
      // If browser doesn't expose beforeinstallprompt (e.g., iOS Safari or already promptable via browser menu)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
      if (isIOS) {
        showToast("To install FocusForge: Tap the Share button in Safari, then select 'Add to Home Screen'.", "info");
      } else {
        showToast("To install FocusForge: Click the install icon in your browser address bar or menu (⋮).", "info");
      }
    }
  };

  // Do not render before mount (SSR safety) or if FocusForge IS INSTALLED
  if (!mounted || isInstalled) {
    return null;
  }

  // Sidebar card variant - sleek, compact and perfectly proportioned
  if (variant === "sidebar") {
    return (
      <div 
        className="sidebar-install-card mx-2 mb-2 p-2 rounded-xl relative overflow-hidden transition-all duration-300 animate-fade-in flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 min-w-0">
          <img 
            src="/icons/icon-72x72.png" 
            alt="FocusForge" 
            className="w-6 h-6 rounded-md shadow-sm border border-blue-500/30 object-cover shrink-0" 
          />
          <div className="min-w-0">
            <h4 
              className="text-[11px] font-bold tracking-tight truncate leading-tight transition-colors" 
              style={{ color: "var(--color-text-primary)" }}
            >
              FocusForge
            </h4>
            <p 
              className="text-[9px] truncate leading-tight mt-0.5 transition-colors" 
              style={{ color: "var(--color-text-secondary)" }}
            >
              {state?.lang === 'bn' ? "অ্যাপ ইনস্টল করুন" : "Install App"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="btn-accent-solid flex items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-semibold text-white transition-all hover:opacity-95 shadow-sm shadow-blue-600/30 cursor-pointer shrink-0"
          style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "#FFFFFF" }}
        >
          <Download size={11} style={{ color: "#FFFFFF" }} />
          <span style={{ color: "#FFFFFF" }}>{state?.lang === 'bn' ? "ইনস্টল" : "Install"}</span>
        </button>
      </div>
    );
  }

  // Header button variant
  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 transition-all cursor-pointer"
      title={state?.lang === 'bn' ? "FocusForge অ্যাপ ইনস্টল করুন" : "Install FocusForge App"}
    >
      <Download size={13} className="text-blue-400" />
      <span>{state?.lang === 'bn' ? "অ্যাপ ইনস্টল করুন" : "Install App"}</span>
    </button>
  );
}
