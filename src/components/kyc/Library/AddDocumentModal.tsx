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
import { Plus, FileEdit, FileUp, Info, Loader2, Link as LinkIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadTemplate, uploadMultipleTemplates } from "@/lib/api/documentRequestTemplate";

type DocumentType = 'Template' | 'Direct' | 'Multiple';
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
  "kyc",
  "pbc",
  "Others",
];

export interface TemplateItem {
  label: string;
  templateFile?: File | null;
  templateUrl?: string;
  templateInstructions?: string;
}

export interface DocumentFormValues {
  id?: string;
  documentName: string;
  description: string;
  type: DocumentType;
  category?: string;
  templateInstructions?: string;
  templateUrl?: string;
  multiple?: Array<{
    label: string;
    template?: {
      url?: string;
      instructions?: string;
    };
  }>;
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
  const [multipleItems, setMultipleItems] = useState<TemplateItem[]>([
    { label: '', templateFile: null, templateUrl: undefined, templateInstructions: '' }
  ]);
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
    setMultipleItems([{ label: '', templateFile: null, templateUrl: undefined, templateInstructions: '' }]);
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
      
      // Handle multiple type
      if (initialData.type === 'Multiple' && initialData.multiple) {
        setMultipleItems(
          initialData.multiple.map((item) => ({
            label: item.label || '',
            templateUrl: item.template?.url,
            templateInstructions: item.template?.instructions || '',
            templateFile: null,
          }))
        );
      }
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

    if (type === 'Multiple') {
      // Validate multiple items
      const validItems = multipleItems.filter(item => item.label.trim());
      if (validItems.length === 0) {
        toast({
          title: "At least one item required",
          description: "Please add at least one template item with a label.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if all items have labels
      const itemsWithoutLabels = multipleItems.filter(item => !item.label.trim());
      if (itemsWithoutLabels.length > 0) {
        toast({
          title: "Labels required",
          description: "All template items must have a label.",
          variant: "destructive",
        });
        return;
      }
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
      
      if (type === 'Template') {
        let finalTemplateUrl = templateUrl;
        if (templateFile) {
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
      } else if (type === 'Multiple') {
        // Upload multiple template files
        const itemsToUpload = multipleItems.filter(item => item.templateFile);
        let uploadedUrls: string[] = [];
        
        if (itemsToUpload.length > 0) {
          setUploadingTemplate(true);
          const files = itemsToUpload.map(item => item.templateFile!);
          const uploadResults = await uploadMultipleTemplates(files, effectiveCategory);
          uploadedUrls = uploadResults.map(result => result.url);
        }

        // Map items with their uploaded URLs
        let urlIndex = 0;
        const multipleData = multipleItems
          .filter(item => item.label.trim())
          .map((item) => {
            let itemUrl = item.templateUrl;
            if (item.templateFile) {
              itemUrl = uploadedUrls[urlIndex];
              urlIndex++;
            }

            return {
              label: item.label.trim(),
              template: itemUrl || item.templateInstructions
                ? {
                    url: itemUrl,
                    instructions: item.templateInstructions?.trim() || undefined,
                  }
                : undefined,
            };
          });

        await onSubmit({
          id: initialData?.id,
          documentName: documentName.trim(),
          description: description.trim(),
          type: 'Multiple',
          category: effectiveCategory,
          multiple: multipleData,
        });
      } else {
        // Direct type
        await onSubmit({
          id: initialData?.id,
          documentName: documentName.trim(),
          description: description.trim(),
          type,
          category: effectiveCategory,
        });
      }

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
      setUploadingTemplate(false);
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
                } else if (value === 'Multiple' && multipleItems.length === 0) {
                  setMultipleItems([{ label: '', templateFile: null, templateUrl: undefined, templateInstructions: '' }]);
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
                <SelectItem value="Multiple">
                  <div className="flex items-center gap-2">
                    <FileEdit className="h-4 w-4 text-purple-600" />
                    Multiple
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
                            <a
                              href={templateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900"
                            >
                              <LinkIcon className="h-3 w-3" />
                              Download existing template
                            </a>
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

            {type === 'Multiple' && (
              <div className="mt-4 space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      Multiple Template Items
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMultipleItems([
                        ...multipleItems,
                        { label: '', templateFile: null, templateUrl: undefined, templateInstructions: '' }
                      ]);
                    }}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-4">
                  {multipleItems.map((item, index) => (
                    <div key={index} className="p-3 bg-white rounded border border-purple-100">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <Label htmlFor={`item-label-${index}`} className="text-xs">
                            Item Label <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id={`item-label-${index}`}
                            placeholder="e.g., Front Page, Page 1"
                            value={item.label}
                            onChange={(e) => {
                              const updated = [...multipleItems];
                              updated[index].label = e.target.value;
                              setMultipleItems(updated);
                            }}
                            className="mt-1"
                          />
                        </div>
                        {multipleItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = multipleItems.filter((_, i) => i !== index);
                              setMultipleItems(updated.length > 0 ? updated : [{ label: '', templateFile: null, templateUrl: undefined, templateInstructions: '' }]);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2 mt-3">
                        <Label htmlFor={`item-file-${index}`} className="text-xs">
                          Template File <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id={`item-file-${index}`}
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            const updated = [...multipleItems];
                            updated[index].templateFile = file;
                            if (file) {
                              updated[index].templateUrl = undefined;
                            }
                            setMultipleItems(updated);
                          }}
                          className="text-xs"
                          required
                        />
                        {(item.templateFile || item.templateUrl) && (
                          <p className="text-xs text-gray-700">
                            {item.templateFile
                              ? `Selected: ${item.templateFile.name}`
                              : item.templateUrl && (
                                  <a
                                    href={item.templateUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900"
                                  >
                                    <LinkIcon className="h-3 w-3" />
                                    Download existing template
                                  </a>
                                )}
                          </p>
                        )}
                      </div>

                      <div className="mt-3">
                        <Label htmlFor={`item-instructions-${index}`} className="text-xs">
                          Instructions <span className="text-red-500">*</span>    
                        </Label>
                        <Textarea
                          id={`item-instructions-${index}`}
                          placeholder="Instructions for this template item..."
                          value={item.templateInstructions || ''}
                          onChange={(e) => {
                            const updated = [...multipleItems];
                            updated[index].templateInstructions = e.target.value;
                            setMultipleItems(updated);
                          }}
                          rows={2}
                          className="mt-1 text-xs"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-600">
                  Add multiple template items for documents that require multiple pages or files (e.g., Passport front/back, Form16 pages)
                </p>
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
            disabled={
              !documentName.trim() || 
              submitting || 
              uploadingTemplate ||
              (type === 'Multiple' && multipleItems.filter(item => item.label.trim()).length === 0)
            }
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

