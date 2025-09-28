// @ts-nocheck
import { useTrialBalance } from "@/hooks/useTrialBalance";
import { useDocumentRequests } from "@/hooks/useDocumentRequests";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { engagementApi } from "@/services/api";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Briefcase,
  FileText,
  CheckCircle,
  Library,
  BarChart3,
  Shield,
} from "lucide-react";
import { initializeSocket } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { PerEngagementKPIDashboard } from "../../components/kpi/PerEngagementKPIDashboard";
import { LibraryTab } from "@/components/engagement/LibraryTab";
import { TrialBalanceTab } from "@/components/engagement/TrialBalanceTab";
import { DocumentRequestsTab } from "@/components/engagement/DocumentRequestsTab";
import { ProceduresTab } from "@/components/procedures/ProceduresTab";
import { ChecklistTab } from "@/components/engagement/ChecklistTab";
import { KYCManagement } from "@/components/kyc/KYCManagement";
import PbcDialog from "@/components/pbc/PbcDialog";
import { useActivityLogger } from "@/hooks/useActivityLogger";

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
  const [loading, setLoading] = useState(true);

  const {
    loading: tbLoading,
    fetchTrialBalance,
    getTrialBalance,
  } = useTrialBalance();
  const { requests, createRequest } = useDocumentRequests(id);
  const { toast } = useToast();

  const [isPBCModalOpen, setIsPBCModalOpen] = useState<boolean>(false);

  const handleOpenPBC = () => {
    // setSelectedEngagement(engagement);
    setIsPBCModalOpen(true);
  };

  const handleClosePBC = () => {
    setIsPBCModalOpen(false);
  };
  const { logViewEngagement, logUploadDocument, logUpdateEngagement } = useActivityLogger();

  useEffect(() => {
    const fetchEngagement = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const engagementData = await engagementApi.getById(id);
        setEngagement(engagementData);

        // Log engagement view
        logViewEngagement(`Viewed engagement details for: ${engagementData.title}`);

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
  }, [id, logViewEngagement]);

  if (loading || !engagement) {
    return (
      <div className="flex items-center justify-center h-64 sm:h-[40vh]">
        <EnhancedLoader size="lg" text="Loading..." />
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

      // Log trial balance upload
      logUploadDocument(`Uploaded trial balance for engagement: ${engagement?.title}`);

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
      
      // Log document request creation
      logUploadDocument(`Created document request: ${documentRequest.category} for engagement: ${engagement?.title}`);
      
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
      case "completed":
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200";
      case "draft":
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200";
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="rounded-xl border-gray-200 hover:bg-gray-50"
              aria-label="Back to engagements"
            >
              <Link to="/employee/engagements">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900">{engagement.title}</h1>
                <p className="text-gray-700">Engagement Details</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
          <Tabs defaultValue="overview" className="space-y-6">
            <div className="bg-gray-50 border-b border-gray-200 p-6 flex justify-between">
              <div className="overflow-x-auto overflow-y-hidden -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent sm:scrollbar-none">
                <TabsList className="min-w-max sm:min-w-0 bg-white border border-gray-200 rounded-xl p-1">
                  <TabsTrigger
                    value="overview"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="trial-balance"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Audit
                  </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="whitespace-nowrap rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Document Requests
                </TabsTrigger>
                <TabsTrigger
                  value="procedures"
                  className="whitespace-nowrap rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Procedures
                </TabsTrigger>
                <TabsTrigger
                  value="checklist"
                  className="whitespace-nowrap rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger
                  value="library"
                  className="whitespace-nowrap rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Library className="h-4 w-4 mr-2" />
                  Library
                </TabsTrigger>
                <TabsTrigger
                  value="kyc"
                  className="whitespace-nowrap rounded-lg data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  KYC
                </TabsTrigger>
              </TabsList>
            </div>
            {/* <button onClick={handleOpenPBC} className="px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900">
              See the PBC Work Flow
            </button> */}
          </div>

          <div className="p-6">
            <TabsContent value="overview" className="space-y-6">
              <PerEngagementKPIDashboard engagementId={id} />
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <LibraryTab engagement={engagement} requests={requests} />
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
                engagement={engagement}
              />
            </TabsContent>

            <TabsContent value="procedures" className="space-y-6">
              <ProceduresTab engagement={engagement} />
            </TabsContent>

            <TabsContent value="checklist" className="space-y-6">
              <ChecklistTab engagementId={id!} />
            </TabsContent>

            <TabsContent value="kyc" className="space-y-6">
              <KYCManagement engagementId={id!} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {isPBCModalOpen && (
        <PbcDialog
          selectedEngagement={engagement}
          open={isPBCModalOpen}
          onOpenChange={setIsPBCModalOpen}
          onClosePBC={handleClosePBC}
        />
      )}
      </div>
    </div>
  );
};
