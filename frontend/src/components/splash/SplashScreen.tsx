"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export interface SplashScreenProps {
  /**
   * Total number of frames in the animation sequence. Default: 240.
   */
  totalFrames?: number;
  /**
   * Total duration in milliseconds for the animation playback. Default: 3400ms (3.4s).
   */
  durationMs?: number;
  /**
   * Function to resolve the URL of each frame (0-indexed).
   * Default resolves to `/splash-frames/frame_0001.png` ... `/splash-frames/frame_0240.png`.
   */
  getFrameUrl?: (index: number) => string;
  /**
   * Callback fired immediately when the splash screen has completed its transition and unmounted.
   */
  onComplete?: () => void;
  /**
   * Minimum frames required to start playback before streaming the rest. Default: 18.
   */
  bufferThreshold?: number;
  /**
   * If true, saves a flag in sessionStorage so splash only plays once per browser session.
   * Default: false.
   */
  oncePerSession?: boolean;
  /**
   * Whether to show a subtle skip button for accessibility. Default: true.
   */
  showSkipButton?: boolean;
  /**
   * Optional custom class for the root splash screen container.
   */
  className?: string;
}

const DEFAULT_FRAME_URL = (index: number): string => {
  const frameNum = String(index + 1).padStart(4, "0");
  return `/splash-frames/frame_${frameNum}.png`;
};

const SESSION_STORAGE_KEY = "focusforge_splash_shown";

/**
 * High-Performance Enterprise Splash Screen & Logo Intro Component.
 * - Hardware-accelerated HTML5 Canvas rendering for zero-jank 60/120fps playback.
 * - Delta-time based requestAnimationFrame clock ensures exact 3-4s finish regardless of screen refresh rate.
 * - Progressive concurrent frame streaming to eliminate heavy initial network wait times.
 * - Crisp, subtle enterprise handoff transition (Google/Notion style) that completely unmounts from DOM.
 * - Full memory cleanup to prevent leaks.
 */
export default function SplashScreen({
  totalFrames = 240,
  durationMs = 3400,
  getFrameUrl = DEFAULT_FRAME_URL,
  onComplete,
  bufferThreshold = 18,
  oncePerSession = false,
  showSkipButton = true,
  className = "",
}: SplashScreenProps) {
  const [isMounted, setIsMounted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (oncePerSession) {
      try {
        const alreadyShown = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (alreadyShown === "true") return false;
      } catch {
        // Fallback if sessionStorage is disabled/blocked
      }
    }
    return true;
  });

  const [isExiting, setIsExiting] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isPlaybackReady, setIsPlaybackReady] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const isCancelledRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastRenderedIndexRef = useRef<number>(-1);
  const loadedCountRef = useRef(0);

  // Mark splash as completed and trigger unmount handoff
  const completeSplash = useCallback(() => {
    if (isCancelledRef.current || isExiting) return;
    setIsExiting(true);

    if (oncePerSession) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
      } catch {}
    }

    // Enterprise-grade fast & subtle handoff (300ms)
    setTimeout(() => {
      setIsMounted(false);
      if (onComplete) {
        onComplete();
      }
      // Memory cleanup: Release image references
      imagesRef.current = [];
    }, 320);
  }, [isExiting, oncePerSession, onComplete]);

  // Handle Skip
  const handleSkip = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    completeSplash();
  }, [completeSplash]);

  // Check reduced motion preference for accessibility
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) {
        // If user prefers reduced motion, skip after minimal display
        const timer = setTimeout(completeSplash, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [completeSplash]);

  // 1. Concurrent Progressive Image Preloading Pipeline
  useEffect(() => {
    if (!isMounted) return;

    isCancelledRef.current = false;
    imagesRef.current = new Array(totalFrames).fill(null);
    loadedCountRef.current = 0;

    const maxConcurrency = 12; // Parallel batch size for high-throughput pipeline
    let currentIndex = 0;

    const loadSingleFrame = (index: number): Promise<void> => {
      return new Promise((resolve) => {
        if (isCancelledRef.current) {
          resolve();
          return;
        }

        const img = new Image();
        img.src = getFrameUrl(index);

        const onDone = () => {
          if (isCancelledRef.current) return;
          imagesRef.current[index] = img;
          loadedCountRef.current += 1;

          setLoadProgress(Math.min(100, Math.round((loadedCountRef.current / totalFrames) * 100)));

          // Check if buffer threshold reached to start playback early
          if (loadedCountRef.current >= Math.min(bufferThreshold, totalFrames)) {
            setIsPlaybackReady(true);
          }
          resolve();
        };

        if (img.complete && img.naturalWidth > 0) {
          onDone();
        } else {
          img.onload = onDone;
          img.onerror = () => {
            // On error, resolve gracefully so pipeline continues
            resolve();
          };
        }
      });
    };

    // Worker pool for preloading
    const startWorker = async () => {
      while (currentIndex < totalFrames && !isCancelledRef.current) {
        const indexToLoad = currentIndex++;
        await loadSingleFrame(indexToLoad);
      }
    };

    // Spawn concurrent preloader workers
    const workers = Array.from({ length: Math.min(maxConcurrency, totalFrames) }, () => startWorker());
    Promise.all(workers);

    return () => {
      isCancelledRef.current = true;
    };
  }, [isMounted, totalFrames, bufferThreshold, getFrameUrl]);

  // 2. High-Performance Canvas Animation Loop with Delta Timing
  useEffect(() => {
    if (!isMounted || !isPlaybackReady || isExiting) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Set canvas dimensions based on source frame ratio
    let canvasWidth = 720;
    let canvasHeight = 1280;

    // Try reading dimensions from the first available loaded frame
    const firstLoaded = imagesRef.current.find((img) => img && img.naturalWidth > 0);
    if (firstLoaded && firstLoaded.naturalWidth && firstLoaded.naturalHeight) {
      canvasWidth = firstLoaded.naturalWidth;
      canvasHeight = firstLoaded.naturalHeight;
    }

    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    const renderLoop = (timestamp: number) => {
      if (isCancelledRef.current) return;

      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / durationMs);

      // Target frame calculation
      const targetFrameIndex = Math.min(
        totalFrames - 1,
        Math.floor(progress * totalFrames)
      );

      // Only draw when index changes
      if (targetFrameIndex !== lastRenderedIndexRef.current) {
        // Find current frame or fallback to latest available preceding frame
        let frameToDraw: HTMLImageElement | null = imagesRef.current[targetFrameIndex];

        if (!frameToDraw || !frameToDraw.complete) {
          for (let i = targetFrameIndex - 1; i >= 0; i--) {
            if (imagesRef.current[i] && imagesRef.current[i]!.complete) {
              frameToDraw = imagesRef.current[i];
              break;
            }
          }
        }

        if (frameToDraw && frameToDraw.complete) {
          ctx.drawImage(frameToDraw, 0, 0, canvas.width, canvas.height);
          lastRenderedIndexRef.current = targetFrameIndex;
        }
      }

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(renderLoop);
      } else {
        // Playback finished smoothly
        completeSplash();
      }
    };

    rafIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isMounted, isPlaybackReady, isExiting, durationMs, totalFrames, completeSplash]);

  // If already unmounted, return null
  if (!isMounted) return null;

  return (
    <aside
      aria-label="Application Loading Screen"
      aria-busy="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#07090E] transition-all duration-300 ease-out select-none ${
        isExiting
          ? "opacity-0 scale-[1.015] pointer-events-none"
          : "opacity-100 scale-100"
      } ${className}`}
      style={{
        willChange: "opacity, transform",
      }}
    >
      {/* Background ambient lighting for depth */}
      <div 
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.12)_0%,rgba(7,9,14,0.95)_70%)]" 
        aria-hidden="true" 
      />

      {/* Main Canvas Frame Container */}
      <div className="relative w-full h-full max-w-[850px] max-h-[90vh] flex items-center justify-center p-4 sm:p-6">
        <canvas
          ref={canvasRef}
          className="w-full h-full max-w-full max-h-full object-contain rounded-2xl shadow-2xl drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          style={{
            imageRendering: "auto",
          }}
        />

        {/* Minimal Initial Buffer Spinner (only shown briefly during cold cache first buffer fetch) */}
        {!isPlaybackReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#07090E]/80 backdrop-blur-sm z-20">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
            {loadProgress > 0 && (
              <span className="mt-4 text-xs font-mono text-blue-400/80 tracking-widest uppercase">
                {loadProgress}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subtle Bottom Skip Button */}
      {showSkipButton && !isExiting && (
        <button
          onClick={handleSkip}
          type="button"
          className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 z-30 px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/40 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-lg group cursor-pointer"
          title="Skip Intro Animation"
        >
          <span>Skip</span>
          <svg
            className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </aside>
  );
}
