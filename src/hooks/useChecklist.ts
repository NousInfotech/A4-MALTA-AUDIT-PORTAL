import { useState, useEffect } from 'react';
import { checklistApi, getSocket } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export interface ChecklistItem {
  _id: string;
  engagement: string;
  key: string;
  description: string;
  category: string;
  completed: boolean;
}

export const useChecklist = (engagementId?: string) => {
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchChecklist = async () => {
    if (!engagementId) return;
    
    try {
      setLoading(true);
      const data = await checklistApi.getByEngagement(engagementId);
      setItems(data);
      
      // Convert to key-value format for easy access
      const checklistMap: Record<string, boolean> = {};
      data.forEach((item: ChecklistItem) => {
        checklistMap[item.key] = item.completed;
      });
      setChecklist(checklistMap);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch checklist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (key: string) => {
    const item = items.find(i => i.key === key);
    if (!item) return;

    try {
      const newCompleted = !item.completed;
      await checklistApi.updateItem(item._id, { completed: newCompleted });
      
      setChecklist(prev => ({ ...prev, [key]: newCompleted }));
      setItems(prev => prev.map(i => 
        i.key === key ? { ...i, completed: newCompleted } : i
      ));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update checklist item",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchChecklist();
  }, [engagementId]);

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (socket && engagementId) {
      const handleChecklistUpdate = (updatedItem: ChecklistItem) => {
        setChecklist(prev => ({ ...prev, [updatedItem.key]: updatedItem.completed }));
        setItems(prev => prev.map(item => 
          item._id === updatedItem._id ? updatedItem : item
        ));
      };

      socket.on('checklist:update', handleChecklistUpdate);
      
      return () => {
        socket.off('checklist:update', handleChecklistUpdate);
      };
    }
  }, [engagementId]);

  return {
    checklist,
    items,
    loading,
    toggle,
    refetch: fetchChecklist
  };
};
