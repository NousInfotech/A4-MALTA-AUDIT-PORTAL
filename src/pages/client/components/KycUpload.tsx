import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Download,
  FileText,
  Loader2,
  Upload,
  Paperclip,
  Shield,
  FileEdit,
  FileUp,
  Info,
  CheckCircle,
  AlertCircle,
  Eye,
} from "lucide-react";
import React, { useState } from "react";
import { deleteDocumentRequestsbyId } from "@/lib/api/documentRequests";
import { toast } from "sonner";
import { documentRequestApi } from "@/services/api";

function KycUpload({
  kycRequests,
  getEngagementTitle,
  handleFileUpload,
  uploadingFiles,
  onRequestUpdate,
}) {
  const [loading, setLoading] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});

  const handleCurrentFileUpload = async (reqId, docIndex, file, doc) => {
    const loadingKey = `${reqId}-${docIndex}`;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));
    console.log(`Uploading file for Request ID: ${reqId}, Document Index: ${docIndex}`, file);

    try {
      // Create FormData with proper structure
      const formData = new FormData();
      formData.append('files', file);
      formData.append('documentIndex', docIndex.toString());
      formData.append('documentName', doc.name); // Use the document name from the request, not the file name
      formData.append('uploadedFileName', file.name); // Store the actual uploaded file name
      formData.append('markCompleted', 'true');
      
      // Use the centralized API service
      const result = await documentRequestApi.uploadDocuments(reqId, formData);
      console.log('Upload successful:', result);
      
      // Set success status
      setUploadStatus(prev => ({ ...prev, [loadingKey]: 'success' }));
      
      // Call the callback to update the parent state
      if (onRequestUpdate) {
        onRequestUpdate();
      }
      
      toast.success(`File "${file.name}" uploaded successfully!`);
      
      // Clear success status after 3 seconds
      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, [loadingKey]: null }));
      }, 3000);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(prev => ({ ...prev, [loadingKey]: 'error' }));
      toast.error(`Failed to upload "${file.name}": ${error.message}`);
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setUploadStatus(prev => ({ ...prev, [loadingKey]: null }));
      }, 5000);
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleDownloadTemplate = async (templateUrl: string, documentName: string) => {
    try {
      console.log('Starting template download:', { templateUrl, documentName });
      
      const blob = await documentRequestApi.downloadTemplate(templateUrl);
      console.log('Template download successful');
      
      // Extract file extension from the original Supabase URL
      const getFileExtension = (url: string): string => {
        try {
          // Extract filename from URL (after the last slash)
          const urlPath = new URL(url).pathname;
          const filename = urlPath.split('/').pop() || '';
          
          // Get extension from filename
          const extension = filename.split('.').pop();
          
          // Return extension with dot if found, otherwise empty string
          return extension ? `.${extension}` : '';
        } catch (error) {
          console.warn('Could not extract extension from URL:', url);
          return '';
        }
      };
      
      const fileExtension = getFileExtension(templateUrl);
      const downloadFilename = `${documentName}_template${fileExtension}`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${documentName} template has been downloaded`);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(templateUrl, '_blank');
      toast.success(`${documentName} template has been opened in a new tab`);
    }
  };

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getMimeType = (extension: string): string => {
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'txt': 'text/plain',
      'zip': 'application/zip',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  };

  const handleViewDocument = async (url: string, documentName: string, uploadedFileName?: string) => {
    try {
      // Use uploadedFileName if available, otherwise fall back to documentName
      const actualFileName = uploadedFileName || documentName;
      const fileExtension = getFileExtension(actualFileName);
      
      console.log('Opening document:', {
        url,
        documentName,
        uploadedFileName,
        actualFileName,
        fileExtension
      });

      // For PDFs, open in a new tab to view directly
      if (fileExtension === 'pdf') {
        window.open(url, '_blank');
        return;
      }

      // For other files, download with proper filename and extension
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }

      const blob = await response.blob();
      const mimeType = getMimeType(fileExtension);
      
      // Create a new blob with the correct MIME type
      const typedBlob = new Blob([blob], { type: mimeType });
      const downloadUrl = window.URL.createObjectURL(typedBlob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = actualFileName; // Use the actual filename with extension
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (error) {
      console.error('Error downloading document:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    return type === 'template' ? (
      <FileEdit className="h-4 w-4 text-blue-600" />
    ) : (
      <FileUp className="h-4 w-4 text-green-600" />
    );
  };

  const getDocumentTypeBadge = (type: string) => {
    return type === 'template' ? (
      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
        <FileEdit className="h-3 w-3 mr-1" />
        Template
      </Badge>
    ) : (
      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
        <FileUp className="h-3 w-3 mr-1" />
        Direct
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'in-review':
        return <Eye className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="default" className="bg-green-100 text-green-800">Uploaded</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'in-review':
        return <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50">In Review</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const deleteRequest = async (id: string) => {
    try {
      const res = await deleteDocumentRequestsbyId(id);
      if (res.success || res.message) {
        toast.success(res.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="space-y-6">
      {kycRequests.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            No KYC Requests Found
          </h3>
          <p className="text-gray-600">
            There are no document requests categorized as 'KYC' at the moment.
            Check back later or contact your administrator.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {kycRequests.map((request) => (
            <div
              key={request._id}
              className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {request.description || 'KYC Document Request'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Engagement: {getEngagementTitle(request.engagement)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="bg-gray-800 text-white border-gray-800"
                >
                  KYC
                </Badge>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-700 border-gray-200"
                    >
                      {request.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Requested:{" "}
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Document Progress Overview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Document Progress</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {request.documents?.filter(doc => doc.status === 'pending' && !doc.url).length || 0}
                      </div>
                      <div className="text-gray-600">Required</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {request.documents?.filter(d => d.url && d.status !== 'pending').length || 0}
                      </div>
                      <div className="text-gray-600">Uploaded</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {request.documents?.filter(d => d.status === 'in-review').length || 0}
                      </div>
                      <div className="text-gray-600">In Review</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {request.documents?.filter(d => d.status === 'pending' && !d.url).length || 0}
                      </div>
                      <div className="text-gray-600">Pending</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>
                        {request.documents?.filter(d => d.url && d.status !== 'pending').length || 0} / {request.documents?.length || 0}
                      </span>
                    </div>
                    <Progress 
                      value={((request.documents?.filter(d => d.url && d.status !== 'pending').length || 0) / (request.documents?.length || 1)) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Documents List */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">Required Documents</h4>
                    {/* <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Add a new document to the request
                        const newDoc = {
                          name: `Additional Document ${(request.documents?.length || 0) + 1}`,
                          type: 'direct',
                          description: 'Additional document requested',
                          status: 'pending'
                        };
                        
                        // This would need to be implemented in the backend
                        // For now, we'll just show a toast
                        toast.info('Feature coming soon: Add additional documents');
                      }}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <FileUp className="h-4 w-4 mr-1" />
                      Add Document
                    </Button> */}
                  </div>
                  <div className="space-y-4">
                    {request.documents?.map((doc, index) => {
                      // Check if this document has been uploaded (has a URL)
                      const isUploaded = doc.url && doc.status !== 'pending';
                      const isPending = doc.status === 'pending' && !doc.url;
                      const isTemplate = doc.type === 'template';
                      
                      // Show pending documents, uploaded documents, or template documents
                      if (!isPending && !isUploaded && !isTemplate) return null;
                      
                      return (
                      <div
                        key={index}
                        className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all duration-300 ease-in-out"
                      >
                        <div className="flex items-start gap-4 flex-1">
                          {getStatusIcon(doc.status)}
                          <div className="flex-1">
                             <div className="flex items-center gap-3 mb-2">
                               <h5 className="font-semibold text-gray-900">
                                 {doc.name}
                               </h5>
                               {getStatusBadge(doc.status)}
                               {getDocumentTypeBadge(doc.type)}
                             </div>
                             
                             {/* Show actual uploaded filename as subheading */}
                             {doc.url && (
                               <p className="text-sm text-gray-500 mb-2">
                                 File: {doc.uploadedFileName || doc.name}
                               </p>
                             )}
                            
                            {doc.description && (
                              <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                            )}

                            {/* Template Information */}
                            {doc.type === 'template' && doc.template && (
                              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <Info className="h-4 w-4 text-blue-600" />
                                  <span className="text-sm font-medium text-blue-800">Template-based Document</span>
                                </div>
                                
                                {doc.template.instruction && (
                                  <p className="text-sm text-blue-700 mb-2">
                                    <strong>Instructions:</strong> {doc.template.instruction}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-2">
                                  {doc.template.url ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadTemplate(doc.template.url, doc.name)}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Download Template
                                    </Button>
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">
                                      Template file not available
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Uploaded Document Actions */}
                            {doc.url && (
                              <div className="mb-3 flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDocument(doc.url, doc.name, doc.uploadedFileName)}
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Document
                                </Button>
                                {doc.uploadedAt && (
                                  <span className="text-xs text-gray-500">
                                    Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Upload Section */}
                            {doc.status === 'pending' && (
                              <div className="space-y-3">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-green-400 transition-colors">
                                  <div className="text-center relative">
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleCurrentFileUpload(request._id, index, file, doc);
                                      }
                                    }}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                      disabled={loading[`${request._id}-${index}`]}
                                    />
                                    <div className="flex flex-col items-center space-y-2">
                                      <Upload className="h-8 w-8 text-gray-400" />
                                      <div className="text-sm text-gray-600">
                                        <span className="font-medium text-green-600 hover:text-green-700 cursor-pointer">
                                          Click to upload
                                        </span>
                                        {' '}or drag and drop
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 50MB)
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {loading[`${request._id}-${index}`] && (
                                  <div className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span className="text-sm text-blue-600 font-medium">Uploading...</span>
                                  </div>
                                )}
                                
                                {uploadStatus[`${request._id}-${index}`] === 'success' && (
                                  <div className="flex items-center justify-center gap-2 p-3 bg-green-50 rounded-lg">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <span className="text-sm text-green-600 font-medium">Upload successful!</span>
                                  </div>
                                )}
                                
                                {uploadStatus[`${request._id}-${index}`] === 'error' && (
                                  <div className="flex items-center justify-center gap-2 p-3 bg-red-50 rounded-lg">
                                    <AlertCircle className="h-4 w-4 text-red-600" />
                                    <span className="text-sm text-red-600 font-medium">Upload failed</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Completion Status */}
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    {request.documents?.some(doc => doc.url && doc.status !== 'pending') ? (
                      <CheckCircle className="h-8 w-8 text-white" />
                    ) : (
                      <Shield className="h-8 w-8 text-white" />
                    )}
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    {request.documents?.some(doc => doc.url && doc.status !== 'pending')
                      ? 'Documents Uploaded!' 
                      : 'Complete Your KYC Submission'
                    }
                  </h4>
                  <p className="text-gray-600">
                    {request.documents?.some(doc => doc.url && doc.status !== 'pending')
                      ? 'Your uploaded documents are being reviewed by your auditor.'
                      : `Upload ${request.documents?.filter(doc => doc.status === 'pending' && !doc.url).length || 0} document${(request.documents?.filter(doc => doc.status === 'pending' && !doc.url).length || 0) === 1 ? '' : 's'} to complete your submission.`
                    }
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default KycUpload;
