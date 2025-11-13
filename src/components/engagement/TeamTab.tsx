// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { engagementApi, userApi } from "@/services/api";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserPlus, Users, X, Search, Mail, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface TeamTabProps {
  engagementId: string;
}

interface Auditor {
  auditorId: string;
  assignedAt: Date;
  assignedBy: string;
}

interface User {
  user_id: string;
  email: string;
  name?: string;
  role?: string;
  company_name?: string;
}

export const TeamTab: React.FC<TeamTabProps> = ({ engagementId }) => {
  const [assignedAuditors, setAssignedAuditors] = useState<Auditor[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingAuditorId, setAddingAuditorId] = useState<string | null>(null);
  const [removingAuditorId, setRemovingAuditorId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  // Get current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchCurrentUser();
  }, []);

  // Fetch assigned auditors and all users
  useEffect(() => {
    fetchTeamData();
  }, [engagementId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      // Fetch assigned auditors
      const auditorsResponse = await engagementApi.getAssignedAuditors(engagementId);
      setAssignedAuditors(auditorsResponse.assignedAuditors || []);

      // Fetch all users
      const usersResponse = await userApi.getAll();
      
      // The API returns { users: [...], pagination: {...} }
      const allUsersList = usersResponse.users || [];
      
      // Filter to only show employees (auditors)
      const employees = allUsersList.filter((user: User) => 
        user.role === 'employee' || user.role === 'admin' || user.role === 'senior-employee'
      );
      
      setAllUsers(employees);
      setFilteredUsers(employees);
    } catch (error) {
      console.error("Failed to fetch team data:", error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get user details from profiles
  const getUserDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, company_name')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.log("Could not fetch user details:", error);
      return null;
    }
  };

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter((user) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          user.email?.toLowerCase().includes(searchLower) ||
          user.name?.toLowerCase().includes(searchLower) ||
          user.company_name?.toLowerCase().includes(searchLower)
        );
      });
      setFilteredUsers(filtered);
    }
  }, [searchQuery, allUsers]);

  const handleAddAuditor = async (auditorId: string) => {
    try {
      setAddingAuditorId(auditorId);
      
      await engagementApi.assignAuditor(
        engagementId,
        auditorId,
        currentUser?.id || 'unknown'
      );

      toast({
        title: "Success",
        description: "Team member added successfully",
      });

      // Refresh the team data
      await fetchTeamData();
      setIsDialogOpen(false);
      setSearchQuery("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add team member",
        variant: "destructive",
      });
    } finally {
      setAddingAuditorId(null);
    }
  };

  const handleRemoveAuditor = async (auditorId: string) => {
    try {
      setRemovingAuditorId(auditorId);
      
      await engagementApi.unassignAuditor(engagementId, auditorId);

      toast({
        title: "Success",
        description: "Team member removed successfully",
      });

      // Refresh the team data
      await fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    } finally {
      setRemovingAuditorId(null);
    }
  };

  // Check if user is already assigned
  const isUserAssigned = (userId: string) => {
    return assignedAuditors.some((auditor) => auditor.auditorId === userId);
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

  // Get user info from userId
  const getUserInfo = (userId: string) => {
    return allUsers.find((user) => user.user_id === userId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <EnhancedLoader size="lg" text="Loading team..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Engagement Team
              </CardTitle>
              <CardDescription className="mt-2">
                Manage team members assigned to this engagement
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Add Team Member</DialogTitle>
                  <DialogDescription>
                    Select auditors to add to this engagement team
                  </DialogDescription>
                </DialogHeader>

                {/* Search Box */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* User List */}
                <div className="space-y-2 mt-4">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No auditors found
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const isAssigned = isUserAssigned(user.user_id);
                      return (
                        <div
                          key={user.user_id}
                          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(user.name, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900">
                                {user.name || user.email}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {user.email}
                              </div>
                              {user.company_name && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {user.company_name}
                                </div>
                              )}
                            </div>
                          </div>
                          {isAssigned ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              Already Assigned
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAddAuditor(user.user_id)}
                              disabled={addingAuditorId === user.user_id}
                              className="rounded-lg"
                            >
                              {addingAuditorId === user.user_id ? (
                                <>
                                  <EnhancedLoader size="sm" />
                                  Adding...
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  Add
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Team Members List */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Team Members ({assignedAuditors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedAuditors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Team Members
              </h3>
              <p className="text-gray-600 mb-4">
                No team members have been assigned to this engagement yet.
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="rounded-xl"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedAuditors.map((auditor) => {
                const userInfo = getUserInfo(auditor.auditorId);
                const assignedByInfo = getUserInfo(auditor.assignedBy);

                return (
                  <div
                    key={auditor.auditorId}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                          {getInitials(userInfo?.name, userInfo?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-gray-900 text-lg">
                          {userInfo?.name || userInfo?.email || auditor.auditorId}
                        </div>
                        {userInfo?.email && (
                          <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <Mail className="h-3 w-3" />
                            {userInfo.email}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Added {format(new Date(auditor.assignedAt), "MMM dd, yyyy")}
                          </div>
                          {assignedByInfo && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              by {assignedByInfo.name || assignedByInfo.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAuditor(auditor.auditorId)}
                      disabled={removingAuditorId === auditor.auditorId}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 rounded-lg"
                    >
                      {removingAuditorId === auditor.auditorId ? (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

