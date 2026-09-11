"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { reviewService, ReviewPromptState } from "../services/reviewService";
import { useAuth } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";

// Reusable action throttle to prevent accidental rapid click counting
const recentActionsMap = new Map<string, number>();

export function useReviewPrompt() {
  const { user, isGuest } = useAuth();
  const { isOnline, showToast, state } = useAppContext();

  const [promptState, setPromptState] = useState<ReviewPromptState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ensure prompt only opens once per session
  const sessionShownRef = useRef(false);
  const promptStateRef = useRef<ReviewPromptState | null>(null);
  promptStateRef.current = promptState;

  // Load initial prompt state when authenticated
  useEffect(() => {
    if (!user || isGuest) {
      setPromptState(null);
      return;
    }

    let isMounted = true;
    async function loadState() {
      try {
        const data = await reviewService.fetchReviewState();
        if (isMounted && data) {
          setPromptState(data);
        }
      } catch (err) {
        console.warn("[useReviewPrompt] Failed to load state:", err);
      }
    }

    loadState();
    return () => {
      isMounted = false;
    };
  }, [user, isGuest]);

  // Check eligibility and trigger review modal
  const checkEligibility = useCallback((currentState: ReviewPromptState | null) => {
    if (!currentState) return false;
    if (sessionShownRef.current) return false;
    if (isGuest || !user) return false;
    if (currentState.status === "submitted") return false;

    // Must have reached at least 3 meaningful actions
    if ((currentState.meaningfulActions || 0) < 3) return false;

    // If previously skipped, verify the progressive next_prompt_at interval has elapsed
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
  }, [isGuest, user, state.activeFocusTaskId]);

  /**
   * Reusable tracking mechanism for meaningful feature actions
   */
  const trackMeaningfulAction = useCallback(async (actionType: string) => {
    if (isGuest || !user) return;
    if (promptStateRef.current?.status === "submitted") return;

    // Anti-spam debounce: ignore identical action within 15 seconds
    const now = Date.now();
    const lastTime = recentActionsMap.get(actionType) || 0;
    if (now - lastTime < 15000) {
      return;
    }
    recentActionsMap.set(actionType, now);

    try {
      const res = await reviewService.recordAction();
      if (res.status === "submitted") {
        setPromptState((prev) => prev ? { ...prev, status: "submitted" } : null);
        return;
      }

      const updatedCount = res.count ?? ((promptStateRef.current?.meaningfulActions || 0) + 1);

      setPromptState((prev) => {
        const nextState: ReviewPromptState = prev
          ? { ...prev, meaningfulActions: updatedCount }
          : {
              status: "eligible",
              meaningfulActions: updatedCount,
              skipCount: 0,
            };

        // If eligible now, open modal
        if (checkEligibility(nextState)) {
          sessionShownRef.current = true;
          // Slight natural delay so the action UX completes smoothly
          setTimeout(() => {
            setIsOpen(true);
          }, 800);
        }

        return nextState;
      });
    } catch (err) {
      console.warn("[useReviewPrompt] Failed to record action:", err);
    }
  }, [isGuest, user, checkEligibility]);

  /**
   * User dismisses / skips the review modal
   */
  const skip = useCallback(async () => {
    setIsOpen(false);
    sessionShownRef.current = true;

    try {
      const res = await reviewService.skipReview();
      setPromptState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "skipped",
          meaningfulActions: 0,
          skipCount: prev.skipCount + 1,
          nextPromptAt: res.nextPromptAt || prev.nextPromptAt,
        };
      });
    } catch (err) {
      console.warn("[useReviewPrompt] Skip review notice:", err);
    }
  }, []);

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
      const result = await reviewService.submitReview({
        rating: hasRating ? payload.rating : null,
        comment: hasComment ? payload.comment : null,
      });

      if (result.success) {
        setIsOpen(false);
        sessionShownRef.current = true;
        setPromptState((prev) => prev ? { ...prev, status: "submitted" } : null);

        showToast(
          isBn
            ? "আপনার মতামতের জন্য অসংখ্য ধন্যবাদ! এটি FocusForge-কে আরও উন্নত করতে সাহায্য করবে।"
            : "Thank you for your feedback! It helps us make FocusForge even better.",
          "success"
        );
        return true;
      } else {
        showToast(
          result.error || (isBn ? "রিভিউ জমা দেওয়া সম্ভব হয়নি। পুনরায় চেষ্টা করুন।" : "Failed to submit review. Please try again."),
          "error"
        );
        return false;
      }
    } catch (err: any) {
      showToast(
        err?.message || (isBn ? "রিভিউ জমা দেওয়া সম্ভব হয়নি।" : "Failed to submit review."),
        "error"
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isOnline, state.lang, showToast]);

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
