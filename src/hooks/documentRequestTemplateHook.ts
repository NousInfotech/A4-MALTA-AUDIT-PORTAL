import { useEffect, useState } from "react";
import {
  getDrList,
  createDr,
  updateDr,
  deleteDr,
  type DocumentRequestTemplate,
} from "@/lib/api/documentRequestTemplate";
import { useToast } from "@/hooks/use-toast";

export const useDrList = () => {
  const [drList, setDrList] = useState<DocumentRequestTemplate[]>([]);
  const { toast } = useToast();

  const loadDrList = async () => {
    try {
      const res = await getDrList();
      setDrList(res.data.data || []);
    } catch (err) {
      console.error("loadDrList error", err);
      toast({
        title: "Error",
        description: "Failed to load document templates",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadDrList();
  }, []);

  const createDrList = async (payload: Partial<DocumentRequestTemplate>) => {
    try {
      await createDr(payload);
      toast({ title: "Created", description: "Document template created" });
      await loadDrList();
    } catch (err) {
      console.error("createDrList error", err);
      toast({
        title: "Error",
        description: "Failed to create document",
        variant: "destructive",
      });
    }
  };

  const updateDrList = async (id: string, payload: Partial<DocumentRequestTemplate>) => {
    try {
      await updateDr(id, payload);
      toast({ title: "Updated", description: "Document template updated" });
      await loadDrList();
    } catch (err) {
      console.error("updateDrList error", err);
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive",
      });
    }
  };

  const deleteDrList = async (id: string) => {
    try {
      await deleteDr(id);
      toast({ title: "Deleted", description: "Document template deleted" });
      await loadDrList();
    } catch (err) {
      console.error("deleteDrList error", err);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  return {
    drList,
    setDrList,
    loadDrList,
    createDrList,
    updateDrList,
    deleteDrList,
  };
};
