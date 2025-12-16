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
import { getEngagementStatusLabel, getPBCStatusLabel } from "@/lib/statusLabels";
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
  Eye,
  Wallet,
  RefreshCw,
  CreditCard,
  Mail,
  Bell,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  FileText as DocumentIcon,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlobalKPIDashboard } from "../../components/kpi/GlobalKPIDashboard";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { ComprehensiveNavigation } from "@/components/ui/comprehensive-navigation";
import { PortalAnalytics } from "@/components/ui/portal-analytics";
import { useAuth } from "@/contexts/AuthContext";
import { NoticeBoard } from "@/components/notice-board/NoticeBoard";

export const EmployeeDashboard = () => {
  const { engagements, loading } = useEngagements();
  const { logViewDashboard } = useActivityLogger();

  const { toast } = useToast();

  const { user: employee } = useAuth();


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
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [clients, setClients] = useState<User[]>([]);
  useEffect(() => {
    fetchClients();
    // Log dashboard view
    logViewDashboard('Employee accessed the main dashboard');
  }, [logViewDashboard]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);

      const user = await supabase.auth.getUser();


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
        .order("created_at", { ascending: false })
        .eq("organization_id", employee?.organizationId);

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

      // Set current user (employee)
      const currentUserData = transformedClients.find((user) => user.role === "employee");
      if (currentUserData) {
        setCurrentUser(currentUserData);
      }

      setClients(
        transformedClients.filter((client) => client.role === "client")
      );
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: `Failed to fetch clients: ${error.message || "Unknown error"
          }`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-body flex items-center justify-center">
        <EnhancedLoader size="lg" text="Loading..." />
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

  // Calculate real data from your engagements and clients
  const totalClients = clients.length;
  const activeEngagements = engagements.filter((e) => e.status === "active").length;
  const totalEngagements = engagements.length;
  const completedEngagements = engagements.filter((e) => e.status === "completed").length;

  // Calculate growth percentages (you can adjust these based on your actual data)
  const clientsThisMonth = clients.filter((user) => new Date(user.createdAt) >= startOfMonth).length;
  const engagementsThisWeek = engagements.filter((user) => new Date(user.createdAt) >= startOfWeek).length;
  const draftEngagements = engagements.filter((e) => e.status === "draft").length;

  const stats = [
    {
      title: "Total Clients",
      value: totalClients.toString(),
      icon: Building2,
      color: "text-gray-300"
    },
    {
      title: "Active Engagements",
      value: activeEngagements.toString(),
      icon: Briefcase,
      color: "text-gray-300"
    },
    {
      title: "Total Engagements",
      value: totalEngagements.toString(),
      icon: FileText,
      color: "text-gray-300"
    },
    {
      title: "Completed Engagements",
      value: completedEngagements.toString(),
      icon: TrendingUp,
      color: "text-gray-300"
    },
  ];

  const performanceStats = [
    {
      title: "New clients this month",
      value: clientsThisMonth.toString(),
      trend: `${clientsThisMonth} this month`,
      trendColor: "text-green-400",
      icon: TrendingUp
    },
    {
      title: "Draft engagements",
      value: draftEngagements.toString(),
      trend: `${draftEngagements} drafts`,
      trendColor: "text-yellow-400",
      icon: AlertCircle
    }
  ];

  const recentEngagements = engagements.slice(0, 3);
  const recentClients = clients.slice(0, 3);

  // Dynamic greeting message
  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    // const userName = currentUser?.name || "User";
    const userName = employee?.user_metadata?.name || employee?.email?.split('@')[0] || "User";

    if (hour < 12) {
      return `Good morning, ${userName}!`;
    } else if (hour < 17) {
      return `Good afternoon, ${userName}!`;
    } else {
      return `Good evening, ${userName}!`;
    }
  };

  const getGreetingDescription = () => {
    const hour = new Date().getHours();
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    if (hour < 12) {
      return `Ready to tackle today's audit tasks? You have ${activeEngagements} active engagements.`;
    } else if (hour < 17) {
      return `Keep up the great work! ${completedEngagements} engagements completed this week.`;
    } else {
      return `Great work today! Time to wrap up and plan for tomorrow.`;
    }
  };

  return (
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-brand-body mb-2">{getGreetingMessage()}</h1>
          <p className="text-brand-body">{getGreetingDescription()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Notice Board - Top Priority */}
            <NoticeBoard />

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
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

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {performanceStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.title} className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30">
                    <div className="flex items-center justify-between mb-4">
                      <Icon className="h-6 w-6 text-gray-800" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-3xl font-semibold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-gray-700">{stat.title}</p>
                      <p className={`text-sm font-medium ${stat.trendColor}`}>{stat.trend}</p>
                    </div>
                  </div>
                );
              })}
            </div>


            {/* Engagement Analytics Chart */}
            <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Engagement Analytics</h3>

              {/* Circular Progress Charts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                {[
                  { status: 'Active', count: activeEngagements, total: totalEngagements, color: 'text-gray-700', bgColor: 'bg-primary', ringColor: 'ring-primary/20' },
                  { status: 'Completed', count: completedEngagements, total: totalEngagements, color: 'text-gray-600', bgColor: 'bg-gray-700', ringColor: 'ring-gray-700/20' },
                  { status: 'Draft', count: draftEngagements, total: totalEngagements, color: 'text-gray-500', bgColor: 'bg-gray-600', ringColor: 'ring-gray-600/20' },
                  { status: 'Total', count: totalEngagements, total: totalEngagements, color: 'text-gray-800', bgColor: 'bg-primary', ringColor: 'ring-primary/20' }
                ].map((item, index) => {
                  const percentage = totalEngagements > 0 ? (item.count / item.total) * 100 : 0;
                  const circumference = 2 * Math.PI * 30;
                  const strokeDasharray = circumference;
                  const strokeDashoffset = circumference - (percentage / 100) * circumference;

                  return (
                    <div key={index} className="flex flex-col items-center min-w-0">
                      <div className="relative w-16 h-16 md:w-20 md:h-20 mb-2 md:mb-3">
                        <svg className="w-16 h-16 md:w-20 md:h-20 transform -rotate-90" viewBox="0 0 70 70">
                          <circle
                            cx="35"
                            cy="35"
                            r="30"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-gray-300"
                          />
                          <circle
                            cx="35"
                            cy="35"
                            r="30"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className={item.color}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-sm md:text-lg font-bold ${item.color}`}>{item.count}</span>
                        </div>
                      </div>
                      <span className="text-xs md:text-sm text-gray-700 text-center leading-tight px-1">{item.status}</span>
                      <span className="text-xs text-gray-600">{percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Mini Bar Chart */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-800 mb-4">Status Distribution</h4>
                <div className="space-y-3">
                  {[
                    { status: 'Active', count: activeEngagements, color: 'bg-primary', percentage: totalEngagements > 0 ? (activeEngagements / totalEngagements) * 100 : 0 },
                    { status: 'Completed', count: completedEngagements, color: 'bg-gray-700', percentage: totalEngagements > 0 ? (completedEngagements / totalEngagements) * 100 : 0 },
                    { status: 'Draft', count: draftEngagements, color: 'bg-gray-600', percentage: totalEngagements > 0 ? (draftEngagements / totalEngagements) * 100 : 0 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 md:space-x-3">
                      <div className="w-16 md:w-20 text-xs md:text-sm text-gray-700 flex-shrink-0">{item.status}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-0">
                        <div
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <div className="w-8 md:w-12 text-xs md:text-sm text-gray-700 text-right flex-shrink-0">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comprehensive Navigation */}
            <ComprehensiveNavigation />

            {/* Portal Analytics */}
            <PortalAnalytics />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* User Profile and Notifications */}
            {/* <div className="flex items-center justify-end space-x-4 mb-6">
              <Calendar className="h-6 w-6 text-gray-700" />
              <Mail className="h-6 w-6 text-gray-700" />
              <Bell className="h-6 w-6 text-gray-700" />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-full"></div>
                <ChevronDown className="h-4 w-4 text-gray-700" />
              </div>
            </div> */}

            {/* Recent Engagements */}
            <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Engagements</h3>
              <div className="space-y-3">
                {recentEngagements.map((engagement) => {
                  const client = clients.find((c) => c.id === engagement.clientId);
                  return (
                    <div key={engagement._id} className="p-3 hover:bg-gray-100/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Briefcase className="h-5 w-5 text-gray-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 font-medium truncate">{engagement.title}</p>
                            <p className="text-gray-600 text-sm truncate">{client?.companyName || "Unknown Client"}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-xl flex-shrink-0"
                        >
                          <Link to={`/employee/engagements/${engagement._id}`}>
                            <Eye className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-500 text-xs">
                            Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${engagement.status === "active" ? "bg-primary text-primary-foreground" :
                          engagement.status === "completed" ? "bg-gray-700 text-white" :
                            "bg-gray-600 text-white"
                          }`}>
                          {getPBCStatusLabel(engagement.status) || getEngagementStatusLabel(engagement.status)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {recentEngagements.length === 0 && (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600">No engagements yet. Create your first engagement to get started.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Formation Status */}
            <div
              className="backdrop-blur-md border rounded-2xl p-6 bg-primary/90"
              style={{
                borderColor: 'hsl(var(--primary) / 0.5)'
              }}
            >
              <h3 className="text-lg font-semibold text-primary-foreground mb-2">Engagement Status</h3>
              <p className="text-primary-foreground/80 mb-4">
                {activeEngagements > 0 ? `${activeEngagements} active engagement${activeEngagements !== 1 ? 's' : ''} in progress` : 'No active engagements'}
              </p>
              <div className="w-full bg-primary-foreground/20 rounded-full h-2 mb-4">
                <div
                  className="bg-primary-foreground h-2 rounded-full"
                  style={{ width: `${totalEngagements > 0 ? (completedEngagements / totalEngagements) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-primary-foreground/80 text-sm mb-4">
                {completedEngagements} of {totalEngagements} engagements completed
              </p>
              <Link
                to="/employee/engagements"
                className="inline-flex w-full items-center justify-center bg-primary-foreground text-primary py-2 px-4 rounded-xl font-medium hover:bg-primary-foreground/90 transition-colors duration-200"
              >
                View all engagements
              </Link>
            </div>

            {/* Recent Clients */}
            <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Clients</h3>
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 hover:bg-gray-100/50 rounded-xl">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <Building2 className="h-5 w-5 text-gray-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium truncate">{client.companyName || "Unknown Company"}</p>
                        <p className="text-gray-600 text-sm truncate">{client.industry || 'N/A'}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span className="text-gray-500 text-xs">
                            Added {new Date(client.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-xl flex-shrink-0"
                    >
                      <Link to={`/employee/clients/${client.id}`}>
                        <Eye className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                ))}
                {recentClients.length === 0 && (
                  <div className="text-center py-8">
                    <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600">No clients yet. Add your first client to get started.</p>
                  </div>
                )}
              </div>
            </div>

            {/* To-Do List */}
            <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your to-Do list</h3>
              <div className="space-y-4">
                {[
                  { task: `Complete ${activeEngagements} active engagement${activeEngagements !== 1 ? 's' : ''}`, date: "Today", icon: Briefcase },
                  { task: `Review ${draftEngagements} draft engagement${draftEngagements !== 1 ? 's' : ''}`, date: "This week", icon: FileText },
                  { task: `Follow up with ${recentClients.length} recent client${recentClients.length !== 1 ? 's' : ''}`, date: "This week", icon: Building2 },
                  { task: "Update engagement statuses", date: "Today", icon: Clock }
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 hover:bg-gray-100/50 rounded-xl">
                      <Icon className="h-4 w-4 text-gray-700" />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium text-sm">{item.task}</p>
                        <p className="text-gray-600 text-xs">{item.date}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Board Meeting */}
            <div
              className="backdrop-blur-md border rounded-2xl p-6 bg-primary/90"
              style={{
                borderColor: 'hsl(var(--primary) / 0.5)'
              }}
            >
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-primary-foreground rounded-full"></div>
                <span className="text-primary-foreground font-medium">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-primary-foreground/80 text-sm">
                {totalClients > 0
                  ? `You have ${totalClients} client${totalClients !== 1 ? 's' : ''} and ${activeEngagements} active engagement${activeEngagements !== 1 ? 's' : ''} to manage.`
                  : 'No clients or active engagements at the moment.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

