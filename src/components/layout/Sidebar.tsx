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
    title: 'ISQM Questionnaire', 
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
    title: 'Accounts&Finance', 
    href: '/employee/accounts', 
    icon: FileText, 
    roles: ['employee'],
    description: 'Accounts&Finance Details'
  },
  { 
    title: 'ISQM Questionnaire', 
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
    title: 'KYC Workflows', 
    href: '/client/kyc', 
    icon: Shield, 
    roles: ['client'],
    description: 'Know Your Client Requirements',
    badge: 'New'
  },
  { 
    title: 'Accounts & Finance', 
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
        "fixed inset-y-0 left-0 bg-gradient-to-b from-slate-50 via-blue-50/30 to-indigo-50/20 text-slate-800 flex flex-col transform transition-all duration-300 ease-in-out z-50 md:static md:z-auto md:translate-x-0",
        // mobile slide
        isOpen ? "translate-x-0" : "-translate-x-full",
        // desktop width
        isCollapsed ? "md:w-20" : "md:w-72",
        // modern styling
        "backdrop-blur-xl border-r border-blue-100/50 shadow-xl"
      )}
    >
      {/* Header */}
      <div className={cn(
        "border-b border-blue-100/30",
        isCollapsed ? "p-4" : "p-6"
      )}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <img src="/logo.png" alt="Logo" className="h-10 w-10 object-cover rounded" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
          
          <div className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            isCollapsed ? "md:opacity-0 md:w-0 md:overflow-hidden" : "md:opacity-100 md:w-auto"
          )}>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AuditPortal
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-slate-600 capitalize font-medium">
                {user.role} Panel
              </p>
            </div>
          </div>
        </div>

        {/* Mobile close */}
        <button
          className="md:hidden absolute top-6 right-6 p-2 rounded-lg bg-blue-100/50 hover:bg-blue-200/50 transition-colors"
          onClick={onClose}
          aria-label="Close Menu"
        >
          <div className="w-5 h-5 relative">
            <div className="absolute inset-0 rotate-45">
              <div className="w-0.5 h-5 bg-slate-600 rounded-full"></div>
            </div>
            <div className="absolute inset-0 -rotate-45">
              <div className="w-0.5 h-5 bg-slate-600 rounded-full"></div>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Stats */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-b border-blue-100/20">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-3 border border-blue-100/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-xs text-slate-600 font-medium">Today's Tasks</span>
              </div>
              <span className="text-xs font-semibold text-blue-600">
                {loading ? '...' : stats.todayTasks}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Calendar className="h-3 w-3 text-slate-500" />
              <span className="text-xs text-slate-500">
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
                  'hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 text-blue-700 border border-blue-200/50 shadow-lg shadow-blue-500/20'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-blue-50/50 border border-transparent'
                )}
                title={isCollapsed ? item.title : undefined}
              >
                {/* Active indicator */}
                {isActive && !isCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-r-full"></div>
                )}
                
                {/* Icon container */}
                <div className={cn(
                  'relative flex items-center justify-center transition-all duration-300',
                  isCollapsed ? 'w-8 h-8' : 'w-10 h-10',
                  'rounded-xl',
                  isActive
                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-blue-100/50 text-slate-600 group-hover:bg-blue-200/50 group-hover:text-slate-800'
                )}>
                  <Icon className={cn(
                    isCollapsed ? "h-4 w-4" : "h-5 w-5"
                  )} />
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-blue-500/20 animate-ping"></div>
                  )}
                </div>

                {/* Text content */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{item.title}</div>
                      {item.badge && (
                        <div className="px-2 py-0.5 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-xs rounded-full font-medium border border-blue-200">
                          {loading && item.getBadge ? '...' : item.badge}
                        </div>
                      )}
                    </div>
                    {item.description && (
                      <div className="text-xs text-slate-500 mt-0.5">
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
                    ? 'bg-gradient-to-r from-blue-500/5 to-transparent opacity-100'
                    : 'bg-gradient-to-r from-blue-100/5 to-transparent opacity-0 group-hover:opacity-100'
                )}></div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer / User */}
      <div className={cn(
        "border-t border-blue-100/30",
        isCollapsed ? "p-2" : "p-4"
      )}>
        <div className={cn(
          "border border-blue-100/30",
          isCollapsed ? "bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-2" : "bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4"
        )}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={cn(
                "bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25",
                isCollapsed ? "w-8 h-8" : "w-10 h-10"
              )}>
                <span className={cn(
                  "font-bold text-white",
                  isCollapsed ? "text-xs" : "text-sm"
                )}>
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-slate-600 truncate">
                  {user.email}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-slate-500">Online</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
