import axiosInstance from '../axiosInstance';

export interface EvidenceComment {
  commentor: {
    userId: string;
    name: string;
    email: string;
  };
  comment: string;
  timestamp: string;
}

export interface ClassificationEvidence {
  _id: string;
  engagementId: string;
  classificationId: string | {
    _id: string;
    classification: string;
    status: string;
  };
  uploadedBy: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  evidenceUrl: string;
  evidenceComments: EvidenceComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvidenceRequest {
  engagementId: string;
  classificationId: string;
  evidenceUrl: string;
}

export interface AddCommentRequest {
  comment: string;
}

export interface UpdateEvidenceUrlRequest {
  evidenceUrl: string;
}

export interface EvidenceResponse {
  message: string;
  evidence: ClassificationEvidence;
}

export interface EvidenceListResponse {
  message: string;
  evidence: ClassificationEvidence[];
}

// Create Classification Evidence
export const createClassificationEvidence = async (data: CreateEvidenceRequest): Promise<EvidenceResponse> => {
  try {
    const response = await axiosInstance.post('/api/classification-evidence', data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating classification evidence:', error);
    throw new Error(error.response?.data?.error || 'Failed to create evidence');
  }
};

// Get All Evidence
export const getAllClassificationEvidence = async (engagementId?: string, classificationId?: string): Promise<EvidenceListResponse> => {
  try {
    const params = new URLSearchParams();
    if (engagementId) params.append('engagementId', engagementId);
    if (classificationId) params.append('classificationId', classificationId);
    
    const queryString = params.toString();
    const url = queryString ? `/api/classification-evidence?${queryString}` : '/api/classification-evidence';
    
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching classification evidence:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch evidence');
  }
};

// Get Evidence by Classification
export const getEvidenceByClassification = async (classificationId: string): Promise<EvidenceListResponse> => {
  try {
    const response = await axiosInstance.get(`/api/classification-evidence/classification/${classificationId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching evidence by classification:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch evidence');
  }
};

// Add Comment to Evidence
export const addCommentToEvidence = async (evidenceId: string, data: AddCommentRequest): Promise<EvidenceResponse> => {
  try {
    const response = await axiosInstance.post(`/api/classification-evidence/${evidenceId}/comments`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error adding comment to evidence:', error);
    throw new Error(error.response?.data?.error || 'Failed to add comment');
  }
};

// Update Evidence URL
export const updateEvidenceUrl = async (evidenceId: string, data: UpdateEvidenceUrlRequest): Promise<EvidenceResponse> => {
  try {
    const response = await axiosInstance.patch(`/api/classification-evidence/${evidenceId}/url`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating evidence URL:', error);
    throw new Error(error.response?.data?.error || 'Failed to update evidence URL');
  }
};

// Delete Evidence
export const deleteClassificationEvidence = async (evidenceId: string): Promise<{ message: string }> => {
  try {
    const response = await axiosInstance.delete(`/api/classification-evidence/${evidenceId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting classification evidence:', error);
    throw new Error(error.response?.data?.error || 'Failed to delete evidence');
  }
};
