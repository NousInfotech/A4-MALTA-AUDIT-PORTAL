// src/components/audit-workbooks/UploadModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Workbook } from '../../types/audit-workbooks/types';

interface UploadModalProps {
  onClose: () => void;
  onUploadSuccess: (workbook: Workbook) => void;
  // We'll add toast for error handling
  onError: (message: string) => void; 
}

export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploadSuccess, onError }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  // This is the core function to process the file
  const processFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        // Parse the file data
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Create the workbook object that our App.tsx expects
        const newWorkbook: Workbook = {
          id: Date.now().toString(),
          name: file.name,
          uploadedDate: new Date().toISOString().split('T')[0],
          version: 'v1',
          lastModifiedBy: 'Current User',
          fileData: workbook, // Store the parsed data here!
        };
        
        onUploadSuccess(newWorkbook);
        onClose(); // Close the modal on successful upload

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