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
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  
  // Don't set Content-Type for FormData - let the browser set it with boundary
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${data.session?.access_token}`,
    ...options.headers,
  };
  
  // Only set Content-Type to JSON if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
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
    name?: string;
    category: string;
    description: string;
    comment?: string;
    documents?: Array<{
      name: string;
      type: 'direct' | 'template';
      description?: string;
      template?: {
        url?: string;
        instruction?: string;
      };
      status: 'pending';
    }>;
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

  getById: async (id: string) => {
    return apiCall(`/api/document-requests/${id}`);
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
  },

  uploadSingleDocument: async (id: string, formData: FormData) => {
    return apiCall(`/api/document-requests/${id}/document`, {
      method: 'POST',
      body: formData,
    });
  },

  updateDocumentStatus: async (id: string, documentIndex: number, status: string) => {
    return apiCall(`/api/document-requests/${id}/documents/${documentIndex}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  bulkUpdateDocumentStatuses: async (id: string, updates: Array<{ documentIndex: number; status: string }>) => {
    return apiCall(`/api/document-requests/${id}/documents/bulk-status`, {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
  },

  getStats: async (engagementId: string, category?: string) => {
    const params = category ? `?category=${category}` : '';
    return apiCall(`/api/document-requests/${engagementId}/stats${params}`);
  },

  uploadTemplate: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiCall('/api/document-requests/template/upload', {
      method: 'POST',
      body: formData,
    });
  },

  downloadTemplate: async (templateUrl: string) => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    
    const response = await fetch(`${API_URL}/api/document-requests/template/download?templateUrl=${encodeURIComponent(templateUrl)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${data.session?.access_token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to download template');
    }
    
    return response.blob();
  },

  deleteDocument: async (id: string, documentIndex: number) => {
    return apiCall(`/api/document-requests/${id}/documents/${documentIndex}`, {
      method: 'DELETE',
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

// KYC API
export const kycApi = {
  create: async (data: {
    engagementId?: string;
    clientId?: string;
    companyName?: string;
    auditorId?: string;
    documentRequestId?: string;
    documents?: Array<{
      name: string;
      type: 'required' | 'optional';
      description: string;
      templateUrl?: string;
    }>;
  }) => {
    console.log('🌐 KYC API: Creating KYC workflow...');
    try {
      const result = await apiCall('/api/kyc', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      console.log('✅ KYC API: KYC workflow created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ KYC API: Error creating KYC workflow:', error);
      throw error;
    }
  },

  getByEngagement: async (engagementId: string) => {
    console.log('🌐 KYC API: Getting KYC by engagement...');
    try {
      const result = await apiCall(`/api/kyc/engagement/${engagementId}`);
      console.log('✅ KYC API: KYC retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ KYC API: Error getting KYC by engagement:', error);
      throw error;
    }
  },

  getById: async (id: string) => {
    return apiCall(`/api/kyc/${id}`);
  },

  getAll: async (filters?: any) => {
    console.log('🌐 KYC API: Getting all KYC workflows...');
    try {
      const queryParams = filters ? `?${new URLSearchParams(filters).toString()}` : '';
      const result = await apiCall(`/api/kyc${queryParams}`);
      console.log('✅ KYC API: KYC workflows retrieved successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ KYC API: Error getting KYC workflows:', error);
      throw error;
    }
  },

  update: async (id: string, data: any) => {
    return apiCall(`/api/kyc/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string) => {
    return apiCall(`/api/kyc/${id}`, {
      method: 'DELETE',
    });
  },

  updateStatus: async (id: string, status: string) => {
    return apiCall(`/api/kyc/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  addDocumentRequest: async (id: string, data: any) => {
    return apiCall(`/api/kyc/${id}/document-requests`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  addDiscussion: async (id: string, data: any) => {
    return apiCall(`/api/kyc/${id}/discussions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateDiscussion: async (id: string, discussionId: string, data: any) => {
    return apiCall(`/api/kyc/${id}/discussions/${discussionId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  deleteDiscussion: async (id: string, discussionId: string) => {
    return apiCall(`/api/kyc/${id}/discussions/${discussionId}`, {
      method: 'DELETE',
    });
  },

  getAllDiscussions: async (id: string) => {
    return apiCall(`/api/kyc/${id}/discussions`);
  },

  getDiscussionsByDocument: async (documentRequestId: string, documentIndex: number) => {
    return apiCall(`/api/kyc/discussions/document/${documentRequestId}/${documentIndex}`);
  },

  getMyKYCs: async () => {
    return apiCall('/api/kyc/my');
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
    answer: string,
    comments?: string,
    state?: boolean
  ) => {
    const data: any = {};
    if (answer !== undefined) data.answer = answer;
    if (comments !== undefined) data.comments = comments;
    if (state !== undefined) data.state = state;
    
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

  // Document Generation
  generatePolicyDocument: async (questionnaireId: string, firmDetails: any = {}) => {
    console.log('📄 Generating policy document:', { questionnaireId, firmDetails });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/generate/policy`, {
      method: 'POST',
      body: JSON.stringify({ firmDetails }),
    });
  },

  generateProcedureDocument: async (questionnaireId: string, firmDetails: any = {}, policyDetails: any = {}) => {
    console.log('📄 Generating procedure document:', { questionnaireId, firmDetails, policyDetails });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/generate/procedure`, {
      method: 'POST',
      body: JSON.stringify({ firmDetails, policyDetails }),
    });
  },

  generateAllDocuments: async (parentId: string, firmDetails: any = {}) => {
    console.log('📄 Generating all ISQM documents:', { parentId, firmDetails });
    return apiCall(`/api/isqm/parents/${parentId}/generate-documents`, {
      method: 'POST',
      body: JSON.stringify({ firmDetails }),
    });
  },

  // URL Management
  addPolicyUrl: async (questionnaireId: string, data: { 
    name: string; 
    url: string; 
    version?: string; 
    description?: string;
    uploadedBy?: string;
  }) => {
    console.log('📄 Adding policy URL:', { questionnaireId, data });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/policy-urls`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  addProcedureUrl: async (questionnaireId: string, data: { 
    name: string; 
    url: string; 
    version?: string; 
    description?: string;
    uploadedBy?: string;
  }) => {
    console.log('📄 Adding procedure URL:', { questionnaireId, data });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/procedure-urls`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getQuestionnaireUrls: async (questionnaireId: string) => {
    console.log('📄 Getting questionnaire URLs:', questionnaireId);
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/urls`);
  },

  deletePolicyUrl: async (questionnaireId: string, urlId: string) => {
    console.log('📄 Deleting policy URL:', { questionnaireId, urlId });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/policy-urls/${urlId}`, {
      method: 'DELETE',
    });
  },

  deleteProcedureUrl: async (questionnaireId: string, urlId: string) => {
    console.log('📄 Deleting procedure URL:', { questionnaireId, urlId });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/procedure-urls/${urlId}`, {
      method: 'DELETE',
    });
  },

  removePolicyUrl: async (questionnaireId: string, urlId: string) => {
    console.log('🗑️ Removing policy URL:', { questionnaireId, urlId });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/policy-urls/${urlId}`, {
      method: 'DELETE',
    });
  },

  removeProcedureUrl: async (questionnaireId: string, urlId: string) => {
    console.log('🗑️ Removing procedure URL:', { questionnaireId, urlId });
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/procedure-urls/${urlId}`, {
      method: 'DELETE',
    });
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
  },

  // Generate documents from QNA array
  generateDocumentsFromQNA: async (data: {
    qnaArray: Array<{
      question: string;
      answer: string;
      state: boolean;
    }>;
    categoryName: string;
    firmDetails?: {
      size?: string;
      jurisdiction?: string;
      specializations?: string[];
      [key: string]: any;
    };
  }) => {
    console.log('🤖 Generating documents from QNA array:', data.categoryName, data.qnaArray.length, 'questions');
    return apiCall('/api/isqm/generate-documents-from-qna', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Download generated document
  downloadGeneratedDocument: async (filename: string) => {
    console.log('📥 Downloading generated document:', filename);
    return apiCall(`/api/isqm/download/${filename}`, {
      method: 'GET',
      responseType: 'blob',
    });
  },

  // AI Document Generation APIs
  generatePolicy: async (questionnaireId: string, data: {
    firmDetails: {
      size: string;
      specializations: string[];
      jurisdiction: string;
      additionalInfo?: string;
    }
  }) => {
    console.log('🤖 Generating policy document:', questionnaireId, data);
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/generate/policy`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateProcedure: async (questionnaireId: string, data: {
    firmDetails: {
      size: string;
      specializations: string[];
      processes?: string[];
      jurisdiction: string;
    };
    policyDetails?: {
      title: string;
      requirements: string[];
      responsibilities: Record<string, string>;
    };
  }) => {
    console.log('🤖 Generating procedure document:', questionnaireId, data);
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/generate/procedure`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateRiskAssessment: async (questionnaireId: string, data: {
    firmDetails: {
      size: string;
      specializations: string[];
      jurisdiction: string;
    }
  }) => {
    console.log('🤖 Generating risk assessment:', questionnaireId, data);
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/generate/risk-assessment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateComplianceChecklist: async (questionnaireId: string, data: {
    firmDetails: {
      size: string;
      specializations: string[];
      jurisdiction: string;
    }
  }) => {
    console.log('🤖 Generating compliance checklist:', questionnaireId, data);
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/generate/compliance-checklist`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getGenerationTypes: async () => {
    console.log('🤖 Fetching available generation types');
    return apiCall('/api/isqm/generation/types');
  },

  // Dynamic Tagging APIs
  getQuestionnaireTags: async (questionnaireId: string) => {
    console.log('🏷️ Fetching questionnaire tags:', questionnaireId);
    return apiCall(`/api/isqm/questionnaires/${questionnaireId}/tags`);
  },

  getQuestionnairesByComponentType: async (componentType: string, filters?: {
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const queryString = params.toString();
    const endpoint = queryString 
      ? `/api/isqm/questionnaires/component/${componentType}?${queryString}` 
      : `/api/isqm/questionnaires/component/${componentType}`;
    
    console.log('🏷️ Fetching questionnaires by component type:', componentType);
    return apiCall(endpoint);
  },

  getQuestionnairesByTags: async (tags: string[], filters?: {
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    params.append('tags', tags.join(','));
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const endpoint = `/api/isqm/questionnaires/by-tags?${params.toString()}`;
    
    console.log('🏷️ Fetching questionnaires by tags:', tags);
    return apiCall(endpoint);
  }
};

// Adjustment API
export const adjustmentApi = {
  /**
   * Create a new adjustment (draft status)
   */
  create: async (data: {
    engagementId: string;
    etbId: string;
    adjustmentNo: string;
    description?: string;
    entries?: Array<{
      etbRowId: string;
      code: string;
      accountName: string;
      dr?: number;
      cr?: number;
      details?: string;
    }>;
  }) => {
    console.log('📝 Creating Adjustment...');
    console.log('📋 Adjustment Data:', data);
    
    try {
      const result = await apiCall('/api/adjustments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      console.log('✅ Adjustment created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Adjustment creation failed:', error);
      throw error;
    }
  },

  /**
   * Get all adjustments for an engagement
   */
  getByEngagement: async (engagementId: string) => {
    console.log('📝 Fetching adjustments for engagement:', engagementId);
    return apiCall(`/api/adjustments/engagement/${engagementId}`);
  },

  /**
   * Get all adjustments for an ETB
   */
  getByETB: async (etbId: string) => {
    console.log('📝 Fetching adjustments for ETB:', etbId);
    return apiCall(`/api/adjustments/etb/${etbId}`);
  },

  /**
   * Get a single adjustment by ID
   */
  getById: async (id: string) => {
    console.log('📝 Fetching adjustment by ID:', id);
    return apiCall(`/api/adjustments/${id}`);
  },

  /**
   * Update a draft adjustment
   */
  update: async (id: string, data: {
    description?: string;
    entries?: Array<{
      etbRowId: string;
      code: string;
      accountName: string;
      dr?: number;
      cr?: number;
      details?: string;
    }>;
  }) => {
    console.log('📝 Updating adjustment:', id, data);
    return apiCall(`/api/adjustments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Post a draft adjustment (apply to ETB)
   */
  post: async (id: string) => {
    console.log('📝 Posting adjustment:', id);
    return apiCall(`/api/adjustments/${id}/post`, {
      method: 'POST',
    });
  },

  /**
   * Unpost a posted adjustment (reverse ETB impact)
   */
  unpost: async (id: string) => {
    console.log('📝 Unposting adjustment:', id);
    return apiCall(`/api/adjustments/${id}/unpost`, {
      method: 'POST',
    });
  },

  /**
   * Delete a draft adjustment
   */
  delete: async (id: string) => {
    console.log('📝 Deleting adjustment:', id);
    return apiCall(`/api/adjustments/${id}`, {
      method: 'DELETE',
    });
  },
};