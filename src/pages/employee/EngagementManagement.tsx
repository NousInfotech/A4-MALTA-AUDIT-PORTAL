import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEngagements } from '@/hooks/useEngagements';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Briefcase, Plus, Search, Calendar, Building2, FileText, Eye, Loader2 } from 'lucide-react';

export const EngagementManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'draft'|'active'|'completed'>('active');
  const { engagements, loading } = useEngagements();
  const { toast } = useToast();

  interface User {
    summary: string;
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'employee' | 'client';
    status: string;
    createdAt: string;
    companyName?: string;
    companyNumber?: string;
    industry?: string;
  }

  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [clients, setClients] = useState<User[]>([]);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `user_id, name, role, status, created_at, updated_at, company_name, company_number, industry, company_summary`
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformed = data.map(profile => ({
        id: profile.user_id,
        name: profile.name || 'Unknown User',
        email: userData?.user?.email || '',
        role: profile.role,
        status: profile.status,
        createdAt: profile.created_at,
        companyName: profile.company_name || undefined,
        companyNumber: profile.company_number || undefined,
        industry: profile.industry || undefined,
        summary: profile.company_summary || undefined,
      }));

      setClients(transformed.filter(c => c.role === 'client'));
    } catch (err) {
      toast({
        title: 'Error',
        description: `Failed to fetch clients: ${err.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Filter and sort engagements
  const filtered = engagements
    .filter(e => e.status === statusFilter)
    .filter(e => {
      const client = clients.find(c => c.id === e.clientId);
      return (
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success';
      case 'completed': return 'bg-muted text-muted-foreground border-muted-foreground';
      case 'draft': return 'bg-warning/10 text-warning border-warning';
      default: return 'bg-secondary text-secondary-foreground border-secondary-foreground';
    }
  };

  if (loading || isLoadingClients) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Engagement Management</h1>
          <p className="text-muted-foreground mt-2">Manage your audit engagements and track progress</p>
        </div>
        <Button asChild className="border-sidebar-foreground" variant='outline'>
          <Link to="/employee/engagements/new">
            <Plus className="h-4 w-4 mr-2" />New Engagement
          </Link>
        </Button>
      </div>

      {/* Search Card */}
      <Card className='flex'>
        <div className='w-full'>
          
        <CardHeader>
          <CardTitle>Search Engagements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by engagement title or client company."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
            <div className=" p-4 flex items-center text-sm text-muted-foreground">
              {filtered.length} of {engagements.length} engagements
            </div>
        </CardContent>
        </div>
        <div className='w-full'>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Select which engagements to view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            {['draft', 'active', 'completed'].map(status => (
              <Button
              className="border-sidebar-foreground"
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status as any)}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
        </div>
      </Card>

      {/* Engagements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map(engagement => {
          const client = clients.find(c => c.id === engagement.clientId);
          return (
            <Card key={engagement._id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
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
              {searchTerm ? 'No engagements found' : 'No engagements yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms' : 'Start by creating your first audit engagement'}
            </p>
            {!searchTerm && (
              <Button asChild>
                <Link to="/employee/engagements/new">
                  <Plus className="h-4 w-4 mr-2" />Create Your First Engagement
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
