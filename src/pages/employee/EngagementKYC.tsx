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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { kycApi, engagementApi, documentRequestApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import DocumentRequest from "@/components/document-request/DocumentRequest";
import type {
  DocumentRequest as DocumentRequestType,
  DocumentRequestDocumentSingle,
  DocumentRequestDocumentMultiple,
} from "@/components/document-request/types";
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
  companyId: any;
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
    documentRequest: {
      _id: string;
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
    };
    person: {
      _id: string;
      name: string;
      nationality: string;
      address: string;
      id: string;
    };
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
  workflowType?: 'Shareholder' | 'Representative';
  createdAt: string;
  updatedAt: string;
}

interface EngagementKYCProps {
  engagementId?: string;
  companyId?: string;
  clientId?: string;
  company?: any;
  isClientView?: boolean;
  showStatusManagement?: boolean;
  deleteRequest?: boolean;
}

export function EngagementKYC({ 
  engagementId: engagementIdProp, 
  companyId: companyIdProp,
  clientId: clientIdProp,
  company: companyProp,
  isClientView = false,
  showStatusManagement = true,
  deleteRequest=true
}: EngagementKYCProps = {}) {
  const params = useParams<{ id: string; clientId?: string; companyId?: string }>();
  
  // Prioritize props, then try to verify params
  // Logic: 
  // 1. If engagementIdProp provided -> use it
  // 2. If params.id is available AND we are in engagement context (hard to tell 100% just from id, but usually id=engagementId in this route) -> use it
  // But wait, if we are in company detail, there is no :id param strictly for engagement. 
  // CompanyDetail route: /client/:clientId/company/:companyId
  
  const companyId = companyIdProp || params.companyId;
  const engagementId = engagementIdProp || (!companyId ? params.id : undefined); 
  const clientId = clientIdProp || params.clientId;
  const { user } = useAuth(); // Get current user for permission checks
  
  // Determine if we are in client view mode (either via prop or role)
  const isClient = isClientView || user?.role === 'client';

  const [engagement, setEngagement] = useState<Engagement | null>(null);
  const [kycWorkflows, setKycWorkflows] = useState<KYCWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentRequestsMap, setDocumentRequestsMap] = useState<Record<string, any>>({});
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type?: 'document' | 'multipleItem' | 'multipleGroup' | 'request';
    documentRequestId?: string;
    documentIndex?: number;
    multipleDocumentId?: string;
    itemIndex?: number;
    documentName?: string;
  }>({ open: false });
  const [isUpdating, setIsUpdating] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState<{
    documentRequestId?: string;
    documentIndex?: number;
  } | null>(null);
  const [uploadingMultiple, setUploadingMultiple] = useState<{
    documentRequestId?: string;
    multipleDocumentId?: string;
    itemIndex?: number;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log('EngagementKYC: useEffect triggered, engagementId:', engagementId, 'companyId:', companyId);
    if (engagementId) {
      console.log('EngagementKYC: engagementId present:', engagementId);
      fetchEngagementDetails();
      fetchKYCWorkflows();
    } else if (companyId) {
      console.log('EngagementKYC: companyId present:', companyId);
      fetchKYCWorkflows();
    } else {
      console.log('EngagementKYC: No ID provided');
      setLoading(false);
    }
  }, [engagementId, companyId]);

  // Auto-update document request statuses after workflows are fetched (only once per workflow load)
  useEffect(() => {
    if (kycWorkflows.length === 0 || loading) return;

    // Use sessionStorage to track if we've already processed these workflows
    const workflowIds = kycWorkflows.map(w => w._id).sort().join(',');
    const storageKey = `kyc_status_updated_${workflowIds}`;
    
    // Check if we've already updated these workflows in this session
    if (sessionStorage.getItem(storageKey)) {
      return;
    }

    const updateStatuses = async () => {
      let hasUpdates = false;
      for (const workflow of kycWorkflows) {
        if (workflow.documentRequests) {
          for (const item of workflow.documentRequests) {
            if (!item.documentRequest) continue;
            const calculatedStatus = calculateDocumentRequestStatus(item.documentRequest);
            if (item.documentRequest.status !== calculatedStatus) {
              hasUpdates = true;
              try {
                await documentRequestApi.update(item.documentRequest._id, {
                  status: calculatedStatus
                });
              } catch (error) {
                console.error('Error auto-updating status:', error);
              }
            }
          }
        }
      }
      
      // Mark as processed to prevent re-runs
      sessionStorage.setItem(storageKey, 'true');
      
      // Only refresh if there were updates
      if (hasUpdates) {
        setTimeout(() => {
          fetchKYCWorkflows();
        }, 500);
      }
    };

    updateStatuses();
  }, [kycWorkflows.length, loading]); // Only track workflow count, not the full array

  const fetchEngagementDetails = async () => {

    try {
      
      const engagementData = await engagementApi.getById(engagementId!);
      console.log(engagementData);
      
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

  const fetchKYCWorkflows = async (retryCount = 0, silent = false) => {
    if (!engagementId && !companyId) {
      console.error('No engagement ID or Company ID provided');
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      let fetchPromise;
      if (engagementId) {
        console.log('Fetching KYC workflows for engagement:', engagementId);
        fetchPromise = kycApi.getByEngagement(engagementId);
      } else {
        console.log('Fetching KYC workflows for company:', companyId);
        fetchPromise = kycApi.getByCompany(companyId!);
      }
      
      const workflowsResult = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]);
      
      console.log('KYC workflows response:', workflowsResult);
      
      // Handle different response formats
      const normalizedWorkflows = workflowsResult
        ? (Array.isArray(workflowsResult) ? workflowsResult : [workflowsResult])
        : [];
      setKycWorkflows(normalizedWorkflows);

      // Also fetch up-to-date document requests
      // so we always show the latest documents/multipleDocuments in the KYC view
      try {
        let docRequests = [];
        if (engagementId) {
          docRequests = await documentRequestApi.getByEngagement(engagementId);
        }
        // If companyId, we might need a similar API or filter relevant ones. 
        // For now, only for engagement we reliably have this endpoint.
        
        if (Array.isArray(docRequests)) {
          const map: Record<string, any> = {};
          docRequests.forEach((dr: any) => {
            if (dr && dr._id) {
              map[dr._id] = dr;
            }
          });
          setDocumentRequestsMap(map);
      } else {
          setDocumentRequestsMap({});
        }
      } catch (docErr: any) {
        console.error('Error fetching document requests for KYC view:', docErr);
        // Don't fail the whole KYC fetch if this call fails
        setDocumentRequestsMap({});
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
    // Ensure status is a string
    const statusStr = typeof status === 'string' ? status : String(status || 'pending');
    
    switch (statusStr) {
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
        return <Badge variant="secondary">{statusStr}</Badge>;
    }
  };

  const handleStatusUpdate = async (kycId: string, newStatus: string) => {
    try {
      setIsUpdating(true);
      await kycApi.updateStatus(kycId, newStatus);
      await fetchKYCWorkflows(0, true);
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
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReopenKYC = async (kycId: string) => {
    try {
      setIsUpdating(true);
      await kycApi.updateStatus(kycId, 'reopened');
      await fetchKYCWorkflows(0, true);
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
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDialog.documentRequestId || deleteDialog.documentIndex === undefined) return;
    
    try {
      setIsUpdating(true);
      await documentRequestApi.deleteDocument(
        deleteDialog.documentRequestId,
        deleteDialog.documentIndex
      );
      await fetchKYCWorkflows(0, true);
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
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete entire document request
  const handleDeleteRequest = async (documentRequestId: string) => {
    try {
      setIsUpdating(true);
      await documentRequestApi.deleteRequest(documentRequestId);
      await fetchKYCWorkflows(0, true);
      toast({
        title: "Request Deleted",
        description: "Document request has been deleted successfully",
      });
      setDeleteDialog({ open: false });
    } catch (error: any) {
      console.error("Error deleting document request:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete document request",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete a specific item from a multiple document group
  const handleDeleteMultipleItem = async () => {
    if (
      !deleteDialog.documentRequestId ||
      !deleteDialog.multipleDocumentId ||
      deleteDialog.itemIndex === undefined
    )
      return;

    try {
      setIsUpdating(true);
      await documentRequestApi.deleteMultipleDocumentItem(
        deleteDialog.documentRequestId,
        deleteDialog.multipleDocumentId,
        deleteDialog.itemIndex
      );
      await fetchKYCWorkflows(0, true);
      toast({
        title: "Document Item Deleted",
        description: "Document item has been deleted successfully",
      });
      setDeleteDialog({ open: false });
    } catch (error: any) {
      console.error("Error deleting multiple document item:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete document item",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete entire multiple document group
  const handleDeleteMultipleGroup = async () => {
    if (!deleteDialog.documentRequestId || !deleteDialog.multipleDocumentId) return;

    try {
      setIsUpdating(true);
      await documentRequestApi.deleteMultipleDocumentGroup(
        deleteDialog.documentRequestId,
        deleteDialog.multipleDocumentId
      );
      await fetchKYCWorkflows(0, true);
      toast({
        title: "Document Group Deleted",
        description:
          `"${deleteDialog.documentName || "Group"}" has been deleted successfully`,
      });
      setDeleteDialog({ open: false });
    } catch (error: any) {
      console.error("Error deleting multiple document group:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete document group",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteFromDialog = async () => {
    if (deleteDialog.type === "request") {
      if (!deleteDialog.documentRequestId) return;
      await handleDeleteRequest(deleteDialog.documentRequestId);
    } else if (deleteDialog.type === "multipleItem") {
      await handleDeleteMultipleItem();
    } else if (deleteDialog.type === "multipleGroup") {
      await handleDeleteMultipleGroup();
    } else {
      await handleDeleteDocument();
    }
  };

  // Calculate document request status based on document completion
  const calculateDocumentRequestStatus = (docRequest: any): string => {
    if (!docRequest || !Array.isArray(docRequest.documents) || docRequest.documents.length === 0) {
      return 'pending';
    }
    
    const totalDocuments = docRequest.documents.length;
    const completedDocuments = docRequest.documents.filter((doc: any) => 
      doc?.url && (doc.status === 'completed' || doc.status === 'uploaded' || doc.status === 'approved')
    ).length;
    
    if (completedDocuments === 0) {
      return 'pending';
    } else if (completedDocuments === totalDocuments) {
      return 'completed';
    } else {
      return 'submitted'; // Partially completed
    }
  };

  // Update document request status
  const updateDocumentRequestStatus = async (documentRequestId: string) => {
    try {
      // Get current document request
      const item = kycWorkflows
        .flatMap(w => w.documentRequests || [])
        .find(item => item.documentRequest._id === documentRequestId);
      
      if (!item) return;

      const newStatus = calculateDocumentRequestStatus(item.documentRequest);
      
      // Only update if status changed
      if (item.documentRequest.status !== newStatus) {
        await documentRequestApi.update(documentRequestId, {
          status: newStatus
        });
        await fetchKYCWorkflows(0, true);
      }
    } catch (error: any) {
      console.error('Error updating document request status:', error);
      // Don't show toast for this as it's an automatic update
    }
  };

  // Handle document upload
  const handleDocumentUpload = async (
    documentRequestId: string,
    documentIndex: number,
    file: File
  ) => {
    try {
      setIsUpdating(true);
      setUploadingDocument({ documentRequestId, documentIndex });
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload the document
      await documentRequestApi.uploadSingleDocument(documentRequestId, formData);
      
      // Refresh workflows to get the updated document with URL
      await fetchKYCWorkflows(0, true);
      
      // Wait a bit for the backend to process, then update status
      setTimeout(async () => {
        try {
          // Update document status to uploaded
          await documentRequestApi.updateDocumentStatus(documentRequestId, documentIndex, 'uploaded');
          
          // Refresh again and update document request status
          await fetchKYCWorkflows(0, true);
          
          // Update document request status
          await updateDocumentRequestStatus(documentRequestId);
        } catch (error) {
          console.error('Error updating document status:', error);
        }
      }, 1000);
      
      toast({
        title: "Document Uploaded",
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(null);
      setIsUpdating(false);
    }
  };

  // Handle upload for multiple-document groups
  const handleUploadMultiple = async (
    documentRequestId: string,
    multipleDocumentId: string,
    files: FileList,
    itemIndex?: number
  ) => {
    try {
      setIsUpdating(true);
      setUploadingMultiple({ documentRequestId, multipleDocumentId, itemIndex });

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      await documentRequestApi.uploadMultipleDocuments(
        documentRequestId,
        multipleDocumentId,
        formData,
        itemIndex
      );

      
      await fetchKYCWorkflows(0, true);

      toast({
        title: "Documents Uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error("Error uploading multiple documents:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload documents",
        variant: "destructive",
      });
    } finally {
      setUploadingMultiple(null);
      setIsUpdating(false);
    }
  };

  // Clear only the uploaded file for a single-document requirement
  const handleClearSingleDocument = async (
    documentRequestId: string,
    documentIndex: number,
    _documentName: string
  ) => {
    try {
      setIsUpdating(true);
      await documentRequestApi.clearSingleDocument(documentRequestId, documentIndex);
      await fetchKYCWorkflows(0, true);

      toast({
        title: "File Cleared",
        description: "The uploaded file has been cleared.",
      });
    } catch (error: any) {
      console.error("Error clearing document:", error);
      toast({
        title: "Error",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Clear only the uploaded file for a multiple document item
  const handleClearMultipleItem = async (
    documentRequestId: string,
    multipleDocumentId: string,
    itemIndex: number,
    _itemLabel: string
  ) => {
    try {
      setIsUpdating(true);
      await documentRequestApi.clearMultipleDocumentItem(
        documentRequestId,
        multipleDocumentId,
        itemIndex
      );
      await fetchKYCWorkflows(0, true);

      toast({
        title: "File Cleared",
        description: "The uploaded file has been cleared.",
      });
    } catch (error: any) {
      console.error("Error clearing multiple document item:", error);
      toast({
        title: "Error",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Clear all uploaded files in a multiple document group
  const handleClearMultipleGroup = async (
    documentRequestId: string,
    multipleDocumentId: string,
    _groupName: string
  ) => {
    try {
      setIsUpdating(true);
      await documentRequestApi.clearMultipleDocumentGroup(
        documentRequestId,
        multipleDocumentId
      );
      await fetchKYCWorkflows(0, true);

      toast({
        title: "Files Cleared",
        description: "All uploaded files in this group have been cleared.",
      });
    } catch (error: any) {
      console.error("Error clearing multiple document group:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to clear group",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Download all files in a multiple document group
  const handleDownloadMultipleGroup = async (
    documentRequestId: string,
    multipleDocumentId: string,
    groupName: string,
    items: any[]
  ) => {
    try {
      setIsUpdating(true);
      toast({
          title: "Download Started",
          description: `Preparing download for "${groupName}"...`,
      });
      
      const { blob, filename } = await documentRequestApi.downloadAll(engagementId, companyId, undefined, documentRequestId, multipleDocumentId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: `Downloaded "${groupName}" successfully.`,
      });
    } catch (error: any) {
      console.error("Error downloading multiple documents:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to download files",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setIsUpdating(true);
      toast({
          title: "Download Started",
          description: "Preparing your download, this may take a moment...",
      });
      
      const { blob, filename } = await documentRequestApi.downloadAll(engagementId, companyId, 'kyc');
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: "Documents downloaded successfully.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download documents",
        variant: "destructive",
      });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleDownloadRequest = async (requestId: string) => {
    try {
      setIsUpdating(true);
      toast({
          title: "Download Started",
          description: "Preparing your download...",
      });
      
      // We pass undefined for engagement/company/category because we target a specific requestId
      const { blob, filename } = await documentRequestApi.downloadAll(undefined, undefined, undefined, requestId);
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Complete",
        description: "Request documents downloaded successfully.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download documents",
        variant: "destructive",
      });
    } finally {
        setIsUpdating(false);
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

  const shareholderWorkflows = kycWorkflows.filter(
    (w) => !w.workflowType || w.workflowType === "Shareholder"
  );
  const representativeWorkflows = kycWorkflows.filter(
    (w) => w.workflowType === "Representative"
  );

  // Helper to render a workflow section
  const renderWorkflowSection = (workflows: KYCWorkflow[], type: "Shareholder" | "Representative") => {
    if (workflows.length === 0) {
      return (
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No {type} KYC Workflow</h3>
              <p className="text-gray-600 mb-4">
                No {type} KYC workflow has been created for this {engagementId ? "engagement" : "company"} yet.
              </p>

              {(engagementId || companyId) && !isClient && (
                <KYCDocumentRequestModal
                  engagementId={engagementId}
                  companyId={companyId}
                  clientId={engagement?.clientId || clientId || ''}
                  engagementName={engagement?.title}
                  company={companyProp || engagement?.companyId}
                  workflowType={type}
                  onSuccess={fetchKYCWorkflows}
                  trigger={
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground">
                      <Plus className="h-4 w-4 mr-2" />
                      Create {type} KYC Workflow
                    </Button>
                  }
                />
              )}
              {(engagementId || companyId) && isClient && (
                 <p className="text-sm text-gray-500 italic mt-2">
                   Please contact your auditor to initiate a KYC workflow.
                 </p>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">{type} KYC Workflow Details</CardTitle>
                <CardDescription className="text-gray-700">
                  Manage document requests and workflow status
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fetchKYCWorkflows()}
                disabled={isUpdating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              {(engagementId || companyId) && (() => {
                const totalGlobalUploadedDocs = workflows.reduce((acc, workflow) => {
                  return acc + (workflow.documentRequests?.reduce((reqAcc, item) => {
                    const singleDocs = item.documentRequest.documents?.filter((d: any) => d.url).length || 0;
                    const docReq = item.documentRequest as any;
                    const multipleDocs = docReq.multipleDocuments?.reduce((mAcc: number, group: any) => {
                      return mAcc + (group.multiple?.filter((d: any) => d.url).length || 0);
                    }, 0) || 0;
                    return reqAcc + singleDocs + multipleDocs;
                  }, 0) || 0);
                }, 0);

                return totalGlobalUploadedDocs > 0 && (
                  <Button
                    variant="default"
                    onClick={handleDownloadAll}
                    disabled={isUpdating}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All
                  </Button>
                );
              })()}
              {(engagementId || companyId) && !isClient && (
                <AddDocumentRequestModal
                  kycId={workflows[0]._id}
                  engagementId={engagementId}
                  companyId={companyId}
                  clientId={workflows[0].clientId}
                  company={companyProp || engagement?.companyId}
                  workflowType={type}
                  onSuccess={fetchKYCWorkflows}
                  trigger={
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground"
                    disabled={isUpdating}
                    >
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
          {workflows.map((workflow) => (
            <div key={workflow._id} className="space-y-4">
              {/* Status Management – only show when there are document requests */}
              {showStatusManagement && workflow.documentRequests && workflow.documentRequests.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  
                  <div className="flex items-center justify-between mb-3">
                    
                    <h3 className="font-semibold text-gray-900">Status Management</h3>
                    {getStatusBadge(workflow.status)}
                  </div>
                  {!isClient && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {workflow.status !== 'completed' && (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground"
                        onClick={() => handleStatusUpdate(workflow._id, 'completed')}
                        disabled={isUpdating}
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
                        className="border-gray-300 hover:bg-gray-100 hover:text-gray-900 text-gray-700"
                        disabled={isUpdating}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reopen KYC
                      </Button>
                    )}
                  </div>
                  )}
                </div>
              )}

              {/* Document Requests */}
              {workflow.documentRequests && workflow.documentRequests.length > 0 ? (() => {
                const validRequests = workflow.documentRequests.filter(
                  (item) => item.documentRequest
                );

                if (validRequests.length === 0) {
                    return (
                    <div className="text-center py-8 text-gray-500">
                      No document requests yet
                    </div>
                  );
                }

                return (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Document Requests
                      </h3>
                      <Badge
                        variant="outline"
                        className="text-gray-600 border-gray-300 bg-gray-50"
                      >
                        {validRequests.length} Request
                        {validRequests.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      {validRequests.map((item, index) => {
                        const populated =
                          (item.documentRequest &&
                            documentRequestsMap[item.documentRequest._id]) ||
                          null;
                        const baseRequest = (populated ||
                          item.documentRequest) as any;
                        const singleDocs = baseRequest?.documents || [];
                        const multipleGroups = baseRequest?.multipleDocuments || [];
                        const multipleItems = multipleGroups.flatMap(
                          (g: any) => g.multiple || []
                        );
                        const totalDocs =
                          singleDocs.length + multipleItems.length;
                        const completedSingle = singleDocs.filter(
                          (doc: any) =>
                            doc.url &&
                            doc.status &&
                            doc.status !== "rejected"
                        ).length;
                        const completedMultiple = multipleItems.filter(
                          (item: any) =>
                            item.url &&
                            item.status &&
                            item.status !== "rejected"
                        ).length;
                        const completedDocs =
                          completedSingle + completedMultiple;
                        const progressPercentage =
                          totalDocs > 0
                            ? (completedDocs / totalDocs) * 100
                            : 0;
                        const request: DocumentRequestType = {
                          documents: baseRequest?.documents || [],
                          multipleDocuments: baseRequest?.multipleDocuments || [],
                          _id: baseRequest?._id,
                          engagement: baseRequest?.engagement,
                          clientId: baseRequest?.clientId,
                          name: baseRequest?.name,
                          category: baseRequest?.category ?? "",
                          description: baseRequest?.description ?? "",
                          comment: baseRequest?.comment,
                          status: baseRequest?.status,
                          requestedAt: baseRequest?.requestedAt ?? new Date(),
                          completedAt: baseRequest?.completedAt,
                        };
                            
                        return (
                          <div
                            key={item._id || index}
                            className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-lg font-semibold text-blue-700">
                                    {item.person?.name?.charAt(0).toUpperCase() || (engagementId ? "U" : (workflow as any).company?.name?.charAt(0).toUpperCase() || "C")}
                                  </span>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900 text-lg">
                                      {item.person?.name || (engagementId ? "Unknown Person" : (workflow as any).company?.name || "Company Request")}
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className="text-xs text-blue-700 border-blue-300 bg-blue-50"
                                    >
                                      {(request.documents?.length || 0) +
                                        (request.multipleDocuments?.length || 0)}{" "}
                                      Document
                                      {(request.documents?.length || 0) +
                                        (request.multipleDocuments?.length || 0) !==
                                      1
                                        ? "s"
                                        : ""}{" "}
                                      Required
                                    </Badge>
                                  </div>
                                  {item.person?.nationality && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {item.person.nationality} •{" "}
                                      {item.person.address?.split("\n")[0] ||
                                        "No address"}
                                    </p>
                                  )}
                                  {request.description && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {request.description}
                                    </p>
                                  )}
                                  {totalDocs > 0 && (
                                    <div className="mt-3 space-y-1">
                                      <div className="flex items-center justify-between text-xs text-gray-600">
                                        <span className="font-medium">
                                          Progress: {completedDocs} / {totalDocs} documents
                                        </span>
                                        <span className="font-semibold">
                                          {Math.round(progressPercentage)}%
                                        </span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                          className={`h-2.5 rounded-full transition-all ${
                                            progressPercentage === 100
                                              ? "bg-green-600"
                                              : progressPercentage > 0
                                              ? "bg-blue-600"
                                              : "bg-gray-300"
                                          }`}
                                          style={{ width: `${progressPercentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {completedDocs > 0 && (
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleDownloadRequest(request._id)}
                                    disabled={isUpdating}
                                    title="Download All Documents In This Request"
                                    className='text-xs'
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Download All
                                  </Button>
                                )}
                                {deleteRequest &&(
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setDeleteDialog({
                                      open: true,
                                      type: "request",
                                      documentRequestId: request._id,
                                      documentName:
                                        request.category || "this document request",
                                    })
                                  }
                                  className="border-red-300 hover:bg-red-50 hover:text-red-800 text-red-700 text-xs"
                                  title="Delete Document Request"
                                  disabled={isUpdating}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete Request
                                </Button>
                                )
                        }
                              </div>
                            </div>
                        
                            <DocumentRequest
                              request={request}
                              uploadingSingle={uploadingDocument}
                              uploadingMultiple={uploadingMultiple}
                              onUploadSingle={handleDocumentUpload}
                              onUploadMultiple={handleUploadMultiple}
                              onClearDocument={handleClearSingleDocument}
                              onClearMultipleItem={handleClearMultipleItem}
                              onClearMultipleGroup={handleClearMultipleGroup}
                              onDownloadMultipleGroup={handleDownloadMultipleGroup}
                              onRequestDeleteDialog={
                                (showStatusManagement && deleteRequest) ?
                                ((payload) =>
                                  setDeleteDialog({
                                    open: true,
                                    ...payload,
                                  })) : undefined
                              }
                              clientId={workflow.clientId}
                              onDocumentsAdded={fetchKYCWorkflows}
                              isDisabled={loading || isUpdating}
                              isClientView={isClient}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-8 text-gray-500">
                  No document requests yet
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  const company = companyProp || engagement?.companyId;
  
  // Check if company has relevant persons
  const hasShareholders = Array.isArray(company?.shareHolders) && company.shareHolders.length > 0;
  const hasRepresentatives = Array.isArray(company?.representationalSchema) && company.representationalSchema.length > 0;

  return (
    <div className="space-y-6">
      {kycWorkflows.length > 0 ? (
        <Tabs defaultValue="shareholder" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 p-1 rounded-xl">
            <TabsTrigger 
              value="shareholder"
             >
              Shareholder KYC
            </TabsTrigger>
            <TabsTrigger 
              value="representative"
            >
              Representative KYC
            </TabsTrigger>
          </TabsList>
          <TabsContent value="shareholder">
            {renderWorkflowSection(shareholderWorkflows, "Shareholder")}
          </TabsContent>
          <TabsContent value="representative">
            {renderWorkflowSection(representativeWorkflows, "Representative")}
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No KYC Workflows</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Get started by creating a KYC workflow for either Shareholders or Representatives.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {(engagementId || companyId) && !isClient && (
                  <>
                    {hasShareholders && (
                      <KYCDocumentRequestModal
                        engagementId={engagementId}
                        companyId={companyId}
                        clientId={engagement?.clientId || clientId || ''}
                        engagementName={engagement?.title}
                        company={companyProp || engagement?.companyId}
                        workflowType="Shareholder"
                        onSuccess={fetchKYCWorkflows}
                        trigger={
                          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground w-full sm:w-auto h-auto py-3 px-6 flex-col gap-1">
                            <div className="flex items-center">
                              <Plus className="h-4 w-4 mr-2" />
                              <span>Create Shareholder KYC</span>
                            </div>
                            <span className="text-xs opacity-80 font-normal">For company shareholders</span>
                          </Button>
                        }
                      />
                    )}

                    {hasRepresentatives && (
                      <KYCDocumentRequestModal
                        engagementId={engagementId}
                        companyId={companyId}
                        clientId={engagement?.clientId || clientId || ''}
                        engagementName={engagement?.title}
                        company={companyProp || engagement?.companyId}
                        workflowType="Representative"
                        onSuccess={fetchKYCWorkflows}
                        trigger={
                          <Button variant="outline" className="w-full sm:w-auto h-auto py-3 px-6 flex-col gap-1">
                            <div className="flex items-center">
                              <Plus className="h-4 w-4 mr-2" />
                              <span>Create Representative KYC</span>
                            </div>
                            <span className="text-xs opacity-80 font-normal">For legal representatives</span>
                          </Button>
                        }
                      />
                    )}
                    
                    {!hasShareholders && !hasRepresentatives && (
                      <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                         No shareholders or representatives found for this company. Please add them in the Company details first.
                      </div>
                    )}
                  </>
                )}
                {(engagementId || companyId) && isClient && (
                    <div className="text-center p-4">
                        <p className="text-gray-600">
                            No KYC workflows are currently active for you. Please contact your administrator if you believe this is an error.
                        </p>
                    </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {false && (
        <div style={{ display: 'none' }}>
      {kycWorkflows.length > 0 ? (
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary-foreground" />
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
                  disabled={isUpdating}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                
                {(engagementId || companyId) && (() => {
                  const totalGlobalUploadedDocs = kycWorkflows.reduce((acc, workflow) => {
                    return acc + (workflow.documentRequests?.reduce((reqAcc, item) => {
                      const singleDocs = item.documentRequest.documents?.filter((d: any) => d.url).length || 0;
                      const docReq = item.documentRequest as any;
                      const multipleDocs = docReq.multipleDocuments?.reduce((mAcc: number, group: any) => {
                        return mAcc + (group.multiple?.filter((d: any) => d.url).length || 0);
                      }, 0) || 0;
                      return reqAcc + singleDocs + multipleDocs;
                    }, 0) || 0);
                  }, 0);

                  return totalGlobalUploadedDocs > 0 && (
                    <Button
                      variant="default"
                      onClick={handleDownloadAll}
                      disabled={isUpdating}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download All
                    </Button>
                  );
                })()}
                {/* {(engagementId || companyId) && (
                  <ManualUploadModal
                    kycId={kycWorkflows[0]._id}
                    engagementId={engagementId}
                    companyId={companyId}
                    clientId={kycWorkflows[0].clientId}
                    onSuccess={fetchKYCWorkflows}
                    trigger={
                      <Button variant="outline" className="border-blue-300 hover:bg-blue-50 hover:text-blue-800 text-blue-700">
                        <Upload className="h-4 w-4 mr-2" />
                        Manual Upload
                      </Button>
                    }
                  />
                )} */}
                {(engagementId || companyId) && user?.role !== 'client' && (
                  <AddDocumentRequestModal
                    kycId={kycWorkflows[0]._id}
                    engagementId={engagementId}
                    companyId={companyId}
                    clientId={kycWorkflows[0].clientId}
                    company={companyProp || engagement?.companyId}
                    onSuccess={fetchKYCWorkflows}
                    trigger={
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground"
                      disabled={isUpdating}
                      >
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
                {/* Status Management – only show when there are document requests */}
                {workflow.documentRequests && workflow.documentRequests.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    
                    <div className="flex items-center justify-between mb-3">
                      
                      <h3 className="font-semibold text-gray-900">Status Management</h3>
                      {getStatusBadge(workflow.status)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* {workflow.status !== 'active' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(workflow._id, 'active')}
                          className="border-gray-300 hover:bg-gray-100 hover:text-gray-900 text-gray-700"
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
                          className="border-gray-300 hover:bg-gray-100 hover:text-gray-900 text-gray-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Set In Review
                        </Button>
                      )} */}
                      {workflow.status !== 'completed' && (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground"
                          onClick={() => handleStatusUpdate(workflow._id, 'completed')}
                          disabled={isUpdating}
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
                          className="border-gray-300 hover:bg-gray-100 hover:text-gray-900 text-gray-700"
                          disabled={isUpdating}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Reopen KYC
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Document Requests - using shared DocumentRequest component */}
                {workflow.documentRequests && workflow.documentRequests.length > 0 ? (() => {
                  // Guard against null/undefined documentRequest entries
                  const validRequests = workflow.documentRequests.filter(
                    (item) => item.documentRequest
                  );

                  if (validRequests.length === 0) {
                      return (
                      <div className="text-center py-8 text-gray-500">
                        No document requests yet
                      </div>
                    );
                  }

                  return (
                    <div>
                          <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Document Requests
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-gray-600 border-gray-300 bg-gray-50"
                        >
                          {validRequests.length} Request
                          {validRequests.length !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <div className="space-y-4">
                        {validRequests.map((item, index) => {
                          const populated =
                            (item.documentRequest &&
                              documentRequestsMap[item.documentRequest._id]) ||
                            null;
                          const baseRequest = (populated ||
                            item.documentRequest) as any;
                          // Progress calculation: include single and multiple documents
                          const singleDocs = baseRequest?.documents || [];
                          const multipleGroups = baseRequest?.multipleDocuments || [];
                          const multipleItems = multipleGroups.flatMap(
                            (g: any) => g.multiple || []
                          );
                          const totalDocs =
                            singleDocs.length + multipleItems.length;
                          const completedSingle = singleDocs.filter(
                            (doc: any) =>
                              doc.url &&
                              doc.status &&
                              doc.status !== "rejected"
                          ).length;
                          const completedMultiple = multipleItems.filter(
                            (item: any) =>
                              item.url &&
                              item.status &&
                              item.status !== "rejected"
                          ).length;
                          const completedDocs =
                            completedSingle + completedMultiple;
                          const progressPercentage =
                            totalDocs > 0
                              ? (completedDocs / totalDocs) * 100
                              : 0;
                          const request: DocumentRequestType = {
                            // Provide safe fallbacks for optional fields
                            documents: baseRequest?.documents || [],
                            multipleDocuments: baseRequest?.multipleDocuments || [],
                            _id: baseRequest?._id,
                            engagement: baseRequest?.engagement,
                            clientId: baseRequest?.clientId,
                            name: baseRequest?.name,
                            category: baseRequest?.category ?? "",
                            description: baseRequest?.description ?? "",
                            comment: baseRequest?.comment,
                            status: baseRequest?.status,
                            requestedAt: baseRequest?.requestedAt ?? new Date(),
                            completedAt: baseRequest?.completedAt,
                          };
                              
                              return (
                            <div
                              key={item._id || index}
                              className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-lg font-semibold text-blue-700">
                                      {item.person?.name?.charAt(0).toUpperCase() || (engagementId ? "U" : (workflow as any).company?.name?.charAt(0).toUpperCase() || "C")}
                                </span>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-gray-900 text-lg">
                                        {item.person?.name || (engagementId ? "Unknown Person" : (workflow as any).company?.name || "Company Request")}
                                      </h4>
                                      <Badge
                                        variant="outline"
                                        className="text-xs text-blue-700 border-blue-300 bg-blue-50"
                                      >
                                        {(request.documents?.length || 0) +
                                          (request.multipleDocuments?.length || 0)}{" "}
                                        Document
                                        {(request.documents?.length || 0) +
                                          (request.multipleDocuments?.length || 0) !==
                                        1
                                          ? "s"
                                          : ""}{" "}
                                        Required
                                  </Badge>
                                </div>
                                    {item.person?.nationality && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                        {item.person.nationality} •{" "}
                                        {item.person.address?.split("\n")[0] ||
                                          "No address"}
                                  </p>
                                )}
                                    {request.description && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        {request.description}
                                      </p>
                                    )}
                                    {totalDocs > 0 && (
                                      <div className="mt-3 space-y-1">
                                        <div className="flex items-center justify-between text-xs text-gray-600">
                                          <span className="font-medium">
                                            Progress: {completedDocs} / {totalDocs} documents
                                          </span>
                                          <span className="font-semibold">
                                            {Math.round(progressPercentage)}%
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                          <div
                                            className={`h-2.5 rounded-full transition-all ${
                                              progressPercentage === 100
                                                ? "bg-green-600"
                                                : progressPercentage > 0
                                                ? "bg-blue-600"
                                                : "bg-gray-300"
                                            }`}
                                            style={{ width: `${progressPercentage}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  </div>
                                <div className="flex items-center gap-2">
                                  {completedDocs > 0 && (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleDownloadRequest(request._id)}
                                      disabled={isUpdating}
                                      title="Download All Documents In This Request"
                                      className='text-xs'
                                    >
                                      <Download className="h-4 w-4 mr-1" />
                                      Download All
                                    </Button>
                                  )}
                                  {showStatusManagement && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setDeleteDialog({
                                        open: true,
                                        type: "request",
                                        documentRequestId: request._id,
                                        documentName:
                                          request.category || "this document request",
                                      })
                                    }
                                    className="border-red-300 hover:bg-red-50 hover:text-red-800 text-red-700 text-xs"
                                    title="Delete Document Request"
                                    disabled={isUpdating}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete Request
                                  </Button>
                                  )}
                                </div>
                                 </div>
                          
                              <DocumentRequest
                                request={request}
                                uploadingSingle={uploadingDocument}
                                uploadingMultiple={uploadingMultiple}
                                onUploadSingle={handleDocumentUpload}
                                onUploadMultiple={handleUploadMultiple}
                                onClearDocument={handleClearSingleDocument}
                                onClearMultipleItem={handleClearMultipleItem}
                                onClearMultipleGroup={handleClearMultipleGroup}
                                onDownloadMultipleGroup={handleDownloadMultipleGroup}
                                onRequestDeleteDialog={
                                  (showStatusManagement && deleteRequest) ? 
                                  ((payload) =>
                                    setDeleteDialog({
                                      open: true,
                                      ...payload,
                                    })) : undefined
                                }
                                clientId={workflow.clientId}
                                onDocumentsAdded={fetchKYCWorkflows}
                                isDisabled={loading || isUpdating}
                              />
                        </div>
                      );
                      })}
                            </div>
                  </div>
                  );
                })() : (
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
                No KYC workflows have been created for this {engagementId ? "engagement" : "company"} yet.
              </p>
              {(engagementId || companyId) && (
                  <KYCDocumentRequestModal
                  engagementId={engagementId}
                  companyId={companyId}
                  clientId={engagement?.clientId || clientId || ''}
                  engagementName={engagement?.title}
                  company={companyProp || engagement?.companyId}   // ✅ FIXED
                  onSuccess={fetchKYCWorkflows}
                  trigger={
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground hover:text-primary-foreground">
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
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              {deleteDialog.type === 'request' 
                ? 'Delete Document Request'
                : deleteDialog.type === 'multipleItem'
                ? 'Delete Document Item'
                : deleteDialog.type === 'multipleGroup'
                ? 'Delete Document Group'
                : 'Delete Document'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === 'request'
                ? 'Are you sure you want to delete this entire document request? This action cannot be undone.'
                : deleteDialog.type === 'multipleGroup'
                ? `Are you sure you want to delete the entire document group "${deleteDialog.documentName}"? This will delete all items in the group. This action cannot be undone.`
                : `Are you sure you want to delete "${deleteDialog.documentName}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFromDialog}
              className="bg-red-600 hover:bg-red-700 text-white hover:text-white"
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
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        <EngagementKYC />
      </div>
    </div>
  );
}
