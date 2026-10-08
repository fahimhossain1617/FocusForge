"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppContext } from "../context/AppContext";
import notificationService from "../services/notificationService";
import notificationPromptService from "../services/notificationPromptService";

export function useNotificationPermissionPrompt() {
  const { state, updateState, showToast } = useAppContext();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isRequestingRef = useRef(false);

  // Check if browser already has permission
  const checkAndTrigger = useCallback((actionType?: string, force: boolean = false) => {
    // If active focus timer is running or onboarding is active, don't interrupt
    if (state.activeFocusTaskId) return;

    if (force) {
      if (notificationPromptService.isEligibleToShow(true)) {
        setIsOpen(true);
      }
      return;
    }

    if (actionType) {
      const isEligible = notificationPromptService.recordAction(actionType);
      if (isEligible) {
        setIsOpen(true);
      }
    }
  }, [state.activeFocusTaskId]);

  useEffect(() => {
    const handleAction = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const actionType = customEvent.detail || "generic";
      checkAndTrigger(actionType);
    };

    const handleDirectPrompt = () => {
      checkAndTrigger(undefined, true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("focusforge:action" as any, handleAction);
      window.addEventListener("focusforge:check-notification-prompt" as any, handleDirectPrompt);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focusforge:action" as any, handleAction);
        window.removeEventListener("focusforge:check-notification-prompt" as any, handleDirectPrompt);
      }
    };
  }, [checkAndTrigger]);

  const handleEnable = useCallback(async () => {
    if (isRequestingRef.current) return;
    isRequestingRef.current = true;

    try {
      notificationPromptService.markPromptShown();
      const result = await notificationService.requestPermission();

      if (result === "granted") {
        notificationPromptService.markPermissionGranted();
        updateState({
          notifPreferences: {
            ...state.notifPreferences,
            enabled: true,
          },
        });
        showToast(
          state.lang === "bn"
            ? "নোটিফিকেশন সক্রিয় করা হয়েছে!"
            : "Notifications enabled successfully!",
          "success"
        );
      } else if (result === "denied") {
        showToast(
          state.lang === "bn"
            ? "নোটিফিকেশন অনুমতি বাতিল করা হয়েছে। ব্রাউজার সেটিংসে গিয়ে যেকোনো সময় চালু করতে পারবেন।"
            : "Notification permission was denied. You can enable it anytime in browser settings.",
          "info"
        );
      }
    } catch {
      // Ignored
    } finally {
      isRequestingRef.current = false;
      setIsOpen(false);
    }
  }, [state.notifPreferences, state.lang, updateState, showToast]);

  const handleLater = useCallback(() => {
    notificationPromptService.markPromptShown();
    setIsOpen(false);
  }, []);

  const triggerManually = useCallback(() => {
    setIsOpen(true);
  }, []);

  const resetForTesting = useCallback(() => {
    notificationPromptService.resetForTesting();
    setIsOpen(true);
  }, []);

  return {
    isOpen,
    handleEnable,
    handleLater,
    triggerManually,
    resetForTesting,
  };
}

export default useNotificationPermissionPrompt;
