import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectItem, SelectValue, SelectContent } from "@/components/ui/select";
import { Info, FileEdit, FileUp, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export const SingleDocumentForm = ({
  documents,
  setDocuments,
  mode,
  setMode,
  loading,
  handleClose,
  handleSubmit,
}: any) => {
  const [newDocument, setNewDocument] = useState<any>({
    name: "",
    type: "direct",
    description: "",
    template: {
      instruction: "",
    },
  });

  const [currentTemplateFile, setCurrentTemplateFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleAddDocument = () => {
    if (!newDocument.name?.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive",
      });
      return;
    }

    if (newDocument.type === "template" && !currentTemplateFile) {
      toast({
        title: "Template File Required",
        description: "Please upload a template file for template-based documents",
        variant: "destructive",
      });
      return;
    }

    const document: Document = {
      name: newDocument.name.trim(),
      type: newDocument.type,
      description: newDocument.description?.trim() || "",
      template:
        newDocument.type === "template"
          ? { instruction: newDocument.template?.instruction?.trim() || "" }
          : undefined,
      templateFile: newDocument.type === "template" ? currentTemplateFile || undefined : undefined,
      status: "pending",
    };

    setDocuments((prev: any) => [...prev, document]);

    setNewDocument({
      name: "",
      type: "direct",
      description: "",
      template: { instruction: "" },
    });

    setCurrentTemplateFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setMode("select")}>
          ← Back
        </Button>
        <div className="flex gap-2">
          <Button variant="default" onClick={() => setMode("new")}>
            Single Copy
          </Button>

          <Button variant="outline" onClick={() => setMode("new-multiple")}>
            Multiple Copy
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Single Document</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Document Name *</Label>
              <Input
                placeholder="e.g., Bank Statements, ID Proof"
                value={newDocument.name}
                onChange={(e) => setNewDocument((p: any) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div>
              <Label>Request Type *</Label>
              <Select
                value={newDocument.type}
                onValueChange={(val: any) => setNewDocument((p: any) => ({ ...p, type: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="direct">
                    <div className="flex items-center gap-2">
                      <FileUp className="h-4 w-4 text-green-600" />
                      Direct Upload
                    </div>
                  </SelectItem>

                  <SelectItem value="template">
                    <div className="flex items-center gap-2">
                      <FileEdit className="h-4 w-4 text-blue-600" />
                      Template-based
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Describe what documents are needed..."
              value={newDocument.description}
              onChange={(e) =>
                setNewDocument((p: any) => ({ ...p, description: e.target.value }))
              }
              rows={2}
            />
          </div>

          {newDocument.type === "template" && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Template-based Workflow
                </span>
              </div>

              <div>
                <Label>Template File</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCurrentTemplateFile(file);

                    if (file && !newDocument.name) {
                      const cleanName = file.name
                        .replace(/\.[^/.]+$/, "")
                        .replace(/[-_]/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase());

                      setNewDocument((p: any) => ({ ...p, name: cleanName }));
                    }
                  }}
                />
              </div>

              <div>
                <Label>Instructions for Client</Label>
                <Textarea
                  rows={3}
                  placeholder="Provide clear instructions..."
                  value={newDocument.template?.instruction}
                  onChange={(e) =>
                    setNewDocument((p: any) => ({
                      ...p,
                      template: { instruction: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          )}

          <Button onClick={handleAddDocument}>
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Documents to Add ({documents.length})</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {documents.map((doc: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    {doc.description && (
                      <p className="text-sm text-gray-600">{doc.description}</p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDocuments((p: any) => p.filter((_, i: number) => i !== index))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {documents.length > 0 && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding..." : "Add Documents"}
          </Button>
        </div>
      )}
    </div>
  );
};
