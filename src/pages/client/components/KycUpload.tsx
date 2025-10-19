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

function KycUpload({
  kycRequests,
  getEngagementTitle,
  handleFileUpload,
  uploadingFiles,
  onRequestUpdate,
}) {
  const [loading, setLoading] = useState({});

  const handleCurrentFileUpload = async (reqId, file) => {
    setLoading(prev => ({ ...prev, [reqId]: true }));
    console.log(`Uploading file for Request ID: ${reqId}`, file);

    try {
      // Call the actual upload function
      await handleFileUpload(reqId, [file]);
      
      // Call the callback to update the parent state
      if (onRequestUpdate) {
        onRequestUpdate();
      }
      
      toast.success(`File "${file.name}" uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload "${file.name}"`);
    } finally {
      setLoading(prev => ({ ...prev, [reqId]: false }));
    }
  };

  const handleDownloadTemplate = (templateUrl: string, documentName: string) => {
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = `${documentName}_template`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${documentName} template has been downloaded`);
  };

  const handleViewDocument = (url: string, documentName: string) => {
    // Check if it's a PDF file
    if (url.toLowerCase().includes('.pdf') || documentName.toLowerCase().endsWith('.pdf')) {
      // For PDFs, open in a new tab
      window.open(url, '_blank');
    } else {
      // For other files, try to download or open
      const link = document.createElement('a');
      link.href = url;
      link.download = documentName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
                </div>

                {/* Documents List */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Required Documents</h4>
                  <div className="space-y-4">
                    {request.documents?.map((doc, index) => {
                      // Check if this document has been uploaded (has a URL)
                      const isUploaded = doc.url && doc.status !== 'pending';
                      const isPending = doc.status === 'pending' && !doc.url;
                      
                      // Only show pending documents or uploaded documents
                      if (!isPending && !isUploaded) return null;
                      
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
                                  {doc.template.url && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadTemplate(doc.template.url, doc.name)}
                                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Download Template
                                    </Button>
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
                                  onClick={() => handleViewDocument(doc.url, doc.name)}
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
                                <div className="relative">
                                  <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleCurrentFileUpload(request._id, file);
                                      }
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={loading[request._id]}
                                  />
                                  <Button
                                    variant="default"
                                    disabled={loading[request._id]}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                  >
                                    {loading[request._id] ? (
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
