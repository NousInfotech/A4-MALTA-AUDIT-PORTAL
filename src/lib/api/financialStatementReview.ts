import axiosInstance from "../axiosInstance";

const financialStatementReviewApi = {
  generateFinancialStatementReview: async (
    engagementId: string,
    file: File,
    includeTests: string[] = ["ALL"],
    includePortalData: boolean = false
  ) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("includeTests", JSON.stringify(includeTests));
      formData.append("includePortalData", includePortalData.toString());
      
      // Don't set Content-Type header - let axios interceptor handle it
      // This allows axios to automatically set the boundary for multipart/form-data
      const response = await axiosInstance.post(
        `/api/financial-statement-reviews/generate-review/${engagementId}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
};

export default financialStatementReviewApi;
