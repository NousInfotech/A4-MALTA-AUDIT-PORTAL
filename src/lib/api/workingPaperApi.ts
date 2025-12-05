import axiosInstance from "../axiosInstance";

// TypeScript interfaces for Working Paper API
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

export interface MappingReferenceFile {
  fileName: string;
  fileUrl: string;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface WPMapping {
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
  referenceFiles?: MappingReferenceFile[];
}

export interface WPRow {
  _id: string;
  code: string;
  accountName: string;
  currentYear: number;
  priorYear: number;
  adjustments: number;
  finalBalance: number;
  classification: string;
  reference?: string;
  referenceData?: any;
  linkedExcelFiles: Workbook[];
  mappings: WPMapping[];
}

export interface WorkingPaperData {
  _id: string;
  engagement: string;
  classification: string;
  rows: WPRow[];
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
  referenceFiles?: MappingReferenceFile[];
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
  workingPaperId: string;
  engagementId: string;
  rowId: string;
  rowCode: string;
  rowAccountName: string;
  mapping: WPMapping;
}

// ========================================
// Working Paper with Mappings API Functions
// ========================================

/**
 * Fetches Working Paper with mappings for a specific engagement and classification
 * @param engagementId - The engagement ID
 * @param classification - The classification filter
 * @returns Promise<WorkingPaperData> - The Working Paper data with mappings
 */
export const getWorkingPaperWithMappings = async (
  engagementId: string,
  classification: string
): Promise<WorkingPaperData> => {
  try {
    if (!engagementId || !classification) {
      throw new Error("Engagement ID and classification are required");
    }
    
    const url = `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}`;
    
    console.log('WorkingPaperAPI: Fetching WP with mappings:', { url, engagementId, classification });
    const response = await axiosInstance.get(url);

    return response.data.data;
  } catch (error) {
    console.error("Error fetching Working Paper with mappings:", error);
    throw error;
  }
};

/**
 * Fetches Working Paper with linked files populated (similar to ETB's getExtendedTBWithLinkedFiles)
 * @param engagementId - The engagement ID
 * @param classification - The classification filter
 * @returns Promise<WorkingPaperData> - The Working Paper data with linked files populated
 */
export const getWorkingPaperWithLinkedFiles = async (
  engagementId: string,
  classification: string
): Promise<WorkingPaperData> => {
  try {
    if (!engagementId || !classification) {
      throw new Error("Engagement ID and classification are required");
    }
    
    const url = `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}`;
    
    console.log('WorkingPaperAPI: Fetching WP with linked files:', { url, engagementId, classification });
    const response = await axiosInstance.get(url);

    return response.data.data;
  } catch (error) {
    console.error("Error fetching Working Paper with linked files:", error);
    throw error;
  }
};

/**
 * Creates or updates Working Paper
 * @param engagementId - The engagement ID
 * @param classification - The classification
 * @param rows - Array of Working Paper rows
 * @returns Promise<WorkingPaperData> - The created/updated Working Paper data
 */
export const createOrUpdateWorkingPaper = async (
  engagementId: string,
  classification: string,
  rows: WPRow[]
): Promise<WorkingPaperData> => {
  try {
    const response = await axiosInstance.post(
      `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}`,
      { rows }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error creating/updating Working Paper:", error);
    throw error;
  }
};

/**
 * Adds a mapping to a specific Working Paper row
 * @param engagementId - The engagement ID
 * @param classification - The classification
 * @param rowCode - The row code
 * @param mappingData - The mapping data to create
 * @returns Promise<WorkingPaperData> - The updated Working Paper data
 */
export const addMappingToWPRow = async (
  engagementId: string,
  classification: string,
  rowCode: string,
  mappingData: CreateMappingRequest
): Promise<WorkingPaperData> => {
  try {
    console.log('WorkingPaperAPI: Adding mapping to WP row:', {
      engagementId,
      classification,
      rowCode,
      mappingData
    });
    
    const response = await axiosInstance.post(
      `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}/rows/${rowCode}/mappings`,
      {
        ...mappingData,
        engagementId,
        classification,
        rowId: rowCode,
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error adding mapping to Working Paper row:", error);
    throw error;
  }
};

/**
 * Updates a specific mapping in a Working Paper row
 * @param engagementId - The engagement ID
 * @param classification - The classification
 * @param rowCode - The row code
 * @param mappingId - The mapping ID
 * @param updateData - The mapping data to update
 * @returns Promise<WorkingPaperData> - The updated Working Paper data
 */
export const updateWPMapping = async (
  engagementId: string,
  classification: string,
  rowCode: string,
  mappingId: string,
  updateData: UpdateMappingRequest
): Promise<WorkingPaperData> => {
  try {
    const response = await axiosInstance.put(
      `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}/rows/${rowCode}/mappings/${mappingId}`,
      {
        ...updateData,
        engagementId,
        classification,
        rowId: rowCode,
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error updating Working Paper mapping:", error);
    throw error;
  }
};

/**
 * Removes a mapping from a specific Working Paper row
 * @param engagementId - The engagement ID
 * @param classification - The classification
 * @param rowCode - The row code
 * @param mappingId - The mapping ID to remove
 * @returns Promise<WorkingPaperData> - The updated Working Paper data
 */
export const removeMappingFromWPRow = async (
  engagementId: string,
  classification: string,
  rowCode: string,
  mappingId: string
): Promise<WorkingPaperData> => {
  try {
    const response = await axiosInstance.delete(
      `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}/rows/${rowCode}/mappings/${mappingId}`,
      {
        data: {
          engagementId,
          classification,
          rowId: rowCode,
        },
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error removing mapping from Working Paper row:", error);
    throw error;
  }
};

/**
 * Toggles the active status of a Working Paper mapping
 * @param engagementId - The engagement ID
 * @param classification - The classification
 * @param rowCode - The row code
 * @param mappingId - The mapping ID
 * @param isActive - The new active status
 * @returns Promise<WorkingPaperData> - The updated Working Paper data
 */
export const toggleWPMappingStatus = async (
  engagementId: string,
  classification: string,
  rowCode: string,
  mappingId: string,
  isActive: boolean
): Promise<WorkingPaperData> => {
  try {
    const response = await axiosInstance.patch(
      `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}/rows/${rowCode}/mappings/${mappingId}/toggle`,
      {
        isActive,
        engagementId,
        classification,
        rowId: rowCode,
      }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error toggling Working Paper mapping status:", error);
    throw error;
  }
};

/**
 * Gets all mappings for a specific workbook across all Working Paper rows
 * @param engagementId - The engagement ID
 * @param classification - The classification
 * @param workbookId - The workbook ID
 * @returns Promise<WorkbookMappingInfo[]> - Array of mapping information
 */
export const getWPMappingsByWorkbook = async (
  engagementId: string,
  classification: string,
  workbookId: string
): Promise<WorkbookMappingInfo[]> => {
  try {
    const response = await axiosInstance.get(
      `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}/workbooks/${workbookId}/mappings`
    );

    return response.data.data;
  } catch (error) {
    console.error("Error fetching Working Paper mappings by workbook:", error);
    throw error;
  }
};

/**
 * Updates the linkedExcelFiles array for a specific Working Paper row
 * @param engagementId - The engagement ID
 * @param classification - The classification
 * @param rowCode - The row code
 * @param linkedExcelFileIds - Array of workbook IDs to link
 * @returns Promise<WorkingPaperData> - The updated Working Paper data
 */
export const updateLinkedExcelFilesInWP = async (
  engagementId: string,
  classification: string,
  rowCode: string,
  linkedExcelFileIds: string[]
): Promise<WorkingPaperData> => {
  try {
    console.log('WorkingPaperAPI: Updating linked files for WP row:', {
      engagementId,
      classification,
      rowCode,
      linkedExcelFileIds
    });

    const response = await axiosInstance.put(
      `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}/rows/${rowCode}/linked-files`,
      { linkedExcelFiles: linkedExcelFileIds }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error updating linked files in Working Paper:", error);
    throw error;
  }
};

/**
 * Removes a workbook from the linkedExcelFiles array of a Working Paper row
 * @param engagementId - The engagement ID
 * @param classification - The classification
 * @param rowCode - The row code
 * @param workbookId - The workbook ID to remove
 * @returns Promise<WorkingPaperData> - The updated Working Paper data
 */
export const deleteWorkbookFromLinkedFilesInWP = async (
  engagementId: string,
  classification: string,
  rowCode: string,
  workbookId: string
): Promise<WorkingPaperData> => {
  try {
    console.log('WorkingPaperAPI: Removing workbook from WP row:', {
      engagementId,
      classification,
      rowCode,
      workbookId
    });

    const response = await axiosInstance.delete(
      `/api/working-papers/${engagementId}/${encodeURIComponent(classification)}/rows/${rowCode}/linked-files/${workbookId}`
    );

    return response.data.data;
  } catch (error) {
    console.error("Error removing workbook from Working Paper linked files:", error);
    throw error;
  }
};

