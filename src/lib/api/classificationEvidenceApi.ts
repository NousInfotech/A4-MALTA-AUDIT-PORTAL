import axiosInstance from "../axiosInstance";

// TypeScript interfaces for Classification Evidence API
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

export interface EvidenceMapping {
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

export interface ClassificationEvidence {
  _id: string;
  engagementId: string;
  classificationId: string;
  evidenceUrl: string;
  uploadedBy: {
    userId: string;
    name: string;
    email: string;
  };
  linkedWorkbooks: Workbook[]; // Array of populated workbook references
  mappings: EvidenceMapping[]; // Array of mappings with populated workbook info
  evidenceComments: Array<{
    commentor: {
      userId: string;
      name: string;
      email: string;
    };
    comment: string;
    timestamp: string;
  }>;
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
  evidenceId: string;
  evidenceUrl: string;
  mapping: EvidenceMapping;
}

// ========================================
// Classification Evidence with Mappings API Functions
// ========================================

/**
 * Fetches a single evidence file with populated linkedWorkbooks and mappings
 * @param evidenceId - The evidence file ID
 * @returns Promise<ClassificationEvidence> - The evidence data with mappings
 */
export const getEvidenceWithMappings = async (
  evidenceId: string
): Promise<ClassificationEvidence> => {
  try {
    if (!evidenceId) {
      throw new Error("Evidence ID is required");
    }
    
    const url = `/api/classification-evidence/${evidenceId}/with-mappings`;
    
    console.log('EvidenceAPI: Fetching evidence with mappings:', { url, evidenceId });
    const response = await axiosInstance.get(url);

    if (Array.isArray(response.data?.evidence)) {
      return response.data.evidence[0];
    }

    return response.data.data;
  } catch (error) {
    console.error("Error fetching evidence with mappings:", error);
    throw error;
  }
};

/**
 * Links a workbook to an evidence file
 * @param evidenceId - The evidence file ID
 * @param workbookId - The workbook ID to link
 * @returns Promise<ClassificationEvidence> - The updated evidence data
 */
export const linkWorkbookToEvidence = async (
  evidenceId: string,
  workbookId: string
): Promise<ClassificationEvidence> => {
  try {
    console.log('EvidenceAPI: Linking workbook to evidence:', { evidenceId, workbookId });
    
    const response = await axiosInstance.post(
      `/api/classification-evidence/${evidenceId}/linked-workbooks/${workbookId}`
    );

    return response.data.data;
  } catch (error) {
    console.error("Error linking workbook to evidence:", error);
    throw error;
  }
};

/**
 * Unlinks a workbook from an evidence file
 * @param evidenceId - The evidence file ID
 * @param workbookId - The workbook ID to unlink
 * @returns Promise<ClassificationEvidence> - The updated evidence data
 */
export const unlinkWorkbookFromEvidence = async (
  evidenceId: string,
  workbookId: string
): Promise<ClassificationEvidence> => {
  try {
    console.log('EvidenceAPI: Unlinking workbook from evidence:', { evidenceId, workbookId });
    
    const response = await axiosInstance.delete(
      `/api/classification-evidence/${evidenceId}/linked-workbooks/${workbookId}`
    );

    return response.data.data;
  } catch (error) {
    console.error("Error unlinking workbook from evidence:", error);
    throw error;
  }
};

/**
 * Adds a mapping to an evidence file
 * @param evidenceId - The evidence file ID
 * @param mappingData - The mapping data to create
 * @returns Promise<ClassificationEvidence> - The updated evidence data
 */
export const addMappingToEvidence = async (
  evidenceId: string,
  mappingData: CreateMappingRequest
): Promise<ClassificationEvidence> => {
  try {
    console.log('EvidenceAPI: Adding mapping to evidence:', {
      evidenceId,
      mappingData
    });
    
    const response = await axiosInstance.post(
      `/api/classification-evidence/${evidenceId}/mappings`,
      mappingData
    );

    return response.data.data;
  } catch (error) {
    console.error("Error adding mapping to evidence:", error);
    throw error;
  }
};

/**
 * Updates a specific mapping in an evidence file
 * @param evidenceId - The evidence file ID
 * @param mappingId - The mapping ID
 * @param updateData - The mapping data to update
 * @returns Promise<ClassificationEvidence> - The updated evidence data
 */
export const updateEvidenceMapping = async (
  evidenceId: string,
  mappingId: string,
  updateData: UpdateMappingRequest
): Promise<ClassificationEvidence> => {
  try {
    const response = await axiosInstance.put(
      `/api/classification-evidence/${evidenceId}/mappings/${mappingId}`,
      updateData
    );

    return response.data.data;
  } catch (error) {
    console.error("Error updating evidence mapping:", error);
    throw error;
  }
};

/**
 * Removes a mapping from an evidence file
 * @param evidenceId - The evidence file ID
 * @param mappingId - The mapping ID to remove
 * @returns Promise<ClassificationEvidence> - The updated evidence data
 */
export const removeMappingFromEvidence = async (
  evidenceId: string,
  mappingId: string
): Promise<ClassificationEvidence> => {
  try {
    const response = await axiosInstance.delete(
      `/api/classification-evidence/${evidenceId}/mappings/${mappingId}`
    );

    return response.data.data;
  } catch (error) {
    console.error("Error removing mapping from evidence:", error);
    throw error;
  }
};

/**
 * Toggles the active status of an evidence mapping
 * @param evidenceId - The evidence file ID
 * @param mappingId - The mapping ID
 * @param isActive - The new active status
 * @returns Promise<ClassificationEvidence> - The updated evidence data
 */
export const toggleEvidenceMappingStatus = async (
  evidenceId: string,
  mappingId: string,
  isActive: boolean
): Promise<ClassificationEvidence> => {
  try {
    const response = await axiosInstance.patch(
      `/api/classification-evidence/${evidenceId}/mappings/${mappingId}/toggle`,
      { isActive }
    );

    return response.data.data;
  } catch (error) {
    console.error("Error toggling evidence mapping status:", error);
    throw error;
  }
};

/**
 * Gets all mappings for a specific workbook across all evidence files
 * @param workbookId - The workbook ID
 * @returns Promise<WorkbookMappingInfo[]> - Array of mapping information
 */
export const getEvidenceMappingsByWorkbook = async (
  workbookId: string
): Promise<WorkbookMappingInfo[]> => {
  try {
    const response = await axiosInstance.get(
      `/api/classification-evidence/workbooks/${workbookId}/mappings`
    );

    return response.data.data;
  } catch (error) {
    console.error("Error fetching evidence mappings by workbook:", error);
    throw error;
  }
};

