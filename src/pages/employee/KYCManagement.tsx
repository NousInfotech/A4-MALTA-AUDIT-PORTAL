import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Shield, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Eye,
  Calendar,
  User,
  Building2,
  Search,
  Filter,
  Download,
  MessageSquare,
  Send,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { kycApi } from "@/services/api";

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
  documentRequests: {
    _id: string;
    name: string;
    category: string;
    description: string;
    status: string;
    documents: Array<{
      name: string;
      url: string;
      uploadedAt: string;
      status: string;
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

export function KYCManagement() {
  const { toast } = useToast();
  const [kycWorkflows, setKycWorkflows] = useState<KYCWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKYC, setSelectedKYC] = useState<KYCWorkflow | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchAllKYCs();
  }, []);

  const fetchAllKYCs = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching all KYC workflows...');
      
      const kycs = await kycApi.getAll();
      console.log('✅ KYC workflows fetched:', kycs);
      
      setKycWorkflows(kycs);
    } catch (error: any) {
      console.error('❌ Failed to fetch KYC workflows:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC workflows",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (kyc: KYCWorkflow) => {
    try {
      // Fetch full KYC details including discussions
      const fullKYC = await kycApi.getById(kyc._id);
      setSelectedKYC(fullKYC);
      setShowDetails(true);
    } catch (error: any) {
      console.error('❌ Failed to fetch KYC details:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC details",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (kycId: string, newStatus: string) => {
    try {
      await kycApi.updateStatus(kycId, newStatus);
      
      // Update local state
      setKycWorkflows(prev => 
        prev.map(kyc => 
          kyc._id === kycId 
            ? { ...kyc, status: newStatus as any, updatedAt: new Date().toISOString() }
            : kyc
        )
      );
      
      if (selectedKYC?._id === kycId) {
        setSelectedKYC(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
      
      toast({
        title: "Status Updated",
        description: `KYC status updated to ${newStatus}`,
      });
    } catch (error: any) {
      console.error('❌ Failed to update status:', error);
      toast({
        title: "Error",
        description: "Failed to update KYC status",
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
        description: "Your message has been sent to the client",
      });
    } catch (error: any) {
      console.error('❌ Failed to send message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredKYCs = kycWorkflows.filter(kyc => {
    const matchesSearch = kyc.engagement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         kyc.clientId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || kyc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-200 text-gray-800 border-gray-300';
      case 'in-review':
        return 'bg-gray-300 text-gray-800 border-gray-400';
      case 'completed':
        return 'bg-gray-800 text-white border-gray-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in-review':
        return <Eye className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading KYC workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-xl">
              <Shield className="h-8 w-8 text-gray-800" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">KYC Management</h1>
              <p className="text-gray-700">Manage Know Your Client workflows</p>
            </div>
          </div>
          <Button 
            onClick={fetchAllKYCs} 
            variant="outline"
            className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by engagement or client ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-2 border-gray-200 focus:border-gray-400 rounded-xl bg-white/80 backdrop-blur-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border-2 border-gray-200 focus:border-gray-400 rounded-xl text-sm bg-white/80 backdrop-blur-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-review">In Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {filteredKYCs.length === 0 ? (
        <Card className="text-center py-12 border-0 shadow-lg bg-white/80 border border-white/50 rounded-2xl hover:bg-white/70 shadow-lg shadow-gray-300/30">
          <CardContent>
            <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-gray-800" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No KYC Workflows</h3>
            <p className="text-gray-700">
              {searchTerm || statusFilter !== 'all' 
                ? 'No KYC workflows match your search criteria.'
                : 'No KYC workflows have been created yet.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredKYCs.map((kyc) => (
            <Card key={kyc._id} className="hover:shadow-xl transition-all duration-300 bg-white/80 border border-white/50 rounded-2xl hover:bg-white/70 shadow-lg shadow-gray-300/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900">{kyc.engagement.title}</CardTitle>
                      <p className="text-sm text-gray-700">
                        Client: {kyc.clientId} • Created: {new Date(kyc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getStatusColor(kyc.status)} flex items-center gap-1`}>
                      {getStatusIcon(kyc.status)}
                      {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1).replace('-', ' ')}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(kyc)}
                      className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
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
                        <span>Year End: {new Date(kyc.engagement.yearEndDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span>Client ID: {kyc.clientId}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Documents</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Required</span>
                        <span>{kyc.documentRequests?.documents?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Uploaded</span>
                        <span>{kyc.documentRequests?.documents?.filter(d => d.status === 'uploaded').length || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Communication</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Discussions</span>
                        <span>{kyc.discussions?.length || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-700">
                        <span>Last Updated</span>
                        <span>{new Date(kyc.updatedAt).toLocaleDateString()}</span>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border-0 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">KYC Details</h2>
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
                <Card className="border-0 shadow-lg bg-white/80 border border-white/50 rounded-2xl hover:bg-white/70 shadow-lg shadow-gray-300/30">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Status Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <Badge className={`${getStatusColor(selectedKYC.status)} flex items-center gap-1`}>
                        {getStatusIcon(selectedKYC.status)}
                        {selectedKYC.status.charAt(0).toUpperCase() + selectedKYC.status.slice(1).replace('-', ' ')}
                      </Badge>
                      <div className="flex gap-2">
                        {selectedKYC.status !== 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(selectedKYC._id, 'pending')}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                          >
                            Mark as Pending
                          </Button>
                        )}
                        {selectedKYC.status !== 'in-review' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(selectedKYC._id, 'in-review')}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                          >
                            Mark as In Review
                          </Button>
                        )}
                        {selectedKYC.status !== 'completed' && (
                          <Button
                            size="sm"
                            className="bg-gray-800 hover:bg-gray-900 text-white"
                            onClick={() => handleUpdateStatus(selectedKYC._id, 'completed')}
                          >
                            Mark as Completed
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card className="border-0 shadow-lg bg-white/80 border border-white/50 rounded-2xl hover:bg-white/70 shadow-lg shadow-gray-300/30">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Uploaded Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedKYC.documentRequests?.documents?.length > 0 ? (
                      <div className="space-y-3">
                        {selectedKYC.documentRequests.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200">
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-gray-500" />
                              <div>
                                <p className="font-medium text-gray-900">{doc.name}</p>
                                <p className="text-sm text-gray-700">
                                  Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-gray-800 border-gray-300">
                                {doc.status}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(doc.url, '_blank')}
                                className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600">No documents uploaded yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Discussions */}
                <Card className="border-0 shadow-lg bg-white/80 border border-white/50 rounded-2xl hover:bg-white/70 shadow-lg shadow-gray-300/30">
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
                                {new Date(discussion.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-900">{discussion.message}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-600">No discussions yet.</p>
                      )}
                      
                      {/* Send Message */}
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
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
