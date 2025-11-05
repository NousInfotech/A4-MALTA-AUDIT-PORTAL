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
import { Separator } from "@/components/ui/separator";
import ClientPbcManager from "./ClientPbcManager";
import PbcUpload from "./components/PbcUpload";
import { useToast } from "@/hooks/use-toast";
import { documentRequestApi } from "@/services/api";

const statusColors = {
  "document-collection": "bg-primary",
  "qna-preparation": "bg-gray-700",
  "client-responses": "bg-gray-600",
  "doubt-resolution": "bg-gray-500",
  submitted: "bg-primary",
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

interface ClientPbcDocumentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEngagement: any;
}

export function ClientPbcDocumentsModal({
  open,
  onOpenChange,
  selectedEngagement,
}: ClientPbcDocumentsModalProps) {
  const { toast: toastHook } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [workflows, setWorkflows] = useState<PBCWorkflow[]>([]);
  const [currentEngagementPBC, setCurrentEngagementPBC] = useState<any | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [showPbcManager, setShowPbcManager] = useState(true);
  const [pbcRequests, setpbcRequests] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [uploadComments, setUploadComments] = useState({});

  const fetchPBCDocumentRequests = async () => {
    try {
      const data = await pbcApi.getPbcDocumentRequests(selectedEngagement.id);
      if (data) {
        setpbcRequests(data);
      }
    } catch (error) {
      console.log(error);
      toast.error("something went while finding Pbc document requests");
    }
  };

  useEffect(() => {
    if (selectedEngagement) {
      fetchPBCDocumentRequests();
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

  const handleFileUpload = async (requestId, files: File[]) => {
    if (!files?.length) return;

    // Validate file sizes and types before upload
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
    ];

    for (const file of Array.from(files)) {
      if (file.size > maxFileSize) {
        toastHook({
          title: "File too large",
          description: `${file.name} is larger than 50MB. Please compress or split the file.`,
          variant: "destructive",
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toastHook({
          title: "Invalid file type",
          description: `${file.name} has an unsupported file type. Please use PDF, images, or Office documents.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (files.length > 10) {
      toastHook({
        title: "Too many files",
        description: "You can upload a maximum of 10 files at once.",
        variant: "destructive",
      });
      return;
    }

    setUploadingFiles((prev) => ({ ...prev, [requestId]: true }));

    try {
      const formData = new FormData();
      Array.from(files).forEach((file: File) => formData.append("files", file));
      formData.append("markCompleted", "true"); // optional flag

      // Add comment if provided
      const comment = uploadComments[requestId] || "";
      if (comment.trim()) {
        formData.append("comment", comment.trim());
      }

      // Call the real upload endpoint
      console.log("📤 Uploading documents for request:", requestId);
      console.log(
        "📤 Files being uploaded:",
        Array.from(files).map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        }))
      );

      const updatedReq = await documentRequestApi.uploadDocuments(
        requestId,
        formData
      );

      console.log("✅ Upload successful, updated request:", updatedReq);

      // Sync local state with response
      await fetchPBCDocumentRequests();

      // Clear the comment after successful upload
      setUploadComments((prev) => ({ ...prev, [requestId]: "" }));

      toastHook({
        title: "Documents uploaded successfully",
        description: `${files.length} file(s) sent to your auditor.`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);

      let errorMessage = "Please try again.";

      if (error.message?.includes("FILE_TOO_LARGE")) {
        errorMessage =
          "One or more files are too large. Maximum size is 50MB per file.";
      } else if (error.message?.includes("TOO_MANY_FILES")) {
        errorMessage = "Too many files. Maximum 10 files allowed.";
      } else if (error.message?.includes("INVALID_FILE_TYPE")) {
        errorMessage = "One or more files have unsupported file types.";
      } else if (
        error.message?.includes("Network error") ||
        error.message?.includes("Failed to fetch")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      toastHook({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [requestId]: false }));
    }
  };


  const getEngagementTitle = (id) =>
    selectedEngagement?.title || "Unknown Engagement";

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
      <DialogContent className="min-w-[95vw] h-[95vh] p-6  bg-brand-body rounded-lg shadow-xl flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            All PBC Documents for{" "}
            {selectedEngagement?.title || "Selected Engagement"}
          </DialogTitle>
          <DialogDescription className="text-gray-600 mb-4">
            A comprehensive list of all documents and their current statuses
            across all document requests for this engagement.
          </DialogDescription>
        </DialogHeader>
        <Separator />

        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="w-full">
            <PbcUpload
              pbcRequests={pbcRequests}
              getEngagementTitle={getEngagementTitle}
              handleFileUpload={handleFileUpload}
              uploadingFiles={uploadingFiles}
            />
          </div>

          <div className="mt-32 mx-1">
            <Button
              onClick={() => setShowPbcManager(!showPbcManager)}
              className="flex items-center gap-2 px-6 py-2 bg-violet-500 hover:bg-violet-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-md transform"
            >
              {showPbcManager ? (
                <>
                  <EyeOff className="h-4 w-4 transition-transform duration-200 hover:rotate-6" />{" "}
                  Hide PBC Manager
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 transition-transform duration-200 hover:rotate-6" />{" "}
                  Show PBC Manager
                </>
              )}
            </Button>
          </div>
          {showPbcManager && ( // Conditionally render the PbcManager component
            <div className="mt-0 mx-1 border-4 border-violet-100 rounded-md p-4 bg-white shadow-lg">
              <ClientPbcManager workflow={currentEngagementPBC} />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
