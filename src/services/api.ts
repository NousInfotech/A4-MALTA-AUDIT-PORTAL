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

// Employee Log API
export const employeeLogApi = {
  // Create employee log entry
  create: async (data: {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    action: string;
    details: string;
    ipAddress?: string;
    location?: string;
    deviceInfo?: string;
    status: 'SUCCESS' | 'FAIL';
  }) => {
    console.log('📝 Creating Employee Log Entry...');
    console.log('📋 Log Data:', data);
    
    try {
      const result = await apiCall('/api/employee-logs/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('✅ Employee Log created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Employee Log creation failed:', error);
      throw error;
    }
  },

  // Get all employee logs with filtering and pagination
  getAll: async (filters?: {
    employeeId?: string;
    action?: string;
    status?: 'SUCCESS' | 'FAIL';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/employee-logs/?${queryString}` : '/api/employee-logs/';
    return apiCall(endpoint);
  },

  // Get logs by specific employee
  getByEmployee: async (employeeId: string, filters?: {
    action?: string;
    status?: 'SUCCESS' | 'FAIL';
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const params = new URLSearchParams();
    if (filters?.action) params.append('action', filters.action);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const queryString = params.toString();
    const endpoint = queryString 
      ? `/api/employee-logs/employee/${employeeId}?${queryString}` 
      : `/api/employee-logs/employee/${employeeId}`;
    return apiCall(endpoint);
  },

  // Get log statistics
  getStatistics: async (filters?: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/employee-logs/statistics?${queryString}` : '/api/employee-logs/statistics';
    return apiCall(endpoint);
  },

  // Get specific log by ID
  getById: async (id: string) => {
    return apiCall(`/api/employee-logs/${id}`);
  },

  // Update log entry
  update: async (id: string, data: {
    details?: string;
    status?: 'SUCCESS' | 'FAIL';
  }) => {
    return apiCall(`/api/employee-logs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // Delete log entry
  delete: async (id: string) => {
    return apiCall(`/api/employee-logs/${id}`, {
      method: 'DELETE',
    });
  },

  // Bulk delete logs
  bulkDelete: async (criteria: {
    logIds?: string[];
    employeeId?: string;
    action?: string;
    status?: 'SUCCESS' | 'FAIL';
    startDate?: string;
    endDate?: string;
  }) => {
    return apiCall('/api/employee-logs/bulk', {
      method: 'DELETE',
      body: JSON.stringify(criteria),
    });
  },

  // Export logs
  exportLogs: async (filters?: {
    employeeId?: string;
    action?: string;
    status?: 'SUCCESS' | 'FAIL';
    startDate?: string;
    endDate?: string;
    format?: 'csv' | 'json';
  }) => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', filters.employeeId);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.format) params.append('format', filters.format);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/employee-logs/export/data?${queryString}` : '/api/employee-logs/export/data';
    return apiCall(endpoint);
  },

  // Get available actions
  getAvailableActions: async () => {
    return apiCall('/api/employee-logs/actions/available');
  },

  // Helper function to log employee activity (for use in other components)
  logActivity: async (employeeId: string, action: string, details: string, req?: any) => {
    const logData = {
      employeeId,
      employeeName: req?.user?.name || 'Unknown',
      employeeEmail: req?.user?.email || 'unknown@example.com',
      action,
      details,
      ipAddress: req?.ip || req?.connection?.remoteAddress || 'Unknown',
      location: 'Unknown', // Could be enhanced with geolocation
      deviceInfo: req?.headers?.['user-agent'] || 'Unknown',
      status: 'SUCCESS' as const
    };

    try {
      return await employeeLogApi.create(logData);
    } catch (error) {
      console.error('Failed to log employee activity:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }
};

// ISQM API
export const isqmApi = {
  // ISQM Parent Management
  createParent: async (data: {
    metadata: {
      title: string;
      version: string;
      jurisdiction_note: string;
      sources: string[];
      generated: string;
    };
    questionnaires: Array<{
      key: string;
      heading: string;
      description?: string;
      version?: string;
      framework?: string;
      sections: Array<{
        heading: string;
        sectionId?: string;
        order?: number;
        qna: Array<{
          question: string;
          questionId?: string;
          isMandatory?: boolean;
          questionType?: string;
        }>;
      }>;
    }>;
    status?: string;
  }) => {
    console.log('📋 Creating ISQM Parent...');
    console.log('📋 ISQM Parent Data:', data);
    
    try {
      const result = await apiCall('/api/isqm/parents', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('✅ ISQM Parent created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ ISQM Parent creation failed:', error);
      throw error;
    }
  },

  getAllParents: async (filters?: {
    status?: string;
    createdBy?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.createdBy) params.append('createdBy', filters.createdBy);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);
    
    const queryString = params.toString();
    const endpoint = queryString ? `/api/isqm/parents?${queryString}` : '/api/isqm/parents';
    return apiCall(endpoint);
  },

  getParentById: async (id: string) => {
    console.log('📋 Fetching ISQM Parent by ID:', id);
    return apiCall(`/api/isqm/parents/${id}`);
  },

  updateParent: async (id: string, data: {
    status?: string;
    metadata?: any;
  }) => {
    console.log('📋 Updating ISQM Parent:', id, data);
    return apiCall(`/api/isqm/parents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteParent: async (id: string) => {
    console.log('📋 Deleting ISQM Parent:', id);
    return apiCall(`/api/isqm/parents/${id}`, {
      method: 'DELETE',
    });
  },

  // ISQM Questionnaire Management
  createQuestionnaire: async (data: {
    parentId: string;
    key: string;
    heading: string;
    description?: string;
    version?: string;
    framework?: string;
    sections: Array<{
      heading: string;
      sectionId?: string;
      order?: number;
      qna: Array<{
        question: string;
        questionId?: string;
        isMandatory?: boolean;
        questionType?: string;
      }>;
    }>;
  }) => {
    console.log('📝 Creating ISQM Questionnaire...');
    console.log('📝 Questionnaire Data:', data);
    
    try {
      const result = await apiCall('/api/isqm/questionnaires', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('✅ ISQM Questionnaire created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ ISQM Questionnaire creation failed:', error);
      throw error;
    }
  },

  getQuestionnairesByParent: async (parentId: string) => {
    console.log('📝 Fetching questionnaires for parent:', parentId);
    return apiCall(`/api/isqm/parents/${parentId}/questionnaires`);
  },

  getQuestionnaireById: async (id: string) => {
    console.log('📝 Fetching questionnaire by ID:', id);
    return apiCall(`/api/isqm/questionnaires/${id}`);
  },

  updateQuestionnaire: async (id: string, data: {
    heading?: string;
    description?: string;
    assignedTo?: string;
  }) => {
    console.log('📝 Updating questionnaire:', id, data);
    return apiCall(`/api/isqm/questionnaires/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteQuestionnaire: async (id: string) => {
    console.log('📝 Deleting questionnaire:', id);
    return apiCall(`/api/isqm/questionnaires/${id}`, {
      method: 'DELETE',
    });
  },

  // Question Answer Management
  updateQuestionAnswer: async (
    questionnaireId: string,
    sectionIndex: number,
    questionIndex: number,
    data: {
      answer: string;
      comments?: string;
    }
  ) => {
    console.log('💬 Updating question answer:', { questionnaireId, sectionIndex, questionIndex, data });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/sections/${sectionIndex}/questions/${questionIndex}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  addSectionNote: async (
    questionnaireId: string,
    sectionIndex: number,
    data: {
      text: string;
    }
  ) => {
    console.log('📝 Adding section note:', { questionnaireId, sectionIndex, data });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/sections/${sectionIndex}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  bulkUpdateAnswers: async (
    questionnaireId: string,
    data: {
      answers: Array<{
        sectionIndex: number;
        questionIndex: number;
        answer: string;
      }>;
    }
  ) => {
    console.log('📝 Bulk updating answers:', { questionnaireId, data });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/answers/bulk`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  getQuestionnaireStats: async (id: string) => {
    console.log('📊 Fetching questionnaire statistics:', id);
    return apiCall(`/api/isqm/questionnaires/${id}/stats`);
  },

  exportQuestionnaire: async (id: string, format: 'csv' | 'json' = 'json') => {
    console.log('📤 Exporting questionnaire:', { id, format });
    return apiCall(`/api/isqm/questionnaires/${id}/export?format=${format}`);
  },

  // Supporting Document Management
  createSupportingDocument: async (data: {
    parentId: string;
    category: string;
    title: string;
    description: string;
    priority?: string;
    isMandatory?: boolean;
    dueDate?: string;
    tags?: string[];
    framework?: string;
    jurisdiction?: string;
  }) => {
    console.log('📄 Creating supporting document request...');
    console.log('📄 Document Data:', data);
    
    try {
      const result = await apiCall('/api/isqm/supporting-documents', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('✅ Supporting document created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Supporting document creation failed:', error);
      throw error;
    }
  },

  getSupportingDocumentsByParent: async (parentId: string, filters?: {
    category?: string;
    status?: string;
    priority?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    
    const queryString = params.toString();
    const endpoint = queryString 
      ? `/api/isqm/parents/${parentId}/supporting-documents?${queryString}` 
      : `/api/isqm/parents/${parentId}/supporting-documents`;
    
    console.log('📄 Fetching supporting documents for parent:', parentId);
    return apiCall(endpoint);
  },

  getSupportingDocumentById: async (id: string) => {
    console.log('📄 Fetching supporting document by ID:', id);
    return apiCall(`/api/isqm/supporting-documents/${id}`);
  },

  updateSupportingDocument: async (id: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    tags?: string[];
  }) => {
    console.log('📄 Updating supporting document:', id, data);
    return apiCall(`/api/isqm/supporting-documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteSupportingDocument: async (id: string) => {
    console.log('📄 Deleting supporting document:', id);
    return apiCall(`/api/isqm/supporting-documents/${id}`, {
      method: 'DELETE',
    });
  },

  uploadDocumentFile: async (id: string, formData: FormData) => {
    console.log('📤 Uploading document file:', id);
    
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    const response = await fetch(`${API_URL}/api/isqm/supporting-documents/${id}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${data.session?.access_token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ message: 'Network error' }));
      throw new Error(err.message || 'API request failed');
    }

    return response.json();
  },

  reviewSupportingDocument: async (id: string, data: {
    status: string;
    reviewComments?: string;
  }) => {
    console.log('📄 Reviewing supporting document:', id, data);
    return apiCall(`/api/isqm/supporting-documents/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  addDocumentNote: async (id: string, data: {
    text: string;
  }) => {
    console.log('📝 Adding document note:', id, data);
    return apiCall(`/api/isqm/supporting-documents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update question text
  updateQuestionText: async (questionnaireId: string, sectionIndex: number, questionIndex: number, data: { text: string }) => {
    console.log('📝 Updating question text:', { questionnaireId, sectionIndex, questionIndex, data });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/sections/${sectionIndex}/questions/${questionIndex}/text`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Delete question
  deleteQuestion: async (questionnaireId: string, sectionIndex: number, questionIndex: number) => {
    console.log('🗑️ Deleting question:', { questionnaireId, sectionIndex, questionIndex });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/sections/${sectionIndex}/questions/${questionIndex}`, {
      method: 'DELETE'
    });
  },

  // Add question note
  addQuestionNote: async (questionnaireId: string, sectionIndex: number, questionIndex: number, data: { note: string }) => {
    console.log('📝 Adding question note:', { questionnaireId, sectionIndex, questionIndex, data });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/sections/${sectionIndex}/questions/${questionIndex}/notes`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Update section heading
  updateSectionHeading: async (questionnaireId: string, sectionIndex: number, data: { heading: string }) => {
    console.log('📝 Updating section heading:', { questionnaireId, sectionIndex, data });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/sections/${sectionIndex}/heading`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Add section note
  addSectionNote: async (questionnaireId: string, sectionIndex: number, data: { note: string }) => {
    console.log('📝 Adding section note:', { questionnaireId, sectionIndex, data });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/sections/${sectionIndex}/notes`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Delete section
  deleteSection: async (questionnaireId: string, sectionIndex: number) => {
    console.log('🗑️ Deleting section:', { questionnaireId, sectionIndex });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/sections/${sectionIndex}`, {
      method: 'DELETE'
    });
  },

  getSupportingDocumentStats: async (parentId: string) => {
    console.log('📊 Fetching supporting document statistics:', parentId);
    return apiCall(`/api/isqm/parents/${parentId}/supporting-documents/stats`);
  }
};
