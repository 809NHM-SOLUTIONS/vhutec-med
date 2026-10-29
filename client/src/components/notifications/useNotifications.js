import { useCallback, useEffect, useState } from "react";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
} from "../../api/api";
import { io } from "socket.io-client";

export default function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [notificationResult, countResult] = await Promise.all([
        fetchNotifications(20),
        fetchUnreadNotificationCount(),
      ]);

      setNotifications(
        Array.isArray(notificationResult?.data)
          ? notificationResult.data
          : []
      );

      setUnreadCount(Number(countResult?.count) || 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const token = localStorage.getItem("token");
    if (!token) return undefined;

    const socket = io("http://localhost:5000", {
      auth: { token },
    });

    socket.on("notification:new", loadNotifications);

    return () => {
      socket.off("notification:new", loadNotifications);
      socket.disconnect();
    };
  }, [loadNotifications]);

  const markAsRead = useCallback(async (notification) => {
    if (!notification || notification.readAt) return true;

    try {
      await markNotificationAsRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      );

      setUnreadCount((current) => Math.max(0, current - 1));
      return true;
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      setError("Unable to update this notification.");
      return false;
    }
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
  };
}