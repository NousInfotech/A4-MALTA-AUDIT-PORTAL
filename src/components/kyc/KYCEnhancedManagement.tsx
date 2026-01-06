import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Eye,
  MessageSquare,
  Calendar,
  User,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  FileText,
  Plus,
  Send,
  Download,
  Upload,
  FileEdit,
  FileUp,
  RotateCcw,
  Play,
  X,
  Trash2
} from "lucide-react";
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
import { kycApi, documentRequestApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { KYCDocumentRequestModal } from "./KYCDocumentRequestModal";
import { KYCClientDocumentUpload } from "./KYCClientDocumentUpload";
import { AddDocumentRequestModal } from "./AddDocumentRequestModal";
import { supabase } from "@/integrations/supabase/client";

interface KYCWorkflow {
  _id: string;
  engagement?: {
    _id: string;
    title: string;
    yearEndDate: string;
    clientId: string;
  };
  company?: {
    _id: string;
    name: string;
    registrationNumber: string;
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

interface KYCEnhancedManagementProps {
  engagementId?: string;
  userRole?: 'auditor' | 'client';
}

export const KYCEnhancedManagement = ({ 
  engagementId: propEngagementId, 
  userRole = 'auditor' 
}: KYCEnhancedManagementProps) => {
  const { engagementId: urlEngagementId } = useParams<{ engagementId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Use URL parameter if available, otherwise use prop
  const engagementId = urlEngagementId || propEngagementId;
  const [kycWorkflows, setKycWorkflows] = useState<KYCWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedKYC, setSelectedKYC] = useState<KYCWorkflow | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    documentRequestId?: string;
    documentIndex?: number;
    documentName?: string;
  }>({ open: false });
  const { toast } = useToast();

  useEffect(() => {
    fetchKYCWorkflows();
  }, [engagementId]);

  // Fetch client name when selectedKYC changes
  useEffect(() => {
    if (selectedKYC?.clientId && !clientNames[selectedKYC.clientId]) {
      fetchClientNames([selectedKYC.clientId]);
    }
  }, [selectedKYC]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDetails) {
        setShowDetails(false);
      }
    };

    if (showDetails) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showDetails]);

  // Transform nested documentRequests structure to flat structure
  const transformKYCData = (kyc: any): KYCWorkflow => {
    if (!kyc) return kyc;
    
    // Transform documentRequests if they exist and have nested structure
    if (kyc.documentRequests && Array.isArray(kyc.documentRequests)) {
      const transformedDocumentRequests = kyc.documentRequests.map((dr: any) => {
        // If it's already in flat format, return as is
        if (dr._id && dr.name) {
          return dr;
        }
        // If it's nested (documentRequest.person structure), extract documentRequest
        if (dr.documentRequest) {
          return {
            _id: dr.documentRequest._id,
            name: dr.documentRequest.name || dr.documentRequest.description || 'Untitled Document Request',
            category: dr.documentRequest.category || 'kyc',
            description: dr.documentRequest.description || '',
            status: dr.documentRequest.status || 'pending',
            documents: dr.documentRequest.documents || [],
            person: dr.person // Keep person info if needed
          };
        }
        return dr;
      });
      
      return {
        ...kyc,
        documentRequests: transformedDocumentRequests
      };
    }
    
    return kyc;
  };

  // Fetch client names for all unique client IDs
  const fetchClientNames = async (clientIds: string[]) => {
    const uniqueClientIds = [...new Set(clientIds)].filter(Boolean);
    if (uniqueClientIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, company_name')
        .in('user_id', uniqueClientIds);

      if (error) {
        console.error('Error fetching client names:', error);
        return;
      }

      const namesMap: Record<string, string> = {};
      data?.forEach((profile: any) => {
        // Prefer company_name, fallback to name
        const clientName = profile.company_name || profile.name || 'Unknown Client';
        namesMap[profile.user_id] = clientName;
      });

      setClientNames(prev => ({ ...prev, ...namesMap }));
    } catch (error) {
      console.error('Error fetching client names:', error);
    }
  };

  const fetchKYCWorkflows = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (engagementId) filters.engagementId = engagementId;
      
      const workflows = userRole === 'client' 
        ? await kycApi.getMyKYCs()
        : await kycApi.getAll(filters);
      
      // Transform the workflows to handle nested documentRequests structure
      const transformedWorkflows = Array.isArray(workflows) 
        ? workflows.map(transformKYCData)
        : [transformKYCData(workflows)];
      
      setKycWorkflows(transformedWorkflows);

      // Fetch client names for all workflows
      const clientIds = transformedWorkflows
        .map(w => w.clientId)
        .filter(Boolean);
      await fetchClientNames(clientIds);
    } catch (error: any) {
      console.error('Error fetching KYC workflows:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch KYC workflows",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkflows = kycWorkflows.filter(workflow => {
    // Only show Engagement KYCs
    if (!workflow.engagement) return false;

    const title = workflow.engagement?.title || "Untitled";
    const matchesSearch = 
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workflow.documentRequests?.[0]?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === "all" || workflow.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
      if (selectedKYC) {
        const updatedKYC = await kycApi.getById(selectedKYC._id);
        // Transform the data to handle nested documentRequests structure
        const transformedKYC = transformKYCData(updatedKYC);
        setSelectedKYC(transformedKYC);
      }
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedKYC) return;
    
    setSendingMessage(true);
    try {
      await kycApi.addDiscussion(selectedKYC._id, {
        message: newMessage.trim(),
        documentRef: null
      });
      
      // Refresh discussions
      const updatedKYC = await kycApi.getById(selectedKYC._id);
      setSelectedKYC(updatedKYC);
      setNewMessage('');
      
      toast({
        title: "Message Sent",
        description: "Your message has been sent",
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleViewDetails = async (kyc: KYCWorkflow) => {
    try {
      const fullKYC = await kycApi.getById(kyc._id);
      // Transform the data to handle nested documentRequests structure
      const transformedKYC = transformKYCData(fullKYC);
      setSelectedKYC(transformedKYC);
      setShowDetails(true);
      
      // Ensure client name is fetched for this workflow
      if (transformedKYC.clientId && !clientNames[transformedKYC.clientId]) {
        await fetchClientNames([transformedKYC.clientId]);
      }
    } catch (error: any) {
      console.error('Error fetching KYC details:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC details",
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
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* {!engagementId && (
        <Card className="border-amber-200 bg-brand-body">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-amber-800 font-medium">No Engagement Selected</p>
                <p className="text-amber-700 text-sm">
                  Please navigate to a specific engagement to manage KYC workflows. 
                  Use the format: /kyc/[engagement-id]
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )} */}
      {/* Header */}
      <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-hover rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {userRole === 'client' ? 'My KYC Workflows' : 'KYC Management'}
                  {engagementId && (
                    <span className="text-lg font-normal text-gray-600 ml-2">
                      - Engagement {engagementId}
                    </span>
                  )}
                </CardTitle>
                <CardDescription className="text-gray-700">
                  {userRole === 'client' 
                    ? 'View and complete your KYC document requirements'
                    : 'Manage Know Your Client workflows and document requests'
                  }
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {userRole === 'auditor' && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/employee/kyc/library')}
                  className="border-gray-300 hover:bg-gray-100 text-gray-700"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  KYC Library
                </Button>
              )}
            </div>
            {/* <div className="flex items-center gap-2">
              {userRole === 'auditor' && engagementId && (
                <KYCDocumentRequestModal
                  engagementId={engagementId}
                  clientId={user?.id || ''}
                  engagementName={`Engagement ${engagementId}`}
                  onSuccess={fetchKYCWorkflows}
                  trigger={
                    <Button className="bg-brand-hover hover:bg-brand-sidebar text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create KYC
                    </Button>
                  }
                />
              )}
              {userRole === 'auditor' && !engagementId && (
                <Button 
                  disabled 
                  className="bg-gray-400 text-white cursor-not-allowed"
                  title="Engagement ID is required to create KYC workflow"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create KYC
                </Button>
              )}
              <Button
                variant="outline"
                onClick={fetchKYCWorkflows}
                className="border-gray-300 hover:bg-gray-100 text-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div> */}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Search by engagement title, client ID, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border-gray-300 focus:border-gray-500"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48 border-gray-300 focus:border-gray-500">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="in-review">In Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="reopened">Reopened</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KYC Workflows */}
      {filteredWorkflows.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No KYC Workflows</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== "all"
                ? "No KYC workflows found matching your criteria."
                : "No KYC workflows found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow._id} className="bg-white border border-gray-200 rounded-2xl shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-brand-hover rounded-2xl flex items-center justify-center shadow-lg">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">{workflow.engagement?.title || workflow.company?.name || "Untitled Workflow"}</CardTitle>
                      <p className="text-sm text-gray-700">
                        Client: {clientNames[workflow.clientId] || workflow.clientId} • Created: {format(new Date(workflow.createdAt), "MMM dd, yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(workflow.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(workflow)}
                      className="border-gray-300 hover:bg-gray-100 text-gray-700"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Engagement Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>Year End: {workflow.engagement?.yearEndDate ? format(new Date(workflow.engagement.yearEndDate), "MMM dd, yyyy") : "N/A"}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <Building2 className="h-4 w-4 text-gray-500 mt-0.5" />
                        <div className="flex flex-col">
                          {clientNames[workflow.clientId] ? (
                            <>
                              <span className="font-medium text-gray-900">{clientNames[workflow.clientId]}</span>
                              <span className="text-gray-500 text-xs">Client ID: {workflow.clientId}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-gray-500 text-xs">Client ID: {workflow.clientId}</span>
                              {workflow.clientId && (
                                <span className="text-gray-400 text-xs italic mt-0.5">Loading name...</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Documents</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Total</span>
                        <span>{workflow.documentRequests?.reduce((total, dr) => total + (dr.documents?.length || 0), 0) || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Uploaded</span>
                        <span>{workflow.documentRequests?.reduce((total, dr) => 
                          total + (dr.documents?.filter(d => d.status === 'uploaded' || d.status === 'approved').length || 0), 0) || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>In Review</span>
                        <span>{workflow.documentRequests?.reduce((total, dr) => 
                          total + (dr.documents?.filter(d => d.status === 'in-review').length || 0), 0) || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Communication</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Discussions</span>
                        <span>{workflow.discussions?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Last Updated</span>
                        <span>{format(new Date(workflow.updatedAt), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* KYC Details Modal */}
      {showDetails && selectedKYC && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDetails(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button in top-right corner */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(false)}
              className="absolute top-4 right-4 h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 pr-8">
                <h2 className="text-2xl font-bold text-gray-900">KYC Workflow Details</h2>
              </div>
              
              <div className="space-y-6">
                {/* Status Management */}
                {userRole === 'auditor' && (
                  <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-gray-900">Status Management</CardTitle>
                        {getStatusBadge(selectedKYC.status)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        {selectedKYC.status !== 'in-review' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(selectedKYC._id, 'in-review')}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            In Review
                          </Button>
                        )}
                        {selectedKYC.status !== 'submitted' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(selectedKYC._id, 'submitted')}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700"
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Submitted
                          </Button>
                        )}
                        {selectedKYC.status !== 'completed' && (
                          <Button
                            size="sm"
                            className="bg-brand-hover hover:bg-brand-sidebar text-white"
                            onClick={() => handleStatusUpdate(selectedKYC._id, 'completed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Completed
                          </Button>
                        )}
                        {selectedKYC.status === 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReopenKYC(selectedKYC._id)}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reopen KYC
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Document Requests */}
                  <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
                    <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-900">Document Requests</CardTitle>
                      {userRole === 'auditor' && (
                        <AddDocumentRequestModal
                          kycId={selectedKYC._id}
                          engagementId={selectedKYC.engagement?._id}
                          companyId={selectedKYC.company?._id}
                          clientId={selectedKYC.clientId}
                          onSuccess={async () => {
                            // Refresh the workflows list
                            await fetchKYCWorkflows();
                            // Fetch the full updated KYC details
                            try {
                              const updatedKYC = await kycApi.getById(selectedKYC._id);
                              // Transform the data to handle nested documentRequests structure
                              const transformedKYC = transformKYCData(updatedKYC);
                              setSelectedKYC(transformedKYC);
                            } catch (error: any) {
                              console.error('Error refreshing KYC details:', error);
                              toast({
                                title: "Warning",
                                description: "Document request added, but failed to refresh details. Please refresh the page.",
                                variant: "default",
                              });
                            }
                          }}
                          trigger={
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                              <Plus className="h-4 w-4 mr-2" />
                              Add Document Request
                            </Button>
                          }
                        />
                      )}
                    </div>
                    </CardHeader>
                    <CardContent>
                    {selectedKYC.documentRequests && selectedKYC.documentRequests.length > 0 ? (
                      selectedKYC.documentRequests.map((docRequest, index) => (
                        <div key={index} className="mb-6 last:mb-0">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900">{docRequest.name}</h4>
                            <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
                              {docRequest.status}
                            </Badge>
                          </div>
                          
                          {userRole === 'client' ? (
                            <KYCClientDocumentUpload
                              documentRequestId={docRequest._id}
                              onStatusChange={(status) => {
                                // Update local state if needed
                              }}
                            />
                          ) : (
                            <div className="space-y-3">
                              {docRequest.documents?.map((doc, docIndex) => (
                                <div key={docIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    {doc.type === 'template' ? (
                                      <FileEdit className="h-5 w-5 text-gray-600" />
                                    ) : (
                                      <FileUp className="h-5 w-5 text-gray-600" />
                                    )}
                                    <div>
                                      <p className="font-medium text-gray-900">{doc.name}</p>
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
                                  <div className="flex items-center gap-2">
                                    {doc.template?.url && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={async () => {
                                          try {
                                            const downloadUrl = `/api/document-requests/template/download?templateUrl=${encodeURIComponent(doc.template.url)}`;
                                            
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
                                            const url = window.URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `${doc.name}_template`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            window.URL.revokeObjectURL(url);
                                          } catch (error) {
                                            console.error('Download error:', error);
                                            window.open(doc.template.url, '_blank');
                                          }
                                        }}
                                        className="border-blue-300 hover:bg-blue-50 text-blue-700"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {doc.url && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => window.open(doc.url, '_blank')}
                                          className="border-blue-300 hover:bg-blue-50 text-blue-700"
                                          title="View Document"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(doc.url);
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
                                          className="border-green-300 hover:bg-green-50 text-green-700"
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
                                          className="border-red-300 hover:bg-red-50 text-red-700"
                                          title="Delete Document"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <FileText className="h-8 w-8 text-gray-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Document Requests</h3>
                        <p className="text-gray-600 mb-4">
                          {userRole === 'auditor' 
                            ? "No document requests have been created yet. Click 'Add Document Request' to get started."
                            : "No document requests have been created yet."
                          }
                        </p>
                      </div>
                    )}
                    </CardContent>
                  </Card>

                {/* Discussions - COMMENTED OUT */}
                {/*
                <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Discussions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedKYC.discussions?.length > 0 ? (
                        selectedKYC.discussions.map((discussion) => (
                          <div key={discussion._id} className={`p-4 rounded-xl ${
                            discussion.role === 'auditor' 
                              ? 'bg-gray-100 border-l-4 border-gray-800' 
                              : 'bg-white border-l-4 border-gray-500'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={discussion.role === 'auditor' ? 'default' : 'secondary'} className={discussion.role === 'auditor' ? 'bg-brand-hover text-white' : 'bg-gray-200 text-gray-800'}>
                                {discussion.role === 'auditor' ? 'Auditor' : 'Client'}
                              </Badge>
                              <span className="text-sm text-gray-700">
                                {format(new Date(discussion.createdAt), "MMM dd, yyyy HH:mm")}
                              </span>
                            </div>
                            <p className="text-gray-900">{discussion.message}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">No discussions yet.</p>
                      )}
                      
                      <div className="border-t pt-4">
                        <div className="space-y-3">
                          <Label htmlFor="newMessage" className="text-gray-800">
                            {userRole === 'auditor' ? 'Send Message to Client' : 'Send Message to Auditor'}
                          </Label>
                          <Textarea
                            id="newMessage"
                            placeholder="Type your message here..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={3}
                            className="border-2 border-gray-200 focus:border-gray-400 rounded-xl"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sendingMessage}
                            className="bg-brand-hover hover:bg-brand-sidebar text-white"
                          >
                            {sendingMessage ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-2" />
                                Send Message
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                */}
              </div>
            </div>
          </div>
        </div>
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
};
