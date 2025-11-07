import { formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  CheckSquare, 
  Users, 
  AlertCircle, 
  Bell,
  MoreVertical,
  Check,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Notification } from '@/services/notificationService';

interface NotificationItemProps {
  notification: Notification;
  onClick?: () => void;
  onMarkAsRead?: () => void;
  onDelete?: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'engagement':
      return FileText;
    case 'document':
      return FileText;
    case 'task':
      return CheckSquare;
    case 'user':
      return Users;
    case 'system':
      return AlertCircle;
    default:
      return Bell;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'normal':
      return 'text-blue-500';
    case 'low':
      return 'text-gray-500';
    default:
      return 'text-blue-500';
  }
};

export const NotificationItem = ({
  notification,
  onClick,
  onMarkAsRead,
  onDelete
}: NotificationItemProps) => {
  const Icon = getNotificationIcon(notification.type);
  const priorityColor = getPriorityColor(notification.priority);
  
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { 
    addSuffix: true 
  });

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer",
        !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/20"
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn("mt-0.5", priorityColor)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={cn(
            "text-sm font-medium leading-tight",
            !notification.isRead && "font-semibold"
          )}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
          )}
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
          {notification.message}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{timeAgo}</span>
          {notification.category && (
            <>
              <span>•</span>
              <span className="capitalize">{notification.category.replace(/_/g, ' ')}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!notification.isRead && onMarkAsRead && (
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}>
              <Check className="h-4 w-4 mr-2" />
              Mark as read
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

