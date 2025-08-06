
import { useChecklist } from '@/hooks/useChecklist';
import { useTrialBalance } from '@/hooks/useTrialBalance';
import { useDocumentRequests } from '@/hooks/useDocumentRequests';
import { useProcedures } from '@/hooks/useProcedures';
import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { engagementApi } from '@/services/api';
import { ArrowLeft, FileText, Upload, Download, Plus, Send, Bot, Building2, Calendar, Loader2 } from 'lucide-react';

export const EngagementDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [engagement, setEngagement] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [trialBalanceUrl, setTrialBalanceUrl] = useState('');
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [documentRequest, setDocumentRequest] = useState({
    category: '',
    description: ''
  });
  const [isGeneratingProcedures, setIsGeneratingProcedures] = useState(false);
  const [loading, setLoading] = useState(true);

  const { checklist, toggle } = useChecklist(id);
  const { loading: tbLoading, fetchTrialBalance, getTrialBalance } = useTrialBalance();
  const { requests, createRequest } = useDocumentRequests(id);
  const { procedures, createProcedure } = useProcedures(id);
  const { toast } = useToast();

  useEffect(() => {
    const fetchEngagement = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const engagementData = await engagementApi.getById(id);
        setEngagement(engagementData);
        
        // Get trial balance if exists
        const tbData = await getTrialBalance(id);
        setTrialBalanceData(tbData);
        
        if (engagementData.trialBalanceUrl) {
          setTrialBalanceUrl(engagementData.trialBalanceUrl);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch engagement details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEngagement();
  }, [id]);

  if (loading || !engagement) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
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

    try {
      const data = await fetchTrialBalance(id!, trialBalanceUrl);
      setTrialBalanceData(data);
      
      // Update engagement with trial balance URL
      await engagementApi.update(id!, { 
        trialBalanceUrl,
        status: 'active'
      });
      
      setEngagement(prev => ({ 
        ...prev, 
        trialBalanceUrl,
        status: 'active'
      }));
    } catch (error) {
      // Error handled in hook
    }
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

    try {
      await createRequest({
        category: documentRequest.category,
        description: documentRequest.description,
        clientId: engagement.clientId
      });
      
      setDocumentRequest({ category: '', description: '' });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send document request",
        variant: "destructive"
      });
    }
  };

  const handleGenerateProcedures = async () => {
    setIsGeneratingProcedures(true);
    
    try {
      // Simulate AI generation delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockTasks = [
        {
          description: 'Have all balances been reconciled to supporting documentation?',
          category: documentRequest.category || 'General'
        },
        {
          description: 'Are there any unusual or significant transactions identified?',
          category: documentRequest.category || 'General'
        },
        {
          description: 'Have adequate controls been implemented and tested?',
          category: documentRequest.category || 'General'
        }
      ];

      await createProcedure({
        title: `${documentRequest.category || 'General'} Audit Procedures`,
        tasks: mockTasks
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate procedures",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingProcedures(false);
    }
  };

  // Extract categories from trial balance data
  const categories = trialBalanceData?.headers || [];

  // Convert trial balance data for display
  const displayTrialBalance = trialBalanceData ? 
    trialBalanceData.rows.map((row: any[], index: number) => ({
      id: index.toString(),
      category: row[0] || 'Unknown',
      accountName: row[1] || 'Unknown',
      debitAmount: parseFloat(row[2]) || 0,
      creditAmount: parseFloat(row[3]) || 0
    })) : [];

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
              <span>Client ID: {engagement.clientId}</span>
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
                <CardTitle className="text-lg">Engagement Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-muted-foreground">Created</div>
                  <div className="font-medium">{new Date(engagement.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Created By</div>
                  <div className="font-medium">{engagement.createdBy}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium">{engagement.status}</div>
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
                  <Button onClick={handleUploadTrialBalance} disabled={tbLoading}>
                    {tbLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {engagement.trialBalanceUrl ? 'Update' : 'Upload'}
                  </Button>
                </div>
              </div>

              {displayTrialBalance.length > 0 && (
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
                      {displayTrialBalance.map((item) =>
                        (
                        <TableRow key={item.id}>
                          {item.category!=="Unknown"&&(
                            <>
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
                            </>
                          )}
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
                      <SelectItem value="Assets">Assets</SelectItem>
                      <SelectItem value="Liabilities">Liabilities</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="Revenue">Revenue</SelectItem>
                      <SelectItem value="Expenses">Expenses</SelectItem>
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
                  <div key={request._id} className="flex items-center justify-between p-4 border border-border rounded-lg">
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
                  <Card key={procedure._id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{procedure.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {procedure.tasks.map((task) => (
                          <div key={task._id} className="border-l-4 border-primary/20 pl-4">
                            <div className="font-medium text-foreground mb-2">{task.description}</div>
                            <div className="text-sm text-muted-foreground">Category: {task.category}</div>
                            <div className="mt-2">
                              <Badge variant={task.completed ? 'outline' : 'secondary'} 
                                     className={task.completed ? 'text-success border-success' : ''}>
                                {task.completed ? 'Completed' : 'Pending'}
                              </Badge>
                            </div>
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
                        onCheckedChange={() => toggle('prof-clearance-letter')}
                      />
                      <Label>Signed Professional Clearance Letter (if required)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['removal-auditor'] || false}
                        onCheckedChange={() => toggle('removal-auditor')}
                      />
                      <Label>Removal of Auditor</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['form-f1'] || false}
                        onCheckedChange={() => toggle('form-f1')}
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
                        onCheckedChange={() => toggle('draft-engagement')}
                      />
                      <Label>Draft Engagement Letter</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['signed-engagement'] || false}
                        onCheckedChange={() => toggle('signed-engagement')}
                      />
                      <Label>Signed Engagement Letter by Client</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['engagement-sent'] || false}
                        onCheckedChange={() => toggle('engagement-sent')}
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
                        onCheckedChange={() => toggle('draft-independence')}
                      />
                      <Label>Draft Letter of Independence for team</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['signed-independence'] || false}
                        onCheckedChange={() => toggle('signed-independence')}
                      />
                      <Label>Signed Independence Letter by audit team members</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['filed-independence'] || false}
                        onCheckedChange={() => toggle('filed-independence')}
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
                        onCheckedChange={() => toggle('mbr-auth-request')}
                      />
                      <Label>Authorization request submitted for MBR access (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['mbr-confirmation'] || false}
                        onCheckedChange={() => toggle('mbr-confirmation')}
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
                        onCheckedChange={() => toggle('cfr02-request')}
                      />
                      <Label>CFR02 Tax access request submitted (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['cfr02-granted'] || false}
                        onCheckedChange={() => toggle('cfr02-granted')}
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
                        onCheckedChange={() => toggle('engagement-type')}
                      />
                      <Label>Specify Type of Engagement: (select one) ✓ Audit ☐ Liquidation ☐ Review ☐ Other</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['assign-manager'] || false}
                        onCheckedChange={() => toggle('assign-manager')}
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
                        onCheckedChange={() => toggle('audit-period')}
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
                        onCheckedChange={() => toggle('bank-letters-sent')}
                      />
                      <Label>Bank Confirmation Letters sent (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['bank-letters-received'] || false}
                        onCheckedChange={() => toggle('bank-letters-received')}
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
                        onCheckedChange={() => toggle('planning-meeting')}
                      />
                      <Label>Initial audit planning meeting scheduled (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['scope-discussion'] || false}
                        onCheckedChange={() => toggle('scope-discussion')}
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
                        onCheckedChange={() => toggle('risk-assessment')}
                      />
                      <Label>Identify significant risks and audit areas</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['audit-strategy'] || false}
                        onCheckedChange={() => toggle('audit-strategy')}
                      />
                      <Label>Document audit strategy</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['internal-controls'] || false}
                        onCheckedChange={() => toggle('internal-controls')}
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
                        onCheckedChange={() => toggle('team-assigned')}
                      />
                      <Label>Audit team assigned and roles clarified</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['timeline-communication'] || false}
                        onCheckedChange={() => toggle('timeline-communication')}
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
                        onCheckedChange={() => toggle('financial-statements')}
                      />
                      <Label>Financial Statements (balance sheet, income statement, cash flow)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['trial-balance'] || false}
                        onCheckedChange={() => toggle('trial-balance')}
                      />
                      <Label>General Ledger and Trial Balance</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fixed-asset-register'] || false}
                        onCheckedChange={() => toggle('fixed-asset-register')}
                      />
                      <Label>Fixed Asset Register</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['bank-statements'] || false}
                        onCheckedChange={() => toggle('bank-statements')}
                      />
                      <Label>Bank Statements and Reconciliations</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['payroll-reports'] || false}
                        onCheckedChange={() => toggle('payroll-reports')}
                      />
                      <Label>Payroll Reports and Supporting Documents</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['tax-returns'] || false}
                        onCheckedChange={() => toggle('tax-returns')}
                      />
                      <Label>Tax Returns and Correspondence</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['debtors-creditors'] || false}
                        onCheckedChange={() => toggle('debtors-creditors')}
                      />
                      <Label>Debtors & Creditors Ledgers</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['legal-documents'] || false}
                        onCheckedChange={() => toggle('legal-documents')}
                      />
                      <Label>Legal Documents (agreements, contracts, leases)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['board-minutes'] || false}
                        onCheckedChange={() => toggle('board-minutes')}
                      />
                      <Label>Minutes of Board Meetings</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['significant-transactions'] || false}
                        onCheckedChange={() => toggle('significant-transactions')}
                      />
                      <Label>Significant transactions documentation (loans, acquisitions, etc.)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['other-requests'] || false}
                        onCheckedChange={() => toggle('other-requests')}
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
                        onCheckedChange={() => toggle('working-papers')}
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
                        onCheckedChange={() => toggle('fieldwork-start')}
                      />
                      <Label>Date of Audit Fieldwork Start: __________</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['inventory-count'] || false}
                        onCheckedChange={() => toggle('inventory-count')}
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
                        onCheckedChange={() => toggle('assertions-tested')}
                      />
                      <Label>Financial statement assertions tested</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['sampling-plan'] || false}
                        onCheckedChange={() => toggle('sampling-plan')}
                      />
                      <Label>Sampling plan for testing developed</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['sample-selection'] || false}
                        onCheckedChange={() => toggle('sample-selection')}
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
                        onCheckedChange={() => toggle('revenue-testing')}
                      />
                      <Label>Revenue testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['expense-testing'] || false}
                        onCheckedChange={() => toggle('expense-testing')}
                      />
                      <Label>Expense testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['cash-bank-testing'] || false}
                        onCheckedChange={() => toggle('cash-bank-testing')}
                      />
                      <Label>Cash and bank testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['asset-testing'] || false}
                        onCheckedChange={() => toggle('asset-testing')}
                      />
                      <Label>Asset testing</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['liability-testing'] || false}
                        onCheckedChange={() => toggle('liability-testing')}
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
                        onCheckedChange={() => toggle('estimates-review')}
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
                        onCheckedChange={() => toggle('going-concern')}
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
                        onCheckedChange={() => toggle('fs-drafted')}
                      />
                      <Label>Financial Statements Drafted by: __________ (Name)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['fs-reviewed'] || false}
                        onCheckedChange={() => toggle('fs-reviewed')}
                      />
                      <Label>Financial Statements Reviewed by: __________ (Name)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['review-date'] || false}
                        onCheckedChange={() => toggle('review-date')}
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
                        onCheckedChange={() => toggle('fieldwork-completed')}
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
                        onCheckedChange={() => toggle('adjustments-discussed')}
                      />
                      <Label>Discuss adjustments with client</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-processed'] || false}
                        onCheckedChange={() => toggle('adjustments-processed')}
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
                        onCheckedChange={() => toggle('final-fs-reviewed')}
                      />
                      <Label>Final financial statements reviewed by audit team</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['representation-drafted'] || false}
                        onCheckedChange={() => toggle('representation-drafted')}
                      />
                      <Label>Letter of representation drafted and sent to management</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['representation-received'] || false}
                        onCheckedChange={() => toggle('representation-received')}
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
                        onCheckedChange={() => toggle('draft-report')}
                      />
                      <Label>Draft audit report completed</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['report-review'] || false}
                        onCheckedChange={() => toggle('report-review')}
                      />
                      <Label>Review with audit team</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['final-report'] || false}
                        onCheckedChange={() => toggle('final-report')}
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
                        onCheckedChange={() => toggle('form-dd1')}
                      />
                      <Label>Form DD1 prepared and submitted (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['form-dd2'] || false}
                        onCheckedChange={() => toggle('form-dd2')}
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
                        onCheckedChange={() => toggle('lor-drafted')}
                      />
                      <Label>Drafted and sent to management (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['lor-received'] || false}
                        onCheckedChange={() => toggle('lor-received')}
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
                        onCheckedChange={() => toggle('shareholder-confirmation')}
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
                        onCheckedChange={() => toggle('shareholder-draft')}
                      />
                      <Label>Draft shareholder's resolution</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['shareholder-signed'] || false}
                        onCheckedChange={() => toggle('shareholder-signed')}
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
                        onCheckedChange={() => toggle('director-draft')}
                      />
                      <Label>Draft director's resolution</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['director-signed'] || false}
                        onCheckedChange={() => toggle('director-signed')}
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
                        onCheckedChange={() => toggle('going-concern-letter')}
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
                        onCheckedChange={() => toggle('related-parties-drafted')}
                      />
                      <Label>Related parties letter drafted and sent to management.</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['related-parties-confirmed'] || false}
                        onCheckedChange={() => toggle('related-parties-confirmed')}
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
                        onCheckedChange={() => toggle('external-confirmations-sent')}
                      />
                      <Label>External confirmation letters (e.g., bank, receivables) drafted and sent.</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['external-confirmations-received'] || false}
                        onCheckedChange={() => toggle('external-confirmations-received')}
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
                        onCheckedChange={() => toggle('management-letter-draft')}
                      />
                      <Label>Draft letter of management comments prepared</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['management-letter-sent'] || false}
                        onCheckedChange={() => toggle('management-letter-sent')}
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
                        onCheckedChange={() => toggle('adjustments-discussed-client')}
                      />
                      <Label>Audit adjustments discussed with client</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['adjustments-approved'] || false}
                        onCheckedChange={() => toggle('adjustments-approved')}
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
                        onCheckedChange={() => toggle('draft-management-letter')}
                      />
                      <Label>Draft Management Letter</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['finalized-management-letter'] || false}
                        onCheckedChange={() => toggle('finalized-management-letter')}
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
                        onCheckedChange={() => toggle('post-audit-meeting')}
                      />
                      <Label>Post-audit meeting scheduled with client (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['client-feedback'] || false}
                        onCheckedChange={() => toggle('client-feedback')}
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
                        onCheckedChange={() => toggle('audit-file-archived')}
                      />
                      <Label>Audit file archived</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['closure-meeting'] || false}
                        onCheckedChange={() => toggle('closure-meeting')}
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
                        onCheckedChange={() => toggle('signed-documents')}
                      />
                      <Label>Signed documents obtained from the client (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['documentation-rearranged'] || false}
                        onCheckedChange={() => toggle('documentation-rearranged')}
                      />
                      <Label>Documentation re-arranged and prepared for submission</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['counter-signed-docs'] || false}
                        onCheckedChange={() => toggle('counter-signed-docs')}
                      />
                      <Label>Counter-signed documents sent to the client (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['mbr-submission'] || false}
                        onCheckedChange={() => toggle('mbr-submission')}
                      />
                      <Label>Submission completed with MBR (Date: __________)</Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        checked={checklist['final-billing'] || false}
                        onCheckedChange={() => toggle('final-billing')}
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
