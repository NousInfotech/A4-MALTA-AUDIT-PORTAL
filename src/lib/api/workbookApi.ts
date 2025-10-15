// src/lib/api/workbookApi.ts

import { Workbook, SheetData } from "../../types/audit-workbooks/types";
import axiosInstance from "../axiosInstance";

// Define the shape of responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Define request types for clarity
interface UploadFileRequest {
  engagementId: string;
  classification?: string;
  fileName: string;
  fileBuffer: ArrayBuffer; // Changed from Buffer to ArrayBuffer for browser compatibility
}

interface UploadFileResponseData {
  id: string;
  name: string;
  webUrl: string;
}

interface ListWorksheetsResponseData {
  id: string; // The worksheet ID from Graph
  name: string;
  position: number;
}

export interface SaveWorkbookRequest {
  workbookId: string;
  workbookName: string;
  version: string;
  sheetData: SheetData; // Your processed sheet data (with headers, row numbers)
  metadata: {
    uploadedDate: string;
    lastModifiedBy: string;
    lastModified: string;
  };
}

export interface SaveSheetRequest {
  workbookId: string;
  workbookName: string;
  sheetName: string;
  sheetData: string[][]; // The data for the specific sheet
  metadata: {
    uploadedDate: string;
    lastModifiedBy: string;
    lastModified: string;
  };
}

const BASE_URL = "/api/engagements/engagement/classification/excel"; // Your backend endpoint prefix

export const workbookApi = {
  saveWorkbook: async (request: any) => {
    try {
      const response = await axiosInstance.put(
        `${BASE_URL}/workbooks/${request.workbookId}`,
        request
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      // Access error response data if available, otherwise use error message
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  saveSheet: async (request: any) => {
    try {
      const response = await axiosInstance.put(
        `${BASE_URL}/workbooks/${request.workbookId}/sheets/${request.sheetName}`,
        request
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  uploadFile: async (request: any) => {
    try {
      const formData = new FormData();
      formData.append("engagementId", request.engagementId);
      if (request.classification) {
        formData.append("classification", request.classification);
      }
      // Assuming request.fileBuffer is an ArrayBuffer already
      const fileBlob = new Blob([request.fileBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      formData.append("file", fileBlob, request.fileName);

      const response = await axiosInstance.post(
        `${BASE_URL}/upload-workbook`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data", // Axios handles this for FormData
          },
        }
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  listWorkbooks: async (
    engagementId: string,
    classification: string = null
  ) => {
    try {
      const params: any = { engagementId };
      if (classification) {
        params.classification = classification;
      }
      const response = await axiosInstance.get(`${BASE_URL}/workbooks`, {
        params,
      });
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  listWorksheets: async (workbookId: string) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_URL}/workbooks/${workbookId}/worksheets`
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  readSheet: async (workbookId: string, sheetName: string) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_URL}/workbooks/${workbookId}/sheets/${encodeURIComponent(
          sheetName
        )}/read`
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },
};
