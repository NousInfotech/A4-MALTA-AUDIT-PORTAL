// import React, { useState } from 'react';
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
// import { Button } from '@/components/ui/button';
// import { Upload, FileText } from 'lucide-react';
// import * as XLSX from 'xlsx'; // Import SheetJS
// import { Workbook, SheetData } from '../../types/audit-workbooks/types';

// interface UploadModalProps {
//   onClose: () => void;
//   onUploadSuccess: (workbook: Workbook) => void;
//   onError: (message: string) => void; 
// }

// export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploadSuccess, onError }) => {
//   const [isDragOver, setIsDragOver] = useState(false);

//   // This is the core function to process the file
//   const processFile = (file: File) => {
//     const reader = new FileReader();

//     reader.onload = (e) => {
//       try {
//         const data = e.target?.result;
//         // Parse the file data into a SheetJS workbook object
//         const parsedWorkbook = XLSX.read(data, { type: 'binary' });
        
//         // --- KEY FIX: Process the data into our app's format ---
//         const processedFileData: SheetData = {};
//         parsedWorkbook.SheetNames.forEach(sheetName => {
//           const worksheet = parsedWorkbook.Sheets[sheetName];
//           // Convert the worksheet to a 2D array, then ensure all values are strings
//           const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
//           // Map over each row and each cell to convert it to a string
//           const stringData: string[][] = jsonData.map((row: any) =>
//             (row as any[]).map((cell: any) => String(cell ?? '')) // Convert cell to string, handle null/undefined
//           );
          
//           processedFileData[sheetName] = stringData;
//         });
        
//         // Create the workbook object that our App.tsx expects
//         const newWorkbook: Workbook = {
//           id: Date.now().toString(),
//           name: file.name,
//           uploadedDate: new Date().toISOString().split('T')[0],
//           version: 'v1',
//           lastModifiedBy: 'Current User',
//           fileData: processedFileData, // Store the PROCESSED data here!
//         };
        
//         onUploadSuccess(newWorkbook);

//       } catch (error) {
//         console.error("Error parsing file:", error);
//         onError(`Failed to parse ${file.name}. Please ensure it's a valid Excel file.`);
//       }
//     };

//     reader.onerror = () => {
//       onError(`Failed to read ${file.name}.`);
//     };

//     reader.readAsBinaryString(file);
//   };

//   const handleDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragOver(false);
    
//     const files = e.dataTransfer.files;
//     if (files.length > 0) {
//       processFile(files[0]);
//     }
//   };

//   const handleDragOver = (e: React.DragEvent) => {
//     e.preventDefault();
//     setIsDragOver(true);
//   };

//   const handleDragLeave = () => {
//     setIsDragOver(false);
//   };
  
//   const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       processFile(file);
//     }
//   }

//   return (
//     <Dialog open={true} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-[425px]">
//         <DialogHeader>
//           <DialogTitle>Upload Excel Workbook</DialogTitle>
//         </DialogHeader>
//         <div 
//           className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
//             isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
//           }`}
//           onDrop={handleDrop}
//           onDragOver={handleDragOver}
//           onDragLeave={handleDragLeave}
//         >
//           <Upload className="mx-auto h-12 w-12 text-gray-400" />
//           <p className="mt-2 text-sm text-gray-600">Drag & Drop Excel files here</p>
//           <p className="text-xs text-gray-500 mb-4">or</p>
//           <input 
//             type="file" 
//             accept=".xlsx, .xls" 
//             onChange={handleFileInput} 
//             className="hidden" 
//             id="file-upload" 
//           />
//           <label htmlFor="file-upload">
//             <Button asChild>
//               <span>Browse Files</span>
//             </Button>
//           </label>
//         </div>
//         <p className="text-xs text-gray-500 text-center">Supported formats: .xlsx, .xls</p>
//       </DialogContent>
//     </Dialog>
//   );
// };




// ##########################################################################################################




import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';
import * as XLSX from 'xlsx'; // Import SheetJS
import { Workbook, SheetData } from '../../types/audit-workbooks/types';

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: (workbook: Workbook) => void;
  onError: (message: string) => void; 
}

// Helper function to convert 0-indexed column number to Excel column letter (e.g., 0 -> A, 1 -> B)
const zeroIndexToExcelCol = (colIndex: number): string => {
  let colLetter = "";
  let tempColIndex = colIndex;

  do {
    const remainder = tempColIndex % 26;
    colLetter = String.fromCharCode(65 + remainder) + colLetter;
    tempColIndex = Math.floor(tempColIndex / 26) - 1;
  } while (tempColIndex >= 0);

  return colLetter;
};

// New helper function to transform parsed sheet data into the Excel-like 2D array
const createExcelLikeData = (jsonData: any[][]): string[][] => {
  if (!jsonData || jsonData.length === 0) {
    return [[""]]; // Return at least a top-left empty cell
  }

  const maxCols = Math.max(...jsonData.map(row => row.length));
  
  // Create the header row (empty string + A, B, C...)
  const headerRow: string[] = [""];
  for (let i = 0; i < maxCols; i++) {
    headerRow.push(zeroIndexToExcelCol(i));
  }

  const excelLikeData: string[][] = [headerRow];

  // Add data rows with row numbers
  for (let i = 0; i < jsonData.length; i++) {
    const originalRow = jsonData[i];
    const newRow: string[] = [(i + 1).toString()]; // Prepend row number (1-indexed)
    
    // Fill with original data, converting all to string and handling undefined/null
    for (let j = 0; j < maxCols; j++) {
      newRow.push(String(originalRow[j] ?? ''));
    }
    excelLikeData.push(newRow);
  }

  return excelLikeData;
};

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploadSuccess, onError }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  // This is the core function to process the file
  const processFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Parse the file data into a SheetJS workbook object
        const parsedWorkbook = XLSX.read(data, { type: 'binary' });
        
        const processedFileData: SheetData = {};
        parsedWorkbook.SheetNames.forEach(sheetName => {
          const worksheet = parsedWorkbook.Sheets[sheetName];
          // Convert the worksheet to a 2D array, which will be the raw data from Excel
          // { header: 1 } means the first row of the sheet will be used as the header in the output array.
          // However, we want to create our *own* header with A, B, C... and row numbers.
          // So, we get the raw data without headers first.
          const rawJsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }); // raw: false to get formatted values

          // Transform the raw data into our desired Excel-like format
          const excelLikeData = createExcelLikeData(rawJsonData as any[][]);
          
          processedFileData[sheetName] = excelLikeData;
        });
        
        // Create the workbook object that our App.tsx expects
        const newWorkbook: Workbook = {
          id: Date.now().toString(),
          name: file.name,
          uploadedDate: new Date().toISOString().split('T')[0],
          version: 'v1',
          lastModifiedBy: 'Current User',
          fileData: processedFileData, // Store the PROCESSED data here!
        };
        
        onUploadSuccess(newWorkbook);

      } catch (error) {
        console.error("Error parsing file:", error);
        onError(`Failed to parse ${file.name}. Please ensure it's a valid Excel file.`);
      }
    };

    reader.onerror = () => {
      onError(`Failed to read ${file.name}.`);
    };

    reader.readAsBinaryString(file);
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
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Excel Workbook</DialogTitle>
        </DialogHeader>
        <div 
          className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer ${
            isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Drag & Drop Excel files here</p>
          <p className="text-xs text-gray-500 mb-4">or</p>
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileInput} 
            className="hidden" 
            id="file-upload" 
          />
          <label htmlFor="file-upload">
            <Button asChild>
              <span>Browse Files</span>
            </Button>
          </label>
        </div>
        <p className="text-xs text-gray-500 text-center">Supported formats: .xlsx, .xls</p>
      </DialogContent>
    </Dialog>
  );
};