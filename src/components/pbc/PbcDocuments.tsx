import { useState, useEffect, useMemo } from "react";
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
  FolderOpen,
  Download,
  Eye, 
  EyeOff, 
} from "lucide-react";
import { PBCWorkflow } from "@/types/pbc";
import { useAuth } from "@/contexts/AuthContext";
import { pbcApi } from "@/lib/api/pbc-workflow";
import { toast } from "sonner";
import { CreatePBCDialog } from "./CreatePBCDialog";
import { getPBCStatusLabel } from "@/lib/statusLabels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import PbcManager from "./PbcManager";
import { Separator } from "../ui/separator";

const statusColors = {
  "document-collection": "bg-gray-800",
  "qna-preparation": "bg-gray-700",
  "client-responses": "bg-gray-600",
  "doubt-resolution": "bg-gray-500",
  submitted: "bg-gray-900",
};

const documentStatusColors = {
  pending: "bg-yellow-500",
  uploaded: "bg-blue-500",
  "in-review": "bg-purple-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

const statusIcons = {
  "document-collection": FileText,
  "qna-preparation": MessageSquare,
  "client-responses": Clock,
  "doubt-resolution": AlertCircle,
  submitted: CheckCircle,
};

interface PbcDocumentsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEngagement: any;
}

export function PbcDocuments({
  open,
  onOpenChange,
  selectedEngagement,
}: PbcDocumentsProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [workflows, setWorkflows] = useState<PBCWorkflow[]>([]);
  const [currentEngagementPBC, setCurrentEngagementPBC] = useState<any | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [documentRequests, setDocumentRequests] = useState<any[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false);
  const [showPbcManager, setShowPbcManager] = useState(true); // New state for PbcManager visibility

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
  }, [statusFilter, selectedEngagement]);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const params: { status?: string; clientId?: string } = {};

      let data = await pbcApi.getAllPBCWorkflows(params);

      let selectedEngagement_PBC = data.filter(
        (workflow: PBCWorkflow) =>
          workflow.engagement._id === selectedEngagement.id
      );

      setWorkflows(data);
      setCurrentEngagementPBC(selectedEngagement_PBC[0]);
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

  // Extract all documents and count their statuses
  const allDocuments = useMemo(() => {
    const docs: any[] = [];

    currentEngagementPBC?.documentRequests.forEach((req: any) => {
      req.documents.forEach((doc: any) => {
        docs.push(doc);
      });
    });

    return docs;
  }, [currentEngagementPBC]);

  const documentStatusCounts = useMemo(() => {
    return allDocuments.reduce((acc, doc) => {
      acc[doc.status] = (acc[doc.status] || 0) + 1;
      return acc;
    }, {});
  }, [allDocuments]);

  if (authLoading) {
    return <div>Checking authentication...</div>;
  }
  console.log("currentPBC-DATA", currentEngagementPBC);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[95vw] h-[95vh] p-6 bg-amber-50 rounded-lg shadow-xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            All PBC Documents for{" "}
            {selectedEngagement?.title || "Selected Engagement"}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mb-4">
            A comprehensive list of all documents and their current statuses
            across all document requests for this engagement.
          </DialogDescription>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl transform hover:-translate-y-1"
              disabled={!selectedEngagement || documentRequests.length === 0}
            >
              <Plus className="h-4 w-4 transform hover:scale-110 transition-transform duration-200" />
              New&nbsp;PBC&nbsp;Request
            </Button>
          </div>
        </DialogHeader>
        <Separator />

        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="space-y-4">
            {allDocuments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No PBC documents found for this engagement.
              </p>
            ) : (
              allDocuments.map((doc, index) => (
                <Card
                  key={doc._id || index}
                  className="flex items-center justify-between p-4 shadow-sm hover:shadow-lg transition-all duration-300 rounded-lg transform hover:-translate-y-1 hover:scale-[1.01] border border-gray-100 hover:border-violet-300"
                >
                  <div className="flex items-center">
                    <div className="relative p-2 rounded-full bg-blue-100 text-blue-600 mr-3 transition-all duration-300 hover:scale-110 hover:bg-blue-200 hover:text-blue-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{doc.name}</p>
                      {doc.uploadedAt && (
                        <p className="text-sm text-gray-500">
                          {doc.status === 'pending' ? 'Requested on' : "Uploaded on"}: {formatDate(doc.uploadedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.status === "uploaded" && doc.url && (
                      <button
                        onClick={() => window.open(doc.url, "_blank")}
                        className="flex items-center gap-1 px-4 py-1 text-white text-sm font-semibold bg-green-500 hover:bg-green-600 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <Download className="h-4 w-4 transition-transform duration-200 group-hover:rotate-6" />
                        Download
                      </button>
                    )}
                    <Badge
                      className={`${
                        documentStatusColors[doc.status] || "bg-gray-400"
                      } text-white px-3 py-1 text-xs rounded-full shadow-sm`}
                    >
                      {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-gray-200 mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Document Status Summary:
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(documentStatusCounts).map(
                ([status, count]: [string, any]) => (
                  <Badge
                    key={status}
                    className={`${
                      documentStatusColors[status] || "bg-gray-400"
                    } text-white mx-2 px-3 py-1 text-sm rounded-full shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
                  </Badge>
                )
              )}
              {Object.keys(documentStatusCounts).length === 0 && (
                <p className="text-gray-500 text-sm">No statuses to display.</p>
              )}
            </div>
          </div>

          <div className="mt-32 mx-1">
            <Button
              onClick={() => setShowPbcManager(!showPbcManager)}
              className="flex items-center gap-2 px-6 py-2 bg-violet-500 hover:bg-violet-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-md transform"
            >
              {showPbcManager ? (
                <>
                  <EyeOff className="h-4 w-4 transition-transform duration-200 hover:rotate-6" /> Hide PBC Manager
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 transition-transform duration-200 hover:rotate-6" /> Show PBC Manager
                </>
              )}
            </Button>
          </div>
          {showPbcManager && ( // Conditionally render the PbcManager component
            <div className="mt-0 mx-1 border-4 border-violet-100 rounded-md p-4 bg-white shadow-lg">
              <PbcManager workflow={currentEngagementPBC} />
            </div>
          )}
        </ScrollArea>
      </DialogContent>

      <CreatePBCDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        selectedEngagement={selectedEngagement}
        documentRequests={documentRequests}
        loadWorkflows={loadWorkflows}
      />
    </Dialog>
  );
}