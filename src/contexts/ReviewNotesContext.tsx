// @ts-nocheck
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReviewNote {
  id: string;
  pageId: string; // Identifier for the page (e.g., 'dashboard', 'clients', 'engagements', etc.)
  pageName: string; // Human-readable page name
  content: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags?: string[];
}

interface ReviewNotesContextType {
  reviewNotes: ReviewNote[];
  loading: boolean;
  addReviewNote: (note: Omit<ReviewNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReviewNote: (id: string, updates: Partial<ReviewNote>) => Promise<void>;
  deleteReviewNote: (id: string) => Promise<void>;
  getNotesByPage: (pageId: string) => ReviewNote[];
  getNotesByStatus: (status: ReviewNote['status']) => ReviewNote[];
  getNotesByPriority: (priority: ReviewNote['priority']) => ReviewNote[];
  getTotalNotesCount: () => number;
  getPendingNotesCount: () => number;
  getHighPriorityNotesCount: () => number;
}

const ReviewNotesContext = createContext<ReviewNotesContextType | undefined>(undefined);

export const ReviewNotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reviewNotes, setReviewNotes] = useState<ReviewNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Load review notes from localStorage on mount
  useEffect(() => {
    loadReviewNotes();
  }, []);

  // Save to localStorage whenever reviewNotes changes
  useEffect(() => {
    if (reviewNotes.length > 0 || loading === false) {
      localStorage.setItem('audit-portal-review-notes', JSON.stringify(reviewNotes));
    }
  }, [reviewNotes, loading]);

  const loadReviewNotes = () => {
    try {
      const savedNotes = localStorage.getItem('audit-portal-review-notes');
      if (savedNotes) {
        setReviewNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Error loading review notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addReviewNote = async (note: Omit<ReviewNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newNote: ReviewNote = {
      ...note,
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setReviewNotes(prev => [newNote, ...prev]);
  };

  const updateReviewNote = async (id: string, updates: Partial<ReviewNote>) => {
    setReviewNotes(prev => 
      prev.map(note => 
        note.id === id 
          ? { ...note, ...updates, updatedAt: new Date().toISOString() }
          : note
      )
    );
  };

  const deleteReviewNote = async (id: string) => {
    setReviewNotes(prev => prev.filter(note => note.id !== id));
  };

  const getNotesByPage = (pageId: string) => {
    return reviewNotes.filter(note => note.pageId === pageId);
  };

  const getNotesByStatus = (status: ReviewNote['status']) => {
    return reviewNotes.filter(note => note.status === status);
  };

  const getNotesByPriority = (priority: ReviewNote['priority']) => {
    return reviewNotes.filter(note => note.priority === priority);
  };

  const getTotalNotesCount = () => {
    return reviewNotes.length;
  };

  const getPendingNotesCount = () => {
    return reviewNotes.filter(note => note.status === 'pending').length;
  };

  const getHighPriorityNotesCount = () => {
    return reviewNotes.filter(note => note.priority === 'high').length;
  };

  return (
    <ReviewNotesContext.Provider value={{
      reviewNotes,
      loading,
      addReviewNote,
      updateReviewNote,
      deleteReviewNote,
      getNotesByPage,
      getNotesByStatus,
      getNotesByPriority,
      getTotalNotesCount,
      getPendingNotesCount,
      getHighPriorityNotesCount,
    }}>
      {children}
    </ReviewNotesContext.Provider>
  );
};

export const useReviewNotes = () => {
  const context = useContext(ReviewNotesContext);
  if (context === undefined) {
    throw new Error('useReviewNotes must be used within a ReviewNotesProvider');
  }
  return context;
};
