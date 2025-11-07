import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  saveFCMToken,
  getPreferences,
  updatePreferences,
  type Notification,
  type NotificationPreference
} from '@/services/notificationService';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';
import { toast } from 'sonner';
import { playNotificationSound } from '@/lib/notificationSound';

/**
 * Hook for managing notifications
 */
export const useNotifications = (options?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) => {
  const queryClient = useQueryClient();
  const [foregroundNotification, setForegroundNotification] = useState<any>(null);
  const [previousUnreadIds, setPreviousUnreadIds] = useState<Set<string>>(new Set());

  // Get preferences for sound settings
  const { data: preferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getPreferences
  });

  // Query for notifications
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications', options],
    queryFn: () => getNotifications(options),
    refetchInterval: options?.autoRefresh ? (options.refreshInterval || 30000) : false
  });

  // Play sound for new unread notifications
  useEffect(() => {
    if (notificationsData?.notifications && preferences) {
      const soundEnabled = preferences.soundEnabled !== false;
      const soundVolume = preferences.soundVolume ?? 0.7;
      
      if (soundEnabled) {
        const currentUnread = notificationsData.notifications
          .filter(n => !n.isRead)
          .map(n => n._id);
        
        const currentUnreadSet = new Set(currentUnread);
        const newUnread = currentUnread.filter(id => !previousUnreadIds.has(id));
        
        if (newUnread.length > 0) {
          // Find the most recent new unread notification
          const latestNew = notificationsData.notifications.find(
            n => newUnread.includes(n._id) && !n.isRead
          );
          
          if (latestNew) {
            playNotificationSound(latestNew.priority || 'normal', soundVolume);
          }
        }
        
        setPreviousUnreadIds(currentUnreadSet);
      }
    }
  }, [notificationsData, preferences]);

  // Query for unread count
  const { data: unreadCount = 0, refetch: refetchUnreadCount } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: options?.autoRefresh ? (options.refreshInterval || 30000) : false
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('All notifications marked as read');
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      toast.success('Notification deleted');
    }
  });

  // Delete all read mutation
  const deleteAllReadMutation = useMutation({
    mutationFn: deleteAllRead,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`${data.deletedCount} notifications deleted`);
    }
  });

  // Listen for foreground messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      setForegroundNotification(payload);
      
      // Play notification sound if enabled
      const soundEnabled = preferences?.soundEnabled !== false; // Default to true
      const soundVolume = preferences?.soundVolume ?? 0.7;
      const priority = payload.data?.priority || 'normal';
      
      if (soundEnabled) {
        playNotificationSound(priority as any, soundVolume);
      }
      
      // Show toast notification
      toast.info(payload.notification?.title || 'New notification', {
        description: payload.notification?.body
      });

      // Refresh notifications
      refetch();
      refetchUnreadCount();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [refetch, refetchUnreadCount, preferences]);

  return {
    notifications: notificationsData?.notifications || [],
    total: notificationsData?.total || 0,
    unreadCount,
    isLoading,
    error,
    foregroundNotification,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    deleteAllRead: deleteAllReadMutation.mutate,
    refetch,
    refetchUnreadCount
  };
};

/**
 * Hook for managing FCM token
 */
export const useFCMToken = () => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  const saveFCMTokenMutation = useMutation({
    mutationFn: ({ token, deviceType, deviceName }: {
      token: string;
      deviceType?: 'web' | 'android' | 'ios';
      deviceName?: string;
    }) => saveFCMToken(token, deviceType, deviceName)
  });

  const requestPermission = useCallback(async () => {
    try {
      const token = await requestNotificationPermission();
      
      if (token) {
        setFcmToken(token);
        setPermission('granted');
        
        // Save token to backend
        await saveFCMTokenMutation.mutateAsync({
          token,
          deviceType: 'web',
          deviceName: navigator.userAgent
        });
        
        toast.success('Notifications enabled');
        return token;
      } else {
        setPermission(Notification.permission);
        return null;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
      return null;
    }
  }, [saveFCMTokenMutation]);

  useEffect(() => {
    setPermission(Notification.permission);
  }, []);

  return {
    fcmToken,
    permission,
    requestPermission,
    isPermissionGranted: permission === 'granted'
  };
};

/**
 * Hook for managing notification preferences
 */
export const useNotificationPreferences = () => {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: getPreferences
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Preferences updated');
    }
  });

  return {
    preferences,
    isLoading,
    updatePreferences: updatePreferencesMutation.mutate,
    isUpdating: updatePreferencesMutation.isPending
  };
};

