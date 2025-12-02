// src/api/documentRequestTemplate.api.ts
import { supabase } from "@/integrations/supabase/client";
import axiosInstance from "../axiosInstance";

export interface TemplateItem {
  label: string;
  template?: {
    url?: string;
    instructions?: string;
  };
}

export interface DocumentRequestTemplate {
  _id: string;
  name: string;
  description?: string;
  type: "template" | "direct" | "multiple";
  template?: {
    url?: string;
    instructions?: string;
  };
  multiple?: TemplateItem[];
  category?: string;
  isActive?: boolean;
}

// 1. GET ALL (bulk)
const basePath = "/api/document-request-templates";

export const getDrList = (category?: string) => {
  const url =
    category && category.trim().length > 0
      ? `${basePath}/bulk?category=${encodeURIComponent(category)}`
      : `${basePath}/bulk`;

  return axiosInstance.get<{ success: boolean; data: DocumentRequestTemplate[] }>(url);
};

// 2. GET SINGLE
export const getDrById = (id: string) =>
  axiosInstance.get<{ success: boolean; data: DocumentRequestTemplate }>(`${basePath}/single/${id}`);

// 3. CREATE SINGLE
export const createDr = (payload: Partial<DocumentRequestTemplate>, category?: string) => {
  const url =
    category && category.trim().length > 0
      ? `${basePath}/single?category=${encodeURIComponent(category)}`
      : `${basePath}/single`;

  return axiosInstance.post<{ success: boolean; data: DocumentRequestTemplate }>(url, payload);
};

// 4. UPDATE SINGLE (PUT)
export const updateDr = (
  id: string,
  payload: Partial<DocumentRequestTemplate>,
  category?: string
) => {
  const url =
    category && category.trim().length > 0
      ? `${basePath}/single/${id}?category=${encodeURIComponent(category)}`
      : `${basePath}/single/${id}`;

  return axiosInstance.put<{ success: boolean; data: DocumentRequestTemplate }>(url, payload);
};

// 5. PATCH SINGLE
export const patchDr = (
  id: string,
  payload: Partial<DocumentRequestTemplate>,
  category?: string
) => {
  const url =
    category && category.trim().length > 0
      ? `${basePath}/single/${id}?category=${encodeURIComponent(category)}`
      : `${basePath}/single/${id}`;

  return axiosInstance.patch<{ success: boolean; data: DocumentRequestTemplate }>(url, payload);
};

// 6. DELETE SINGLE
export const deleteDr = (id: string) =>
  axiosInstance.delete<{ success: boolean; message?: string }>(`${basePath}/single/${id}`);

// 7. BULK UPDATE (expects array of items with _id)
export const bulkUpdateDr = (
  payload: Partial<DocumentRequestTemplate>[],
  category?: string
) => {
  const url =
    category && category.trim().length > 0
      ? `${basePath}/bulk?category=${encodeURIComponent(category)}`
      : `${basePath}/bulk`;

  return axiosInstance.put<{ success: boolean; data?: DocumentRequestTemplate[] }>(url, payload);
};

// 8. BULK DELETE (send ids array in body)
export const bulkDeleteDr = (ids: string[]) =>
  axiosInstance.delete<{ success: boolean; message?: string }>(`${basePath}/bulk`, { data: ids });

// 9. UPLOAD TEMPLATE
export const uploadTemplate = async (file: File, category?: string) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await supabase.auth.getSession();

    const url =
      category && category.trim().length > 0
        ? `${basePath}/template/upload?category=${encodeURIComponent(category)}`
        : `${basePath}/template/upload`;

    const uploadResponse = await axiosInstance.post(url, formData, {
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

// 10. UPLOAD MULTIPLE TEMPLATES
export const uploadMultipleTemplates = async (files: File[], category?: string) => {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const { data } = await supabase.auth.getSession();

    const url =
      category && category.trim().length > 0
        ? `${basePath}/template/upload-multiple?category=${encodeURIComponent(category)}`
        : `${basePath}/template/upload-multiple`;

    const uploadResponse = await axiosInstance.post<{
      success: boolean;
      files: Array<{
        url: string;
        filename: string;
        originalName: string;
        index: number;
      }>;
    }>(url, formData, {
      headers: {
        Authorization: `Bearer ${data.session?.access_token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    return uploadResponse.data.files;
  } catch (error) {
    console.error('Failed to upload multiple templates:', error);
    throw error;
  }
};
