// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertCircle, Info, CheckCircle, AlertTriangle, Megaphone, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { noticeBoardApi } from '@/services/api';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';

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
      badgeColor: "bg-red-500",
      gradient: "from-red-600 via-red-500 to-red-400",
      gradientDark: "from-red-700 via-red-600 to-red-500",
      label: "Emergency",
      textColor: "text-white"
    },
    [NoticeTypeEnum.WARNING]: {
      icon: AlertTriangle,
      badgeColor: "bg-orange-500",
      gradient: "from-orange-600 via-orange-500 to-orange-400",
      gradientDark: "from-orange-700 via-orange-600 to-orange-500",
      label: "Warning",
      textColor: "text-white"
    },
    [NoticeTypeEnum.UPDATE]: {
      icon: Info,
      badgeColor: "bg-blue-500",
      gradient: "from-blue-600 via-blue-500 to-blue-400",
      gradientDark: "from-blue-700 via-blue-600 to-blue-500",
      label: "Update",
      textColor: "text-white"
    },
    [NoticeTypeEnum.ANNOUNCEMENT]: {
      icon: Megaphone,
      badgeColor: "bg-purple-500",
      gradient: "from-purple-600 via-purple-500 to-purple-400",
      gradientDark: "from-purple-700 via-purple-600 to-purple-500",
      label: "Announcement",
      textColor: "text-white"
    },
    [NoticeTypeEnum.REMINDER]: {
      icon: Clock,
      badgeColor: "bg-yellow-500",
      gradient: "from-yellow-600 via-yellow-500 to-yellow-400",
      gradientDark: "from-yellow-700 via-yellow-600 to-yellow-500",
      label: "Reminder",
      textColor: "text-white"
    },
    [NoticeTypeEnum.INFO]: {
      icon: Info,
      badgeColor: "bg-gray-500",
      gradient: "from-gray-600 via-gray-500 to-gray-400",
      gradientDark: "from-gray-700 via-gray-600 to-gray-500",
      label: "Info",
      textColor: "text-white"
    },
    [NoticeTypeEnum.SUCCESS]: {
      icon: CheckCircle,
      badgeColor: "bg-green-500",
      gradient: "from-green-600 via-green-500 to-green-400",
      gradientDark: "from-green-700 via-green-600 to-green-500",
      label: "Success",
      textColor: "text-white"
    }
  };
  return configs[type] || configs[NoticeTypeEnum.INFO];
};

export const NoticeBoard = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    loadNotices();
  }, [user?.role]);

  // Auto-play carousel effect
  useEffect(() => {
    if (notices.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % notices.length);
    }, 5000); // Change notice every 5 seconds

    return () => clearInterval(interval);
  }, [notices.length, isPaused]);

  const loadNotices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get active notices - use getAll with filters as fallback
      let response;
      try {
        response = await noticeBoardApi.getActive();
      } catch (activeError: any) {
        // If /active endpoint returns 403 or fails, use getAll with filters
        if (activeError.message?.includes('403') || activeError.message?.includes('Forbidden') || activeError.message?.includes('Insufficient')) {
          // Fallback to getAll with role and active filters
          const userRole = user?.role?.toLowerCase();
          if (userRole) {
            response = await noticeBoardApi.getAll({
              isActive: true,
              roles: userRole,
              sort: 'createdAt',
              order: 'desc'
            });
          } else {
            throw new Error('User role not available');
          }
        } else {
          throw activeError;
        }
      }

      if (response.success && response.data) {
        const noticesData = Array.isArray(response.data) ? response.data : [];
        setNotices(noticesData);
        
        // Mark notices as viewed (silently fail if permission denied)
        noticesData.forEach((notice: any) => {
          const noticeId = notice._id || notice.id;
          if (noticeId) {
            noticeBoardApi.markAsViewed(noticeId).catch(() => {
              // Silently ignore - user might not have permission to mark as viewed
            });
          }
        });
      } else {
        setNotices([]);
      }
    } catch (err: any) {
      // Don't show error for permission issues - just show empty state
      if (err.message?.includes('403') || err.message?.includes('Forbidden') || err.message?.includes('Insufficient')) {
        console.warn('Notice board access restricted:', err.message);
        setNotices([]);
        setError(null); // Don't show error message to user
      } else {
        console.error('Error loading notices:', err);
        setError(err.message || 'Failed to load notices');
        setNotices([]);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Notice Board</h2>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 border border-gray-200 shadow-lg">
          <div className="flex items-center justify-center py-8">
            <EnhancedLoader size="md" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Notice Board</h2>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-8 border border-red-200 shadow-lg">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const nextNotice = () => {
    setCurrentIndex((prev) => (prev + 1) % notices.length);
  };

  const prevNotice = () => {
    setCurrentIndex((prev) => (prev - 1 + notices.length) % notices.length);
  };

  if (notices.length === 0) {
    return (
      <div className="relative">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200 shadow-lg">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-200 mb-4">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Notices Available</h3>
            <p className="text-sm text-gray-500">
              No notices available at the moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Notice Board</h2>
          <Badge variant="secondary" className="ml-2">
            {notices.length} {notices.length === 1 ? 'Notice' : 'Notices'}
          </Badge>
        </div>
        {notices.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevNotice}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {currentIndex + 1} / {notices.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextNotice}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Main Notice Card - VISA Card Style with Parallax Carousel */}
      <div 
        className="relative w-full overflow-hidden" 
        style={{ height: '220px' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {notices.map((notice, index) => {
          const noticeConfig = getNoticeTypeConfig(notice.type as NoticeTypeEnum);
          const NoticeIcon = noticeConfig.icon;
          const noticeDate = new Date(notice.createdAt);
          const noticeFormattedDate = noticeDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          const noticeFormattedTime = noticeDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          });

          // Calculate position in stack
          const distanceFromCurrent = index - currentIndex;
          const isCurrent = index === currentIndex;
          const isNext = distanceFromCurrent === 1 || (currentIndex === notices.length - 1 && index === 0);
          const isPrev = distanceFromCurrent === -1 || (currentIndex === 0 && index === notices.length - 1);
          
          // Calculate transform and opacity based on position
          let transform = '';
          let opacity = 1;
          let zIndex = notices.length - Math.abs(distanceFromCurrent);
          let scale = 1;
          
          if (isCurrent) {
            // Current card - front and center
            transform = 'translateX(0) translateY(0) rotate(0deg) scale(1)';
            opacity = 1;
            zIndex = notices.length + 2;
            scale = 1;
          } else if (isNext) {
            // Next card - slightly behind and to the right
            transform = 'translateX(20px) translateY(8px) rotate(2deg) scale(0.95)';
            opacity = 0.7;
            zIndex = notices.length + 1;
            scale = 0.95;
          } else if (isPrev) {
            // Previous card - slightly behind and to the left
            transform = 'translateX(-20px) translateY(8px) rotate(-2deg) scale(0.95)';
            opacity = 0.7;
            zIndex = notices.length;
            scale = 0.95;
          } else {
            // Cards further away - more offset
            const offset = Math.abs(distanceFromCurrent) * 15;
            const rotation = distanceFromCurrent > 0 ? 3 : -3;
            transform = `translateX(${distanceFromCurrent > 0 ? offset : -offset}px) translateY(${Math.abs(distanceFromCurrent) * 10}px) rotate(${rotation}deg) scale(${1 - Math.abs(distanceFromCurrent) * 0.05})`;
            opacity = Math.max(0.2, 0.7 - Math.abs(distanceFromCurrent) * 0.15);
            zIndex = Math.max(1, notices.length - Math.abs(distanceFromCurrent));
            scale = Math.max(0.85, 1 - Math.abs(distanceFromCurrent) * 0.05);
          }

          return (
            <div
              key={notice._id || notice.id}
              className="absolute w-full h-full transition-all duration-500 ease-out"
              style={{
                transform,
                opacity,
                zIndex,
                transformOrigin: 'center center',
                willChange: 'transform, opacity'
              }}
            >
              <div
                className={cn(
                  "relative bg-gradient-to-br rounded-xl shadow-xl transition-all duration-500",
                  `bg-gradient-to-br ${noticeConfig.gradient}`,
                  "text-white overflow-hidden",
                  "w-full h-full",
                  isCurrent && "hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
                )}
              >
                {/* Decorative Background Patterns */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/10 rounded-full -ml-30 -mb-30 blur-2xl" />
                
                {/* Card Chip Effect (Top Left) */}
                <div className="absolute top-4 left-4 w-10 h-8 bg-gradient-to-br from-white/30 to-white/10 rounded-md backdrop-blur-sm border border-white/20 shadow-md" />
                
                {/* Contactless Symbol (Top Right) */}
                <div className="absolute top-4 right-4 flex items-center gap-1">
                  <div className="w-7 h-7 border-2 border-white/50 rounded-full flex items-center justify-center">
                    <div className="w-3.5 h-3.5 border-2 border-white/50 rounded-full"></div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="relative z-10 h-full flex flex-col p-6">
                  {/* Top Section - Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/20">
                        <NoticeIcon className="h-4 w-4 text-white" />
                      </div>
                      <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs px-2 py-0.5">
                        {noticeConfig.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Middle Section - Title and Description */}
                  <div className="flex-1 flex flex-col justify-center mb-4">
                    <h3 className="text-xl font-bold mb-2 text-white leading-tight line-clamp-1">
                      {notice.title}
                    </h3>
                    <p className="text-white/90 text-sm leading-relaxed line-clamp-2">
                      {notice.description}
                    </p>
                  </div>

                  {/* Bottom Section - Card Number Style Layout */}
                  <div className="mt-auto pt-3 border-t border-white/20">
                    <div className="flex items-end justify-between">
                      <div className="flex-1">
                        <div className="text-[10px] text-white/60 mb-1 uppercase tracking-wider">Created</div>
                        <div className="flex items-center gap-1.5 text-white">
                          <Clock className="h-3 w-3" />
                          <span className="font-semibold text-xs">{noticeFormattedDate}</span>
                          <span className="text-white/50 text-xs">•</span>
                          <span className="text-white/70 text-[10px]">{noticeFormattedTime}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-white/60 mb-1 uppercase tracking-wider">Audience</div>
                        <div className="flex gap-1 justify-end">
                          {notice.roles?.slice(0, 2).map((role: string) => (
                            <Badge
                              key={role}
                              className="bg-white/20 text-white border-white/30 backdrop-blur-sm capitalize text-[10px] px-1.5 py-0"
                            >
                              {role}
                            </Badge>
                          ))}
                          {notice.roles?.length > 2 && (
                            <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-[10px] px-1.5 py-0">
                              +{notice.roles.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Card Indicator Dots */}
        {notices.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {notices.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "w-8 bg-primary"
                    : "w-2 bg-gray-300 hover:bg-gray-400"
                )}
                aria-label={`Go to notice ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

