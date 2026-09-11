"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { reviewService, ReviewPromptState } from "../services/reviewService";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";

const LOCAL_STORAGE_KEY = "focusforge_review_prompt_state";

function getLocalPromptState(): ReviewPromptState {
  if (typeof window === "undefined") {
    return { status: "eligible", meaningfulActions: 0, skipCount: 0 };
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  return { status: "eligible", meaningfulActions: 0, skipCount: 0 };
}

function saveLocalPromptState(st: ReviewPromptState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(st));
  } catch {}
}

// Reusable action throttle to prevent accidental rapid double clicks (1.5s)
const recentActionsMap = new Map<string, number>();

export function useReviewPrompt() {
  const { user, isGuest } = useAuth();
  const { isOnline, showToast, state } = useAppContext();

  const [promptState, setPromptState] = useState<ReviewPromptState>(() => getLocalPromptState());
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ensure prompt only opens once per session
  const sessionShownRef = useRef(false);
  const promptStateRef = useRef<ReviewPromptState>(promptState);
  promptStateRef.current = promptState;

  // Load initial prompt state from local storage and sync with Supabase if authenticated
  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      // 1. Always load local state first
      const local = getLocalPromptState();
      if (isMounted) {
        setPromptState(local);
      }

      // 2. If logged-in user, fetch and merge cloud state
      if (user && !isGuest) {
        try {
          const cloudData = await reviewService.fetchReviewState();
          if (isMounted && cloudData) {
            // Keep the maximum meaningfulActions or submitted status
            const merged: ReviewPromptState = {
              status: cloudData.status === "submitted" || local.status === "submitted" ? "submitted" : (cloudData.status || local.status),
              meaningfulActions: Math.max(cloudData.meaningfulActions || 0, local.meaningfulActions || 0),
              skipCount: Math.max(cloudData.skipCount || 0, local.skipCount || 0),
              lastShownAt: cloudData.lastShownAt || local.lastShownAt,
              nextPromptAt: cloudData.nextPromptAt || local.nextPromptAt,
              submittedAt: cloudData.submittedAt || local.submittedAt,
            };
            setPromptState(merged);
            saveLocalPromptState(merged);
          }
        } catch (err) {
          console.warn("[useReviewPrompt] Failed to load cloud state:", err);
        }
      }
    }

    loadState();
    return () => {
      isMounted = false;
    };
  }, [user, isGuest]);

  // Check eligibility: First time trigger after 2-3 feature clicks/checks/saves, then progressive retry interval
  const checkEligibility = useCallback((currentState: ReviewPromptState | null) => {
    if (!currentState) return false;
    if (sessionShownRef.current) return false;
    if (currentState.status === "submitted") return false;

    // Must have reached at least 2 feature clicks / saves / checks
    if ((currentState.meaningfulActions || 0) < 2) return false;

    // If previously skipped, verify the progressive next_prompt_at interval (2-3 days etc.) has elapsed
    if (currentState.status === "skipped" && currentState.nextPromptAt) {
      const scheduledTime = new Date(currentState.nextPromptAt).getTime();
      if (Date.now() < scheduledTime) {
        return false;
      }
    }

    // Do not interrupt active focus timer session
    if (state.activeFocusTaskId) {
      return false;
    }

    return true;
  }, [state.activeFocusTaskId]);

  /**
   * Reusable tracking mechanism for meaningful feature actions
   */
  const trackMeaningfulAction = useCallback(async (actionType: string) => {
    if (promptStateRef.current?.status === "submitted") return;

    // Anti-spam debounce: ignore identical action within 1.5 seconds
    const now = Date.now();
    const lastTime = recentActionsMap.get(actionType) || 0;
    if (now - lastTime < 1500) {
      return;
    }
    recentActionsMap.set(actionType, now);

    const currentCount = promptStateRef.current?.meaningfulActions || 0;
    const updatedCount = currentCount + 1;

    setPromptState((prev) => {
      const nextState: ReviewPromptState = {
        status: prev?.status === "skipped" ? "skipped" : "eligible",
        meaningfulActions: updatedCount,
        skipCount: prev?.skipCount || 0,
        lastShownAt: prev?.lastShownAt,
        nextPromptAt: prev?.nextPromptAt,
        submittedAt: prev?.submittedAt,
      };

      saveLocalPromptState(nextState);

      // If eligible now, open modal with a slight natural delay
      if (checkEligibility(nextState)) {
        sessionShownRef.current = true;
        setTimeout(() => {
          setIsOpen(true);
        }, 700);
      }

      return nextState;
    });

    // If user is authenticated, sync action to cloud
    if (user && !isGuest) {
      reviewService.recordAction().catch(() => {});
    }
  }, [user, isGuest, checkEligibility]);

  // Listen to global app actions dispatched across the application
  useEffect(() => {
    const handleAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      trackMeaningfulAction(customEvent.detail || "generic");
    };

    window.addEventListener("focusforge:action", handleAction);
    return () => {
      window.removeEventListener("focusforge:action", handleAction);
    };
  }, [trackMeaningfulAction]);

  /**
   * User dismisses / skips the review modal (Progressive retry after 2-3 days)
   */
  const skip = useCallback(async () => {
    setIsOpen(false);
    sessionShownRef.current = true;

    const currentSkipCount = (promptStateRef.current?.skipCount || 0) + 1;
    let delayHours = 36; // 1st skip: ~1.5 - 2 days (36h)
    if (currentSkipCount === 1) delayHours = 36;
    else if (currentSkipCount === 2) delayHours = 84; // 2nd skip: ~3.5 days (84h)
    else if (currentSkipCount === 3) delayHours = 24 * 7; // 3rd skip: 7 days
    else if (currentSkipCount === 4) delayHours = 24 * 14;
    else delayHours = 24 * 30;

    const nextPromptIso = new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString();
    const nowIso = new Date().toISOString();

    const updatedState: ReviewPromptState = {
      status: "skipped",
      meaningfulActions: 0,
      skipCount: currentSkipCount,
      lastShownAt: nowIso,
      nextPromptAt: nextPromptIso,
    };

    saveLocalPromptState(updatedState);
    setPromptState(updatedState);

    if (user && !isGuest) {
      reviewService.skipReview().catch(() => {});
    }
  }, [user, isGuest]);

  /**
   * User submits rating and/or comment
   */
  const submit = useCallback(async (payload: { rating?: number | null; comment?: string | null }) => {
    const isBn = state.lang === "bn";

    if (!isOnline) {
      showToast(
        isBn
          ? "আপনি বর্তমানে অফলাইনে আছেন। রিভিউ জমা দিতে ইন্টারনেট সংযোগ প্রয়োজন।"
          : "You are currently offline. Please connect to the internet to submit your review.",
        "error"
      );
      return false;
    }

    const hasRating = typeof payload.rating === "number" && payload.rating >= 1 && payload.rating <= 5;
    const hasComment = typeof payload.comment === "string" && payload.comment.trim().length > 0;

    if (!hasRating && !hasComment) {
      showToast(
        isBn ? "অনুগ্রহ করে একটি স্টার রেটিং দিন অথবা মতামত লিখুন।" : "Please select a star rating or write a comment.",
        "error"
      );
      return false;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const submittedState: ReviewPromptState = {
        status: "submitted",
        meaningfulActions: 0,
        skipCount: promptStateRef.current?.skipCount || 0,
        submittedAt: nowIso,
      };

      saveLocalPromptState(submittedState);
      setPromptState(submittedState);
      setIsOpen(false);
      sessionShownRef.current = true;

      // If user is authenticated, submit to backend / Supabase
      if (user && !isGuest) {
        await reviewService.submitReview({
          rating: hasRating ? payload.rating : null,
          comment: hasComment ? payload.comment : null,
        });
      }

      showToast(
        isBn
          ? "আপনার মতামতের জন্য অসংখ্য ধন্যবাদ! এটি FocusForge-কে আরও উন্নত করতে সাহায্য করবে।"
          : "Thank you for your feedback! It helps us make FocusForge even better.",
        "success"
      );
      return true;
    } catch (err: any) {
      showToast(
        err?.message || (isBn ? "রিভিউ জমা দেওয়া সম্ভব হয়নি।" : "Failed to submit review."),
        "error"
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [state.lang, isOnline, showToast, user, isGuest]);

  return {
    isOpen,
    isSubmitting,
    skip,
    submit,
    close: skip,
    trackMeaningfulAction,
    isSubmitted: promptState?.status === "submitted",
  };
}
