// @ts-nocheck
import { useState, useEffect } from 'react';
import { documentRequestApi, getSocket } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export interface DocumentRequest {
  _id: string;
  engagement: string;
  clientId: string;
  category: string;
  description: string;
  status: 'pending' | 'completed';
  requestedAt: string;
  completedAt?: string;
  documents: Array<{
    name: string;
    url: string;
    uploadedAt: string;
  }>;
}

export const useDocumentRequests = (engagementId?: string) => {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    if (!engagementId) return;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching document requests for engagement:', engagementId);
      const data = await documentRequestApi.getByEngagement(engagementId);
      console.log('📋 Fetched document requests data:', data);
      setRequests(data);
    } catch (error) {
      console.error('❌ Error fetching document requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch document requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (data: {
    category: string;
    description: string;
    comment?: string;
    clientId: string;
  }) => {
    if (!engagementId) return;

    try {
      const newRequest = await documentRequestApi.create({
        engagementId,
        ...data
      });
      setRequests(prev => [...prev, newRequest]);
      toast({
        title: "Success",
        description: "Document request sent successfully",
      });
      return newRequest;
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [engagementId]);

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (socket && engagementId) {
      socket.emit('joinEngagement', engagementId);
      
      return () => {
        socket.emit('leaveEngagement', engagementId);
      };
    }
  }, [engagementId]);

  return {
    requests,
    loading,
    createRequest,
    refetch: fetchRequests
  };
};
