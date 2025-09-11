// @ts-nocheck
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, FileText, Eye, Building2, Briefcase, Loader2, Users, Mail, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEngagements } from '@/hooks/useEngagements';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';
import { useActivityLogger } from '@/hooks/useActivityLogger';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'active': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200';
    case 'completed': return 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200';
    case 'draft': return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200';
    default: return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200';
  }
};

interface User {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'employee' | 'client';
  status: string;
  createdAt: string;
  updatedAt?: string;
  companyName?: string;
  companyNumber?: string;
  industry?: string;
  summary?: string;
}

export const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [client, setClient] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { engagements } = useEngagements();
  const { logViewClient } = useActivityLogger();

  useEffect(() => {
    if (id) fetchClient(id);
  }, [id]);

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

  const filtered = engagements.filter(e => e.clientId === id);

  const fetchClient = async (userId: string) => {
    try {
      setIsLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`user_id, name, role, status, created_at, updated_at, company_name, company_number, industry, company_summary`)
        .eq('user_id', userId)
        .single();
      if (profileError) throw profileError;

      let email = 'Email not available';
      try {
        email = await getClientEmail(userId);
      } catch (emailError) {
        console.warn('Could not fetch email:', emailError);
      }

      const clientData = {
        id: profileData.user_id,
        name: profileData.name,
        email,
        role: profileData.role,
        status: profileData.status,
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
        companyName: profileData.company_name,
        companyNumber: profileData.company_number,
        industry: profileData.industry,
        summary: profileData.company_summary,
      };
      
      setClient(clientData);
      
      // Log client view
      logViewClient(`Viewed client details for: ${clientData.companyName}`);
    } catch (err: any) {
      console.error('Error fetching client:', err);
      toast({
        title: 'Error',
        description: `Unable to load client: ${err.message}`,
        variant: 'destructive'
      });
      navigate('/employee/clients');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
        </div>
      )
    }

  if (!client) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Back Navigation */}
      <Link
        to="/employee/clients"
        className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors duration-300 group"
      >
        <div className="w-10 h-10 bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 mr-3">
          <ArrowLeft className="h-5 w-5" />
        </div>
        <span className="font-semibold text-lg">Back to Clients</span>
      </Link>

      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl">
                <Building2 className="h-10 w-10 text-white" />
              </div>
              <div className="space-y-2">
                                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                      {client.companyName}
                    </h1>
                <p className="text-lg text-slate-600 font-medium">{client.companyNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={`rounded-2xl px-6 py-3 text-sm font-semibold uppercase
                  ${client.status === 'approved' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200' : ''}
                  ${client.status === 'pending' ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border-yellow-200' : ''}
                  ${client.status === 'rejected' ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700 border-red-200' : ''}
                `}
              >
                {client.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Information */}
        <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50">
            <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-white" />
                        </div>
              <CardTitle className="text-xl font-bold text-slate-800">Contact Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Contact Person</p>
                  <p className="text-lg font-semibold text-slate-800">{client.name}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
                <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <Mail className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Email Address</p>
                  <p className="text-lg font-semibold text-slate-800 break-all">{client.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl">
                <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <img src="/logo.png" alt="Logo" className="h-10 w-10 object-cover rounded" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Role</p>
                  <Badge variant="outline" className="bg-white/80 text-purple-700 border-purple-200 rounded-xl px-4 py-1 text-sm font-semibold uppercase">
                    {client.role}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Information */}
        <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100/50">
            <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
              <CardTitle className="text-xl font-bold text-slate-800">Company Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
                <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Industry</p>
                  <Badge variant="outline" className="bg-white/80 text-indigo-700 border-indigo-200 rounded-xl px-4 py-1 text-sm font-semibold">
                    {client.industry || 'N/A'}
                  </Badge>
                </div>
              </div>
              
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
                <p className="text-sm text-slate-500 font-medium mb-2">Company Summary</p>
                <p className="text-slate-700 leading-relaxed">
                  {client.summary || 'No summary available for this company.'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Added On</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {client.updatedAt && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Last Updated</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {new Date(client.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagements Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Engagements</h2>
            <p className="text-slate-600">Active and completed audit engagements</p>
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map(engagement => {
              return (
                <Card key={engagement._id} className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="relative pb-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
                      <div className="flex items-center gap-4 w-full">
                        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                          <Briefcase className="h-7 w-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xl font-bold text-slate-800 truncate group-hover:text-green-700 transition-colors duration-300">
                            {engagement.title}
                          </CardTitle>
                          <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                            <Building2 className="h-4 w-4" />
                            {client?.companyName || 'Unknown Client'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`rounded-2xl px-4 py-2 text-sm font-semibold ${getStatusStyle(engagement.status)}`}>
                        {engagement.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="relative space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-slate-700 font-medium">
                        Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <span className="text-sm text-slate-700 font-medium">
                        Trial Balance: {engagement.trialBalanceUrl ? 'Uploaded' : 'Not Uploaded'}
                      </span>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl py-3 h-auto group-hover:scale-105" 
                      size="sm" 
                      variant="default" 
                      asChild
                    >
                      <Link to={`/employee/engagements/${engagement._id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Briefcase className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                No engagements yet for {client.companyName}
              </h3>
              <p className="text-slate-600 text-lg max-w-md mx-auto">
                This client has no engagements at the moment. Create a new engagement to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
