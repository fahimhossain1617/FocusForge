"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

const MARK_SVG = `
<svg viewBox="360 320 520 630" style="width:100%;height:100%;overflow:visible;">
  <g fill="#061f52">
    <path id="p1" d="M390 632V548C390 440 470 366 580 366H750C810 366 850 350 870 332C868 400 830 465 740 468H585C548 468 522 495 522 530V632Z"/>
    <path id="p2" d="M853 524L856 600C858 630 845 648 832 656L500 925C490 932 460 936 417 938L497 862C560 848 595 800 598 740C598 715 592 700 585 692C650 650 760 570 853 524Z"/>
  </g>
  <g id="p3" style="transform-origin:473px 745px">
    <circle cx="473" cy="745" r="112" fill="#fff"/>
    <circle cx="473" cy="745" r="97" fill="#fff" stroke="#061f52" stroke-width="15"/>
    <g id="p4" style="transform-origin:473px 745px" stroke="#061f52" stroke-width="5">
      <path d="M473 662v16M473 812v16M390 745h16M540 745h16"/>
    </g>
    <circle id="p5" cx="473" cy="745" r="45" fill="#061f52" style="transform-origin:473px 745px"/>
    <circle cx="473" cy="745" r="14" fill="#fff"/>
  </g>
</svg>
`;

const E = "cubic-bezier(.16,1,.3,1)";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const an = (
  el: Element | null,
  keyFrames: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions
): Promise<Animation | void> => {
  if (!el || typeof el.animate !== "function") return Promise.resolve();
  try {
    const animation = el.animate(keyFrames, { fill: "both", easing: E, ...options });
    return animation.finished.catch(() => {});
  } catch {
    return Promise.resolve();
  }
};

export interface LaunchSplashProps {
  onComplete?: () => void;
}

export default function LaunchSplash({ onComplete }: LaunchSplashProps) {
  const [shouldRender, setShouldRender] = useState<boolean>(false);
  const splashRef = useRef<HTMLDivElement | null>(null);
  const logoWrapRef = useRef<HTMLDivElement | null>(null);
  const wordRef = useRef<HTMLDivElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const hasFinishedRef = useRef<boolean>(false);

  // Measure destination slot (Sidebar on desktop, MobileHeader on mobile)
  const getTargetRect = useCallback((): DOMRect => {
    if (typeof window === "undefined") {
      return new DOMRect(22, 18, 32, 32);
    }
    const slots = Array.from(document.querySelectorAll<HTMLElement>("[data-ff-logo-slot]"));
    // Find slot that is displayed in the current layout
    for (const slot of slots) {
      if (slot.offsetParent !== null) {
        const r = slot.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          return r;
        }
      }
    }
    // Fallback based on viewport
    const isMobile = window.innerWidth < 768;
    return new DOMRect(
      isMobile ? 16 : 22,
      isMobile ? 14 : 18,
      isMobile ? 28 : 32,
      isMobile ? 28 : 32
    );
  }, []);

  // Reveal application and cleanup splash DOM
  const finishAndReveal = useCallback(() => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    try {
      document.documentElement.classList.remove("ff-launch-active", "ff-launch-mounted");
    } catch {}

    const slots = document.querySelectorAll<HTMLElement>("[data-ff-logo-slot]");
    slots.forEach((slot) => {
      slot.style.visibility = "visible";
      slot.classList.add("settled");
    });

    setShouldRender(false);
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if launch animation was marked active by head script
    const isGatedActive = document.documentElement.classList.contains("ff-launch-active");
    if (!isGatedActive) {
      // Not a fresh entry - ensure normal visibility and exit
      const slots = document.querySelectorAll<HTMLElement>("[data-ff-logo-slot]");
      slots.forEach((slot) => {
        slot.style.visibility = "visible";
        slot.classList.add("settled");
      });
      return;
    }

    try {
      document.documentElement.classList.add("ff-launch-mounted");
    } catch {}

    setShouldRender(true);

    // Safety timeout: Never leave user stuck on white if anything stalls
    const safetyTimer = setTimeout(() => {
      if (!hasFinishedRef.current) {
        finishAndReveal();
      }
    }, 4500);

    return () => clearTimeout(safetyTimer);
  }, [finishAndReveal]);

  // Main animation sequence
  useEffect(() => {
    if (!shouldRender || isPlayingRef.current) return;
    isPlayingRef.current = true;

    const playSequence = async () => {
      const sp = splashRef.current;
      const lw = logoWrapRef.current;
      const word = wordRef.current;

      if (!sp || !lw || !word) {
        finishAndReveal();
        return;
      }

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // 1. Initial pure white frame setup
      sp.style.display = "grid";
      sp.style.opacity = "1";

      await wait(reduce ? 10 : 350);

      // 2. Center logo assembly
      lw.innerHTML = MARK_SVG;
      lw.style.display = "block";
      word.style.display = "block";
      lw.style.transform = "translate(-50%, -56%)";
      lw.style.opacity = "1";

      const P = (id: string) => lw.querySelector<SVGElement>("#" + id);

      if (!reduce) {
        // Part 1: Top "F" hook slides down from above
        an(
          P("p1"),
          [{ transform: "translateY(-90px)", opacity: 0 }, { transform: "none", opacity: 1 }],
          { duration: 900 }
        );

        // Part 2: Diagonal blade slides in from bottom-right (140ms delay)
        an(
          P("p2"),
          [{ transform: "translate(70px, 90px)", opacity: 0 }, { transform: "none", opacity: 1 }],
          { duration: 900, delay: 140 }
        );

        // Part 3: Target ring scales in with overshoot (520ms delay)
        an(
          P("p3"),
          [
            { transform: "scale(0)", opacity: 0 },
            { transform: "scale(1.12)", opacity: 1, offset: 0.65 },
            { transform: "scale(1)", opacity: 1 },
          ],
          { duration: 900, delay: 520, easing: "cubic-bezier(.34,1.3,.64,1)" }
        );

        // Part 4: Crosshair ticks rotate and settle lock-on (800ms delay)
        an(
          P("p4"),
          [
            { transform: "rotate(-120deg) scale(1.35)", opacity: 0 },
            { transform: "rotate(0) scale(1)", opacity: 1 },
          ],
          { duration: 1000, delay: 800 }
        );

        // Part 5: Center dot soft pulse (1500ms delay)
        an(
          P("p5"),
          [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
          { duration: 500, delay: 1500, easing: "ease-in-out" }
        );

        // Part 6: Wordmark "FOCUS FORGE" fades in below (1300ms delay)
        an(
          word,
          [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
          { duration: 700, delay: 1300 }
        );

        // Hold assembled state
        await wait(2300);
      }

      // 3. Logo flight to destination slot
      const t = getTargetRect();
      const r = lw.getBoundingClientRect();
      const s = t.width / r.width;
      const dx = t.left - r.left;
      const dy = t.top - r.top;

      lw.style.left = `${r.left}px`;
      lw.style.top = `${r.top}px`;
      lw.style.transform = "none";

      const D = reduce ? 10 : 900;

      // Wordmark fades out
      an(word, [{ opacity: 1 }, { opacity: 0 }], { duration: D * 0.4 });

      // White overlay fades out to reveal dashboard
      an(sp, [{ opacity: 1 }, { opacity: 0 }], { duration: D * 0.9, delay: D * 0.15 });

      // Coordinated fade-in for application UI underneath
      const appShell = document.getElementById("app-shell");
      if (appShell) {
        an(appShell, [{ opacity: 0 }, { opacity: 1 }], { duration: D * 0.8, delay: D * 0.15 });
      }

      // Flying logo lands with exact cubic-bezier ease
      await an(
        lw,
        [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${s})` }],
        { duration: D, easing: "cubic-bezier(.65,0,.2,1)" }
      );

      // Reveal destination slots with smooth 600ms crossfade
      const slots = document.querySelectorAll<HTMLElement>("[data-ff-logo-slot]");
      slots.forEach((slot) => {
        slot.style.visibility = "visible";
        slot.classList.add("settled");
        an(slot, [{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
      });

      // Hide splash layer & logo elements
      lw.style.display = "none";
      sp.style.display = "none";
      word.style.display = "none";

      // Stagger dashboard cards entrance (translateY 16px -> 0, 90ms apart)
      const cards = document.querySelectorAll<HTMLElement>("main .app-card, main .rounded-2xl, main .rounded-xl");
      cards.forEach((card, i) => {
        an(
          card,
          [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }],
          { duration: 700, delay: i * 90 }
        );
      });

      await wait(300);
      finishAndReveal();
    };

    playSequence();
  }, [shouldRender, getTargetRect, finishAndReveal]);

  if (!shouldRender) return null;

  return (
    <div
      id="ff-launch-root"
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99991,
        pointerEvents: "none",
      }}
    >
      {/* 1. Pure White Full-Screen Background Layer */}
      <div
        ref={splashRef}
        id="splash"
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100dvh",
          backgroundColor: "#FFFFFF",
          zIndex: 99991,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      />

      {/* 2. Assembling & Flying Logo */}
      <div
        ref={logoWrapRef}
        id="logoWrap"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          width: "min(40vmin, 220px)",
          aspectRatio: "520 / 630",
          transform: "translate(-50%, -56%)",
          zIndex: 99992,
          transformOrigin: "0 0",
          display: "none",
        }}
      />

      {/* 3. Wordmark */}
      <div
        ref={wordRef}
        id="word"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          top: "calc(50% + min(24vmin, 130px))",
          textAlign: "center",
          zIndex: 99992,
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontWeight: 600,
          letterSpacing: "0.32em",
          fontSize: "clamp(12px, 2.6vmin, 15px)",
          color: "#061F52",
          opacity: 0,
          display: "none",
          paddingLeft: "0.32em",
          userSelect: "none",
        }}
      >
        FOCUS FORGE
      </div>
    </div>
  );
}
