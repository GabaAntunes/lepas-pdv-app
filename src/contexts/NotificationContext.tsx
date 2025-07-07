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

// Path to your custom notification sound.
// Place an MP3 file in the `public` folder and update the path here.
const NOTIFICATION_SOUND_PATH = '/notification.mp3';

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousCountRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // This effect runs only on the client, where the Audio object is available.
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND_PATH);
    }
  }, []);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    if (user) {
      // Reset on user change to handle initial data load correctly.
      previousCountRef.current = undefined;

      unsubscribe = listenToNotifications(
        (fetchedNotifications) => {
          // Only play sound on subsequent updates, not on initial load.
          if (previousCountRef.current !== undefined && fetchedNotifications.length > previousCountRef.current) {
            audioRef.current?.play().catch(e => console.error("Error playing sound:", e));
            setHasNewNotification(true);
          }
          setNotifications(fetchedNotifications);
          // Set the count for the next comparison.
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
