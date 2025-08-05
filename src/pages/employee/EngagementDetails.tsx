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
import { Checkbox } from '@/components/ui/checkbox';
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
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  
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

  const handleChecklistToggle = (itemId: string) => {
    setChecklist(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
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
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
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

        <TabsContent value="checklist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Checklist</CardTitle>
              <CardDescription>
                Complete audit checklist to track progress through all phases
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              
              {/* Pre-Audit Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Pre-Audit Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Professional Clearance</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['prof-clearance-letter'] || false}
                        onCheckedChange={() => handleChecklistToggle('prof-clearance-letter')}
                      />
                      <Label>Signed Professional Clearance Letter (if required)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['removal-auditor'] || false}
                        onCheckedChange={() => handleChecklistToggle('removal-auditor')}
                      />
                      <Label>Removal of Auditor</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['form-f1'] || false}
                        onCheckedChange={() => handleChecklistToggle('form-f1')}
                      />
                      <Label>Form F1 Submitted (if required)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Engagement Letter</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['draft-engagement'] || false}
                        onCheckedChange={() => handleChecklistToggle('draft-engagement')}
                      />
                      <Label>Draft Engagement Letter</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['signed-engagement'] || false}
                        onCheckedChange={() => handleChecklistToggle('signed-engagement')}
                      />
                      <Label>Signed Engagement Letter by Client</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['engagement-sent'] || false}
                        onCheckedChange={() => handleChecklistToggle('engagement-sent')}
                      />
                      <Label>Engagement Letter sent to client (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Letter of Independence</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['draft-independence'] || false}
                        onCheckedChange={() => handleChecklistToggle('draft-independence')}
                      />
                      <Label>Draft Letter of Independence for team</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['signed-independence'] || false}
                        onCheckedChange={() => handleChecklistToggle('signed-independence')}
                      />
                      <Label>Signed Independence Letter by audit team members</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['filed-independence'] || false}
                        onCheckedChange={() => handleChecklistToggle('filed-independence')}
                      />
                      <Label>Filed for record (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">MBR Authorization Access</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['mbr-auth-request'] || false}
                        onCheckedChange={() => handleChecklistToggle('mbr-auth-request')}
                      />
                      <Label>Authorization request submitted for MBR access (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['mbr-confirmation'] || false}
                        onCheckedChange={() => handleChecklistToggle('mbr-confirmation')}
                      />
                      <Label>Access confirmation received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">CFR02 Tax Access</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['cfr02-request'] || false}
                        onCheckedChange={() => handleChecklistToggle('cfr02-request')}
                      />
                      <Label>CFR02 Tax access request submitted (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['cfr02-granted'] || false}
                        onCheckedChange={() => handleChecklistToggle('cfr02-granted')}
                      />
                      <Label>Access granted for tax details (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Task Assignment</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['engagement-type'] || false}
                        onCheckedChange={() => handleChecklistToggle('engagement-type')}
                      />
                      <Label>Specify Type of Engagement: (select one) ✓ Audit ☐ Liquidation ☐ Review ☐ Other</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['assign-manager'] || false}
                        onCheckedChange={() => handleChecklistToggle('assign-manager')}
                      />
                      <Label>Assign audit manager/lead auditor (Name: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Period</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['audit-period'] || false}
                        onCheckedChange={() => handleChecklistToggle('audit-period')}
                      />
                      <Label>Years/Periods to be Audited: ______ to ______</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Bank Confirmation Letter</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['bank-letters-sent'] || false}
                        onCheckedChange={() => handleChecklistToggle('bank-letters-sent')}
                      />
                      <Label>Bank Confirmation Letters sent (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['bank-letters-received'] || false}
                        onCheckedChange={() => handleChecklistToggle('bank-letters-received')}
                      />
                      <Label>Bank Confirmation Letters received (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Planning Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Audit Planning Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Audit Planning Meeting</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['planning-meeting'] || false}
                        onCheckedChange={() => handleChecklistToggle('planning-meeting')}
                      />
                      <Label>Initial audit planning meeting scheduled (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['scope-discussion'] || false}
                        onCheckedChange={() => handleChecklistToggle('scope-discussion')}
                      />
                      <Label>Discussion of audit scope, timing, and key focus areas</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Strategy and Risk Assessment</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['risk-assessment'] || false}
                        onCheckedChange={() => handleChecklistToggle('risk-assessment')}
                      />
                      <Label>Identify significant risks and audit areas</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['audit-strategy'] || false}
                        onCheckedChange={() => handleChecklistToggle('audit-strategy')}
                      />
                      <Label>Document audit strategy</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['internal-controls'] || false}
                        onCheckedChange={() => handleChecklistToggle('internal-controls')}
                      />
                      <Label>Review internal controls (if applicable)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Team Planning</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['team-assigned'] || false}
                        onCheckedChange={() => handleChecklistToggle('team-assigned')}
                      />
                      <Label>Audit team assigned and roles clarified</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['timeline-communication'] || false}
                        onCheckedChange={() => handleChecklistToggle('timeline-communication')}
                      />
                      <Label>Communication of timelines and deliverables</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documentation Requested */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Documentation Requested
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Client Documentation Request</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['financial-statements'] || false}
                        onCheckedChange={() => handleChecklistToggle('financial-statements')}
                      />
                      <Label>Financial Statements (balance sheet, income statement, cash flow)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['trial-balance'] || false}
                        onCheckedChange={() => handleChecklistToggle('trial-balance')}
                      />
                      <Label>General Ledger and Trial Balance</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fixed-asset-register'] || false}
                        onCheckedChange={() => handleChecklistToggle('fixed-asset-register')}
                      />
                      <Label>Fixed Asset Register</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['bank-statements'] || false}
                        onCheckedChange={() => handleChecklistToggle('bank-statements')}
                      />
                      <Label>Bank Statements and Reconciliations</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['payroll-reports'] || false}
                        onCheckedChange={() => handleChecklistToggle('payroll-reports')}
                      />
                      <Label>Payroll Reports and Supporting Documents</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['tax-returns'] || false}
                        onCheckedChange={() => handleChecklistToggle('tax-returns')}
                      />
                      <Label>Tax Returns and Correspondence</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['debtors-creditors'] || false}
                        onCheckedChange={() => handleChecklistToggle('debtors-creditors')}
                      />
                      <Label>Debtors & Creditors Ledgers</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['legal-documents'] || false}
                        onCheckedChange={() => handleChecklistToggle('legal-documents')}
                      />
                      <Label>Legal Documents (agreements, contracts, leases)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['board-minutes'] || false}
                        onCheckedChange={() => handleChecklistToggle('board-minutes')}
                      />
                      <Label>Minutes of Board Meetings</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['significant-transactions'] || false}
                        onCheckedChange={() => handleChecklistToggle('significant-transactions')}
                      />
                      <Label>Significant transactions documentation (loans, acquisitions, etc.)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['other-requests'] || false}
                        onCheckedChange={() => handleChecklistToggle('other-requests')}
                      />
                      <Label>Other (list any additional requests: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit File Preparation</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['working-papers'] || false}
                        onCheckedChange={() => handleChecklistToggle('working-papers')}
                      />
                      <Label>Audit working papers created (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fieldwork Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Fieldwork Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Audit Started</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fieldwork-start'] || false}
                        onCheckedChange={() => handleChecklistToggle('fieldwork-start')}
                      />
                      <Label>Date of Audit Fieldwork Start: __________</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['inventory-count'] || false}
                        onCheckedChange={() => handleChecklistToggle('inventory-count')}
                      />
                      <Label>Attendance of inventory count (if applicable)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Testing and Sampling</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['assertions-tested'] || false}
                        onCheckedChange={() => handleChecklistToggle('assertions-tested')}
                      />
                      <Label>Financial statement assertions tested</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['sampling-plan'] || false}
                        onCheckedChange={() => handleChecklistToggle('sampling-plan')}
                      />
                      <Label>Sampling plan for testing developed</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['sample-selection'] || false}
                        onCheckedChange={() => handleChecklistToggle('sample-selection')}
                      />
                      <Label>Sample selection completed</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Substantive Procedures</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['revenue-testing'] || false}
                        onCheckedChange={() => handleChecklistToggle('revenue-testing')}
                      />
                      <Label>Revenue testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['expense-testing'] || false}
                        onCheckedChange={() => handleChecklistToggle('expense-testing')}
                      />
                      <Label>Expense testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['cash-bank-testing'] || false}
                        onCheckedChange={() => handleChecklistToggle('cash-bank-testing')}
                      />
                      <Label>Cash and bank testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['asset-testing'] || false}
                        onCheckedChange={() => handleChecklistToggle('asset-testing')}
                      />
                      <Label>Asset testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['liability-testing'] || false}
                        onCheckedChange={() => handleChecklistToggle('liability-testing')}
                      />
                      <Label>Liability testing</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Review of Estimates and Judgments</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['estimates-review'] || false}
                        onCheckedChange={() => handleChecklistToggle('estimates-review')}
                      />
                      <Label>Review management's estimates (e.g., provisions, impairments)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Review of Going Concern</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['going-concern'] || false}
                        onCheckedChange={() => handleChecklistToggle('going-concern')}
                      />
                      <Label>Going concern analysis completed</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Finalization Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Finalization Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Financial Statements</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fs-drafted'] || false}
                        onCheckedChange={() => handleChecklistToggle('fs-drafted')}
                      />
                      <Label>Financial Statements Drafted by: __________ (Name)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fs-reviewed'] || false}
                        onCheckedChange={() => handleChecklistToggle('fs-reviewed')}
                      />
                      <Label>Financial Statements Reviewed by: __________ (Name)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['review-date'] || false}
                        onCheckedChange={() => handleChecklistToggle('review-date')}
                      />
                      <Label>Date of Review: __________</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Completion Date</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fieldwork-completed'] || false}
                        onCheckedChange={() => handleChecklistToggle('fieldwork-completed')}
                      />
                      <Label>Date Audit Fieldwork Completed: __________</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Adjustments</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-discussed'] || false}
                        onCheckedChange={() => handleChecklistToggle('adjustments-discussed')}
                      />
                      <Label>Discuss adjustments with client</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-processed'] || false}
                        onCheckedChange={() => handleChecklistToggle('adjustments-processed')}
                      />
                      <Label>Final adjustments processed</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Review of Financial Statements</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['final-fs-reviewed'] || false}
                        onCheckedChange={() => handleChecklistToggle('final-fs-reviewed')}
                      />
                      <Label>Final financial statements reviewed by audit team</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['representation-drafted'] || false}
                        onCheckedChange={() => handleChecklistToggle('representation-drafted')}
                      />
                      <Label>Letter of representation drafted and sent to management</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['representation-received'] || false}
                        onCheckedChange={() => handleChecklistToggle('representation-received')}
                      />
                      <Label>Signed letter of representation received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Opinion Drafting</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['draft-report'] || false}
                        onCheckedChange={() => handleChecklistToggle('draft-report')}
                      />
                      <Label>Draft audit report completed</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['report-review'] || false}
                        onCheckedChange={() => handleChecklistToggle('report-review')}
                      />
                      <Label>Review with audit team</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['final-report'] || false}
                        onCheckedChange={() => handleChecklistToggle('final-report')}
                      />
                      <Label>Final report issued (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Post-Audit Letters & Documentation */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Post-Audit Letters & Documentation
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Form DD1/DD2 (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['form-dd1'] || false}
                        onCheckedChange={() => handleChecklistToggle('form-dd1')}
                      />
                      <Label>Form DD1 prepared and submitted (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['form-dd2'] || false}
                        onCheckedChange={() => handleChecklistToggle('form-dd2')}
                      />
                      <Label>Form DD2 prepared and submitted (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Letter of Representation</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['lor-drafted'] || false}
                        onCheckedChange={() => handleChecklistToggle('lor-drafted')}
                      />
                      <Label>Drafted and sent to management (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['lor-received'] || false}
                        onCheckedChange={() => handleChecklistToggle('lor-received')}
                      />
                      <Label>Signed letter received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Shareholder's/s' Confirmation (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['shareholder-confirmation'] || false}
                        onCheckedChange={() => handleChecklistToggle('shareholder-confirmation')}
                      />
                      <Label>Confirmation from shareholders received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Shareholder's/s' Resolution (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['shareholder-draft'] || false}
                        onCheckedChange={() => handleChecklistToggle('shareholder-draft')}
                      />
                      <Label>Draft shareholder's resolution</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['shareholder-signed'] || false}
                        onCheckedChange={() => handleChecklistToggle('shareholder-signed')}
                      />
                      <Label>Signed resolution received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Director's/s' Resolution (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['director-draft'] || false}
                        onCheckedChange={() => handleChecklistToggle('director-draft')}
                      />
                      <Label>Draft director's resolution</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['director-signed'] || false}
                        onCheckedChange={() => handleChecklistToggle('director-signed')}
                      />
                      <Label>Signed resolution received (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Going Concern Letter (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['going-concern-letter'] || false}
                        onCheckedChange={() => handleChecklistToggle('going-concern-letter')}
                      />
                      <Label>Going concern letter obtained from management and reviewed.</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Related Parties Letters (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['related-parties-drafted'] || false}
                        onCheckedChange={() => handleChecklistToggle('related-parties-drafted')}
                      />
                      <Label>Related parties letter drafted and sent to management.</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['related-parties-confirmed'] || false}
                        onCheckedChange={() => handleChecklistToggle('related-parties-confirmed')}
                      />
                      <Label>Confirmation of related parties transactions received and reviewed.</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">External Confirmation Letters (If Applicable)</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['external-confirmations-sent'] || false}
                        onCheckedChange={() => handleChecklistToggle('external-confirmations-sent')}
                      />
                      <Label>External confirmation letters (e.g., bank, receivables) drafted and sent.</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['external-confirmations-received'] || false}
                        onCheckedChange={() => handleChecklistToggle('external-confirmations-received')}
                      />
                      <Label>External confirmations received and reconciled with client records.</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Letter of Management</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['management-letter-draft'] || false}
                        onCheckedChange={() => handleChecklistToggle('management-letter-draft')}
                      />
                      <Label>Draft letter of management comments prepared</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['management-letter-sent'] || false}
                        onCheckedChange={() => handleChecklistToggle('management-letter-sent')}
                      />
                      <Label>Final letter sent to management (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Audit Adjustments Approval</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-discussed-client'] || false}
                        onCheckedChange={() => handleChecklistToggle('adjustments-discussed-client')}
                      />
                      <Label>Audit adjustments discussed with client</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-approved'] || false}
                        onCheckedChange={() => handleChecklistToggle('adjustments-approved')}
                      />
                      <Label>Adjustments approved by management (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Post-Audit Phase */}
              <div className="space-y-6">
                <div className="bg-primary text-primary-foreground p-3 font-semibold">
                  Post-Audit Phase
                </div>
                
                <div className="space-y-4">
                  <div className="font-medium">Management Letter</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['draft-management-letter'] || false}
                        onCheckedChange={() => handleChecklistToggle('draft-management-letter')}
                      />
                      <Label>Draft Management Letter</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['finalized-management-letter'] || false}
                        onCheckedChange={() => handleChecklistToggle('finalized-management-letter')}
                      />
                      <Label>Finalized Management Letter (Date: __________)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Client Debrief</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['post-audit-meeting'] || false}
                        onCheckedChange={() => handleChecklistToggle('post-audit-meeting')}
                      />
                      <Label>Post-audit meeting scheduled with client (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['client-feedback'] || false}
                        onCheckedChange={() => handleChecklistToggle('client-feedback')}
                      />
                      <Label>Feedback received from the client</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Archiving</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['audit-file-archived'] || false}
                        onCheckedChange={() => handleChecklistToggle('audit-file-archived')}
                      />
                      <Label>Audit file archived</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['closure-meeting'] || false}
                        onCheckedChange={() => handleChecklistToggle('closure-meeting')}
                      />
                      <Label>Engagement closure meeting with the team</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="font-medium">Conclusion</div>
                  <div className="space-y-3 ml-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['signed-documents'] || false}
                        onCheckedChange={() => handleChecklistToggle('signed-documents')}
                      />
                      <Label>Signed documents obtained from the client (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['documentation-rearranged'] || false}
                        onCheckedChange={() => handleChecklistToggle('documentation-rearranged')}
                      />
                      <Label>Documentation re-arranged and prepared for submission</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['counter-signed-docs'] || false}
                        onCheckedChange={() => handleChecklistToggle('counter-signed-docs')}
                      />
                      <Label>Counter-signed documents sent to the client (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['mbr-submission'] || false}
                        onCheckedChange={() => handleChecklistToggle('mbr-submission')}
                      />
                      <Label>Submission completed with MBR (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['final-billing'] || false}
                        onCheckedChange={() => handleChecklistToggle('final-billing')}
                      />
                      <Label>Final billing for the engagement issued (Date: __________)</Label>
                    </div>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};