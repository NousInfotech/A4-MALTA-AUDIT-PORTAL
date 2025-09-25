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
import { Button } from "../ui/button";
import { PlusCircle, Trash2 } from "lucide-react"; // Import icons

interface CreatePBCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEngagement: any;
  documentRequests: any;
  loadWorkflows: () => void;
}

interface FormData {
  notes: string;
  documents: string[];
}

export function CreatePBCDialog({
  open,
  onOpenChange,
  selectedEngagement,
  documentRequests,
  loadWorkflows,
}: CreatePBCDialogProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    notes: "",
    documents: [""], // Initialize with one empty document input
  });

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, notes: e.target.value }));
  };

  const handleDocumentChange = (index: number, value: string) => {
    const newDocuments = [...formData.documents];
    newDocuments[index] = value;
    setFormData((prev) => ({ ...prev, documents: newDocuments }));
  };

  const addDocumentField = () => {
    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, ""], // Add a new empty document input
    }));
  };

  const removeDocumentField = (index: number) => {
    const newDocuments = formData.documents.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, documents: newDocuments }));
  };

  const handleCreatePBCWorkflow = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!selectedEngagement || !user) {
      toast.error("Engagement or user information is missing.");
      setIsSubmitting(false);
      return;
    }

    try {
      const formattedDocs = formData.documents.filter((doc) => doc.trim() !== "").map((item) => ({name: item, url: ""})) || []; // Send non-empty documents
      const formattedDocumentRequests =
        documentRequests?.map((item: any) => ({
          _id: item._id, // Keep the original _id for matching
          name: item.name,
          description: item.description,
          documents: [...item.documents, ...formattedDocs]
            
        })) || [];
      // Construct the body for your API call.
      const body = {
        engagementId: selectedEngagement.id,
        clientId: selectedEngagement.clientId,
        auditorId: user.id,
        entityName:
          selectedEngagement.title ||
          selectedEngagement.entityName ||
          "Unknown Entity",
        notes: formData.notes,
        documentRequests: formattedDocumentRequests,
        customFields: {
          industry: selectedEngagement.industry || "",
          size: selectedEngagement.size || "",
        },
      };
      console.log("body", body)

      const apiResponse = await pbcApi.createPBCWorkflow(body);
      console.log("apiResponse", apiResponse);

      toast.success("PBC Workflow created successfully!");
      loadWorkflows();
      onOpenChange(false);
      // Reset form data after successful submission
      setFormData({
        notes: "",
        documents: [""],
      });
    } catch (error) {
      // Keep error: any for broad compatibility
      console.error("[CreatePBC Error]:", error);

      let toastMessage = "Failed to create PBC Workflow. Please try again."; // Default generic message

      // Safely try to extract the specific backend message
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        toastMessage = error.response.data.message;
      } else if (error.message) {
        // Fallback to the Axios error message if no specific backend message is found
        toastMessage = error.message;
      }

      // Display the determined message in the toast
      toast.error(toastMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h3 className="text-lg font-semibold mb-3">
              Engagement Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Entity Name:</span>
                <p className="text-gray-900">
                  {selectedEngagement?.title ||
                    selectedEngagement?.entityName ||
                    "Unknown Entity"}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Industry:</span>
                <p className="text-gray-900">
                  {selectedEngagement?.industry || "Not specified"}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Size:</span>
                <p className="text-gray-900">
                  {selectedEngagement?.size || "Not specified"}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Year End:</span>
                <p className="text-gray-900">
                  {selectedEngagement?.yearEndDate
                    ? new Date(
                        selectedEngagement.yearEndDate
                      ).toLocaleDateString()
                    : "Not specified"}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">PBC&nbsp;Workflow&nbsp;Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={handleNotesChange}
              placeholder="Add any relevant notes for this PBC workflow..."
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-4">
            <Label htmlFor="documents">Required&nbsp;Documents</Label>
            <div className="space-y-2">
              {formData.documents.map((documentName, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    id={`document-${index}`}
                    type="text"
                    value={documentName}
                    onChange={(e) =>
                      handleDocumentChange(index, e.target.value)
                    }
                    placeholder={`Document Name ${index + 1}`}
                    disabled={isSubmitting}
                  />
                  {formData.documents.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost" // Use ghost variant for subtle icon button
                      size="icon"
                      onClick={() => removeDocumentField(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={addDocumentField}
              disabled={isSubmitting}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Document
            </Button>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline" // Use outline for cancel
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || authLoading}>
              {isSubmitting ? "Creating..." : "Create Workflow"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
