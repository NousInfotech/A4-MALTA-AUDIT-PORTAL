import axiosInstance from "../axiosInstance";

const API_BASE = "/api/document-requests";

export async function getAllDocumentRequestsbyEngagementId(engagementId: string) {
  const response = await axiosInstance.get(
    `${API_BASE}/engagement/${engagementId}`
  );
  return response.data;
}


export async function deleteDocumentRequestsbyId(requestId: string) {
  const response = await axiosInstance.delete(
    `${API_BASE}/${requestId}`
  );
  return response.data;
}

