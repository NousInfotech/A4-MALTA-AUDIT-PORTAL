import axiosInstance from '../axiosInstance';

export interface ClassificationReview {
  _id: string;
  engagementId: string;
  classificationId: string | {
    _id: string;
    classification: string;
    status: string;
  };
  reviewedBy: {
    userId: string;
    name: string;
    email: string;
    role: string;
  };
  comment: string;
  status: 'pending' | 'in-review' | 'signed-off';
  reviewedOn: string;
  location?: string;
  ipAddress?: string;
  sessionId?: string;
  systemVersion?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  engagementId: string;
  classificationId: string;
  comment: string;
  location?: string;
  ipAddress?: string;
  sessionId?: string;
  systemVersion?: string;
}

export interface UpdateReviewStatusRequest {
  status: 'pending' | 'in-review' | 'signed-off';
}

export interface ReviewResponse {
  message: string;
  review: ClassificationReview;
}

export interface ReviewListResponse {
  message: string;
  reviews: ClassificationReview[];
}

// Create Classification Review
export const createClassificationReview = async (data: CreateReviewRequest): Promise<ReviewResponse> => {
  try {
    const response = await axiosInstance.post('/api/classification-reviews', data);
    return response.data;
  } catch (error: any) {
    console.error('Error creating classification review:', error);
    throw new Error(error.response?.data?.error || 'Failed to create review');
  }
};

// Get All Reviews
export const getAllClassificationReviews = async (engagementId?: string, status?: string): Promise<ReviewListResponse> => {
  try {
    const params = new URLSearchParams();
    if (engagementId) params.append('engagementId', engagementId);
    if (status) params.append('status', status);
    
    const queryString = params.toString();
    const url = queryString ? `/api/classification-reviews?${queryString}` : '/api/classification-reviews';
    
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching classification reviews:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch reviews');
  }
};

// Get Reviews by Classification
export const getReviewsByClassification = async (classificationId: string): Promise<ReviewListResponse> => {
  try {
    const response = await axiosInstance.get(`/api/classification-reviews/classification/${classificationId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching reviews by classification:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch reviews');
  }
};

// Update Review Status
export const updateReviewStatus = async (reviewId: string, data: UpdateReviewStatusRequest): Promise<ReviewResponse> => {
  try {
    const response = await axiosInstance.patch(`/api/classification-reviews/${reviewId}/status`, data);
    return response.data;
  } catch (error: any) {
    console.error('Error updating review status:', error);
    throw new Error(error.response?.data?.error || 'Failed to update review status');
  }
};

// Delete Review
export const deleteClassificationReview = async (reviewId: string): Promise<{ message: string }> => {
  try {
    const response = await axiosInstance.delete(`/api/classification-reviews/${reviewId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error deleting classification review:', error);
    throw new Error(error.response?.data?.error || 'Failed to delete review');
  }
};
