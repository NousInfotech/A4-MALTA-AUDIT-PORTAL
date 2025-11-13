import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, FileText, FileEdit, FileUp, Search } from "lucide-react";
import { AddDocumentModal } from "../Library/AddDocumentModal";
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
import { useToast } from "@/hooks/use-toast";

interface LibraryDocument {
  id: string;
  documentName: string;
  description: string;
  uploadedBy: string;
  type: 'Template' | 'Direct';
}

// Mock data
const mockDocuments: LibraryDocument[] = [
  {
    id: '1',
    documentName: 'Bank Statement Template',
    description: 'Standard template for bank statement requests',
    uploadedBy: 'John Smith',
    type: 'Template'
  },
  {
    id: '2',
    documentName: 'ID Proof',
    description: 'Identity verification document',
    uploadedBy: 'Sarah Johnson',
    type: 'Direct'
  },
  {
    id: '3',
    documentName: 'Tax Return Form',
    description: 'Annual tax return documentation template',
    uploadedBy: 'Michael Brown',
    type: 'Template'
  },
  {
    id: '4',
    documentName: 'Proof of Address',
    description: 'Document to verify residential address',
    uploadedBy: 'Emily Davis',
    type: 'Direct'
  },
  {
    id: '5',
    documentName: 'Source of Wealth Declaration',
    description: 'Template for wealth declaration forms',
    uploadedBy: 'John Smith',
    type: 'Template'
  },
];

const Library = () => {
  const [documents, setDocuments] = useState<LibraryDocument[]>(mockDocuments);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    documentId?: string;
    documentName?: string;
  }>({ open: false });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = (id: string, name: string) => {
    setDeleteDialog({
      open: true,
      documentId: id,
      documentName: name,
    });
  };

  const confirmDelete = () => {
    if (deleteDialog.documentId) {
      setDocuments(documents.filter(doc => doc.id !== deleteDialog.documentId));
      toast({
        title: "Document Deleted",
        description: `${deleteDialog.documentName} has been deleted from the library`,
      });
      setDeleteDialog({ open: false });
    }
  };

  const handleEdit = (id: string) => {
    // TODO: Implement edit functionality
    toast({
      title: "Edit Document",
      description: "Edit functionality will be implemented soon",
    });
  };

  const handleAddDocument = (newDocument: Omit<LibraryDocument, 'id'>) => {
    const document: LibraryDocument = {
      ...newDocument,
      id: Date.now().toString(),
    };
    setDocuments([...documents, document]);
    setIsAddModalOpen(false);
    toast({
      title: "Document Added",
      description: `${newDocument.documentName} has been added to the library`,
    });
  };

  const getTypeBadge = (type: 'Template' | 'Direct') => {
    return type === 'Template' ? (
      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
        Template
      </Badge>
    ) : (
      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
        Direct
      </Badge>
    );
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || doc.type.toLowerCase() === typeFilter.toLowerCase();
    
    return matchesSearch && matchesType;
  });

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
                onClick={() => setIsAddModalOpen(true)}
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
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full lg:w-48 border-gray-300 focus:border-gray-500">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="template">Template</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
              </SelectContent>
            </Select>
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
              onClick={() => setIsAddModalOpen(true)}
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
            <div className="space-y-4">
              {filteredDocuments.map((doc) => (
                <div key={doc.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        {doc.type === 'Template' ? (
                          <FileEdit className="h-6 w-6 text-blue-700" />
                        ) : (
                          <FileUp className="h-6 w-6 text-green-700" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 text-lg">{doc.documentName}</h4>
                          {getTypeBadge(doc.type)}
                        </div>
                        {doc.description && (
                          <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded by: {doc.uploadedBy}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(doc.id)}
                        className="border-blue-300 hover:bg-blue-50 text-blue-700 h-8 px-3"
                        title="Edit Document"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(doc.id, doc.documentName)}
                        className="border-red-300 hover:bg-red-50 text-red-700 h-8 w-8 p-0"
                        title="Delete Document"
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
        onOpenChange={setIsAddModalOpen}
        onAdd={handleAddDocument}
      />

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
