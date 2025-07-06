
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { AppNotification } from '@/types';
import { listenToNotifications, deleteNotification as deleteNotificationService, deleteAllNotifications as deleteAllNotificationsService } from '@/services/notificationService';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    if (user) {
      unsubscribe = listenToNotifications(
        (fetchedNotifications) => {
          setNotifications(fetchedNotifications);
        },
        (error) => {
          console.error("Failed to listen to notifications", error);
        }
      );
    } else {
      setNotifications([]);
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
    <NotificationContext.Provider value={{ notifications, deleteNotification, deleteAllNotifications }}>
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
