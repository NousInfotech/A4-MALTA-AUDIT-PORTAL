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
import { useActivityLogger } from '@/hooks/useActivityLogger';

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
  const { logViewClient } = useActivityLogger();

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
          <EnhancedLoader size="lg" text="Loading..." />
        </div>
      )
    }

  return (
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Client Management</h1>
          <p className="text-gray-700">
            Manage your client companies and their information
          </p>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <Button 
            className="bg-brand-hover hover:bg-brand-active text-white rounded-xl px-6 py-3 h-auto shadow-lg hover:shadow-xl" 
            variant='default' 
            asChild
          >
            <Link to="/employee/clients/new">
              <Plus className="h-5 w-5 mr-2" />
              Add New Client
            </Link>
          </Button>
        </div>

        {/* Search Section */}
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="relative flex-1 w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 h-5 w-5" />
              <Input
                placeholder="Search by company name, industry, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 w-full h-14 border-gray-200 focus:border-gray-400 rounded-xl text-lg"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-gray-50 rounded-xl px-6 py-3">
                <span className="text-gray-700 font-semibold text-lg">
                  {filteredClients.length} of {clients.length} clients
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const activeEngagements = engagements.filter(eng => eng.clientId === client.id && eng.status === 'active').length;
            const totalEngagements = engagements.filter(eng => eng.clientId === client.id).length;
            
            return (
              <div key={client.id} className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-hover rounded-xl flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {client.companyName}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">{client.companyNumber}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Badge 
                      variant="secondary" 
                      className="bg-gray-100 text-gray-700 border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold"
                    >
                      {client.industry || 'N/A'}
                    </Badge>
                    <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {client.summary || 'No summary available for this client.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-gray-600" />
                        <span className="text-xs text-gray-600 font-semibold uppercase">Active</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-700">{activeEngagements}</span>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <span className="text-xs text-gray-600 font-semibold uppercase">Total</span>
                      </div>
                      <span className="text-2xl font-bold text-gray-700">{totalEngagements}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm pt-2">
                    <span className="text-gray-500">Added</span>
                    <span className="font-semibold text-gray-700">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full bg-brand-hover hover:bg-brand-active text-white border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto" 
                    size="sm" 
                    variant="default" 
                    asChild
                  >
                    <Link 
                      to={`/employee/clients/${client.id}`}
                      onClick={() => logViewClient(client.companyName || 'Unknown Client', `Employee viewed client details for ${client.companyName}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-16 text-center shadow-lg shadow-gray-300/30">
            <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-10 w-10 text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {searchTerm ? 'No clients found' : 'No clients yet'}
            </h3>
            <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
              {searchTerm 
                ? 'Try adjusting your search terms to find what you\'re looking for'
                : 'Start by adding your first client to begin managing audit engagements'
              }
            </p>
            {!searchTerm && (
              <Button 
                className="bg-brand-hover hover:bg-brand-active text-white border-0 shadow-lg hover:shadow-xl rounded-xl px-8 py-3" 
                variant='default' 
                asChild
              >
                <Link to="/employee/clients/new">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Client
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
