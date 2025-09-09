import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Shield,
  Building2,
  Calendar,
  Mail,
  Phone,
  Eye,
  FileCheck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface KYCDocument {
  id: string;
  name: string;
  type: 'required' | 'optional';
  description: string;
  templateUrl?: string;
  isTemplate: boolean;
  status: 'pending' | 'uploaded' | 'approved' | 'rejected';
  uploadedFile?: File;
  uploadedAt?: string;
  notes?: string;
}

interface KYCClientViewProps {
  kycData: any;
  onDocumentUpload: (documentId: string, file: File) => void;
  onDocumentDownload: (templateUrl: string, documentName: string) => void;
}

export function KYCClientView({
  kycData,
  onDocumentUpload,
  onDocumentDownload,
}: KYCClientViewProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<KYCDocument[]>(
    kycData.documents.map((doc: any) => ({
      ...doc,
      status: 'pending' as const,
    }))
  );

  const handleFileUpload = (documentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload PDF, JPEG, or PNG files only",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setDocuments(docs => 
      docs.map(doc => 
        doc.id === documentId 
          ? { 
              ...doc, 
              status: 'uploaded' as const,
              uploadedFile: file,
              uploadedAt: new Date().toISOString(),
            }
          : doc
      )
    );

    onDocumentUpload(documentId, file);
    
    toast({
      title: "Document uploaded",
      description: `${file.name} has been uploaded successfully`,
    });
  };

  const handleDownloadTemplate = (templateUrl: string, documentName: string) => {
    onDocumentDownload(templateUrl, documentName);
    toast({
      title: "Template downloaded",
      description: `${documentName} template has been downloaded`,
    });
  };


  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <Badge variant="default" className="bg-green-100 text-green-800">Uploaded</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const uploadedCount = documents.filter(doc => doc.status === 'uploaded' || doc.status === 'approved').length;
  const requiredCount = documents.filter(doc => doc.type === 'required').length;
  const progressPercentage = (uploadedCount / requiredCount) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Know Your Client (KYC)
              </h1>
              <p className="text-slate-600 mt-1 text-lg">
                Complete your KYC requirements to proceed with the engagement
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <FileCheck className="h-5 w-5" />
            Submission Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Required Documents</span>
            <span className="text-sm font-bold text-gray-900">{uploadedCount} / {requiredCount}</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
          <div className="text-center">
            <span className="text-2xl font-bold text-blue-600">{Math.round(progressPercentage)}%</span>
            <p className="text-sm text-gray-600">Complete</p>
          </div>
        </CardContent>
      </Card>

      {/* Client Information */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Building2 className="h-5 w-5" />
            Engagement Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-semibold text-gray-900">{kycData.clientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl">
              <Building2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Company</p>
                <p className="font-semibold text-gray-900">{kycData.companyName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
              <Calendar className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Deadline</p>
                <p className="font-semibold text-gray-900">
                  {kycData.deadline ? new Date(kycData.deadline).toLocaleDateString() : 'Not set'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl">
              <Mail className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="font-semibold text-gray-900">{kycData.contactEmail}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Requirements */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Document Requirements</h2>
        
        {/* Required Documents */}
        <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              Required Documents ({documents.filter(d => d.type === 'required').length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.filter(d => d.type === 'required').map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-200 hover:border-green-300 transition-colors">
                <div className="flex items-center gap-4">
                  {getStatusIcon(doc.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                      {getStatusBadge(doc.status)}
                      {doc.isTemplate && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          Template Available
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                    {doc.uploadedFile && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <FileText className="h-4 w-4" />
                        <span>Uploaded: {doc.uploadedFile.name}</span>
                        <span>•</span>
                        <span>{new Date(doc.uploadedAt!).toLocaleDateString()}</span>
                      </div>
                    )}
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
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileUpload(doc.id, e)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={doc.status === 'uploaded' || doc.status === 'approved'}
                    />
                    <Button
                      variant={doc.status === 'uploaded' || doc.status === 'approved' ? "outline" : "default"}
                      size="sm"
                      disabled={doc.status === 'uploaded' || doc.status === 'approved'}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {doc.status === 'uploaded' || doc.status === 'approved' ? 'Uploaded' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Optional Documents */}
        {documents.filter(d => d.type === 'optional').length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border border-yellow-100/50 rounded-3xl shadow-xl">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50">
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                Optional Documents ({documents.filter(d => d.type === 'optional').length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {documents.filter(d => d.type === 'optional').map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-200 hover:border-yellow-300 transition-colors">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(doc.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                        {getStatusBadge(doc.status)}
                        {doc.isTemplate && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            Template Available
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                      {doc.uploadedFile && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <FileText className="h-4 w-4" />
                          <span>Uploaded: {doc.uploadedFile.name}</span>
                          <span>•</span>
                          <span>{new Date(doc.uploadedAt!).toLocaleDateString()}</span>
                        </div>
                      )}
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
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileUpload(doc.id, e)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={doc.status === 'uploaded' || doc.status === 'approved'}
                      />
                      <Button
                        variant={doc.status === 'uploaded' || doc.status === 'approved' ? "outline" : "default"}
                        size="sm"
                        disabled={doc.status === 'uploaded' || doc.status === 'approved'}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        {doc.status === 'uploaded' || doc.status === 'approved' ? 'Uploaded' : 'Upload'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Instructions */}
      {kycData.instructions && (
        <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <FileText className="h-5 w-5" />
              Additional Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{kycData.instructions}</p>
          </CardContent>
        </Card>
      )}

      {/* Submission Status */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {progressPercentage === 100 ? 'KYC Complete!' : 'Complete Your KYC'}
          </h3>
          <p className="text-gray-600 text-lg mb-6">
            {progressPercentage === 100 
              ? 'All required documents have been uploaded. Your auditor will review them shortly.'
              : `Upload ${requiredCount - uploadedCount} more required documents to complete your KYC.`
            }
          </p>
          {progressPercentage === 100 && (
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3">
              <CheckCircle className="h-5 w-5 mr-2" />
              KYC Submission Complete
            </Button>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
