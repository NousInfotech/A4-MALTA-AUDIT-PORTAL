import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Settings, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { cn } from '@/lib/utils';

interface NotificationCenterProps {
  onClose?: () => void;
}

export const NotificationCenter = ({ onClose }: NotificationCenterProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  
  const {
    notifications: allNotifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead
  } = useNotifications({ 
    limit: 50, 
    autoRefresh: true 
  });

  const {
    notifications: unreadNotifications
  } = useNotifications({ 
    limit: 50, 
    unreadOnly: true,
    autoRefresh: true 
  });

  const notifications = activeTab === 'unread' ? unreadNotifications : allNotifications;

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Navigate to action URL
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose?.();
    }
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleDeleteAllRead = () => {
    deleteAllRead();
  };

  const handleSettingsClick = () => {
    navigate('/settings/notifications');
    onClose?.();
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              ({unreadCount} new)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSettingsClick}
            title="Notification settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
          {allNotifications.some(n => n.isRead) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteAllRead}
              className="h-8 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear read
            </Button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onMarkAsRead={() => markAsRead(notification._id)}
                onDelete={() => deleteNotification(notification._id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

