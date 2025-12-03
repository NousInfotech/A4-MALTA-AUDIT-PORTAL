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
import { useToast } from "@/hooks/use-toast";
import { useDrList } from '@/hooks/useDocumentRequestTemplateHook';
import { DocumentRequestTemplate, TemplateItem } from '@/lib/api/documentRequestTemplate';

interface DefaultDocumentRequestPreviewProps {
  onAddDocuments: (selectedDocuments: DocumentRequestTemplate[]) => void;
  kycId?: string;  // kyc id
  engagementId?: string;  // engagement id
  clientId?: string;  // client id
}

export const DefaultDocumentRequestPreview: React.FC<DefaultDocumentRequestPreviewProps> = ({
  onAddDocuments,
  kycId, // kyc id
  engagementId, // engagement id
  clientId // client id
}) => {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set()); // selected documents
  const { toast } = useToast();
  const { drList } = useDrList();


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
    const allDocumentIds = drList.flatMap(request =>
      request._id
    );
    setSelectedDocuments(new Set(allDocumentIds));
  };
  const handleDeselectAll = () => {
    setSelectedDocuments(new Set());
  };

  const handleAddSelectedDocuments = () => {
    const selectedDocs = drList
      .filter(doc => selectedDocuments.has(doc._id));

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

  const getDocumentTypeBadge = (document: DocumentRequestTemplate) => {
    const isMultiple = document.multiple && document.multiple.length > 0;
    const type = document.type;
    const label = type === 'template' 
      ? (isMultiple ? 'Template (Multiple)' : 'Template')
      : (isMultiple ? 'Direct (Multiple)' : 'Direct');
    
    return (
      <Badge
        variant="outline"
        className={type === 'template'
          ? "text-amber-600 border-amber-300 bg-brand-body"
          : "text-gray-600 border-gray-300 bg-gray-50"
        }
      >
        {label}
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
            <div className="w-10 h-10 bg-brand-hover rounded-xl flex items-center justify-center">
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
              className="bg-brand-hover hover:bg-brand-sidebar text-white disabled:bg-gray-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Selected ({selectedDocuments.size})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="grid gap-3">
            {drList.map((document, index) => {
              const isMultiple = document.multiple && document.multiple.length > 0;
              
              return (
                <div
                  key={index}
                  className={`rounded-xl border-2 transition-all ${selectedDocuments.has(document._id)
                      ? 'border-amber-500 bg-brand-body'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4 flex-1">
                      <Checkbox
                        checked={selectedDocuments.has(document._id)}
                        onCheckedChange={() => handleDocumentToggle(document._id)}
                        className="data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        {getDocumentIcon(document.type as 'direct' | 'template')}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{document.name}</p>
                          <p className="text-sm text-gray-600">{document.description}</p>
                          
                          {/* Single copy template instructions */}
                          {!isMultiple && document.type === 'template' && document.template?.instructions && (
                            <p className="text-xs text-amber-600 mt-1 italic">
                              {document.template.instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {getDocumentTypeBadge(document)}
                    
                      {/* Preview/download buttons for single copy template */}
                      {!isMultiple && document.type === 'template' && document.template?.url && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => previewDocument(document.template?.url!)}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadDocument(document.template?.url!, document.name)}
                            className="border-gray-300 hover:bg-gray-100 text-gray-700"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Multiple copies display */}
                  {isMultiple && document.multiple && (
                    <div className={`px-4 pb-4 border-t ${
                      selectedDocuments.has(document._id)
                        ? 'border-amber-200'
                        : 'border-gray-200'
                    }`}>
                      <div className={`mt-3 space-y-2 ${
                        document.type === 'template'
                          ? 'text-amber-900 bg-amber-50 border border-amber-100 rounded-lg p-3'
                          : 'text-gray-900 bg-gray-50 border border-gray-100 rounded-lg p-3'
                      }`}>
                        <p className="font-medium text-sm mb-2">
                          Multiple Copies ({document.multiple.length} {document.multiple.length === 1 ? 'item' : 'items'})
                        </p>
                        <div className="space-y-2">
                          {document.multiple.map((item: TemplateItem, idx: number) => (
                            <div
                              key={idx}
                              className={`p-2 rounded border text-xs ${
                                document.type === 'template'
                                  ? 'bg-white border-amber-200'
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`font-medium ${
                                      document.type === 'template' ? 'text-amber-900' : 'text-gray-900'
                                    }`}>
                                      {idx + 1}. {item.label}
                                    </span>
                                  </div>
                                  
                                  {/* Instruction field (outside) - only for Template type */}
                                  {document.type === 'template' && item.instruction && (
                                    <div className="mt-1 mb-1 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded p-2">
                                      <p className="font-medium mb-1">Instructions:</p>
                                      <p className="whitespace-pre-line">{item.instruction}</p>
                                    </div>
                                  )}
                                  
                                  {/* Template info - only for Template type */}
                                  {document.type === 'template' && item.template && (
                                    <div className="mt-1 space-y-1">
                                      {item.template.instructions && (
                                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">
                                          <p className="font-medium mb-1">Template Instructions:</p>
                                          <p className="whitespace-pre-line">{item.template.instructions}</p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Download/preview buttons for template items */}
                                {document.type === 'template' && item.template?.url && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => previewDocument(item.template!.url!)}
                                      className="border-amber-300 hover:bg-amber-100 text-amber-700 h-7 px-2"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => downloadDocument(item.template!.url!, `${document.name} - ${item.label}`)}
                                      className="border-amber-300 hover:bg-amber-100 text-amber-700 h-7 px-2"
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selectedDocuments.size > 0 && (
          <div className="mt-6 p-4  bg-brand-body rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-900">
                  {selectedDocuments.size} document(s) selected
                </span>
              </div>
              <Button
                onClick={handleAddSelectedDocuments}
                className="bg-brand-hover hover:bg-brand-sidebar text-white"
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
