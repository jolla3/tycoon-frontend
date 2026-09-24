'use client';

// src/features/notifications/notification-context.tsx
//
// Frontend-native notification subsystem (section 38). There is no
// backend notifications endpoint, and per the spec we do NOT invent one —
// notifications are generated locally from events the frontend already
// observes (a sync completing, an unmatched-transaction count coming back
// from the API, a queued write finishing). Never given a Mongo _id.

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string; // locally generated (crypto.randomUUID) — never a backend _id
  type: string;
  severity: NotificationSeverity;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (input: { type: string; severity: NotificationSeverity; message: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const push = useCallback<NotificationContextValue['push']>((input) => {
    setNotifications((prev) => [
      { id: crypto.randomUUID(), timestamp: new Date().toISOString(), read: false, ...input },
      ...prev,
    ].slice(0, 50)); // meaningful events only — cap so the panel stays scannable, not a firehose
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, push, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
}
