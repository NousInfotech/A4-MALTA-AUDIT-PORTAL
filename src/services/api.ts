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
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.session?.access_token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || 'API request failed');
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

  // ←–– Add this:
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
    const { data, error } = await supabase.auth.getSession()
  if (error) throw error
    const response = await fetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/library`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${data.session?.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload file');
    }

    return response.json();
  },

  // Get library files for engagement
  getLibraryFiles: async (engagementId: string) => {
    const { data, error } = await supabase.auth.getSession()
  if (error) throw error
    const response = await fetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/library`, {
      headers: {
        'Authorization': `Bearer ${data.session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch library files');
    }

    return response.json();
  },

  // Get engagement by ID
  getById: async (id: string) => {
    const { data, error } = await supabase.auth.getSession()
  if (error) throw error
    const response = await fetch(`${import.meta.env.VITE_APIURL}/api/engagements/${id}`, {
      headers: {
        'Authorization': `Bearer ${data.session?.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch engagement');
    }

    return response.json();
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

  // New: upload documents via Supabase-backed endpoint
uploadDocuments: async (id, formData) => {
  // 1. Make sure this function is async
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  // 2. Pass a single options object to fetch, including method, headers, and body
  const response = await fetch(
    `${API_URL}/api/document-requests/${id}/documents`,
    {
      method: 'POST',
      // 3. Let the browser set Content-Type (with the correct boundary)
      headers: {
        Authorization: `Bearer ${data.session?.access_token}`,
      },
      body: formData,
    }
  );

  // 4. Handle non-2xx responses
  if (!response.ok) {
    const err = await response
      .json()
      .catch(() => ({ message: 'Network error' }));
    throw new Error(err.message || 'API request failed');
  }

  // 5. Return the parsed JSON
  return response.json();
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

  getByEngagement: async (engagementId: string) => {
    return apiCall(`/api/procedures/engagement/${engagementId}`);
  },

  updateTask: async (procedureId: string, taskId: string, data: { completed: boolean }) => {
    return apiCall(`/api/procedures/${procedureId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// Checklist API
export const checklistApi = {
  getByEngagement: async (engagementId: string) => {
    return apiCall(`/api/checklist/engagement/${engagementId}`);
  },

  updateItem: async (id: string, data: { completed: boolean }) => {
    return apiCall(`/api/checklist/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
