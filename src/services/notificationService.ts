import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';

const API_URL = import.meta.env.VITE_APIURL || 'http://localhost:8000';

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'engagement' | 'document' | 'task' | 'user' | 'system';
  category: string;
  module?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  engagementId?: string;
  documentId?: string;
  taskId?: string;
  data?: any;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  isSent: boolean;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  _id: string;
  userId: string;
  engagementNotifications: boolean;
  documentNotifications: boolean;
  taskNotifications: boolean;
  userNotifications: boolean;
  systemNotifications: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  soundEnabled?: boolean;
  soundVolume?: number;
  disabledCategories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    [key: string]: {
      total: number;
      unread: number;
    };
  };
}

// Get authorization header using Supabase session
const getAuthHeader = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (error) {
    console.error('Error getting auth token:', error);
    return {};
  }
};

/**
 * Get user notifications
 */
export const getNotifications = async (params?: {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  type?: string;
  module?: string;
}): Promise<{
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}> => {
  const headers = await getAuthHeader();
  const response = await axios.get(`${API_URL}/api/notifications`, {
    params,
    headers
  });
  return response.data;
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (): Promise<number> => {
  const headers = await getAuthHeader();
  const response = await axios.get(`${API_URL}/api/notifications/unread-count`, {
    headers
  });
  return response.data.count;
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (): Promise<NotificationStats> => {
  const headers = await getAuthHeader();
  const response = await axios.get(`${API_URL}/api/notifications/stats`, {
    headers
  });
  return response.data;
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId: string): Promise<Notification> => {
  const headers = await getAuthHeader();
  const response = await axios.put(
    `${API_URL}/api/notifications/${notificationId}/read`,
    {},
    { headers }
  );
  return response.data;
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (): Promise<{ success: boolean; modifiedCount: number }> => {
  const headers = await getAuthHeader();
  const response = await axios.put(
    `${API_URL}/api/notifications/read-all`,
    {},
    { headers }
  );
  return response.data;
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId: string): Promise<{ success: boolean }> => {
  const headers = await getAuthHeader();
  const response = await axios.delete(`${API_URL}/api/notifications/${notificationId}`, {
    headers
  });
  return response.data;
};

/**
 * Delete all read notifications
 */
export const deleteAllRead = async (): Promise<{ success: boolean; deletedCount: number }> => {
  const headers = await getAuthHeader();
  const response = await axios.delete(`${API_URL}/api/notifications/read/all`, {
    headers
  });
  return response.data;
};

/**
 * Save FCM token
 */
export const saveFCMToken = async (
  token: string,
  deviceType?: 'web' | 'android' | 'ios',
  deviceName?: string
): Promise<any> => {
  const headers = await getAuthHeader();
  const response = await axios.post(
    `${API_URL}/api/notifications/fcm-token`,
    { token, deviceType, deviceName },
    { headers }
  );
  return response.data;
};

/**
 * Remove FCM token
 */
export const removeFCMToken = async (token: string): Promise<{ success: boolean }> => {
  const headers = await getAuthHeader();
  const response = await axios.delete(`${API_URL}/api/notifications/fcm-token`, {
    data: { token },
    headers
  });
  return response.data;
};

/**
 * Get user preferences
 */
export const getPreferences = async (): Promise<NotificationPreference> => {
  const headers = await getAuthHeader();
  const response = await axios.get(`${API_URL}/api/notifications/preferences`, {
    headers
  });
  return response.data;
};

/**
 * Update user preferences
 */
export const updatePreferences = async (
  preferences: Partial<NotificationPreference>
): Promise<NotificationPreference> => {
  const headers = await getAuthHeader();
  const response = await axios.put(
    `${API_URL}/api/notifications/preferences`,
    preferences,
    { headers }
  );
  return response.data;
};

/**
 * Send test notification
 */
export const sendTestNotification = async (title?: string, message?: string): Promise<any> => {
  const headers = await getAuthHeader();
  const response = await axios.post(
    `${API_URL}/api/notifications/test`,
    { title, message },
    { headers }
  );
  return response.data;
};

