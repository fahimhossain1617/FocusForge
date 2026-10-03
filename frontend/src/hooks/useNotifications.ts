"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../context/AppContext";
import notificationService from "../services/notificationService";
import { NotificationPreferences } from "../types";

export function useNotifications() {
  const { state, updateState, showToast } = useAppContext();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Read current permission state on mount
  useEffect(() => {
    const supported = notificationService.isSupported();
    setIsSupported(supported);
    if (supported) {
      setPermission(notificationService.getPermission());
    }
  }, []);

  /**
   * Explicit user-triggered permission request.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      showToast("Notifications are not supported in this browser", "error");
      return false;
    }

    const result = await notificationService.requestPermission();
    setPermission(result);

    if (result === "granted") {
      showToast("Notifications enabled successfully!", "success");
      // Enable master switch in state
      updateState({
        notifPreferences: {
          ...state.notifPreferences,
          enabled: true,
        },
      });
      return true;
    } else if (result === "denied") {
      showToast(
        "Notification permission was denied. You can enable it anytime in your browser settings.",
        "info"
      );
      return false;
    }
    return false;
  }, [isSupported, state.notifPreferences, updateState, showToast]);

  /**
   * Update notification settings.
   */
  const updatePreferences = useCallback(
    (updates: Partial<NotificationPreferences>) => {
      updateState({
        notifPreferences: {
          ...state.notifPreferences,
          ...updates,
        },
      });
    },
    [state.notifPreferences, updateState]
  );

  /**
   * Trigger a test notification with sound.
   */
  const sendTestNotification = useCallback(async () => {
    if (permission !== "granted") {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    const isBn = state.lang === "bn";
    const success = await notificationService.send({
      id: `test_notif_${Date.now()}`,
      category: "system",
      title: isBn ? "FocusForge নোটিফিকেশন সক্রিয়" : "FocusForge Notification Active",
      body: isBn
        ? "আপনার নোটিফিকেশন সিস্টেম সম্পূর্ণ সক্রিয়। সময়মতো আপনার প্ল্যান ও টাস্ক রিমাইন্ডার পাবেন।"
        : "You will receive your Daily Morning Plan and scheduled task reminders on time!",
      tag: "focusforge-test-notification",
      actionRoute: "today",
      actions: [
        {
          action: "view_today",
          title: isBn ? "ড্যাশবোর্ড খুলুন" : "Open Dashboard",
          label: isBn ? "ড্যাশবোর্ড খুলুন" : "Open Dashboard",
          onClick: () => {
            updateState({ activePage: "today" });
          },
          variant: "primary",
        },
      ],
    });

    if (success) {
      showToast("Test notification sent!", "success");
    } else {
      showToast("Could not display notification. Check browser settings.", "error");
    }
    return success;
  }, [permission, requestPermission, showToast]);

  return {
    isSupported,
    permission,
    isGranted: permission === "granted",
    preferences: state.notifPreferences,
    requestPermission,
    updatePreferences,
    sendTestNotification,
  };
}

export default useNotifications;
