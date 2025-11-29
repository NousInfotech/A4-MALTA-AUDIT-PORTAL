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
const BASE_URL_TRIAL_BALANCE = "/api/engagements/engagement/excel";

export const msDriveworkbookApi = {
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
    classification: string = null,
    category: string = null // ✅ NEW: Filter by category (lead-sheet, working-paper, evidence)
  ) => {
    try {
      const params: any = { engagementId };
      if (classification) {
        params.classification = classification;
      }
      if (category) {
        params.category = category; // ✅ Add category filter
      }
      console.log('WorkbookAPI: listWorkbooks called with params:', params);
      const response = await axiosInstance.get(`${BASE_URL}/workbooks`, {
        params,
      });
      console.log('WorkbookAPI: listWorkbooks response:', {
        success: response.data.success,
        count: response.data.data?.length || 0,
        workbooks: response.data.data?.map((wb: any) => ({ id: wb._id, name: wb.name, category: wb.category }))
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

  // Fetch sheet data on-demand (for lazy loading)
  fetchSheetData: async (workbookId: string, sheetName: string) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_PATH}/${workbookId}/sheets/${encodeURIComponent(sheetName)}/data`
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: (error as any).response?.data?.error || (error as any).message,
      };
    }
  },



  // New functions for Trial Balance (not classification-aware in the URL)

  uploadTrialBalanceFile: async (request: any) => {
    try {
      const formData = new FormData();
      formData.append("engagementId", request.engagementId);
      const fileBlob = new Blob([request.fileBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      formData.append("file", fileBlob, request.fileName);

      const response = await axiosInstance.post(
        `${BASE_URL_TRIAL_BALANCE}/upload-trial-balance`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
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

  listTrialBalances: async (engagementId: string) => {
    try {
      const params: any = { engagementId };
      const response = await axiosInstance.get(`${BASE_URL_TRIAL_BALANCE}/trial-balances`, {
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

  // Reusing general workbook functions for trial balances if they follow the same structure
  // The BASE_URL would need to be adjusted or passed in dynamically if you want to use the same functions
  // but target the trial balance specific routes.
  // For now, these assume the `workbookId` passed refers to a trial balance workbook and the backend handles the path correctly.

  listTrialBalanceWorksheets: async (workbookId: string) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_URL_TRIAL_BALANCE}/trial-balances/${workbookId}/worksheets` // Adjusted path
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  readTrialBalanceSheet: async (workbookId: string, sheetName: string) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_URL_TRIAL_BALANCE}/trial-balances/${workbookId}/sheets/${encodeURIComponent(
          sheetName
        )}/read` // Adjusted path
      );
      return { success: true, data: response.data.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  },

  saveEntireTrialBalanceWorkbook: async (request: any) => {
    try {
      const response = await axiosInstance.put(
        `${BASE_URL_TRIAL_BALANCE}/trial-balances/${request.workbookId}`, // Adjusted path
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

  saveTrialBalanceSheet: async (request: any) => {
    try {
      const response = await axiosInstance.put(
        `${BASE_URL_TRIAL_BALANCE}/trial-balances/${request.workbookId}/sheets/${request.sheetName}`, // Adjusted path
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
};








// ################################################################################################




export interface MappingCoordinates {
  row: number;
  col: number;
}

const BASE_PATH = "/api/workbooks";

export const db_WorkbookApi = {
  // Save processed workbook and its sheets data to the DB (existing)
  saveProcessedWorkbook: async (workbookData: any, fileData: any) => {
    try {
      const response = await axiosInstance.post(`${BASE_PATH}`, {
        workbook: workbookData,
        fileData: fileData,
      });
      return response.data;
    } catch (error) {
      console.error("Error saving processed workbook:", error);
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          "Failed to save processed workbook.",
      };
    }
  },

  updateSheets: async ( workbookId:string, fileData: any) => {
    try {
      const response = await axiosInstance.post(`${BASE_PATH}/${workbookId}/update-sheets`, {
        
        fileData
      });
      return response.data;
    } catch (error) {
      console.error("Error updating sheets at the workbook:", error);
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          "Failed to update the sheets on workbook.",
      };
    }
  },

  deleteWorkbook: async (workbookId: string) => {
    try {
      // axiosInstance already has 'Content-Type' and potentially 'Authorization' headers configured
      const response = await axiosInstance.delete(`${BASE_PATH}/${workbookId}`);
      return response.data; // Contains { success: true, message: "..." }
    } catch (error) {
      console.error(
        "Error deleting workbook:",
        (error as any).response?.data || (error as any).message
      );
      // Re-throw the error so the calling component can catch and handle it
      throw error;
    }
  },

  // Fetch a workbook with its associated sheets (existing - fetches latest current version)
  fetchWorkbookWithSheets: async (workbookId: string) => {
    try {
      const response = await axiosInstance.get(`${BASE_PATH}/${workbookId}`);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching workbook ${workbookId} with sheets:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          "Failed to fetch workbook with sheets.",
      };
    }
  },

  // **NEW**: Fetch a specific historical version of a workbook
  fetchHistoricalWorkbookVersion: async (
    workbookId: string,
    versionTag: string
  ) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_PATH}/${workbookId}/versions/${versionTag}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching historical workbook ${workbookId} version ${versionTag}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          `Failed to fetch historical workbook version ${versionTag}.`,
      };
    }
  },

  // Fetch a single sheet’s data (MODIFIED to support optional versionTag)
  fetchSheetData: async (
    workbookId: string,
    sheetName: string,
    versionTag?: string
  ) => {
    try {
      let url = `${BASE_PATH}/${workbookId}/sheets/${sheetName}/data`;
      if (versionTag) {
        url += `/${versionTag}`;
      }
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error(
        `Error fetching sheet data for workbook ${workbookId}, sheet ${sheetName}, version ${
          versionTag || "latest"
        }:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error || "Failed to fetch sheet data.",
      };
    }
  },

  // ✅ NEW: List ALL workbooks for an engagement (no classification filter) - similar to getAllClassificationEvidence
  listAllWorkbooksForEngagement: async (
    engagementId: string,
    category?: string // Optional category filter
  ) => {
    try {
      let url = `${BASE_PATH}/engagement/${engagementId}/all`;
      if (category) {
        url += `?category=${encodeURIComponent(category)}`;
      }
      
      console.log('WorkbookAPI (db_WorkbookApi): Fetching ALL workbooks for engagement from:', url);
      const response = await axiosInstance.get(url);
      console.log('WorkbookAPI (db_WorkbookApi): Response (all workbooks):', {
        success: response.data.success,
        count: response.data.data?.length || 0
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error listing all workbooks for engagement ${engagementId}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error || "Failed to list all workbooks.",
      };
    }
  },

  // **NEW**: List all workbooks for a given engagement and optional classification
  listWorkbooks: async (
    engagementId: string, 
    classification?: string,
    category?: string // ✅ NEW: Filter by category
  ) => {
    try {
      let url = `${BASE_PATH}/list`; // Adjusting based on your route definition
      if (engagementId && classification) {
        url = `${BASE_PATH}/${engagementId}/${classification}/workbooks/list`;
        // ✅ Add category as query param if provided
        if (category) {
          url += `?category=${encodeURIComponent(category)}`;
        }
      } else if (engagementId) {
        url = `${BASE_PATH}/${engagementId}/workbooks/list`;
        // If classification is optional, add category as query param
        if (category) {
          url += `?category=${encodeURIComponent(category)}`;
        }
        return {
          success: false,
          error:
            "Both engagementId and classification are required for listing workbooks as per current backend routes.",
        };
      } else {
        return {
          success: false,
          error: "engagementId is required to list workbooks.",
        };
      }

      console.log('WorkbookAPI (db_WorkbookApi): Fetching workbooks from:', url);
      const response = await axiosInstance.get(url);
      console.log('WorkbookAPI (db_WorkbookApi): Response:', {
        success: response.data.success,
        count: response.data.data?.length || 0
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error listing workbooks for engagement ${engagementId}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error || "Failed to list workbooks.",
      };
    }
  },

  listTrialBalanceWorkbooks: async (engagementId: string) => {
    try {
      let url = `/api/workbooks/engagement/${engagementId}/trial-balance/list`;

      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      console.error(
        `Error listing workbooks for engagement ${engagementId}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error || "Failed to list workbooks.",
      };
    }
  },

  // **NEW**: Get a single workbook by its ID (without populating sheets by default)
  getWorkbookById: async (workbookId: string) => {
    try {
      // This route is defined as `router.get('/:workbookId', ...)`
      // The `fetchWorkbookWithSheets` above already uses `/:id`. There's a potential clash or redundancy.
      // Assuming `getWorkbookById` is meant for basic workbook info without sheets populated,
      // and `fetchWorkbookWithSheets` populates sheets.
      // Your backend routes have `router.get('/:id', requireAuth, workbookController.getWorkbookWithSheets);`
      // AND `router.get('/:workbookId', requireAuth, workbookController.getWorkbookById);`
      // This is an **issue** on the backend: two routes with the same pattern `/:id` or `/:workbookId` will conflict.
      // The one defined first will always match.
      // For the client, I'll assume you resolve this backend conflict and provide a distinct route if `getWorkbookById`
      // is truly intended to be different from `getWorkbookWithSheets`.
      // For now, I'll point it to the same route, recognizing the backend ambiguity.
      const response = await axiosInstance.get(`${BASE_PATH}/${workbookId}`);
      return response.data;
    } catch (error) {
      console.error(`Error getting workbook by ID ${workbookId}:`, error);
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          "Failed to get workbook by ID.",
      };
    }
  },

  // **NEW**: Upload parsed workbook and sheet data
  uploadWorkbookDataAndSheetData: async (
    engagementId: string,
    classification: string,
    fileName: string,
    workbookData: any[],
    cloudFileId: string,
    webUrl?: string,
    category?: string 
  ) => {
    try {
      if (!cloudFileId) { // 🌟 ADDED: Client-side validation
        throw new Error("cloudFileId is required for uploading workbook data.");
      }

      const response = await axiosInstance.post(`${BASE_PATH}/work-bookdata`, {
         engagementId,
        classification,
        fileName,
        workbookData,
        webUrl,
        cloudFileId, 
        category,
      });
      return response.data;
    } catch (error) {
      console.error("Error uploading workbook data and sheet data:", error);
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          "Failed to upload workbook data and sheet data.",
      };
    }
  },

  // **NEW**: Save/update entire workbook data (creates new version)
  saveWorkbook: async (
    workbookId: string,
    workbookName: string,
    sheetData: any,
    workbookcloudFileId: string,
    metadata?: any,
    savedByUserId?: string,
    category?: string
  ) => {
    try {
      const response = await axiosInstance.post(`${BASE_PATH}/save-workbook`, {
        workbookId,
        workbookName,
        sheetData,
        workbookcloudFileId,
        metadata,
        savedByUserId,
        category,
      });
      return response.data;
    } catch (error) {
      console.error(`Error saving workbook ${workbookId}:`, error);
      return {
        success: false,
        error:
          (error as any).response?.data?.error || "Failed to save workbook.",
      };
    }
  },

  // **NEW**: Save/update a single sheet's data (creates new workbook version)
  saveSheet: async (
    workbookId: string,
    sheetName: string,
    sheetData: any,
    metadata?: any,
    savedByUserId?: string
  ) => {
    try {
      const response = await axiosInstance.post(`${BASE_PATH}/save-sheet`, {
        workbookId,
        sheetName,
        sheetData,
        metadata,
        savedByUserId,
      });
      return response.data;
    } catch (error) {
      console.error(
        `Error saving sheet ${sheetName} for workbook ${workbookId}:`,
        error
      );
      return {
        success: false,
        error: (error as any).response?.data?.error || "Failed to save sheet.",
      };
    }
  },

  // **NEW**: Get list of sheet names for a workbook
  listSheets: async (workbookId: string) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_PATH}/${workbookId}/sheets`
      );
      return response.data;
    } catch (error) {
      console.error(`Error listing sheets for workbook ${workbookId}:`, error);
      return {
        success: false,
        error: (error as any).response?.data?.error || "Failed to list sheets.",
      };
    }
  },

  // --- Mappings Operations ---

  // **NEW**: Create a new mapping for a workbook
  createMapping: async (
    workbookId: string,
    mappingDetails: {
      sheet: string;
      start: MappingCoordinates; // Updated type
      end: MappingCoordinates; // Updated type
      color: string;
    }
  ) => {
    try {
      const response = await axiosInstance.post(
        `${BASE_PATH}/${workbookId}/mappings`,
        mappingDetails
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error creating mapping for workbook ${workbookId}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error || "Failed to create mapping.",
      };
    }
  },

  // **NEW**: Update an existing mapping for a workbook
  updateMapping: async (
    workbookId: string,
    mappingId: string,
    updatedMappingDetails: {
      sheet?: string;
      start?: MappingCoordinates; // Updated type
      end?: MappingCoordinates; // Updated type
      color?: string;
    }
  ) => {
    try {
      const response = await axiosInstance.put(
        `${BASE_PATH}/${workbookId}/mappings/${mappingId}`,
        updatedMappingDetails
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error updating mapping ${mappingId} for workbook ${workbookId}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error || "Failed to update mapping.",
      };
    }
  },

  // **NEW**: Delete a mapping from a workbook
  deleteMapping: async (workbookId: string, mappingId: string) => {
    try {
      const response = await axiosInstance.delete(
        `${BASE_PATH}/${workbookId}/mappings/${mappingId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error deleting mapping ${mappingId} from workbook ${workbookId}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error || "Failed to delete mapping.",
      };
    }
  },

  // --- Named Ranges Operations ---

  // **NEW**: Create a new named range for a workbook
  createNamedRange: async (
    workbookId: string,
    namedRangeDetails: { name: string; range: string }
  ) => {
    try {
      const response = await axiosInstance.post(
        `${BASE_PATH}/${workbookId}/named-ranges`,
        namedRangeDetails
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error creating named range for workbook ${workbookId}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          "Failed to create named range.",
      };
    }
  },

  // **NEW**: Update an existing named range for a workbook
  updateNamedRange: async (
    workbookId: string,
    namedRangeId: string,
    updatedNamedRangeDetails: { name?: string; range?: string }
  ) => {
    try {
      const response = await axiosInstance.put(
        `${BASE_PATH}/${workbookId}/named-ranges/${namedRangeId}`,
        updatedNamedRangeDetails
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error updating named range ${namedRangeId} for workbook ${workbookId}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          "Failed to update named range.",
      };
    }
  },

  // **NEW**: Delete a named range from a workbook
  deleteNamedRange: async (workbookId: string, namedRangeId: string) => {
    try {
      const response = await axiosInstance.delete(
        `${BASE_PATH}/${workbookId}/named-ranges/${namedRangeId}`
      );
      return response.data;
    } catch (error) {
      console.error(
        `Error deleting named range ${namedRangeId} from workbook ${workbookId}:`,
        error
      );
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          "Failed to delete named range.",
      };
    }
  },

  getWorkbookLogs: async (workbookId: string) => {
    try {
      const response = await axiosInstance.get(
        `${BASE_PATH}/${workbookId}/logs`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching logs for workbook ${workbookId}:`, error);
      return {
        success: false,
        error:
          (error as any).response?.data?.error ||
          "Failed to fetch workbook logs.",
      };
    }
  },
};
