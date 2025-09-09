// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { engagementApi, documentRequestApi } from '@/services/api';
import { Upload, FileText, Clock, CheckCircle, Download, Calendar, Loader2, User, ArrowLeft } from 'lucide-react';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';
import { Link } from 'react-router-dom';

export const DocumentRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientEngagements, setClientEngagements] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState({});

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        const allEngagements = await engagementApi.getAll();
        const clientFiltered = allEngagements.filter(e => e.clientId === user?.id);
        setClientEngagements(clientFiltered);

        const promises = clientFiltered.map(e =>
          documentRequestApi.getByEngagement(e._id).catch(() => []));
        const arrays = await Promise.all(promises);
        setAllRequests(arrays.flat());
      } catch (err) {
        console.error(err);
        toast({ title: 'Error', description: 'Failed to fetch requests', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchClientData();
  }, [user, toast]);

  const pendingRequests = allRequests.filter(r => r.status === 'pending');
  const completedRequests = allRequests.filter(r => r.status === 'completed');

  const handleFileUpload = async (requestId, files) => {
    if (!files?.length) return;
    setUploadingFiles(prev => ({ ...prev, [requestId]: true }));

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => formData.append('files', file));
      formData.append('markCompleted', 'true'); // optional flag

      // Call the real upload endpoint
      const updatedReq = await documentRequestApi.uploadDocuments(requestId, formData);

      // Sync local state with response
      setAllRequests(prev => prev.map(req => 
        req._id === requestId ? updatedReq : req
      ));

      toast({
        title: 'Documents uploaded successfully',
        description: `${files.length} file(s) sent to your auditor.`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const getEngagementTitle = id =>
    clientEngagements.find(e => e._id === id)?.title || 'Unknown Engagement';

  if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
        </div>
      )
    }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <div>
                                      <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent leading-tight">
                      Document Requests
                    </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    View and respond to document requests from your auditors
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                variant="outline"
                className="border-green-200 hover:bg-green-50/50 text-green-700 hover:text-green-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
              >
                <Link to="/client">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group bg-white/80 backdrop-blur-sm border border-yellow-100/50 hover:border-yellow-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Requests
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-yellow-600 mb-2">{pendingRequests.length}</div>
            <p className="text-sm text-slate-600">
              Action required
            </p>
          </CardContent>
        </Card>
        
        <Card className="group bg-white/80 backdrop-blur-sm border border-green-100/50 hover:border-green-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Completed
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-green-600 mb-2">{completedRequests.length}</div>
            <p className="text-sm text-slate-600">
              Documents submitted
            </p>
          </CardContent>
        </Card>
        
        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Total Files
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {completedRequests.reduce((acc, req) => acc + (req.documents?.length || 0), 0)}
            </div>
            <p className="text-sm text-slate-600">
              Files uploaded
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-2xl p-1">
          <TabsTrigger value="pending" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600 data-[state=active]:text-white">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
            Completed ({completedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          {pendingRequests.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl overflow-hidden">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">
                  All caught up!
                </h3>
                <p className="text-slate-600">
                  You have no pending document requests at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {pendingRequests.map((request) => (
                <Card key={request._id} className="bg-white/80 backdrop-blur-sm border border-yellow-100/50 rounded-3xl shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-100/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-800">{request.description}</CardTitle>
                        <CardDescription className="mt-1 text-slate-600">
                          Engagement: {getEngagementTitle(request.engagement)}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600 bg-yellow-50">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                          {request.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Requested: {new Date(request.requestedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="border-2 border-dashed border-yellow-200 rounded-2xl p-6 bg-gradient-to-r from-yellow-50/50 to-amber-50/50">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                        <Label htmlFor={`file-${request._id}`} className="cursor-pointer">
                          <span className="text-sm font-medium text-slate-800">
                            Click to upload files
                          </span>
                          <span className="text-sm text-slate-600 block">
                            or drag and drop
                          </span>
                        </Label>
                        <Input
                          id={`file-${request._id}`}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(request._id, e.target.files)}
                          disabled={uploadingFiles[request._id]}
                        />
                      </div>
                      
                      {uploadingFiles[request._id] && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                          <span className="text-sm text-slate-600">Uploading files...</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          {completedRequests.length === 0 ? (
            <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl overflow-hidden">
              <CardContent className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">
                  No completed requests yet
                </h3>
                <p className="text-slate-600">
                  Your completed document submissions will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {completedRequests.map((request) => (
                <Card key={request._id} className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100/50">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-800">{request.description}</CardTitle>
                        <CardDescription className="mt-1 text-slate-600">
                          Engagement: {getEngagementTitle(request.engagement)}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
                        Completed
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                          {request.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Completed: {request.completedAt ? new Date(request.completedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    
                    {request.documents && request.documents.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-slate-800">Uploaded Documents:</h4>
                        <div className="space-y-3">
                          {request.documents.map((doc, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-100/50 rounded-2xl hover:border-slate-300/50 transition-all duration-300 hover:shadow-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-slate-800">{doc.name}</span>
                              </div>
                              <Button size="sm" variant="outline" className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-xl">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
