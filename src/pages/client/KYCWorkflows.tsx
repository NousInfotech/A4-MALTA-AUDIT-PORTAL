import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Eye,
  Calendar,
  User,
  Building2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { kycApi } from "@/services/api";
import { KYCClientForm } from "@/components/kyc/KYCClientForm";

interface KYCWorkflow {
  _id: string;
  engagement: {
    _id: string;
    title: string;
    yearEndDate: string;
    clientId: string;
  };
  clientId: string;
  auditorId: string;
  documentRequests: {
    _id: string;
    name: string;
    category: string;
    description: string;
    status: string;
    documents: any[];
  };
  discussions: any[];
  status: 'pending' | 'in-review' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export function ClientKYCPage() {
  const { toast } = useToast();
  const [kycWorkflows, setKycWorkflows] = useState<KYCWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKYC, setSelectedKYC] = useState<KYCWorkflow | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchMyKYCs();
  }, []);

  const fetchMyKYCs = async () => {
    try {
      setLoading(true);
      console.log('📋 Fetching client KYC workflows...');
      
      const kycs = await kycApi.getMyKYCs();
      console.log('✅ KYC workflows fetched:', kycs);
      
      setKycWorkflows(kycs);
    } catch (error: any) {
      console.error('❌ Failed to fetch KYC workflows:', error);
      toast({
        title: "Error",
        description: "Failed to load KYC workflows",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartKYC = (kyc: KYCWorkflow) => {
    setSelectedKYC(kyc);
    setShowForm(true);
  };

  const handleKYCComplete = (completedData: any) => {
    console.log('✅ KYC completed:', completedData);
    
    // Update the local state
    setKycWorkflows(prev => 
      prev.map(kyc => 
        kyc._id === selectedKYC?._id 
          ? { ...kyc, status: 'in-review' as const }
          : kyc
      )
    );
    
    setShowForm(false);
    setSelectedKYC(null);
    
    toast({
      title: "KYC Submitted",
      description: "Your KYC information has been submitted for review",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in-review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in-review':
        return <Eye className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (showForm && selectedKYC) {
    return (
      <KYCClientForm 
        kycData={{
          ...selectedKYC,
          clientName: selectedKYC.engagement.title,
          companyName: selectedKYC.engagement.title,
          // Use the actual document requirements from the KYC workflow
          documents: selectedKYC.documentRequests?.documents || [
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
          ]
        }}
        onComplete={handleKYCComplete}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading KYC workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">KYC Workflows</h1>
            <p className="text-gray-600">Complete your Know Your Client requirements</p>
          </div>
        </div>
      </div>

      {kycWorkflows.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No KYC Workflows</h3>
            <p className="text-gray-600">
              You don't have any KYC workflows assigned yet. Contact your auditor to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {kycWorkflows.map((kyc) => (
            <Card key={kyc._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{kyc.engagement.title}</CardTitle>
                      <p className="text-sm text-gray-600">
                        Created: {new Date(kyc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(kyc.status)} flex items-center gap-1`}>
                    {getStatusIcon(kyc.status)}
                    {kyc.status.charAt(0).toUpperCase() + kyc.status.slice(1).replace('-', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Engagement Details</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>Year End: {new Date(kyc.engagement.yearEndDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-gray-500" />
                          <span>Client ID: {kyc.clientId}</span>
                        </div>
                      </div>
                    </div>
                    
                    {kyc.documentRequests && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Document Requirements</h4>
                        <p className="text-sm text-gray-600">{kyc.documentRequests.description}</p>
                        <div className="mt-2">
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            {kyc.documentRequests.documents?.length || 0} Documents Required
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Progress</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Documents Uploaded</span>
                          <span>{kyc.documentRequests?.documents?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Discussions</span>
                          <span>{kyc.discussions?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Last Updated</span>
                          <span>{new Date(kyc.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      {kyc.status === 'pending' && (
                        <Button 
                          onClick={() => handleStartKYC(kyc)}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Start KYC Process
                        </Button>
                      )}
                      
                      {kyc.status === 'in-review' && (
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 text-blue-600 mb-2">
                            <Eye className="h-4 w-4" />
                            <span className="font-medium">Under Review</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Your KYC information is being reviewed by our audit team.
                          </p>
                        </div>
                      )}
                      
                      {kyc.status === 'completed' && (
                        <div className="text-center">
                          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                            <CheckCircle className="h-4 w-4" />
                            <span className="font-medium">Completed</span>
                          </div>
                          <p className="text-sm text-gray-600">
                            Your KYC process has been completed successfully.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
