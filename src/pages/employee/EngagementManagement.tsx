// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
import { getEngagementStatusLabel, getPBCStatusLabel } from "@/lib/statusLabels";
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
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Users,
  X,
  Mail,
} from "lucide-react";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { SigningPortalModal } from "@/components/e-signature/SigningPortalModal";
import { KYCSetupModal } from "@/components/kyc/KYCSetupModal";
import { useAuth } from "@/contexts/AuthContext";
import { engagementApi, userApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const EngagementManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [selectedEngagement, setSelectedEngagement] = useState<any>(null);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState<boolean>(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState<boolean>(false);
  const [assigningEngagement, setAssigningEngagement] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignedEmployees, setAssignedEmployees] = useState<any[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingDialogData, setIsLoadingDialogData] = useState(false);
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([]);
  const [assigningEmployeeId, setAssigningEmployeeId] = useState<string | null>(null);
  const [removingEmployeeId, setRemovingEmployeeId] = useState<string | null>(null);

  // Check if this is admin route
  const isAdminRoute = location.pathname.startsWith("/admin");

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

  // Fetch employees for assignment dialog
  const fetchEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const usersResponse = await userApi.getAll();
      const allUsersList = usersResponse.users || [];
      const employeesList = allUsersList.filter((u: any) => 
        u.role === 'employee' || u.role === 'admin' || u.role === 'senior-employee'
      );
      setEmployees(employeesList);
      setFilteredEmployees(employeesList);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to fetch employees: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  // Fetch assigned employees for an engagement
  const fetchAssignedEmployees = async (engagementId: string) => {
    try {
      const response = await engagementApi.getAssignedAuditors(engagementId);
      setAssignedEmployees(response.assignedAuditors || []);
    } catch (error: any) {
      console.error('Failed to fetch assigned employees:', error);
    }
  };

  // Handle opening assign dialog
  const handleOpenAssignDialog = async (engagement: any) => {
    setAssigningEngagement(engagement);
    setIsAssignDialogOpen(true);
    setIsLoadingDialogData(true);
    setSearchEmployeeQuery("");
    try {
      await Promise.all([
        fetchEmployees(),
        fetchAssignedEmployees(engagement._id)
      ]);
    } finally {
      setIsLoadingDialogData(false);
    }
  };

  // Handle assigning an employee
  const handleAssignEmployee = async (employeeId: string) => {
    if (!assigningEngagement || !user) return;
    
    try {
      setAssigningEmployeeId(employeeId);
      await engagementApi.assignAuditor(
        assigningEngagement._id,
        employeeId,
        user.id
      );
      
      toast({
        title: "Success",
        description: "Employee assigned successfully",
      });
      
      await fetchAssignedEmployees(assigningEngagement._id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign employee",
        variant: "destructive",
      });
    } finally {
      setAssigningEmployeeId(null);
    }
  };

  // Handle unassigning an employee
  const handleUnassignEmployee = async (employeeId: string) => {
    if (!assigningEngagement) return;
    
    try {
      setRemovingEmployeeId(employeeId);
      await engagementApi.unassignAuditor(assigningEngagement._id, employeeId);
      
      toast({
        title: "Success",
        description: "Employee unassigned successfully",
      });
      
      await fetchAssignedEmployees(assigningEngagement._id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unassign employee",
        variant: "destructive",
      });
    } finally {
      setRemovingEmployeeId(null);
    }
  };

  // Filter employees based on search
  useEffect(() => {
    if (searchEmployeeQuery.trim() === "") {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter((emp) => {
        const searchLower = searchEmployeeQuery.toLowerCase();
        return (
          emp.email?.toLowerCase().includes(searchLower) ||
          emp.name?.toLowerCase().includes(searchLower) ||
          emp.company_name?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredEmployees(filtered);
    }
  }, [searchEmployeeQuery, employees]);

  // Check if employee is assigned
  const isEmployeeAssigned = (employeeId: string) => {
    return assignedEmployees.some((emp) => emp.auditorId === employeeId);
  };

  // Get initials for avatar
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.split(" ");
      return parts.length > 1
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "?";
  };

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
        <EnhancedLoader size="lg" text="Loading..." />
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
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-brand-body mb-2">Engagement Management</h1>
          <p className="text-brand-body">
            Manage and track all your audit engagements
          </p>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-3 h-auto shadow-lg hover:shadow-xl" 
            asChild
          >
            <Link to={isAdminRoute ? "/admin/engagements/new" : "/employee/engagements/new"}>
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
              <div key={stat.title} className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30">
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
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg'
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
              <div key={engagement._id} className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {engagement.title}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center gap-2 min-w-0 mt-1">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate font-bold">{client?.companyName || 'Unknown Client'}</span>
                      </p>
                    </div>
                    <Badge variant="outline" className={`rounded-xl px-3 py-1 text-sm font-semibold ${
                      engagement.status === 'active' ? 'bg-primary text-primary-foreground border-brand-sidebar' :
                      engagement.status === 'completed' ? 'bg-gray-700 text-primary-foreground border-gray-700' :
                      'bg-gray-600 text-primary-foreground border-gray-600'
                    }`}>
                      {getPBCStatusLabel(engagement.status) || getEngagementStatusLabel(engagement.status)}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <span className="text-sm text-gray-700 font-medium">
                        Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                      </span>
                    </div>
                    {engagement.deadline && (() => {
                      const deadline = new Date(engagement.deadline);
                      const today = new Date();
                      const daysDiff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      const isOverdue = daysDiff < 0;
                      const isDueSoon = daysDiff >= 0 && daysDiff <= 7;
                      const isOnTime = daysDiff > 7;
                      
                      return (
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${
                          isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-yellow-50' : 'bg-green-50'
                        }`}>
                          {isOverdue ? (
                            <AlertCircle className="h-5 w-5 text-red-600" />
                          ) : isDueSoon ? (
                            <Clock className="h-5 w-5 text-yellow-600" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          )}
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700">
                              Deadline: {deadline.toLocaleDateString()}
                            </span>
                            <span className={`text-xs ml-2 font-semibold ${
                              isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {isOverdue 
                                ? `${Math.abs(daysDiff)} day(s) overdue`
                                : isDueSoon
                                ? `${daysDiff} day(s) remaining`
                                : `${daysDiff} day(s) remaining`
                              }
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <span className="text-sm text-gray-700 font-medium">
                        Trial Balance: {engagement.trialBalanceUrl || engagement.excelURL ? 'Uploaded' : 'Not Uploaded'}
                      </span>
                    </div>
                  </div>
                  

                  {/* <div>
                    <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl  shadow-lg hover:shadow-xl transition-all duration-300" onClick={() => navigate(`/employee/review/${engagement._id}`)}>Review Manager</Button>
                  </div> */}
                  <div className="flex flex-col gap-3">
                    {isAdminRoute && (
                      <Button
                        className="w-full bg-gray-700 hover:bg-primary text-primary-foreground rounded-xl py-2 h-auto shadow-lg hover:shadow-xl transition-all duration-300"
                        variant="default"
                        size="sm"
                        onClick={() => handleOpenAssignDialog(engagement)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Assign To
                      </Button>
                    )}
                    <div className="flex gap-3">
                      <Button
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-2 h-auto shadow-lg hover:shadow-xl transition-all duration-300"
                        variant="default"
                        size="sm"
                        asChild
                      >
                        <Link to={isAdminRoute ? `/admin/engagements/${engagement._id}` : `/employee/engagements/${engagement._id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </Button>

                         {/* <Link to={`/employee/clients/${engagement.clientId}/company/${engagement.companyId}`}>
                          <Building2 className="h-4 w-4 mr-2" />
                          View Company
                        </Link> */}
                      {!isAdminRoute && (
                        <Button
                          className="bg-gray-700 hover:bg-primary text-primary-foreground rounded-xl py-2 px-4 h-auto shadow-lg hover:shadow-xl transition-all duration-300"
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
                      )}
                    </div>
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-8 py-3" 
                asChild
              >
                <Link to={isAdminRoute ? "/admin/engagements/new" : "/employee/engagements/new"}>
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

      {/* Assign Employee Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Assign Employees to Engagement</DialogTitle>
            <DialogDescription>
              {assigningEngagement && `Assign employees to "${assigningEngagement.title}"`}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDialogData ? (
            <div className="flex flex-col items-center justify-center py-16">
              <EnhancedLoader size="lg" text="Loading employees..." />
            </div>
          ) : (
            <>
              {/* Search Box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or company..."
                  value={searchEmployeeQuery}
                  onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

          {/* Assigned Employees Section */}
          {assignedEmployees.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Assigned Employees ({assignedEmployees.length})</h3>
              <div className="space-y-2">
                {assignedEmployees.map((assigned) => {
                  const employee = employees.find((e) => e.user_id === assigned.auditorId);
                  return (
                    <div
                      key={assigned.auditorId}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(assigned.auditorName || employee?.name, employee?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {assigned.auditorName || employee?.name || employee?.email || assigned.auditorId}
                          </div>
                          {employee?.email && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnassignEmployee(assigned.auditorId)}
                        disabled={removingEmployeeId === assigned.auditorId}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      >
                        {removingEmployeeId === assigned.auditorId ? (
                          <>
                            <EnhancedLoader size="sm" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Remove
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Employees Section */}
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Available Employees {assignedEmployees.length > 0 && `(${filteredEmployees.length})`}
            </h3>
            {isLoadingEmployees ? (
              <div className="flex items-center justify-center py-8">
                <EnhancedLoader size="lg" text="Loading employees..." />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No employees found
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredEmployees.map((employee) => {
                  const isAssigned = isEmployeeAssigned(employee.user_id);
                  return (
                    <div
                      key={employee.user_id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(employee.name, employee.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-gray-900">
                            {employee.name || employee.email}
                          </div>
                          {employee.email && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {employee.email}
                            </div>
                          )}
                        </div>
                      </div>
                      {isAssigned ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Assigned
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAssignEmployee(employee.user_id)}
                          disabled={assigningEmployeeId === employee.user_id}
                          className="rounded-lg"
                        >
                          {assigningEmployeeId === employee.user_id ? (
                            <>
                              <EnhancedLoader size="sm" />
                              Assigning...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Assign
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
