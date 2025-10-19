import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2 } from "lucide-react";

import { Workbook, SheetData } from "../../types/audit-workbooks/types";
import { useToast } from "@/hooks/use-toast"; 
import { db_WorkbookApi, msDriveworkbookApi } from "@/lib/api/workbookApi"; 
import { parseExcelRange, zeroIndexToExcelCol } from "./utils";
import { useAuth } from "@/contexts/AuthContext";

interface UploadModalProps {
  onClose: () => void;
  
  onUploadSuccess: (workbook: Workbook) => void;
  onError: (message: string) => void;
  
  engagementId: string;
  classification?: string;
}



export const UploadModal: React.FC<UploadModalProps> = ({
  onClose,
  onUploadSuccess,
  onError,
  engagementId,
  classification,
}) => {
  const { user, isLoading } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false); 
  const { toast } = useToast();

  const processFile = async (file: File) => {
    setIsUploading(true); 

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const fileBuffer = e.target?.result as ArrayBuffer; // Get as ArrayBuffer

        // 1. Upload the file to the backend (to cloud storage)
        const uploadResponse = await msDriveworkbookApi.uploadFile({
          engagementId,
          classification,
          fileName: file.name,
          fileBuffer: fileBuffer,
        });

        if (!uploadResponse.success) {
          throw new Error(
            uploadResponse.error || "Failed to upload file to backend."
          );
        }
        console.log(uploadResponse);
        // This 'cloudFileDetails' likely contains the cloud service's ID for the file, name, and webUrl
        const {
          id: cloudFileId,
          name: cloudFileName,
          webUrl,
        } = uploadResponse.data;
        // CRITICAL DEBUGGING POINT:
        console.log(
          "Client-side DEBUG: ID after uploadResponse.data destructuring:",
          cloudFileId
        );
        console.log(
          "Client-side DEBUG: webUrl after uploadResponse.data destructuring:",
          webUrl
        ); // Debugging webUrl

        // 2. After successful upload, fetch the sheet names from the uploaded workbook (from the cloud storage not from the db backend)
        const listSheetsResponse = await msDriveworkbookApi.listWorksheets(
          cloudFileId
        );

        if (!listSheetsResponse.success) {
          throw new Error(
            listSheetsResponse.error ||
              "Failed to list worksheets from uploaded file."
          );
        }

        const sheetNames = listSheetsResponse.data.map((ws) => ws.name);
        const processedFileData: SheetData = {};

        // 3. For each sheet, read its data
        for (const sheetName of sheetNames) {
          const readSheetResponse = await msDriveworkbookApi.readSheet(
            cloudFileId,
            sheetName
          );
          if (!readSheetResponse.success) {
            console.warn(
              `Failed to read data for sheet '${sheetName}'. Skipping.`
            );
            processedFileData[sheetName] = [["Error reading sheet"]]; // Placeholder for error
          } else {
            // --- MODIFIED LOGIC START ---
            const { values: rawSheetData, address } = readSheetResponse.data; // Destructure values and address

            // Parse the address to get the starting row and column
            const {
              start: { row: startExcelRow, col: startZeroCol },
            } = parseExcelRange(address || `${sheetName}!A1`);

            // Determine actual data dimensions
            let maxDataRows = rawSheetData.length;
            let maxDataCols = 0;
            if (rawSheetData && rawSheetData.length > 0) {
              rawSheetData.forEach((row) => {
                if (row.length > maxDataCols) {
                  maxDataCols = row.length;
                }
              });
            }

            // These are the *display* dimensions, including potential empty space before the data starts.
            // minDisplayRows/Cols ensure a minimum grid size.
            const minDisplayRows = 20;
            const minDisplayCols = 10;

            // Calculate the total number of rows and columns needed for the display grid.
            // This should accommodate the data, starting from its actual Excel position.
            const totalDisplayRows = Math.max(
              minDisplayRows,
              startExcelRow + maxDataRows - 1
            ); // Adjusted based on data's end row
            const totalDisplayCols = Math.max(
              minDisplayCols,
              startZeroCol + maxDataCols
            ); // Adjusted based on data's end col

            // Construct the header row (empty corner, A, B, C...)
            const headerRow: string[] = [""];
            for (let i = 0; i < totalDisplayCols; i++) {
              headerRow.push(zeroIndexToExcelCol(i));
            }

            const excelLikeData: string[][] = [headerRow];

            // Construct the data rows (1, 2, 3... | cell data)
            for (let i = 0; i < totalDisplayRows; i++) {
              const newRow: string[] = [(i + 1).toString()]; // Prepend row number (1-indexed)

              for (let j = 0; j < totalDisplayCols; j++) {
                // Calculate the corresponding index in rawSheetData
                const dataRowIndex = i - (startExcelRow - 1); // Adjust for 0-indexed array vs 1-indexed Excel row
                const dataColIndex = j - startZeroCol; // Adjust for 0-indexed array vs 0-indexed Excel column

                let cellValue = "";
                if (
                  dataRowIndex >= 0 &&
                  dataRowIndex < maxDataRows &&
                  dataColIndex >= 0 &&
                  dataColIndex < maxDataCols &&
                  rawSheetData[dataRowIndex] &&
                  rawSheetData[dataRowIndex][dataColIndex] !== undefined
                ) {
                  cellValue = String(rawSheetData[dataRowIndex][dataColIndex]);
                }
                newRow.push(cellValue);
              }
              excelLikeData.push(newRow);
            }
            processedFileData[sheetName] = excelLikeData;
            // --- MODIFIED LOGIC END ---
          }
        }

        // --- NEW STEP: Save the processed workbook metadata and sheet data to our MongoDB ---
        const workbookMetadataForDB = {
          name: cloudFileName,
          webUrl: webUrl,
          engagementId: engagementId,
          classification: classification,
          uploadedDate: new Date().toISOString(),
          version: "v1", // You might have a better versioning strategy
          uploadedBy: user?.id,
          lastModifiedBy: user?.id,
        };
        
        console.log(processedFileData);
        console.log(workbookMetadataForDB);

        const saveToDbResponse = await db_WorkbookApi.saveProcessedWorkbook(
          workbookMetadataForDB,
          processedFileData
        );

        if (!saveToDbResponse.success || !saveToDbResponse.data) {
          throw new Error(
            saveToDbResponse.error ||
              "Failed to save workbook data to database."
          );
        }

        // The backend should return the full Workbook object (with _id, populated sheets if needed)
        // from the database, which you can then pass to onUploadSuccess.
        const newWorkbookFromDB = saveToDbResponse.data.workbook;

        // Ensure fileData is populated for frontend display immediately
        newWorkbookFromDB.fileData = processedFileData;

        onUploadSuccess(newWorkbookFromDB);
        // onClose(); // Close only after successful saving and processing
      } catch (error) {
        console.error("Error processing file:", error);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: `Failed to upload ${file.name}: ${
            error instanceof Error ? error.message : "Unknown error."
          }`,
        });
        onError(`Failed to upload ${file.name}. Please try again.`);
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setIsUploading(false);
      onError(`Failed to read ${file.name}.`);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Excel Workbook</DialogTitle>
        </DialogHeader>
        <div
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
            isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
              <p className="mt-2 text-sm text-blue-600">
                Uploading and Processing...
              </p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag & Drop Excel files here
              </p>
              <p className="text-xs text-gray-500 mb-4">or</p>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label htmlFor="file-upload">
                <Button asChild disabled={isUploading}>
                  <span>Browse Files</span>
                </Button>
              </label>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 text-center">
          Supported formats: .xlsx, .xls
        </p>
      </DialogContent>
    </Dialog>
  );
};
