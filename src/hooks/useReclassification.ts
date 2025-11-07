// @ts-nocheck

import { useState, useEffect, useCallback } from "react";
import { reclassificationApi } from "@/services/api";

interface ReclassificationEntry {
  etbRowId: string;
  code: string;
  accountName: string;
  dr?: number;
  cr?: number;
  details?: string;
}

interface Reclassification {
  _id: string;
  engagementId: string;
  etbId: string;
  reclassificationNo: string;
  description: string;
  status: "draft" | "posted";
  entries: ReclassificationEntry[];
  totalDr: number;
  totalCr: number;
  createdAt: string;
  updatedAt: string;
}

interface UseReclassificationOptions {
  engagementId?: string;
  etbId?: string;
  autoFetch?: boolean;
}

export const useReclassification = (options: UseReclassificationOptions = {}) => {
  const { engagementId, etbId, autoFetch = true } = options;

  const [reclassifications, setReclassifications] = useState<Reclassification[]>([]);
  const [currentReclassification, setCurrentReclassification] = useState<Reclassification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Fetch reclassifications by engagement ID
   */
  const fetchByEngagement = useCallback(async (engId: string) => {
    if (!engId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await reclassificationApi.getByEngagement(engId);
      if (response.success) {
        setReclassifications(response.data || []);
      } else {
        throw new Error(response.message || "Failed to fetch reclassifications");
      }
    } catch (err: any) {
      setError(err.message);
      setReclassifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch reclassifications by ETB ID
   */
  const fetchByETB = useCallback(async (etbIdParam: string) => {
    if (!etbIdParam) return;

    setLoading(true);
    setError(null);

    try {
      const response = await reclassificationApi.getByETB(etbIdParam);
      if (response.success) {
        setReclassifications(response.data || []);
      } else {
        throw new Error(response.message || "Failed to fetch reclassifications");
      }
    } catch (err: any) {
      setError(err.message);
      setReclassifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch a single reclassification by ID
   */
  const fetchById = useCallback(async (id: string) => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await reclassificationApi.getById(id);
      if (response.success) {
        setCurrentReclassification(response.data);
        return response.data;
      } else {
        throw new Error(response.message || "Failed to fetch reclassification");
      }
    } catch (err: any) {
      setError(err.message);
      setCurrentReclassification(null);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new reclassification
   */
  const createReclassification = useCallback(async (data: {
    engagementId: string;
    etbId: string;
    reclassificationNo: string;
    description?: string;
    entries?: ReclassificationEntry[];
  }) => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await reclassificationApi.create(data);
      if (response.success) {
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to create reclassification");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Update an existing reclassification
   */
  const updateReclassification = useCallback(async (
    id: string,
    data: {
      description?: string;
      entries?: ReclassificationEntry[];
    }
  ) => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await reclassificationApi.update(id, data);
      if (response.success) {
        if (currentReclassification?._id === id) {
          setCurrentReclassification(response.data);
        }
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to update reclassification");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [currentReclassification, engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Post a reclassification (apply to ETB)
   */
  const postReclassification = useCallback(async (id: string) => {
    setIsPosting(true);
    setError(null);

    try {
      const response = await reclassificationApi.post(id);
      if (response.success) {
        if (currentReclassification?._id === id) {
          setCurrentReclassification(response.data.reclassification);
        }
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to post reclassification");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsPosting(false);
    }
  }, [currentReclassification, engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Unpost a reclassification (reverse ETB impact)
   */
  const unpostReclassification = useCallback(async (id: string) => {
    setIsPosting(true);
    setError(null);

    try {
      const response = await reclassificationApi.unpost(id);
      if (response.success) {
        if (currentReclassification?._id === id) {
          setCurrentReclassification(response.data.reclassification);
        }
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to unpost reclassification");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsPosting(false);
    }
  }, [currentReclassification, engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Delete a reclassification
   */
  const deleteReclassification = useCallback(async (id: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await reclassificationApi.delete(id);
      if (response.success) {
        if (currentReclassification?._id === id) {
          setCurrentReclassification(null);
        }
        if (engagementId) {
          await fetchByEngagement(engagementId);
        } else if (etbId) {
          await fetchByETB(etbId);
        }
        return response.data;
      } else {
        throw new Error(response.message || "Failed to delete reclassification");
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [currentReclassification, engagementId, etbId, fetchByEngagement, fetchByETB]);

  /**
   * Refetch reclassifications
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
    reclassifications,
    currentReclassification,

    loading,
    isCreating,
    isUpdating,
    isPosting,
    isDeleting,

    error,

    fetchByEngagement,
    fetchByETB,
    fetchById,
    createReclassification,
    updateReclassification,
    postReclassification,
    unpostReclassification,
    deleteReclassification,
    refetch,

    setCurrentReclassification,
    clearError: () => setError(null),
  };
};

