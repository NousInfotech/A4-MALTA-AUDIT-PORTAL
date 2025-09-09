// @ts-nocheck
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { engagementApi, documentRequestApi } from '@/services/api';
import { Briefcase, FileText, Clock, CheckCircle, Upload, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';

export const ClientDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientEngagements, setClientEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allRequests, setAllRequests] = useState([]);

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        // Fetch client-specific engagements
        const engagements = await engagementApi.getAll();
        // Filter engagements for current client (in real app, backend would filter)
        const clientFilteredEngagements = engagements.filter(eng => eng.clientId === user?.id);
        setClientEngagements(clientFilteredEngagements);

        // Fetch all document requests for client engagements
        const requestsPromises = clientFilteredEngagements.map(eng =>
          documentRequestApi.getByEngagement(eng._id).catch(() => [])
        );
        const requestsArrays = await Promise.all(requestsPromises);
        const flatRequests = requestsArrays.flat();
        setAllRequests(flatRequests);
      } catch (error) {
        console.error('Failed to fetch client data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchClientData();
    }
  }, [user, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 sm:h-[40vh]">
        <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
      </div>
    );
  }

  const pendingRequests = allRequests.filter(req => req.status === 'pending');
  const completedRequests = allRequests.filter(req => req.status === 'completed');

  const stats = [
    {
      title: 'Active Engagements',
      value: clientEngagements.filter(e => e.status === 'active').length.toString(),
      description: 'Ongoing audit projects',
      icon: Briefcase,
      trend: 'Current'
    },
    {
      title: 'Pending Requests',
      value: pendingRequests.length.toString(),
      description: 'Documents needed',
      icon: Clock,
      trend: 'Action required'
    },
    {
      title: 'Completed Requests',
      value: completedRequests.length.toString(),
      description: 'Documents submitted',
      icon: CheckCircle,
      trend: 'This month'
    },
    {
      title: 'Total Documents',
      value: completedRequests.reduce((acc, req) => acc + (req.documents?.length || 0), 0).toString(),
      description: 'Files uploaded',
      icon: FileText,
      trend: 'All time'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Client Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome! Track your audit engagements and document requests.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/client/engagements">
              <Eye className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">View Engagements</span>
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link to="/client/requests">
              <Upload className="h-4 w-4 mr-2 shrink-0" />
              <span className="truncate">Upload Documents</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <p className="text-xs text-accent mt-1">
                  {stat.trend}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Engagements */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate">Your Engagements</CardTitle>
                <CardDescription>Current audit projects</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link to="/client/engagements">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientEngagements.slice(0, 3).map((engagement) => (
                <div
                  key={engagement._id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-border rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{engagement.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <Badge
                      variant="outline"
                      className={
                        engagement.status === 'active'
                          ? 'text-success border-success'
                          : engagement.status === 'completed'
                          ? 'text-muted border-muted'
                          : 'text-warning border-warning'
                      }
                    >
                      {engagement.status}
                    </Badge>
                  </div>
                </div>
              ))}

              {clientEngagements.length === 0 && (
                <div className="text-center py-8">
                  <Briefcase className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No engagements yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate">Pending Requests</CardTitle>
                <CardDescription>Documents needed from you</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                <Link to="/client/requests">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.slice(0, 3).map((request) => (
                <div key={request._id} className="p-4 border border-border rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="w-fit">{request.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mb-3">{request.description}</p>
                  <Button size="sm" asChild className="w-full sm:w-auto">
                    <Link to={`/client/requests`}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Link>
                  </Button>
                </div>
              ))}

              {pendingRequests.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
                  <p className="text-muted-foreground">No pending requests</p>
                  <p className="text-xs text-muted-foreground">All document requests have been completed</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <div className="text-sm text-muted-foreground">User ID</div>
              <div className="font-medium text-foreground break-all">{user?.id || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Role</div>
              <div className="font-medium text-foreground">{user?.role || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="font-medium text-foreground break-all">{user?.email || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
