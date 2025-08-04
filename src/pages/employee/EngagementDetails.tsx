import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  FileText, 
  Upload, 
  Download, 
  Plus, 
  Send,
  Bot,
  Building2,
  Calendar,
  Loader2
} from 'lucide-react';

export const EngagementDetails = () => {
  const { id } = useParams();
  const [trialBalanceUrl, setTrialBalanceUrl] = useState('');
  const [isLoadingTB, setIsLoadingTB] = useState(false);
  const [documentRequest, setDocumentRequest] = useState({
    category: '',
    description: ''
  });
  const [isGeneratingProcedures, setIsGeneratingProcedures] = useState(false);
  
  const { 
    engagements, 
    clients, 
    updateEngagement, 
    getEngagementRequests,
    getEngagementProcedures,
    addDocumentRequest,
    addProcedure
  } = useData();
  const { toast } = useToast();

  const engagement = engagements.find(e => e.id === id);
  const client = engagement ? clients.find(c => c.id === engagement.clientId) : null;
  const requests = engagement ? getEngagementRequests(engagement.id) : [];
  const procedures = engagement ? getEngagementProcedures(engagement.id) : [];

  if (!engagement || !client) {
    return <div>Engagement not found</div>;
  }

  const handleUploadTrialBalance = async () => {
    if (!trialBalanceUrl.includes('docs.google.com/spreadsheets')) {
      toast({
        title: "Invalid URL",
        description: "Please provide a valid Google Sheets URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingTB(true);
    
    // Simulate parsing Google Sheets
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockTrialBalanceData = [
      { id: '1', category: 'Assets', accountName: 'Cash and Bank', debitAmount: 150000, creditAmount: 0 },
      { id: '2', category: 'Assets', accountName: 'Accounts Receivable', debitAmount: 85000, creditAmount: 0 },
      { id: '3', category: 'Assets', accountName: 'Inventory', debitAmount: 120000, creditAmount: 0 },
      { id: '4', category: 'Liabilities', accountName: 'Accounts Payable', debitAmount: 0, creditAmount: 45000 },
      { id: '5', category: 'Liabilities', accountName: 'Bank Loan', debitAmount: 0, creditAmount: 80000 },
      { id: '6', category: 'Equity', accountName: 'Share Capital', debitAmount: 0, creditAmount: 100000 },
      { id: '7', category: 'Revenue', accountName: 'Sales Revenue', debitAmount: 0, creditAmount: 250000 },
      { id: '8', category: 'Expenses', accountName: 'Operating Expenses', debitAmount: 120000, creditAmount: 0 }
    ];

    updateEngagement(engagement.id, {
      trialBalanceUrl,
      trialBalanceData: mockTrialBalanceData,
      status: 'active'
    });

    setIsLoadingTB(false);
    toast({
      title: "Trial Balance uploaded successfully",
      description: "Data has been parsed and categories are now available for document requests.",
    });
  };

  const handleSendDocumentRequest = async () => {
    if (!documentRequest.category || !documentRequest.description) {
      toast({
        title: "Missing information",
        description: "Please select a category and provide a description",
        variant: "destructive"
      });
      return;
    }

    addDocumentRequest({
      engagementId: engagement.id,
      clientId: engagement.clientId,
      category: documentRequest.category,
      description: documentRequest.description,
      status: 'pending'
    });

    setDocumentRequest({ category: '', description: '' });
    
    toast({
      title: "Document request sent",
      description: "The client has been notified and can now upload the requested documents.",
    });
  };

  const handleGenerateProcedures = async () => {
    setIsGeneratingProcedures(true);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const mockProcedure = {
      engagementId: engagement.id,
      title: `${documentRequest.category || 'General'} Audit Procedures`,
      status: 'completed' as const,
      questions: [
        {
          id: '1',
          question: 'Have all balances been reconciled to supporting documentation?',
          answer: 'Yes, all balances have been traced to underlying records and supporting documentation.',
          category: documentRequest.category || 'General'
        },
        {
          id: '2',
          question: 'Are there any unusual or significant transactions identified?',
          answer: 'No unusual transactions were identified during the review period.',
          category: documentRequest.category || 'General'
        },
        {
          id: '3',
          question: 'Have adequate controls been implemented and tested?',
          answer: 'Controls have been evaluated and found to be operating effectively.',
          category: documentRequest.category || 'General'
        }
      ]
    };

    addProcedure(mockProcedure);
    setIsGeneratingProcedures(false);
    
    toast({
      title: "Procedures generated successfully",
      description: "AI has analyzed the documents and generated audit procedures.",
    });
  };

  const categories = engagement.trialBalanceData ? 
    [...new Set(engagement.trialBalanceData.map(item => item.category))] : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/employee/engagements">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">{engagement.title}</h1>
            <Badge variant="outline" className={
              engagement.status === 'active' ? 'text-success border-success' :
              engagement.status === 'completed' ? 'text-muted border-muted' :
              'text-warning border-warning'
            }>
              {engagement.status}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{client.companyName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="requests">Document Requests</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Status Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trial Balance</span>
                  <span className={engagement.trialBalanceUrl ? 'text-success' : 'text-muted-foreground'}>
                    {engagement.trialBalanceUrl ? 'Uploaded' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Document Requests</span>
                  <span className="text-foreground">{requests.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Procedures</span>
                  <span className="text-foreground">{procedures.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Company</div>
                  <div className="font-medium">{client.companyName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Industry</div>
                  <div className="font-medium">{client.industry}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Contact</div>
                  <div className="font-medium">{client.email}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline" onClick={handleGenerateProcedures} disabled={isGeneratingProcedures}>
                  {isGeneratingProcedures ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4 mr-2" />
                  )}
                  Generate Procedures
                </Button>
                <Button className="w-full" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trial-balance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trial Balance Upload</CardTitle>
              <CardDescription>
                Upload trial balance data via Google Sheets link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="tbUrl">Google Sheets URL</Label>
                  <Input
                    id="tbUrl"
                    value={trialBalanceUrl}
                    onChange={(e) => setTrialBalanceUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleUploadTrialBalance} disabled={isLoadingTB}>
                    {isLoadingTB ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {engagement.trialBalanceUrl ? 'Update' : 'Upload'}
                  </Button>
                </div>
              </div>

              {engagement.trialBalanceData && (
                <div className="mt-6">
                  <h4 className="font-medium mb-4">Trial Balance Data</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {engagement.trialBalanceData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Badge variant="secondary">{item.category}</Badge>
                          </TableCell>
                          <TableCell>{item.accountName}</TableCell>
                          <TableCell className="text-right">
                            {item.debitAmount > 0 ? item.debitAmount.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.creditAmount > 0 ? item.creditAmount.toLocaleString() : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Document Request</CardTitle>
              <CardDescription>
                Request specific documents from the client
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={documentRequest.category} 
                    onValueChange={(value) => setDocumentRequest(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Request Description</Label>
                <Textarea
                  id="description"
                  value={documentRequest.description}
                  onChange={(e) => setDocumentRequest(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the documents you need from the client..."
                  rows={3}
                />
              </div>
              
              <Button onClick={handleSendDocumentRequest}>
                <Send className="h-4 w-4 mr-2" />
                Send Request
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Document Requests History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <div className="font-medium">{request.description}</div>
                      <div className="text-sm text-muted-foreground">
                        Category: {request.category} • Requested: {new Date(request.requestedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={request.status === 'completed' ? 'outline' : 'secondary'} 
                           className={request.status === 'completed' ? 'text-success border-success' : ''}>
                      {request.status}
                    </Badge>
                  </div>
                ))}
                {requests.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No document requests sent yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procedures" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Audit Procedures</CardTitle>
                  <CardDescription>
                    AI-generated procedures based on uploaded documents
                  </CardDescription>
                </div>
                <Button onClick={handleGenerateProcedures} disabled={isGeneratingProcedures}>
                  {isGeneratingProcedures ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bot className="h-4 w-4 mr-2" />
                  )}
                  Generate New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {procedures.map((procedure) => (
                  <Card key={procedure.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{procedure.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {procedure.questions.map((qa) => (
                          <div key={qa.id} className="border-l-4 border-primary/20 pl-4">
                            <div className="font-medium text-foreground mb-2">{qa.question}</div>
                            <div className="text-muted-foreground">{qa.answer}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <Button variant="outline">
                          <Download className="h-4 w-4 mr-2" />
                          Export as PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {procedures.length === 0 && (
                  <div className="text-center py-12">
                    <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No procedures generated yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate AI-powered audit procedures based on your uploaded documents and trial balance data.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};