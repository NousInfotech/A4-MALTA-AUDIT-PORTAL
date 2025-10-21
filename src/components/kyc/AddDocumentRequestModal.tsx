import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  X,
  CheckCircle,
  FileEdit,
  FileUp,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { kycApi, documentRequestApi } from "@/services/api";

interface Document {
  name: string;
  type: 'direct' | 'template';
  description?: string;
  template?: {
    url?: string;
    instruction?: string;
  };
  templateFile?: File; // Store the file temporarily before upload
  status: 'pending';
}

interface AddDocumentRequestModalProps {
  kycId: string;
  engagementId: string;
  clientId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function AddDocumentRequestModal({
  kycId,
  engagementId,
  clientId,
  onSuccess,
  trigger
}: AddDocumentRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestDescription, setRequestDescription] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocument, setNewDocument] = useState<Partial<Document>>({
    name: '',
    type: 'direct',
    description: '',
    template: {
      instruction: ''
    }
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

    // Validate template file if type is template
    if (newDocument.type === 'template' && !currentTemplateFile) {
      toast({
        title: "Template File Required",
        description: "Please upload a template file for template-based documents",
        variant: "destructive",
      });
      return;
    }

    const document: Document = {
      name: newDocument.name.trim(),
      type: newDocument.type || 'direct',
      description: newDocument.description?.trim() || '',
      template: newDocument.type === 'template' ? {
        instruction: newDocument.template?.instruction?.trim() || ''
      } : undefined,
      templateFile: newDocument.type === 'template' ? currentTemplateFile || undefined : undefined,
      status: 'pending'
    };

    setDocuments(prev => [...prev, document]);
    setNewDocument({
      name: '',
      type: 'direct',
      description: '',
      template: {
        instruction: ''
      }
    });
    setCurrentTemplateFile(null);
    
    toast({
      title: "Document Added",
      description: `${newDocument.name} has been added to the request`,
    });
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateUpload = async (file: File) => {
    try {
      setLoading(true);
      console.log('Uploading template file:', file.name);
      
      const response = await documentRequestApi.uploadTemplate(file);
      console.log('Template upload successful:', response);
      
      return response.url;
    } catch (error) {
      console.error('Template upload error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!requestName.trim()) {
      toast({
        title: "Error",
        description: "Request name is required",
        variant: "destructive",
      });
      return;
    }

    if (documents.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one document",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Process documents with template uploads
      console.log('📤 Processing documents and uploading templates...');
      const processedDocuments = await Promise.all(
        documents.map(async (doc) => {
          if (doc.type === 'template' && doc.templateFile) {
            try {
              console.log(`  → Uploading template for "${doc.name}"`);
              const templateUrl = await handleTemplateUpload(doc.templateFile);
              console.log(`  ✅ Template uploaded: ${templateUrl}`);
              return {
                ...doc,
                template: {
                  ...doc.template,
                  url: templateUrl
                },
                templateFile: undefined // Remove the file from the final object
              };
            } catch (error) {
              console.error(`  ❌ Failed to upload template for document: ${doc.name}`, error);
              toast({
                title: "Template Upload Failed",
                description: `Failed to upload template for "${doc.name}". Please try again.`,
                variant: "destructive",
              });
              throw error; // Re-throw to stop the entire process
            }
          }
          return doc;
        })
      );
      console.log('✅ All templates uploaded successfully');
      console.log('📋 Processed documents:', JSON.stringify(processedDocuments, null, 2));

      // Step 1: Create a new DocumentRequest
      const documentRequestData = {
        engagementId: engagementId,
        clientId: clientId,
        name: requestName.trim(),
        category: 'kyc',
        description: requestDescription.trim() || 'Additional KYC Document Request',
        documents: processedDocuments
      };

      console.log('=== Step 1: Creating DocumentRequest ===');
      console.log('DocumentRequest data:', JSON.stringify(documentRequestData, null, 2));
      console.log('Engagement ID being used:', engagementId);
      
      const response = await documentRequestApi.create(documentRequestData);
      console.log('Full API response:', JSON.stringify(response, null, 2));
      
      // Extract the actual document request from the response
      const createdDocumentRequest = response.documentRequest || response;
      console.log('Extracted DocumentRequest:', createdDocumentRequest);
      console.log('DocumentRequest._id:', createdDocumentRequest._id);
      console.log('DocumentRequest.engagement:', createdDocumentRequest.engagement);

      // Step 2: Attach the DocumentRequest to the KYC workflow
      console.log('=== Step 2: Attaching to KYC ===');
      console.log('KYC ID:', kycId);
      console.log('DocumentRequest ID to attach:', createdDocumentRequest._id);
      console.log('Expected engagement match:', engagementId);
      
      const attachPayload = {
        documentRequestId: createdDocumentRequest._id
      };
      console.log('Attach payload:', attachPayload);
      
      await kycApi.addDocumentRequest(kycId, attachPayload);

      toast({
        title: "Success",
        description: "Document request added to KYC workflow successfully",
      });

      // Reset form
      setRequestName('');
      setRequestDescription('');
      setDocuments([]);
      setNewDocument({
        name: '',
        type: 'direct',
        description: '',
        template: {
          instruction: ''
        }
      });
      setCurrentTemplateFile(null);
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adding document request to KYC:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add document request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeIcon = (type: string) => {
    return type === 'template' ? (
      <FileEdit className="h-4 w-4 text-blue-600" />
    ) : (
      <FileUp className="h-4 w-4 text-green-600" />
    );
  };

  const getDocumentTypeBadge = (type: string) => {
    return type === 'template' ? (
      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
        <FileEdit className="h-3 w-3 mr-1" />
        Template
      </Badge>
    ) : (
      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
        <FileUp className="h-3 w-3 mr-1" />
        Direct
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Document Request
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Add Document Request to KYC
          </DialogTitle>
          <DialogDescription>
            Create a new document request and add it to this KYC workflow. This allows you to request additional documents from the client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="requestName">Request Name *</Label>
                <Input
                  id="requestName"
                  placeholder="e.g., Additional Financial Documents"
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="requestDescription">Description</Label>
                <Textarea
                  id="requestDescription"
                  placeholder="Describe what documents are needed and why..."
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add New Document */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="documentName">Document Name *</Label>
                  <Input
                    id="documentName"
                    placeholder="e.g., Bank Statements, ID Proof"
                    value={newDocument.name || ''}
                    onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="documentType">Request Type *</Label>
                  <Select
                    value={newDocument.type || 'direct'}
                    onValueChange={(value: 'direct' | 'template') => 
                      setNewDocument(prev => ({ ...prev, type: value }))
                    }
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
                <Label htmlFor="documentDescription">Description</Label>
                <Textarea
                  id="documentDescription"
                  placeholder="Describe what documents are needed..."
                  value={newDocument.description || ''}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              {newDocument.type === 'template' && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Template-based Workflow</span>
                  </div>
                  
                  <div>
                    <Label htmlFor="templateFile">Template File</Label>
                    <Input
                      id="templateFile"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => setCurrentTemplateFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Upload a template file that clients will download and fill out
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="templateInstructions">Instructions for Client</Label>
                    <Textarea
                      id="templateInstructions"
                      placeholder="Provide clear instructions on how to fill the template..."
                      value={newDocument.template?.instruction || ''}
                      onChange={(e) => setNewDocument(prev => ({
                        ...prev,
                        template: { ...prev.template, instruction: e.target.value }
                      }))}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleAddDocument}
                disabled={!newDocument.name?.trim()}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </CardContent>
          </Card>

          {/* Documents List */}
          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Documents to Request ({documents.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {getDocumentTypeIcon(doc.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{doc.name}</span>
                            {getDocumentTypeBadge(doc.type)}
                          </div>
                          {doc.description && (
                            <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                          )}
                          {doc.type === 'template' && doc.template?.instruction && (
                            <p className="text-xs text-blue-600 mt-1">
                              Instructions: {doc.template.instruction}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveDocument(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Workflow Information */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg text-blue-800">About Document Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <FileUp className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Direct Upload</h4>
                    <p className="text-sm text-gray-600">
                      Client uploads documents directly without a template
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
                  <FileEdit className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Template-based</h4>
                    <p className="text-sm text-gray-600">
                      Client downloads template, fills it out, and uploads the completed document
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-white rounded-lg">
                <p className="text-sm text-gray-700">
                  💡 <strong>Tip:</strong> You can add multiple document requests to the same KYC workflow to organize documents by category (e.g., Financial Documents, Legal Documents, Tax Documents).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || documents.length === 0 || !requestName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add to KYC Workflow
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

