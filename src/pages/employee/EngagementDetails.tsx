// @ts-nocheck
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
import { ArrowLeft, Building2, Calendar } from 'lucide-react';
import { initializeSocket } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { OverviewTab } from "@/components/engagement/OverviewTab";
import { LibraryTab } from "@/components/engagement/LibraryTab";
import { TrialBalanceTab } from "@/components/engagement/TrialBalanceTab";
import { DocumentRequestsTab } from "@/components/engagement/DocumentRequestsTab";
import { ProceduresTab } from "@/components/engagement/ProceduresTab";
import { ChecklistTab } from "@/components/engagement/ChecklistTab";

export const EngagementDetails = () => {
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) return;
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

        try {
          const tbData = await engagementApi.getTrialBalance(id);
          setTrialBalanceData(tbData);
        } catch {
          // ignore if no TB
        }

        if (engagementData.trialBalanceUrl) {
          setTrialBalanceUrl(engagementData.trialBalanceUrl);
        }
      } catch {
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
      <div className="flex items-center justify-center h-64 sm:h-[40vh]">
        <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
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
        description: error?.message || "Failed to upload trial balance",
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
    } catch {
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
    } catch {
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="sm:mr-4"
            aria-label="Back to engagements"
          >
            <Link to="/employee/engagements">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground break-words">
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

          <div className="flex flex-wrap items-center gap-4 mt-2 text-muted-foreground">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">Client ID: {engagement.clientId}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs with visible scrollbar on mobile */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto overflow-y-hidden -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent sm:scrollbar-none">
          <TabsList className="min-w-max sm:min-w-0">
            <TabsTrigger value="overview" className="whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="trial-balance" className="whitespace-nowrap">Audit</TabsTrigger>
            <TabsTrigger value="requests" className="whitespace-nowrap">Document Requests</TabsTrigger>
            <TabsTrigger value="procedures" className="whitespace-nowrap">Procedures</TabsTrigger>
            <TabsTrigger value="checklist" className="whitespace-nowrap">Checklist</TabsTrigger>
            <TabsTrigger value="library" className="whitespace-nowrap">Library</TabsTrigger>
          </TabsList>
        </div>

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
            setEngagement={setEngagement}
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
          <ChecklistTab engagementId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
