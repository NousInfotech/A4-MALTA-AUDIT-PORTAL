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

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

const navItems: NavItem[] = [
  // Admin navigation
  {
    title: 'Dashboard',
    href: '/admin',
    icon: BarChart3,
    roles: ['admin']
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: UserCheck,
    roles: ['admin']
  },
  
  // Employee navigation
  {
    title: 'Dashboard',
    href: '/employee',
    icon: BarChart3,
    roles: ['employee']
  },
  {
    title: 'Clients',
    href: '/employee/clients',
    icon: Building2,
    roles: ['employee']
  },
  {
    title: 'Engagements',
    href: '/employee/engagements',
    icon: Briefcase,
    roles: ['employee']
  },
  {
    title: 'Library',
    href: '/employee/library',
    icon: FolderOpen,
    roles: ['employee']
  },
  
  // Client navigation
  {
    title: 'Dashboard',
    href: '/client',
    icon: BarChart3,
    roles: ['client']
  },
  {
    title: 'My Engagements',
    href: '/client/engagements',
    icon: FolderOpen,
    roles: ['client']
  },
  {
    title: 'Document Requests',
    href: '/client/requests',
    icon: FileText,
    roles: ['client']
  }
];

export const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-sidebar-primary" />
          <div>
            <h1 className="text-xl font-bold text-sidebar-primary-foreground">AuditPortal</h1>
            <p className="text-sm text-sidebar-foreground/60 capitalize">{user.role} Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
              (item.href !== `/${user.role}` && location.pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200',
                    isActive
                      ? 'bg-sidebar-foreground text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
            <span className="text-sm font-semibold text-sidebar-primary-foreground">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-primary-foreground truncate">
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