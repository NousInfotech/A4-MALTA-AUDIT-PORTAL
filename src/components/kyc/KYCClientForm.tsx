import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle,
  AlertCircle,
  Shield,
  User,
  Building2,
  Calendar,
  Mail,
  Phone,
  Eye,
  Send
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
  uploadedFile?: File;
  uploadedUrl?: string;
  status?: 'pending' | 'uploaded' | 'reviewed';
}

interface KYCClientFormProps {
  kycData: any;
  onComplete: (completedData: any) => void;
}

export function KYCClientForm({ kycData, onComplete }: KYCClientFormProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<'info' | 'documents' | 'review' | 'complete'>('info');
  const [loading, setLoading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    clientName: kycData?.clientName || '',
    companyName: kycData?.companyName || '',
    contactEmail: kycData?.contactEmail || '',
    contactPhone: kycData?.contactPhone || '',
    additionalInfo: '',
    documents: kycData?.documents || [] as KYCDocument[],
  });

  const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize document statuses
    const documentsWithStatus = formData.documents.map(doc => ({
      ...doc,
      status: 'pending' as const
    }));
    setFormData(prev => ({ ...prev, documents: documentsWithStatus }));
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (documentId: string, file: File) => {
    setUploadingFiles(prev => new Set(prev).add(documentId));
    
    try {
      console.log(`📤 Uploading file for document ${documentId}:`, file.name);
      
      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentId}-${Date.now()}.${fileExt}`;
      const filePath = `kyc-documents/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      const fileUrl = urlData.publicUrl;
      
      // Update document status
      setFormData(prev => ({
        ...prev,
        documents: prev.documents.map(doc => 
          doc.id === documentId 
            ? { ...doc, uploadedFile: file, uploadedUrl: fileUrl, status: 'uploaded' as const }
            : doc
        )
      }));
      
      setUploadedDocuments(prev => ({ ...prev, [documentId]: fileUrl }));
      
      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded successfully`,
      });
      
    } catch (error: any) {
      console.error('❌ File upload failed:', error);
      toast({
        title: "Upload Failed",
        description: error?.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const handleDownloadTemplate = (templateUrl: string, documentName: string) => {
    // Create a temporary link to download the template
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = `${documentName}-template.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Template Downloaded",
      description: `${documentName} template has been downloaded`,
    });
  };

  const calculateProgress = () => {
    const requiredDocs = formData.documents.filter(d => d.type === 'required');
    const uploadedRequiredDocs = requiredDocs.filter(d => d.status === 'uploaded');
    return (uploadedRequiredDocs.length / requiredDocs.length) * 100;
  };

  const canProceedToReview = () => {
    const requiredDocs = formData.documents.filter(d => d.type === 'required');
    const uploadedRequiredDocs = requiredDocs.filter(d => d.status === 'uploaded');
    return uploadedRequiredDocs.length === requiredDocs.length;
  };

  const handleSubmitKYC = async () => {
    setLoading(true);
    
    try {
      console.log('🚀 Submitting KYC form...');
      console.log('📋 Form Data:', formData);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }
      
      // Update document request with uploaded documents
      if (kycData?.documentRequestId) {
        const documentRequestData = {
          documents: formData.documents
            .filter(doc => doc.status === 'uploaded')
            .map(doc => ({
              name: doc.uploadedFile?.name || doc.name,
              url: doc.uploadedUrl,
              uploadedAt: new Date().toISOString(),
              status: 'uploaded'
            }))
        };
        
        console.log('📄 Updating document request:', documentRequestData);
        await documentRequestApi.update(kycData.documentRequestId, documentRequestData);
      }
      
      // Add discussion to KYC workflow indicating completion
      if (kycData?.kycId) {
        const discussionData = {
          message: `KYC form completed by client. All required documents uploaded. Additional information: ${formData.additionalInfo || 'None provided.'}`,
          documentRef: null
        };
        
        console.log('💬 Adding completion discussion:', discussionData);
        await kycApi.addDiscussion(kycData.kycId, discussionData);
        
        // Update KYC status to in-review
        console.log('🔄 Updating KYC status to in-review...');
        await kycApi.updateStatus(kycData.kycId, 'in-review');
      }
      
      const completedData = {
        ...formData,
        submittedAt: new Date().toISOString(),
        status: 'completed',
        uploadedDocuments: uploadedDocuments,
        kycId: kycData?.kycId,
        documentRequestId: kycData?.documentRequestId
      };
      
      console.log('✅ KYC form submitted successfully!');
      onComplete(completedData);
      setCurrentStep('complete');
      
      toast({
        title: "KYC Form Submitted",
        description: "Your KYC information has been submitted successfully",
      });
      
    } catch (error: any) {
      console.error('❌ KYC form submission failed:', error);
      toast({
        title: "Submission Failed",
        description: error?.message || "Failed to submit KYC form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderInfoStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">KYC Information</h3>
        <p className="text-gray-600">Please provide your basic information</p>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Building2 className="h-5 w-5" />
            Personal & Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName" className="text-sm font-medium">Full Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                placeholder="Enter your full name"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="companyName" className="text-sm font-medium">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name"
                className="mt-1"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactEmail" className="text-sm font-medium">Email Address *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="your@email.com"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="contactPhone" className="text-sm font-medium">Phone Number *</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="mt-1"
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="additionalInfo" className="text-sm font-medium">Additional Information</Label>
            <Textarea
              id="additionalInfo"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              placeholder="Any additional information you'd like to provide..."
              rows={3}
              className="mt-1 resize-none"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Document Upload</h3>
        <p className="text-gray-600">Upload the required documents</p>
        
        <div className="mt-4">
          <Progress value={calculateProgress()} className="w-full max-w-md mx-auto" />
          <p className="text-sm text-gray-600 mt-2">
            {formData.documents.filter(d => d.type === 'required' && d.status === 'uploaded').length} of {formData.documents.filter(d => d.type === 'required').length} required documents uploaded
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {formData.documents.map((doc) => (
          <Card key={doc.id} className={`border-2 ${doc.status === 'uploaded' ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {doc.status === 'uploaded' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    )}
                    <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                    <Badge variant={doc.type === 'required' ? 'default' : 'secondary'}>
                      {doc.type}
                    </Badge>
                    {doc.isTemplate && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200">
                        Template Available
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                  
                  {doc.status === 'uploaded' && doc.uploadedFile && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Uploaded: {doc.uploadedFile.name}</span>
                    </div>
                  )}
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
                  
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(doc.id, file);
                        }
                      }}
                      className="hidden"
                      id={`file-${doc.id}`}
                      disabled={uploadingFiles.has(doc.id)}
                    />
                    <Button
                      variant={doc.status === 'uploaded' ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => document.getElementById(`file-${doc.id}`)?.click()}
                      disabled={uploadingFiles.has(doc.id)}
                    >
                      {uploadingFiles.has(doc.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          {doc.status === 'uploaded' ? 'Replace' : 'Upload'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h3>
        <p className="text-gray-600">Review your information before submitting</p>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-600">Name:</span>
              <p className="text-gray-900">{formData.clientName}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Company:</span>
              <p className="text-gray-900">{formData.companyName}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Email:</span>
              <p className="text-gray-900">{formData.contactEmail}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-600">Phone:</span>
              <p className="text-gray-900">{formData.contactPhone}</p>
            </div>
          </div>
          {formData.additionalInfo && (
            <div>
              <span className="text-sm font-medium text-gray-600">Additional Information:</span>
              <p className="text-gray-900 whitespace-pre-wrap">{formData.additionalInfo}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {formData.documents.filter(d => d.status === 'uploaded').map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <span className="font-medium text-gray-900">{doc.name}</span>
                  <p className="text-sm text-gray-600">{doc.uploadedFile?.name}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-10 w-10 text-white" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">KYC Form Submitted!</h3>
        <p className="text-gray-600 text-lg">
          Your KYC information has been successfully submitted and is now under review.
        </p>
      </div>
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
        <h4 className="font-semibold text-green-800 mb-2">What happens next?</h4>
        <ul className="text-left text-sm text-gray-700 space-y-1">
          <li>• Your documents will be reviewed by our audit team</li>
          <li>• You may receive requests for additional information</li>
          <li>• You'll be notified once the review is complete</li>
          <li>• You can track progress through the portal</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KYC Form</h1>
            <p className="text-gray-600">Complete your Know Your Client requirements</p>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          {['info', 'documents', 'review', 'complete'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step 
                  ? 'bg-blue-600 text-white' 
                  : ['info', 'documents', 'review'].indexOf(currentStep) > ['info', 'documents', 'review'].indexOf(step)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              {index < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  ['info', 'documents', 'review'].indexOf(currentStep) > index
                    ? 'bg-green-600'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="py-6">
        {currentStep === 'info' && renderInfoStep()}
        {currentStep === 'documents' && renderDocumentsStep()}
        {currentStep === 'review' && renderReviewStep()}
        {currentStep === 'complete' && renderCompleteStep()}
      </div>

      <div className="flex justify-between">
        <div>
          {currentStep !== 'info' && currentStep !== 'complete' && (
            <Button 
              variant="outline" 
              onClick={() => {
                const steps = ['info', 'documents', 'review', 'complete'];
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex > 0) {
                  setCurrentStep(steps[currentIndex - 1] as any);
                }
              }}
            >
              Previous
            </Button>
          )}
        </div>
        
        <div>
          {currentStep === 'info' && (
            <Button 
              onClick={() => setCurrentStep('documents')}
              disabled={!formData.clientName || !formData.companyName || !formData.contactEmail || !formData.contactPhone}
            >
              Next: Upload Documents
            </Button>
          )}
          
          {currentStep === 'documents' && (
            <Button 
              onClick={() => setCurrentStep('review')}
              disabled={!canProceedToReview()}
            >
              Next: Review & Submit
            </Button>
          )}
          
          {currentStep === 'review' && (
            <Button 
              onClick={handleSubmitKYC}
              disabled={loading}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit KYC Form
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
