import { useEffect, useState, useRef } from "react";
import {
  getDrList,
  createDr,
  updateDr,
  deleteDr,
  bulkUpdateDr,
  bulkDeleteDr,
  type DocumentRequestTemplate,
} from "@/lib/api/documentRequestTemplate";
import { useToast } from "@/hooks/use-toast";

export const useDrList = () => {
  const [drList, setDrList] = useState<DocumentRequestTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Prevent state update on unmounted component
  const mounted = useRef(true);
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // Common error handler
  const showError = (description: string) => {
    toast({
      title: "Error",
      description,
      variant: "destructive"
    });
  };

  const loadDrList = async () => {
    setLoading(true);
    try {
      const res = await getDrList();
      const list = res?.data?.data || [];
      if (mounted.current) setDrList(list);
    } catch (err) {
      console.error("loadDrList error", err);
      showError("Failed to load document templates");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadDrList();
  }, []);

  // === CRUD OPERATIONS ===
  const createDR = async (payload: Partial<DocumentRequestTemplate>) => {
    try {
      const res = await createDr(payload, payload.category);
      const newItem = res?.data?.data;

      if (newItem) {
        setDrList(prev => [...prev, newItem]); // Optimistic update
      } else {
        await loadDrList();
      }

      toast({ title: "Created", description: "Document template created" });
    } catch (err) {
      console.error("createDR error", err);
      showError("Failed to create document");
    }
  };

  const updateDR = async (id: string, payload: Partial<DocumentRequestTemplate>) => {
    try {
      const res = await updateDr(id, payload, payload.category);
      const updatedItem = res?.data?.data;

      setDrList(prev =>
        prev.map(item =>
          item._id === id ? (updatedItem || { ...item, ...payload }) : item
        )
      );

      toast({ title: "Updated", description: "Document template updated" });
    } catch (err) {
      console.error("updateDR error", err);
      showError("Failed to update document");
    }
  };

  const deleteDR = async (id: string) => {
    try {
      await deleteDr(id);

      // Remove item locally (no reload needed)
      setDrList(prev => prev.filter(item => item._id !== id));

      toast({ title: "Deleted", description: "Document template deleted" });
    } catch (err) {
      console.error("deleteDR error", err);
      showError("Failed to delete document");
    }
  };

  // === BULK OPERATIONS ===
  const updateDRList = async (payload: Partial<DocumentRequestTemplate>[]) => {
    try {
      const res = await bulkUpdateDr(payload);
      const updatedList = res?.data?.data || [];

      setDrList(updatedList);

      toast({ title: "Updated", description: "Document templates updated" });
    } catch (err) {
      console.error("updateDRList error", err);
      showError("Failed to update document templates");
    }
  };

  const deleteDRList = async (ids: string[]) => {
    try {
      await bulkDeleteDr(ids);

      setDrList(prev => prev.filter(item => !ids.includes(item._id)));

      toast({ title: "Deleted", description: "Document templates deleted" });
    } catch (err) {
      console.error("deleteDRList error", err);
      showError("Failed to delete document templates");
    }
  };

  return {
    drList,
    loading,
    loadDrList,
    createDR,
    updateDR,
    deleteDR,
    updateDRList,
    deleteDRList,
  };
};
