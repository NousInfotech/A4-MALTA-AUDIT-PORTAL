import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  ArrowLeft,
  Briefcase
} from "lucide-react";
import { kycApi, documentRequestApi, engagementApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { KYCDocumentRequestModal } from "@/components/kyc/KYCDocumentRequestModal";
import { KYCClientDocumentUpload } from "@/components/kyc/KYCClientDocumentUpload";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedKYC, setSelectedKYC] = useState<KYCWorkflow | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
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

  const fetchKYCWorkflows = async () => {
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

  const filteredWorkflows = kycWorkflows.filter(workflow => {
    const matchesSearch = 
      workflow.engagement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      setSelectedKYC(fullKYC);
      setShowDetails(true);
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
          <p className="text-xs text-slate-500 mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
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
              <KYCDocumentRequestModal
                engagementId={engagementId || ''}
                clientId={engagement?.clientId || ''}
                onSuccess={fetchKYCWorkflows}
                trigger={
                  <Button className="bg-gray-800 hover:bg-gray-900 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Create KYC
                  </Button>
                }
              />
              <Button
                variant="outline"
                onClick={fetchKYCWorkflows}
                className="border-gray-300 hover:bg-gray-100 text-gray-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Search by client ID or category..."
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

      {/* Engagement Info */}
      {engagement && (
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{engagement.title}</h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <span>Client: {engagement.clientId}</span>
                  <span>Year End: {format(new Date(engagement.yearEndDate), "MMM dd, yyyy")}</span>
                  <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
                    {engagement.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KYC Workflows */}
      {filteredWorkflows.length === 0 ? (
        <Card className="text-center py-12 bg-white border border-gray-200 rounded-2xl shadow-lg">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No KYC Workflows</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== "all"
                ? "No KYC workflows found matching your criteria."
                : "No KYC workflows have been created for this engagement yet."}
            </p>
            <KYCDocumentRequestModal
              engagementId={engagementId || ''}
              clientId={engagement?.clientId || ''}
              onSuccess={fetchKYCWorkflows}
              trigger={
                <Button className="bg-gray-800 hover:bg-gray-900 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First KYC Workflow
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredWorkflows.map((workflow) => (
            <Card key={workflow._id} className="bg-white border border-gray-200 rounded-2xl shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center shadow-lg">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">KYC Workflow</CardTitle>
                      <p className="text-sm text-gray-700">
                        Client: {workflow.clientId} • Created: {format(new Date(workflow.createdAt), "MMM dd, yyyy")}
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
                        <span>Year End: {format(new Date(workflow.engagement.yearEndDate), "MMM dd, yyyy")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span>Client ID: {workflow.clientId}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Documents</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Total</span>
                        <span>{workflow.documentRequests?.[0]?.documents?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Uploaded</span>
                        <span>{workflow.documentRequests?.[0]?.documents?.filter(d => d.status === 'uploaded' || d.status === 'approved').length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>In Review</span>
                        <span>{workflow.documentRequests?.[0]?.documents?.filter(d => d.status === 'in-review').length || 0}</span>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">KYC Workflow Details</h2>
                <Button 
                  variant="outline" 
                  onClick={() => setShowDetails(false)}
                  className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                >
                  Close
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Status Management */}
                <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Status Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(selectedKYC.status)}
                      <div className="flex gap-2">
                        {selectedKYC.status !== 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(selectedKYC._id, 'active')}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Set Active
                          </Button>
                        )}
                        {selectedKYC.status !== 'in-review' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(selectedKYC._id, 'in-review')}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Set In Review
                          </Button>
                        )}
                        {selectedKYC.status !== 'completed' && (
                          <Button
                            size="sm"
                            className="bg-gray-800 hover:bg-gray-900 text-white"
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
                    </div>
                  </CardContent>
                </Card>

                {/* Document Requests */}
                {selectedKYC.documentRequests && selectedKYC.documentRequests.length > 0 && (
                  <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Document Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedKYC.documentRequests.map((docRequest, index) => (
                        <div key={index} className="mb-6 last:mb-0">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-gray-900">{docRequest.name}</h4>
                            <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
                              {docRequest.status}
                            </Badge>
                          </div>
                          
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
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {doc.url && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(doc.url, '_blank')}
                                      className="border-gray-300 hover:bg-gray-100 text-gray-700"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Discussions - COMMENTED OUT */}
                {/*
                <Card className="border-0 shadow-lg bg-white/80 border border-white/50 rounded-2xl">
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
                              : 'bg-white/80 backdrop-blur-sm border-l-4 border-gray-500'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={discussion.role === 'auditor' ? 'default' : 'secondary'} className={discussion.role === 'auditor' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'}>
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
                          <Label htmlFor="newMessage" className="text-gray-800">Send Message to Client</Label>
                          <Textarea
                            id="newMessage"
                            placeholder="Type your message here..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={3}
                            className="border-2 border-gray-200 focus:border-gray-400 rounded-xl bg-white/80 backdrop-blur-sm"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim() || sendingMessage}
                            className="bg-gray-800 hover:bg-gray-900 text-white"
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
