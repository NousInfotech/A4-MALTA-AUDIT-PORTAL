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
import { ArrowLeft, Building2, Calendar, Briefcase, FileText, CheckCircle, Library, BarChart3 } from 'lucide-react';
import { initializeSocket } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { OverviewTab } from "@/components/engagement/OverviewTab";
import { LibraryTab } from "@/components/engagement/LibraryTab";
import { TrialBalanceTab } from "@/components/engagement/TrialBalanceTab";
import { DocumentRequestsTab } from "@/components/engagement/DocumentRequestsTab";
import { ProceduresTab } from "@/components/procedures/ProceduresTab";
import { ChecklistTab } from "@/components/engagement/ChecklistTab";
import { EnhancedReviewNotesPanel } from "@/components/review-notes/EnhancedReviewNotesPanel";

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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200';
      case 'completed':
        return 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200';
      case 'draft':
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Button
                variant="outline"
                size="icon"
                asChild
                className="w-12 h-12 bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
                aria-label="Back to engagements"
              >
                <Link to="/employee/engagements">
                  <ArrowLeft className="h-5 w-5 text-blue-600" />
                </Link>
              </Button>
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent break-words">
                    {engagement.title}
                  </h1>
                  <Badge
                    variant="outline"
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${getStatusStyle(engagement.status)}`}
                  >
                    {engagement.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-6 text-slate-600">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">Client ID: {engagement.clientId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium">Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Notes Panel */}
      <EnhancedReviewNotesPanel 
        pageId={`engagement-${id}`} 
        pageName={`Engagement: ${engagement?.title || 'Details'}`}
        engagementId={id}
        selectedEngagement={engagement}
      />

      {/* Tabs Section */}
      <div className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50 p-6">
            <div className="overflow-x-auto overflow-y-hidden -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-blue-300 scrollbar-track-transparent sm:scrollbar-none">
              <TabsList className="min-w-max sm:min-w-0 bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-1">
                <TabsTrigger 
                  value="overview" 
                  className="whitespace-nowrap rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="trial-balance" 
                  className="whitespace-nowrap rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Audit
                </TabsTrigger>
                <TabsTrigger 
                  value="requests" 
                  className="whitespace-nowrap rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Document Requests
                </TabsTrigger>
                <TabsTrigger 
                  value="procedures" 
                  className="whitespace-nowrap rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Procedures
                </TabsTrigger>
                <TabsTrigger 
                  value="checklist" 
                  className="whitespace-nowrap rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger 
                  value="library" 
                  className="whitespace-nowrap rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Library className="h-4 w-4 mr-2" />
                  Library
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <div className="p-6">
            <TabsContent value="overview" className="space-y-6">
              <OverviewTab
                engagement={engagement}
                requests={requests}
              />
              <EnhancedReviewNotesPanel 
                pageId={`engagement-${id}-overview`} 
                pageName={`Overview - ${engagement?.title || 'Details'}`}
                engagementId={id}
              />
            </TabsContent>

            <TabsContent value="library" className="space-y-6">
              <LibraryTab
                engagement={engagement}
                requests={requests}
              />
              <EnhancedReviewNotesPanel 
                pageId={`engagement-${id}-library`} 
                pageName={`Library - ${engagement?.title || 'Details'}`}
                engagementId={id}
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
              <EnhancedReviewNotesPanel 
                pageId={`engagement-${id}-audit`} 
                pageName={`Audit - ${engagement?.title || 'Details'}`}
                engagementId={id}
              />
            </TabsContent>

            <TabsContent value="requests" className="space-y-6">
              <DocumentRequestsTab
                requests={requests}
                documentRequest={documentRequest}
                setDocumentRequest={setDocumentRequest}
                handleSendDocumentRequest={handleSendDocumentRequest}
              />
              <EnhancedReviewNotesPanel 
                pageId={`engagement-${id}-requests`} 
                pageName={`Document Requests - ${engagement?.title || 'Details'}`}
                engagementId={id}
              />
            </TabsContent>

            <TabsContent value="procedures" className="space-y-6">
              <ProceduresTab
                engagement={engagement}
              />
              <EnhancedReviewNotesPanel 
                pageId={`engagement-${id}-procedures`} 
                pageName={`Procedures - ${engagement?.title || 'Details'}`}
                engagementId={id}
              />
            </TabsContent>

            <TabsContent value="checklist" className="space-y-6">
              <ChecklistTab engagementId={id!} />
              <EnhancedReviewNotesPanel 
                pageId={`engagement-${id}-checklist`} 
                pageName={`Checklist - ${engagement?.title || 'Details'}`}
                engagementId={id}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};
