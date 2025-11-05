// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';

const API_URL = import.meta.env.VITE_APIURL || 'http://localhost:8000';

interface TourProgress {
  user_id: string;
  completed_tours: string[];
  skipped_tours: string[];
  last_tour_date: string | null;
}

interface TourContextType {
  tourProgress: TourProgress | null;
  isLoading: boolean;
  isTourCompleted: (tourName: string) => boolean;
  isTourSkipped: (tourName: string) => boolean;
  completeTour: (tourName: string) => Promise<boolean>;
  skipTour: (tourName: string) => Promise<boolean>;
  resetTour: (tourName: string) => Promise<boolean>;
  refreshTours: () => Promise<void>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tourProgress, setTourProgress] = useState<TourProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeaders = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return {
      'Authorization': `Bearer ${data.session?.access_token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchTourProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/api/tours`, { headers });
      setTourProgress(response.data);
    } catch (error) {
      console.error('Error fetching tour progress:', error);
      setTourProgress(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTourProgress();
  }, [fetchTourProgress]);

  const refreshTours = useCallback(async () => {
    await fetchTourProgress();
  }, [fetchTourProgress]);

  const isTourCompleted = useCallback((tourName: string): boolean => {
    return tourProgress?.completed_tours?.includes(tourName) || false;
  }, [tourProgress]);

  const isTourSkipped = useCallback((tourName: string): boolean => {
    return tourProgress?.skipped_tours?.includes(tourName) || false;
  }, [tourProgress]);

  const completeTour = useCallback(async (tourName: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_URL}/api/tours/complete`,
        { tourName },
        { headers }
      );
      setTourProgress(response.data);
      return true;
    } catch (error) {
      console.error('Error completing tour:', error);
      return false;
    }
  }, []);

  const skipTour = useCallback(async (tourName: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_URL}/api/tours/skip`,
        { tourName },
        { headers }
      );
      setTourProgress(response.data);
      return true;
    } catch (error) {
      console.error('Error skipping tour:', error);
      return false;
    }
  }, []);

  const resetTour = useCallback(async (tourName: string): Promise<boolean> => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_URL}/api/tours/reset`,
        { tourName },
        { headers }
      );
      setTourProgress(response.data);
      return true;
    } catch (error) {
      console.error('Error resetting tour:', error);
      return false;
    }
  }, []);

  return (
    <TourContext.Provider
      value={{
        tourProgress,
        isLoading,
        isTourCompleted,
        isTourSkipped,
        completeTour,
        skipTour,
        resetTour,
        refreshTours,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

