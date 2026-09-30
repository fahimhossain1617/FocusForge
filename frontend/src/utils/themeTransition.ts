import React from "react";
import { flushSync } from "react-dom";

/**
 * Executes a smooth, premium circular clip-path ripple transition when toggling theme.
 * Expands a circle from the click event's coordinates to seamlessly reveal the new theme.
 */
export function toggleThemeWithCircularTransition(
  e: React.MouseEvent<any> | MouseEvent | any,
  applyChange: () => void
) {
  if (
    typeof document === "undefined" ||
    !(document as any).startViewTransition ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    applyChange();
    return;
  }

  const x = e ? (e.clientX || e.pageX || window.innerWidth / 2) : window.innerWidth / 2;
  const y = e ? (e.clientY || e.pageY || window.innerHeight / 2) : window.innerHeight / 2;

  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  const transition = (document as any).startViewTransition(() => {
    flushSync(() => {
      applyChange();
    });
  });

  transition.ready.then(() => {
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${endRadius}px at ${x}px ${y}px)`,
    ];

    document.documentElement.animate(
      {
        clipPath: clipPath,
      },
      {
        duration: 520,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  });
}
