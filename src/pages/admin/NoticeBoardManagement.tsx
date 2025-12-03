// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertCircle, Info, CheckCircle, AlertTriangle, Megaphone, Clock, Trash2, Eye, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NoticeBoardForm } from '@/components/notice-board/NoticeBoardForm';
import { useToast } from '@/hooks/use-toast';
import { noticeBoardApi } from '@/services/api';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

enum RoleEnum {
  ADMIN = "admin",
  EMPLOYEE = "employee",
  CLIENT = "client",
}

enum NoticeTypeEnum {
  EMERGENCY = "emergency",
  WARNING = "warning",
  UPDATE = "update",
  ANNOUNCEMENT = "announcement",
  REMINDER = "reminder",
  INFO = "info",
  SUCCESS = "success"
}

interface NoticeBoard {
  id: string;
  title: string;
  description: string;
  roles: RoleEnum[];
  createdBy: "admin" | "super-admin";
  type: NoticeTypeEnum;
  createdAt: Date;
  updatedAt: Date;
}

const getNoticeTypeConfig = (type: NoticeTypeEnum) => {
  const configs = {
    [NoticeTypeEnum.EMERGENCY]: {
      icon: AlertCircle,
      color: "bg-red-100 text-red-700 border-red-200",
      badgeColor: "bg-red-500",
      label: "Emergency"
    },
    [NoticeTypeEnum.WARNING]: {
      icon: AlertTriangle,
      color: "bg-orange-100 text-orange-700 border-orange-200",
      badgeColor: "bg-orange-500",
      label: "Warning"
    },
    [NoticeTypeEnum.UPDATE]: {
      icon: Info,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      badgeColor: "bg-blue-500",
      label: "Update"
    },
    [NoticeTypeEnum.ANNOUNCEMENT]: {
      icon: Megaphone,
      color: "bg-purple-100 text-purple-700 border-purple-200",
      badgeColor: "bg-purple-500",
      label: "Announcement"
    },
    [NoticeTypeEnum.REMINDER]: {
      icon: Clock,
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      badgeColor: "bg-yellow-500",
      label: "Reminder"
    },
    [NoticeTypeEnum.INFO]: {
      icon: Info,
      color: "bg-gray-100 text-gray-700 border-gray-200",
      badgeColor: "bg-gray-500",
      label: "Info"
    },
    [NoticeTypeEnum.SUCCESS]: {
      icon: CheckCircle,
      color: "bg-green-100 text-green-700 border-green-200",
      badgeColor: "bg-green-500",
      label: "Success"
    }
  };
  return configs[type] || configs[NoticeTypeEnum.INFO];
};

export const NoticeBoardManagement = () => {
  const [notices, setNotices] = useState<any[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<any | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      setLoading(true);
      const response = await noticeBoardApi.getAll({
        sort: 'createdAt',
        order: 'desc',
      });
      if (response.success && response.data) {
        setNotices(response.data);
      } else {
        setNotices([]);
      }
    } catch (error: any) {
      console.error('Error loading notices:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load notices.",
        variant: "destructive"
      });
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) {
      return;
    }

    try {
      await noticeBoardApi.delete(id);
      setNotices(notices.filter(n => (n._id || n.id) !== id));
      toast({
        title: "Notice Deleted",
        description: "The notice has been deleted successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notice.",
        variant: "destructive"
      });
    }
  };

  const handleView = (notice: NoticeBoard) => {
    setSelectedNotice(notice);
    setViewDialogOpen(true);
  };

  const handleNoticeCreated = () => {
    loadNotices();
  };

  return (
    <div className="min-h-screen bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-3xl font-semibold text-brand-body mb-2">Notice Board Management</h1>
              <p className="text-brand-body">View and manage all notices shared with employees and clients.</p>
            </div>
            <NoticeBoardForm onNoticeCreated={handleNoticeCreated} />
          </div>
        </div>

        {/* Notices Grid */}
        {loading ? (
          <Card>
            <CardContent className="py-12">
              <EnhancedLoader size="md" />
            </CardContent>
          </Card>
        ) : notices.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No notices yet</p>
                <p className="text-sm text-muted-foreground">Create your first notice to get started.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notices.map((notice) => {
              const config = getNoticeTypeConfig(notice.type);
              const Icon = config.icon;
              const date = new Date(notice.createdAt);
              const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <Card key={notice._id || notice.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className={cn(
                        "p-2 rounded-lg",
                        config.badgeColor,
                        "text-white"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{notice.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {notice.description}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Target:</span>
                        <div className="flex gap-1">
                          {notice.roles.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleView(notice)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedNotice(notice);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(notice._id || notice.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* View Notice Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            {selectedNotice && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-2">
                    {(() => {
                      const config = getNoticeTypeConfig(selectedNotice.type);
                      const Icon = config.icon;
                      return (
                        <div className={cn(
                          "p-2 rounded-lg",
                          config.badgeColor,
                          "text-white"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                      );
                    })()}
                    <DialogTitle>{selectedNotice.title}</DialogTitle>
                  </div>
                  <DialogDescription>
                    View notice details and information
                  </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline">
                    {getNoticeTypeConfig(selectedNotice.type).label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Created {selectedNotice.createdAt ? new Date(selectedNotice.createdAt).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedNotice.description}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Target Audience</h4>
                    <div className="flex gap-2">
                      {selectedNotice.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Created By</h4>
                    <p className="text-sm text-muted-foreground capitalize">{selectedNotice.createdBy || 'N/A'}</p>
                  </div>
                  {selectedNotice.priority !== undefined && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Priority</h4>
                      <p className="text-sm text-muted-foreground">{selectedNotice.priority}</p>
                    </div>
                  )}
                  {selectedNotice.expiresAt && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Expires At</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(selectedNotice.expiresAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Status</h4>
                    <Badge variant={selectedNotice.isActive ? "default" : "secondary"}>
                      {selectedNotice.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {selectedNotice.userInteractions && selectedNotice.userInteractions.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">User Interactions</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedNotice.userInteractions.filter((ui: any) => ui.isViewed).length} viewed, {' '}
                        {selectedNotice.userInteractions.filter((ui: any) => ui.isAcknowledged).length} acknowledged
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Notice Dialog */}
        <NoticeBoardForm 
          notice={selectedNotice}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onNoticeCreated={() => {
            loadNotices();
            setEditDialogOpen(false);
            setSelectedNotice(null);
          }}
        />
      </div>
    </div>
  );
};

