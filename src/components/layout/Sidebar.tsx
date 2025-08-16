// @ts-nocheck
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  Users,
  FileText,
  Settings,
  BarChart3,
  FolderOpen,
  UserCheck,
  Briefcase,
  Shield
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

const navItems: NavItem[] = [
  // Admin
  { title: 'Dashboard', href: '/admin', icon: BarChart3, roles: ['admin'] },
  { title: 'User Management', href: '/admin/users', icon: UserCheck, roles: ['admin'] },

  // Employee
  { title: 'Dashboard', href: '/employee', icon: BarChart3, roles: ['employee'] },
  { title: 'Clients', href: '/employee/clients', icon: Building2, roles: ['employee'] },
  { title: 'Engagements', href: '/employee/engagements', icon: Briefcase, roles: ['employee'] },
  { title: 'Library', href: '/employee/library', icon: FolderOpen, roles: ['employee'] },

  // Client
  { title: 'Dashboard', href: '/client', icon: BarChart3, roles: ['client'] },
  { title: 'My Engagements', href: '/client/engagements', icon: FolderOpen, roles: ['client'] },
  { title: 'Document Requests', href: '/client/requests', icon: FileText, roles: ['client'] }
];

export const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false); // desktop collapse

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div
      className={cn(
        // container
        "fixed inset-y-0 left-0 bg-sidebar text-sidebar-foreground flex flex-col transform transition-transform duration-300 ease-in-out z-50 md:static md:z-auto",
        // mobile slide
        isOpen ? "translate-x-0" : "-translate-x-full",
        // desktop width collapse animation
        "md:translate-x-0",
        isCollapsed ? "md:w-20" : "md:w-64",
        // animate width smoothly
        "transition-[transform,width]"
      )}
    >
      {/* Header */}
      <div className={cn(
        "p-4 md:p-6 border-b border-sidebar-border flex items-center",
        isCollapsed ? "justify-center md:justify-between" : "justify-between"
      )}>
        <div className={cn("flex items-center gap-2", isCollapsed && "md:gap-0")}>
          <Shield className="h-8 w-8 text-sidebar-primary shrink-0" />
          {/* Brand text animates in/out on collapse (desktop only) */}
          <div
            className={cn(
              "ml-2 overflow-hidden transition-all duration-300 ease-in-out hidden md:block",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
            )}
          >
            <h1 className="text-xl font-bold text-sidebar-foreground whitespace-nowrap">AuditPortal</h1>
            <p className="text-sm text-sidebar-foreground/60 capitalize whitespace-nowrap">{user.role} Panel</p>
          </div>
        </div>

        

        {/* Mobile close */}
        <button
          className="md:hidden p-2 -mr-2"
          onClick={onClose}
          aria-label="Close Menu"
        >
          ✕
        </button>
      </div>
          
      {/* Nav */}
      <nav className="flex-1 p-3 md:p-4 overflow-y-auto">
        <ul className="space-y-1.5">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.href ||
              (item.href !== `/${user.role}` && location.pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200',
                    isActive
                      ? 'bg-sidebar-foreground text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {/* Label animates width/opacity on desktop collapse */}
                  <span
                    className={cn(
                      "font-medium transition-all duration-300 ease-in-out",
                      "md:overflow-hidden md:whitespace-nowrap",
                      isCollapsed ? "md:w-0 md:opacity-0 md:scale-95" : "md:w-auto md:opacity-100 md:scale-100"
                    )}
                  >
                    {item.title}
                  </span>
                </Link>
                
              </li>
              
            );
          })}
          {/* Desktop collapse toggle */}
          <div className={`w-full flex items-center  ${isCollapsed ? "justify-center":"justify-start"}`}>
        <button
          type="button"
          
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setIsCollapsed(v => !v)}
          className={cn(
            "hidden md:inline-flex items-center justify-center rounded-md border border-sidebar-border",
            "text-sidebar-foreground hover:bg-sidebar-accent/50",
            "transition-all duration-200",
            isCollapsed ? "w-10 h-10 p-1 " : "w-auto h-auto p-1 shrink-0"
          )}
          title={isCollapsed ? "Expand" : "Collapse"}
        >{isCollapsed ? "" : "Collapse sidebar"}
          <svg
            className={cn("h-4 w-4 transition-transform duration-300", isCollapsed ? "rotate-180" : "rotate-0")}
            viewBox="0 0 20 20" fill="currentColor"
          >
            
            <path d="M12.707 15.707a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 0-1.414l4-4a1 1 0 1 1 1.414 1.414L10.414 10l2.293 2.293a1 1 0 0 1 0 1.414z" />
          </svg>
        </button>
          </div>
        </ul>
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-sidebar-primary-foreground">
              {user.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>

          {/* User meta hides in collapsed mode on desktop */}
          <div
            className={cn(
              "flex-1 min-w-0 transition-all duration-300 ease-in-out",
              "md:overflow-hidden",
              isCollapsed ? "md:w-0 md:opacity-0" : "md:w-auto md:opacity-100"
            )}
          >
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
