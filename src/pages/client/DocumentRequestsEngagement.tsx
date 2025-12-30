// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { engagementApi, documentRequestApi } from "@/services/api";
import {
  Search,
  Filter,
  Trash2,
  Plus,
  Eye,
  RefreshCw,
  Play,
  AlertCircle,
  RotateCcw,
  Upload,
  FileText,
  Clock,
  CheckCircle,
  Download,
  Calendar,
  Loader2,
  User,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Shield,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { Link, useSearchParams, useNavigate } from "react-router-dom"; // Import useNavigate
import { EngagementKYC } from "../employee/EngagementKYC";
import { useSidebarStats } from "@/contexts/SidebarStatsContext";
import DocumentRequest from "../../components/document-request/DocumentRequest";

export const DocumentRequestsEngagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refetch: refetchSidebarStats } = useSidebarStats();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate(); // Initialize useNavigate
  const [clientEngagements, setClientEngagements] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kycSearchTerm, setKycSearchTerm] = useState("");
  const [kycDateFilter, setKycDateFilter] = useState("all"); // "all", "recent", "old"
  
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
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type?: 'document' | 'multipleItem' | 'multipleGroup' | 'request';
    documentRequestId?: string;
    documentIndex?: number;
    multipleDocumentId?: string;
    itemIndex?: number;
    documentName?: string;
  }>({ open: false });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Get the active tab from URL parameters
  const activeTab = searchParams.get("tab") || "pending";

  const hasFetched = useRef(false);

  const calculateProgress = (request: any) => {
    let total = 0;
    let completed = 0;

    if (request.documents && request.documents.length > 0) {
      total += request.documents.length;
      completed += request.documents.filter((doc: any) => doc.url).length;
    }

    if (request.multipleDocuments && request.multipleDocuments.length > 0) {
      request.multipleDocuments.forEach((group: any) => {
        const items = group.multiple || group.items || [];
        total += items.length;
        completed += items.filter((item: any) => item.url).length;
      });
    }

    return total === 0 ? 0 : (completed / total) * 100;
  };

  const calculateStatus = (request: any) => {
    const progress = calculateProgress(request);
    if (progress === 100) return 'Completed';
    if (progress > 0) return 'In Progress';
    return 'Pending';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'bg-green-500 text-green-500';
      case 'in progress':
      case 'submitted':
        return 'bg-blue-500 text-blue-500';
      case 'rejected':
      case 'overdue':
        return 'bg-red-500 text-red-500';
      default:
        return 'bg-gray-400 text-gray-400';
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const fetchClientData = useCallback(async (showLoading = true, force = false) => {
    // Prevent fetching if we already have data and not forcing
    // Also check if we have already fetched successfully to avoid repeated fetches on re-renders
    if (!force && (hasFetched.current || (allRequests.length > 0 && clientEngagements.length > 0))) {
      if (showLoading) setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      const allEngagements = await engagementApi.getAll();
      const clientFiltered = allEngagements.filter(
        (e) => e.clientId === user?.id
      );
      setClientEngagements(clientFiltered);

      // Fetch document requests by company
      const promises = clientFiltered.map((e) =>
        documentRequestApi.getByEngagement(e._id).catch(() => [])
      );
      const arrays = await Promise.all(promises);
      const engagementRequests = arrays.flat();
      
      // Also fetch all KYC requests for this client directly
      let kycRequests = [];
      try {
        const allKYCRequests = await documentRequestApi.getAll();
        kycRequests = allKYCRequests.filter((r) => r.category === "kyc" && r.clientId === user?.id);
      } catch (error) {
        console.log("Could not fetch KYC requests directly:", error);
      }
      
      // Combine both sources and remove duplicates
      const allRequests = [...engagementRequests, ...kycRequests];
      const uniqueRequests = allRequests.filter((request, index, self) => 
        index === self.findIndex(r => r._id === request._id)
      );
      
      setAllRequests(uniqueRequests);
      hasFetched.current = true; // Mark as fetched
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch requests",
        variant: "destructive",
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, toast, searchParams]); // Added searchParams to handle ID parameter

  useEffect(() => {
    if (user) fetchClientData(true, false);
  }, [user, fetchClientData]);

  // Handle ID parameter in URL - expand and scroll to specific request
  useEffect(() => {
    const requestId = searchParams.get("id");
    if (requestId && allRequests.length > 0) {
      const request = allRequests.find(r => r._id === requestId);
      if (request) {
        // Expand the request
        setExpandedRows(prev => new Set([...prev, requestId]));
        // Scroll to the request after a short delay to allow rendering
        setTimeout(() => {
          const element = document.getElementById(`request-${requestId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 500);
      }
    }
  }, [searchParams, allRequests]);

  const calculateDocumentRequestStatus = (docRequest: any): string => {
    if (!docRequest.documents || docRequest.documents.length === 0) {
      return 'pending';
    }
    
    const totalDocuments = docRequest.documents.length;
    const completedDocuments = docRequest.documents.filter((doc: any) => 
      doc.url && (doc.status === 'completed' || doc.status === 'uploaded' || doc.status === 'approved')
    ).length;
    
    if (completedDocuments === 0) {
      return 'pending';
    } else if (completedDocuments === totalDocuments) {
      return 'completed';
    } else {
      return 'submitted';
    }
  };

  const updateDocumentRequestStatus = async (documentRequestId: string) => {
    try {
      const docRequest = allRequests.find(r => r._id === documentRequestId);
      if (!docRequest) return;

      const newStatus = calculateDocumentRequestStatus(docRequest);
      
      if (docRequest.status !== newStatus) {
        await documentRequestApi.update(documentRequestId, {
          status: newStatus
        });
        await fetchClientData(false, true);
      }
    } catch (error: any) {
      console.error('Error updating document request status:', error);
    }
  };

  const handleDocumentUpload = async (
    documentRequestId: string,
    documentIndex: number,
    file: File
  ) => {
    try {
      setUploadingDocument({ documentRequestId, documentIndex });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentIndex', String(documentIndex));
      
      await documentRequestApi.uploadSingleDocument(documentRequestId, formData);
      
      await fetchClientData(false, true);
      refetchSidebarStats?.();
      
      setTimeout(async () => {
        try {
          await documentRequestApi.updateDocumentStatus(documentRequestId, documentIndex, 'uploaded');
          await fetchClientData(false, true);
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
    }
  };

  const handleUploadMultiple = async (
    documentRequestId: string,
    multipleDocumentId: string,
    files: FileList,
    itemIndex?: number
  ) => {
    try {
      setUploadingMultiple({ 
        documentRequestId, 
        multipleDocumentId,
        itemIndex 
      });

      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      await documentRequestApi.uploadMultipleDocuments(
        documentRequestId,
        multipleDocumentId,
        formData,
        itemIndex
      );

      await fetchClientData(false, true);
      refetchSidebarStats?.();
      
      toast({
        title: "Files Uploaded",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Error uploading multiple documents:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setUploadingMultiple(null);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setIsUpdating(true);
      toast({
          title: "Download Started",
          description: "Preparing your download, this may take a moment...",
      });
      
      const engagementIds = clientEngagements.map(e => e._id);
      const engagementId = engagementIds[0]; 
      if (!engagementId) throw new Error("No engagement found");

      const { blob, filename } = await documentRequestApi.downloadAll(engagementId);
      
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
      const request = allRequests.find(r => r._id === requestId);
      const engagementId = request?.engagement?._id || request?.engagement;
      if (!engagementId) throw new Error("Engagement ID not found for request");

      toast({
          title: "Download Started",
          description: "Preparing your download...",
      });
      
      const { blob, filename } = await documentRequestApi.downloadAll(engagementId, undefined, undefined, requestId);
      
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

  const handleClearDocument = async (
    documentRequestId: string,
    documentIndex: number,
    documentName: string
  ) => {
    try {
      setIsUpdating(true);
      await documentRequestApi.clearSingleDocument(documentRequestId, documentIndex);
      await fetchClientData(false, true);
      refetchSidebarStats?.();
      toast({
        title: "Document Cleared",
        description: `"${documentName}" file has been cleared. Requirement remains pending.`,
      });
    } catch (error: any) {
      console.error("Error clearing document:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to clear document",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClearMultipleItem = async (
    documentRequestId: string,
    multipleDocumentId: string,
    itemIndex: number,
    itemLabel: string
  ) => {
    try {
      setIsUpdating(true);
      await documentRequestApi.clearMultipleDocumentItem(documentRequestId, multipleDocumentId, itemIndex);
      await fetchClientData(false, true);
      refetchSidebarStats?.();
      toast({
        title: "Document Item Cleared",
        description: `"${itemLabel}" file has been cleared. Requirement remains pending.`,
      });
    } catch (error: any) {
      console.error("Error clearing multiple document item:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to clear document item",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadMultipleGroup = async (
    documentRequestId: string,
    multipleDocumentId: string,
    groupName: string,
    items: any[]
  ) => {
    try {
      setIsUpdating(true);
      const request = allRequests.find(r => r._id === documentRequestId);
      const engagementId = request?.engagement?._id || request?.engagement;
      if (!engagementId) throw new Error("Engagement ID not found");

      toast({
          title: "Download Started",
          description: `Preparing download for "${groupName}"...`,
      });
      
      const { blob, filename } = await documentRequestApi.downloadAll(engagementId, undefined, undefined, documentRequestId, multipleDocumentId);
      
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

  const handleClearMultipleGroup = async (
    documentRequestId: string,
    multipleDocumentId: string,
    groupName: string
  ) => {
    try {
      setIsUpdating(true);
      await documentRequestApi.clearMultipleDocumentGroup(documentRequestId, multipleDocumentId);
      await fetchClientData(false, true);
      toast({
        title: "All Files Cleared",
        description: `All uploaded files in "${groupName}" have been cleared. Requirements remain pending.`,
      });
    } catch (error: any) {
      console.error("Error clearing multiple document group:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to clear files",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteFromDialog = async () => {
    if (!deleteDialog.documentRequestId) return;
    
    try {
      setIsUpdating(true);
      if (deleteDialog.type === 'request') {
        await documentRequestApi.deleteRequest(deleteDialog.documentRequestId);
      } else if (deleteDialog.type === 'multipleItem') {
        if (!deleteDialog.multipleDocumentId || deleteDialog.itemIndex === undefined) return;
        await documentRequestApi.deleteMultipleDocumentItem(
          deleteDialog.documentRequestId,
          deleteDialog.multipleDocumentId,
          deleteDialog.itemIndex
        );
      } else if (deleteDialog.type === 'multipleGroup') {
        if (!deleteDialog.multipleDocumentId) return;
        await documentRequestApi.deleteMultipleDocumentGroup(
          deleteDialog.documentRequestId,
          deleteDialog.multipleDocumentId
        );
      } else {
        if (deleteDialog.documentIndex === undefined) return;
          await documentRequestApi.deleteDocument(
          deleteDialog.documentRequestId,
          deleteDialog.documentIndex
        );
      }
      
      await fetchClientData(false, true);
      toast({
        title: "Deleted",
        description: "Successfully deleted.",
      });
      setDeleteDialog({ open: false });
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter requests for different tabs
  // Pending tab: Show all non-completed requests (excluding KYC)
  const pendingRequests = allRequests.filter((r) => calculateStatus(r) !== "Completed" && r.category !== "kyc");
  
  // Completed tab: Show all 100% completed requests (excluding KYC)
  const completedRequests = allRequests.filter((r) => calculateStatus(r) === "Completed" && r.category !== "kyc");
  
  // PBC tab: Show all PBC requests regardless of status
  const pbcRequests = allRequests.filter((r) => r.category === "pbc");
  
  // KYC tab: Show all KYC requests with search and date filtering
  const allKycRequests = allRequests.filter((r) => r.category === "kyc");
  
  // Filter KYC requests based on search term and date filter
  const kycRequests = allKycRequests.filter((request) => {
    try {
      // Search filter
      const matchesSearch = !kycSearchTerm.trim() || (() => {
        const searchLower = kycSearchTerm.toLowerCase();
        const engagementTitle = getEngagementTitle(request.engagement) || '';
        
        return (
          (request.description?.toLowerCase().includes(searchLower)) ||
          (request.name?.toLowerCase().includes(searchLower)) ||
          (engagementTitle.toLowerCase().includes(searchLower)) ||
          (request.status?.toLowerCase().includes(searchLower))
        );
      })();
      
      // Date filter
      const matchesDateFilter = (() => {
        if (kycDateFilter === "all") return true;
        
        const requestDate = new Date(request.requestedAt || request.createdAt);
        const now = new Date();
        
        // Set time to start of day for accurate date comparisons
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
        const oneWeekAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        // Set request date to start of day for comparison
        const requestDateStart = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
        
        switch (kycDateFilter) {
          case "today":
            return requestDateStart.getTime() === today.getTime();
          case "yesterday":
            return requestDateStart.getTime() === yesterday.getTime();
          case "week":
            return requestDateStart >= oneWeekAgo;
          case "30days":
            return requestDateStart >= thirtyDaysAgo;
          default:
            return true;
        }
      })();
      
      return matchesSearch && matchesDateFilter;
    } catch (error) {
      console.error('Error filtering KYC request:', error, request);
      return true; // Return true to show the request if there's an error
    }
  });

  const getEngagementTitle = (id) =>
    clientEngagements.find((e) => e._id === id)?.title || "Unknown Engagement";


  // Function to handle tab changes and update URL
  const handleTabChange = (newTabValue: string) => {
    setSearchParams({ tab: newTabValue });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
      </div>
    );
  }

  // Safety check for user
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to view document requests.</p>
        </div>
      </div>
    );
  }
  // console.log("allRequests", allRequests);
  // console.log("PBCRequests", pbcRequests);
  // console.log("kycRequests", kycRequests);
  // console.log("pendingRequests", pendingRequests);
  // console.log("completedRequests", completedRequests);
  // console.log("loading state:", loading);
  // console.log("user:", user);

  return (
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-brand-body mb-2 animate-fade-in">
                Document Requests
              </h1>
              <p className="text-gray-700 animate-fade-in-delay">
                View and respond to document requests from your auditors
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-xl"
            >
              <Link to="/client">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
       {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-6 w-6 text-gray-800" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">
                {pendingRequests.length}
              </p>
              <p className="text-sm text-gray-700">Pending Requests</p>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="h-6 w-6 text-gray-800" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">
                {completedRequests.length}
              </p>
              <p className="text-sm text-gray-700">Completed</p>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
            <div className="flex items-center justify-between mb-4">
              <FileText className="h-6 w-6 text-gray-800" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">
                {completedRequests.reduce(
                  (acc, req) => acc + (req.documents?.length || 0),
                  0
                )}
              </p>
              <p className="text-sm text-gray-700">Files Uploaded</p>
            </div>
          </div>
        </div> */}

         <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          {" "}
          {/* Add onValueChange */}
          <TabsList className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-1">
            <TabsTrigger
              value="pending"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Completed ({completedRequests.length})
            </TabsTrigger>
            {/* <TabsTrigger
              value="pbc"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              PBC ({pbcRequests.length})
            </TabsTrigger> */}
            {/* <TabsTrigger
              value="kyc"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              KYC ({kycRequests.length})
            </TabsTrigger> */}
          </TabsList>
          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  All caught up!
                </h3>
                <p className="text-gray-600">
                  You have no pending document requests at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map((request) => {
                  const progress = calculateProgress(request);
                  const status = calculateStatus(request);
                  const statusColor = getStatusColor(status);

                  return (
                    <Card key={request._id} id={`request-${request._id}`} className="overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl bg-white/60 backdrop-blur-md">
                      <div 
                        className="cursor-pointer"
                        onClick={() => toggleRow(request._id)}
                      >
                        <div className="p-4 flex items-center gap-4">
                          <div className={`w-1 self-stretch rounded-full ${statusColor}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 truncate uppercase tracking-wider text-[10px]">
                                {request.category}
                              </span>
                              <Badge variant="outline" className={`${statusColor} border-0 bg-opacity-10 text-[10px] h-5 px-1.5`}>
                                {status}
                              </Badge>
                            </div>
                            <h3 className="text-sm font-medium text-gray-700 truncate line-clamp-1">
                              {request.description || request.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="hidden sm:flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${statusColor}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 w-8 text-right">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadRequest(request._id);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <div className="h-8 w-8 flex items-center justify-center">
                                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedRows.has(request._id) ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedRows.has(request._id) && (
                        <CardContent className="border-t border-gray-100 bg-gray-50/30 p-4">
                          <DocumentRequest
                            request={request}
                            uploadingSingle={uploadingDocument}
                            uploadingMultiple={uploadingMultiple}
                            onUploadSingle={handleDocumentUpload}
                            onUploadMultiple={handleUploadMultiple}
                            onRequestDeleteDialog={(payload) => setDeleteDialog({ ...payload, open: true })}
                            onClearDocument={handleClearDocument}
                            onClearMultipleItem={handleClearMultipleItem}
                            onClearMultipleGroup={handleClearMultipleGroup}
                            onDownloadMultipleGroup={handleDownloadMultipleGroup}
                            isDisabled={isUpdating}
                            isClientView={true}
                          />
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-4">
            {completedRequests.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No completed requests yet
                </h3>
                <p className="text-gray-600">
                  Your completed document submissions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedRequests.map((request) => {
                  const progress = calculateProgress(request);
                  const status = calculateStatus(request);
                  const statusColor = getStatusColor(status);

                  return (
                    <Card key={request._id} id={`request-${request._id}`} className="overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl bg-white/60 backdrop-blur-md">
                      <div 
                        className="cursor-pointer"
                        onClick={() => toggleRow(request._id)}
                      >
                        <div className="p-4 flex items-center gap-4">
                          <div className={`w-1 self-stretch rounded-full ${statusColor}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 truncate uppercase tracking-wider text-[10px]">
                                {request.category}
                              </span>
                              <Badge variant="outline" className={`${statusColor} border-0 bg-opacity-10 text-[10px] h-5 px-1.5`}>
                                {status}
                              </Badge>
                            </div>
                            <h3 className="text-sm font-medium text-gray-700 truncate line-clamp-1">
                              {request.description || request.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="hidden sm:flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${statusColor}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 w-8 text-right">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadRequest(request._id);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <div className="h-8 w-8 flex items-center justify-center">
                                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedRows.has(request._id) ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedRows.has(request._id) && (
                        <CardContent className="border-t border-gray-100 bg-gray-50/30 p-4">
                          <DocumentRequest
                            request={request}
                            uploadingSingle={uploadingDocument}
                            uploadingMultiple={uploadingMultiple}
                            onUploadSingle={handleDocumentUpload}
                            onUploadMultiple={handleUploadMultiple}
                            onRequestDeleteDialog={(payload) => setDeleteDialog({ ...payload, open: true })}
                            onClearDocument={handleClearDocument}
                            onClearMultipleItem={handleClearMultipleItem}
                            onClearMultipleGroup={handleClearMultipleGroup}
                            onDownloadMultipleGroup={handleDownloadMultipleGroup}
                            isDisabled={isUpdating}
                            isClientView={true}
                          />
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="pbc" className="space-y-4">
            {pbcRequests.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No PBC requests found
                </h3>
                <p className="text-gray-600">
                  There are no PBC document requests at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pbcRequests.map((request) => {
                  const progress = calculateProgress(request);
                  const status = calculateStatus(request);
                  const statusColor = getStatusColor(status);

                  return (
                    <Card key={request._id} id={`request-${request._id}`} className="overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl bg-white/60 backdrop-blur-md">
                      <div 
                        className="cursor-pointer"
                        onClick={() => toggleRow(request._id)}
                      >
                        <div className="p-4 flex items-center gap-4">
                          <div className={`w-1 self-stretch rounded-full ${statusColor}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 truncate uppercase tracking-wider text-[10px]">
                                {request.category}
                              </span>
                              <Badge variant="outline" className={`${statusColor} border-0 bg-opacity-10 text-[10px] h-5 px-1.5`}>
                                {status}
                              </Badge>
                            </div>
                            <h3 className="text-sm font-medium text-gray-700 truncate line-clamp-1">
                              {request.description || request.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="hidden sm:flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${statusColor}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 w-8 text-right">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadRequest(request._id);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <div className="h-8 w-8 flex items-center justify-center">
                                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedRows.has(request._id) ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedRows.has(request._id) && (
                        <CardContent className="border-t border-gray-100 bg-gray-50/30 p-4">
                          <DocumentRequest
                            request={request}
                            uploadingSingle={uploadingDocument}
                            uploadingMultiple={uploadingMultiple}
                            onUploadSingle={handleDocumentUpload}
                            onUploadMultiple={handleUploadMultiple}
                            onRequestDeleteDialog={(payload) => setDeleteDialog({ ...payload, open: true })}
                            onClearDocument={handleClearDocument}
                            onClearMultipleItem={handleClearMultipleItem}
                            onClearMultipleGroup={handleClearMultipleGroup}
                            onDownloadMultipleGroup={handleDownloadMultipleGroup}
                            isDisabled={isUpdating}
                            isClientView={true}
                          />
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="kyc" className="space-y-6">
            <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      placeholder="Search KYC document requests..."
                      value={kycSearchTerm}
                      onChange={(e) => setKycSearchTerm(e.target.value)}
                      className="pl-10 w-full border-gray-300 focus:border-gray-500 rounded-xl"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={kycDateFilter} onValueChange={setKycDateFilter}>
                    <SelectTrigger className="w-32 border-gray-300 focus:border-gray-500 rounded-xl">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="week">Past Week</SelectItem>
                      <SelectItem value="30days">Past 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {kycRequests.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Search className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No matching KYC requests found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {kycRequests.map((request) => {
                  const progress = calculateProgress(request);
                  const status = calculateStatus(request);
                  const statusColor = getStatusColor(status);

                  return (
                    <Card key={request._id} id={`request-${request._id}`} className="overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl bg-white/60 backdrop-blur-md">
                      <div 
                        className="cursor-pointer"
                        onClick={() => toggleRow(request._id)}
                      >
                        <div className="p-4 flex items-center gap-4">
                          <div className={`w-1 self-stretch rounded-full ${statusColor}`} />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 truncate uppercase tracking-wider text-[10px]">
                                {request.category}
                              </span>
                              <Badge variant="outline" className={`${statusColor} border-0 bg-opacity-10 text-[10px] h-5 px-1.5`}>
                                {status}
                              </Badge>
                            </div>
                            <h3 className="text-sm font-medium text-gray-700 truncate line-clamp-1">
                              {request.description || request.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="hidden sm:flex flex-col items-end gap-1.5">
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full transition-all duration-500 ${statusColor}`}
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-medium text-gray-500 w-8 text-right">
                                  {Math.round(progress)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadRequest(request._id);
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <div className="h-8 w-8 flex items-center justify-center">
                                  <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedRows.has(request._id) ? 'rotate-90' : ''}`} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {expandedRows.has(request._id) && (
                        <CardContent className="border-t border-gray-100 bg-gray-50/30 p-4">
                          <DocumentRequest
                            request={request}
                            uploadingSingle={uploadingDocument}
                            uploadingMultiple={uploadingMultiple}
                            onUploadSingle={handleDocumentUpload}
                            onUploadMultiple={handleUploadMultiple}
                            onRequestDeleteDialog={(payload) => setDeleteDialog({ ...payload, open: true })}
                            onClearDocument={handleClearDocument}
                            onClearMultipleItem={handleClearMultipleItem}
                            onClearMultipleGroup={handleClearMultipleGroup}
                            onDownloadMultipleGroup={handleDownloadMultipleGroup}
                            isDisabled={isUpdating}
                            isClientView={true}
                          />
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Engagement KYC Section */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Engagement KYC</h2>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Workflows
                    </Badge>
                </div>
                
                {(() => {
                    const engagementId = searchParams.get("engagementId");
                    const activeEngagement = engagementId 
                        ? clientEngagements.find(e => e._id === engagementId)
                        : clientEngagements[0];
                    
                    if (activeEngagement) {
                        return (
                            <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-3xl p-1 shadow-xl">
                                <EngagementKYC 
                                    engagementId={activeEngagement._id}
                                    companyId={activeEngagement.companyId} 
                                    clientId={user?.id}
                                    showStatusManagement={false}
                                    deleteRequest={false}
                                    isClientView={true}
                                />
                            </div>
                        );
                    } else {
                        return (
                            <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Shield className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-gray-500">No active engagement found to display KYC workflows.</p>
                            </div>
                        );
                    }
                })()}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent className="rounded-2xl border-white/30 bg-white/80 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-600">
              {deleteDialog.type === 'request' 
                ? "Are you sure you want to delete this entire document request? This action cannot be undone."
                : `Are you sure you want to remove the uploaded file ${deleteDialog.documentName ? `"${deleteDialog.documentName}"` : ""}? 
                   This will clear the file but keep the request slot.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-gray-200 hover:bg-gray-100">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteFromDialog();
              }}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
