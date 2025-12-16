import axiosInstance from "../axiosInstance";

const financialStatementReviewApi = {
  generateFinancialStatementReview: async (
    engagementId: string,
    file: File
  ) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Don't set Content-Type header - let axios interceptor handle it
      // This allows axios to automatically set the boundary for multipart/form-data
      const response = await axiosInstance.post(
        `/api/financial-statement-reviews/generate-review/${engagementId}`,
        formData
      );
      return response.data.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

export default financialStatementReviewApi;
