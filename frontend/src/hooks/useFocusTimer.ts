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
  const targetEndTimeRef = useRef<number>(0);
  const hasCompletedRef = useRef<boolean>(false);
  const isWorkRef = useRef<boolean>(true);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    isWorkRef.current = isWork;
  }, [isWork]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  const tick = useCallback(() => {
    const now = Date.now();
    const remainingMs = targetEndTimeRef.current - now;
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

    setRemaining(remainingSec);

    if (remainingSec <= 0) {
      clearTimer();
      setIsRunning(false);

      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        const currentIsWork = isWorkRef.current;
        setTimeout(() => {
          if (currentIsWork) {
            optionsRef.current?.onWorkComplete?.();
          } else {
            optionsRef.current?.onBreakComplete?.();
          }
        }, 0);
      }
    }
  }, [clearTimer]);

  const start = useCallback(() => {
    if (isRunning) return;

    let currentSec = remaining;
    if (currentSec <= 0) {
      const mins = isWorkRef.current ? workMinutes : breakMinutes;
      currentSec = mins * 60;
      setRemaining(currentSec);
      setTotal(currentSec);
    }

    targetEndTimeRef.current = Date.now() + currentSec * 1000;
    hasCompletedRef.current = false;
    setIsRunning(true);

    clearTimer();
    intervalRef.current = setInterval(tick, 250);
  }, [isRunning, remaining, workMinutes, breakMinutes, tick, clearTimer]);

  const pause = useCallback(() => {
    if (isRunning && targetEndTimeRef.current > 0) {
      const remainingSec = Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000));
      setRemaining(remainingSec);
    }
    clearTimer();
    setIsRunning(false);
  }, [isRunning, clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    hasCompletedRef.current = false;
    const secs = workMinutes * 60;
    setRemaining(secs);
    setTotal(secs);
    setIsWork(true);
    isWorkRef.current = true;
  }, [clearTimer, workMinutes]);

  const startBreak = useCallback((minutes: number) => {
    clearTimer();
    const secs = minutes * 60;
    setBreakMinutes(minutes);
    setIsWork(false);
    isWorkRef.current = false;
    setTotal(secs);
    setRemaining(secs);
    hasCompletedRef.current = false;
    targetEndTimeRef.current = Date.now() + secs * 1000;
    setIsRunning(true);

    intervalRef.current = setInterval(tick, 250);
  }, [clearTimer, tick]);

  const switchToBreak = useCallback((minutes: number = breakMinutes) => {
    clearTimer();
    setIsRunning(false);
    hasCompletedRef.current = false;
    const secs = minutes * 60;
    setBreakMinutes(minutes);
    setRemaining(secs);
    setTotal(secs);
    setIsWork(false);
    isWorkRef.current = false;
  }, [clearTimer, breakMinutes]);

  const switchToWork = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    hasCompletedRef.current = false;
    const secs = workMinutes * 60;
    setRemaining(secs);
    setTotal(secs);
    setIsWork(true);
    isWorkRef.current = true;
  }, [clearTimer, workMinutes]);

  const skipBreak = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    hasCompletedRef.current = false;
    setIsWork(true);
    isWorkRef.current = true;
    setRemaining(0);
    setTotal(0);
  }, [clearTimer]);

  const setPreset = useCallback((minutes: number) => {
    clearTimer();
    setIsRunning(false);
    hasCompletedRef.current = false;
    setWorkMinutes(minutes);
    const secs = minutes * 60;
    setRemaining(secs);
    setTotal(secs);
    setIsWork(true);
    isWorkRef.current = true;
  }, [clearTimer]);

  // Derived values
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const elapsedSeconds = total > 0 ? Math.max(0, total - remaining) : 0;
  const elapsedMinutes = total > 0
    ? (elapsedSeconds >= 30 ? Math.max(1, Math.floor(elapsedSeconds / 60)) : 0)
    : 0;
  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0;

  return {
    remaining,
    total,
    isRunning,
    isWork,
    workMinutes,
    breakMinutes,
    minutes,
    seconds,
    display,
    progress,
    elapsedMinutes,
    start,
    pause,
    reset,
    startBreak,
    switchToBreak,
    switchToWork,
    skipBreak,
    setPreset,
  };
}
