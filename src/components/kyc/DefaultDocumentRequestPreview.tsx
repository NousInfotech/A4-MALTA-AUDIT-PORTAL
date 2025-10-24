import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FileText,
  FileEdit,
  FileUp,
  Eye,
  Download,
  Plus,
  CheckCircle,
  Shield
} from "lucide-react";
import { defaultDocumentRequests, DefaultDocument, DefaultDocumentRequest } from "@/data/defaultDocumentRequests";
import { useToast } from "@/hooks/use-toast";

interface DefaultDocumentRequestPreviewProps {
  onAddDocuments: (selectedDocuments: DefaultDocument[]) => void;
  kycId?: string;
  engagementId?: string;
  clientId?: string;
}

export const DefaultDocumentRequestPreview: React.FC<DefaultDocumentRequestPreviewProps> = ({
  onAddDocuments,
  kycId,
  engagementId,
  clientId
}) => {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();

  // Load selected documents from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kyc-selected-documents');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSelectedDocuments(new Set(parsed));
      } catch (error) {
        console.error('Error parsing saved documents:', error);
      }
    }
  }, []);

  // Save selected documents to localStorage
  const saveToLocalStorage = (documents: Set<string>) => {
    localStorage.setItem('kyc-selected-documents', JSON.stringify(Array.from(documents)));
  };

  const handleDocumentToggle = (documentId: string) => {
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      newSelected.delete(documentId);
    } else {
      newSelected.add(documentId);
    }
    setSelectedDocuments(newSelected);
    saveToLocalStorage(newSelected);
  };

  const handleSelectAll = () => {
    const allDocumentIds = defaultDocumentRequests.flatMap(request => 
      request.documents.map(doc => doc.id)
    );
    const newSelected = new Set(allDocumentIds);
    setSelectedDocuments(newSelected);
    saveToLocalStorage(newSelected);
  };

  const handleDeselectAll = () => {
    setSelectedDocuments(new Set());
    saveToLocalStorage(new Set());
  };

  const handleAddSelectedDocuments = () => {
    const selectedDocs = defaultDocumentRequests
      .flatMap(request => request.documents)
      .filter(doc => selectedDocuments.has(doc.id));
    
    if (selectedDocs.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to add.",
        variant: "destructive",
      });
      return;
    }

    // Clear selected documents
    setSelectedDocuments(new Set());
    saveToLocalStorage(new Set());

    // Call the parent callback to add documents to the modal's document list
    onAddDocuments(selectedDocs);
    
    toast({
      title: "Documents Added",
      description: `${selectedDocs.length} document(s) have been added to the KYC workflow.`,
    });
  };

  const getDocumentIcon = (type: 'direct' | 'template') => {
    return type === 'template' ? (
      <FileEdit className="h-5 w-5 text-amber-600" />
    ) : (
      <FileUp className="h-5 w-5 text-gray-600" />
    );
  };

  const getDocumentTypeBadge = (type: 'direct' | 'template') => {
    return (
      <Badge 
        variant="outline" 
        className={type === 'template' 
          ? "text-amber-600 border-amber-300 bg-amber-50" 
          : "text-gray-600 border-gray-300 bg-gray-50"
        }
      >
        {type === 'template' ? 'Template' : 'Direct'}
      </Badge>
    );
  };

  const previewDocument = (url: string) => {
    window.open(url, '_blank');
  };

  const downloadDocument = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="bg-white border border-gray-200 rounded-2xl shadow-lg">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Default Document Requests
              </CardTitle>
              <CardDescription className="text-gray-700">
                Select documents to add to your KYC workflow
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSelectAll}
              className="border-gray-300 hover:bg-gray-100 text-gray-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Select All
            </Button>
            <Button
              variant="outline"
              onClick={handleDeselectAll}
              className="border-gray-300 hover:bg-gray-100 text-gray-700"
            >
              Deselect All
            </Button>
            <Button
              onClick={handleAddSelectedDocuments}
              disabled={selectedDocuments.size === 0}
              className="bg-gray-800 hover:bg-gray-900 text-white disabled:bg-gray-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Selected ({selectedDocuments.size})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-6">
          {defaultDocumentRequests.map((request) => (
            <div key={request.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{request.name}</h3>
                  <p className="text-sm text-gray-600">{request.description}</p>
                </div>
                <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">
                  {request.category}
                </Badge>
              </div>

              <div className="grid gap-3 ml-11">
                {request.documents.map((document) => (
                  <div
                    key={document.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      selectedDocuments.has(document.id)
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedDocuments.has(document.id)}
                        onCheckedChange={() => handleDocumentToggle(document.id)}
                        className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                      />
                      <div className="flex items-center gap-3">
                        {getDocumentIcon(document.type)}
                        <div>
                          <p className="font-medium text-gray-900">{document.name}</p>
                          <p className="text-sm text-gray-600">{document.description}</p>
                          {document.instruction && (
                            <p className="text-xs text-amber-600 mt-1 italic">
                              {document.instruction}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getDocumentTypeBadge(document.type)}
                      {document.required && (
                        <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                          Required
                        </Badge>
                      )}
                      {/* Only show preview/download buttons for template documents */}
                      {document.type === 'template' && document.url && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => previewDocument(document.url!)}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDocument(document.url!, document.name)}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedDocuments.size > 0 && (
          <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-900">
                  {selectedDocuments.size} document(s) selected
                </span>
              </div>
              <Button
                onClick={handleAddSelectedDocuments}
                className="bg-gray-800 hover:bg-gray-900 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Selected Documents
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
