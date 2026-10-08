"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { useAppContext } from "../../context/AppContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallPromptProps {
  variant?: "sidebar" | "sidebar-collapsed" | "header" | "button";
}

export default function InstallPrompt({ variant = "sidebar" }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const { showToast, state } = useAppContext();

  const isBn = state?.lang === "bn";

  // Helper to detect if running as an installed PWA / standalone application
  const detectStandalone = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.startsWith("android-app://") ||
      Boolean((window as unknown as { isAppInstalled?: boolean }).isAppInstalled)
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
          setIsInstalled(false);
        }
      } catch (e) {
        // Silently continue if permissions or context restrict access
      }
    }
  }, [detectStandalone]);

  useEffect(() => {
    setMounted(true);

    // Pick up pre-captured deferredPrompt if ServiceWorkerRegister captured it earlier
    const existingPrompt = (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
    }

    checkInstallStatus();

    // 3. Listen for display-mode changes
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

    const handleCustomBeforeInstall = (e: Event) => {
      const customDetail = (e as CustomEvent<BeforeInstallPromptEvent>).detail;
      if (customDetail) {
        setDeferredPrompt(customDetail);
      }
      setIsInstalled(false);
    };

    // 5. Handle appinstalled event: Immediately hide entire installation UI
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showToast(isBn ? "Focentia সফলভাবে ইনস্টল হয়েছে!" : "Focentia installed successfully!", "success");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwa:beforeinstallprompt", handleCustomBeforeInstall as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("pwa:installed", handleAppInstalled as EventListener);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleMediaChange);
      }
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwa:beforeinstallprompt", handleCustomBeforeInstall as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("pwa:installed", handleAppInstalled as EventListener);
    };
  }, [checkInstallStatus, isBn, showToast]);

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const promptEvent = deferredPrompt || (window as unknown as { deferredPrompt?: BeforeInstallPromptEvent }).deferredPrompt;

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
        (window as unknown as { deferredPrompt?: null }).deferredPrompt = null;
      } catch (err) {
        console.error("[PWA] Prompt error:", err);
      }
    } else {
      // If browser doesn't expose beforeinstallprompt (e.g., iOS Safari or manual browser menu install)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
      if (isIOS) {
        showToast(
          isBn
            ? "Focentia ইনস্টল করতে: Safari-তে Share বাটনে ট্যাপ করে 'Add to Home Screen' সিলেক্ট করুন।"
            : "To install Focentia: tap the Share button in Safari, then select 'Add to Home Screen'.",
          "info"
        );
      } else {
        showToast(
          isBn
            ? "Focentia ইনস্টল করতে: ব্রাউজারের থ্রি-ডট (⋮) মেনু থেকে 'Install app' বা 'Add to Home screen' চাপুন।"
            : "To install Focentia: click the install icon in your browser address bar or menu (⋮).",
          "info"
        );
      }
    }
  };

  // Do not render before mount (SSR safety) or if Focentia IS ALREADY INSTALLED / in standalone mode
  if (!mounted || isInstalled) {
    return null;
  }

  // 1. Mobile & Tablet Top Header Variant (Sleek, compact pill next to Theme Toggle)
  if (variant === "header") {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold tracking-tight text-[#2563EB] dark:text-blue-400 bg-blue-50/90 hover:bg-blue-100/90 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/40 transition-all duration-150 active:scale-95 cursor-pointer shrink-0 outline-none select-none shadow-none"
        title={isBn ? "Focentia অ্যাপ ইনস্টল করুন" : "Get Focentia App"}
        aria-label={isBn ? "গেট অ্যাপ" : "Get App"}
      >
        <Download size={13} strokeWidth={2.3} className="shrink-0 text-[#2563EB] dark:text-blue-400" />
        <span className="leading-none whitespace-nowrap">{isBn ? "গেট অ্যাপ" : "Get App"}</span>
      </button>
    );
  }

  // 2. Collapsed Sidebar Variant (Icon Button on laptop/desktop)
  if (variant === "sidebar-collapsed") {
    return (
      <div className="relative group hidden md:flex items-center justify-center">
        <button
          type="button"
          onClick={handleInstallClick}
          className="relative flex items-center justify-center w-11 h-11 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/70 dark:border-blue-800/40 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#5B8DEF]"
          aria-label={isBn ? "গেট অ্যাপ" : "Get App"}
          title={isBn ? "গেট অ্যাপ" : "Get App"}
        >
          <Download size={18} strokeWidth={2.2} />
        </button>
        <div className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white dark:bg-[#1A2234] dark:text-slate-100 text-xs rounded-lg shadow-none opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap z-50 translate-x-1 group-hover:translate-x-0 border border-slate-700/50">
          <div className="font-semibold">{isBn ? "গেট অ্যাপ" : "Get App"}</div>
          <div className="text-[10px] text-slate-400">{isBn ? "অ্যাপ ইনস্টল করুন" : "Install App"}</div>
        </div>
      </div>
    );
  }

  // 3. Expanded Sidebar Variant (Desktop / Laptop card right above user profile)
  if (variant === "sidebar") {
    return (
      <div 
        className="sidebar-install-card mx-1 mb-1.5 p-2 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.07] relative overflow-hidden transition-all duration-300 flex items-center justify-between gap-2 shrink-0 select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center shrink-0">
            <Download size={14} className="text-[#2563EB] dark:text-blue-400" strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold tracking-tight truncate leading-tight text-[#0F172A] dark:text-foreground">
              {isBn ? "গেট অ্যাপ" : "Get App"}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-muted-foreground truncate leading-tight mt-0.5">
              {isBn ? "সহজে ব্যবহার করুন" : "Install Focentia"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-[11px] font-semibold text-white bg-[#2563EB] hover:bg-blue-600 transition-all active:scale-95 cursor-pointer shrink-0 shadow-none border-none outline-none"
        >
          <span>{isBn ? "ইনস্টল" : "Install"}</span>
        </button>
      </div>
    );
  }

  // 4. Default / Generic Button Variant
  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#2563EB] dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30 transition-all cursor-pointer"
      title={isBn ? "Focentia অ্যাপ ইনস্টল করুন" : "Install Focentia App"}
    >
      <Download size={13} className="text-[#2563EB] dark:text-blue-400" />
      <span>{isBn ? "গেট অ্যাপ" : "Get App"}</span>
    </button>
  );
}
