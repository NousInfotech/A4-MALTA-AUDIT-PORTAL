// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_APIURL || 'http://localhost:8000';

// Socket.IO connection
let socket: Socket | null = null;

export const initializeSocket = (token: string) => {
  if (socket) {
    socket.disconnect();
  }
  
  socket = io(API_URL, {
    auth: {
      token
    }
  });
  
  return socket;
};

export const getSocket = () => socket;

// API helper function
// Updated to handle different content types including FormData
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Supabase getSession error:', error);
    throw new Error('Authentication error: Could not get session.');
  }

  if (!data || !data.session || !data.session.access_token) {
    throw new Error('Authentication error: No active session or access token found. Please log in again.');
  }

  const accessToken = data.session.access_token;

  // Determine Content-Type. If body is FormData, don't set Content-Type header manually,
  // the browser will set it automatically with the correct boundary.
  const headers: HeadersInit = {
    'Authorization': `Bearer ${accessToken}`,
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Network error or malformed error response' }));
    throw new Error(errorBody.message || `API request failed with status ${response.status}`);
  }

  return response.json();
};

// Engagement API
export const engagementApi = {
  create: async (data) => {
    return apiCall('/api/engagements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getClientEngagements: async () => {
    return apiCall('/api/engagements/getClientEngagements');
  },

  getAll: async () => {
    return apiCall('/api/engagements');
  },

  update: async (id: string, data: any) => {
    return apiCall(`/api/engagements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  fetchTrialBalance: async (id: string, sheetUrl?: string) => {
    return apiCall(`/api/engagements/${id}/fetch-trial-balance`, {
      method: 'POST',
      body: JSON.stringify({ sheetUrl }),
    });
  },

  getTrialBalance: async (id: string) => {
    return apiCall(`/api/engagements/${id}/trial-balance`);
  },

  addFileToFolder: async (
    id: string,
    payload: { category: string; name: string; url: string }
  ) => {
    return apiCall(`/api/engagements/${id}/files`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadToLibrary: async (engagementId: string, file: File, category: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    
    // Now using apiCall which handles the session and token
    return apiCall(`/api/engagements/${engagementId}/library`, {
      method: 'POST',
      body: formData, // apiCall will detect FormData and handle headers
    });
  },

  deleteFromLibrary: async (engagementId: string, url: string) => {
    // Now using apiCall which handles the session and token
    return apiCall(`/api/engagements/${engagementId}/library`, {
      method: 'DELETE',
      body: JSON.stringify({ url }),
    });
  },

  changeFolder: async (engagementId: string, category: string, url: string) => {
    // Now using apiCall which handles the session and token
    return apiCall(`/api/engagements/${engagementId}/library/change`, {
      method: 'POST',
      body: JSON.stringify({ url, category }),
    });
  },

  getLibraryFiles: async (engagementId: string) => {
    // Now using apiCall which handles the session and token
    return apiCall(`/api/engagements/${engagementId}/library`);
  },

  getById: async (id: string) => {
    // Now using apiCall which handles the session and token
    return apiCall(`/api/engagements/${id}`);
  },
};

// Document Requests API
export const documentRequestApi = {
  create: async (data: {
    engagementId: string;
    clientId: string;
    category: string;
    description: string;
  }) => {
    return apiCall('/api/document-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getByEngagement: async (engagementId: string) => {
    return apiCall(`/api/document-requests/engagement/${engagementId}`);
  },

  update: async (id: string, data: any) => {
    return apiCall(`/api/document-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  uploadDocuments: async (id, formData) => {
    // Now using apiCall which handles the session and token
    return apiCall(`/api/document-requests/${id}/documents`, {
      method: 'POST',
      body: formData, // apiCall will detect FormData and handle headers
    });
  }
};

// Procedures API
export const procedureApi = {
  seed: async (data: {
    engagementId: string;
    title: string;
    tasks: Array<{ description: string; category: string }>;
  }) => {
    return apiCall('/api/procedures', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // getByEngagement: async (engagementId: string) => {
  //   return apiCall(`/apngagement/${engagementId}`);
  // },

  updateTask: async (procedureId: string, taskId: string, data: { completed: boolean }) => {
    return apiCall(`/api/procedures/${procedureId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Simplified Checklist API (no create/delete)
export const checklistApi = {
  getByEngagement: async (engagementId: string) => {
    return apiCall(`/api/checklist/engagement/${engagementId}`);
  },

  updateItem: async (id: string, data: { 
    completed?: boolean; 
    textValue?: string; 
    dateValue?: string; 
    selectValue?: string; 
  }) => {
    return apiCall(`/api/checklist/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};





