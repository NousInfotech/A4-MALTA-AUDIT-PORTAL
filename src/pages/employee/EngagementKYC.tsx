import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Eye,
  CheckCircle,
  Clock,
  Upload,
  RefreshCw,
  FileText,
  Plus,
  Download,
  FileEdit,
  FileUp,
  RotateCcw,
  Play,
  Trash2,
  AlertCircle
} from "lucide-react";
import { kycApi, engagementApi, documentRequestApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { KYCDocumentRequestModal } from "@/components/kyc/KYCDocumentRequestModal";
import { AddDocumentRequestModal } from "@/components/kyc/AddDocumentRequestModal";
import { ManualUploadModal } from "@/components/kyc/ManualUploadModal";
import { DefaultDocumentRequestPreview } from "@/components/kyc/DefaultDocumentRequestPreview";
import { DefaultDocument } from "@/data/defaultDocumentRequests";

interface Engagement {
  _id: string;
  title: string;
  yearEndDate: string;
  clientId: string;
  status: string;
}

interface KYCWorkflow {
  _id: string;
  engagement: {
    _id: string;
    title: string;
    yearEndDate: string;
    clientId: string;
  };
  clientId: string;
  auditorId: string;
  documentRequests?: Array<{
    _id: string;
    name: string;
    category: string;
    description: string;
    status: string;
    documents: Array<{
      name: string;
      type: 'direct' | 'template';
      description?: string;
      url?: string;
      template?: {
        url?: string;
        instruction?: string;
      };
      uploadedAt?: string;
      status: string;
      comment?: string;
    }>;
  }>;
  discussions: Array<{
    _id: string;
    role: 'client' | 'auditor';
    message: string;
    replyTo?: string;
    documentRef?: {
      documentRequestId: string;
      documentIndex: number;
    };
    createdAt: string;
  }>;
  status: 'active' | 'pending' | 'submitted' | 'in-review' | 'completed' | 'reopened';
  createdAt: string;
  updatedAt: string;
}

export function EngagementKYC() {
  const { id: engagementId } = useParams<{ id: string }>();
  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [kycWorkflows, setKycWorkflows] = useState<KYCWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    documentRequestId?: string;
    documentIndex?: number;
    documentName?: string;
  }>({ open: false });
  const { toast } = useToast();

  useEffect(() => {
    console.log('EngagementKYC: useEffect triggered, engagementId:', engagementId);
    if (engagementId) {
      console.log('EngagementKYC: engagementId changed to:', engagementId);
      fetchEngagementDetails();
      fetchKYCWorkflows();
    } else {
      console.log('EngagementKYC: No engagementId provided');
      setLoading(false);
    }
  }, [engagementId]);

  const fetchEngagementDetails = async () => {
    try {
      const engagementData = await engagementApi.getById(engagementId!);
      setEngagement(engagementData);
    } catch (error: any) {
      console.error('Error fetching engagement details:', error);
      toast({
        title: "Error",
        description: "Failed to load engagement details",
        variant: "destructive",
      });
    }
  };

  const fetchKYCWorkflows = async (retryCount = 0) => {
    if (!engagementId) {
      console.error('No engagement ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching KYC workflows for engagement:', engagementId);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const workflows = await Promise.race([
        kycApi.getByEngagement(engagementId),
        timeoutPromise
      ]);
      
      console.log('KYC workflows response:', workflows);
      
      // Handle different response formats
      if (workflows) {
        setKycWorkflows(Array.isArray(workflows) ? workflows : [workflows]);
      } else {
        setKycWorkflows([]);
      }
    } catch (error: any) {
      console.error('Error fetching KYC workflows:', error);
      
      // Handle 404 as empty state (no KYC workflows exist for this engagement)
      if (error.message && error.message.includes('404')) {
        console.log('No KYC workflows found for this engagement (404)');
        setKycWorkflows([]);
        return;
      }
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.message === 'Request timeout' || error.message.includes('Network'))) {
        console.log(`Retrying fetchKYCWorkflows (attempt ${retryCount + 1})`);
        setTimeout(() => {
          fetchKYCWorkflows(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      // Show specific error message for other errors
      let errorMessage = "Failed to fetch KYC workflows";
      if (error.message === 'Request timeout') {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message && !error.message.includes('404')) {
        errorMessage = error.message;
      }
      
      // Only show toast for non-404 errors
      if (!error.message || !error.message.includes('404')) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
      setKycWorkflows([]);
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <Play className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'submitted':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <Upload className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        );
      case 'in-review':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <Eye className="h-3 w-3 mr-1" />
            In Review
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'reopened':
        return (
          <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
            <RotateCcw className="h-3 w-3 mr-1" />
            Reopened
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleStatusUpdate = async (kycId: string, newStatus: string) => {
    try {
      await kycApi.updateStatus(kycId, newStatus);
      await fetchKYCWorkflows();
      toast({
        title: "Status Updated",
        description: `KYC workflow status updated to ${newStatus}`,
      });
    } catch (error: any) {
      console.error('Error updating KYC status:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update KYC status",
        variant: "destructive",
      });
    }
  };

  const handleReopenKYC = async (kycId: string) => {
    try {
      await kycApi.updateStatus(kycId, 'reopened');
      await fetchKYCWorkflows();
      toast({
        title: "KYC Reopened",
        description: "KYC workflow has been reopened for additional document requests",
      });
    } catch (error: any) {
      console.error('Error reopening KYC:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to reopen KYC",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDialog.documentRequestId || deleteDialog.documentIndex === undefined) return;
    
    try {
      await documentRequestApi.deleteDocument(
        deleteDialog.documentRequestId,
        deleteDialog.documentIndex
      );
      await fetchKYCWorkflows();
      toast({
        title: "Document Deleted",
        description: "Document has been deleted successfully",
      });
      setDeleteDialog({ open: false });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading KYC workflows...</p>
          <p className="text-xs text-slate-500 mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Commented out top section - Global KYC Workflow Overview */}
      {/* <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {engagement ? `${engagement.title} - KYC Workflows` : 'KYC Workflows'}
                </CardTitle>
                <CardDescription className="text-gray-700">
                  Manage Know Your Client workflows for this engagement
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fetchKYCWorkflows()}
                className="border-gray-300 hover:bg-gray-100 text-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {kycWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No KYC Workflows</h3>
              <p className="text-gray-600 mb-4">
                No KYC workflows have been created for this engagement yet.
              </p>
              {engagementId && kycWorkflows.length === 0 && (
                <KYCDocumentRequestModal
                  engagementId={engagementId}
                  clientId={engagement?.clientId || ''}
                  engagementName={engagement?.title}
                  onSuccess={fetchKYCWorkflows}
                  trigger={
                    <Button className="bg-gray-800 hover:bg-gray-900 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First KYC Workflow
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {kycWorkflows.map((workflow) => (
                <div key={workflow._id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                        <FileText className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">KYC Workflow</h3>
                        <p className="text-sm text-gray-600">
                          Client: {workflow.clientId} • Created: {format(new Date(workflow.createdAt), "MMM dd, yyyy")}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>{workflow.documentRequests?.length || 0} Document Requests</span>
                          <span>{workflow.documentRequests?.reduce((acc, req) => acc + (req.documents?.length || 0), 0) || 0} Total Documents</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(workflow.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card> */}

      {/* KYC Details Section - Shows details for all workflows */}
      {kycWorkflows.length > 0 ? (
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">KYC Workflow Details</CardTitle>
                  <CardDescription className="text-gray-700">
                    Manage document requests and workflow status
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => fetchKYCWorkflows()}
                  className="border-gray-300 hover:bg-gray-100 text-gray-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                {engagementId && (
                  <ManualUploadModal
                    kycId={kycWorkflows[0]._id}
                    engagementId={engagementId}
                    clientId={kycWorkflows[0].clientId}
                    onSuccess={fetchKYCWorkflows}
                    trigger={
                      <Button variant="outline" className="border-blue-300 hover:bg-blue-50 text-blue-700">
                        <Upload className="h-4 w-4 mr-2" />
                        Manual Upload
                      </Button>
                    }
                  />
                )}
                {engagementId && (
                  <AddDocumentRequestModal
                    kycId={kycWorkflows[0]._id}
                    engagementId={engagementId}
                    clientId={kycWorkflows[0].clientId}
                    onSuccess={fetchKYCWorkflows}
                    trigger={
                      <Button className="bg-gray-800 hover:bg-gray-900 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Document Request
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {kycWorkflows.map((workflow) => (
              <div key={workflow._id} className="space-y-4">
                {/* Status Management */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Status Management</h3>
                    {getStatusBadge(workflow.status)}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {workflow.status !== 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(workflow._id, 'active')}
                        className="border-gray-300 hover:bg-gray-100 text-gray-700"
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Set Active
                      </Button>
                    )}
                    {workflow.status !== 'in-review' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(workflow._id, 'in-review')}
                        className="border-gray-300 hover:bg-gray-100 text-gray-700"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Set In Review
                      </Button>
                    )}
                    {workflow.status !== 'completed' && (
                      <Button
                        size="sm"
                        className="bg-gray-800 hover:bg-gray-900 text-white"
                        onClick={() => handleStatusUpdate(workflow._id, 'completed')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Completed
                      </Button>
                    )}
                    {workflow.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReopenKYC(workflow._id)}
                        className="border-gray-300 hover:bg-gray-100 text-gray-700"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reopen KYC
                      </Button>
                    )}
                  </div>
                </div>

                {/* Document Requests */}
                {workflow.documentRequests && workflow.documentRequests.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Document Requests</h3>
                      <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                        {workflow.documentRequests.length} Request{workflow.documentRequests.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      {workflow.documentRequests.map((docRequest, index) => (
                        <div key={docRequest._id || index} className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-600">{index + 1}</span>
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{docRequest.name || `Document Request ${index + 1}`}</h4>
                                {docRequest.description && (
                                  <p className="text-sm text-gray-600">{docRequest.description}</p>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-gray-600 border-gray-600 bg-white">
                              {docRequest.status}
                            </Badge>
                          </div>
                          
                          {docRequest.documents && docRequest.documents.length > 0 ? (
                            <div className="space-y-2">
                              {docRequest.documents.map((doc, docIndex) => (
                                <div key={docIndex} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                  <div className="flex items-center gap-3">
                                    {doc.type === 'template' ? (
                                      <FileEdit className="h-5 w-5 text-gray-600" />
                                    ) : (
                                      <FileUp className="h-5 w-5 text-gray-600" />
                                    )}
                                    <div>
                                      <p className="font-medium text-gray-900">{doc.name}</p>
                                      {doc.description && (
                                        <p className="text-xs text-gray-600 mt-0.5">{doc.description}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-1">
                                        {doc.type === 'template' ? (
                                          <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                                            Template
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                                            Direct
                                          </Badge>
                                        )}
                                        <Badge variant="outline" className="text-gray-600 border-gray-300">
                                          {doc.status}
                                        </Badge>
                                        {doc.uploadedAt && (
                                          <span className="text-xs text-gray-500">
                                            Uploaded: {format(new Date(doc.uploadedAt), "MMM dd, yyyy HH:mm")}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                   {doc.url && (
                                     <div className="flex items-center gap-1">
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={() => window.open(doc.url, '_blank')}
                                         className="border-blue-300 hover:bg-blue-50 text-blue-700 h-8 w-8 p-0"
                                         title="View Document"
                                       >
                                         <Eye className="h-4 w-4" />
                                       </Button>
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={async () => {
                                           try {
                                             const response = await fetch(doc.url!);
                                             const blob = await response.blob();
                                             const url = window.URL.createObjectURL(blob);
                                             const link = document.createElement('a');
                                             link.href = url;
                                             link.download = doc.name;
                                             document.body.appendChild(link);
                                             link.click();
                                             document.body.removeChild(link);
                                             window.URL.revokeObjectURL(url);
                                           } catch (error) {
                                             console.error('Download error:', error);
                                             toast({
                                               title: "Error",
                                               description: "Failed to download document",
                                               variant: "destructive",
                                             });
                                           }
                                         }}
                                         className="border-green-300 hover:bg-green-50 text-green-700 h-8 w-8 p-0"
                                         title="Download Document"
                                       >
                                         <Download className="h-4 w-4" />
                                       </Button>
                                       <Button
                                         size="sm"
                                         variant="outline"
                                         onClick={() => {
                                           setDeleteDialog({
                                             open: true,
                                             documentRequestId: docRequest._id,
                                             documentIndex: docIndex,
                                             documentName: doc.name,
                                           });
                                         }}
                                         className="border-red-300 hover:bg-red-50 text-red-700 h-8 w-8 p-0"
                                         title="Delete Document"
                                       >
                                         <Trash2 className="h-4 w-4" />
                                       </Button>
                                     </div>
                                   )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-sm bg-white rounded-lg">
                              No documents in this request yet
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No document requests yet
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No KYC Workflows</h3>
              <p className="text-gray-600 mb-4">
                No KYC workflows have been created for this engagement yet.
              </p>
              {engagementId && (
                <KYCDocumentRequestModal
                  engagementId={engagementId}
                  clientId={engagement?.clientId || ''}
                  engagementName={engagement?.title}
                  onSuccess={fetchKYCWorkflows}
                  trigger={
                    <Button className="bg-gray-800 hover:bg-gray-900 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create First KYC Workflow
                    </Button>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Delete Document
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.documentName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function EngagementKYCPage() {
  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        <EngagementKYC />
      </div>
    </div>
  );
}
