// @ts-nocheck

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
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCheck, UserX, Loader2, Trash2, Users, RefreshCw, ArrowLeft, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { Link } from "react-router-dom";

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

export const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // approve/reject
  const [deletingId, setDeletingId] = useState<string | null>(null); // delete
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);

  console.log("UserManagement component rendering");

  // Fetch users from Supabase profiles table only
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // First get all profiles
      const { data: profiles, error } = await supabase
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
        industry
      `
        )
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
            console.error(
              `Failed to get email for user ${profile.user_id}:`,
              err
            );
            return {
              id: profile.user_id,
              name: profile.name || "Unknown User",
              email: "email-not-found@example.com",
              role: profile.role as "admin" | "employee" | "client",
              status: profile.status as "pending" | "approved" | "rejected",
              createdAt: profile.created_at,
              companyName: profile.company_name || undefined,
              companyNumber: profile.company_number || undefined,
              industry: profile.industry || undefined,
            };
          }
        })
      );

      setUsers(usersWithEmails);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: `Failed to fetch users: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getClientEmail = async (id: string): Promise<string> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/users/email/${id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch client email");
      }

      const res = await response.json();
      return res.clientData.email;
    } catch (error) {
      console.error("Error fetching client email:", error);
      throw error;
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.companyName &&
        user.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleApprove = async (userId: string) => {
    try {
      setActionLoading(userId);

      const { error } = await supabase
        .from("profiles")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, status: "approved" as const } : user
        )
      );

      toast({
        title: "User approved",
        description: "User has been approved successfully.",
      });
    } catch (error: any) {
      console.error("Error approving user:", error);
      toast({
        title: "Error",
        description: `Failed to approve user: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    try {
      setActionLoading(userId);

      const { error } = await supabase
        .from("profiles")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;

      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, status: "rejected" as const } : user
        )
      );

      toast({
        title: "User rejected",
        description: "User has been rejected.",
        variant: "destructive",
      });
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      toast({
        title: "Error",
        description: `Failed to reject user: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      setDeletingId(userId);

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const resp = await fetch(
        `${import.meta.env.VITE_APIURL}/api/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token}`,
          },
        }
      );

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || "Failed to delete user");
      }

      // Remove from local state
      setUsers((prev) => prev.filter((u) => u.id !== userId));

      toast({
        title: "User deleted",
        description: "The user and their profile were deleted successfully.",
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: `Failed to delete user: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="text-yellow-600 border-yellow-600 bg-yellow-50"
          >
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600 bg-green-50">
            Approved
          </Badge>
        );
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = users.filter((user) => user.status === "pending").length;
  const approvedCount = users.filter(
    (user) => user.status === "approved"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader variant="pulse" size="lg" text="Loading Users..." />
      </div>
    );
  }

  // Fallback to ensure component always renders something
  if (!users) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">User Management</h2>
          <p className="text-slate-600">Initializing user data...</p>
        </div>
      </div>
    );
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
                  <img src="/logo.png" alt="Logo" className="h-10 w-10" />
                </div>
                <div>
                                      <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                      User Management
                    </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Manage user registrations, approvals, and account status
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto" 
                onClick={fetchUsers}
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
              >
                <Link to="/admin">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group bg-white/80 backdrop-blur-sm border border-yellow-100/50 hover:border-yellow-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">Pending Approvals</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {pendingCount}
            </div>
            <p className="text-sm text-slate-600">
              Users awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card className="group bg-white/80 backdrop-blur-sm border border-green-100/50 hover:border-green-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">Active Users</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {approvedCount}
            </div>
            <p className="text-sm text-slate-600">
              Approved and active
            </p>
          </CardContent>
        </Card>

        <Card className="group bg-white/80 backdrop-blur-sm border border-purple-100/50 hover:border-purple-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-slate-800">Total Registrations</CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {users.length}
            </div>
            <p className="text-sm text-slate-600">
              All time registrations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">All Users</CardTitle>
                <CardDescription className="text-slate-600">Manage user accounts and approval status</CardDescription>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border-purple-200 focus:border-purple-400 rounded-2xl"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Keep desktop table intact; enable horizontal scroll on small screens */}
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="border-purple-100/50">
                  <TableHead className="text-slate-700 font-semibold">Name</TableHead>
                  <TableHead className="text-slate-700 font-semibold">User ID</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Role</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Company</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Registered</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-slate-600"
                    >
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-purple-600" />
                      </div>
                      <p className="font-medium">
                        {searchTerm
                          ? "No users found matching your search."
                          : "No users found."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="border-purple-100/50 hover:bg-purple-50/30 transition-colors duration-200">
                      <TableCell className="font-medium max-w-[220px] truncate text-slate-800">
                        {user.name}
                      </TableCell>
                      <TableCell className="font-mono text-sm whitespace-nowrap text-slate-600">
                        {user.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize bg-purple-100 text-purple-700 border-purple-200">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-slate-600">
                        {user.companyName || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {user.status === "pending" && (
                            <>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-600 hover:bg-green-600 hover:text-white bg-transparent rounded-xl"
                                    disabled={
                                      actionLoading === user.id ||
                                      deletingId === user.id
                                    }
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
                                    <AlertDialogTitle>
                                      Approve User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to approve{" "}
                                      {user.name}? They will be able to access
                                      the system.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
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
                                    disabled={
                                      actionLoading === user.id ||
                                      deletingId === user.id
                                    }
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
                                    <AlertDialogTitle>
                                      Reject User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to reject{" "}
                                      {user.name}? They won't be able to access
                                      the system.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleReject(user.id)}
                                      className="bg-red-600 text-white hover:bg-red-700"
                                    >
                                      Reject
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}

                          {/* NEW: Delete button for any status */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white bg-transparent rounded-xl"
                                disabled={
                                  deletingId === user.id ||
                                  actionLoading === user.id
                                }
                                title="Delete user permanently"
                              >
                                {deletingId === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete {user.name}
                                  &apos;s account and profile data. This action
                                  cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(user.id)}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
