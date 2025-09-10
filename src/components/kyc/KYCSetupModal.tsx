import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Upload, 
  Plus, 
  Trash2, 
  Shield, 
  User, 
  Building2,
  CheckCircle,
  AlertCircle,
  Download,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { kycApi, documentRequestApi } from "@/services/api";
import { supabase } from "@/integrations/supabase/client";

interface KYCDocument {
  id: string;
  name: string;
  type: 'required' | 'optional';
  description: string;
  templateUrl?: string;
  isTemplate: boolean;
}

interface KYCSetupModalProps {
  selectedEngagement: any | null;
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onKYCComplete: (kycData: any) => void;
}

export function KYCSetupModal({
  selectedEngagement,
  open,
  onOpenChange,
  onKYCComplete,
}: KYCSetupModalProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<'setup' | 'preview' | 'complete'>('setup');
  const [kycData, setKycData] = useState({
    clientName: selectedEngagement?.clientName || '',
    companyName: selectedEngagement?.companyName || '',
    documents: [] as KYCDocument[],
    instructions: '',
    deadline: '',
    contactEmail: '',
    contactPhone: '',
  });

  // Default KYC documents based on the requirements
  const defaultDocuments: KYCDocument[] = [
    {
      id: '1',
      name: 'Passport',
      type: 'required',
      description: 'Valid passport copy (front and back)',
      isTemplate: false,
    },
    {
      id: '2',
      name: 'Utility Bill',
      type: 'required',
      description: 'Recent utility bill (electricity, water, gas) not older than 3 months',
      isTemplate: false,
    },
    {
      id: '3',
      name: 'Source of Wealth',
      type: 'required',
      description: 'Documentation proving the source of wealth and income',
      templateUrl: '/demo-pdfs/sample-agreement.pdf',
      isTemplate: true,
    },
    {
      id: '4',
      name: 'PEP Declaration',
      type: 'required',
      description: 'Politically Exposed Person declaration form',
      templateUrl: '/demo-pdfs/sample-agreement.pdf',
      isTemplate: true,
    },
    {
      id: '5',
      name: 'Company Activity',
      type: 'required',
      description: 'Detailed description of company business activities',
      templateUrl: '/demo-pdfs/sample-agreement.pdf',
      isTemplate: true,
    },
    {
      id: '6',
      name: 'Company Profile',
      type: 'required',
      description: 'Complete company profile and corporate structure',
      templateUrl: '/demo-pdfs/sample-agreement.pdf',
      isTemplate: true,
    },
    {
      id: '7',
      name: 'Other Documents',
      type: 'optional',
      description: 'Additional documents as requested by auditor',
      isTemplate: false,
    },
  ];

  const [documents, setDocuments] = useState<KYCDocument[]>(defaultDocuments);
  const [newDocument, setNewDocument] = useState({
    name: '',
    description: '',
    type: 'required' as 'required' | 'optional',
    isTemplate: false,
  });

  const handleAddDocument = () => {
    if (!newDocument.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a document name",
        variant: "destructive",
      });
      return;
    }

    const document: KYCDocument = {
      id: Date.now().toString(),
      name: newDocument.name,
      type: newDocument.type,
      description: newDocument.description,
      isTemplate: newDocument.isTemplate,
      templateUrl: newDocument.isTemplate ? '/demo-pdfs/sample-agreement.pdf' : undefined,
    };

    setDocuments([...documents, document]);
    setNewDocument({ name: '', description: '', type: 'required', isTemplate: false });
    
    toast({
      title: "Document Added",
      description: `${newDocument.name} has been added to the KYC requirements`,
    });
  };

  const handleRemoveDocument = (id: string) => {
    setDocuments(documents.filter(doc => doc.id !== id));
    toast({
      title: "Document Removed",
      description: "Document has been removed from KYC requirements",
    });
  };

  const handleToggleDocument = (id: string) => {
    setDocuments(documents.map(doc => 
      doc.id === id ? { ...doc, type: doc.type === 'required' ? 'optional' : 'required' } : doc
    ));
  };

  const handleProceedToPreview = () => {
    if (documents.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one document requirement",
        variant: "destructive",
      });
      return;
    }

    setKycData(prev => ({ ...prev, documents }));
    setCurrentStep('preview');
  };

  const handleCompleteKYC = async () => {
    console.log('🚀 Starting KYC API Integration Process...');
    console.log('📋 KYC Data:', {
      engagementId: selectedEngagement?._id,
      clientId: selectedEngagement?.clientId,
      clientName: kycData.clientName,
      companyName: kycData.companyName,
      documentsCount: documents.length,
      requiredDocuments: documents.filter(d => d.type === 'required').length,
      optionalDocuments: documents.filter(d => d.type === 'optional').length
    });

    try {
      // Step 1: Get current user info
      console.log('👤 Step 1: Getting current user info...');
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ User authentication failed:', userError);
        throw new Error(`User authentication failed: ${userError.message}`);
      }
      
      if (!user) {
        console.error('❌ No user found');
        throw new Error('User not authenticated');
      }
      
      console.log('✅ User authenticated successfully:', {
        userId: user.id,
        userEmail: user.email
      });

      // Step 2: Create document request for KYC
      console.log('📄 Step 2: Creating document request...');
      const documentRequestData = {
        engagementId: selectedEngagement?._id,
        clientId: selectedEngagement?.clientId,
        category: 'KYC Documents',
        description: `KYC document requirements for ${kycData.clientName || selectedEngagement?.title}. Required documents: ${documents.filter(d => d.type === 'required').map(d => d.name).join(', ')}`,
      };

      console.log('📤 Sending document request data:', documentRequestData);
      const documentRequest = await documentRequestApi.create(documentRequestData);
      console.log('✅ Document request created successfully:', {
        requestId: documentRequest._id,
        status: documentRequest.status || 'created'
      });

      // Step 3: Create KYC workflow
      console.log('🔄 Step 3: Creating KYC workflow...');
      const kycWorkflowData = {
        engagementId: selectedEngagement?._id,
        clientId: selectedEngagement?.clientId,
        auditorId: user.id,
        documentRequestId: documentRequest._id,
      };

      console.log('📤 Sending KYC workflow data:', kycWorkflowData);
      const kycWorkflow = await kycApi.create(kycWorkflowData);
      console.log('✅ KYC workflow created successfully:', {
        kycId: kycWorkflow._id,
        status: kycWorkflow.status || 'created'
      });

      // Step 4: Prepare final data
      const finalKycData = {
        ...kycData,
        documents,
        createdAt: new Date().toISOString(),
        status: 'pending',
        engagementId: selectedEngagement?._id,
        kycId: kycWorkflow._id,
        documentRequestId: documentRequest._id,
      };

      console.log('🎉 KYC API Integration completed successfully!');
      console.log('📊 Final KYC Data:', finalKycData);

      // Step 5: Complete the process
      onKYCComplete(finalKycData);
      setCurrentStep('complete');
      
      toast({
        title: "KYC Setup Complete",
        description: "KYC workflow has been created and sent to the client",
      });

      console.log('✅ KYC process completed, closing modal in 2 seconds...');
      setTimeout(() => {
        onOpenChange(false);
        setCurrentStep('setup');
        console.log('🔚 KYC modal closed');
      }, 2000);

    } catch (error: any) {
      console.error('❌ KYC API Integration failed!');
      console.error('🔍 Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code,
        status: error?.status,
        response: error?.response
      });

      // Log specific API errors
      if (error?.response) {
        console.error('📡 API Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }

      // Log network errors
      if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('fetch')) {
        console.error('🌐 Network Error detected - check internet connection and API endpoints');
      }

      // Log authentication errors
      if (error?.message?.includes('authentication') || error?.message?.includes('unauthorized')) {
        console.error('🔐 Authentication Error detected - check user session');
      }

      toast({
        title: "KYC Setup Failed",
        description: error?.message || "Failed to create KYC workflow. Check console for details.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadTemplate = (templateUrl: string, documentName: string) => {
    // Simulate template download
    toast({
      title: "Template Downloaded",
      description: `${documentName} template has been downloaded`,
    });
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      {/* Client Information */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Building2 className="h-5 w-5" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName" className="text-sm font-medium">Client Name</Label>
              <Input
                id="clientName"
                value={kycData.clientName}
                onChange={(e) => setKycData(prev => ({ ...prev, clientName: e.target.value }))}
                placeholder="Enter client name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="companyName" className="text-sm font-medium">Company Name</Label>
              <Input
                id="companyName"
                value={kycData.companyName}
                onChange={(e) => setKycData(prev => ({ ...prev, companyName: e.target.value }))}
                placeholder="Enter company name"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail" className="text-sm font-medium">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={kycData.contactEmail}
                onChange={(e) => setKycData(prev => ({ ...prev, contactEmail: e.target.value }))}
                placeholder="client@company.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone" className="text-sm font-medium">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={kycData.contactPhone}
                onChange={(e) => setKycData(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="deadline" className="text-sm font-medium">Submission Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={kycData.deadline}
              onChange={(e) => setKycData(prev => ({ ...prev, deadline: e.target.value }))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Requirements */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Shield className="h-5 w-5" />
            KYC Document Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Documents */}
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={doc.type === 'required'}
                    onCheckedChange={() => handleToggleDocument(doc.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{doc.name}</span>
                      <Badge variant={doc.type === 'required' ? 'default' : 'secondary'}>
                        {doc.type}
                      </Badge>
                      {doc.isTemplate && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          Template Available
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {doc.isTemplate && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadTemplate(doc.templateUrl!, doc.name)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Template
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveDocument(doc.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Document */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Add Custom Document</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  placeholder="Document name"
                  value={newDocument.name}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, name: e.target.value }))}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={newDocument.type === 'required'}
                    onCheckedChange={(checked) => 
                      setNewDocument(prev => ({ ...prev, type: checked ? 'required' : 'optional' }))
                    }
                  />
                  <Label className="text-sm">Required</Label>
                </div>
              </div>
              <Textarea
                placeholder="Document description"
                value={newDocument.description}
                onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={newDocument.isTemplate}
                  onCheckedChange={(checked) => 
                    setNewDocument(prev => ({ ...prev, isTemplate: checked as boolean }))
                  }
                />
                <Label className="text-sm">Provide template</Label>
              </div>
              <Button onClick={handleAddDocument} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <FileText className="h-5 w-5" />
            Additional Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add any specific instructions for the client regarding document submission..."
            value={kycData.instructions}
            onChange={(e) => setKycData(prev => ({ ...prev, instructions: e.target.value }))}
            rows={4}
            className="resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">KYC Setup Preview</h3>
        <p className="text-gray-600">Review the KYC requirements before sending to client</p>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-600">Client:</span>
              <p className="text-gray-900">{kycData.clientName}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Company:</span>
              <p className="text-gray-900">{kycData.companyName}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Email:</span>
              <p className="text-gray-900">{kycData.contactEmail}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Phone:</span>
              <p className="text-gray-900">{kycData.contactPhone}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Deadline:</span>
              <p className="text-gray-900">{kycData.deadline ? new Date(kycData.deadline).toLocaleDateString() : 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Required Documents ({documents.filter(d => d.type === 'required').length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {documents.filter(d => d.type === 'required').map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <span className="font-medium text-gray-900">{doc.name}</span>
                  {doc.isTemplate && (
                    <Badge variant="outline" className="ml-2 text-blue-600 border-blue-200">
                      Template Available
                    </Badge>
                  )}
                  <p className="text-sm text-gray-600">{doc.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {documents.filter(d => d.type === 'optional').length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
          <CardHeader>
            <CardTitle className="text-yellow-800">Optional Documents ({documents.filter(d => d.type === 'optional').length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.filter(d => d.type === 'optional').map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <span className="font-medium text-gray-900">{doc.name}</span>
                    {doc.isTemplate && (
                      <Badge variant="outline" className="ml-2 text-blue-600 border-blue-200">
                        Template Available
                      </Badge>
                    )}
                    <p className="text-sm text-gray-600">{doc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {kycData.instructions && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-purple-800">Additional Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{kycData.instructions}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-10 w-10 text-white" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">KYC Setup Complete!</h3>
        <p className="text-gray-600 text-lg">
          The KYC requirements have been configured and will be sent to the client.
        </p>
      </div>
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
        <h4 className="font-semibold text-green-800 mb-2">What happens next?</h4>
        <ul className="text-left text-sm text-gray-700 space-y-1">
          <li>• Client will receive an email with KYC requirements</li>
          <li>• Client can upload documents through the portal</li>
          <li>• You can track submission progress in real-time</li>
          <li>• Templates are available for client download</li>
        </ul>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Shield className="h-6 w-6 text-blue-600" />
            KYC Setup - {selectedEngagement?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {currentStep === 'setup' && renderSetupStep()}
          {currentStep === 'preview' && renderPreviewStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep === 'preview' && (
              <Button variant="outline" onClick={() => setCurrentStep('setup')}>
                Back to Edit
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
          <div>
            {currentStep === 'setup' && (
              <Button onClick={handleProceedToPreview} className="bg-gradient-to-r from-blue-600 to-indigo-600">
                Preview KYC Setup
              </Button>
            )}
            {currentStep === 'preview' && (
              <Button onClick={handleCompleteKYC} className="bg-gradient-to-r from-green-600 to-emerald-600">
                Complete KYC Setup
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
