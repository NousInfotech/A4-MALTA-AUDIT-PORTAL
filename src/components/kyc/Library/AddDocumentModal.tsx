import React, { useEffect, useState } from 'react';
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
import { Plus, FileEdit, FileUp, Info, Loader2, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadTemplate } from "@/lib/api/documentRequestTemplate";

type DocumentType = 'Template' | 'Direct';
const CATEGORY_OPTIONS = [
  "Planning",
  "Capital & Reserves",
  "Property, plant and equipment",
  "Intangible Assets",
  "Investment Property",
  "Investment in Subsidiaries & Associates investments",
  "Receivables",
  "Payables",
  "Inventory",
  "Bank & Cash",
  "Borrowings & loans",
  "Taxation",
  "Going Concern",
  "Others",
];

export interface DocumentFormValues {
  id?: string;
  documentName: string;
  description: string;
  type: DocumentType;
  category?: string;
  templateInstructions?: string;
  templateUrl?: string;
}

interface AddDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (document: DocumentFormValues) => void;
  initialData?: DocumentFormValues;
  mode?: 'add' | 'edit';
}

export function AddDocumentModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  mode = 'add',
}: AddDocumentModalProps) {
  const [documentName, setDocumentName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DocumentType>('Direct');
  const [category, setCategory] = useState<string>('Planning');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [templateInstructions, setTemplateInstructions] = useState('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const { toast } = useToast();
  const isEditMode = mode === 'edit' || Boolean(initialData?.id);

  const resetForm = () => {
    setDocumentName('');
    setDescription('');
    setType('Direct');
    setCategory('Planning');
    setCustomCategory('');
    setTemplateInstructions('');
    setTemplateFile(null);
    setTemplateUrl(undefined);
    setSubmitting(false);
    setUploadingTemplate(false);
  };

  useEffect(() => {
    if (open && initialData) {
      setDocumentName(initialData.documentName || '');
      setDescription(initialData.description || '');
      setType(initialData.type || 'Direct');
      const existingCategory = initialData.category || 'Planning';
      // If the existing category is one of the predefined options, use it directly.
      // Otherwise, treat it as a custom category under "Others".
      if (CATEGORY_OPTIONS.includes(existingCategory)) {
        setCategory(existingCategory);
        setCustomCategory('');
      } else {
        setCategory('Others');
        setCustomCategory(existingCategory);
      }
      setTemplateInstructions(initialData.templateInstructions || '');
      setTemplateUrl(initialData.templateUrl);
      setTemplateFile(null);
    }

    if (open && !initialData) {
      resetForm();
    }
  }, [open, initialData]);

  const handleTemplateUpload = async () => {
    if (!templateFile) return undefined;
    setUploadingTemplate(true);
    try {
      const effectiveCategory =
        category === 'Others'
          ? (customCategory.trim() || 'Others')
          : category;

      const url = await uploadTemplate(templateFile, effectiveCategory);
      setTemplateUrl(url);
      toast({
        title: "Template uploaded",
        description: "Template file uploaded successfully.",
      });
      return url;
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "We couldn't upload the template file. Please try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleSubmit = async () => {
    if (!documentName.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
        variant: "destructive",
      });
      return;
    }

    if (type === 'Template' && !templateFile && !templateUrl) {
      toast({
        title: "Template file required",
        description: "Please upload a template file before saving.",
        variant: "destructive",
      });
      return;
    }

    // Require a custom category name when "Others" is selected
    if (category === 'Others' && !customCategory.trim()) {
      toast({
        title: "Category required",
        description: "Please enter a category name when selecting Others.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const effectiveCategory =
        category === 'Others'
          ? customCategory.trim()
          : category;
      let finalTemplateUrl = templateUrl;
      if (type === 'Template' && templateFile) {
        finalTemplateUrl = await handleTemplateUpload();
        if (!finalTemplateUrl) return;
      }

      await onSubmit({
        id: initialData?.id,
        documentName: documentName.trim(),
        description: description.trim(),
        type,
        category: effectiveCategory,
        templateInstructions: templateInstructions.trim() || undefined,
        templateUrl: finalTemplateUrl,
      });

      resetForm();
    } catch (error) {
      console.error("Failed to submit document:", error);
      toast({
        title: "Unable to save",
        description: "Something went wrong while saving the document.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? <FileEdit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEditMode ? "Edit Document" : "Add Document to Library"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update the details of this document template in the KYC library"
              : "Add a new document template or direct upload document to the KYC library"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="documentName">Document Name <span className="text-red-500">*</span></Label>
            <Input
              id="documentName"
              placeholder="e.g., Bank Statement Template"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              className="mt-1"
            />
          </div>

      

          <div>
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="description"
              placeholder="Describe what this document is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>

         {/* Category */}
        <div className="space-y-2">
        <Label htmlFor="category">
        Category <span className="text-red-500">*</span>
        </Label>

        <Select
        value={category}
        onValueChange={(value) => {
        setCategory(value);
        if (value !== "Others") setCustomCategory(""); // reset custom
        }}
        >
        <SelectTrigger id="category">
        <SelectValue placeholder="Select a category" />
        </SelectTrigger>

        <SelectContent>
        {CATEGORY_OPTIONS.map((item) => (
        <SelectItem key={item} value={item}>
        {item}
        </SelectItem>
        ))}
        <SelectItem value="Others">Others</SelectItem>
        </SelectContent>
        </Select>
        </div>

          {/* Custom Category (only when Others selected) */}
          {category === "Others" && (
            <div className="space-y-2">
              <Label htmlFor="customCategory">
                Custom Category <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customCategory"
                placeholder="Enter custom category name"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="type">Type <span className="text-red-500">*</span></Label>
            <Select
              value={type}
              onValueChange={(value: DocumentType) => {
                setType(value);
                if (value === 'Direct') {
                  setTemplateFile(null);
                }
              }}
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
            {type === 'Template' && (
              <div className="mt-4 space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Template-based Workflow
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateFile">Template File</Label>
                  <Input
                    id="templateFile"
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setTemplateFile(file);
                      if (file) {
                        setTemplateUrl(undefined);
                        if (!documentName.trim()) {
                          const cleanName = file.name
                            .replace(/\.[^/.]+$/, "")
                            .replace(/[-_]/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase());
                          setDocumentName(cleanName);
                        }
                      }
                    }}
                  />
                  {(templateFile || templateUrl) && (
                    <p className="text-xs text-gray-700">
                      {templateFile
                        ? `Selected: ${templateFile.name}`
                        : templateUrl && (
                          <span className="inline-flex items-center gap-1">
                            <LinkIcon className="h-3 w-3" />
                            Existing template linked
                          </span>
                        )}
                    </p>
                  )}
                  <p className="text-xs text-gray-600">
                    Upload a template file that clients will download and fill out
                  </p>
                </div>

                <div>
                  <Label htmlFor="templateInstructions">Instructions for Client</Label>
                  <Textarea
                    id="templateInstructions"
                    placeholder="Provide clear instructions on how to fill the template..."
                    value={templateInstructions}
                    onChange={(e) => setTemplateInstructions(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            )}
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
            disabled={!documentName.trim() || submitting || uploadingTemplate}
            className="bg-brand-hover hover:bg-brand-sidebar text-white"
          >
            {submitting || uploadingTemplate ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isEditMode ? (
              <FileEdit className="h-4 w-4 mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {submitting
              ? "Saving..."
              : uploadingTemplate
                ? "Uploading..."
                : isEditMode
                  ? "Save Changes"
                  : "Add Document"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

