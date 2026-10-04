import React from "react";
import { flushSync } from "react-dom";

/**
 * Executes a smooth, snappy circular clip-path ripple transition when toggling theme.
 * Synchronously toggles the root DOM classes and metadata to eliminate staggered repaints.
 */
export function toggleThemeWithCircularTransition(
  e: React.MouseEvent<any> | MouseEvent | any,
  applyChange: () => void,
  explicitTargetMode?: "dark" | "light"
) {
  if (typeof document === "undefined") {
    applyChange();
    return;
  }

  const root = document.documentElement;
  const currentIsLight = root.classList.contains("light") || root.dataset.theme === "light";
  const nextIsLight = explicitTargetMode ? explicitTargetMode === "light" : !currentIsLight;

  const updateMetaTheme = () => {
    const themeHex = nextIsLight ? "#F3F7FC" : "#090c19";
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    metaTags.forEach((tag) => tag.setAttribute("content", themeHex));
    const ffTheme = document.getElementById("ff-theme-color");
    if (ffTheme) ffTheme.setAttribute("content", themeHex);
  };

  const syncDomTheme = () => {
    root.dataset.theme = nextIsLight ? "light" : "dark";
    root.classList.toggle("dark", !nextIsLight);
    root.classList.toggle("light", nextIsLight);
    root.style.colorScheme = nextIsLight ? "light" : "dark";
    try {
      localStorage.setItem("focusforge_theme", nextIsLight ? "light" : "dark");
    } catch {}
    applyChange();
  };

  if (
    !(document as any).startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    syncDomTheme();
    updateMetaTheme();
    return;
  }

  const x = e ? (e.clientX || e.pageX || window.innerWidth / 2) : window.innerWidth / 2;
  const y = e ? (e.clientY || e.pageY || window.innerHeight / 2) : window.innerHeight / 2;

  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  try {
    const transition = (document as any).startViewTransition(() => {
      flushSync(() => {
        syncDomTheme();
      });
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      const anim = document.documentElement.animate(
        {
          clipPath: clipPath,
        },
        {
          duration: 280,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      );

      // Synchronize status bar theme-color exactly halfway through the ripple
      setTimeout(() => {
        updateMetaTheme();
      }, 140);

      anim.finished.then(() => {
        updateMetaTheme();
      }).catch(() => {
        updateMetaTheme();
      });
    }).catch(() => {
      updateMetaTheme();
    });

    transition.finished.then(() => {
      updateMetaTheme();
    }).catch(() => {
      updateMetaTheme();
    });
  } catch {
    syncDomTheme();
    updateMetaTheme();
  }
}

