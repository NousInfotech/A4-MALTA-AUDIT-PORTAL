import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { kycApi, documentRequestApi } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";

interface UploadedFile {
  file: File;
  id: string;
  name: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

interface ManualUploadModalProps {
  kycId: string;
  engagementId: string;
  clientId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function ManualUploadModal({
  kycId,
  engagementId,
  clientId,
  onSuccess,
  trigger
}: ManualUploadModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [description, setDescription] = useState('Uploaded by the Auditor');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      status: 'pending'
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };


  const uploadFileToSupabase = async (uploadedFile: UploadedFile): Promise<string> => {
    const formData = new FormData();
    formData.append('file', uploadedFile.file);
    
    const API_URL = import.meta.env.VITE_APIURL || 'http://localhost:8000';
    const { data } = await supabase.auth.getSession();
    
    // Try direct Supabase upload instead of template endpoint
    const bucket = "engagement-documents";
    const categoryFolder = "kyc/";
    const file = uploadedFile.file;
    
    // Generate unique filename
    const originalFilename = file.name;
    const ext = originalFilename.split(".").pop();
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
    const path = `${engagementId}/${categoryFolder}${uniqueFilename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { 
        cacheControl: "3600", 
        upsert: false,
        contentType: file.type 
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Step 1: Upload all files first using template upload endpoint
      const uploadPromises = uploadedFiles.map(async (uploadedFile) => {
        try {
          // Update status to uploading
          setUploadedFiles(prev => 
            prev.map(file => 
              file.id === uploadedFile.id 
                ? { ...file, status: 'uploading' as const }
                : file
            )
          );

          const fileUrl = await uploadFileToSupabase(uploadedFile);
          
          // Update status to completed
          setUploadedFiles(prev => 
            prev.map(file => 
              file.id === uploadedFile.id 
                ? { ...file, status: 'completed' as const }
                : file
            )
          );
          
          return {
            name: uploadedFile.name,
            type: 'direct' as const,
            description: description,
            status: 'completed' as const,
            url: fileUrl,
            uploadedAt: new Date().toISOString(),
            comment: description
          };
        } catch (error) {
          // Update status to error
          setUploadedFiles(prev => 
            prev.map(file => 
              file.id === uploadedFile.id 
                ? { ...file, status: 'error' as const }
                : file
            )
          );
          throw error;
        }
      });

      const uploadedDocuments = await Promise.all(uploadPromises);

      // Step 2: Create DocumentRequest with pending documents first
      const documentRequestData = {
        engagementId: engagementId,
        clientId: clientId,
        name: 'Manual Uploading',
        category: 'kyc',
        description: description,
        documents: uploadedDocuments.map(doc => ({
          name: doc.name,
          type: doc.type,
          description: doc.description,
          status: 'pending' as const
        }))
      };

      console.log('Creating DocumentRequest:', documentRequestData);
      const response = await documentRequestApi.create(documentRequestData);
      console.log('DocumentRequest created:', response);
      
      // Extract the actual document request from the response
      const createdDocumentRequest = response.documentRequest || response;
      console.log('Extracted DocumentRequest:', createdDocumentRequest);

      // Step 2.5: Update the documents with completed status and URLs
      const updatedDocuments = uploadedDocuments.map(doc => ({
        name: doc.name,
        type: doc.type,
        description: doc.description,
        status: 'completed' as const,
        url: doc.url,
        uploadedAt: doc.uploadedAt,
        comment: doc.comment
      }));

      console.log('Updating DocumentRequest with completed documents:', updatedDocuments);
      await documentRequestApi.update(createdDocumentRequest._id, {
        documents: updatedDocuments
      });

      // Step 3: Attach the DocumentRequest to the KYC workflow
      const attachPayload = {
        documentRequestId: createdDocumentRequest._id
      };
      console.log('Attaching to KYC:', attachPayload);
      
      await kycApi.addDocumentRequest(kycId, attachPayload);

      toast({
        title: "Manual Upload Complete",
        description: `${uploadedFiles.length} document(s) uploaded successfully`,
      });

      // Reset form
      setUploadedFiles([]);
      setDescription('Uploaded by the Auditor');
      setOpen(false);
      
      // Call success callback
      setTimeout(() => {
        onSuccess?.();
      }, 500);

    } catch (error: any) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFileStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'uploading':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50">Uploading</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-blue-300 hover:bg-blue-50 text-blue-700">
            <Upload className="h-4 w-4 mr-2" />
            Manual Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50 border-slate-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-slate-800">
            <Upload className="h-6 w-6 text-blue-600" />
            Manual Document Upload
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-base">
            Upload documents directly to the KYC workflow. These will be added as a "Manual Uploading" document request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Request Info */}
          <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Document Request Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="requestName">Request Name</Label>
                <Input
                  id="requestName"
                  value="Manual Uploading"
                  disabled
                  className="bg-slate-50 text-slate-600 border-slate-300"
                />
                <p className="text-xs text-gray-600 mt-1">
                  This will be the name of the document request
                </p>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter description for the uploaded documents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                Select Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label htmlFor="fileInput" className="text-slate-700 font-medium">Choose Files</Label>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                  <input
                    ref={fileInputRef}
                    id="fileInput"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-slate-600">
                  Select multiple files to upload at once
                </p>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-800">Selected Files ({uploadedFiles.length})</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-3">
                    {uploadedFiles.map((uploadedFile) => (
                      <div key={uploadedFile.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          {getFileStatusIcon(uploadedFile.status)}
                          <div>
                            <p className="font-medium text-slate-800">{uploadedFile.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {getFileStatusBadge(uploadedFile.status)}
                              <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                                Direct Upload
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile(uploadedFile.id)}
                          disabled={uploadedFile.status === 'uploading'}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          {uploadedFiles.length > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Upload Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-blue-700">Total Files:</span>
                    <span className="text-sm font-bold text-blue-800">{uploadedFiles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-blue-700">Request Name:</span>
                    <span className="text-sm font-bold text-blue-800">Manual Uploading</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-blue-700">Status:</span>
                    <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
                      Ready to Upload
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="flex justify-between pt-4 border-t border-slate-200">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || uploadedFiles.length === 0}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Documents
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
