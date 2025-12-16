// @ts-nocheck
import { useTrialBalance } from "@/hooks/useTrialBalance";
import { useDocumentRequests } from "@/hooks/useDocumentRequests";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
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
  BookOpenText,
  Delete,
  Pencil,
  Users,
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
import { EngagementKYC } from "./EngagementKYC";
import { TeamTab } from "@/components/engagement/TeamTab";
import PbcDialog from "@/components/pbc/PbcDialog";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import WorkBookApp from "@/components/audit-workbooks/WorkBookApp";
import { UpdateEngagementDialog } from "@/components/engagement/UpdateEngagementDialog";
import { useEngagements } from "@/hooks/useEngagements";
import { DeleteClientConfirmation } from "@/components/client/DeleteClientConfirmation";
import { IconReport } from "@tabler/icons-react";
import FinancialStatusReport from "@/components/fs-review/FinancialStatusReport";
import FinancialReportParent from "@/components/engagement/FinancialReportParent";

export const EngagementDetails = () => {
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) return;
      const token = data.session?.access_token;
      if (token) initializeSocket(token);
    });
  }, []);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = searchParams.get("section") || "overview";
  const [engagement, setEngagement] = useState<any>(null);
  const [trialBalanceUrl, setTrialBalanceUrl] = useState("");
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [documentRequest, setDocumentRequest] = useState({
    category: "",
    description: "",
    comment: "",
  });
  const [loading, setLoading] = useState(true);
  const [clientCompanyName, setClientCompanyName] = useState<string>("");

  const {
    loading: tbLoading,
    fetchTrialBalance,
    getTrialBalance,
  } = useTrialBalance();
  const { requests, createRequest } = useDocumentRequests(id);
  const { toast } = useToast();
  const { updateEngagement } = useEngagements();

  const [isPBCModalOpen, setIsPBCModalOpen] = useState<boolean>(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState<boolean>(false);

  const handleOpenPBC = () => {
    // setSelectedEngagement(engagement);
    setIsPBCModalOpen(true);
  };

  const handleClosePBC = () => {
    setIsPBCModalOpen(false);
  };
  const { logViewEngagement, logUploadDocument, logUpdateEngagement } = useActivityLogger();

  useEffect(() => {
    if (!searchParams.get("section")) {
      setSearchParams({ section: "overview" }, { replace: true });
    }

  }, []);

  const handleTabChange = (value: string) => {
    setSearchParams({ section: value }, { replace: false });
  };

  useEffect(() => {
    const fetchEngagement = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const engagementData = await engagementApi.getById(id);
        setEngagement(engagementData);
        console.log(engagement);

        // Log engagement view
        logViewEngagement(`Viewed engagement details for: ${engagementData.title}`);

        // Fetch client company name
        try {
          const { data: clientData, error: clientError } = await supabase
            .from('profiles')
            .select('company_name')
            .eq('user_id', engagementData.clientId)
            .single();

          if (!clientError && clientData) {
            setClientCompanyName(clientData.company_name || "");
          }
        } catch (error) {
          console.log("Could not fetch client company name:", error);
        }

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
        comment: documentRequest.comment,
        clientId: engagement.clientId,
      });
      setDocumentRequest({ category: "", description: "", comment: "" });

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
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl bg-white border border-gray-200 text-brand-body hover:bg-gray-100 hover:text-brand-body shadow-sm"
              aria-label="Back to engagements"
              onClick={() => {
                const procedureType = searchParams.get("procedureType");
                const mode = searchParams.get("mode");
                const step = searchParams.get("step");

                // If in tabs view (step === "tabs"), go back to questions step
                if (procedureType && step === "tabs") {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.set("step", "1"); // Go back to questions step (step 1)
                  setSearchParams(newParams, { replace: false });
                  return;
                }

                // If in a numbered step, go back one step or to mode selection
                if (procedureType && mode && step) {
                  const stepNum = parseInt(step, 10);
                  const newParams = new URLSearchParams(searchParams);

                  if (stepNum > 0) {
                    // Go back one step
                    newParams.set("step", (stepNum - 1).toString());
                  } else {
                    // At step 0, go back to mode selection (clear step and mode)
                    newParams.delete("step");
                    newParams.delete("mode");
                  }
                  setSearchParams(newParams, { replace: false });
                  return;
                }

                // If at mode selection (mode exists but no step), clear mode
                if (procedureType && mode && !step) {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("mode");
                  setSearchParams(newParams, { replace: false });
                  return;
                }

                // If at procedure type selection (procedureType exists but no mode), clear procedureType
                if (procedureType && !mode) {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("procedureType");
                  setSearchParams(newParams, { replace: false });
                  return;
                }

                // Otherwise, navigate back normally
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate(`/employee/engagements?section=${section}`);
                }
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                <Briefcase className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-semibold text-brand-body break-words">{engagement.title}</h1>
                {clientCompanyName && (
                  <p className="text-sm sm:text-base text-gray-600 mt-1 font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 flex-shrink-0" />
                    {clientCompanyName}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  variant="default"
                  size="sm"
                  asChild
                >
                  <Link to={`/employee/clients/${engagement.clientId}/company/${
                    typeof engagement.companyId === 'object' 
                      ? engagement.companyId?._id 
                      : engagement.companyId
                  }`}>
                     <Building2 className="h-4 w-4 mr-2" />
                     View Company
                  </Link>
                </Button>

                <Button
                  onClick={() => setIsUpdateDialogOpen(true)}
                  className="rounded-xl w-full sm:w-auto"
                  size="sm"
                >
                  <Pencil />
                  Update Engagement
                </Button>

                <DeleteClientConfirmation
                  clientName={engagement.title}
                  onConfirm={() => {
                    // No logic, just show popup
                    console.log("Delete confirmed for:", engagement.title);
                  }}
                  isLoading={false}
                >
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 rounded-xl w-full sm:w-auto"
                  >
                    <Delete className="h-4 w-4 mr-2" />
                    Delete Engagement
                  </Button>
                </DeleteClientConfirmation>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
          <Tabs value={section} onValueChange={handleTabChange} className="space-y-6">
            <div className="bg-gray-50 border-b border-gray-200 p-6 flex justify-between">
              <div className="overflow-x-auto overflow-y-hidden -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent sm:scrollbar-none">
                <TabsList className="min-w-max sm:min-w-0 bg-white border border-gray-200 rounded-xl p-1">
                  <TabsTrigger
                    value="overview"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>

                  <TabsTrigger
                    value="checklist"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Checklist
                  </TabsTrigger>

                  <TabsTrigger
                    value="requests"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Document Requests
                  </TabsTrigger>


                  <TabsTrigger
                    value="trial-balance"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Audit
                  </TabsTrigger>

                  <TabsTrigger
                    value="procedures"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Procedures
                  </TabsTrigger>


                  <TabsTrigger
                    value="library"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    <Library className="h-4 w-4 mr-2" />
                    Library
                  </TabsTrigger>

                  <TabsTrigger
                    value="team"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Team
                  </TabsTrigger>

                  <TabsTrigger
                    value="financial-status-report"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    <IconReport className="h-4 w-4 mr-2" />
                     AI Review
                  </TabsTrigger>

                  {/* <TabsTrigger
                    value="kyc"
                    className="whitespace-nowrap rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    KYC
                  </TabsTrigger> */}
                </TabsList>
              </div>
              {/* <button onClick={handleOpenPBC} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary">
              See the PBC Work Flow
            </button> */}
            </div>

            <div className="p-6 h-[calc(100vh-200px)] overflow-y-auto">
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

              <TabsContent value="financial-status-report" className="space-y-6">
                <FinancialReportParent engagementId={id} />
              </TabsContent>

              <TabsContent value="kyc" className="space-y-6">
                <EngagementKYC />
              </TabsContent>

              <TabsContent value="team" className="space-y-6">
                <TeamTab engagementId={id!} />
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

        <UpdateEngagementDialog
          open={isUpdateDialogOpen}
          onOpenChange={setIsUpdateDialogOpen}
          engagement={engagement}
          onUpdate={async (id, data) => {
            const updated = await updateEngagement(id, data);
            setEngagement(updated);
            // Refetch engagement data to ensure consistency
            const engagementData = await engagementApi.getById(id);
            setEngagement(engagementData);
          }}
        />
      </div>
    </div>
  );
};
