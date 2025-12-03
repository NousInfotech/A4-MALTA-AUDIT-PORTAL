// @ts-nocheck
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Menu, Settings, User, Sparkles, PanelLeftClose, PanelLeft } from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import { useNavigate } from 'react-router-dom';

export const Header = ({ onMenuClick, onSidebarToggle, isSidebarCollapsed }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  return (
    <header 
      className="h-16 backdrop-blur-xl border flex items-center justify-between px-6 sticky top-0 z-40 rounded-[2rem] m-2 mb-0 mr-2 bg-background/80 shadow-lg"
      style={{
        borderColor: `hsl(var(--border))`,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div className="flex items-center gap-4">
        {/* Hamburger - visible on mobile only */}
        <button
          className="md:hidden p-2 rounded-2xl hover:bg-muted transition-colors"
          onClick={onMenuClick}
          aria-label="Open Menu"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>

        {/* Sidebar toggle - visible on desktop only */}
        <button
          className="hidden md:flex p-2 rounded-2xl hover:bg-muted transition-colors group"
          onClick={onSidebarToggle}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="h-5 w-5 group-hover:scale-110 transition-transform text-foreground" />
          ) : (
            <PanelLeftClose className="h-5 w-5 group-hover:scale-110 transition-transform text-foreground" />
          )}
        </button>


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
        <NotificationBell className="h-9 w-9 rounded-2xl bg-foreground/90 hover:bg-background text-background" />

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-2xl hover:bg-muted"
          aria-label="Open settings"
          title="Settings"
          onClick={() => {
            if (user?.role === 'admin') {
              navigate('/admin/settings');
            } else if (user?.role === 'employee') {
              navigate('/employee/settings');
            } else if (user?.role === 'client') {
              navigate('/client/settings');
            } else {
              navigate('/settings/notifications');
            }
          }}
        >
          <Settings className="h-4 w-4 text-foreground" />
        </Button>

        {/* User profile */}
        <div 
          className="flex items-center gap-3 pl-3 border-l"
          style={{ borderColor: `hsl(var(--border))` }}
        >
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>

          {/* User avatar */}
          <div className="relative">
            <div 
              className="w-8 h-8 rounded-2xl flex items-center justify-center bg-muted"
            >
              <User className="h-4 w-4 text-foreground" />
            </div>
            <div 
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background"
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
