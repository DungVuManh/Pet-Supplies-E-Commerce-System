"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import {
  fetchCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
} from "../api";
import type { CustomerNotificationItem } from "../types";

export function useCustomerNotifications() {
  const { user, status } = useAuth();
  const [notifications, setNotifications] = useState<CustomerNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user || status !== "ready") {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchCustomerNotifications({ limit: 10 });
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Bỏ qua lỗi kết nối nền
    } finally {
      setIsLoading(false);
    }
  }, [user, status]);

  useEffect(() => {
    loadNotifications();

    const handleFocus = () => {
      loadNotifications();
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await markCustomerNotificationRead(id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignored
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllCustomerNotificationsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch {
      // Ignored
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}
