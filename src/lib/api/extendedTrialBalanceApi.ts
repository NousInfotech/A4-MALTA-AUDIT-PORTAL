import axiosInstance from "../axiosInstance";

// TypeScript interfaces for Extended Trial Balance API
export interface Workbook {
  _id: string;
  engagementId: string;
  classification?: string;
  cloudFileId: string;
  name: string;
  webUrl?: string;
  uploadedBy: string;
  uploadedDate: string;
  lastModifiedBy?: string;
  lastModifiedDate: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ETBMapping {
  _id: string;
  workbookId: Workbook;
  color: string;
  details: {
    sheet: string;
    start: {
      row: number;
      col: number;
    };
    end: {
      row: number;
      col: number;
    };
  };
  isActive: boolean;
}

export interface ETBRow {
  _id: string;
  code: string;
  accountName: string;
  currentYear: number;
  priorYear: number;
  adjustments: number;
  finalBalance: number;
  classification: string;
  linkedExcelFiles: Workbook[];
  mappings: ETBMapping[];
}

export interface ETBData {
  _id: string;
  engagement: string;
  classification: string;
  rows: ETBRow[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMappingRequest {
  workbookId: string;
  color: string;
  details: {
    sheet: string;
    start: {
      row: number;
      col: number;
    };
    end: {
      row: number;
      col: number;
    };
  };
}

export interface UpdateMappingRequest {
  color?: string;
  details?: {
    sheet: string;
    start: {
      row: number;
      col: number;
    };
    end: {
      row: number;
      col: number;
    };
  };
  isActive?: boolean;
}

export interface WorkbookMappingInfo {
  etbId: string;
  engagementId: string;
  rowId: string;
  rowCode: string;
  rowAccountName: string;
  mapping: ETBMapping;
}

// ========================================
// Extended Trial Balance with Mappings API Functions
// ========================================

/**
 * Fetches Extended Trial Balance with mappings for a specific engagement
 * @param engagementId - The engagement ID
 * @param classification - Optional classification filter
 * @returns Promise<ETBData> - The ETB data with mappings
 */
export const getExtendedTrialBalanceWithMappings = async (
  engagementId: string,
  classification?: string
): Promise<ETBData> => {
  try {
    if (!engagementId) {
      throw new Error("Engagement ID is required");
    }
    
    const url = `/api/engagements/${engagementId}/extended-trial-balance`;
    const params = classification ? { classification } : {};
    
    console.log('API call:', { url, params, engagementId, classification });
    const response = await axiosInstance.get(url, { params });

    return response.data.data;
  } catch (error) {
    console.error("Error fetching Extended Trial Balance with mappings:", error);
    throw error;
  }
};

/**
 * Creates or updates Extended Trial Balance
 * @param engagementId - The engagement ID
 * @param rows - Array of ETB rows
 * @returns Promise<ETBData> - The created/updated ETB data
 */
export const createOrUpdateExtendedTrialBalance = async (
  engagementId: string,
  rows: ETBRow[]
): Promise<ETBData> => {
  try {
    const response = await axiosInstance.post(
      `/api/engagements/${engagementId}/extended-trial-balance`,
      { rows }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error creating/updating Extended Trial Balance:", error);
    throw error;
  }
};

/**
 * Adds a mapping to a specific ETB row
 * @param engagementId - The engagement ID
 * @param rowId - The row ID
 * @param mappingData - The mapping data to create
 * @returns Promise<ETBData> - The updated ETB data
 */
export const addMappingToRow = async (
  engagementId: string,
  rowId: string,
  mappingData: CreateMappingRequest
): Promise<ETBData> => {
  try {
    console.log('API: Sending mapping data:', mappingData);
    console.log('API: URL:', `/api/engagements/${engagementId}/extended-trial-balance/rows/${rowId}/mappings`);
    
    const response = await axiosInstance.post(
      `/api/engagements/${engagementId}/extended-trial-balance/rows/${rowId}/mappings`,
      mappingData
    );

    return response.data.data;
  } catch (error) {
    console.error("Error adding mapping to row:", error);
    throw error;
  }
};

/**
 * Updates a specific mapping
 * @param engagementId - The engagement ID
 * @param rowId - The row ID
 * @param mappingId - The mapping ID
 * @param updateData - The mapping data to update
 * @returns Promise<ETBData> - The updated ETB data
 */
export const updateMapping = async (
  engagementId: string,
  rowId: string,
  mappingId: string,
  updateData: UpdateMappingRequest
): Promise<ETBData> => {
  try {
    const response = await axiosInstance.put(
      `/api/engagements/${engagementId}/extended-trial-balance/rows/${rowId}/mappings/${mappingId}`,
      updateData
    );

    return response.data.data;
  } catch (error) {
    console.error("Error updating mapping:", error);
    throw error;
  }
};

/**
 * Removes a mapping from a specific ETB row
 * @param engagementId - The engagement ID
 * @param rowId - The row ID
 * @param mappingId - The mapping ID to remove
 * @returns Promise<ETBData> - The updated ETB data
 */
export const removeMappingFromRow = async (
  engagementId: string,
  rowId: string,
  mappingId: string
): Promise<ETBData> => {
  try {
    const response = await axiosInstance.delete(
      `/api/engagements/${engagementId}/extended-trial-balance/rows/${rowId}/mappings/${mappingId}`
    );

    return response.data.data;
  } catch (error) {
    console.error("Error removing mapping from row:", error);
    throw error;
  }
};

/**
 * Toggles the active status of a mapping
 * @param engagementId - The engagement ID
 * @param rowId - The row ID
 * @param mappingId - The mapping ID
 * @param isActive - The new active status
 * @returns Promise<ETBData> - The updated ETB data
 */
export const toggleMappingStatus = async (
  engagementId: string,
  rowId: string,
  mappingId: string,
  isActive: boolean
): Promise<ETBData> => {
  try {
    const response = await axiosInstance.patch(
      `/api/engagements/${engagementId}/extended-trial-balance/rows/${rowId}/mappings/${mappingId}/toggle`,
      { isActive }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error toggling mapping status:", error);
    throw error;
  }
};

/**
 * Gets all mappings for a specific workbook across all ETBs
 * @param workbookId - The workbook ID
 * @returns Promise<WorkbookMappingInfo[]> - Array of mapping information
 */
export const getMappingsByWorkbook = async (
  workbookId: string
): Promise<WorkbookMappingInfo[]> => {
  try {
    const response = await axiosInstance.get(
      `/api/engagements/extended-trial-balance/mappings/workbook/${workbookId}`
    );

    return response.data.data;
  } catch (error) {
    console.error("Error fetching mappings by workbook:", error);
    throw error;
  }
};

// ========================================
// Legacy API Functions (for backward compatibility)
// ========================================

/**
 * Fetches Extended Trial Balance with linked Excel files for a specific engagement and classification
 * @param engagementId - The engagement ID
 * @param classification - The classification name (use 'ETB' for all rows)
 * @returns Promise<ETBData> - The ETB data with linked files
 */
export const getExtendedTBWithLinkedFiles = async (
  engagementId: string,
  classification: string
): Promise<ETBData> => {
  try {
    const response = await axiosInstance.get(
      `/api/engagements/${engagementId}/etb/${encodeURIComponent(
        classification
      )}/with-linked-files`
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching Extended Trial Balance with linked files:", error);
    throw error;
  }
};

/**
 * Removes a workbook from the linked files of a specific ETB row
 * @param engagementId - The engagement ID
 * @param classification - The classification name
 * @param rowId - The row ID to remove the workbook from
 * @param workbookId - The workbook ID to remove
 * @returns Promise<any> - The API response
 */
export const deleteWorkbookFromLinkedFilesInExtendedTB = async (
  engagementId: string,
  classification: string,
  rowId: string,
  workbookId: string
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `/api/engagements/${engagementId}/etb/${encodeURIComponent(
        classification
      )}/delete-linked-file`,
      {
        data: { rowId, workbookId }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error removing workbook from linked files in ETB:", error);
    throw error;
  }
};

/**
 * Updates the linked Excel files for a specific ETB row
 * @param engagementId - The engagement ID
 * @param classification - The classification name
 * @param rowId - The row ID to update
 * @param linkedExcelFiles - Array of workbook IDs to link
 * @returns Promise<any> - The API response
 */
export const updateLinkedExcelFilesInExtendedTB = async (
  engagementId: string,
  classification: string,
  rowId: string,
  linkedExcelFiles: string[]
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `/api/engagements/${engagementId}/etb/${encodeURIComponent(
        classification
      )}/update-linked-files`,
      {
        rowId,
        linkedExcelFiles
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error updating linked Excel files in ETB:", error);
    throw error;
  }
};
