// @ts-nocheck
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Search, Menu, Settings, User, Sparkles, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NotificationBell } from '@/components/notifications';

export const Header = ({ onMenuClick, onSidebarToggle, isSidebarCollapsed }) => {
  const { logout, user } = useAuth();

  return (
    <header 
      className="h-16 backdrop-blur-xl border-b flex items-center justify-between px-6 sticky top-0 z-40"
      style={{
        backgroundColor: `hsl(var(--sidebar-background) / 0.8)`,
        borderColor: `hsl(var(--sidebar-border) / 0.5)`
      }}
    >
      <div className="flex items-center gap-4">
        {/* Hamburger - visible on mobile only */}
        <button
          className="md:hidden p-2 rounded-2xl hover:bg-brand-hover transition-colors"
          onClick={onMenuClick}
          aria-label="Open Menu"
        >
          <Menu className="h-5 w-5 text-brand-sidebar" />
        </button>

        {/* Sidebar toggle - visible on desktop only */}
        <button
          className="hidden md:flex p-2 rounded-2xl hover:bg-brand-hover transition-colors group"
          onClick={onSidebarToggle}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="h-5 w-5 group-hover:scale-110 transition-transform text-brand-sidebar" />
          ) : (
            <PanelLeftClose className="h-5 w-5 group-hover:scale-110 transition-transform text-brand-sidebar" />
          )}
        </button>

        {/* Search bar */}
        <div className="relative hidden sm:block">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-brand-sidebar" 
            style={{ opacity: 0.7 }}
          />
          <Input
            placeholder="Search anything..."
            className="pl-10 w-80 placeholder:opacity-90 transition-colors rounded-2xl text-brand-sidebar"
            style={{
              backgroundColor: `hsl(var(--sidebar-hover) / 0.5)`,
              borderColor: `hsl(var(--sidebar-border))`,
            }}
          />


        </div>

        {/* Quick actions */}
        {/* <div className="hidden lg:flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium hover:bg-brand-hover text-brand-sidebar rounded-2xl"
          >
            <Sparkles className="h-3 w-3 mr-1 opacity-70" />
            Quick Actions
          </Button>
        </div> */}
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationBell className="h-9 w-9 rounded-2xl hover:bg-brand-hover" />

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-2xl hover:bg-brand-hover"
        >
          <Settings className="h-4 w-4 text-brand-sidebar" />
        </Button>

        {/* User profile */}
        <div 
          className="flex items-center gap-3 pl-3 border-l"
          style={{ borderColor: `hsl(var(--sidebar-border))` }}
        >
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-brand-sidebar">{user?.name}</p>
            <p className="text-xs text-brand-sidebar opacity-70 capitalize">
              {user?.role}
            </p>
          </div>

          {/* User avatar */}
          <div className="relative">
            <div 
              className="w-8 h-8 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `hsl(var(--sidebar-hover))` }}
            >
              <User className="h-4 w-4 text-brand-sidebar" />
            </div>
            <div 
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2"
              style={{ borderColor: `hsl(var(--sidebar-background))` }}
            ></div>
          </div>

          {/* Logout button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-9 w-9 rounded-2xl text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
