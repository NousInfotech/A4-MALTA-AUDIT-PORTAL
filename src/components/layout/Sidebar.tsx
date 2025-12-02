// @ts-nocheck
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
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
  Shield,
  Bell
} from 'lucide-react';
import { IconRobotFace } from '@tabler/icons-react';
import { useSidebarStats } from "@/contexts/SidebarStatsContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
{ 
  title: 'Prompt Management', 
  href: '/admin/prompts', 
  icon: IconRobotFace, 
  roles: ['admin'],
  description: 'Manage AI Prompts',
  badge: 'New'
},
{ 
  title: 'Branding Settings', 
  href: '/admin/branding', 
  icon: Settings, 
  roles: ['admin'],
  description: 'Customize Portal Appearance',
  badge: 'New'
},
{ 
  title: 'Notice Board', 
  href: '/admin/notice-board', 
  icon: Bell, 
  roles: ['admin'],
  description: 'Manage Notices & Announcements'
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
    icon: UserCheck, 
    roles: ['employee'],
    description: 'Know Your Client Workflows',
    badge: 'New'
  },
  { 
    title: 'Document request template', 
    href: '/employee/document-request-template', 
    icon: FileText, 
    roles: ['employee'],
    description: 'Document Request Templates',
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
  const { branding } = useBranding();
  const { stats, loading } = useSidebarStats();
  const isClientPortal= location.pathname.startsWith("/client");
  const isEmployeePortal= location.pathname.startsWith("/employee");
  const isAdminPortal= location.pathname.startsWith("/admin");

  if (!user) return null;

  const logoUrl = branding?.logo_url || '/logo.png';
  const orgName = branding?.organization_name || 'Audit Portal';
  const orgSubname = branding?.organization_subname || 'AUDIT & COMPLIANCE';

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
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          // container
          "flex flex-col transform transition-all duration-300 ease-in-out z-50",
          // mobile slide - only hide on mobile when not open
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          // desktop positioning - fixed when collapsed, absolute when expanded (floating)
          // Add margins so sidebar doesn't attach to screen edges
          isCollapsed 
            ? "md:fixed md:top-4 md:bottom-4 md:left-4 md:w-20 md:h-[calc(100vh-2rem)]" 
            : "md:absolute md:top-4 md:bottom-4 md:left-4 md:w-80 md:max-w-[4000px] md:h-[calc(100vh-2rem)]",
          // modern styling with curves on all corners
          "border-r shadow-xl",
          // Curved on all corners (top-left, top-right, bottom-left, bottom-right)
          "rounded-tl-[2rem] rounded-tr-[2rem] rounded-bl-[2rem] rounded-br-[2rem]"
        )}
        style={{
          backgroundColor: `hsl(${branding?.sidebar_background_color || '222 47% 11%'})`,
          color: `hsl(${branding?.sidebar_text_color || '220 14% 96%'})`,
          borderColor: `hsl(${branding?.sidebar_background_color || '222 47% 11%'} / 0.5)`
        }}
      >
      {/* Header */}
      <div 
        className={cn(
          "border-b relative",
        isCollapsed ? "p-4" : "p-6"
        )}
        style={{ borderColor: `hsl(var(--sidebar-border))` }}
      >
        <div className="flex items-center gap-4">
          <div className="relative">
            <div 
              className={cn(
                "rounded-2xl flex items-center justify-center shadow-lg",
              isCollapsed ? "w-12 h-12" : "w-16 h-16"
              )}
              style={{ 
                background: `linear-gradient(to bottom right, hsl(var(--sidebar-logo-bg)), hsl(var(--sidebar-hover)))`,
                borderColor: `hsl(var(--sidebar-border))`,
                borderWidth: '1px'
              }}
            >
              <img 
                src={logoUrl} 
                alt="Logo" 
                className={cn(
                  "object-contain rounded-lg",
                  isCollapsed ? "h-10 w-10" : "h-12 w-12"
                )} 
              />
            </div>
            {/* Subtle glow effect */}
            <div 
              className="absolute inset-0 rounded-2xl blur-sm"
              style={{ backgroundColor: `hsl(var(--sidebar-foreground) / 0.05)` }}
            ></div>
          </div>
          
          <div className={cn(
            "flex-1 transition-all duration-300 ease-in-out",
            isCollapsed ? "md:opacity-0 md:w-0 md:overflow-hidden" : "md:opacity-100 md:w-auto"
          )}>
            <div className="space-y-1">
              <h1 
                className="text-2xl font-bold tracking-tight"
                style={{ color: `hsl(var(--sidebar-foreground))` }}
              >
                {orgName}
              </h1>
              <p 
                className="text-xs font-medium uppercase tracking-wider opacity-70"
                style={{ color: `hsl(var(--sidebar-foreground))` }}
              >
                {orgSubname}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile close */}
        <button
          className="md:hidden absolute top-6 right-6 p-2 rounded-lg transition-colors"
          style={{
            backgroundColor: `hsl(var(--sidebar-hover))`,
            borderColor: `hsl(var(--sidebar-border))`,
            borderWidth: '1px'
          }}
          onClick={onClose}
          aria-label="Close Menu"
        >
          <div className="w-5 h-5 relative">
            <div className="absolute inset-0 rotate-45">
              <div 
                className="w-0.5 h-5 rounded-full"
                style={{ backgroundColor: `hsl(var(--sidebar-foreground))` }}
              ></div>
            </div>
            <div className="absolute inset-0 -rotate-45">
              <div 
                className="w-0.5 h-5 rounded-full"
                style={{ backgroundColor: `hsl(var(--sidebar-foreground))` }}
              ></div>
            </div>
          </div>
        </button>
      </div>
     
      {/* Quick Stats */}
      {!isCollapsed && !isClientPortal && !isAdminPortal && isEmployeePortal && (
        <div 
          className="px-4 py-3 border-b"
          style={{ borderColor: `hsl(var(--sidebar-border))` }}
        >
          <div 
            className="rounded-2xl p-3 border"
            style={{ 
              backgroundColor: `hsl(var(--sidebar-hover))`,
              borderColor: `hsl(var(--sidebar-border))`
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: `hsl(var(--sidebar-foreground))` }} />
                <span className="text-xs font-medium" style={{ color: `hsl(var(--sidebar-foreground))` }}>Today's Tasks</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: `hsl(var(--sidebar-foreground))` }}>
                {loading ? '...' : stats.todayTasks}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Calendar className="h-3 w-3 opacity-70" style={{ color: `hsl(var(--sidebar-foreground))` }} />
              <span className="text-xs opacity-70" style={{ color: `hsl(var(--sidebar-foreground))` }}>
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

            const linkContent = (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'group relative flex items-center transition-all duration-300 ease-out',
                  isCollapsed 
                    ? 'justify-center px-2 py-3 rounded-2xl' 
                    : 'gap-4 px-4 py-3 rounded-2xl',
                  'hover:scale-[1.02] hover:shadow-lg border'
                )}
                style={{
                  backgroundColor: isActive ? `hsl(var(--sidebar-active))` : 'transparent',
                  color: isActive ? `hsl(var(--sidebar-foreground))` : `hsl(var(--sidebar-foreground) / 0.8)`,
                  borderColor: isActive ? `hsl(var(--sidebar-border))` : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = `hsl(var(--sidebar-hover))`;
                    e.currentTarget.style.color = `hsl(var(--sidebar-foreground))`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = `hsl(var(--sidebar-foreground) / 0.8)`;
                  }
                }}
              >
                {/* Active indicator */}
                {isActive && !isCollapsed && (
                  <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full"
                    style={{ backgroundColor: `hsl(var(--accent))` }}
                  ></div>
                )}
                
                {/* Icon container */}
                <div 
                  className={cn(
                  'relative flex items-center justify-center transition-all duration-300',
                  isCollapsed ? 'w-8 h-8' : 'w-10 h-10',
                    'rounded-xl'
                  )}
                  style={{
                    backgroundColor: isActive ? `hsl(var(--accent))` : `hsl(var(--sidebar-hover))`,
                    color: isActive ? `hsl(var(--accent-foreground))` : `hsl(var(--sidebar-foreground))`
                  }}
                >
                  <Icon className={cn(
                    isCollapsed ? "h-4 w-4" : "h-5 w-5"
                  )} />
                </div>

                {/* Text content */}
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{item.title}</div>
                        {item.description && (
                          <div className="text-xs mt-0.5 truncate opacity-70">
                            {item.description}
                          </div>
                        )}
                      </div>
                      {item.badge && (
                        <div className="flex-shrink-0">
                          <div 
                            className="px-2 py-0.5 text-xs rounded-full font-medium border whitespace-nowrap min-w-fit"
                            style={{
                              backgroundColor: `hsl(var(--badge-background))`,
                              color: `hsl(var(--badge-foreground))`,
                              borderColor: `hsl(var(--accent))`
                            }}
                          >
                            {loading && item.getBadge ? '...' : item.badge}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}


                {/* Hover effect */}
                <div className={cn(
                  'absolute inset-0 transition-opacity duration-300 rounded-2xl pointer-events-none',
                  isActive ? 'opacity-0' : 'opacity-0 group-hover:opacity-10'
                )}
                style={{ backgroundColor: `hsl(var(--sidebar-foreground))` }}
                ></div>
              </Link>
            );

            // Wrap with tooltip when collapsed
            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {linkContent}
                  </TooltipTrigger>
                  <TooltipContent 
                    side="right" 
                    className="bg-sidebar-accent text-sidebar-accent-foreground border-sidebar-border shadow-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">{item.title}</p>
                      {item.description && (
                        <p className="text-xs opacity-80">{item.description}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </div>
      </nav>

      {/* Footer / User */}
      <div 
        className={cn(
          "border-t",
          isCollapsed ? "p-2" : "p-4"
        )}
        style={{ borderColor: `hsl(var(--sidebar-border))` }}
      >
        <div 
          className={cn(
            "border rounded-2xl",
            isCollapsed ? "p-2" : "p-4"
          )}
          style={{
            backgroundColor: `hsl(var(--sidebar-hover))`,
            borderColor: `hsl(var(--sidebar-border))`
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div 
                className={cn(
                  "rounded-2xl flex items-center justify-center",
                  isCollapsed ? "w-8 h-8" : "w-10 h-10"
                )}
                style={{ backgroundColor: `hsl(var(--accent))` }}
              >
                <span 
                  className={cn(
                    "font-bold",
                    isCollapsed ? "text-xs" : "text-sm"
                  )}
                  style={{ color: `hsl(var(--accent-foreground))` }}
                >
                  {user.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div 
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2"
                style={{ borderColor: `hsl(var(--sidebar-background))` }}
              ></div>
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p 
                  className="text-sm font-semibold truncate"
                  style={{ color: `hsl(var(--sidebar-foreground))` }}
                >
                  {user.name}
                </p>
                <p 
                  className="text-xs truncate opacity-70"
                  style={{ color: `hsl(var(--sidebar-foreground))` }}
                >
                  {user.email}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span 
                    className="text-xs opacity-70"
                    style={{ color: `hsl(var(--sidebar-foreground))` }}
                  >Online</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </TooltipProvider>
  );
};
