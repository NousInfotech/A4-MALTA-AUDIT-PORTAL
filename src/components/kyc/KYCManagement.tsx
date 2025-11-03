import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { kycApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
  documentRequests?: {
    _id: string;
    category: string;
    description: string;
    status: string;
    documents: Array<{
      name: string;
      url: string;
      uploadedAt: string;
    }>;
  };
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
  status: 'pending' | 'in-review' | 'completed';
  createdAt: string;
  updatedAt: string;
}

interface KYCManagementProps {
  engagementId?: string;
}

export const KYCManagement = ({ engagementId }: KYCManagementProps) => {
  const [kycWorkflows, setKycWorkflows] = useState<KYCWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedKYC, setSelectedKYC] = useState<KYCWorkflow | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchKYCWorkflows();
  }, [engagementId]);

  const fetchKYCWorkflows = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (engagementId) filters.engagementId = engagementId;
      
      const workflows = await kycApi.getAll(filters);
      setKycWorkflows(workflows);
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
    const matchesSearch = 
      workflow.engagement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workflow.engagement.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (workflow.documentRequests?.category?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === "all" || workflow.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-50">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'in-review':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50">
            <Eye className="h-3 w-3 mr-1" />
            In Review
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleStatusUpdate = async (kycId: string, newStatus: 'pending' | 'in-review' | 'completed') => {
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
      {/* Header */}
      <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-hover rounded-xl flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">KYC Workflows</CardTitle>
                <CardDescription className="text-gray-700">Manage Know Your Client workflows and discussions</CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={fetchKYCWorkflows}
              className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
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
                  className="pl-10 w-full border-gray-200 focus:border-gray-400 rounded-xl"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48 rounded-xl border-gray-200 focus:border-gray-400">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-review">In Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KYC Workflows Table */}
      <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
          <CardTitle className="text-xl font-bold text-gray-900">
            KYC Workflows ({filteredWorkflows.length} results)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="border-gray-200/50">
                  <TableHead className="text-gray-700 font-semibold">Engagement</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Client</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Documents</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Discussions</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Created</TableHead>
                  <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkflows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-600">
                      <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-8 w-8 text-gray-600" />
                      </div>
                      <p className="font-medium">
                        {searchTerm || statusFilter !== "all"
                          ? "No KYC workflows found matching your criteria."
                          : "No KYC workflows found."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredWorkflows.map((workflow) => (
                    <TableRow key={workflow._id} className="border-gray-200/50 hover:bg-gray-50/30 transition-colors duration-200">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900">{workflow.engagement.title}</div>
                          <div className="text-sm text-gray-600">
                            Year End: {format(new Date(workflow.engagement.yearEndDate), "MMM dd, yyyy")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{workflow.clientId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-700">
                            {workflow.documentRequests?.category || 'No category'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {workflow.documentRequests?.documents?.length || 0} documents
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">{workflow.discussions.length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(workflow.status)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-600">
                        {format(new Date(workflow.createdAt), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700 shadow-lg hover:shadow-xl transition-all duration-300"
                                onClick={() => setSelectedKYC(workflow)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Shield className="h-5 w-5" />
                                  KYC Workflow Details
                                </DialogTitle>
                                <DialogDescription>
                                  Complete information about this KYC workflow
                                </DialogDescription>
                              </DialogHeader>
                              {selectedKYC && (
                                <div className="space-y-6">
                                  {/* Engagement Info */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center gap-2">
                                        <Building2 className="h-5 w-5" />
                                        Engagement Information
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <span className="text-sm font-medium text-slate-600">Title:</span>
                                          <p className="text-slate-800">{selectedKYC.engagement.title}</p>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-slate-600">Year End:</span>
                                          <p className="text-slate-800">{format(new Date(selectedKYC.engagement.yearEndDate), "MMM dd, yyyy")}</p>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-slate-600">Client ID:</span>
                                          <p className="text-slate-800">{selectedKYC.clientId}</p>
                                        </div>
                                        <div>
                                          <span className="text-sm font-medium text-slate-600">Status:</span>
                                          <div className="mt-1">{getStatusBadge(selectedKYC.status)}</div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Document Request Info */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Document Request
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                      {selectedKYC.documentRequests ? (
                                        <>
                                          <div>
                                            <span className="text-sm font-medium text-slate-600">Category:</span>
                                            <p className="text-slate-800">{selectedKYC.documentRequests.category}</p>
                                          </div>
                                          <div>
                                            <span className="text-sm font-medium text-slate-600">Description:</span>
                                            <p className="text-slate-800">{selectedKYC.documentRequests.description}</p>
                                          </div>
                                          <div>
                                            <span className="text-sm font-medium text-slate-600">Documents ({selectedKYC.documentRequests.documents?.length || 0}):</span>
                                            <div className="space-y-2 mt-2">
                                              {selectedKYC.documentRequests.documents?.map((doc, index) => (
                                                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                                  <FileText className="h-4 w-4 text-slate-500" />
                                                  <span className="text-sm text-slate-700">{doc.name}</span>
                                                  <span className="text-xs text-slate-500">
                                                    ({format(new Date(doc.uploadedAt), "MMM dd, yyyy")})
                                                  </span>
                                                </div>
                                              )) || (
                                                <p className="text-slate-500 text-sm">No documents uploaded yet</p>
                                              )}
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <p className="text-slate-500">No document request associated with this KYC workflow</p>
                                      )}
                                    </CardContent>
                                  </Card>

                                  {/* Discussions */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5" />
                                        Discussions ({selectedKYC.discussions.length})
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-4">
                                        {selectedKYC.discussions.length === 0 ? (
                                          <p className="text-slate-500 text-center py-4">No discussions yet</p>
                                        ) : (
                                          selectedKYC.discussions.map((discussion) => (
                                            <div key={discussion._id} className="p-4 bg-slate-50 rounded-lg">
                                              <div className="flex items-center gap-2 mb-2">
                                                <Badge variant={discussion.role === 'client' ? 'default' : 'secondary'}>
                                                  {discussion.role}
                                                </Badge>
                                                <span className="text-xs text-slate-500">
                                                  {format(new Date(discussion.createdAt), "MMM dd, yyyy HH:mm")}
                                                </span>
                                              </div>
                                              <p className="text-slate-700">{discussion.message}</p>
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Status Management */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Status Management</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="flex gap-2">
                                        {selectedKYC.status !== 'pending' && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleStatusUpdate(selectedKYC._id, 'pending')}
                                            className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                                          >
                                            <Clock className="h-4 w-4 mr-1" />
                                            Set Pending
                                          </Button>
                                        )}
                                        {selectedKYC.status !== 'in-review' && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleStatusUpdate(selectedKYC._id, 'in-review')}
                                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                          >
                                            <Eye className="h-4 w-4 mr-1" />
                                            Set In Review
                                          </Button>
                                        )}
                                        {selectedKYC.status !== 'completed' && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleStatusUpdate(selectedKYC._id, 'completed')}
                                            className="text-green-600 border-green-600 hover:bg-green-50"
                                          >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Set Completed
                                          </Button>
                                        )}
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
