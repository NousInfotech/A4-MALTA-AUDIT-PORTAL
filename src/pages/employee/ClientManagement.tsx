// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search, Eye, Loader2, Users, Calendar, TrendingUp, Briefcase, ArrowUpDown } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { useEngagements } from '@/hooks/useEngagements';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';
import { useActivityLogger } from '@/hooks/useActivityLogger';
import { fetchCompanies } from '@/lib/api/company';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  companyId?: string;
}

type SortOption = 'name' | 'dateModified';

export const ClientManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const { engagements } = useEngagements();
  const { toast } = useToast();
  const { logViewClient } = useActivityLogger();
  const { user}= useAuth();


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
        .eq('organization_id', user?.organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const clientsWithEmails = await Promise.all(
        profiles.map(async (profile) => {
          try {
            const email = await getClientEmail(profile.user_id);
            
            // Fetch companies for this client
            let companyId: string | undefined;
            try {
              const companiesResult = await fetchCompanies(profile.user_id);
              const companies = Array.isArray(companiesResult?.data) ? companiesResult.data : [];
              // Get the first company's ID if available
              if (companies.length > 0 && companies[0]?._id) {
                companyId = companies[0]._id;
              }
            } catch (companyError) {
              console.error(`Failed to fetch companies for client ${profile.user_id}:`, companyError);
              // Continue without companyId if fetch fails
            }
            
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
              companyId,
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

  // Date grouping function (similar to File Explorer)
  const getDateGroup = (date: string): string => {
    const clientDate = new Date(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const thisYear = new Date(today);
    thisYear.setMonth(0, 1); // January 1st of this year

    const clientDateOnly = new Date(clientDate.getFullYear(), clientDate.getMonth(), clientDate.getDate());

    if (clientDateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (clientDateOnly.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else if (clientDateOnly >= weekAgo) {
      return 'This week';
    } else if (clientDateOnly >= monthAgo) {
      return 'This month';
    } else if (clientDateOnly >= thisYear) {
      return 'Earlier this year';
    } else {
      return 'Earlier this year';
    }
  };

  // Sort and filter clients
  const processedClients = useMemo(() => {
    // First filter
    let filtered = clients.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.companyName && user.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())),
    );

    // Then sort
    if (sortOption === 'name') {
      filtered = [...filtered].sort((a, b) => {
        const nameA = (a.companyName || a.name || '').toLowerCase();
        const nameB = (b.companyName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else if (sortOption === 'dateModified') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Most recent first
      });
    }

    return filtered;
  }, [clients, searchTerm, sortOption]);

  // Group clients by date when sorting by dateModified
  const groupedClients = useMemo(() => {
    if (sortOption !== 'dateModified') {
      return null;
    }

    const groups: Record<string, User[]> = {};
    processedClients.forEach((client) => {
      const group = getDateGroup(client.createdAt);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(client);
    });

    // Define order for groups
    const groupOrder = ['Today', 'Yesterday', 'This week', 'This month', 'Earlier this year'];
    const orderedGroups: Array<{ title: string; clients: User[] }> = [];

    // Add groups in specified order
    groupOrder.forEach((groupTitle) => {
      if (groups[groupTitle] && groups[groupTitle].length > 0) {
        orderedGroups.push({ title: groupTitle, clients: groups[groupTitle] });
      }
    });

    return orderedGroups;
  }, [processedClients, sortOption]);

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
          <h1 className="text-3xl font-semibold text-brand-body mb-2">Client Management</h1>
          <p className="text-brand-body">
            Manage your client companies and their information
          </p>
        </div>

        {/* Action Button */}
        <div className="mb-8">
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-6 py-3 h-auto shadow-lg hover:shadow-xl" 
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
              <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <SelectTrigger className="w-[180px] h-14 border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-gray-600" />
                    <SelectValue placeholder="Sort by" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="dateModified">Sort by Date Modified</SelectItem>
                </SelectContent>
              </Select>
              <div className="bg-gray-50 rounded-xl px-6 py-3">
                <span className="text-gray-700 font-semibold text-lg">
                  {processedClients.length} of {clients.length} clients
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        {sortOption === 'dateModified' && groupedClients ? (
          <div className="space-y-8">
            {groupedClients.map((group) => (
              <div key={group.title} className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  <h2 className="text-xl font-semibold text-gray-800">{group.title}</h2>
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-sm text-gray-500 font-medium">{group.clients.length} {group.clients.length === 1 ? 'client' : 'clients'}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {group.clients.map((client) => {
                    const activeEngagements = engagements.filter(eng => eng.clientId === client.id && eng.status === 'active').length;
                    const totalEngagements = engagements.filter(eng => eng.clientId === client.id).length;
                    
                    return (
                      <div key={client.id} className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 h-full flex flex-col">
                        <div className="flex flex-col h-full justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-primary-foreground" />
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
                              variant="outline" 
                              className="rounded-xl px-4 py-2 text-sm font-semibold mt-2"
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
                          
                          <div className="flex gap-2 items-center mt-auto">
                          <Button 
                              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto" 
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
                            {client.companyId && (
                              <Button 
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto" 
                                size="sm" 
                                variant="default" 
                                asChild
                              >
                                <Link 
                                  to={`/employee/clients/${client.id}/company/${client.companyId}`}
                                >
                                  <Briefcase className="h-4 w-4 mr-2" />
                                  View Company
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {processedClients.map((client) => {
              const activeEngagements = engagements.filter(eng => eng.clientId === client.id && eng.status === 'active').length;
              const totalEngagements = engagements.filter(eng => eng.clientId === client.id).length;
              
              return (
                <div key={client.id} className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 h-full flex flex-col">
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary-foreground" />
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
                        variant="outline" 
                        className="rounded-xl px-4 py-2 text-sm font-semibold"
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
                    
                    <div className="flex gap-2 items-center mt-auto">
                    <Button 
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto" 
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
                      {client.companyId && (
                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl rounded-xl py-3 h-auto" 
                          size="sm" 
                          variant="default" 
                          asChild
                        >
                          <Link 
                            to={`/employee/clients/${client.id}/company/${client.companyId}`}
                          >
                            <Briefcase className="h-4 w-4 mr-2" />
                            View Company
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {processedClients.length === 0 && (
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-lg hover:shadow-xl rounded-xl px-8 py-3" 
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
