// @ts-nocheck

import { useState, useEffect, useCallback } from "react";
import { adjustmentApi } from "@/services/api";

interface AdjustmentEntry {
  etbRowId: string;
  code: string;
  accountName: string;
  dr?: number;
  cr?: number;
  details?: string;
}

interface Adjustment {
  _id: string;
  engagementId: string;
  etbId: string;
  adjustmentNo: string;
  description: string;
  status: "draft" | "posted";
  entries: AdjustmentEntry[];
  totalDr: number;
  totalCr: number;
  createdAt: string;
  updatedAt: string;
}

interface UseAdjustmentOptions {
  engagementId?: string;
  etbId?: string;
  autoFetch?: boolean;
}

export const useAdjustment = (options: UseAdjustmentOptions = {}) => {
  const { engagementId, etbId, autoFetch = true } = options;

  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [currentAdjustment, setCurrentAdjustment] = useState<Adjustment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch adjustments by engagement ID
   */
  const fetchByEngagement = useCallback(async (engId: string) => {
    if (!engId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await adjustmentApi.getByEngagement(engId);
      if (response.success) {
        setAdjustments(response.data || []);
      } else {
        throw new Error(response.message || "Failed to fetch adjustments");
      }
    } catch (err: any) {
      setError(err.message);
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch adjustments by ETB ID
   */
  const fetchByETB = useCallback(async (etbIdParam: string) => {
    if (!etbIdParam) return;

    setLoading(true);
    setError(null);

    try {
      const response = await adjustmentApi.getByETB(etbIdParam);
      if (response.success) {
        setAdjustments(response.data || []);
      } else {
        throw new Error(response.message || "Failed to fetch adjustments");
      }
    } catch (err: any) {
      setError(err.message);
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch a single adjustment by ID
   */
  const fetchById = useCallback(async (id: string) => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await adjustmentApi.getById(id);
      if (response.success) {
        setCurrentAdjustment(response.data);
        return response.data;
      } else {
        throw new Error(response.message || "Failed to fetch adjustment");
      }
    } catch (err: any) {
      setError(err.message);
      setCurrentAdjustment(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new adjustment
   */
  const createAdjustment = useCallback(async (data: {
    engagementId: string;
    etbId: string;
    adjustmentNo: string;
    description?: string;
    entries?: AdjustmentEntry[];
  }) => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await adjustmentApi.create(data);
      if (response.success) {
        // Refresh the list
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to create adjustment");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Update an existing adjustment
   */
  const updateAdjustment = useCallback(async (
    id: string,
    data: {
      description?: string;
      entries?: AdjustmentEntry[];
    }
  ) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await adjustmentApi.update(id, data);
      if (response.success) {
        // Update current adjustment if it's the one being edited
        if (currentAdjustment?._id === id) {
          setCurrentAdjustment(response.data);
        }
        // Refresh the list
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to update adjustment");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [currentAdjustment, engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Post an adjustment (apply to ETB)
   */
  const postAdjustment = useCallback(async (id: string) => {
    setIsPosting(true);
    setError(null);

    try {
      const response = await adjustmentApi.post(id);
      if (response.success) {
        // Update current adjustment if it's the one being posted
        if (currentAdjustment?._id === id) {
          setCurrentAdjustment(response.data.adjustment);
        }
        // Refresh the list
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to post adjustment");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsPosting(false);
    }
  }, [currentAdjustment, engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Unpost an adjustment (reverse ETB impact)
   */
  const unpostAdjustment = useCallback(async (id: string) => {
    setIsPosting(true);
    setError(null);

    try {
      const response = await adjustmentApi.unpost(id);
      if (response.success) {
        // Update current adjustment if it's the one being unposted
        if (currentAdjustment?._id === id) {
          setCurrentAdjustment(response.data.adjustment);
        }
        // Refresh the list
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to unpost adjustment");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsPosting(false);
    }
  }, [currentAdjustment, engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Delete an adjustment
   */
  const deleteAdjustment = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await adjustmentApi.delete(id);
      if (response.success) {
        // Clear current adjustment if it's the one being deleted
        if (currentAdjustment?._id === id) {
          setCurrentAdjustment(null);
        }
        // Refresh the list
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to delete adjustment");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [currentAdjustment, engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Refetch adjustments
   */
  const refetch = useCallback(() => {
    if (engagementId) {
      return fetchByEngagement(engagementId);
    } else if (etbId) {
      return fetchByETB(etbId);
    }
  }, [engagementId, etbId, fetchByEngagement, fetchByETB]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      if (engagementId) {
        fetchByEngagement(engagementId);
      } else if (etbId) {
        fetchByETB(etbId);
      }
    }
  }, [engagementId, etbId, autoFetch, fetchByEngagement, fetchByETB]);

  return {
    // Data
    adjustments,
    currentAdjustment,
    
    // Loading states
    loading,
    isCreating,
    isUpdating,
    isPosting,
    isDeleting,
    
    // Error
    error,
    
    // Methods
    fetchByEngagement,
    fetchByETB,
    fetchById,
    createAdjustment,
    updateAdjustment,
    postAdjustment,
    unpostAdjustment,
    deleteAdjustment,
    refetch,
    
    // Setters
    setCurrentAdjustment,
    clearError: () => setError(null),
  };
};

