// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

  const [isSignModalOpen, setIsSignModalOpen] = useState<boolean>(false);
  const [selectedEngagement, setSelectedEngagement] = useState<any>(null);
  const [isKYCModalOpen, setIsKYCModalOpen] = useState<boolean>(false);


  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "draft" | "active" | "completed"
  >("active");
  const { engagements, loading } = useEngagements();
  const { toast } = useToast();

  const handleKYCComplete = (kycData: any) => {
    // Handle KYC completion - in a real app, this would save to backend
    console.log('KYC completed:', kycData);
    toast({
      title: "KYC Setup Complete",
      description: "KYC requirements have been configured and sent to the client",
    });
    
    // After KYC completion, open e-signature portal
    setIsKYCModalOpen(false);
    setIsSignModalOpen(true);
  };

  interface User {
    summary: string;
    id: string;
    name: string;
    email: string;
    role: "admin" | "employee" | "client";
    status: string;
    createdAt: string;
    companyName?: string;
    companyNumber?: string;
    industry?: string;
  }

  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clients, setClients] = useState<User[]>([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `user_id, name, role, status, created_at, updated_at, company_name, company_number, industry, company_summary`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const transformed = data.map((profile) => ({
        id: profile.user_id,
        name: profile.name || "Unknown User",
        email: userData?.user?.email || "",
        role: profile.role,
        status: profile.status,
        createdAt: profile.created_at,
        companyName: profile.company_name || undefined,
        companyNumber: profile.company_number || undefined,
        industry: profile.industry || undefined,
        summary: profile.company_summary || undefined,
      }));

      setClients(transformed.filter((c) => c.role === "client"));
    } catch (err: any) {
      toast({
        title: "Error",
        description: `Failed to fetch clients: ${
          err.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  // ✅ Fixed & improved filtering: works for "All" and includes title + client fields (+ status/industry)
  const filteredEngagements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return engagements.filter((e) => {
      const matchesStatus =
        statusFilter === "All" ? true : e.status === statusFilter;
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
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [engagements, clients, searchTerm, statusFilter]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200";
      case "completed":
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200";
      case "draft":
        return "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200";
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
    active: engagements.filter((e) => e.status === "active").length,
    completed: engagements.filter((e) => e.status === "completed").length,
    draft: engagements.filter((e) => e.status === "draft").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Engagement Management
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Manage your audit engagements and track progress
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
              asChild
            >
              <Link to="/employee/engagements/new">
                <Plus className="h-5 w-5 mr-2" />
                New Engagement
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {stats.total}
            </div>
            <p className="text-sm text-slate-600 mb-3">All engagements</p>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
              <p className="text-xs font-semibold text-slate-700">
                Total count
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Active
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {stats.active}
            </div>
            <p className="text-sm text-slate-600 mb-3">Ongoing audits</p>
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100/50">
              <p className="text-xs font-semibold text-slate-700">
                Currently active
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-gray-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Completed
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <FileText className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {stats.completed}
            </div>
            <p className="text-sm text-slate-600 mb-3">Finished audits</p>
            <div className="p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl border border-slate-100/50">
              <p className="text-xs font-semibold text-slate-700">
                Successfully completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Draft
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {stats.draft}
            </div>
            <p className="text-sm text-slate-600 mb-3">In preparation</p>
            <div className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-100/50">
              <p className="text-xs font-semibold text-slate-700">
                Draft status
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Status Section */}
      <div className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="relative flex-1 w-full max-w-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl blur-xl"></div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
              <Input
                placeholder="Search by engagement title, status, client company, or industry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-full h-14 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl px-4 py-2">
              <Filter className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Filter:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {["All", "draft", "active", "completed"].map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status as any)}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    statusFilter === status
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg"
                      : "border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl px-6 py-3">
            <span className="text-blue-700 font-semibold text-lg">
              {filteredEngagements.length} of {engagements.length} engagements
            </span>
          </div>
        </div>
      </div>


      {/* Engagements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredEngagements.map((engagement: any) => {
          const client = clients.find((c) => c.id === engagement.clientId);
          return (
            <Card
              key={engagement._id}
              className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                      <Briefcase className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-bold text-slate-800 truncate group-hover:text-green-700 transition-colors duration-300">
                        {engagement.title}
                      </CardTitle>
                      <p className="text-sm text-slate-600 flex items-center gap-2 min-w-0 mt-1">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {client?.companyName || "Unknown Client"}
                        </span>
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`rounded-2xl px-4 py-2 text-sm font-semibold ${getStatusStyle(
                      engagement.status
                    )} self-start`}
                  >
                    {engagement.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-slate-700 font-medium">
                    Year End:{" "}
                    {new Date(engagement.yearEndDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  <span className="text-sm text-slate-700 font-medium">
                    Trial Balance:{" "}
                    {engagement.trialBalanceUrl ? "Uploaded" : "Not Uploaded"}
                  </span>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl py-3 h-auto group-hover:scale-105"
                  variant="default"
                  size="sm"
                  asChild
                >
                  <Link to={`/employee/engagements/${engagement._id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>

                {/* Start Engagement button with KYC popup */}
                <Button
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl py-3 h-auto group-hover:scale-105"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setSelectedEngagement(engagement);
                    setIsKYCModalOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Start Engagement
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEngagements.length === 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Briefcase className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              {searchTerm ? "No engagements found" : "No engagements yet"}
            </h3>
            <p className="text-slate-600 text-lg mb-6 max-w-md mx-auto">
              {searchTerm
                ? "Try adjusting your search terms to find what you're looking for"
                : "Start by creating your first audit engagement"}
            </p>
            {!searchTerm && (
              <Button
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3"
                asChild
              >
                <Link to="/employee/engagements/new">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Engagement
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}


      {isSignModalOpen && (
        <SigningPortalModal
          selectedEngagement={selectedEngagement}
          open={isSignModalOpen}
          onOpenChange={setIsSignModalOpen}
          
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
