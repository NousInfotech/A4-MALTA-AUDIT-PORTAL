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

type DocumentType = 'Template' | 'Direct';
type CopyType = 'single' | 'multiple';
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
  instruction?: string;
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
    instruction?: string;
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
  const [copyType, setCopyType] = useState<CopyType>('single');
  const [type, setType] = useState<DocumentType>('Direct');
  const [category, setCategory] = useState<string>('Planning');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [templateInstructions, setTemplateInstructions] = useState('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateUrl, setTemplateUrl] = useState<string | undefined>(undefined);
  const [multipleItems, setMultipleItems] = useState<TemplateItem[]>([
    { label: '', templateFile: null, templateUrl: undefined, templateInstructions: '', instruction: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const { toast } = useToast();
  const isEditMode = mode === 'edit' || Boolean(initialData?.id);

  const resetForm = () => {
    setDocumentName('');
    setDescription('');
    setCopyType('single');
    setType('Direct');
    setCategory('Planning');
    setCustomCategory('');
    setTemplateInstructions('');
    setTemplateFile(null);
    setTemplateUrl(undefined);
    setMultipleItems([{ label: '', templateFile: null, templateUrl: undefined, templateInstructions: '', instruction: '' }]);
    setSubmitting(false);
    setUploadingTemplate(false);
  };

  useEffect(() => {
    if (open && initialData) {
      setDocumentName(initialData.documentName || '');
      setDescription(initialData.description || '');
      
      // Determine if it's single or multiple based on whether multiple array exists
      if (initialData.multiple && initialData.multiple.length > 0) {
        setCopyType('multiple');
        // Determine type from the multiple items - if any has template, it's Template type
        const hasTemplate = initialData.multiple.some(item => item.template);
        setType(hasTemplate ? 'Template' : 'Direct');
        setMultipleItems(
          initialData.multiple.map((item) => ({
            label: item.label || '',
            instruction: item.instruction || '',
            templateUrl: item.template?.url,
            templateInstructions: item.template?.instructions || '',
            templateFile: null,
          }))
        );
      } else {
        setCopyType('single');
        setType(initialData.type || 'Direct');
        setTemplateInstructions(initialData.templateInstructions || '');
        setTemplateUrl(initialData.templateUrl);
        setTemplateFile(null);
      }
      
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

    // Require a custom category name when "Others" is selected
    if (category === 'Others' && !customCategory.trim()) {
      toast({
        title: "Category required",
        description: "Please enter a category name when selecting Others.",
        variant: "destructive",
      });
      return;
    }

    const effectiveCategory =
      category === 'Others'
        ? customCategory.trim()
        : category;

    if (copyType === 'single') {
      // Single copy validation
      if (type === 'Template' && !templateFile && !templateUrl) {
        toast({
          title: "Template file required",
          description: "Please upload a template file before saving.",
          variant: "destructive",
        });
        return;
      }

      try {
        setSubmitting(true);
        
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
    } else {
      // Multiple copies validation
      const validItems = multipleItems.filter(item => item.label.trim());
      if (validItems.length === 0) {
        toast({
          title: "At least one item required",
          description: "Please add at least one item with a label.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if all items have labels
      const itemsWithoutLabels = multipleItems.filter(item => !item.label.trim());
      if (itemsWithoutLabels.length > 0) {
        toast({
          title: "Labels required",
          description: "All items must have a label.",
          variant: "destructive",
        });
        return;
      }

      // For Template type in multiple, validate template files
      if (type === 'Template') {
        const itemsWithoutTemplate = multipleItems.filter(
          item => item.label.trim() && !item.templateFile && !item.templateUrl
        );
        if (itemsWithoutTemplate.length > 0) {
          toast({
            title: "Template files required",
            description: "All template items must have a template file.",
            variant: "destructive",
          });
          return;
        }
      }

      try {
        setSubmitting(true);
        
        // Upload multiple template files if needed
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

            // For Direct type: only label (no instruction field)
            // For Template type: label, instruction (outside), and template with instructions (inside)
            if (type === 'Direct') {
              return {
                label: item.label.trim(),
              };
            } else {
              // Template type - include template object only if we have a URL
              return {
                label: item.label.trim(),
                instruction: item.instruction?.trim() || undefined,
                template: itemUrl
                  ? {
                      url: itemUrl,
                      instructions: item.templateInstructions?.trim() || undefined,
                    }
                  : undefined,
              };
            }
          });

        await onSubmit({
          id: initialData?.id,
          documentName: documentName.trim(),
          description: description.trim(),
          type,
          category: effectiveCategory,
          multiple: multipleData,
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
        setUploadingTemplate(false);
      }
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-lg p-6">
      <DialogHeader className="pb-4 border-b">
        <DialogTitle className="flex items-center gap-3 text-lg font-semibold">
          {isEditMode ? <FileEdit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {isEditMode ? "Edit Document" : "Add Document to Library"}
        </DialogTitle>
        <DialogDescription className="text-sm text-gray-600">
          {isEditMode
            ? "Update the details of this document template in the KYC library"
            : "Add a new document template or direct upload document to the KYC library"}
        </DialogDescription>
      </DialogHeader>
  
      <div className="space-y-6 py-4">
  
        {/* Document Name */}
        <div className="space-y-2">
          <Label htmlFor="documentName">
            Document Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="documentName"
            placeholder="e.g., Bank Statement Template"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            className="mt-1 h-10"
          />
        </div>
  
        {/* Description */}
        <div className="space-y-2">
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
              if (value !== "Others") setCustomCategory("");
            }}
          >
            <SelectTrigger id="category" className="h-10">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
  
            <SelectContent>
              {CATEGORY_OPTIONS.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
              {/* <SelectItem value="Others">Others</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
  
        {/* Custom Category */}
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
              className="mt-1 h-10"
            />
          </div>
        )}
  
        {/* Copy Type */}
        <div className="space-y-2">
          <Label htmlFor="copyType">Copy Type <span className="text-red-500">*</span></Label>
          <Select
            value={copyType}
            onValueChange={(value) => {
              setCopyType(value as CopyType);
              if (value === "single") {
                setMultipleItems([{ label: "", templateFile: null, templateUrl: undefined, templateInstructions: "", instruction: "" }]);
              } else if (value === "multiple" && multipleItems.length === 0) {
                setMultipleItems([{ label: "", templateFile: null, templateUrl: undefined, templateInstructions: "", instruction: "" }]);
              }
            }}
          >
            <SelectTrigger id="copyType" className="mt-1 h-10">
              <SelectValue />
            </SelectTrigger>
  
            <SelectContent>
              <SelectItem value="single">Single Copy</SelectItem>
              <SelectItem value="multiple">Multiple Copies</SelectItem>
            </SelectContent>
          </Select>
        </div>
  
        {/* Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="type">Type <span className="text-red-500">*</span></Label>
  
          <Select
            value={type}
            onValueChange={(value: DocumentType) => {
              setType(value);
              if (value === "Direct") {
                setTemplateFile(null);
                setTemplateUrl(undefined);
              }
            }}
          >
            <SelectTrigger id="type" className="mt-1 h-10">
              <SelectValue />
            </SelectTrigger>
  
            <SelectContent>
              <SelectItem value="Template">
                <div className="flex items-center gap-2">
                  <FileEdit className="h-4 w-4" />
                  Template
                </div>
              </SelectItem>
  
              <SelectItem value="Direct">
                <div className="flex items-center gap-2">
                  <FileUp className="h-4 w-4" />
                  Direct
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
  
          {/* SINGLE COPY TEMPLATE */}
          {copyType === "single" && type === "Template" && (
            <div className="mt-4 space-y-4 p-5 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Template-based Workflow</span>
              </div>
  
              <div className="space-y-2">
                <Label>Template File</Label>
                <Input
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
                  className="text-sm"
                />
  
                {(templateFile || templateUrl) && (
                  <p className="text-xs text-gray-700">
                    {templateFile ? (
                      `Selected: ${templateFile.name}`
                    ) : (
                      <a
                        href={templateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-700 underline"
                      >
                        <LinkIcon className="h-3 w-3" />
                        Download existing template
                      </a>
                    )}
                  </p>
                )}
  
                <p className="text-xs text-gray-600">Upload a template file that clients will download and fill</p>
              </div>
  
              <div>
                <Label>Instructions for Client</Label>
                <Textarea
                  placeholder="Provide clear instructions..."
                  value={templateInstructions}
                  onChange={(e) => setTemplateInstructions(e.target.value)}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
          )}
  
          {/* MULTIPLE COPIES */}
          {copyType === "multiple" && (
            <div className="mt-4 space-y-4 p-5 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">
                    Multiple Copies – {type === "Direct" ? "Direct Upload" : "Template"}
                  </span>
                </div>
  
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setMultipleItems([
                      ...multipleItems,
                      { label: "", templateFile: null, templateUrl: undefined, templateInstructions: "", instruction: "" },
                    ])
                  }
                  className="h-8"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>
  
              {/* MULTIPLE ITEM LIST */}
              <div className="space-y-4">
                {multipleItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-white rounded-lg border border-purple-100 shadow-sm space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">
                          Label <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="e.g., Page 1, Copy A"
                          value={item.label}
                          onChange={(e) => {
                            const updated = [...multipleItems];
                            updated[index].label = e.target.value;
                            setMultipleItems(updated);
                          }}
                          className="h-9 text-sm"
                        />
                      </div>
  
                      {multipleItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = multipleItems.filter((_, i) => i !== index);
                            setMultipleItems(
                              updated.length
                                ? updated
                                : [{ label: "", templateFile: null, templateUrl: undefined, templateInstructions: "", instruction: "" }]
                            );
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
  
                    {/* Instructions (Template only) */}
                    {type === "Template" && (
                      <>
                        <div>
                          <Label className="text-xs">Instructions (Optional)</Label>
                          <Textarea
                            placeholder="Item-specific instructions…"
                            value={item.instruction || ""}
                            onChange={(e) => {
                              const updated = [...multipleItems];
                              updated[index].instruction = e.target.value;
                              setMultipleItems(updated);
                            }}
                            rows={2}
                            className="text-xs mt-1"
                          />
                        </div>
  
                        {/* File upload */}
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Template File <span className="text-red-500">*</span>
                          </Label>
  
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              const updated = [...multipleItems];
                              updated[index].templateFile = file;
                              if (file) updated[index].templateUrl = undefined;
                              setMultipleItems(updated);
                            }}
                            className="text-xs h-9"
                            required
                          />
  
                          {(item.templateFile || item.templateUrl) && (
                            <p className="text-xs text-gray-700">
                              {item.templateFile ? (
                                `Selected: ${item.templateFile.name}`
                              ) : (
                                <a
                                  href={item.templateUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-700 underline"
                                >
                                  <LinkIcon className="h-3 w-3" />
                                  Download existing template
                                </a>
                              )}
                            </p>
                          )}
                        </div>
  
                        {/* Template instructions */}
                        <div>
                          <Label className="text-xs">Template Instructions (Optional)</Label>
                          <Textarea
                            placeholder="Instructions for filling this template…"
                            value={item.templateInstructions || ""}
                            onChange={(e) => {
                              const updated = [...multipleItems];
                              updated[index].templateInstructions = e.target.value;
                              setMultipleItems(updated);
                            }}
                            rows={2}
                            className="text-xs"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
  
              <p className="text-xs text-gray-600">
                {type === "Direct"
                  ? "Add multiple items if this document requires multiple uploads or parts."
                  : "Add multiple template files/pages as needed for this document."}
              </p>
            </div>
          )}
        </div>
      </div>
  
      {/* FOOTER */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={handleClose} className="h-10 px-6">
          Cancel
        </Button>
  
        <Button
          onClick={handleSubmit}
          disabled={
            !documentName.trim() ||
            submitting ||
            uploadingTemplate ||
            (copyType === "multiple" && multipleItems.filter((i) => i.label.trim()).length === 0) ||
            (copyType === "multiple" && type === "Template" && multipleItems.some((i) => i.label.trim() && !i.templateFile && !i.templateUrl))
          }
          className="h-10 px-6 bg-brand-hover hover:bg-brand-sidebar text-white"
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

