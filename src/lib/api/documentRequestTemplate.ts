// src/api/documentRequestTemplate.api.ts
import axiosInstance from "../axiosInstance";

export interface DocumentRequestTemplate {
  _id: string;
  name: string;
  description?: string;
  type: "template" | "direct";
  template?: {
    url?: string;
    instructions?: string;
  };
  category?: string;
  uploadedBy?: string;
  isActive?: boolean;
}

// 1. GET ALL (bulk)
export const getDrList = () =>
  axiosInstance.get<{ success: boolean; data: DocumentRequestTemplate[] }>("/api/document-request-template/bulk");

// 2. GET SINGLE
export const getDrById = (id: string) =>
  axiosInstance.get<{ success: boolean; data: DocumentRequestTemplate }>(`/api/document-request-template/single/${id}`);

// 3. CREATE SINGLE
export const createDr = (payload: Partial<DocumentRequestTemplate>) =>
  axiosInstance.post<{ success: boolean; data: DocumentRequestTemplate }>(`/api/document-request-template/single`, payload);

// 4. UPDATE SINGLE (PUT)
export const updateDr = (id: string, payload: Partial<DocumentRequestTemplate>) =>
  axiosInstance.put<{ success: boolean; data: DocumentRequestTemplate }>(`/api/document-request-template/single/${id}`, payload);

// 5. PATCH SINGLE
export const patchDr = (id: string, payload: Partial<DocumentRequestTemplate>) =>
  axiosInstance.patch<{ success: boolean; data: DocumentRequestTemplate }>(`/api/document-request-template/single/${id}`, payload);

// 6. DELETE SINGLE
export const deleteDr = (id: string) =>
  axiosInstance.delete<{ success: boolean; message?: string }>(`/api/document-request-template/single/${id}`);

// 7. BULK UPDATE (expects array of items with _id)
export const bulkUpdateDr = (payload: Partial<DocumentRequestTemplate>[]) =>
  axiosInstance.put<{ success: boolean; data?: DocumentRequestTemplate[] }>(`/api/document-request-template/bulk`, payload);

// 8. BULK DELETE (send ids array in body)
export const bulkDeleteDr = (ids: string[]) =>
  axiosInstance.delete<{ success: boolean; message?: string }>(`/api/document-request-template/bulk`, { data: ids });
