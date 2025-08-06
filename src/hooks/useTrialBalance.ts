import { useState } from 'react';
import { engagementApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export interface TrialBalanceData {
  _id: string;
  engagement: string;
  headers: string[];
  rows: any[][];
  fetchedAt: string;
}

export const useTrialBalance = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTrialBalance = async (engagementId: string, sheetUrl?: string) => {
    try {
      setLoading(true);
      const data = await engagementApi.fetchTrialBalance(engagementId, sheetUrl);
      toast({
        title: "Success",
        description: "Trial balance data fetched successfully",
      });
      return data;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch trial balance data",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getTrialBalance = async (engagementId: string) => {
    try {
      return await engagementApi.getTrialBalance(engagementId);
    } catch (error) {
      // Don't show error toast for missing trial balance
      return null;
    }
  };

  return {
    loading,
    fetchTrialBalance,
    getTrialBalance
  };
};
