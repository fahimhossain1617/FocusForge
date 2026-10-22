import { useEffect, useRef, useCallback } from "react";

interface UseSubViewBackOptions {
  active: boolean;
  subViewName: string;
  onBack: () => void;
  page?: string;
  hash?: string;
}

/**
 * useSubViewBack
 * Synchronizes modal, sub-sheet, or sub-view interfaces (e.g. Diary editor, Focus active session,
 * Settings detail, Notes editor, Folder detail) with the browser History API (popstate).
 *
 * Ensures that pressing mobile hardware back, side edge swipe, or clicking on-screen Back button
 * steps back to the parent interface instead of kicking the user to the Dashboard.
 */
export function useSubViewBack({
  active,
  subViewName,
  onBack,
  page,
  hash,
}: UseSubViewBackOptions) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const pushedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (active) {
      // Check if current history state already has this subView to prevent duplicate pushes
      const currentState = window.history.state;
      const alreadyPushed = currentState?.subView === subViewName;

      if (!alreadyPushed) {
        const nextState = {
          ...(typeof currentState === "object" && currentState ? currentState : {}),
          page: page || currentState?.page,
          subView: subViewName,
        };
        const nextUrl = hash || window.location.href;
        try {
          window.history.pushState(nextState, "", nextUrl);
          pushedRef.current = true;
        } catch {}
      } else {
        pushedRef.current = true;
      }

      const handlePop = (e: PopStateEvent) => {
        // If user pressed back and popped off this subView
        if (e.state?.subView !== subViewName) {
          pushedRef.current = false;
          onBackRef.current();
        }
      };

      window.addEventListener("popstate", handlePop);

      return () => {
        window.removeEventListener("popstate", handlePop);
      };
    } else {
      pushedRef.current = false;
    }
  }, [active, subViewName, page, hash]);

  const triggerBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.subView === subViewName) {
      window.history.back();
    } else {
      onBackRef.current();
    }
  }, [subViewName]);

  return { triggerBack };
}
