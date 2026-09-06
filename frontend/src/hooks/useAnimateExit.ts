import { useState, useEffect } from 'react';

interface UseAnimateExitOptions {
  isOpen: boolean;
  durationMs?: number;
}

/**
 * useAnimateExit
 * Keeps an element mounted in the DOM for `durationMs` after `isOpen` becomes false,
 * allowing CSS exit animations to play smoothly before unmounting.
 */
export function useAnimateExit(
  isOpenOrOptions: boolean | UseAnimateExitOptions,
  optionalDurationMs: number = 200
) {
  const isOpen = typeof isOpenOrOptions === 'boolean' ? isOpenOrOptions : isOpenOrOptions.isOpen;
  const durationMs = typeof isOpenOrOptions === 'boolean' ? (optionalDurationMs ?? 200) : (isOpenOrOptions.durationMs ?? 200);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      setShouldRender(true);
      setIsExiting(false);
    } else if (shouldRender) {
      setIsExiting(true);
      timeoutId = setTimeout(() => {
        setShouldRender(false);
        setIsExiting(false);
      }, durationMs);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, durationMs, shouldRender]);

  return {
    shouldRender,
    isExiting,
    stage: isOpen ? ('enter' as const) : isExiting ? ('exit' as const) : ('closed' as const),
  };
}
