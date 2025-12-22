// @ts-nocheck
import { useState, useEffect } from 'react';
import { checklistApi, getSocket } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItem {
  _id: string;
  engagement: string;
  key: string;
  description: string;
  category: string;
  subcategory: string;
  completed: boolean;
  fieldType: 'checkbox' | 'text' | 'date' | 'select';
  textValue?: string;
  dateValue?: string;
  selectValue?: string;
  selectOptions?: string[];
  isNotApplicable?: boolean;
}

export const useChecklist = (engagementId: string | undefined) => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!engagementId) return;

    const fetchChecklist = async () => {
      try {
        setLoading(true);
        const items = await checklistApi.getByEngagement(engagementId);
        setChecklist(items);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to fetch checklist',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchChecklist();

    // Set up Socket.IO listeners for real-time updates
    const socket = getSocket();
    if (socket) {
      // Join the engagement room
      socket.emit('joinEngagement', engagementId);

      // Listen for checklist updates
      socket.on('checklist:update', (updatedItem: ChecklistItem) => {
        setChecklist(prev =>
          prev.map(item =>
            item._id === updatedItem._id ? updatedItem : item
          )
        );
      });

      // Cleanup on unmount
      return () => {
        socket.emit('leaveEngagement', engagementId);
        socket.off('checklist:update');
      };
    }
  }, [engagementId, toast]);

  const updateItem = async (
    id: string,
    data: {
      completed?: boolean;
      textValue?: string;
      dateValue?: string;
      selectValue?: string;
      isNotApplicable?: boolean;
    }
  ) => {
    try {
      await checklistApi.updateItem(id, data);
      // The real-time update will be handled by the socket listener
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update checklist item',
        variant: 'destructive',
      });
    }
  };

  // Group checklist items by category and subcategory
  const groupedChecklist = checklist.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = {};
    }
    if (!acc[item.category][item.subcategory]) {
      acc[item.category][item.subcategory] = [];
    }
    acc[item.category][item.subcategory].push(item);
    return acc;
  }, {} as Record<string, Record<string, ChecklistItem[]>>);

  return {
    checklist,
    groupedChecklist,
    loading,
    updateItem,
  };
};
