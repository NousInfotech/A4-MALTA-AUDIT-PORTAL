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
  Settings,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
    const response = await fetch(`${import.meta.env.VITE_APIURL}/api/client/email/${id}`, {
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

  // Calculate stats using real and mock data

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
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // 1st day of current month

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
    },
    {
      title: "Pending Approvals",
      value: pendingUsers.length.toString(),
      description: "Awaiting approval",
      icon: UserCheck,
      trend: `+${newUsersToday} today`,
    },
    {
      title: "Active Employees",
      value: activeEmployees.length.toString(),
      description: "Approved auditors",
      icon: UserCheck,
      trend: `+${newEmployeesThisMonth} this month`,
    },
    {
      title: "Client Companies",
      value: clients.length.toString(),
      description: "Active clients",
      icon: Building2,
      trend: `+${newClientsThisMonth} this month`,
    },
  ];

  // Generate recent activity from real and mock data
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
    // Add engagement activities from real data
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your audit portal users and system overview
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={"/admin/users"}>
            <Button variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Manage Users
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-success mt-1">{stat.trend}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Approvals</CardTitle>
                <CardDescription>
                  Users waiting for account approval
                </CardDescription>
              </div>
              <Link to={"/admin/users"}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingUsers.slice(0, 3).map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-warning" />
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {user.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white bg-transparent"
                                  disabled={actionLoading === user.id}
                                >
                                  {actionLoading === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
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
                                  <AlertDialogAction onClick={() => handleApprove(user.id)}>Approve</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                                  disabled={actionLoading === user.id}
                                >
                                  {actionLoading === user.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
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
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                  <UserCheck className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-muted-foreground">No pending approvals</p>
                  <p className="text-xs text-muted-foreground">
                    All users have been processed
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest user management activities
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activity.status === "pending"
                          ? "bg-warning"
                          : "bg-success"
                      }`}
                    />
                    <div>
                      <p className="font-medium text-foreground">
                        {activity.action}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {activity.user}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              ))}

              {recentActivity.length === 0 && (
                <div className="text-center py-8">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Overview with Real Data */}
      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>
            Overview of engagements and document requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {engagements.length}
              </div>
              <p className="text-sm text-muted-foreground">Total Engagements</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {engagements.filter((e) => e.status === "active").length}{" "}
                  active
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {allRequests.length}
              </div>
              <p className="text-sm text-muted-foreground">Document Requests</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Activity className="h-3 w-3 text-warning" />
                <span className="text-xs text-warning">
                  {allRequests.filter((r) => r.status === "pending").length}{" "}
                  pending
                </span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {approvedUsers.length}
              </div>
              <p className="text-sm text-muted-foreground">Approved Users</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <UserCheck className="h-3 w-3 text-success" />
                <span className="text-xs text-success">Active accounts</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
