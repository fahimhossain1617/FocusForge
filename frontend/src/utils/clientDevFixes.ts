"use client";

/**
 * Client-side development error filter for React 19 / Next.js Turbopack.
 * Suppresses false-positive development console errors for inline pre-hydration head scripts
 * (e.g. theme anti-flicker initialization and launch animation gating).
 */
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}
