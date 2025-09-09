import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KYCSetupModal } from "@/components/kyc/KYCSetupModal";
import { KYCClientView } from "@/components/kyc/KYCClientView";
import { 
  Shield, 
  User, 
  Building2, 
  Eye, 
  ArrowRight,
  CheckCircle,
  FileText
} from "lucide-react";

export const KYCDemo = () => {
  const [isKYCSetupOpen, setIsKYCSetupOpen] = useState(false);
  const [showClientView, setShowClientView] = useState(false);
  const [kycData, setKycData] = useState<any>(null);

  const mockEngagement = {
    _id: 'demo-engagement-1',
    title: 'Annual Audit 2024',
    clientName: 'John Smith',
    companyName: 'Acme Corporation',
    yearEndDate: '2024-12-31',
    status: 'active',
  };

  const handleKYCComplete = (data: any) => {
    setKycData(data);
    setShowClientView(true);
  };

  const handleDocumentUpload = (documentId: string, file: File) => {
    console.log('Document uploaded:', documentId, file.name);
  };

  const handleDocumentDownload = (templateUrl: string, documentName: string) => {
    console.log('Template downloaded:', templateUrl, documentName);
  };

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
                KYC System Demo
              </h1>
              <p className="text-slate-600 mt-1 text-lg">
                Experience the complete KYC workflow from auditor setup to client submission
              </p>
            </div>
          </div>
        </div>
      </div>

      {!showClientView ? (
        /* Auditor View */
        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <User className="h-5 w-5" />
                Auditor Portal - KYC Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Start KYC Setup Process</h3>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                  As an auditor, you can configure KYC requirements for your clients. 
                  Set up document requirements, provide templates, and manage the entire KYC workflow.
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200">
                <h4 className="font-semibold text-green-800 mb-4 text-lg">Demo Engagement</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Engagement</p>
                      <p className="font-semibold text-gray-900">{mockEngagement.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Client</p>
                      <p className="font-semibold text-gray-900">{mockEngagement.clientName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Company</p>
                      <p className="font-semibold text-gray-900">{mockEngagement.companyName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        {mockEngagement.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Button
                  onClick={() => setIsKYCSetupOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-4 text-lg font-semibold"
                >
                  <Shield className="h-5 w-5 mr-2" />
                  Start KYC Setup
                </Button>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-4 text-lg">What you can do:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-700">Configure required documents</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-700">Provide document templates</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-700">Set submission deadlines</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-sm text-gray-700">Add custom instructions</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Client View */
        <div className="space-y-6">
          <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Eye className="h-5 w-5" />
                Client Portal - KYC Submission
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Client View Active</h3>
                  <p className="text-gray-600">Experience how clients interact with KYC requirements</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowClientView(false)}
                  className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800"
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Back to Auditor View
                </Button>
              </div>
            </CardContent>
          </Card>

          <KYCClientView
            kycData={kycData}
            onDocumentUpload={handleDocumentUpload}
            onDocumentDownload={handleDocumentDownload}
          />
        </div>
      )}

      {/* KYC Setup Modal */}
      {isKYCSetupOpen && (
        <KYCSetupModal
          selectedEngagement={mockEngagement}
          open={isKYCSetupOpen}
          onOpenChange={setIsKYCSetupOpen}
          onKYCComplete={handleKYCComplete}
        />
      )}
    </div>
  );
};
