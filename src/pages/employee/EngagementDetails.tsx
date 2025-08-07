import { useChecklist } from "@/hooks/useChecklist";
import { useTrialBalance } from "@/hooks/useTrialBalance";
import { useDocumentRequests } from "@/hooks/useDocumentRequests";
import { useProcedures } from "@/hooks/useProcedures";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { engagementApi } from "@/services/api";
import { ArrowLeft, Building2, Calendar, Loader2 } from 'lucide-react';

// Import modular components
import { OverviewTab } from "@/components/engagement/OverviewTab";
import { LibraryTab } from "@/components/engagement/LibraryTab";
import { TrialBalanceTab } from "@/components/engagement/TrialBalanceTab";
import { DocumentRequestsTab } from "@/components/engagement/DocumentRequestsTab";
import { ProceduresTab } from "@/components/engagement/ProceduresTab";
import { ChecklistTab } from "@/components/engagement/ChecklistTab";
import { initializeSocket } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";

  

export const EngagementDetails = () => {
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      const token = data.session?.access_token;
      if (token) initializeSocket(token);
    });
  }, []);
  const { id } = useParams<{ id: string }>();
  const [engagement, setEngagement] = useState<any>(null);
  const [trialBalanceUrl, setTrialBalanceUrl] = useState("");
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [documentRequest, setDocumentRequest] = useState({
    category: "",
    description: "",
  });
  const [isGeneratingProcedures, setIsGeneratingProcedures] = useState(false);
  const [loading, setLoading] = useState(true);

  const { checklist, toggle } = useChecklist(id);
  const {
    loading: tbLoading,
    fetchTrialBalance,
    getTrialBalance,
  } = useTrialBalance();
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
        try {
          const tbData = await engagementApi.getTrialBalance(id);
          setTrialBalanceData(tbData);
        } catch (error) {
          // Trial balance might not exist yet
          console.log('No trial balance found');
        }
        
        if (engagementData.trialBalanceUrl) {
          setTrialBalanceUrl(engagementData.trialBalanceUrl);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch engagement details",
          variant: "destructive",
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
    if (!trialBalanceUrl.includes("docs.google.com/spreadsheets")) {
      toast({
        title: "Invalid URL",
        description: "Please provide a valid Google Sheets URL",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await engagementApi.fetchTrialBalance(id!, trialBalanceUrl);
      setTrialBalanceData(data);
      
      // Update engagement with trial balance URL
      await engagementApi.update(id!, {
        trialBalanceUrl,
        status: "active",
      });
      
      setEngagement((prev) => ({
        ...prev,
        trialBalanceUrl,
        status: "active",
      }));
      
      toast({
        title: "Success",
        description: "Trial balance uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload trial balance",
        variant: "destructive",
      });
    }
  };

  const handleSendDocumentRequest = async () => {
    if (!documentRequest.category || !documentRequest.description) {
      toast({
        title: "Missing information",
        description: "Please select a category and provide a description",
        variant: "destructive",
      });
      return;
    }

    try {
      await createRequest({
        category: documentRequest.category,
        description: documentRequest.description,
        clientId: engagement.clientId,
      });
      setDocumentRequest({ category: "", description: "" });
      toast({
        title: "Success",
        description: "Document request sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send document request",
        variant: "destructive",
      });
    }
  };

  const handleGenerateProcedures = async () => {
    setIsGeneratingProcedures(true);
    try {
      // Simulate AI generation delay
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const mockTasks = [
        {
          description:
            "Have all balances been reconciled to supporting documentation?",
          category: documentRequest.category || "General",
        },
        {
          description:
            "Are there any unusual or significant transactions identified?",
          category: documentRequest.category || "General",
        },
        {
          description: "Have adequate controls been implemented and tested?",
          category: documentRequest.category || "General",
        },
      ];

      await createProcedure({
        title: `${documentRequest.category || "General"} Audit Procedures`,
        tasks: mockTasks,
      });
      
      toast({
        title: "Success",
        description: "Procedures generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate procedures",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingProcedures(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-foreground">
              {engagement.title}
            </h1>
            <Badge
              variant="outline"
              className={
                engagement.status === "active"
                  ? "text-success border-success"
                  : engagement.status === "completed"
                  ? "text-muted border-muted"
                  : "text-warning border-warning"
              }
            >
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
              <span>
                Year End:{" "}
                {new Date(engagement.yearEndDate).toLocaleDateString()}
              </span>
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
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            engagement={engagement}
            requests={requests}
            procedures={procedures}
            handleGenerateProcedures={handleGenerateProcedures}
            isGeneratingProcedures={isGeneratingProcedures}
          />
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <LibraryTab
            engagement={engagement}
            requests={requests}
            procedures={procedures}
            handleGenerateProcedures={handleGenerateProcedures}
            isGeneratingProcedures={isGeneratingProcedures}
          />
        </TabsContent>

        <TabsContent value="trial-balance" className="space-y-6">
          <TrialBalanceTab
            engagement={engagement}
            trialBalanceUrl={trialBalanceUrl}
            setTrialBalanceUrl={setTrialBalanceUrl}
            trialBalanceData={trialBalanceData}
            handleUploadTrialBalance={handleUploadTrialBalance}
            tbLoading={tbLoading}
          />
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <DocumentRequestsTab
            requests={requests}
            documentRequest={documentRequest}
            setDocumentRequest={setDocumentRequest}
            handleSendDocumentRequest={handleSendDocumentRequest}
          />
        </TabsContent>

        <TabsContent value="procedures" className="space-y-6">
          <ProceduresTab
            procedures={procedures}
            handleGenerateProcedures={handleGenerateProcedures}
            isGeneratingProcedures={isGeneratingProcedures}
          />
        </TabsContent>

        <TabsContent value="checklist" className="space-y-6">
          <ChecklistTab
            checklist={checklist}
            toggle={toggle}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
