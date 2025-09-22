// @ts-nocheck
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Search, Menu, Bell, Settings, User, Sparkles, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const Header = ({ onMenuClick, onSidebarToggle, isSidebarCollapsed }) => {
  const { logout, user } = useAuth();

  return (
    <header className="h-16 bg-gray-800/80 backdrop-blur-xl border-b border-gray-700/50 flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {/* Hamburger - visible on mobile only */}
        <button
          className="md:hidden p-2 rounded-2xl hover:bg-gray-700/50 transition-colors"
          onClick={onMenuClick}
          aria-label="Open Menu"
        >
          <Menu className="h-5 w-5 text-gray-300" />
        </button>

        {/* Sidebar toggle - visible on desktop only */}
        <button
          className="hidden md:flex p-2 rounded-2xl hover:bg-gray-700/50 transition-colors group"
          onClick={onSidebarToggle}
          aria-label={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeft className="h-5 w-5 group-hover:scale-110 transition-transform text-gray-300" />
          ) : (
            <PanelLeftClose className="h-5 w-5 group-hover:scale-110 transition-transform text-gray-300" />
          )}
        </button>

        {/* Search bar */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 h-4 w-4" />
          <Input
            placeholder="Search anything..."
            className="pl-10 w-80 placeholder:text-white/90 placeholder:opacity-100 bg-gray-700/50 border-gray-600 focus:border-gray-500 focus:ring-gray-500/20 transition-colors rounded-2xl text-white"
          />


        </div>

        {/* Quick actions */}
        <div className="hidden lg:flex items-center gap-2 ml-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium hover:bg-gray-700/50 text-gray-300 rounded-2xl"
          >
            <Sparkles className="h-3 w-3 mr-1 text-gray-400" />
            Quick Actions
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-2xl hover:bg-gray-700/50"
        >
          <Bell className="h-4 w-4 text-gray-300" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-2xl hover:bg-gray-700/50"
        >
          <Settings className="h-4 w-4 text-gray-300" />
        </Button>

        {/* User profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-700">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">
              {user?.role}
            </p>
          </div>

          {/* User avatar */}
          <div className="relative">
            <div className="w-8 h-8 bg-gray-600 rounded-2xl flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-800"></div>
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
