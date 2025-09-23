import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { pbcApi } from "@/lib/api/pbc-workflow";
import { singleUploadPbc } from "@/lib/api/pbc-workflow";

interface CreatePBCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEngagement: any;
  documentRequests: any;
  loadWorkflows: () => void;
}

interface FormData {
  notes: string;
}

export function CreatePBCDialog({
  open,
  onOpenChange,
  selectedEngagement,
  documentRequests,
  loadWorkflows,
}: CreatePBCDialogProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    notes: "",
  });

  const [filesToUpload, setFilesToUpload] = useState<{
    [key: string]: FileList | null;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (
    documentRequestId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFilesToUpload((prev) => ({
      ...prev,
      [documentRequestId]: event.target.files,
    }));
  };

  const uploadFilesForRequest = async (requestId: string, files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      try {
        await singleUploadPbc(requestId, formData);
        console.log(
          `[Upload] File ${file.name} uploaded successfully to request ${requestId}`
        );
        toast.success(`File ${file.name} uploaded successfully!`);
      } catch (uploadError: any) {
        console.error(
          `[Upload Error] Error uploading file ${file.name} to request ${requestId}:`,
          uploadError
        );
        let errorMessage = `Failed to upload file ${file.name}.`;

        if (uploadError?.response) {
          errorMessage =
            uploadError.response.data?.message ||
            `Server error: ${uploadError.response.status} ${uploadError.response.statusText}`;
        } else if (uploadError?.request) {
          errorMessage = `No response from server for file ${file.name}.`;
        } else {
          errorMessage = `Request error for file ${file.name}: ${
            uploadError?.message || "Unknown error"
          }`;
        }

        toast.error(errorMessage);
      }
    });
    await Promise.all(uploadPromises);
  };

  const handleCreatePBCWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedEngagement || !user) {
      toast.error("Engagement or user information is missing.");
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    console.log("[CreatePBC] Starting workflow creation.");

    try {
      const formattedDocumentRequests =
        documentRequests?.map((item: any) => ({
          _id: item._id, // Keep the original _id for matching
          name: item.name,
          description: item.description,
          documents: item.documents || [],
        })) || [];

      const body = {
        engagementId: selectedEngagement.id,
        clientId: selectedEngagement.clientId,
        auditorId: user.id,
        entityName: selectedEngagement.title || selectedEngagement.entityName || "Unknown Entity",
        notes: formData.notes,
        customFields: {
          industry: selectedEngagement.industry || "",
          size: selectedEngagement.size || "",
        },
        documentRequests: formattedDocumentRequests,
      };

      const apiResponse = await pbcApi.createPBCWorkflow(body);
      console.log("apiResponse", apiResponse)

      // --- UPDATED LOGIC HERE ---
      if (
        apiResponse &&
        typeof apiResponse === "object" &&
        apiResponse.pbc && // Check for the 'pbc' key
        apiResponse.pbc.documentRequests // Check for documentRequests within the 'pbc' object
      ) {
        const createdWorkflow = apiResponse.pbc; // Get the actual PBC object from the 'pbc' key
        console.log("[CreatePBC] Created Workflow from API:", createdWorkflow);
        console.log(
          "[CreatePBC] Number of document requests in API response:",
          createdWorkflow.documentRequests?.length || 0
        );

        if (
          createdWorkflow.documentRequests &&
          createdWorkflow.documentRequests.length > 0
        ) {
          const newIdMap = new Map<string, string>();

          // Iterate over the actual document request objects returned by the backend
          createdWorkflow.documentRequests.forEach((newDocReq: any) => {
            const originalDocReqSent = formattedDocumentRequests.find(
              (fd: any) => fd._id === newDocReq._id
            );

            if (originalDocReqSent) {
              newIdMap.set(originalDocReqSent._id, newDocReq._id);
              console.log(
                `[Mapping] Mapped Original ID ${originalDocReqSent._id} to New ID ${newDocReq._id}`
              );
            } else {
              console.warn(
                `[Mapping Warning] Could not map original docRequestId with ${newDocReq._id}`
              );
            }
          });

          console.log(
            "[CreatePBC] Final newIdMap state:",
            Object.fromEntries(newIdMap)
          );

          // Process file uploads
          for (const originalDocReq of documentRequests || []) {
            console.log(
              `[FileUpload] Checking original document request: ID=${originalDocReq._id}, Name=${originalDocReq.name}`
            );
            const newDocReqId = newIdMap.get(originalDocReq._id);
            console.log(
              `[FileUpload] newDocReq._id for ${originalDocReq.name} (original ID: ${originalDocReq._id}):`,
              newDocReqId
            );

            if (newDocReqId) {
              const files = filesToUpload[originalDocReq._id];
              console.log(
                `[FileUpload] Files selected for ${originalDocReq.name}:`,
                files ? Array.from(files).map((f) => f.name) : "No files"
              );

              if (files && files.length > 0) {
                await uploadFilesForRequest(newDocReqId, files);
              } else {
                console.log(
                  `[FileUpload] No files selected for document request: ${originalDocReq.name}`
                );
              }
            } else {
              console.warn(
                `[FileUpload Warning] No new ID mapped for original document request: ${originalDocReq.name} (Original ID: ${originalDocReq._id}). Skipping file upload.`
              );
            }
          }

          toast.success("PBC Workflow created successfully!");
          loadWorkflows();
          onOpenChange(false);

          // Reset form data
          setFormData({
            notes: "",
          });
          setFilesToUpload({});
        } else {
          toast.error(
            "Failed to create PBC Workflow: Created workflow has no document requests in API response."
          );
        }
      } else {
        toast.error(
          "Failed to create PBC Workflow: API response was empty or malformed (expected single workflow object with documentRequests)."
        );
      }
    } catch (error) {
      console.error("[CreatePBC Error] Error creating PBC Workflow:", error);
      toast.error("Failed to create PBC Workflow.");
    } finally {
      setIsSubmitting(false);
      console.log("[CreatePBC] Workflow creation process finished.");
    }
  };

  console.log("documentRequests (outside render)", documentRequests);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full md:min-w-[50vw] h-[95vh]">
        <DialogHeader>
          <DialogTitle>Create New PBC Workflow</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleCreatePBCWorkflow}
          className="space-y-4 overflow-y-auto p-2"
        >
          {/* Engagement Information Summary */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="text-lg font-semibold mb-3">Engagement Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Entity Name:</span>
                <p className="text-gray-900">{selectedEngagement?.title || selectedEngagement?.entityName || "Unknown Entity"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Industry:</span>
                <p className="text-gray-900">{selectedEngagement?.industry || "Not specified"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Size:</span>
                <p className="text-gray-900">{selectedEngagement?.size || "Not specified"}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Year End:</span>
                <p className="text-gray-900">{selectedEngagement?.yearEndDate ? new Date(selectedEngagement.yearEndDate).toLocaleDateString() : "Not specified"}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Workflow Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Add any relevant notes for this PBC workflow..."
              rows={4}
            />
          </div>

          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold">Document Requests</h3>
            {documentRequests && documentRequests.length > 0 ? (
              documentRequests.map((docReq: any) => (
                <div
                  key={docReq._id}
                  className="border p-4 rounded-md space-y-2"
                >
                  <Label className="font-medium">{docReq.name}</Label>
                  <p className="text-sm text-gray-500 hidden">
                    {docReq.description}
                  </p>
                  <Input
                    type="file"
                    multiple
                    onChange={(e) => handleFileChange(docReq._id, e)}
                    className="mt-2"
                  />
                  {filesToUpload[docReq._id] &&
                    Array.from(filesToUpload[docReq._id]!).map((file) => (
                      <span
                        key={file.name}
                        className="inline-block bg-gray-100 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mt-2"
                      >
                        {file.name}
                      </span>
                    ))}
                </div>
              ))
            ) : (
              <p className="text-gray-500">
                No document requests defined for this engagement.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              className="px-4 py-2 rounded-lg bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50"
              type="submit"
              disabled={isSubmitting || authLoading}
            >
              {isSubmitting ? "Creating..." : "Create Workflow"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}