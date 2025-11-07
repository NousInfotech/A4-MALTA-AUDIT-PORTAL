import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, PlusCircle, TrendingUp } from 'lucide-react';
import { getOrganizationAnalytics } from '@/services/organizationService';
import { OrganizationCard } from '@/components/organization/OrganizationCard';
import { CreateOrganizationModal } from '@/components/organization/CreateOrganizationModal';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminDashboard() {
  const { user, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    loadAnalytics();
  }, [isSuperAdmin, navigate, toast]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const data = await getOrganizationAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load organization analytics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationCreated = () => {
    setIsCreateModalOpen(false);
    loadAnalytics();
    toast({
      title: 'Success',
      description: 'Organization created successfully',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const totalUsers = analytics?.organizations.reduce(
    (sum, org) => sum + (org.totalUsers || 0),
    0
  ) || 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage organizations and monitor system-wide analytics
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Create Organization
        </Button>
      </div>

      {/* Analytics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalOrganizations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active organizations in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.organizations.reduce((sum, org) => sum + org.employeeCount, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active employees
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.organizations.reduce((sum, org) => sum + org.clientCount, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            Manage all organizations and their administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.organizations && analytics.organizations.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {analytics.organizations.map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Organizations</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first organization
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Organization
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleOrganizationCreated}
      />
    </div>
  );
}

