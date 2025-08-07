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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

      console.log("Fetched profiles:", data);

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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedEngMonth = engagements.filter((user) => user.status==='completed'&& new Date(user.createdAt) >= startOfMonth).length
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
    },
    {
      title: "Total Engagements",
      value: engagements.length.toString(),
      description: "All engagements",
      icon: FileText,
      trend: `${engagements.filter((e) => e.status === "draft").length} drafts`,
    },
    {
      title: "Completed",
      value: engagements
        .filter((e) => e.status === "completed")
        .length.toString(),
      description: "This month",
      icon: TrendingUp,
      trend: `+${completedEngMonth} from last month`,
    },
  ];

  const recentEngagements = engagements.slice(0, 3);
  const recentClients = clients.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Employee Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your audit engagements and client relationships
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/employee/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/employee/engagements/new">
              <Plus className="h-4 w-4 mr-2" />
              New Engagement
            </Link>
          </Button>
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
        {/* Recent Engagements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Engagements</CardTitle>
                <CardDescription>Your latest audit projects</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/employee/engagements">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEngagements.map((engagement) => {
                const client = clients.find(
                  (c) => c.id === engagement.clientId
                );
                return (
                  <div
                    key={engagement._id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {engagement.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {client?.companyName || "Unknown Client"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Year End:{" "}
                        {new Date(engagement.yearEndDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          engagement.status === "active"
                            ? "bg-success/10 text-success"
                            : engagement.status === "completed"
                            ? "bg-muted text-muted-foreground"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {engagement.status}
                      </div>
                    </div>
                  </div>
                );
              })}
              {recentEngagements.length === 0 && (
                <p className="text-muted-foreground text-center py-8">
                  No engagements yet. Create your first engagement to get
                  started.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Clients</CardTitle>
                <CardDescription>Your latest client additions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/employee/clients">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {client.companyName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {client.industry}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/employee/clients/${client.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
