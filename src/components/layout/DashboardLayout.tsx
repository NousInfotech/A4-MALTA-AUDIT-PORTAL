import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChatWidget } from '@/components/chat/ChatWidget';

export const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-brand-body relative">
      {/* Sidebar for desktop & mobile */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
      />

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-40 md:hidden"
          style={{ backgroundColor: `hsl(var(--sidebar-background) / 0.2)` }}
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300",
          isSidebarCollapsed ? "md:ml-24" : "md:ml-[21rem]"
        )}
      >
        <Header
          onMenuClick={() => setIsSidebarOpen(true)}
          onSidebarToggle={handleSidebarToggle}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-brand-body">
          <Outlet />
        </main>
      </div>

      {/* Chat widget OUTSIDE main layout */}
      <ChatWidget />
    </div>
  );

};
