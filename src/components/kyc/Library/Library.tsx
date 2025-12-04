import React, { useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, FileText, FileEdit, FileUp, Search, Download, ExternalLink } from "lucide-react";
import { AddDocumentModal, type DocumentFormValues } from "../Library/AddDocumentModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useDrList } from '@/hooks/useDocumentRequestTemplateHook';
import type { DocumentRequestTemplate, TemplateItem } from '@/lib/api/documentRequestTemplate';

// Mock data
// const mockDocuments: LibraryDocument[] = [
//   {
//     id: '1',
//     documentName: 'Bank Statement Template',
//     description: 'Standard template for bank statement requests',
//     uploadedBy: 'John Smith',
//     type: 'Template'
//   },
//   {
//     id: '2',
//     documentName: 'ID Proof',
//     description: 'Identity verification document',
//     uploadedBy: 'Sarah Johnson',
//     type: 'Direct'
//   },
//   {
//     id: '3',
//     documentName: 'Tax Return Form',
//     description: 'Annual tax return documentation template',
//     uploadedBy: 'Michael Brown',
//     type: 'Template'
//   },
//   {
//     id: '4',
//     documentName: 'Proof of Address',
//     description: 'Document to verify residential address',
//     uploadedBy: 'Emily Davis',
//     type: 'Direct'
//   },
//   {
//     id: '5',
//     documentName: 'Source of Wealth Declaration',
//     description: 'Template for wealth declaration forms',
//     uploadedBy: 'John Smith',
//     type: 'Template'
//   },
// ];

const Library = () => {
  const { drList, createDR, deleteDR, updateDR, updateDRList, deleteDRList } = useDrList();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    documentId?: string;
    documentName?: string;
  }>({ open: false });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentRequestTemplate | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [bulkUpdateOpen, setBulkUpdateOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkUpdateType, setBulkUpdateType] = useState<DocumentRequestTemplate["type"] | "unset">("unset");
  const [bulkUpdateCategory, setBulkUpdateCategory] = useState("");
  const [bulkUpdateDescription, setBulkUpdateDescription] = useState("");
  const [bulkUpdateActive, setBulkUpdateActive] = useState<boolean | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = (id: string, name: string) => {
    setDeleteDialog({
      open: true,
      documentId: id,
      documentName: name,
    });
  };

  const confirmDelete = async () => {
    if (deleteDialog.documentId) {
      await deleteDR(deleteDialog.documentId);
      setDeleteDialog({ open: false });
    }
  };

  const handleEdit = (doc: DocumentRequestTemplate) => {
    setEditingDoc(doc);
    setIsAddModalOpen(true);
  };

  const handleSaveDocument = async (newDoc: DocumentFormValues) => {
    // Check if it's multiple copies by checking if multiple array exists and has items
    const isMultipleCopies = newDoc.multiple && newDoc.multiple.length > 0;
    
    let normalizedType: DocumentRequestTemplate["type"];
    if (newDoc.type === "Template") {
      normalizedType = "template";
    } else {
      normalizedType = "direct";
    }

    const payload: Partial<DocumentRequestTemplate> = {
      name: newDoc.documentName,
      description: newDoc.description?.trim() || undefined,
      type: normalizedType,
      category: newDoc.category || "Others",
    };

    // For single copy template
    if (!isMultipleCopies && normalizedType === "template") {
      payload.template = {
        instructions: newDoc.templateInstructions?.trim() || undefined,
        url: newDoc.templateUrl,
      };
    }
    
    // For multiple copies (both direct and template)
    if (isMultipleCopies && newDoc.multiple) {
      payload.multiple = newDoc.multiple;
    }

    if (editingDoc && newDoc.id) {
      await updateDR(newDoc.id, payload);
    } else {
      await createDR(payload);
    }

    setIsAddModalOpen(false);
    setEditingDoc(null);
  };

  const clearSelection = () => setSelectedDocuments([]);

  const toggleDocumentSelection = (id: string, checked: boolean) => {
    setSelectedDocuments(prev =>
      checked ? Array.from(new Set([...prev, id])) : prev.filter(item => item !== id)
    );
  };

  const toggleSelectAll = (checked: boolean, documents: DocumentRequestTemplate[]) => {
    if (checked) {
      setSelectedDocuments(documents.map(doc => doc._id));
    } else {
      clearSelection();
    }
  };

  const resetBulkUpdateForm = () => {
    setBulkUpdateType("unset");
    setBulkUpdateCategory("");
    setBulkUpdateDescription("");
    setBulkUpdateActive(null);
  };

  const handleBulkUpdateSubmit = async () => {
    if (!selectedDocuments.length) {
      toast({
        title: "No documents selected",
        description: "Select at least one document to run a bulk update.",
        variant: "destructive",
      });
      return;
    }

    const payloadFields: Partial<DocumentRequestTemplate> = {};
    if (bulkUpdateType !== "unset") payloadFields.type = bulkUpdateType;
    if (bulkUpdateCategory.trim()) payloadFields.category = bulkUpdateCategory.trim();
    if (bulkUpdateDescription.trim()) payloadFields.description = bulkUpdateDescription.trim();
    if (bulkUpdateActive !== null) payloadFields.isActive = bulkUpdateActive;

    if (Object.keys(payloadFields).length === 0) {
      toast({
        title: "Missing fields",
        description: "Set at least one field to update.",
        variant: "destructive",
      });
      return;
    }

    setBulkUpdating(true);
    try {
      const payload = selectedDocuments.map(id => ({
        _id: id,
        ...payloadFields,
      }));
      await updateDRList(payload);
      toast({
        title: "Bulk update complete",
        description: `${selectedDocuments.length} document(s) updated`,
      });
      setBulkUpdateOpen(false);
      resetBulkUpdateForm();
      clearSelection();
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (!selectedDocuments.length) {
      toast({
        title: "No documents selected",
        description: "Select documents to delete in bulk.",
        variant: "destructive",
      });
      return;
    }
    setBulkDeleting(true);
    try {
      await deleteDRList(selectedDocuments);
      toast({
        title: "Bulk delete complete",
        description: `${selectedDocuments.length} document(s) deleted`,
      });
      setBulkDeleteOpen(false);
      clearSelection();
    } finally {
      setBulkDeleting(false);
    }
  };

  const openAddModal = () => {
    setEditingDoc(null);
    setIsAddModalOpen(true);
  };

  const getTypeBadge = (doc: DocumentRequestTemplate) => {
    const isMultiple = doc.multiple && doc.multiple.length > 0;
    const type = doc.type;
    
    if (type === 'template') {
      return (
        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
          {isMultiple ? 'Template (Multiple)' : 'Template'}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
          {isMultiple ? 'Direct (Multiple)' : 'Direct'}
        </Badge>
      );
    }
  };

  const filteredDocuments = useMemo(() => {
    return drList.filter(doc => {
      const matchesSearch =
        doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        typeFilter === "all" || 
        (typeFilter === "multiple" && doc.multiple && doc.multiple.length > 0) ||
        (typeFilter !== "multiple" && doc.type.toLowerCase() === typeFilter.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || (doc.category ?? "Others") === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [drList, searchTerm, typeFilter, categoryFilter]);

  const hasSelection = selectedDocuments.length > 0;
  const allFilteredSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every(doc => selectedDocuments.includes(doc._id));

  return (
    <div className="space-y-6 px-5 py-5">
      {/* Header */}
      <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-hover rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Create Template Document
                </CardTitle>
                <CardDescription className="text-gray-700">
                  Manage your KYC document templates and direct upload documents
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={openAddModal}
                className="bg-brand-hover hover:bg-brand-sidebar text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Search by document name, description, or uploaded by..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border-gray-300 focus:border-gray-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full lg:w-48 border-gray-300 focus:border-gray-500">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="multiple">Multiple</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full lg:w-56 border-gray-300 focus:border-gray-500">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Planning">Planning</SelectItem>
                  <SelectItem value="Capital & Reserves">Capital & Reserves</SelectItem>
                  <SelectItem value="Property, plant and equipment">Property, plant and equipment</SelectItem>
                  <SelectItem value="Intangible Assets">Intangible Assets</SelectItem>
                  <SelectItem value="Investment Property">Investment Property</SelectItem>
                  <SelectItem value="Investment in Subsidiaries & Associates investments">
                    Investment in Subsidiaries & Associates investments
                  </SelectItem>
                  <SelectItem value="Receivables">Receivables</SelectItem>
                  <SelectItem value="Payables">Payables</SelectItem>
                  <SelectItem value="Inventory">Inventory</SelectItem>
                  <SelectItem value="Bank & Cash">Bank & Cash</SelectItem>
                  <SelectItem value="Borrowings & loans">Borrowings & loans</SelectItem>
                  <SelectItem value="Taxation">Taxation</SelectItem>
                  <SelectItem value="Going Concern">Going Concern</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Documents</h3>
            <p className="text-gray-600 mb-4">
              Get started by adding your first document to the library
            </p>
            <Button
              onClick={openAddModal}
              className="bg-brand-hover hover:bg-brand-sidebar text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Document Library</h3>
              <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                {filteredDocuments.length} Document{filteredDocuments.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allFilteredSelected && filteredDocuments.length > 0}
                  onCheckedChange={(checked) =>
                    toggleSelectAll(checked === true, filteredDocuments)
                  }
                  aria-label="Select all filtered documents"
                />
                <span className="text-sm text-gray-600">
                  Select all ({filteredDocuments.length})
                </span>
              </div>
              {hasSelection && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <span className="font-medium text-blue-900">
                    {selectedDocuments.length} selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkUpdateOpen(true)}
                    className="border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    {allFilteredSelected ? "Update All" : "Update"}
                   </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBulkDeleteOpen(true)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {allFilteredSelected ? "Delete All" : "Delete"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Clear Selection
                  </Button>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc._id}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Checkbox
                        checked={selectedDocuments.includes(doc._id)}
                        onCheckedChange={(checked) => toggleDocumentSelection(doc._id, checked === true)}
                        aria-label={`Select ${doc.name}`}
                        className="mr-2"
                      />
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        {doc.type === "template" ? (
                          <FileEdit className="h-6 w-6 text-blue-700" />
                        ) : (
                          <FileUp className="h-6 w-6 text-green-700" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 text-lg">
                            {doc.name}
                          </h4>
                          {getTypeBadge(doc)}
                        </div>

                        {doc.description && (
                          <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                        )}
                        
                        {/* Single copy template */}
                        {doc.type === "template" && (!doc.multiple || doc.multiple.length === 0) && (
                          <div className="mt-2 space-y-2">
                            {doc.template?.instructions && (
                              <div className="text-sm text-blue-900 bg-blue-50 border border-blue-100 rounded-lg p-2">
                                <p className="font-medium mb-1">Client Instructions</p>
                                <p className="text-blue-800 whitespace-pre-line">
                                  {doc.template.instructions}
                                </p>
                              </div>
                            )}
                            {doc.template?.url && (
                              <a
                                href={doc.template.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900"
                              >
                                <Download className="h-4 w-4" />
                                Download Template
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Multiple copies (both Direct and Template) */}
                        {doc.multiple && doc.multiple.length > 0 && (
                          <div className="mt-2 space-y-2">
                            <div className={`text-sm border rounded-lg p-3 ${
                              doc.type === "template" 
                                ? "text-blue-900 bg-blue-50 border-blue-100" 
                                : "text-green-900 bg-green-50 border-green-100"
                            }`}>
                              <p className="font-medium mb-2">
                                Multiple Copies ({doc.multiple.length} {doc.multiple.length === 1 ? 'item' : 'items'})
                              </p>
                              <div className="space-y-3">
                                {doc.multiple.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-2 rounded border ${
                                      doc.type === "template"
                                        ? "bg-white border-blue-200"
                                        : "bg-white border-green-200"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={`font-medium text-sm ${
                                            doc.type === "template" ? "text-blue-900" : "text-green-900"
                                          }`}>
                                            {idx + 1}. {item.label}
                                          </span>
                                        </div>
                                        
                                        {/* Instruction field (outside) - only for Template type */}
                                        {doc.type === "template" && (item as TemplateItem).instruction && (
                                          <div className="mt-2 mb-2 text-xs text-blue-800 bg-blue-50 border border-blue-100 rounded p-2">
                                            <p className="font-medium mb-1">Instructions:</p>
                                            <p className="whitespace-pre-line">{(item as TemplateItem).instruction}</p>
                                          </div>
                                        )}
                                        
                                        {/* Template info - only for Template type */}
                                        {doc.type === "template" && item.template && (
                                          <div className="mt-2 space-y-1">
                                            {item.template.instructions && (
                                              <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded p-2">
                                                <p className="font-medium mb-1">Template Instructions:</p>
                                                <p className="whitespace-pre-line">{item.template.instructions}</p>
                                              </div>
                                            )}
                                            {item.template.url && (
                                              <a
                                                href={item.template.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
                                              >
                                                <Download className="h-3 w-3" />
                                                Download Template
                                              </a>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(doc)}
                        className="border-blue-300 hover:bg-blue-50 text-blue-700 h-8 px-3"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {doc.template?.url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-blue-300 hover:bg-blue-50 text-blue-700 h-8 px-3"
                      >
                      
                              <a
                                href={doc.template.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            
                      </Button>
                      )}
                     
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(doc._id, doc.name)}
                        className="border-red-300 hover:bg-red-50 text-red-700 h-8 px-3"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </CardContent>
        </Card>
      )}

      {/* Add Document Modal */}
      <AddDocumentModal
        open={isAddModalOpen}
        onOpenChange={(open) => {
          setIsAddModalOpen(open);
          if (!open) {
            setEditingDoc(null);
          }
        }}
        mode={editingDoc ? 'edit' : 'add'}
        initialData={
          editingDoc
            ? {
              id: editingDoc._id,
              documentName: editingDoc.name || "",
              description: editingDoc.description || "",
              type: editingDoc.type === "template" 
                ? "Template" 
                : "Direct",
              templateInstructions: editingDoc.template?.instructions || "",
              templateUrl: editingDoc.template?.url,
              multiple: editingDoc.multiple,
            }
            : undefined
        }
        onSubmit={handleSaveDocument}
      />

      <Dialog
        open={bulkUpdateOpen}
        onOpenChange={(open) => {
          if (bulkUpdating) return;
          setBulkUpdateOpen(open);
          if (!open) resetBulkUpdateForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update Documents</DialogTitle>
            <DialogDescription>
              Apply the same changes to all selected documents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-type">Type</Label>
              <Select
                value={bulkUpdateType}
                onValueChange={(value) =>
                  setBulkUpdateType(value as DocumentRequestTemplate["type"] | "unset")
                }
              >
                <SelectTrigger id="bulk-type" className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unset">Keep existing</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bulk-category">Category</Label>
              <Input
                id="bulk-category"
                placeholder="Leave blank to keep existing"
                value={bulkUpdateCategory}
                onChange={(e) => setBulkUpdateCategory(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="bulk-active">Active Status</Label>
                {bulkUpdateActive !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBulkUpdateActive(null)}
                  >
                    Keep existing
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Switch
                  id="bulk-active"
                  checked={bulkUpdateActive ?? false}
                  onCheckedChange={(checked) => setBulkUpdateActive(checked)}
                />
                <span className="text-sm text-gray-600">
                  {bulkUpdateActive === null
                    ? "Leave active status unchanged"
                    : bulkUpdateActive
                      ? "Set documents to Active"
                      : "Set documents to Inactive"}
                </span>
              </div>
            </div>

            {/* <div>
              <Label htmlFor="bulk-description">Description</Label>
              <Textarea
                id="bulk-description"
                placeholder="Leave blank to keep existing"
                value={bulkUpdateDescription}
                onChange={(e) => setBulkUpdateDescription(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div> */}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetBulkUpdateForm();
                setBulkUpdateOpen(false);
              }}
              disabled={bulkUpdating}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkUpdateSubmit} disabled={bulkUpdating}>
              {bulkUpdating ? "Updating..." : "Apply Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (bulkDeleting) return;
          setBulkDeleteOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Documents?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedDocuments.length} document
              {selectedDocuments.length !== 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleBulkDeleteConfirm}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.documentName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Library;
