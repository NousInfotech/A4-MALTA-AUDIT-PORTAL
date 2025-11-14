// src/api/documentRequestTemplate.api.ts
import { supabase } from "@/integrations/supabase/client";
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
  isActive?: boolean;
}

// 1. GET ALL (bulk)
const basePath = "/api/document-request-templates";

export const getDrList = () =>
  axiosInstance.get<{ success: boolean; data: DocumentRequestTemplate[] }>(`${basePath}/bulk`);

// 2. GET SINGLE
export const getDrById = (id: string) =>
  axiosInstance.get<{ success: boolean; data: DocumentRequestTemplate }>(`${basePath}/single/${id}`);

// 3. CREATE SINGLE
export const createDr = (payload: Partial<DocumentRequestTemplate>) =>
  axiosInstance.post<{ success: boolean; data: DocumentRequestTemplate }>(`${basePath}/single`, payload);

// 4. UPDATE SINGLE (PUT)
export const updateDr = (id: string, payload: Partial<DocumentRequestTemplate>) =>
  axiosInstance.put<{ success: boolean; data: DocumentRequestTemplate }>(`${basePath}/single/${id}`, payload);

// 5. PATCH SINGLE
export const patchDr = (id: string, payload: Partial<DocumentRequestTemplate>) =>
  axiosInstance.patch<{ success: boolean; data: DocumentRequestTemplate }>(`${basePath}/single/${id}`, payload);

// 6. DELETE SINGLE
export const deleteDr = (id: string) =>
  axiosInstance.delete<{ success: boolean; message?: string }>(`${basePath}/single/${id}`);

// 7. BULK UPDATE (expects array of items with _id)
export const bulkUpdateDr = (payload: Partial<DocumentRequestTemplate>[]) =>
  axiosInstance.put<{ success: boolean; data?: DocumentRequestTemplate[] }>(`${basePath}/bulk`, payload);

// 8. BULK DELETE (send ids array in body)
export const bulkDeleteDr = (ids: string[]) =>
  axiosInstance.delete<{ success: boolean; message?: string }>(`${basePath}/bulk`, { data: ids });

// 9. UPLOAD TEMPLATE
export const uploadTemplate = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await supabase.auth.getSession();

    const uploadResponse = await axiosInstance.post(`${basePath}/template/upload`, formData, {
      headers: {
        Authorization: `Bearer ${data.session?.access_token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return uploadResponse.data.url as string;
  } catch (error) {
    console.error('Failed to upload template:', error);
    throw error;
  }
};
