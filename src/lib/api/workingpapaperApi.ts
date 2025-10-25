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

export interface WorkingPaperRow {
  id: string;
  code: string;
  accountName: string;
  currentYear: number;
  priorYear: number;
  adjustments: number;
  finalBalance: number;
  classification: string;
  reference: string | any;
  referenceData: string | any;
  linkedExcelFiles: Workbook[];
}

export interface WorkingPaperData {
  engagement: string;
  classification: string;
  rows: WorkingPaperRow[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetches working papers with their linked Excel files for a specific engagement and classification
 * @param engagementId - The engagement ID
 * @param classification - The classification name
 * @returns Promise<WorkingPaperData> - The working paper data with linked files
 */
export const getWorkingPapersWithLinkedFiles = async (
  engagementId: string,
  classification: string
): Promise<WorkingPaperData> => {
  try {
    const response = await axiosInstance.get(
      `/api/engagements/${engagementId}/sections/${encodeURIComponent(
        classification
      )}/working-papers/with-linked-files`
    );

    return response.data;
  } catch (error) {
    console.error("Error fetching working papers with linked files:", error);
    throw error;
  }
};

/**
 * Removes a workbook from the linked files of a specific working paper row
 * @param engagementId - The engagement ID
 * @param classification - The classification name
 * @param rowId - The row ID to remove the workbook from
 * @param workbookId - The workbook ID to remove
 * @returns Promise<any> - The API response
 */
export const deleteWorkbookFromLinkedFiles = async (
  engagementId: string,
  classification: string,
  rowId: string,
  workbookId: string
): Promise<any> => {
  try {
    const response = await axiosInstance.delete(
      `/api/engagements/${engagementId}/sections/${encodeURIComponent(
        classification
      )}/working-papers/linked-files`,
      {
        data: { rowId, workbookId }
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error removing workbook from linked files:", error);
    throw error;
  }
};

/**
 * Updates the linked Excel files for a specific working paper row
 * @param engagementId - The engagement ID
 * @param classification - The classification name
 * @param rowId - The row ID to update
 * @param linkedExcelFiles - Array of workbook IDs to link
 * @returns Promise<any> - The API response
 */
export const updateLinkedExcelFiles = async (
  engagementId: string,
  classification: string,
  rowId: string,
  linkedExcelFiles: string[]
): Promise<any> => {
  try {
    const response = await axiosInstance.patch(
      `/api/engagements/${engagementId}/sections/${encodeURIComponent(
        classification
      )}/working-papers/update-linked-files`,
      {
        rowId,
        linkedExcelFiles
      }
    );

    return response.data;
  } catch (error) {
    console.error("Error updating linked Excel files:", error);
    throw error;
  }
};
