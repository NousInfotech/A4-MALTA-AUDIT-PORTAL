// @ts-nocheck
import { useState, useEffect } from 'react';
import { engagementApi, documentRequestApi } from '@/services/api';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSidebarStats = (userRole: string) => {
  const [stats, setStats] = useState({
    todayTasks: 0,
    nextTask: 'No upcoming tasks',
    activeEngagements: 0,
    pendingRequests: 0,
    totalClients: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch engagements
      const engagements = await engagementApi.getAll();
      const activeEngagements = engagements.filter(eng => eng.status === 'active').length;
      
      // Fetch document requests for client role
      let pendingRequests = 0;
      if (userRole === 'client') {
        const clientEngagements = await engagementApi.getClientEngagements();
        const allRequests = await Promise.all(
          clientEngagements.map(eng => documentRequestApi.getByEngagement(eng._id))
        );
        pendingRequests = allRequests.flat().filter(req => req.status === 'pending').length;
      }
      
      // Fetch total clients for employee role
      let totalClients = 0;
      if (userRole === 'employee') {
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select('user_id')
          .eq('role', 'client');
        
        if (!error) {
          totalClients = profiles.length;
        }
      }
      
      // Calculate today's tasks (simplified - could be enhanced with actual task data)
      const todayTasks = activeEngagements + pendingRequests;
      
      // Determine next task
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
      
    } catch (error) {
      console.error('Error fetching sidebar stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch sidebar statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userRole]);

  return {
    stats,
    loading,
    refetch: fetchStats
  };
};
