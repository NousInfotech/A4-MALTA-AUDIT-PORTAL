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

// API helper function with comprehensive logging
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  console.log(`🌐 API Call: ${options.method || 'GET'} ${API_URL}${endpoint}`);
  
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('❌ Session error:', error);
      throw error;
    }
    
    console.log('🔐 Session token obtained successfully');
    
    const requestOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session?.access_token}`,
        ...options.headers,
      },
    };
    
    console.log('📤 Request options:', {
      method: requestOptions.method || 'GET',
      headers: Object.keys(requestOptions.headers),
      body: requestOptions.body ? 'Present' : 'None'
    });
    
    const response = await fetch(`${API_URL}${endpoint}`, requestOptions);
    
    console.log(`📡 Response received: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      console.error('📄 Error details:', error);
      throw new Error(error.message || 'API request failed');
    }
    
    const result = await response.json();
    console.log('✅ API call successful, response received');
    return result;
    
  } catch (error) {
    console.error('💥 API call failed:', {
      endpoint: `${API_URL}${endpoint}`,
      method: options.method || 'GET',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
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

  deleteFromLibrary: async (engagementId: string, url: string) => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    const response = await fetch(
      `${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/library`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete file');
    }

    return await response.json();
  },

  changeFolder: async (engagementId: string, category: string, url: string) => {
    const { data: sessionData, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/library/change`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url, category }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to change folder');
      }

      return await response.json();
    } catch (err) {
      console.error('Error changing folder:', err);
      throw err;
    }
  },

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
    console.log('📄 Creating Document Request...');
    console.log('📋 Document Request Data:', data);
    
    try {
      const result = await apiCall('/api/document-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('✅ Document Request created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Document Request creation failed:', error);
      throw error;
    }
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
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const response = await fetch(
      `${API_URL}/api/document-requests/${id}/documents`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.session?.access_token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ message: 'Network error' }));
      throw new Error(err.message || 'API request failed');
    }

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

// KYC API
export const kycApi = {
  // Create KYC workflow
  create: async (data: {
    engagementId: string;
    clientId: string;
    auditorId: string;
    documentRequestId: string;
  }) => {
    console.log('🔄 Creating KYC Workflow...');
    console.log('📋 KYC Workflow Data:', data);
    
    try {
      const result = await apiCall('/api/kyc/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('✅ KYC Workflow created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ KYC Workflow creation failed:', error);
      throw error;
    }
  },

  // Get KYC by engagement ID
  getByEngagement: async (engagementId: string) => {
    return apiCall(`/api/kyc/engagement/${engagementId}`);
  },

  // Get KYC by ID
  getById: async (id: string) => {
    return apiCall(`/api/kyc/${id}`);
  },

  // Update KYC workflow
  update: async (id: string, data: {
    status?: 'pending' | 'in-review' | 'completed';
    documentRequestId?: string;
  }) => {
    return apiCall(`/api/kyc/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete KYC workflow
  delete: async (id: string) => {
    return apiCall(`/api/kyc/${id}`, {
      method: 'DELETE',
    });
  },

  // Get all KYC workflows with filters
  getAll: async (filters?: {
    status?: 'pending' | 'in-review' | 'completed';
    clientId?: string;
    auditorId?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.clientId) params.append('clientId', filters.clientId);
    if (filters?.auditorId) params.append('auditorId', filters.auditorId);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/kyc/?${queryString}` : '/api/kyc/';
    return apiCall(endpoint);
  },

  // Add discussion to KYC
  addDiscussion: async (kycId: string, data: {
    message: string;
    replyTo?: string;
    documentRef?: {
      documentRequestId: string;
      documentIndex: number;
    };
  }) => {
    return apiCall(`/api/kyc/${kycId}/discussions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update discussion
  updateDiscussion: async (kycId: string, discussionId: string, data: {
    message: string;
  }) => {
    return apiCall(`/api/kyc/${kycId}/discussions/${discussionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete discussion
  deleteDiscussion: async (kycId: string, discussionId: string) => {
    return apiCall(`/api/kyc/${kycId}/discussions/${discussionId}`, {
      method: 'DELETE',
    });
  },

  // Get discussions by document
  getDiscussionsByDocument: async (documentRequestId: string, documentIndex: number) => {
    return apiCall(`/api/kyc/discussions/document/${documentRequestId}/${documentIndex}`);
  },

  // Update KYC status
  updateStatus: async (kycId: string, status: 'pending' | 'in-review' | 'completed') => {
    return apiCall(`/api/kyc/${kycId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};
