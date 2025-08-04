import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { Building2, Briefcase, FileText, TrendingUp, Plus } from 'lucide-react';

export const EmployeeDashboard = () => {
  const { clients, engagements, getEngagementRequests } = useData();

  const stats = [
    {
      title: 'Total Clients',
      value: clients.length.toString(),
      description: 'Active client companies',
      icon: Building2,
      trend: '+2 this month'
    },
    {
      title: 'Active Engagements',
      value: engagements.filter(e => e.status === 'active').length.toString(),
      description: 'Ongoing audits',
      icon: Briefcase,
      trend: '+1 this week'
    },
    {
      title: 'Pending Requests',
      value: engagements.reduce((acc, eng) => {
        return acc + getEngagementRequests(eng.id).filter(req => req.status === 'pending').length;
      }, 0).toString(),
      description: 'Document requests',
      icon: FileText,
      trend: '5 new today'
    },
    {
      title: 'Completed Procedures',
      value: '8',
      description: 'This month',
      icon: TrendingUp,
      trend: '+3 from last month'
    }
  ];

  const recentEngagements = engagements.slice(0, 3);
  const recentClients = clients.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Employee Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage your audit engagements and client relationships
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link to="/employee/clients/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/employee/engagements/new">
              <Plus className="h-4 w-4 mr-2" />
              New Engagement
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
                <p className="text-xs text-success mt-1">
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
                <CardTitle>Recent Engagements</CardTitle>
                <CardDescription>Your latest audit projects</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/employee/engagements">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentEngagements.map((engagement) => {
                const client = clients.find(c => c.id === engagement.clientId);
                return (
                  <div key={engagement.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{engagement.title}</p>
                      <p className="text-sm text-muted-foreground">{client?.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        engagement.status === 'active' ? 'bg-success/10 text-success' :
                        engagement.status === 'completed' ? 'bg-muted text-muted-foreground' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {engagement.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Clients</CardTitle>
                <CardDescription>Your latest client additions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/employee/clients">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{client.companyName}</p>
                      <p className="text-sm text-muted-foreground">{client.industry}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/employee/clients/${client.id}`}>
                      View
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};