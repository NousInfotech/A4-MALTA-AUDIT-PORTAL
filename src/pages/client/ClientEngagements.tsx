import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Calendar, FileText, Clock } from 'lucide-react';

export const ClientEngagements = () => {
  const { user } = useAuth();
  const { engagements, getEngagementRequests } = useData();

  // Filter engagements for current client
  const clientEngagements = engagements.filter(eng => {
    // In a real app, this would be based on the client's ID relationship
    return user?.companyName; // For demo purposes, show all engagements
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success border-success';
      case 'completed':
        return 'text-muted border-muted';
      case 'draft':
        return 'text-warning border-warning';
      default:
        return 'text-secondary border-secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Engagements</h1>
        <p className="text-muted-foreground mt-2">
          View all your audit engagements and their current status
        </p>
      </div>

      {/* Engagements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {clientEngagements.map((engagement) => {
          const requests = getEngagementRequests(engagement.id);
          const pendingRequests = requests.filter(r => r.status === 'pending').length;
          const completedRequests = requests.filter(r => r.status === 'completed').length;
          
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
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(engagement.createdAt).toLocaleDateString()}
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
                    <div className="text-muted-foreground">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-warning">{pendingRequests}</div>
                    <div className="text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-success">{completedRequests}</div>
                    <div className="text-muted-foreground">Completed</div>
                  </div>
                </div>
                
                {engagement.trialBalanceUrl && (
                  <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Trial Balance: Uploaded</span>
                  </div>
                )}
                
                {pendingRequests > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-warning/10 rounded-lg">
                    <Clock className="h-4 w-4 text-warning" />
                    <span className="text-sm text-warning">
                      {pendingRequests} document request{pendingRequests === 1 ? '' : 's'} pending
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {clientEngagements.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No engagements yet
            </h3>
            <p className="text-muted-foreground">
              Your audit engagements will appear here once they are created by your auditor.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};