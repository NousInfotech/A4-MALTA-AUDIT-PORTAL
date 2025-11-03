import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { PBCWorkflow } from "@/types/pbc"; // Assuming PBCWorkflow type is correctly defined
import { useAuth } from "@/contexts/AuthContext";
import { generateQnaAI, pbcApi } from "@/lib/api/pbc-workflow";
import { toast } from "sonner";
import { CreatePBCDialog } from "./CreatePBCDialog";
import { getPBCStatusLabel } from "@/lib/statusLabels";

const statusColors = {
  "document-collection": "bg-brand-hover",
  "qna-preparation": "bg-gray-700",
  "client-responses": "bg-gray-600",
  "doubt-resolution": "bg-gray-500",
  submitted: "bg-brand-sidebar",
};

const statusIcons = {
  "document-collection": FileText,
  "qna-preparation": MessageSquare,
  "client-responses": Clock,
  "doubt-resolution": AlertCircle,
  submitted: CheckCircle,
};

interface PBCDashboardProps {
  userRole: "employee" | "client" | "admin";
  onSelectWorkflow: (workflow: PBCWorkflow) => void;
  selectedEngagement: any; // Consider creating a more specific type for selectedEngagement
}

export function PBCDashboard({
  userRole,
  onSelectWorkflow,
  selectedEngagement,
}: PBCDashboardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [workflows, setWorkflows] = useState<PBCWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [engagementFilter, setEngagementFilter] = useState<boolean>(false); // New state for engagement filter
  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const fetchDocumentRequests = async () => {
    try {
      if (selectedEngagement?.id) {
        const existed_document_request = await pbcApi.getPbcDocumentRequests(
          selectedEngagement.id
        );

        // Scenario 1: No existing document requests
        if (existed_document_request.length < 1) {
          console.log(
            "No existing PBC document requests found. Creating a new one."
          );
          const new_document_request = await pbcApi.createPbcDocumentRequests({
            engagementId: selectedEngagement.id,
            name: selectedEngagement.title,
            description: selectedEngagement.title,
            requiredDocuments: [],
          });
          setDocumentRequests([new_document_request]);
          toast.success("New PBC document request created.");
        }
        // Scenario 2: More than one existing document request (duplicates)
        else if (existed_document_request.length > 1) {
          console.warn(
            "Multiple PBC document requests found for this engagement. Deleting duplicates and creating a single new one."
          );
          toast.info("Cleaning up duplicate PBC document requests...");

          // Delete all existing document requests
          const deletePromises = existed_document_request.map(
            async (docReq: any) => {
              try {
                await pbcApi.deletePbcDocumentRequests(docReq._id);
                console.log(
                  `Deleted duplicate document request: ${docReq._id}`
                );
              } catch (deleteError) {
                console.error(
                  `Error deleting document request ${docReq._id}:`,
                  deleteError
                );
                toast.error(
                  `Failed to delete a duplicate document request: ${docReq._id}`
                );
              }
            }
          );
          await Promise.all(deletePromises);
          toast.success("Duplicate PBC document requests cleared.");

          // After deleting all, create a single new one
          const new_document_request = await pbcApi.createPbcDocumentRequests({
            engagementId: selectedEngagement.id,
            name: selectedEngagement.title,
            description: selectedEngagement.title,
            requiredDocuments: [],
          });
          setDocumentRequests([new_document_request]);
          toast.success("A single new PBC document request has been created.");
        }
        // Scenario 3: Exactly one existing document request (ideal case)
        else {
          console.log("Exactly one PBC document request found. Using it.");
          setDocumentRequests(existed_document_request);
        }
      }
    } catch (error) {
      console.error("Error fetching or managing document requests:", error);
      toast.error("Failed to load or manage document requests.");
    }
  };

  useEffect(() => {
    if (selectedEngagement) {
      fetchDocumentRequests();
    }
  }, [selectedEngagement]);

  useEffect(() => {
    loadWorkflows();
  }, [statusFilter, engagementFilter, selectedEngagement]); // Add engagementFilter to dependency array

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const params: { status?: string; clientId?: string } = {};
      if (statusFilter) params.status = statusFilter;
      // Add clientId to the filter if available from selectedEngagement
      if (selectedEngagement?.clientId)
        params.clientId = selectedEngagement.clientId;

      let data = await pbcApi.getAllPBCWorkflows(params);

      // Apply engagement filter if active
      if (engagementFilter && selectedEngagement?.id) {
        data = data.filter(
          (workflow: PBCWorkflow) =>
            workflow.engagement._id === selectedEngagement.id
        );
      }

      setWorkflows(data);
      console.log("work-flows", data);
    } catch (error) {
      console.error("Error loading workflows:", error);
      toast.error("Failed to load PBC Workflows.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusLabel = (status: string) => {
    return getPBCStatusLabel(status);
  };

  const handleGenerateQnaAi = async (
    event: React.MouseEvent,
    pbcId: string
  ) => {
    event.stopPropagation();
    try {
      const response = await generateQnaAI(pbcId);
      console.log("aidata", response);
    } catch (error) {
      console.log(error);
    }
  };

  if (authLoading) {
    return <div>Loading authentication...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">PBC Workflows</h1>
          <p className="text-gray-600 mt-2">Manage client audit preparations</p>
        </div>
        {(userRole === "employee" || userRole === "admin") && (
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 bg-brand-hover hover:bg-brand-active text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
            disabled={!selectedEngagement} // Disable if no engagement or no document requests
          >
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <span className="text-sm font-medium text-gray-700">Filter by :</span>
        <div className="flex gap-2">
          <Button
            variant={
              statusFilter === "" && !engagementFilter ? "default" : "outline"
            }
            size="sm"
            onClick={() => {
              setStatusFilter("");
              setEngagementFilter(false);
            }}
            className={`transition-all duration-300 rounded-xl ${
              statusFilter === "" && !engagementFilter
                ? "bg-brand-hover hover:bg-brand-active text-white border-0 shadow-lg"
                : "border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            }`}
          >
            All
          </Button>
          <Button
            variant={engagementFilter ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setEngagementFilter(!engagementFilter);
              setStatusFilter(""); // Reset status filter when toggling engagement filter
            }}
            className={`transition-all duration-300 rounded-xl ${
              engagementFilter
                ? "bg-brand-hover hover:bg-brand-active text-white border-0 shadow-lg"
                : "border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
            }`}
          >
            Engagement
          </Button>
          {Object.keys(statusColors).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter(status);
                setEngagementFilter(false); // Reset engagement filter when toggling status filter
              }}
              className={`transition-all duration-300 rounded-xl ${
                statusFilter === status
                  ? "bg-brand-hover hover:bg-brand-active text-white border-0 shadow-lg"
                  : "border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900"
              }`}
            >
              {getStatusLabel(status)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => {
            const StatusIcon = statusIcons[workflow.status];
            return (
              <Card
                key={workflow._id}
                className="group bg-white/60 backdrop-blur-md border border-white/30 hover:border-gray-300/50 rounded-2xl shadow-lg shadow-gray-300/30 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer"
                onClick={() => onSelectWorkflow(workflow)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">
                      {workflow.engagement.title}
                    </span>
                    <StatusIcon className="h-5 w-5 text-gray-500" />
                  </CardTitle>
                  <div className="flex items-center justify-between">
                    <Badge
                      className={`${statusColors[workflow.status]} text-white`}
                    >
                      {getStatusLabel(workflow.status)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {formatDate(workflow.engagement.yearEndDate)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Documents(PBC):</span>
                      <span className="font-medium">
                        {workflow.documentRequests[0]?.documents?.length}
                      </span>
                    </div>
                    {/* Assuming categories are populated as an array of objects or IDs */}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Categories(PBC):</span>
                      <span className="font-medium">
                        {new Set(
                          workflow.documentRequests.map((dr) => dr.category)
                        ).size || 0}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium">
                        {formatDate(workflow.createdAt)}
                      </span>
                    </div>
                    {/* <button
                      onClick={(e) => handleGenerateQnaAi(e, workflow._id)}
                      disabled={workflow.status !== "qna-preparation"}
                      className="text-sm px-4 py-1 rounded-full bg-indigo-500 hover:brightness-110 disabled:opacity-50"
                    >
                      Q&A&nbsp;with&nbsp;AI
                    </button> */}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {workflows.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No workflows found
          </h3>
          <p className="text-gray-600 mb-6">
            {statusFilter
              ? `No workflows with status "${getStatusLabel(statusFilter)}"`
              : engagementFilter && selectedEngagement
              ? `No workflows for engagement "${selectedEngagement.title}"`
              : "Get started by creating your first PBC workflow"}
          </p>
          {!statusFilter &&
            !engagementFilter &&
            (userRole === "employee" || userRole === "admin") && (
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 bg-brand-hover hover:bg-brand-active text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                disabled={!selectedEngagement}
              >
                <Plus className="h-4 w-4" />
                Create Workflow
              </Button>
            )}
        </div>
      )}

      <CreatePBCDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        selectedEngagement={selectedEngagement}
        documentRequests={documentRequests}
        loadWorkflows={loadWorkflows}
      />
    </div>
  );
}


