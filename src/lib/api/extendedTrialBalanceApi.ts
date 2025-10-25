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
}

export interface ETBData {
  engagement: string;
  classification: string;
  rows: ETBRow[];
  createdAt: string;
  updatedAt: string;
}

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
