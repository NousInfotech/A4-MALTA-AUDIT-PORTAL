// src/lib/api/review-api.ts
import axios from "axios"; // Re-import axios for isAxiosError
import axiosInstance from "@/lib/axiosInstance"; // Import your shared axiosInstance
import {
  ApiResponse,
  ReviewWorkflow,
  ReviewHistoryEntry,
  AuditItem,
  ReviewWorkflowFilters,
} from "@/types/reviews_module";

// The base path for your review-specific API endpoints
// axiosInstance's baseURL will be prepended to this.
const API_REVIEW_BASE_PATH = "/api/review";

// Generic error handler
const handleApiError = (error: any): ApiResponse<any> => {
  if (axios.isAxiosError(error) && error.response) {
    // Use axios.isAxiosError here
    const { status, data } = error.response;
    // Example error handling based on status codes
    if (status === 401) {
      console.error("Unauthorized: Please log in again.");
      // You might want to trigger a global logout/refresh mechanism here if not handled by axiosInstance's response interceptor
    } else if (status === 403) {
      console.error("Forbidden: You do not have permission.", data.message);
    } else if (status === 404) {
      console.error("Not Found:", data.message);
    } else if (status === 400) {
      console.error("Bad Request:", data.message);
    } else {
      console.error("API Error:", data.message || error.message);
    }
    return { success: false, message: data.message, error: data.error };
  }
  console.error("Network or unknown error:", error);
  return {
    success: false,
    message: "An unexpected error occurred.",
    error: error.message,
  };
};

// API Functions

export const GetEngagements = async () => {
  try {
    const response = await axiosInstance.get(
      `/api/engagements`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const GetAllReviewers = async () => {
  try {
    const response = await axiosInstance.get(
      `/api/users`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};



export const getAllReviewWorkflows = async (
  filters: ReviewWorkflowFilters = {}
) => {
  try {
    const response = await axiosInstance.get(
      `${API_REVIEW_BASE_PATH}/workflows`,
      {
        params: filters, // Pass filters as query parameters
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const GetReviewworkflowByEngagementId = async (engagementId: string) => {
  try {
    const response = await axiosInstance.get(
      `${API_REVIEW_BASE_PATH}/workflows/engagement/${engagementId}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const submitForReview = async (
  itemType: AuditItemType,
  itemId: string,
  engagementId: string,
  comments: string
) => {
  try {
    const response = await axiosInstance.post(
      `${API_REVIEW_BASE_PATH}/submit/${itemType}/${itemId}`,
      { engagementId, comments }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const assignReviewer = async (
  itemId: string,
  reviewerId: string,
  comments: string
) => {
  try {
    const response = await axiosInstance.post(
      `${API_REVIEW_BASE_PATH}/assign/${itemId}`,
      {
        reviewerId,
        comments,
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const performReview = async (
  itemId: string,
  approved: boolean,
  comments: string
) => {
  try {
    const response = await axiosInstance.post(
      `${API_REVIEW_BASE_PATH}/perform/${itemId}`,
      {
        approved,
        comments,
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const signOff = async (itemId: string, comments: string) => {
  try {
    const response = await axiosInstance.post(
      `${API_REVIEW_BASE_PATH}/signoff/${itemId}`,
      {
        comments,
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const reopenItem = async (itemId: string, reason: string) => {
  try {
    const response = await axiosInstance.post(
      `${API_REVIEW_BASE_PATH}/reopen/${itemId}`,
      {
        reason,
      }
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const getReviewQueue = async (reviewerId?: string, status?: string) => {
  try {
    const params = new URLSearchParams();
    if (reviewerId) params.append("reviewerId", reviewerId);
    if (status) params.append("status", status);

    const response = await axiosInstance.get(
      `${API_REVIEW_BASE_PATH}/queue?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const getReviewHistory = async (itemId: string, limit?: number) => {
  try {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit.toString());

    const response = await axiosInstance.get<ApiResponse<ReviewHistoryEntry[]>>(
      `${API_REVIEW_BASE_PATH}/history/${itemId}?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export const getReviewStats = async (params?: { engagementId?: string }) => {
  try {
    const response = await axiosInstance.get(`${API_REVIEW_BASE_PATH}/stats`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.log(error);
    return handleApiError(error);
  }
};

export type AuditItemType =
  | "procedure"
  | "planning-procedure"
  | "document-request"
  | "checklist-item"
  | "pbc"
  | "kyc"
  | "isqm-document"
  | "working-paper";

export const fetchAuditItemDetails = async (
  itemType: AuditItemType,
  itemId: string
) => {
  try {
    if (itemType === "procedure") {
      const response = await axiosInstance.get("/api/procedures", {
        params: { itemId },
      });
      return response.data;
    }

    if (itemType === "planning-procedure") {
      const response = await axiosInstance.get(
        "/api/planning-procedures",
        {
          params: { itemId },
        }
      );
      return response.data;
    }

    if (itemType === "document-request") {
      const response = await axiosInstance.get(
        "/api/document-requests",
        {
          params: { itemId },
        }
      );
      return response.data;
    }

    if (itemType === "checklist-item") {
      const response = await axiosInstance.get("/api/checklist", {
        params: { itemId },
      });
      return response.data;
    }

    if (itemType === "pbc") {
      const response = await axiosInstance.get("/api/pbc", {
        params: { itemId },
      });
      return response.data;
    }

    if (itemType === "kyc") {
      const response = await axiosInstance.get("/api/kyc", {
        params: { itemId },
      });
      return response.data;
    }

    if (itemType === "isqm-document") {
      const response = await axiosInstance.get("/api/isqm", {
        params: { itemId },
      });
      return response.data;
    }

    if (itemType === "working-paper") {
      const response = await axiosInstance.get("/api/working-paper", {
        params: { itemId },
      });
      return response.data;
    }

    console.warn(`Unhandled item type: ${itemType}`);
    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
};
