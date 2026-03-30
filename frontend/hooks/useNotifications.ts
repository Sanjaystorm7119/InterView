"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  type: string;
  candidate_name: string;
  job_position: string;
  interview_id: string;
  timestamp: string;
  read: boolean;
}

export function useNotifications(token: string | null) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const esRef = useRef<EventSource | null>(null);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const url = `${apiUrl}/api/notifications/stream?token=${encodeURIComponent(token)}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") return; // handshake

        if (data.type === "interview_completed") {
          const notification: AppNotification = {
            id: `${data.interview_id}-${data.timestamp}`,
            type: data.type,
            candidate_name: data.candidate_name,
            job_position: data.job_position,
            interview_id: data.interview_id,
            timestamp: data.timestamp,
            read: false,
          };
          setNotifications((prev) => [notification, ...prev].slice(0, 50));
          toast.info(`${data.candidate_name} completed the interview for ${data.job_position}`);
        }
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [token]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, clearAll };
}
