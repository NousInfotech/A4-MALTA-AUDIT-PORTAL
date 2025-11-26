// @ts-nocheck

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();

  console.log("UserManagement component rendering");

  // Get filter from URL parameters
  const statusFilter = searchParams.get('filter') || 'all';
  const roleFilter = searchParams.get('role') || 'all';

  // Fetch users from Supabase profiles table only
  useEffect(() => {
    fetchUsers();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('filter', statusFilter);
    if (roleFilter !== 'all') params.set('role', roleFilter);
    setSearchParams(params);
  }, [statusFilter, roleFilter, setSearchParams]);

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

  const filteredUsers = users.filter((user) => {
    // Text search filter
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.companyName &&
        user.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter from URL
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    // Role filter from URL
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

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
        <EnhancedLoader size="lg" text="Loading Users..." />
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
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-brand-body mb-2">User Management</h1>
          <p className="text-brand-body">Manage user registrations, approvals, and account status</p>
                </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg hover:shadow-xl px-6 py-3 h-auto" 
                onClick={fetchUsers}
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </Button>
              <Button
                asChild
                variant="outline"
            className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-xl px-6 py-3 h-auto"
              >
                <Link to="/admin">
                  <ArrowLeft className="h-5 w-5 mr-2 text-brand-body" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-6 w-6 text-gray-800" />
          </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">{pendingCount}</p>
              <p className="text-sm text-gray-700">Pending Approvals</p>
              <p className="text-xs text-gray-600">Users awaiting approval</p>
        </div>
      </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
            <div className="flex items-center justify-between mb-4">
              <UserCheck className="h-6 w-6 text-gray-800" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">{approvedCount}</p>
              <p className="text-sm text-gray-700">Active Users</p>
              <p className="text-xs text-gray-600">Approved and active</p>
              </div>
            </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
            <div className="flex items-center justify-between mb-4">
              <Shield className="h-6 w-6 text-gray-800" />
              </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-700">Total Registrations</p>
              <p className="text-xs text-gray-600">All time registrations</p>
              </div>
            </div>
      </div>

      {/* User Table */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                  <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
                  <p className="text-sm text-gray-600">Manage user accounts and approval status</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full border-gray-200 focus:border-gray-400 rounded-xl"
                />
              </div>
              
              {/* Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchParams({})}
                  className="rounded-xl"
                >
                  All Users
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchParams({ filter: 'pending' })}
                  className="rounded-xl"
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchParams({ filter: 'approved' })}
                  className="rounded-xl"
                >
                  Approved
                </Button>
                <Button
                  variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchParams({ filter: 'rejected' })}
                  className="rounded-xl"
                >
                  Rejected
                </Button>
              </div>
            </div>
          </div>
          </div>
          <div className="p-6">
          {/* Keep desktop table intact; enable horizontal scroll on small screens */}
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                    <TableHead className="text-gray-700 font-semibold">User ID</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Role</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Company</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Status</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Registered</TableHead>
                    <TableHead className="text-gray-700 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                        className="text-center py-12 text-gray-600"
                    >
                        <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <Users className="h-8 w-8 text-gray-600" />
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
                      <TableRow key={user.id} className="border-gray-200 hover:bg-gray-50 transition-colors duration-200">
                        <TableCell className="font-medium max-w-[220px] truncate text-gray-900">
                        {user.name}
                      </TableCell>
                        <TableCell className="font-mono text-sm whitespace-nowrap text-gray-600">
                        {user.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                          <Badge variant="secondary" className="capitalize bg-gray-100 text-gray-700 border-gray-200">
                          {user.role}
                        </Badge>
                      </TableCell>
                        <TableCell className="max-w-[240px] truncate text-gray-600">
                        {user.companyName || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="whitespace-nowrap text-gray-600">
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
                                      className="text-gray-600 border-gray-600 hover:bg-gray-600 hover:text-primary-foreground bg-transparent rounded-xl"
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
                                        className="bg-primary text-primary-foreground hover:bg-primary"
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
                                      className="text-gray-600 border-gray-600 hover:bg-gray-600 hover:text-primary-foreground bg-transparent rounded-xl"
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
                                        className="bg-primary text-primary-foreground hover:bg-primary"
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
                                  className="text-gray-600 border-gray-600 hover:bg-gray-600 hover:text-primary-foreground bg-transparent rounded-xl"
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
                                    className="bg-primary text-primary-foreground hover:bg-primary"
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
          </div>
        </div>
      </div>
    </div>
  );
};
