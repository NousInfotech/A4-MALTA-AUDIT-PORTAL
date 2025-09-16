// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { engagementApi, documentRequestApi } from '@/services/api';
import { Briefcase, Calendar, FileText, Clock, Loader2, User, ArrowLeft } from 'lucide-react';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PbcDialog from '@/components/pbc/PbcDialog';

export const ClientEngagements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientEngagements, setClientEngagements] = useState([]);
  const [engagementRequests, setEngagementRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedEngagement, setSelectedEngagement] = useState<any>(null);
  const [isPBCModalOpen, setIsPBCModalOpen] = useState<boolean>(false);


  const handleOpenPBC = (engagement) => {
    setSelectedEngagement(engagement)
    setIsPBCModalOpen(true)
  }

  const handleClosePBC = () => {
    setIsPBCModalOpen(false)
  }

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        // Fetch all engagements and filter for current client
        const allEngagements = await engagementApi.getAll();
        const clientFilteredEngagements = allEngagements.filter(eng => eng.clientId === user?.id);
        setClientEngagements(clientFilteredEngagements);
        
        // Fetch document requests for each engagement
        const requestsData = {};
        for (const engagement of clientFilteredEngagements) {
          try {
            const requests = await documentRequestApi.getByEngagement(engagement._id);
            requestsData[engagement._id] = requests;
          } catch (error) {
            requestsData[engagement._id] = [];
          }
        }
        setEngagementRequests(requestsData);
      } catch (error) {
        console.error('Failed to fetch client data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch engagements",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 border-green-600 bg-green-50';
      case 'completed':
        return 'text-slate-600 border-slate-600 bg-slate-50';
      case 'draft':
        return 'text-yellow-600 border-yellow-600 bg-yellow-50';
      default:
        return 'text-slate-600 border-slate-600 bg-slate-50';
    }
  };

  if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
        </div>
      )
    }

    console.log("clientEngagements", clientEngagements)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <Briefcase className="h-6 w-6 text-white" />
                </div>
                <div>
                                      <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent leading-tight">
                      My Engagements
                    </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    View all your audit engagements and their current status
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                variant="outline"
                className="border-green-200 hover:bg-green-50/50 text-green-700 hover:text-green-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
              >
                <Link to="/client">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Engagements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {clientEngagements.map((engagement) => {
          const requests = engagementRequests[engagement._id] || [];
          const pendingRequests = requests.filter(r => r.status === 'pending').length;
          const completedRequests = requests.filter(r => r.status === 'completed').length;
          
          return (
            <Card key={engagement._id} className="group bg-white/80 backdrop-blur-sm border border-green-100/50 hover:border-green-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                      <Briefcase className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-bold text-slate-800 truncate group-hover:text-green-700 transition-colors duration-300">
                        {engagement.title}
                      </CardTitle>
                      <p className="text-sm text-slate-600">
                        Created: {new Date(engagement.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getStatusColor(engagement.status)}>
                    {engagement.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="relative space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="h-4 w-4" />
                  <span>Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-100/50">
                    <div className="font-bold text-slate-800 text-lg">{requests.length}</div>
                    <div className="text-slate-600 text-xs">Total Requests</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-100/50">
                    <div className="font-bold text-yellow-700 text-lg">{pendingRequests}</div>
                    <div className="text-slate-600 text-xs">Pending</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100/50">
                    <div className="font-bold text-green-700 text-lg">{completedRequests}</div>
                    <div className="text-slate-600 text-xs">Completed</div>
                  </div>
                </div>
                
                {engagement.trialBalanceUrl ? (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">Trial Balance: Uploaded</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-700 font-medium">Trial Balance: Not Uploaded</span>
                  </div>
                )}

                <div>
                  <button onClick={() => handleOpenPBC(engagement)} className='px-4 py-2 bg-gradient-to-br from-indigo-500 via-violet-500 to-blue-500 hover:brightness-105 rounded-full w-full text-white'>PBC WorkFlow</button>
                </div>
                
                {pendingRequests > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-100/50">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-700 font-medium">
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
        <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardContent className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Briefcase className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">
              No engagements yet
            </h3>
            <p className="text-slate-600">
              Your audit engagements will appear here once they are created by your auditor.
            </p>
          </CardContent>
        </Card>
      )}


      {isPBCModalOpen && (
        <PbcDialog
          selectedEngagement={selectedEngagement}
          open={isPBCModalOpen}
          onOpenChange={setIsPBCModalOpen}
          onClosePBC={handleClosePBC}
        />
      )}
    </div>
  );
};
