// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEngagements } from "@/hooks/useEngagements";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Briefcase,
  Plus,
  Search,
  Calendar,
  Building2,
  FileText,
  Eye,
  Filter,
  TrendingUp,
  Clock,
} from "lucide-react";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { SigningPortalModal } from "@/components/e-signature/SigningPortalModal";
import { KYCSetupModal } from "@/components/kyc/KYCSetupModal";

export const EngagementManagement = () => {
  const navigate = useNavigate();
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [selectedEngagement, setSelectedEngagement] = useState<any>(null);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState<boolean>(false);


  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "draft" | "active" | "completed"
  >("All");
  const { engagements, loading } = useEngagements();
  const { toast } = useToast();

  interface User {
    summary: string;
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'employee' | 'client';
    status: string;
    createdAt: string;
    companyName?: string;
    companyNumber?: string;
    industry?: string;
  }

  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clients, setClients] = useState<User[]>([]);
  const [isSigningPortalOpen, setIsSigningPortalOpen] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `user_id, name, role, status, created_at, updated_at, company_name, company_number, industry, company_summary`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformed = data.map((profile) => ({
        id: profile.user_id,
        name: profile.name || 'Unknown User',
        email: userData?.user?.email || '',
        role: profile.role,
        status: profile.status,
        createdAt: profile.created_at,
        companyName: profile.company_name || undefined,
        companyNumber: profile.company_number || undefined,
        industry: profile.industry || undefined,
        summary: profile.company_summary || undefined,
      }));

      setClients(transformed.filter((c) => c.role === 'client'));
    } catch (err: any) {
      toast({
        title: 'Error',
        description: `Failed to fetch clients: ${err.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleStartEngagement = (engagement: any) => {
    console.log('🚀 Starting Engagement Process...');
    console.log('📋 Engagement Data:', {
      engagementId: engagement._id,
      title: engagement.title,
      clientId: engagement.clientId,
      status: engagement.status,
      yearEndDate: engagement.yearEndDate
    });
    
    setSelectedEngagement(engagement);
    setIsKYCModalOpen(true);
    
    console.log('🔐 Opening KYC Modal...');
    toast({
      title: "Starting Engagement",
      description: `Opening KYC setup for ${engagement.title}`,
    });
  };

  const handleKYCComplete = (kycData: any) => {
    console.log('🎉 KYC Process Completed Successfully!');
    console.log('📊 KYC Completion Data:', {
      kycId: kycData.kycId,
      engagementId: kycData.engagementId,
      documentRequestId: kycData.documentRequestId,
      clientName: kycData.clientName,
      companyName: kycData.companyName,
      documentsCount: kycData.documents?.length || 0,
      status: kycData.status,
      createdAt: kycData.createdAt
    });
    
    console.log('🔄 Opening E-Signature Portal...');
    // After KYC completion, open the signing portal modal
    setIsSigningPortalOpen(true);
    
    toast({
      title: "KYC Completed Successfully",
      description: `KYC process completed for ${kycData.clientName || 'client'}. Opening e-signature portal...`,
    });
  };

  const handleEnterWorkspace = (engagement: any) => {
    console.log('Entering workspace for:', engagement);
    toast({
      title: "Workspace Entered",
      description: "You have successfully entered the engagement workspace",
    });
    setIsSigningPortalOpen(false);
    setSelectedEngagement(null);
  };

  const handleUploadSuccess = () => {
    console.log('Upload successful');
    toast({
      title: "Upload Successful",
      description: "Signed documents have been uploaded successfully",
    });
  };

  // ✅ Fixed & improved filtering: works for "All" and includes title + client fields (+ status/industry)
  const filteredEngagements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return engagements.filter((e) => {
      const matchesStatus = statusFilter === 'All' ? true : e.status === statusFilter;
      if (!matchesStatus) return false;

      if (!term) return true;

      const client = clients.find((c) => c.id === e.clientId);
      const haystack = [
        e.title,
        e.status,
        client?.companyName,
        client?.industry,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [engagements, clients, searchTerm, statusFilter]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200';
      case 'completed':
        return 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200';
      case 'draft':
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200';
    }
  };

  if (loading || isLoadingClients) {
    return (
      <div className="flex items-center justify-center h-64 sm:h-[40vh]">
        <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
      </div>
    );
  }

  const stats = {
    total: engagements.length,
    active: engagements.filter(e => e.status === 'active').length,
    completed: engagements.filter(e => e.status === 'completed').length,
    draft: engagements.filter(e => e.status === 'draft').length,
  };

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2 animate-fade-in">Engagement Management</h1>
          <p className="text-gray-700 animate-fade-in-delay">
            Manage and track all your audit engagements
          </p>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <Button 
            className="bg-gray-800 hover:bg-gray-900 text-white rounded-xl px-6 py-3 h-auto shadow-lg hover:shadow-xl transition-all duration-300" 
            asChild
          >
            <Link to="/employee/engagements/new">
              <Plus className="h-5 w-5 mr-2" />
              New Engagement
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { title: "Total Engagements", value: stats.total, icon: Briefcase, color: "text-gray-300" },
            { title: "Active Engagements", value: stats.active, icon: TrendingUp, color: "text-gray-300" },
            { title: "Completed Engagements", value: stats.completed, icon: FileText, color: "text-gray-300" },
            { title: "Draft Engagements", value: stats.draft, icon: Clock, color: "text-gray-300" }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30 animate-slide-in-left" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-center justify-between mb-4">
                  <Icon className="h-6 w-6 text-gray-800" />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-700">{stat.title}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search + Status Section */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="relative flex-1 w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 h-5 w-5" />
              <Input
                placeholder="Search by engagement title, status, client company, or industry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-full h-14 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
                <Filter className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700 font-medium">Filter:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {['All', 'draft', 'active', 'completed'].map((status) => (
                  <Button
                    key={status}
                    variant={statusFilter === status ? 'default' : 'outline'}
                    onClick={() => setStatusFilter(status as any)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      statusFilter === status 
                        ? 'bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700 hover:text-gray-800'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="bg-gray-50 rounded-xl px-6 py-3">
              <span className="text-gray-700 font-semibold text-lg">
                {filteredEngagements.length} of {engagements.length} engagements
              </span>
            </div>
          </div>
        </div>

        {/* Engagements Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEngagements.map((engagement: any) => {
            const client = clients.find((c) => c.id === engagement.clientId);
            return (
              <div key={engagement._id} className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30 animate-slide-in-right">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {engagement.title}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center gap-2 min-w-0 mt-1">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{client?.companyName || 'Unknown Client'}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className={`rounded-xl px-3 py-1 text-sm font-semibold ${
                      engagement.status === 'active' ? 'bg-gray-800 text-white border-gray-800' :
                      engagement.status === 'completed' ? 'bg-gray-700 text-white border-gray-700' :
                      'bg-gray-600 text-white border-gray-600'
                    }`}>
                      {engagement.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <span className="text-sm text-gray-700 font-medium">
                        Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <span className="text-sm text-gray-700 font-medium">
                        Trial Balance: {engagement.trialBalanceUrl ? 'Uploaded' : 'Not Uploaded'}
                      </span>
                    </div>
                  </div>
                  

                  <div>
                    <Button size="sm" className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-xl  shadow-lg hover:shadow-xl transition-all duration-300" onClick={() => navigate(`/employee/review/${engagement._id}`)}>Review Manager</Button>
                  </div>
                  <div className="flex gap-3">
                    
                    <Button
                      className="flex-1 bg-gray-800 hover:bg-gray-900 text-white rounded-xl py-2 h-auto shadow-lg hover:shadow-xl transition-all duration-300"
                      variant="default"
                      size="sm"
                      asChild
                    >
                      <Link to={`/employee/engagements/${engagement._id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                    <Button
                      className="bg-gray-700 hover:bg-gray-800 text-white rounded-xl py-2 px-4 h-auto shadow-lg hover:shadow-xl transition-all duration-300"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedEngagement(engagement);
                        setIsKYCModalOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredEngagements.length === 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-16 text-center shadow-lg shadow-gray-300/30">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Briefcase className="h-10 w-10 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {searchTerm ? 'No engagements found' : 'No engagements yet'}
            </h3>
            <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
              {searchTerm ? 'Try adjusting your search terms to find what you\'re looking for' : 'Start by creating your first audit engagement'}
            </p>
            {!searchTerm && (
              <Button 
                className="bg-gray-800 hover:bg-gray-900 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-8 py-3" 
                asChild
              >
                <Link to="/employee/engagements/new">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Engagement
                </Link>
              </Button>
            )}
          </div>
        )}

      </div>

      {isSignModalOpen && (
        <SigningPortalModal
          selectedEngagement={selectedEngagement}
          open={isSignModalOpen}
          onOpenChange={setIsSignModalOpen}
          onEnterWorkspace={handleEnterWorkspace}
          handleUploadSuccess={handleUploadSuccess}
        />
      )}

      {isKYCModalOpen && (
        <KYCSetupModal
          selectedEngagement={selectedEngagement}
          open={isKYCModalOpen}
          onOpenChange={setIsKYCModalOpen}
          onKYCComplete={handleKYCComplete}
        />
      )}
    </div>
  );
};
