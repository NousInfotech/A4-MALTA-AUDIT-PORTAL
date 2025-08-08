import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search, Eye, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client"
import { useToast } from '@/hooks/use-toast';
import { useEngagements } from '@/hooks/useEngagements';

interface User {
  summary: string;
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
export const ClientManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
    const { engagements, loading } = useEngagements();
  
    const { toast } = useToast()

    useEffect(() => {
      fetchClients()
    }, [])
  
  const fetchClients = async () => {
    try {
      setIsLoading(true);

      // First get all client profiles
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
          industry,
          company_summary
        `)
        .eq('role', 'client') // Only fetch clients
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch emails for all clients in parallel
      const clientsWithEmails = await Promise.all(
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
              summary: profile.company_summary || undefined,
            };
          } catch (err) {
            console.error(`Failed to get email for client ${profile.user_id}:`, err);
            return {
              ...profile,
              email: "email-not-found@example.com", // fallback
            };
          }
        })
      );

      setClients(clientsWithEmails);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: `Failed to fetch clients: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const filteredClients = clients.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())),
  );
      if (isLoading)
        return (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
          </div>
        );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your client companies and their information
          </p>
        </div>
        <Button className="border-sidebar-foreground" variant='outline' asChild>
          <Link to="/employee/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add New Client
          </Link>
        </Button>

      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by company name, industry, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredClients.length} of {clients.length} clients
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => {
          // const engagements = getClientEngagements(client.id);
          // const activeEngagements = engagements.filter(e => e.status === 'active').length;
          
          return (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{client.companyName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{client.companyNumber}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    {client.industry}
                  </Badge>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {client.summary}
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Engagements</span>
                  <span className="font-medium text-foreground">{engagements.filter(eng => eng.clientId === client.id && eng.status==='active').length}</span>
                  {/* <span className="font-medium text-foreground">{activeEngagements}</span> */}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Engagements</span>
                  <span className="font-medium text-foreground">{engagements.filter(eng => eng.clientId === client.id).length}</span>
                  {/* <span className="font-medium text-foreground">{engagements.length}</span> */}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Added</span>
                  <span className="font-medium text-foreground">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 pt-2">
                  <Button className="border-sidebar-foreground flex-1" size="sm" variant="outline" asChild>
                    <Link to={`/employee/clients/${client.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                  {/* <Button size="sm" variant="outline">
                    <Mail className="h-4 w-4" />
                  </Button> */}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Start by adding your first client to begin managing audit engagements'
              }
            </p>
            {!searchTerm && (
              <Button asChild>
                <Link to="/employee/clients/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Client
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};