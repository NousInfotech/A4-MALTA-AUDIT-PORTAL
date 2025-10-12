// src/services/api/workbookApi.ts

export interface SaveWorkbookRequest {
  workbookId: string;
  workbookName: string;
  version: string;
  sheetData: {
    [sheetName: string]: string[][];
  };
  metadata?: {
    uploadedDate: string;
    lastModifiedBy: string;
    [key: string]: any;
  };
}

export interface SaveSheetRequest {
  workbookId: string;
  workbookName: string;
  sheetName: string;
  sheetData: string[][];
  metadata?: {
    uploadedDate: string;
    lastModifiedBy: string;
    [key: string]: any;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class WorkbookApiService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Save entire workbook to backend
   */
  async saveWorkbook(request: SaveWorkbookRequest): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workbooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        message: 'Workbook saved successfully',
      };
    } catch (error) {
      console.error('Error saving workbook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Save a single sheet to backend
   */
  async saveSheet(request: SaveSheetRequest): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workbooks/sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        message: 'Sheet saved successfully',
      };
    } catch (error) {
      console.error('Error saving sheet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get workbook data from backend
   */
  async getWorkbook(workbookId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workbooks/${workbookId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching workbook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get sheet data from backend
   */
  async getSheet(workbookId: string, sheetName: string): Promise<ApiResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/workbooks/${workbookId}/sheets/${encodeURIComponent(sheetName)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('Error fetching sheet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update workbook data
   */
  async updateWorkbook(workbookId: string, request: Partial<SaveWorkbookRequest>): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workbooks/${workbookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data,
        message: 'Workbook updated successfully',
      };
    } catch (error) {
      console.error('Error updating workbook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Delete workbook
   */
  async deleteWorkbook(workbookId: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/workbooks/${workbookId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        message: 'Workbook deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting workbook:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

// Export singleton instance
export const workbookApi = new WorkbookApiService();

// Export for custom instances
export default WorkbookApiService;