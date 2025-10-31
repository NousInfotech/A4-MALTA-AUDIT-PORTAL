
// src/contexts/SidebarStatsContext.tsx
import React, { createContext, useContext } from "react";
import { useSidebarStats as useSidebarStatsHook } from "@/hooks/useSidebarStats";

const SidebarStatsContext = createContext<any>(null);

export const SidebarStatsProvider = ({ children }: { children: React.ReactNode }) => {
  const statsState = useSidebarStatsHook(); // contains stats, loading, refetch
  return (
    <SidebarStatsContext.Provider value={statsState}>
      {children}
    </SidebarStatsContext.Provider>
  );
};

export const useSidebarStats = () => {
  const context = useContext(SidebarStatsContext);
  if (!context) {
    throw new Error("useSidebarStats must be used within SidebarStatsProvider");
  }
  return context;
};
