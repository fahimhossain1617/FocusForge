"use client";

/**
 * Client-side unhandled rejection & runtime crash resilience.
 * - Suppresses benign browser rejections (user cancelled native share, clipboard focus lost).
 * - Intercepts one-shot ChunkLoadErrors caused by fresh Vercel deployments and gracefully refreshes.
 */
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const name = reason?.name;
    const message = typeof reason === "string" ? reason : reason?.message || "";

    // Suppress benign user-cancelled operations (e.g. native share cancel, clipboard blur)
    if (name === "AbortError" || message.includes("Share canceled") || message.includes("aborted")) {
      event.preventDefault();
      return;
    }
    if (name === "NotAllowedError" && (message.includes("clipboard") || message.includes("play()"))) {
      event.preventDefault();
      return;
    }

    // Intercept ChunkLoadErrors before they trigger a fatal crash
    if (
      name === "ChunkLoadError" ||
      message.includes("Loading chunk") ||
      message.includes("dynamically imported module")
    ) {
      console.warn("[GlobalRecovery] Intercepted chunk load failure:", message);
      let attempted: string | null = null;
      try {
        attempted = sessionStorage.getItem("ff_chunk_recovery_attempted");
      } catch {}

      if (!attempted) {
        try {
          sessionStorage.setItem("ff_chunk_recovery_attempted", "true");
        } catch {}

        event.preventDefault();
        if (typeof caches !== "undefined") {
          caches
            .keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .catch(() => {})
            .finally(() => {
              window.location.reload();
            });
        } else {
          window.location.reload();
        }
      }
    }
  });
}
