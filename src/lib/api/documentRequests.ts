import axiosInstance from "../axiosInstance";

const API_BASE = "/api/document-requests";

export async function getDocumentRequests(engagementId: string) {
  const response = await axiosInstance.get(
    `${API_BASE}/engagement/${engagementId}`
  );
  return response.data;
}
