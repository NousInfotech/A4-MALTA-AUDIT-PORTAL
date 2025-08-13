// @ts-nocheck
import { useState, useEffect } from 'react';
import { engagementApi, getSocket } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export interface Engagement {
  _id: string;
  clientId: string;
  title: string;
  yearEndDate: string;
  status: 'draft' | 'active' | 'completed';
  trialBalanceUrl?: string;
  trialBalance?: string;
  createdAt: string;
  createdBy: string;
}

export const useEngagements = () => {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEngagements = async () => {
    try {
      setLoading(true);
      const data = await engagementApi.getAll();
      setEngagements(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch engagements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

    const fetchClientEngagements = async () => {
    try {
      setLoading(true);
      const data = await engagementApi.getClientEngagements();
      setEngagements(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch engagements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createEngagement = async (data: {
    clientId: string;
    title: string;
    yearEndDate: string;
    trialBalanceUrl: string;
  }) => {
    try {
      const newEngagement = await engagementApi.create(data);
      setEngagements(prev => [...prev, newEngagement]);
      return newEngagement;
    } catch (error) {
      throw error;
    }
  };

  const updateEngagement = async (id: string, data: any) => {
    try {
      const updated = await engagementApi.update(id, data);
      setEngagements(prev => prev.map(eng => eng._id === id ? updated : eng));
      return updated;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    fetchEngagements();
  }, []);

  return {
    engagements,
    loading,
    createEngagement,
    updateEngagement,
    refetch: fetchEngagements
  };
};
