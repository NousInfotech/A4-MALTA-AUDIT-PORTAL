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
import { ArrowLeft, Calendar, FileText, Eye, Building2, Briefcase, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEngagements } from '@/hooks/useEngagements';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'active': return 'bg-success/10 text-success border-success';
    case 'completed': return 'bg-muted text-muted-foreground border-muted-foreground';
    case 'draft': return 'bg-warning/10 text-warning border-warning';
    default: return 'bg-secondary text-secondary-foreground border-secondary-foreground';
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

      setClient({
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
      });
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
    <div className="max-w-4xl mx-auto p-4 sm:p-8 bg-gray-50 min-h-screen space-y-8">
      {/* Back Navigation */}
      <Link
        to="/employee/clients"
        className="inline-flex items-center text-gray-600 hover:text-gray-900 transition"
      >
        <ArrowLeft className="h-5 w-5 mr-2" /> Back to Clients
      </Link>

      {/* Header Section */}
      <div className="bg-white shadow-lg rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 truncate">
            {client.companyName}
          </h1>
          <p className="text-sm text-gray-500">{client.companyNumber}</p>
        </div>
      </div>

      {/* Details Card */}
      <Card className="shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Left Column */}
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Contact</p>
              <p className="text-lg font-medium text-gray-800">{client.name}</p>
              {client.email && (
                <p className="text-sm text-gray-500 break-all">{client.email}</p>
              )}
            </div>

            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Role</p>
              <Badge variant="outline" className="uppercase">{client.role}</Badge>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Status</p>
              <Badge
                variant="outline"
                className={`uppercase
                  ${client.status === 'approved' ? 'border-green-500 text-green-600' : ''}
                  ${client.status === 'pending' ? 'border-yellow-500 text-yellow-600' : ''}
                  ${client.status === 'rejected' ? 'border-red-500 text-red-600' : ''}
                `}
              >
                {client.status}
              </Badge>
            </div>
          </div>

          {/* Right Column */}
          <div className="p-6 space-y-6">
            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Industry</p>
              <Badge variant="outline" className="uppercase">
                {client.industry || 'N/A'}
              </Badge>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Summary</p>
              <p className="text-sm text-gray-700">
                {client.summary || 'No summary available.'}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase text-gray-400 mb-1">Added On</p>
              <p className="text-sm font-medium text-gray-800">
                {new Date(client.createdAt).toLocaleDateString()}
              </p>
            </div>

            {client.updatedAt && (
              <div>
                <p className="text-xs uppercase text-gray-400 mb-1">Last Updated</p>
                <p className="text-sm font-medium text-gray-800">
                  {new Date(client.updatedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Engagements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map(engagement => {
          return (
            <Card key={engagement._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{engagement.title}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4" />{client?.companyName || 'Unknown Client'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusStyle(engagement.status)}>
                    {engagement.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Trial Balance: {engagement.trialBalanceUrl ? 'Uploaded' : 'Not Uploaded'}
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button variant='outline' size="sm" className="flex-1 border-sidebar-foreground" asChild>
                    <Link to={`/employee/engagements/${engagement._id}`}>
                      <Eye className="h-4 w-4 mr-2" />View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No engagements yet for {client.companyName}
            </h3>
            <p className="text-muted-foreground">
              This client has no engagements at the moment.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
