import React, { useState, useEffect } from 'react';
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
  Upload,
  Download,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  FileEdit,
  FileUp,
  Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { documentRequestApi, engagementApi } from "@/services/api";

interface Document {
  name: string;
  type: 'direct' | 'template';
  description?: string;
  template?: {
    url?: string;
    instruction?: string;
  };
  status: 'pending';
}

interface KYCDocumentRequestModalProps {
  engagementId: string;
  clientId: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function KYCDocumentRequestModal({
  engagementId,
  clientId,
  onSuccess,
  trigger
}: KYCDocumentRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [newDocument, setNewDocument] = useState<Partial<Document>>({
    name: '',
    type: 'direct',
    description: '',
    template: {
      instruction: ''
    }
  });
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [selectedEngagementId, setSelectedEngagementId] = useState<string>(engagementId || '');
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || '');
  const { toast } = useToast();

  // Fetch engagements when modal opens
  useEffect(() => {
    if (open) {
      fetchEngagements();
    }
  }, [open]);

  const fetchEngagements = async () => {
    try {
      const engagementsData = await engagementApi.getAll();
      setEngagements(engagementsData || []);
    } catch (error) {
      console.error('Error fetching engagements:', error);
      toast({
        title: "Error",
        description: "Failed to fetch engagements",
        variant: "destructive",
      });
    }
  };

  const handleEngagementChange = (engagementId: string) => {
    setSelectedEngagementId(engagementId);
    // Find the selected engagement and set the client ID
    const selectedEngagement = engagements.find(eng => eng._id === engagementId);
    if (selectedEngagement) {
      console.log('Selected engagement:', selectedEngagement);
      console.log('Engagement clientId:', selectedEngagement.clientId);
      setSelectedClientId(selectedEngagement.clientId || '');
    }
  };

  const handleAddDocument = () => {
    if (!newDocument.name?.trim()) {
      toast({
        title: "Error",
        description: "Document name is required",
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
    setTemplateFile(null);
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleTemplateUpload = async (file: File) => {
    try {
      setLoading(true);
      // Upload template file to get URL
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch('/api/upload/template', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload template');
      }
      
      const { url } = await uploadResponse.json();
      return url;
    } catch (error) {
      console.error('Template upload error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
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
      const processedDocuments = await Promise.all(
        documents.map(async (doc) => {
          if (doc.type === 'template' && templateFile) {
            const templateUrl = await handleTemplateUpload(templateFile);
            return {
              ...doc,
              template: {
                ...doc.template,
                url: templateUrl
              }
            };
          }
          return doc;
        })
      );

      // Create document request
      const documentRequestData = {
        engagementId: selectedEngagementId,
        clientId: selectedClientId,
        category: 'kyc',
        description: 'KYC Document Request',
        documents: processedDocuments
      };

      console.log('Creating KYC document request with data:', documentRequestData);
      await documentRequestApi.create(documentRequestData);

      toast({
        title: "Success",
        description: "Document request created successfully",
      });

      // Reset form
      setDocuments([]);
      setNewDocument({
        name: '',
        type: 'direct',
        description: '',
        template: {
          instruction: ''
        }
      });
      setTemplateFile(null);
      setSelectedEngagementId(engagementId || '');
      setSelectedClientId(clientId || '');
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating document request:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create document request",
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
            Create Document Request
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create KYC Document Request
          </DialogTitle>
          <DialogDescription>
            Create a document request for KYC compliance. Choose between Direct upload or Template-based workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Request Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="engagementSelect">Select Engagement *</Label>
                  <Select
                    value={selectedEngagementId}
                    onValueChange={handleEngagementChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an engagement..." />
                    </SelectTrigger>
                    <SelectContent>
                      {engagements.map((engagement) => (
                        <SelectItem key={engagement._id} value={engagement._id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{engagement.title || engagement.entityName}</span>
                            <span className="text-xs text-gray-500">
                              {engagement.yearEndDate ? new Date(engagement.yearEndDate).getFullYear() : 'No year'}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedEngagementId && (
                    <p className="text-xs text-amber-600 mt-1">
                      Please select an engagement to create KYC documents
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    value={selectedClientId || 'Not specified'}
                    disabled
                    className="bg-gray-50"
                    placeholder="Auto-populated from engagement"
                  />
                  {!selectedClientId && (
                    <p className="text-xs text-amber-600 mt-1">
                      Client ID will be auto-populated when engagement is selected
                    </p>
                  )}
                </div>
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
                      onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
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
              <CardTitle className="text-lg text-blue-800">Workflow Information</CardTitle>
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
              disabled={loading || documents.length === 0 || !selectedEngagementId}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Document Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
