"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseFocusTimerOptions {
  onWorkComplete?: () => void;
  onBreakComplete?: () => void;
}

export function useFocusTimer(options?: UseFocusTimerOptions) {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isWork, setIsWork] = useState(true);
  const [workMinutes, setWorkMinutes] = useState(0);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    if (remaining <= 0) {
      const secs = workMinutes * 60;
      setRemaining(secs);
      setTotal(secs);
      setIsWork(true);
    }
    setIsRunning(true);

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          // Handle completion
          if (isWork) {
            optionsRef.current?.onWorkComplete?.();
          } else {
            optionsRef.current?.onBreakComplete?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isRunning, remaining, workMinutes, isWork, clearTimer]);

  const pause = useCallback(() => {
    clearTimer();
    setIsRunning(false);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    const secs = workMinutes * 60;
    setRemaining(secs);
    setTotal(secs);
    setIsWork(true);
  }, [clearTimer, workMinutes]);

  const switchToBreak = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    const secs = breakMinutes * 60;
    setRemaining(secs);
    setTotal(secs);
    setIsWork(false);
  }, [clearTimer, breakMinutes]);

  const switchToWork = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    const secs = workMinutes * 60;
    setRemaining(secs);
    setTotal(secs);
    setIsWork(true);
  }, [clearTimer, workMinutes]);

  const setPreset = useCallback((minutes: number) => {
    clearTimer();
    setIsRunning(false);
    setWorkMinutes(minutes);
    const secs = minutes * 60;
    setRemaining(secs);
    setTotal(secs);
    setIsWork(true);
  }, [clearTimer]);

  // Derived values
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progress = total > 0 ? 1 - remaining / total : 0;
  const elapsedMinutes = total > 0 ? Math.round((total - remaining) / 60) : 0;

  return {
    display,
    minutes,
    seconds,
    remaining,
    total,
    progress,
    elapsedMinutes,
    isRunning,
    isWork,
    workMinutes,
    breakMinutes,
    start,
    pause,
    reset,
    switchToBreak,
    switchToWork,
    setPreset,
    setWorkMinutes,
    setBreakMinutes,
  };
}
