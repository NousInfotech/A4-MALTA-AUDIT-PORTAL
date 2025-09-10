// @ts-nocheck
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEngagements } from "@/hooks/useEngagements";
import { useDocumentRequests } from "@/hooks/useDocumentRequests";
import {
  Building2,
  Briefcase,
  FileText,
  TrendingUp,
  Plus,
  Loader2,
  Users,
  Calendar,
  BarChart3,
  Clock,
  ArrowRight,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlobalKPIDashboard } from "../../components/kpi/GlobalKPIDashboard";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";

export const EmployeeDashboard = () => {
  const { engagements, loading } = useEngagements();

  const { toast } = useToast();

  interface User {
    summary: string;
    id: string;
    name: string;
    email: string;
    role: "admin" | "employee" | "client";
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    companyName?: string;
    companyNumber?: string;
    industry?: string;
  }
  const [isloading, setIsLoading] = useState(true);

  const [clients, setClients] = useState<User[]>([]);
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoading(true);

      const user = await supabase.auth.getUser();

      // Simple query - only profiles table, no joins
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            user_id,
            name,
            role,
            status,
            created_at,
            updated_at,
            company_name,
            company_number,
            industry,
            company_summary
          `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      // Transform profiles to User format
      const transformedClients: User[] =
        data?.map((profile) => ({
          id: profile.user_id,
          name: profile.name || "Unknown User",
          email: user.data.user.email, // We'll handle email separately
          role: profile.role as "admin" | "employee" | "client",
          status: profile.status as "pending" | "approved" | "rejected",
          createdAt: profile.created_at,
          companyName: profile.company_name || undefined,
          companyNumber: profile.company_number || undefined,
          industry: profile.industry || undefined,
          summary: profile.company_summary || undefined,
        })) || [];

      setClients(
        transformedClients.filter((client) => client.role === "client")
      );
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: `Failed to fetch clients: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
        </div>
      )
    }
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedEngMonth = engagements.filter(
    (user) => user.status === "completed" && new Date(user.createdAt) >= startOfMonth
  ).length;
  const stats = [
    {
      title: "Total Clients",
      value: clients.length.toString(),
      description: "Active client companies",
      icon: Building2,
      trend: `${
        clients.filter((user) => new Date(user.createdAt) >= startOfMonth)
          .length
      } this month`,
      color: "from-blue-500 to-indigo-600",
      bgColor: "from-blue-50 to-indigo-50"
    },
    {
      title: "Active Engagements",
      value: engagements.filter((e) => e.status === "active").length.toString(),
      description: "Ongoing audits",
      icon: Briefcase,
      trend: `${
        engagements.filter((user) => new Date(user.createdAt) >= startOfWeek)
          .length
      } this week`,
      color: "from-green-500 to-emerald-600",
      bgColor: "from-green-50 to-emerald-50"
    },
    {
      title: "Total Engagements",
      value: engagements.length.toString(),
      description: "All engagements",
      icon: FileText,
      trend: `${engagements.filter((e) => e.status === "draft").length} drafts`,
      color: "from-purple-500 to-pink-600",
      bgColor: "from-purple-50 to-pink-50"
    },
    {
      title: "Completed",
      value: engagements
        .filter((e) => e.status === "completed")
        .length.toString(),
      description: "This month",
      icon: TrendingUp,
      trend: `+${completedEngMonth} from last month`,
      color: "from-orange-500 to-red-600",
      bgColor: "from-orange-50 to-red-50"
    },
  ];

  const recentEngagements = engagements.slice(0, 3);
  const recentClients = clients.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                                      <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                      Employee Dashboard
                    </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Manage your audit engagements and client relationships
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto" 
                asChild
              >
                <Link to="/employee/clients/new">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Client
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
              >
                <Link to="/employee/engagements/new">
                  <Plus className="h-5 w-5 mr-2" />
                  New Engagement
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-slate-800 mb-2">
                  {stat.value}
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  {stat.description}
                </p>
                <div className={`p-3 bg-gradient-to-r ${stat.bgColor} rounded-2xl border border-blue-100/50`}>
                  <p className="text-xs font-semibold text-slate-700">{stat.trend}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Engagements */}
        <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">Recent Engagements</CardTitle>
                  <CardDescription className="text-slate-600">Your latest audit projects</CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                asChild 
                className="border-green-200 hover:bg-green-50/50 text-green-700 hover:text-green-800 rounded-2xl"
              >
                <Link to="/employee/engagements">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentEngagements.map((engagement) => {
                const client = clients.find(
                  (c) => c.id === engagement.clientId
                );
                return (
                  <div
                    key={engagement._id}
                    className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border border-blue-100/50 rounded-2xl hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors duration-300">
                        {engagement.title}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {client?.companyName || "Unknown Client"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3 text-slate-500" />
                        <p className="text-xs text-slate-500">
                          Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                          engagement.status === "active"
                            ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200"
                            : engagement.status === "completed"
                            ? "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border border-slate-200"
                            : "bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border border-yellow-200"
                        }`}
                      >
                        {engagement.status}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-xl"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {recentEngagements.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-slate-600 font-medium">
                    No engagements yet. Create your first engagement to get started.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">Recent Clients</CardTitle>
                  <CardDescription className="text-slate-600">Your latest client additions</CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                asChild 
                className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-2xl"
              >
                <Link to="/employee/clients">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {recentClients.map((client) => (
                <div
                  key={client.id}
                  className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50/30 border border-blue-100/50 rounded-2xl hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 truncate group-hover:text-blue-700 transition-colors duration-300">
                        {client.companyName}
                      </p>
                      <p className="text-sm text-slate-600 truncate">
                        {client.industry || 'N/A'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <p className="text-xs text-slate-500">
                          Added {new Date(client.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild 
                    className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-xl"
                  >
                    <Link to={`/employee/clients/${client.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              ))}
              {recentClients.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-slate-600 font-medium">
                    No clients yet. Add your first client to get started.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global KPI Dashboard */}
      <div className="mt-8">
        <GlobalKPIDashboard />
      </div>
    </div>
  );
};
