import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, FileText, Clock, CheckCircle, Upload, Eye } from 'lucide-react';

export const ClientDashboard = () => {
  const { user } = useAuth();
  const { engagements, getEngagementRequests } = useData();

  // Filter engagements for current client
  const clientEngagements = engagements.filter(eng => {
    // In a real app, this would be based on the client's ID relationship
    return user?.companyName; // For demo purposes, show all engagements
  });

  const allRequests = clientEngagements.flatMap(eng => getEngagementRequests(eng.id));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome, {user?.companyName}! Track your audit engagements and document requests.
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link to="/client/engagements">
              <Eye className="h-4 w-4 mr-2" />
              View Engagements
            </Link>
          </Button>
          <Button asChild>
            <Link to="/client/requests">
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Engagements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Engagements</CardTitle>
                <CardDescription>Current audit projects</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/client/engagements">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientEngagements.slice(0, 3).map((engagement) => (
                <div key={engagement.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{engagement.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={
                      engagement.status === 'active' ? 'text-success border-success' :
                      engagement.status === 'completed' ? 'text-muted border-muted' :
                      'text-warning border-warning'
                    }>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Requests</CardTitle>
                <CardDescription>Documents needed from you</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/client/requests">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.slice(0, 3).map((request) => (
                <div key={request.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{request.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mb-2">{request.description}</p>
                  <Button size="sm" asChild>
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

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Your registered company details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-muted-foreground">Company Name</div>
              <div className="font-medium text-foreground">{user?.companyName || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Registration Number</div>
              <div className="font-medium text-foreground">{user?.companyNumber || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Industry</div>
              <div className="font-medium text-foreground">{user?.industry || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};