// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search, Eye, Loader2, Users, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useEngagements } from '@/hooks/useEngagements';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';

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

export const ClientManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { engagements } = useEngagements();
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoading(true);

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
        .eq('role', 'client')
        .order("created_at", { ascending: false });

      if (error) throw error;

      const clientsWithEmails = await Promise.all(
        profiles.map(async (profile) => {
          try {
            const email = await getClientEmail(profile.user_id);
            return {
              id: profile.user_id,
              name: profile.name || "Unknown User",
              email,
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
              email: "email-not-found@example.com",
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
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      const response = await fetch(`${import.meta.env.VITE_APIURL}/api/users/email/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.session?.access_token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch client email');
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

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
        </div>
      )
    }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Client Management
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Manage your client companies and their information
                  </p>
                </div>
              </div>
            </div>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3 h-auto" 
              variant='default' 
              asChild
            >
              <Link to="/employee/clients/new">
                <Plus className="h-5 w-5 mr-2" />
                Add New Client
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="relative flex-1 w-full max-w-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl blur-xl"></div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5" />
              <Input
                placeholder="Search by company name, industry, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-full h-14 bg-white/90 border-blue-200 focus:border-blue-400 focus:ring-blue-400/20 rounded-2xl text-lg shadow-lg"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl px-6 py-3">
              <span className="text-blue-700 font-semibold text-lg">
                {filteredClients.length} of {clients.length} clients
              </span>
            </div>
          </div>
        </div>
      </div>


      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredClients.map((client) => {
          const activeEngagements = engagements.filter(eng => eng.clientId === client.id && eng.status === 'active').length;
          const totalEngagements = engagements.filter(eng => eng.clientId === client.id).length;
          
          return (
            <Card key={client.id} className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative pb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                      <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors duration-300">
                        {client.companyName}
                      </CardTitle>
                      <p className="text-sm text-slate-500 font-medium">{client.companyNumber}</p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-6">
                <div className="space-y-4">
                  <Badge 
                    variant="secondary" 
                    className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200 rounded-xl px-4 py-2 text-sm font-semibold"
                  >
                    {client.industry || 'N/A'}
                  </Badge>
                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {client.summary || 'No summary available for this client.'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-blue-100/50">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-600 font-semibold uppercase">Active</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-700">{activeEngagements}</span>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs text-indigo-600 font-semibold uppercase">Total</span>
                    </div>
                    <span className="text-2xl font-bold text-indigo-700">{totalEngagements}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm pt-2">
                  <span className="text-slate-500">Added</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl py-3 h-auto group-hover:scale-105" 
                  size="sm" 
                  variant="default" 
                  asChild
                >
                  <Link to={`/employee/clients/${client.id}`}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredClients.length === 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              {searchTerm ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className="text-slate-600 text-lg mb-6 max-w-md mx-auto">
              {searchTerm 
                ? 'Try adjusting your search terms to find what you\'re looking for'
                : 'Start by adding your first client to begin managing audit engagements'
              }
            </p>
            {!searchTerm && (
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3" 
                variant='default' 
                asChild
              >
                <Link to="/employee/clients/new">
                  <Plus className="h-5 w-5 mr-2" />
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
