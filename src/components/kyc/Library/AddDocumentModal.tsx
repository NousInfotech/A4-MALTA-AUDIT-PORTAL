import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, FileEdit, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (document: {
    documentName: string;
    description: string;
    uploadedBy: string;
    type: 'Template' | 'Direct';
  }) => void;
}

export function AddDocumentModal({
  open,
  onOpenChange,
  onAdd,
}: AddDocumentModalProps) {
  const [documentName, setDocumentName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedBy, setUploadedBy] = useState('');
  const [type, setType] = useState<'Template' | 'Direct'>('Direct');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!documentName.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive",
      });
      return;
    }

    if (!uploadedBy.trim()) {
      toast({
        title: "Error",
        description: "Uploaded By field is required",
        variant: "destructive",
      });
      return;
    }

    onAdd({
      documentName: documentName.trim(),
      description: description.trim(),
      uploadedBy: uploadedBy.trim(),
      type,
    });

    // Reset form
    setDocumentName('');
    setDescription('');
    setUploadedBy('');
    setType('Direct');
  };

  const handleClose = () => {
    setDocumentName('');
    setDescription('');
    setUploadedBy('');
    setType('Direct');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Document to Library
          </DialogTitle>
          <DialogDescription>
            Add a new document template or direct upload document to the KYC library
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="documentName">Document Name *</Label>
            <Input
              id="documentName"
              placeholder="e.g., Bank Statement Template"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this document is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="uploadedBy">Uploaded By (Employee Name) *</Label>
            <Input
              id="uploadedBy"
              placeholder="e.g., John Smith"
              value={uploadedBy}
              onChange={(e) => setUploadedBy(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="type">Type *</Label>
            <Select
              value={type}
              onValueChange={(value: 'Template' | 'Direct') => setType(value)}
            >
              <SelectTrigger id="type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Template">
                  <div className="flex items-center gap-2">
                    <FileEdit className="h-4 w-4 text-blue-600" />
                    Template
                  </div>
                </SelectItem>
                <SelectItem value="Direct">
                  <div className="flex items-center gap-2">
                    <FileUp className="h-4 w-4 text-green-600" />
                    Direct
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!documentName.trim() || !uploadedBy.trim()}
            className="bg-brand-hover hover:bg-brand-sidebar text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

