// @ts-nocheck
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarStats } from '@/hooks/useSidebarStats';
import {
  Building2,
  Users,
  FileText,
  Settings,
  BarChart3,
  FolderOpen,
  UserCheck,
  Briefcase,
  Sparkles,
  Zap,
  TrendingUp,
  Home,
  Calendar,
  Clock,
  Activity,
  Target,
  Shield
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
  description?: string;
  badge?: string;
  getBadge?: (stats: any) => string;
}

const navItems: NavItem[] = [
  // Admin
  { 
    title: 'Dashboard', 
    href: '/admin', 
    icon: BarChart3, 
    roles: ['admin'],
    description: 'Overview & Analytics',
    badge: 'Live'
  },
  { 
    title: 'User Management', 
    href: '/admin/users', 
    icon: UserCheck, 
    roles: ['admin'],
    description: 'Manage Users & Permissions'
  },
  { 
    title: 'Auditor Logs', 
    href: '/admin/logs', 
    icon: Activity, 
    roles: ['admin'],
    description: 'Monitor Auditor Activities'
  },
  { 
    title: 'ISQM', 
    href: '/admin/isqm', 
    icon: FileText, 
    roles: ['admin'],
    description: 'Quality Management Assessment',
    badge: 'New'
  },

  // Employee
  { 
    title: 'Dashboard', 
    href: '/employee', 
    icon: BarChart3, 
    roles: ['employee'],
    description: 'Overview & Analytics',
    badge: 'Live'
  },
  { 
    title: 'Clients', 
    href: '/employee/clients', 
    icon: Building2, 
    roles: ['employee'],
    description: 'Client Management',
    getBadge: (stats) => `${stats.totalClients} Total`
  },
  { 
    title: 'Engagements', 
    href: '/employee/engagements', 
    icon: Briefcase, 
    roles: ['employee'],
    description: 'Audit Engagements',
    getBadge: (stats) => `${stats.activeEngagements} Active`
  },
 
  { 
    title: 'Library', 
    href: '/employee/library', 
    icon: FolderOpen, 
    roles: ['employee'],
    description: 'Document Library'
  },
  { 
    title: 'Integrations', 
    href: '/employee/accounts', 
    icon: FileText, 
    roles: ['employee'],
    description: 'Accounts&Finance Details'
  },
  { 
    title: 'ISQM', 
    href: '/employee/isqm', 
    icon: Shield, 
    roles: ['employee'],
    description: 'Quality Management Assessment',
    badge: 'New'
  },
  { 
    title: 'KYC Management', 
    href: '/employee/kyc', 
    icon: Shield, 
    roles: ['employee'],
    description: 'Know Your Client Workflows',
    badge: 'New'
  },

  // Client
  { 
    title: 'Dashboard', 
    href: '/client', 
    icon: BarChart3, 
    roles: ['client'],
    description: 'Overview & Progress',
    badge: 'Live'
  },
  { 
    title: 'My Engagements', 
    href: '/client/engagements', 
    icon: FolderOpen, 
    roles: ['client'],
    description: 'Your Audit Engagements'
  },
  { 
    title: 'Document Requests', 
    href: '/client/requests', 
    icon: FileText, 
    roles: ['client'],
    description: 'Requested Documents',
    getBadge: (stats) => `${stats.pendingRequests} Pending`
  },
  { 
    title: 'Integrations', 
    href: '/client/accounts', 
    icon: Zap, 
    roles: ['client'],
    description: 'Financial Data & Integrations'
  }
];

export const Sidebar = ({ isOpen, onClose, isCollapsed = false }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { stats, loading } = useSidebarStats(user?.role || '');

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  // Create dynamic nav items with updated badges from database
  const dynamicNavItems = filteredNavItems.map(item => {
    let badge = item.badge;
    if (item.getBadge) {
      badge = item.getBadge(stats);
    }
    return { ...item, badge };
  });

  return (
    <div
      className={cn(
        // container
        "fixed inset-y-0 left-0 bg-black text-white flex flex-col transform transition-all duration-300 ease-in-out z-50 md:static md:z-auto md:translate-x-0",
        // mobile slide
        isOpen ? "translate-x-0" : "-translate-x-full",
        // desktop width
        isCollapsed ? "md:w-20" : "md:w-72",
        // modern styling
        "border-r border-gray-800 shadow-xl"
      )}
    >
      {/* Header */}
      <div className={cn(
        "border-b border-gray-800 relative",
        isCollapsed ? "p-4" : "p-6"
      )}>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              "bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center shadow-lg border border-gray-600",
              isCollapsed ? "w-12 h-12" : "w-16 h-16"
            )}>
              <img 
                src="/logo.png" 
                alt="Logo" 
                className={cn(
                  "object-cover rounded-lg",
                  isCollapsed ? "h-10 w-10" : "h-12 w-12"
                )} 
              />
            </div>
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-white/5 rounded-2xl blur-sm"></div>
          </div>
          
          <div className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            isCollapsed ? "md:opacity-0 md:w-0 md:overflow-hidden" : "md:opacity-100 md:w-auto"
          )}>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight">
                Audit Portal
              </h1>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Audit & Compliance
              </p>
            </div>
          </div>
        </div>

        {/* Mobile close */}
        <button
          className="md:hidden absolute top-6 right-6 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors border border-gray-700"
          onClick={onClose}
          aria-label="Close Menu"
        >
          <div className="w-5 h-5 relative">
            <div className="absolute inset-0 rotate-45">
              <div className="w-0.5 h-5 bg-white rounded-full"></div>
            </div>
            <div className="absolute inset-0 -rotate-45">
              <div className="w-0.5 h-5 bg-white rounded-full"></div>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Stats */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="bg-gray-900 rounded-2xl p-3 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-white" />
                <span className="text-xs text-gray-300 font-medium">Today's Tasks</span>
              </div>
              <span className="text-xs font-semibold text-white">
                {loading ? '...' : stats.todayTasks}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Calendar className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-400">
                Next: {loading ? 'Loading...' : stats.nextTask}
              </span>
            </div>
          </div>
        </div>
      )}
          
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className={cn(
          "space-y-2",
          isCollapsed ? "p-2" : "p-4"
        )}>
          {dynamicNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== `/${user.role}` &&
                location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'group relative flex items-center transition-all duration-300 ease-out',
                  isCollapsed 
                    ? 'justify-center px-2 py-3 rounded-2xl' 
                    : 'gap-4 px-4 py-3 rounded-2xl',
                  'hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-500/10',
                  isActive
                    ? 'bg-gray-800 text-white border border-gray-700 shadow-lg shadow-gray-500/20'
                    : 'text-gray-300 hover:text-white hover:bg-gray-800/50 border border-transparent'
                )}
                title={isCollapsed ? item.title : undefined}
              >
                {/* Active indicator */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                )}
                
                {/* Icon container */}
                <div className={cn(
                  'relative flex items-center justify-center transition-all duration-300',
                  isCollapsed ? 'w-8 h-8' : 'w-10 h-10',
                  'rounded-xl',
                  isActive
                    ? 'bg-white text-black shadow-lg'
                    : 'bg-gray-800 text-white group-hover:bg-gray-700'
                )}>
                  <Icon className={cn(
                    isCollapsed ? "h-4 w-4" : "h-5 w-5"
                  )} />
                </div>

                {/* Text content */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{item.title}</div>
                      {item.badge && (
                        <div className="px-2 py-0.5 bg-gray-700 text-white text-xs rounded-full font-medium border border-gray-600">
                          {loading && item.getBadge ? '...' : item.badge}
                        </div>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {item.description}
                      </div>
                    )}
                  </div>
                )}

                {/* Hover effect */}
                <div className={cn(
                  'absolute inset-0 transition-opacity duration-300',
                  isCollapsed ? 'rounded-2xl' : 'rounded-2xl',
                  isActive
                    ? 'bg-gradient-to-r from-gray-800/5 to-transparent opacity-100'
                    : 'bg-gradient-to-r from-gray-800/5 to-transparent opacity-0 group-hover:opacity-100'
                )}></div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer / User */}
      <div className={cn(
        "border-t border-gray-800",
        isCollapsed ? "p-2" : "p-4"
      )}>
        <div className={cn(
          "border border-gray-700",
          isCollapsed ? "bg-gray-900 rounded-2xl p-2" : "bg-gray-900 rounded-2xl p-4"
        )}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={cn(
                "bg-white rounded-2xl flex items-center justify-center",
                isCollapsed ? "w-8 h-8" : "w-10 h-10"
              )}>
                <span className={cn(
                  "font-bold text-black",
                  isCollapsed ? "text-xs" : "text-sm"
                )}>
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black"></div>
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {user.email}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-400">Online</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
