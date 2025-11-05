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
    FileText,
    CheckCircle
  } from "lucide-react";
  import { supabase } from "@/integrations/supabase/client";
  import { EnhancedLoader } from "@/components/ui/enhanced-loader";
  import { AdminComprehensiveNavigation } from "@/components/ui/admin-comprehensive-navigation";
  
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
        color: "text-gray-300"
      },
      {
        title: "Pending Approvals",
        value: pendingUsers.length.toString(),
        description: "Awaiting approval",
        icon: Clock,
        trend: `+${newUsersToday} today`,
        color: "text-gray-300"
      },
      {
        title: "Active Employees",
        value: activeEmployees.length.toString(),
        description: "Approved auditors",
        icon: UserCheck,
        trend: `+${newEmployeesThisMonth} this month`,
        color: "text-gray-300"
      },
      {
        title: "Client Companies",
        value: clients.length.toString(),
        description: "Active clients",
        icon: Building2,
        trend: `+${newClientsThisMonth} this month`,
        color: "text-gray-300"
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
        <div className="min-h-screen bg-brand-body flex items-center justify-center">
          <EnhancedLoader size="lg" text="Loading..." />
        </div>
      )
    }
  
  // Dynamic greeting message
  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    const userName = "Admin";
    
    if (hour < 12) {
      // return `Good morning, ${userName}!`;
      return `Good morning, Cleven!`;
    } else if (hour < 17) {
      return `Good afternoon, Cleven!`;
      // return `Good afternoon, ${userName}!`;
    } else {
      return `Good evening, Cleven!`;
      // return `Good evening, ${userName}!`;
    }
  };

  const getGreetingDescription = () => {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      return `Ready to manage the audit portal? You have ${pendingUsers.length} pending approvals.`;
    } else if (hour < 17) {
      return `Keep up the great work! ${approvedUsers.length} users approved this week.`;
    } else {
      return `Great work today! Time to wrap up and plan for tomorrow.`;
    }
  };

  return (
    <div className="min-h-screen bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-brand-body mb-2">{getGreetingMessage()}</h1>
          <p className="text-brand-body">{getGreetingDescription()}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
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
                      <p className="text-xs text-gray-600">{stat.trend}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="h-6 w-6 text-gray-800" />
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-semibold text-gray-900">{newUsersToday}</p>
                  <p className="text-sm text-gray-700">New Users Today</p>
                  <p className="text-sm font-medium text-green-600">+{newUsersToday} today</p>
                </div>
              </div>
              <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
                <div className="flex items-center justify-between mb-4">
                  <Activity className="h-6 w-6 text-gray-800" />
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-semibold text-gray-900">{engagements.length}</p>
                  <p className="text-sm text-gray-700">Total Engagements</p>
                  <p className="text-sm font-medium text-blue-600">{engagements.filter((e) => e.status === "active").length} active</p>
                </div>
              </div>
            </div>

            {/* System Analytics Chart */}
            <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30 animate-fade-in">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">System Analytics</h3>
              
              {/* Circular Progress Charts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                {[
                  { status: 'Pending', count: pendingUsers.length, total: users.length, color: 'text-gray-700', bgColor: 'bg-primary', ringColor: 'ring-primary/20' },
                  { status: 'Approved', count: approvedUsers.length, total: users.length, color: 'text-gray-600', bgColor: 'bg-gray-700', ringColor: 'ring-gray-700/20' },
                  { status: 'Rejected', count: users.filter(u => u.status === 'rejected').length, total: users.length, color: 'text-gray-500', bgColor: 'bg-gray-600', ringColor: 'ring-gray-600/20' },
                  { status: 'Total', count: users.length, total: users.length, color: 'text-gray-800', bgColor: 'bg-primary', ringColor: 'ring-primary/20' }
                ].map((item, index) => {
                  const percentage = users.length > 0 ? (item.count / item.total) * 100 : 0;
                  const circumference = 2 * Math.PI * 30;
                  const strokeDasharray = circumference;
                  const strokeDashoffset = circumference - (percentage / 100) * circumference;
                  
                  return (
                    <div key={index} className="flex flex-col items-center">
                      <div className="relative w-20 h-20 mb-3">
                        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 70 70">
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
                            className={`transition-all duration-1000 ease-out ${item.color}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-lg font-bold ${item.color}`}>{item.count}</span>
                        </div>
                      </div>
                      <span className="text-sm text-gray-700 text-center">{item.status}</span>
                      <span className="text-xs text-gray-600">{percentage.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Mini Bar Chart */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-800 mb-4">User Status Distribution</h4>
                <div className="space-y-3">
                  {[
                    { status: 'Pending', count: pendingUsers.length, color: 'bg-primary', percentage: users.length > 0 ? (pendingUsers.length / users.length) * 100 : 0 },
                    { status: 'Approved', count: approvedUsers.length, color: 'bg-gray-700', percentage: users.length > 0 ? (approvedUsers.length / users.length) * 100 : 0 },
                    { status: 'Rejected', count: users.filter(u => u.status === 'rejected').length, color: 'bg-gray-600', percentage: users.length > 0 ? (users.filter(u => u.status === 'rejected').length / users.length) * 100 : 0 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-16 text-sm text-gray-700">{item.status}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${item.color} transition-all duration-1000 ease-out`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <div className="w-12 text-sm text-gray-700 text-right">{item.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Admin Comprehensive Navigation */}
            <AdminComprehensiveNavigation />
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Pending Approvals */}
            <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild 
                  className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-xl"
                >
                  <Link to="/admin/users">
                    <ArrowRight className="h-4 w-4 mr-2" />
                    View All
                  </Link>
                </Button>
              </div>
              <div className="space-y-3">
                {pendingUsers.slice(0, 3).map((user) => (
                  <div
                    key={user.id}
                    className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <Users className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate group-hover:text-gray-700 transition-colors duration-300 text-sm">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-gray-600 border-gray-600 hover:bg-gray-600 hover:text-white bg-transparent rounded-lg p-1"
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" fill="none" />
                              </svg>
                            ) : (
                              <UserCheck className="h-3 w-3" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to approve {user.name}? They will be able to access the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleApprove(user.id)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
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
                            className="text-gray-600 border-gray-600 hover:bg-gray-600 hover:text-white bg-transparent rounded-lg p-1"
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                                <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="4" fill="none" />
                              </svg>
                            ) : (
                              <UserX className="h-3 w-3" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to reject {user.name}? They won't be able to access the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleReject(user.id)}
                              className="bg-primary text-primary-foreground hover:bg-primary/90"
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
                  <div className="text-center py-8">
                    <UserCheck className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600">No pending approvals. All users have been processed.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                        <Activity className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate group-hover:text-gray-700 transition-colors duration-300 text-sm">
                          {activity.action}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {activity.user}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <p className="text-xs text-gray-500">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {recentActivity.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600">No recent activity to display.</p>
                  </div>
                )}
              </div>
            </div>

            {/* System Overview */}
            <div 
              className="backdrop-blur-md border rounded-2xl p-6 bg-primary/90"
              style={{ 
                borderColor: 'hsl(var(--primary) / 0.5)'
              }}
            >
              <h3 className="text-lg font-semibold text-primary-foreground mb-2">System Overview</h3>
              <p className="text-primary-foreground/80 mb-4">
                {pendingUsers.length > 0 ? `${pendingUsers.length} pending approval${pendingUsers.length !== 1 ? 's' : ''}` : 'All users processed'}
              </p>
              <div className="w-full bg-primary-foreground/20 rounded-full h-2 mb-4">
                <div 
                  className="bg-primary-foreground h-2 rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${users.length > 0 ? (approvedUsers.length / users.length) * 100 : 0}%` }}
                ></div>
              </div>
              <p className="text-primary-foreground/80 text-sm mb-4">
                {approvedUsers.length} of {users.length} users approved
              </p>
              <button className="w-full bg-primary-foreground text-primary py-2 px-4 rounded-xl font-medium hover:bg-primary-foreground/90 transition-colors duration-200">
                View all users
              </button>
            </div>

            {/* System Stats */}
            <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Briefcase className="h-4 w-4 text-gray-700" />
                    <span className="text-gray-900 font-medium text-sm">Total Engagements</span>
                  </div>
                  <span className="text-gray-700 font-semibold">{engagements.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-4 w-4 text-gray-700" />
                    <span className="text-gray-900 font-medium text-sm">Document Requests</span>
                  </div>
                  <span className="text-gray-700 font-semibold">{allRequests.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <Users className="h-4 w-4 text-gray-700" />
                    <span className="text-gray-900 font-medium text-sm">Active Users</span>
                  </div>
                  <span className="text-gray-700 font-semibold">{approvedUsers.length}</span>
                </div>
              </div>
            </div>

            {/* Admin Status */}
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
                {pendingUsers.length > 0 
                  ? `You have ${pendingUsers.length} pending approval${pendingUsers.length !== 1 ? 's' : ''} and ${users.length} total users to manage.`
                  : 'All users have been processed. System is up to date.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  };


