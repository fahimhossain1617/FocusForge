"use client";

import { useState, useEffect, useCallback } from "react";
import notificationCenterService from "../services/notificationCenterService";
import notificationService from "../services/notificationService";
import { AppNotification } from "../types";

export function useNotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>("default");

  const refreshState = useCallback(() => {
    const list = notificationCenterService.getNotifications();
    setNotifications(list);
    setUnreadCount(list.filter((n) => !n.read).length);
  }, []);

  useEffect(() => {
    refreshState();
    const unsubscribe = notificationCenterService.subscribe(() => {
      refreshState();
    });

    if (notificationService.isSupported()) {
      setBrowserPermission(notificationService.getPermission());
    }

    return () => {
      unsubscribe();
    };
  }, [refreshState]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const markAsRead = useCallback((id: string) => {
    notificationCenterService.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationCenterService.markAllAsRead();
  }, []);

  const dismissNotification = useCallback((id: string) => {
    notificationCenterService.dismissNotification(id);
  }, []);

  const clearAll = useCallback(() => {
    notificationCenterService.clearAll();
  }, []);

  const addNotification = useCallback(
    (
      payload: Omit<AppNotification, "id" | "timestamp" | "read"> & {
        id?: string;
        timestamp?: string;
        read?: boolean;
      }
    ) => {
      return notificationCenterService.addNotification(payload);
    },
    []
  );

  const requestBrowserPermission = useCallback(async () => {
    const result = await notificationService.requestPermission();
    setBrowserPermission(result);
    return result;
  }, []);

  return {
    notifications,
    unreadCount,
    hasUnread: unreadCount > 0,
    isOpen,
    setIsOpen,
    toggleOpen,
    open,
    close,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAll,
    addNotification,
    browserPermission,
    requestBrowserPermission,
  };
}
