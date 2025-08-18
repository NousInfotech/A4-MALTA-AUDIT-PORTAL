// @ts-nocheck

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { useToast } from "@/hooks/use-toast"
import { Search, UserCheck, UserX, Mail, Loader2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

interface User {
  id: string
  name: string
  email: string
  role: "admin" | "employee" | "client"
  status: "pending" | "approved" | "rejected"
  createdAt: string
  companyName?: string
  companyNumber?: string
  industry?: string
}

export const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])

  // Fetch users from Supabase profiles table only
  useEffect(() => {
    fetchUsers()
  }, [])

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

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase())),
  )

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600 border-yellow-600">
            Pending
          </Badge>
        )
      case "approved":
        return (
          <Badge variant="outline" className="text-green-600 border-green-600">
            Approved
          </Badge>
        )
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const pendingCount = users.filter((user) => user.status === "pending").length
  const approvedCount = users.filter((user) => user.status === "approved").length

  if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader variant="pulse" size="lg" text="Loading Users..." />
        </div>
      )
    }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-2">Manage user registrations, approvals, and account status</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Users awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Approved and active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{users.length}</div>
            <p className="text-sm text-muted-foreground mt-1">All time registrations</p>
          </CardContent>
        </Card>
      </div>

      {/* User Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage user accounts and approval status</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={fetchUsers} variant="outline" size="sm">
                Refresh
              </Button>
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "No users found matching your search." : "No users found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="font-mono text-sm">{user.id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.companyName || "-"}</TableCell>
                    <TableCell>{getStatusBadge(user.status)}</TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.status === "pending" && (
                          <>
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
                          </>
                        )}

                        {/* <Button size="sm" variant="outline">
                          <Mail className="h-4 w-4" />
                        </Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
