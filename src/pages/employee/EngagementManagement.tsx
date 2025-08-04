import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { Briefcase, Plus, Search, Calendar, Building2, FileText, Eye } from 'lucide-react';

export const EngagementManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { engagements, clients, getEngagementRequests, getEngagementProcedures } = useData();

  const filteredEngagements = engagements.filter(engagement => {
    const client = clients.find(c => c.id === engagement.clientId);
    return (
      engagement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client?.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success';
      case 'completed':
        return 'bg-muted text-muted-foreground border-muted-foreground';
      case 'draft':
        return 'bg-warning/10 text-warning border-warning';
      default:
        return 'bg-secondary text-secondary-foreground border-secondary-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Engagement Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage your audit engagements and track progress
          </p>
        </div>
        <Button asChild>
          <Link to="/employee/engagements/new">
            <Plus className="h-4 w-4 mr-2" />
            New Engagement
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Engagements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by engagement title or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredEngagements.length} of {engagements.length} engagements
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEngagements.map((engagement) => {
          const client = clients.find(c => c.id === engagement.clientId);
          const requests = getEngagementRequests(engagement.id);
          const procedures = getEngagementProcedures(engagement.id);
          const pendingRequests = requests.filter(r => r.status === 'pending').length;
          
          return (
            <Card key={engagement.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Briefcase className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{engagement.title}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {client?.companyName}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(engagement.status)}>
                    {engagement.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-foreground">{requests.length}</div>
                    <div className="text-muted-foreground">Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-warning">{pendingRequests}</div>
                    <div className="text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-foreground">{procedures.length}</div>
                    <div className="text-muted-foreground">Procedures</div>
                  </div>
                </div>
                
                {engagement.trialBalanceUrl && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Trial Balance: Uploaded</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" className="flex-1" asChild>
                    <Link to={`/employee/engagements/${engagement.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/employee/engagements/${engagement.id}/requests`}>
                      Requests
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredEngagements.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? 'No engagements found' : 'No engagements yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm 
                ? 'Try adjusting your search terms'
                : 'Start by creating your first audit engagement'
              }
            </p>
            {!searchTerm && (
              <Button asChild>
                <Link to="/employee/engagements/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Engagement
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};