// @ts-nocheck
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const Header = ({ onMenuClick }) => {
  const { logout, user } = useAuth();

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {/* Hamburger - visible on mobile only */}
        <button
          className="md:hidden p-2"
          onClick={onMenuClick}
          aria-label="Open Menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder="Search..." className="pl-10 w-80" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={logout}
            className="text-destructive hover:text-destructive-foreground hover:bg-destructive"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
