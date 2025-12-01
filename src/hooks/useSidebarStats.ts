// src/hooks/useSidebarStats.ts
import { useState, useEffect, useCallback } from 'react';
import { engagementApi, documentRequestApi } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export const useSidebarStats = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [stats, setStats] = useState({
    todayTasks: 0,
    nextTask: 'No upcoming tasks',
    activeEngagements: 0,
    pendingRequests: 0,
    totalClients: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    if (!user || isAuthLoading) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const userRole = user.role;

      const engagements = (await engagementApi.getAll()) || [];
      const activeEngagements = engagements.filter(eng => eng.status === 'active').length;

      let pendingRequests = 0;
      if (userRole === 'client') {
        const clientEngagements = (await engagementApi.getClientEngagements()) || [];
        const allRequestsPromises = clientEngagements.map(async eng => {
          try {
            return (await documentRequestApi.getByEngagement(eng._id)) || [];
          } catch (docReqError) {
            console.error(`Error fetching document requests for engagement ${eng._id}:`, docReqError);
            return [];
          }
        });
        const allRequests = (await Promise.all(allRequestsPromises)).flat();
        pendingRequests = allRequests.filter(req => req.status === 'pending').length;
      }

      let totalClients = 0;
      if (userRole === 'employee') {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select('user_id')
          .eq('role', 'client')
          .eq('organization_id',user?.organizationId)

        if (!error && profiles) {
          totalClients = profiles.length;
        } else if (error) {
          console.error("Error fetching client profiles:", error);
        }
      }

      const todayTasks = activeEngagements + pendingRequests;

      let nextTask = 'No upcoming tasks';
      if (activeEngagements > 0) {
        nextTask = 'Client Review';
      } else if (pendingRequests > 0) {
        nextTask = 'Document Review';
      }

      setStats({
        todayTasks,
        nextTask,
        activeEngagements,
        pendingRequests,
        totalClients
      });

    } catch (error: any) {
      console.error('Error fetching sidebar stats:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch sidebar statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, isAuthLoading, toast]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined; // Declare interval here

    if (!isAuthLoading && user) {
      fetchStats();

      interval = setInterval(fetchStats, 5 * 60 * 1000);
    }

    return () => {
      if (interval) { // Only clear if interval was actually set
        clearInterval(interval);
      }
    };
  }, [user, isAuthLoading, fetchStats]);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
};