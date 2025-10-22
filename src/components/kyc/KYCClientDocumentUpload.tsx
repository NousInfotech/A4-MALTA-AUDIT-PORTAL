import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  FileEdit,
  FileUp,
  Info,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { documentRequestApi } from "@/services/api";
import { format } from "date-fns";

interface Document {
  name: string;
  type: 'direct' | 'template';
  description?: string;
  template?: {
    url?: string;
    instruction?: string;
  };
  url?: string;
  uploadedAt?: string;
  status: 'pending' | 'uploaded' | 'in-review' | 'approved' | 'rejected';
  comment?: string;
}

interface DocumentRequest {
  _id: string;
  name: string;
  category: string;
  description: string;
  status: string;
  documents: Document[];
  requestedAt: string;
}

interface KYCClientDocumentUploadProps {
  documentRequestId: string;
  onStatusChange?: (status: string) => void;
}

export function KYCClientDocumentUpload({
  documentRequestId,
  onStatusChange
}: KYCClientDocumentUploadProps) {
  const [documentRequest, setDocumentRequest] = useState<DocumentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadComments, setUploadComments] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchDocumentRequest();
  }, [documentRequestId]);

  const fetchDocumentRequest = async () => {
    try {
      setLoading(true);
      const response = await documentRequestApi.getById(documentRequestId);
      console.log('Document Request Response:', response);
      console.log('Documents:', response.documents);
      response.documents?.forEach((doc, index) => {
        console.log(`Document ${index}:`, doc);
        console.log(`Template data:`, doc.template);
      });
      setDocumentRequest(response);
      onStatusChange?.(response.status);
    } catch (error: any) {
      console.error('Error fetching document request:', error);
      toast({
        title: "Error",
        description: "Failed to load document request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (documentIndex: number, file: File) => {
    if (!documentRequest) return;

    try {
      setUploading(`${documentIndex}`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('comment', uploadComments[documentIndex] || '');

      await documentRequestApi.uploadSingleDocument(documentRequest._id, formData);
      
      toast({
        title: "Success",
        description: `${file.name} uploaded successfully`,
      });
      
      // Refresh document request
      await fetchDocumentRequest();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleDownloadTemplate = async (templateUrl: string, documentName: string) => {
    try {
      // Use the backend download endpoint for proper authentication and file handling
      const downloadUrl = `/api/document-requests/template/download?templateUrl=${encodeURIComponent(templateUrl)}`;
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      
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
      
      toast({
        title: "Template Downloaded",
        description: `${documentName} template has been downloaded`,
      });
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(templateUrl, '_blank');
      toast({
        title: "Template Opened",
        description: `${documentName} template has been opened in a new tab`,
      });
    }
  };

  const handleViewDocument = (url: string, documentName: string) => {
    window.open(url, '_blank');
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
        return <Clock className="h-5 w-5 text-yellow-600" />;
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

  const uploadedCount = documentRequest?.documents.filter(doc => 
    doc.status === 'uploaded' || doc.status === 'approved'
  ).length || 0;
  const totalCount = documentRequest?.documents.length || 0;
  const progressPercentage = totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading document request...</p>
        </div>
      </div>
    );
  }

  if (!documentRequest) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Request Not Found</h3>
        <p className="text-gray-600">The requested document request could not be found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {documentRequest.name}
              </CardTitle>
              <p className="text-gray-600 mt-1">{documentRequest.description}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50">
                {documentRequest.category.toUpperCase()}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">
                Requested: {format(new Date(documentRequest.requestedAt), "MMM dd, yyyy")}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Submission Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Documents Uploaded</span>
            <span className="text-sm font-bold text-gray-900">{uploadedCount} / {totalCount}</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="text-center">
            <span className="text-2xl font-bold text-green-600">{Math.round(progressPercentage)}%</span>
            <p className="text-sm text-gray-600">Complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Required Documents</h2>
        
        {documentRequest.documents.map((doc, index) => (
          <Card key={index} className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {getStatusIcon(doc.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                      {getStatusBadge(doc.status)}
                      {getDocumentTypeBadge(doc.type)}
                    </div>
                    
                    {doc.description && (
                      <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                    )}

                    {/* Template Information */}
                    {doc.type === 'template' && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Info className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">Template-based Document</span>
                        </div>
                        
                        {/* Debug Information */}
                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <strong>Debug Info:</strong><br/>
                          Template exists: {doc.template ? 'Yes' : 'No'}<br/>
                          Template URL: {doc.template?.url || 'Missing'}<br/>
                          Template instruction: {doc.template?.instruction || 'Missing'}<br/>
                          Full template object: {JSON.stringify(doc.template)}
                        </div>
                        
                        {doc.template?.instruction && (
                          <p className="text-sm text-blue-700 mb-2">
                            <strong>Instructions:</strong> {doc.template.instruction}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2">
                          {doc.template?.url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadTemplate(doc.template!.url!, doc.name)}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download Template
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-sm text-red-600">
                                <strong>Template URL Missing!</strong><br/>
                                This document is marked as template but has no template URL.
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast({
                                    title: "Template Missing",
                                    description: "This template was not properly uploaded. Please contact your auditor.",
                                    variant: "destructive",
                                  });
                                }}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                <AlertCircle className="h-4 w-4 mr-1" />
                                Report Issue
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Uploaded Document Info */}
                    {doc.url && (
                      <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Document Uploaded</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc.url!, doc.name)}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Document
                          </Button>
                          {doc.uploadedAt && (
                            <span className="text-xs text-green-600">
                              Uploaded: {format(new Date(doc.uploadedAt), "MMM dd, yyyy HH:mm")}
                            </span>
                          )}
                        </div>
                        {doc.comment && (
                          <p className="text-sm text-green-700 mt-2">
                            <strong>Comment:</strong> {doc.comment}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Upload Section */}
                    {doc.status === 'pending' && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor={`comment-${index}`}>Upload Comment (Optional)</Label>
                          <Textarea
                            id={`comment-${index}`}
                            placeholder="Add any comments about this document..."
                            value={uploadComments[index] || ''}
                            onChange={(e) => setUploadComments(prev => ({
                              ...prev,
                              [index]: e.target.value
                            }))}
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="relative">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(index, file);
                              }
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            disabled={uploading === `${index}`}
                          />
                          <Button
                            variant="default"
                            disabled={uploading === `${index}`}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            {uploading === `${index}` ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                {doc.type === 'template' ? 'Upload Completed Template' : 'Upload Document'}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion Status */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            {progressPercentage === 100 ? (
              <CheckCircle className="h-10 w-10 text-white" />
            ) : (
              <FileText className="h-10 w-10 text-white" />
            )}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {progressPercentage === 100 ? 'All Documents Uploaded!' : 'Complete Your Document Submission'}
          </h3>
          <p className="text-gray-600 text-lg mb-6">
            {progressPercentage === 100 
              ? 'All required documents have been uploaded. Your auditor will review them shortly.'
              : `Upload ${totalCount - uploadedCount} more document${totalCount - uploadedCount === 1 ? '' : 's'} to complete your submission.`
            }
          </p>
          {progressPercentage === 100 && (
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3">
              <CheckCircle className="h-5 w-5 mr-2" />
              Submission Complete
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
