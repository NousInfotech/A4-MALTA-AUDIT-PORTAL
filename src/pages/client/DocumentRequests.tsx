import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle, 
  Download,
  Calendar,
  Loader2 
} from 'lucide-react';

export const DocumentRequests = () => {
  const { user } = useAuth();
  const { engagements, getEngagementRequests, updateDocumentRequest } = useData();
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({});

  // Filter engagements and requests for current client
  const clientEngagements = engagements.filter(eng => {
    // In a real app, this would be based on the client's ID relationship
    return user?.companyName; // For demo purposes, show all engagements
  });

  const allRequests = clientEngagements.flatMap(eng => getEngagementRequests(eng.id));
  const pendingRequests = allRequests.filter(req => req.status === 'pending');
  const completedRequests = allRequests.filter(req => req.status === 'completed');

  const handleFileUpload = async (requestId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingFiles(prev => ({ ...prev, [requestId]: true }));

    try {
      // Simulate file upload
      await new Promise(resolve => setTimeout(resolve, 2000));

      const uploadedDocuments = Array.from(files).map((file, index) => ({
        id: `${requestId}-doc-${index}`,
        name: file.name,
        url: `#uploaded-${file.name}`,
        uploadedAt: new Date().toISOString()
      }));

      updateDocumentRequest(requestId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        documents: uploadedDocuments
      });

      toast({
        title: "Documents uploaded successfully",
        description: `${files.length} file(s) have been uploaded and sent to your auditor.`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload documents. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingFiles(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const getEngagementTitle = (engagementId: string) => {
    const engagement = clientEngagements.find(e => e.id === engagementId);
    return engagement?.title || 'Unknown Engagement';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Document Requests</h1>
        <p className="text-muted-foreground mt-2">
          View and respond to document requests from your auditors
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{pendingRequests.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Action required
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">{completedRequests.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Documents submitted
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-foreground" />
              Total Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {completedRequests.reduce((acc, req) => acc + (req.documents?.length || 0), 0)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Files uploaded
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  All caught up!
                </h3>
                <p className="text-muted-foreground">
                  You have no pending document requests at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{request.description}</CardTitle>
                        <CardDescription className="mt-1">
                          Engagement: {getEngagementTitle(request.engagementId)}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-warning border-warning">
                        Pending
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{request.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Requested: {new Date(request.requestedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="border-2 border-dashed border-border rounded-lg p-6">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <Label htmlFor={`file-${request.id}`} className="cursor-pointer">
                          <span className="text-sm font-medium text-foreground">
                            Click to upload files
                          </span>
                          <span className="text-sm text-muted-foreground block">
                            or drag and drop
                          </span>
                        </Label>
                        <Input
                          id={`file-${request.id}`}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(request.id, e.target.files)}
                          disabled={uploadingFiles[request.id]}
                        />
                      </div>
                      
                      {uploadingFiles[request.id] && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Uploading files...</span>
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
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No completed requests yet
                </h3>
                <p className="text-muted-foreground">
                  Your completed document submissions will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{request.description}</CardTitle>
                        <CardDescription className="mt-1">
                          Engagement: {getEngagementTitle(request.engagementId)}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-success border-success">
                        Completed
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{request.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Completed: {request.completedAt ? new Date(request.completedAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                    
                    {request.documents && request.documents.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Uploaded Documents:</h4>
                        <div className="space-y-2">
                          {request.documents.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{doc.name}</span>
                              </div>
                              <Button size="sm" variant="ghost">
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