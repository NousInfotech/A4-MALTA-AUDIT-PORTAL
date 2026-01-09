import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { engagementApi } from "@/services/api";
import { useTrialBalance } from "@/hooks/useTrialBalance";
import { useDocumentRequests } from "@/hooks/useDocumentRequests";
import {
  ArrowLeft,
  Briefcase,
  FileText,
  BookA,
} from "lucide-react";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { ClientDocumentRequestsTab } from "@/pages/client/engagement-details/components/ClientDocumentRequestsTab";
import { ClientAuditSectionTab } from "@/pages/client/engagement-details/components/ClientAuditSectionTab";

export const ClientEngagementDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [engagement, setEngagement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("audit");

  const { trialBalance, loading: tbLoading } = useTrialBalance(id);
  const { requests, loading: requestsLoading } = useDocumentRequests(id);

  useEffect(() => {
    const fetchEngagement = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await engagementApi.getById(id);
        setEngagement(data);
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
  }, [id, toast]);

  if (loading || !engagement) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-body">
        <EnhancedLoader size="lg" text="Loading engagement..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl bg-white border border-gray-200"
              onClick={() => navigate("/client/engagements")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-brand-body">
                  {engagement.title}
                </h1>
                <p className="text-sm text-gray-600">
                  Read-only view of your audit engagement
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-gray-50/50 border-b border-gray-200 p-4 rounded-t-2xl">
              <TabsList className="bg-white border border-gray-200 p-1 rounded-xl">
                <TabsTrigger
                  value="audit"
                  className="rounded-lg data-[state=active]:bg-gray-900 data-[state=active]:text-white"
                >
                  <BookA className="h-4 w-4 mr-2" />
                  Audit Section
                </TabsTrigger>
                <TabsTrigger
                  value="requests"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Document Requests
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="requests" className="mt-0">
                <ClientDocumentRequestsTab 
                  engagementId={id!} 
                  requests={requests}
                  loading={requestsLoading}
                  engagement={engagement}
                />
              </TabsContent>
              <TabsContent value="audit" className="mt-0">
                <ClientAuditSectionTab 
                  engagement={engagement} 
                  trialBalanceData={trialBalance}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};
