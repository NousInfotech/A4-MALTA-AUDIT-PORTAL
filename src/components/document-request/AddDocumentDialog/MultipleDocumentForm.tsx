import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Info, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const MultipleDocumentForm = ({
  multipleDocuments,
  setMultipleDocuments,
  mode,
  setMode,
  loading,
  handleClose,
  handleSubmit,
}: any) => {
  const [newMultipleDocument, setNewMultipleDocument] = useState<any>({
    name: "",
    type: "direct",
    instruction: "",
    multiple: [],
  });

  const [newMultipleItem, setNewMultipleItem] = useState("");
  const [currentTemplateFile, setCurrentTemplateFile] = useState<File | null>(null);

  const { toast } = useToast();

  const handleAddMultipleItem = () => {
    if (!newMultipleItem.trim()) {
      toast({
        title: "Error",
        description: "Item label is required",
        variant: "destructive",
      });
      return;
    }

    setNewMultipleDocument((prev: any) => ({
      ...prev,
      multiple: [...prev.multiple, { label: newMultipleItem.trim(), status: "pending" }],
    }));

    setNewMultipleItem("");
  };

  const handleAddMultipleDocument = () => {
    if (!newMultipleDocument.name?.trim()) {
      toast({
        title: "Error",
        description: "Document group name is required",
        variant: "destructive",
      });
      return;
    }

    if (!newMultipleDocument.multiple.length) {
      toast({
        title: "Error",
        description: "Add at least one item",
        variant: "destructive",
      });
      return;
    }

    if (newMultipleDocument.type === "template" && !currentTemplateFile) {
      toast({
        title: "Template file required",
        description: "Must upload a template file",
        variant: "destructive",
      });
      return;
    }

    setMultipleDocuments((prev: any) => [
      ...prev,
      {
        ...newMultipleDocument,
        template:
          newMultipleDocument.type === "template"
            ? { instruction: newMultipleDocument.template?.instruction || "" }
            : undefined,
        templateFile:
          newMultipleDocument.type === "template" ? currentTemplateFile || undefined : undefined,
      },
    ]);

    setNewMultipleDocument({
      name: "",
      type: "direct",
      instruction: "",
      multiple: [],
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
          <Button variant="outline" onClick={() => setMode("new")}>
            Single Copy
          </Button>

          <Button variant="default" onClick={() => setMode("new-multiple")}>
            Multiple Copy
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Multiple Document</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Document Name *</Label>
              <Input
                placeholder="e.g., ID & Address Proof Set"
                value={newMultipleDocument.name}
                onChange={(e) =>
                  setNewMultipleDocument((p: any) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div>
              <Label>Type *</Label>

              <Select
                value={newMultipleDocument.type}
                onValueChange={(val: any) =>
                  setNewMultipleDocument((p: any) => ({ ...p, type: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="direct">Direct Upload</SelectItem>
                  <SelectItem value="template">Template-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Instruction (Optional)</Label>
            <Textarea
              rows={2}
              placeholder="Instructions for this document group..."
              value={newMultipleDocument.instruction}
              onChange={(e) =>
                setNewMultipleDocument((p: any) => ({
                  ...p,
                  instruction: e.target.value,
                }))
              }
            />
          </div>

          {newMultipleDocument.type === "template" && (
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Template-based Workflow</span>
              </div>

              <div>
                <Label>Template File</Label>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setCurrentTemplateFile(file);
                  }}
                />
              </div>

              <div>
                <Label>Instructions for Client</Label>
                <Textarea
                  rows={3}
                  placeholder="Provide clear instructions..."
                  value={newMultipleDocument.template?.instruction}
                  onChange={(e) =>
                    setNewMultipleDocument((p: any) => ({
                      ...p,
                      template: { instruction: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          )}

          <div>
            <Label>Label *</Label>

            <div className="flex gap-2">
              <Input
                placeholder="e.g., Director 1 – ID proof"
                value={newMultipleItem}
                onChange={(e) => setNewMultipleItem(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") handleAddMultipleItem();
                }}
                required
              />

              <Button onClick={handleAddMultipleItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {newMultipleDocument.multiple.length > 0 && (
            <div className="space-y-2">
              <Label>Items in Group:</Label>

              {newMultipleDocument.multiple.map((item: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span>{item.label}</span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setNewMultipleDocument((p: any) => ({
                        ...p,
                        multiple: p.multiple.filter((_: any, i: number) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleAddMultipleDocument}>
            <Plus className="h-4 w-4 mr-2" />
            Add Multiple Document Group
          </Button>
        </CardContent>
      </Card>

      {multipleDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Multiple Document ({multipleDocuments.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2">
              {multipleDocuments.map((doc: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-gray-600">{doc.multiple.length} item(s)</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setMultipleDocuments((p: any) =>
                        p.filter((_: any, i: number) => i !== index)
                      )
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

      {multipleDocuments.length > 0 && (
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
