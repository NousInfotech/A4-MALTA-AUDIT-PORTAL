// @ts-nocheck
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
  import { useState, useEffect } from "react";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Link } from "react-router-dom";
  import { engagementApi, documentRequestApi } from "@/services/api";
  import { useToast } from "@/hooks/use-toast";
  import {
    Users,
    UserCheck,
    UserX,
    Building2,
    Briefcase,
    Activity,
    TrendingUp,
    Clock,
    ArrowRight,
    Plus,
    BarChart3,
    Settings,
    FileText
  } from "lucide-react";
  import { supabase } from "@/integrations/supabase/client";
  import { EnhancedLoader } from "@/components/ui/enhanced-loader";
  
  interface User {
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
  
  export const AdminDashboard = () => {
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [engagements, setEngagements] = useState([]);
    const [allRequests, setAllRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
  
    // Fetch users from Supabase profiles table only
    useEffect(() => {
      fetchUsers();
    }, []);
  
    const handleApprove = async (userId: string) => {
      try {
        setActionLoading(userId)
  
        const { error } = await supabase
          .from("profiles")
          .update({
            status: "approved",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
  
        if (error) {
          throw error
        }
  
        // Update local state
        setUsers(users.map((user) => (user.id === userId ? { ...user, status: "approved" as const } : user)))
  
        toast({
          title: "User approved",
          description: "User has been approved successfully.",
        })
      } catch (error) {
        console.error("Error approving user:", error)
        toast({
          title: "Error",
          description: `Failed to approve user: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
      } finally {
        setActionLoading(null)
      }
    }
  
    const handleReject = async (userId: string) => {
      try {
        setActionLoading(userId)
  
        const { error } = await supabase
          .from("profiles")
          .update({
            status: "rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
  
        if (error) {
          throw error
        }
  
        // Update local state
        setUsers(users.map((user) => (user.id === userId ? { ...user, status: "rejected" as const } : user)))
  
        toast({
          title: "User rejected",
          description: "User has been rejected.",
          variant: "destructive",
        })
      } catch (error) {
        console.error("Error rejecting user:", error)
        toast({
          title: "Error",
          description: `Failed to reject user: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
      } finally {
        setActionLoading(null)
      }
    }
  
    const fetchUsers = async () => {
      try {
        setLoading(true);
  
        // First get all profiles
        const { data: profiles, error } = await supabase
          .from("profiles")
          .select(`
          user_id,
          name,
          role,
          status,
          created_at,
          updated_at,
          company_name,
          company_number,
          industry
        `)
          .order("created_at", { ascending: false });
  
        if (error) throw error;
  
        // Transform profiles to User format with emails
        const usersWithEmails = await Promise.all(
          profiles.map(async (profile) => {
            try {
              const email = await getClientEmail(profile.user_id);
              return {
                id: profile.user_id,
                name: profile.name || "Unknown User",
                email: email,
                role: profile.role as "admin" | "employee" | "client",
                status: profile.status as "pending" | "approved" | "rejected",
                createdAt: profile.created_at,
                companyName: profile.company_name || undefined,
                companyNumber: profile.company_number || undefined,
                industry: profile.industry || undefined,
              };
            } catch (err) {
              console.error(`Failed to get email for user ${profile.user_id}:`, err);
              return {
                ...profile,
                email: "email-not-found@example.com", // fallback
              };
            }
          })
        );
  
        setUsers(usersWithEmails);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          title: "Error",
          description: `Failed to fetch users: ${error.message || "Unknown error"}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
  
    const getClientEmail = async (id: string): Promise<string> => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        const response = await fetch(`${import.meta.env.VITE_APIURL}/api/users/email/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.session?.access_token}`
          }
        });
  
        if (!response.ok) {
          throw new Error('Failed to fetch client email');
        }
  
        const res = await response.json();
        return res.clientData.email;
      } catch (error) {
        console.error('Error fetching client email:', error);
        throw error;
      }
    };
  
    useEffect(() => {
      const fetchRealData = async () => {
        try {
          setLoading(true);
  
          // Fetch real engagement data
          const engagementsData = await engagementApi.getAll();
          setEngagements(engagementsData);
  
          // Fetch document requests for all engagements
          const requestsPromises = engagementsData.map((eng) =>
            documentRequestApi.getByEngagement(eng._id).catch(() => [])
          );
          const requestsArrays = await Promise.all(requestsPromises);
          const flatRequests = requestsArrays.flat();
          setAllRequests(flatRequests);
        } catch (error) {
          console.error("Failed to fetch admin data:", error);
          toast({
            title: "Error",
            description: "Failed to fetch some dashboard data",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      };
  
      fetchRealData();
    }, [toast]);
  
    // Calculate stats
    const pendingUsers = users.filter((user) => user.status === "pending");
    const approvedUsers = users.filter((user) => user.status === "approved");
    const activeEmployees = users.filter(
      (user) => user.role === "employee" && user.status === "approved"
    );
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = users.filter(
      (user) => new Date(user.createdAt) >= today
    ).length;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
    const newEmployeesThisMonth = users.filter(
      (user) =>
        user.role === "employee" && new Date(user.createdAt) >= startOfMonth
    ).length;
  
    const newClientsThisMonth = users.filter(
      (user) => user.role === "client" && new Date(user.createdAt) >= startOfMonth
    ).length;
    const clients = users.filter((user) => user.role === "client");
    const newUsersThisWeek = users.filter(
      (user) => new Date(user.createdAt) >= startOfWeek
    ).length;
  
    const stats = [
      {
        title: "Total Users",
        value: users.length.toString(),
        description: "All registered users",
        icon: Users,
        trend: `+${newUsersThisWeek} this week`,
        color: "from-blue-500 to-indigo-600",
        bgColor: "from-blue-50 to-indigo-50"
      },
      {
        title: "Pending Approvals",
        value: pendingUsers.length.toString(),
        description: "Awaiting approval",
        icon: Clock,
        trend: `+${newUsersToday} today`,
        color: "from-yellow-500 to-amber-600",
        bgColor: "from-yellow-50 to-amber-50"
      },
      {
        title: "Active Employees",
        value: activeEmployees.length.toString(),
        description: "Approved auditors",
        icon: UserCheck,
        trend: `+${newEmployeesThisMonth} this month`,
        color: "from-green-500 to-emerald-600",
        bgColor: "from-green-50 to-emerald-50"
      },
      {
        title: "Client Companies",
        value: clients.length.toString(),
        description: "Active clients",
        icon: Building2,
        trend: `+${newClientsThisMonth} this month`,
        color: "from-purple-500 to-pink-600",
        bgColor: "from-purple-50 to-pink-50"
      },
    ];
  
    // Generate recent activity (kept logic intact)
    const recentActivity = [
      ...pendingUsers.slice(0, 2).map((user) => ({
        id: `user-${user.id}`,
        action: "New user registration",
        user: user.name,
        time: formatTimeAgo(user.createdAt),
        status: "pending" as const,
      })),
      ...approvedUsers.slice(0, 1).map((user) => ({
        id: `approved-${user.id}`,
        action: "User approved",
        user: user.name,
        time: formatTimeAgo(user.createdAt),
        status: "completed" as const,
      })),
      ...engagements.slice(0, 2).map((eng) => ({
        id: `engagement-${eng._id}`,
        action: "New engagement created",
        user: `Client ${eng.clientId}`,
        time: formatTimeAgo(eng.createdAt),
        status: "completed" as const,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
  
    function formatTimeAgo(date: Date | string) {
      const now = new Date();
      const past = new Date(date);
      const diffInHours = Math.floor(
        (now.getTime() - past.getTime()) / (1000 * 60 * 60)
      );
  
      if (diffInHours < 1) return "Just now";
      if (diffInHours < 24)
        return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7)
        return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  
      return past.toLocaleDateString();
    }
  
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
        </div>
      )
    }
  
    return (
      <div className="bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 space-y-8">
        {/* Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                    <img src="/logo.png" alt="Logo" className="h-12 w-12 object-cover rounded" />
                  </div>
                  <div>
                                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                        Admin Dashboard
                      </h1>
                    <p className="text-slate-600 mt-1 text-lg">
                      Monitor and manage your audit portal users and system overview
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto" 
                  asChild
                >
                  <Link to="/admin/users">
                    <Users className="h-5 w-5 mr-2" />
                    Manage Users
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                >
                  <Link to="/admin/logs">
                    <FileText className="h-5 w-5 mr-2" />
                    Auditor Logs
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                >
                  <Link to="/admin/settings">
                    <Settings className="h-5 w-5 mr-2" />
                    System Settings
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
              <Card key={stat.title} className="group bg-white/80 backdrop-blur-sm border border-purple-100/50 hover:border-purple-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
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
                  <div className={`p-3 bg-gradient-to-r ${stat.bgColor} rounded-2xl border border-purple-100/50`}>
                    <p className="text-xs font-semibold text-slate-700">{stat.trend}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Approvals */}
          <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-100/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800">Pending Approvals</CardTitle>
                    <CardDescription className="text-slate-600">Users waiting for account approval</CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild 
                  className="border-yellow-200 hover:bg-yellow-50/50 text-yellow-700 hover:text-yellow-800 rounded-2xl"
                >
                  <Link to="/admin/users">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    View All
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {pendingUsers.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-slate-50 to-yellow-50/30 border border-yellow-100/50 rounded-2xl hover:border-yellow-300/50 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate group-hover:text-yellow-700 transition-colors duration-300">
                          {user.name}
                        </p>
                        <p className="text-sm text-slate-600 truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-200">
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white bg-transparent rounded-xl"
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" fill="none" />
                              </svg>
                            ) : (
                              <UserCheck className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to approve {user.name}? They will be able to access the
                              system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleApprove(user.id)}
                              className="bg-green-600 text-white hover:bg-green-700"
                            >
                              Approve
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
  
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white bg-transparent rounded-xl"
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" fill="none" />
                              </svg>
                            ) : (
                              <UserX className="h-4 w-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to reject {user.name}? They won't be able to access the
                              system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleReject(user.id)}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Reject
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
  
                {pendingUsers.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <UserCheck className="h-8 w-8 text-yellow-600" />
                    </div>
                    <p className="text-slate-600 font-medium">
                      No pending approvals. All users have been processed.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
  
          {/* Recent Activity */}
          <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-800">Recent Activity</CardTitle>
                    <CardDescription className="text-slate-600">Latest user management activities</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-slate-50 to-purple-50/30 border border-purple-100/50 rounded-2xl hover:border-purple-300/50 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-10 h-10 bg-gradient-to-br ${
                        activity.status === "pending" 
                          ? "from-yellow-500 to-amber-600" 
                          : "from-green-500 to-emerald-600"
                      } rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800 truncate group-hover:text-purple-700 transition-colors duration-300">
                          {activity.action}
                        </p>
                        <p className="text-sm text-slate-600 truncate">
                          {activity.user}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <p className="text-xs text-slate-500">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
  
                {recentActivity.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Activity className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-slate-600 font-medium">
                      No recent activity to display.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
  
        {/* System Overview */}
        <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-100/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-blue-600 rounded-2xl flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">System Overview</CardTitle>
                <CardDescription className="text-slate-600">Overview of engagements and document requests</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
                <div className="text-3xl font-bold text-slate-800 mb-2">
                  {engagements.length}
                </div>
                <p className="text-sm text-slate-600 mb-3">Total Engagements</p>
                <div className="flex items-center justify-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">
                    {engagements.filter((e) => e.status === "active").length} active
                  </span>
                </div>
              </div>
  
              <div className="text-center p-6 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-100/50">
                <div className="text-3xl font-bold text-slate-800 mb-2">
                  {allRequests.length}
                </div>
                <p className="text-sm text-slate-600 mb-3">Document Requests</p>
                <div className="flex items-center justify-center gap-2">
                  <Activity className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700 font-medium">
                    {allRequests.filter((r) => r.status === "pending").length} pending
                  </span>
                </div>
              </div>
  
              <div className="text-center p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100/50">
                <div className="text-3xl font-bold text-slate-800 mb-2">
                  {approvedUsers.length}
                </div>
                <p className="text-sm text-slate-600 mb-3">Approved Users</p>
                <div className="flex items-center justify-center gap-2">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">Active accounts</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  