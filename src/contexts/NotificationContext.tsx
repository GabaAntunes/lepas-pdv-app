
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { AppNotification } from '@/types';
import { listenToNotifications, deleteNotification as deleteNotificationService, deleteAllNotifications as deleteAllNotificationsService } from '@/services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  hasNewNotification: boolean;
  setHasNewNotification: (value: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// A simple, short pop sound encoded in Base64
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousCountRef = useRef(0);

  useEffect(() => {
    // This effect runs only on the client, where the Audio object is available.
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    if (user) {
      // Initialize the previous count when the user logs in or changes
      previousCountRef.current = notifications.length;
      unsubscribe = listenToNotifications(
        (fetchedNotifications) => {
          if (fetchedNotifications.length > previousCountRef.current) {
            audioRef.current?.play().catch(e => console.error("Error playing sound:", e));
            setHasNewNotification(true);
          }
          setNotifications(fetchedNotifications);
          previousCountRef.current = fetchedNotifications.length;
        },
        (error) => {
          console.error("Failed to listen to notifications", error);
        }
      );
    } else {
      setNotifications([]);
      previousCountRef.current = 0;
    }
    return () => unsubscribe();
  }, [user]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await deleteNotificationService(id);
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  }, []);

  const deleteAllNotifications = useCallback(async () => {
    try {
      await deleteAllNotificationsService();
    } catch (error) {
      console.error("Failed to delete all notifications", error);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, deleteNotification, deleteAllNotifications, hasNewNotification, setHasNewNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
