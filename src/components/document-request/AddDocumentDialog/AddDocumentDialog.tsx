import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileEdit, FileText, FileUp, Plus } from "lucide-react";
import { DefaultDocumentRequestPreview } from "@/components/kyc/DefaultDocumentRequestPreview";
import { DocumentRequestTemplate } from "@/lib/api/documentRequestTemplate";
import { useToast } from "@/hooks/use-toast";
import { SingleDocumentForm } from "./SingleDocumentForm";
import { MultipleDocumentForm } from "./MultipleDocumentForm";

interface Document {
  name: string;
  type: "direct" | "template";
  description?: string;
  template?: {
    url?: string;
    instruction?: string;
  };
  templateFile?: File;
  status: "pending";
}

interface MultipleDocumentItem {
  label: string;
  status: "pending";
  template?: {
    url?: string;
    instruction?: string;
  };
  templateFile?: File;
}

interface MultipleDocument {
  name: string;
  type: "direct" | "template";
  instruction?: string;
  multiple: MultipleDocumentItem[];
  template?: {
    url?: string;
    instruction?: string;
  };
  templateFile?: File;
}

interface AddDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentRequestId: string;
  engagementId: string;
  clientId: string;
  onSuccess: () => void;
}

export const AddDocumentDialog: React.FC<AddDocumentDialogProps> = ({
  open,
  onOpenChange,
  documentRequestId,
  engagementId,
  clientId,
  onSuccess,
}) => {
  const [mode, setMode] = useState<"select" | "default" | "new" | "new-multiple">("select");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [multipleDocuments, setMultipleDocuments] = useState<MultipleDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReset = () => {
    setMode("select");
    setDocuments([]);
    setMultipleDocuments([]);
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  const handleDefaultDocumentsAdd = (selectedDocs: DocumentRequestTemplate[]) => {
    const newDocs: Document[] = [];
    const newMultipleDocs: MultipleDocument[] = [];

    selectedDocs.forEach((doc) => {
      const isMultiple = doc.multiple && doc.multiple.length > 0;
      const docType =
        typeof doc.type === "string" ? doc.type : (doc.type as any)?.type || "direct";

      if (isMultiple) {
        // Map default multiple-copy template into MultipleDocument shape
        const multipleDoc: MultipleDocument = {
          name: doc.name,
          type: docType as "direct" | "template",
          instruction: undefined,
          multiple: (doc.multiple || []).map((item: any) => {
            // Combine item.instruction + template.instructions into a single instruction field
            let combinedInstruction = "";
            if (item.instruction) {
              combinedInstruction = item.instruction;
            }
            if (item.template?.instructions) {
              combinedInstruction = combinedInstruction
                ? `${combinedInstruction}\n\nTemplate Instructions: ${item.template.instructions}`
                : item.template.instructions;
            }
            const templateInstruction = combinedInstruction || undefined;

            return {
              label: item.label,
              template:
                item.template?.url || templateInstruction
                  ? {
                      url: item.template?.url || undefined,
                      instruction: templateInstruction,
                    }
                  : undefined,
              status: "pending",
            };
          }),
        };

        newMultipleDocs.push(multipleDoc);
      } else {
        // Regular single document from default template
        const regularDoc: Document = {
          name: doc.name,
          type: docType as "direct" | "template",
          description: doc.description,
          template:
            docType === "template" && doc.template?.url
              ? {
                  url: doc.template.url,
                  instruction: doc.template.instructions || "",
                }
              : undefined,
          status: "pending",
        };

        newDocs.push(regularDoc);
      }
    });

    if (newDocs.length > 0) {
      setDocuments((prev) => [...prev, ...newDocs]);
    }
    if (newMultipleDocs.length > 0) {
      setMultipleDocuments((prev) => [...prev, ...newMultipleDocs]);
    }

    toast({
      title: "Documents Added",
      description: `${selectedDocs.length} document(s) have been added (${newDocs.length} single, ${newMultipleDocs.length} multiple).`,
    });
  };

  const handleSubmit = async () => {
    if (documents.length === 0 && multipleDocuments.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one document",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { documentRequestApi } = await import("@/services/api");

      const processedDocuments = await Promise.all(
        documents.map(async (doc) => {
          const docType =
            typeof doc.type === "string" ? doc.type : (doc.type as any)?.type || "direct";

          if (docType === "template" && doc.templateFile) {
            const response = await documentRequestApi.uploadTemplate(doc.templateFile);
            const url = typeof response === "string" ? response : response?.url || "";
            return {
              ...doc,
              template: { ...doc.template, url },
              templateFile: undefined,
            };
          }
          return doc;
        })
      );

      const processedMultipleDocuments = await Promise.all(
        multipleDocuments.map(async (doc) => {
          const docType =
            typeof doc.type === "string" ? doc.type : (doc.type as any)?.type || "direct";

          // Process each item's template file individually
          const processedMultiple = await Promise.all(
            doc.multiple.map(async (item: any) => {
              // If template-based and item has its own template file, upload it
              if (docType === "template" && item.templateFile) {
                const response = await documentRequestApi.uploadTemplate(item.templateFile);
                const url = typeof response === "string" ? response : response?.url || "";
                return {
                  ...item,
                  template: {
                    url: url,
                    instruction: item.template?.instruction || doc.template?.instruction || "",
                  },
                  templateFile: undefined,
                };
              }
              // If item already has template URL, preserve it
              if (item.template?.url) {
                return {
                  ...item,
                  template: item.template,
                };
              }
              return item;
            })
          );

          return {
            ...doc,
            multiple: processedMultiple,
          };
        })
      );

      await documentRequestApi.addDocumentsToRequest(documentRequestId, {
        documents: processedDocuments.map((d) => ({
          name: d.name,
          type: d.type,
          description: d.description || "",
          status: "pending",
          template: d.type === "template" ? d.template : undefined,
        })),
        multipleDocuments: processedMultipleDocuments.map((d) => {
          const docType =
            typeof d.type === "string" ? d.type : (d.type as any)?.type || "direct";
          
          return {
            name: d.name,
            type: d.type,
            instruction: d.instruction || "",
            multiple: d.multiple.map((m: any) => ({
              label: m.label,
              status: "pending",
              // Each item has its own template with URL from uploaded template file
              template: docType === "template" && m.template?.url 
                ? { 
                    url: m.template.url, 
                    instruction: m.template.instruction || "" 
                  } 
                : undefined,
            })),
          };
        }),
      });

      toast({
        title: "Success",
        description: "Documents added to request successfully",
      });

      handleClose();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to add documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Documents to Request
          </DialogTitle>
          <DialogDescription>
            Choose to use default document templates or create new custom documents
          </DialogDescription>
        </DialogHeader>

        {mode === "select" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <Card
              className="cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => setMode("default")}
            >
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Use Default Document Request
                </CardTitle>
                <CardDescription>
                  Select from predefined document request templates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:border-green-500 transition-colors"
              onClick={() => setMode("new")}
            >
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileUp className="h-5 w-5 text-green-600" />
                  Create New Document Request
                </CardTitle>
                <CardDescription>
                  Define custom documents (single or multiple items)
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {mode === "default" && (
          <div className="space-y-4">
            <Button variant="default" onClick={() => setMode("select")}>
              Back
            </Button>

            <DefaultDocumentRequestPreview
              onAddDocuments={handleDefaultDocumentsAdd}
              engagementId={engagementId}
              clientId={clientId}
            />

            {documents.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg ">
                <p className="text-sm font-medium mb-2">
                  {documents.length} document(s) selected
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? "Adding..." : "Add Documents"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setDocuments([])}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "new" && (
          <SingleDocumentForm
            documents={documents}
            setDocuments={setDocuments}
            mode={mode}
            setMode={setMode}
            loading={loading}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
          />
        )}

        {mode === "new-multiple" && (
          <MultipleDocumentForm
            multipleDocuments={multipleDocuments}
            setMultipleDocuments={setMultipleDocuments}
            mode={mode}
            setMode={setMode}
            loading={loading}
            handleClose={handleClose}
            handleSubmit={handleSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
