// @ts-nocheck
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { engagementApi, documentRequestApi } from '@/services/api';
import { Briefcase, Calendar, FileText, Clock, Loader2, User, ArrowLeft } from 'lucide-react';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import PbcDialog from '@/components/pbc/PbcDialog';

export const ClientEngagements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [clientEngagements, setClientEngagements] = useState([]);
  const [engagementRequests, setEngagementRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedEngagement, setSelectedEngagement] = useState<any>(null);
  const [isPBCModalOpen, setIsPBCModalOpen] = useState<boolean>(false);

  // Get the active tab from URL parameters
  const activeTab = searchParams.get('tab') || 'all';

  // Filter engagements based on active tab
  const filteredEngagements = clientEngagements.filter(engagement => {
    switch (activeTab) {
      case 'active':
        return engagement.status === 'active';
      case 'completed':
        return engagement.status === 'completed';
      case 'all':
      default:
        return true;
    }
  });

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
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2 animate-fade-in">My Engagements</h1>
              <p className="text-gray-700 animate-fade-in-delay">View all your audit engagements and their current status</p>
            </div>
            <Button
              asChild
              variant="outline"
              className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-xl"
            >
              <Link to="/client">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

      {/* Engagements Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredEngagements.map((engagement) => {
          const requests = engagementRequests[engagement._id] || [];
          const pendingRequests = requests.filter(r => r.status === 'pending').length;
          const completedRequests = requests.filter(r => r.status === 'completed').length;
          
          return (
            <div key={engagement._id} className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {engagement.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Created: {new Date(engagement.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-3">
                  <Badge variant="outline" className={
                    engagement.status === 'active' ? 'bg-gray-800 text-white border-gray-800' :
                    engagement.status === 'completed' ? 'bg-gray-700 text-white border-gray-700' :
                    'bg-gray-600 text-white border-gray-600'
                  }>
                    {engagement.status}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="font-bold text-gray-900 text-lg">{requests.length}</div>
                    <div className="text-gray-600 text-xs">Total Requests</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="font-bold text-gray-900 text-lg">{pendingRequests}</div>
                    <div className="text-gray-600 text-xs">Pending</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="font-bold text-gray-900 text-lg">{completedRequests}</div>
                    <div className="text-gray-600 text-xs">Completed</div>
                  </div>
                </div>
                
                {engagement.trialBalanceUrl ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <FileText className="h-4 w-4 text-gray-800" />
                    <span className="text-sm text-gray-700 font-medium">Trial Balance: Uploaded</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <FileText className="h-4 w-4 text-gray-800" />
                    <span className="text-sm text-gray-700 font-medium">Trial Balance: Not Uploaded</span>
                  </div>
                )}

                <div>
                  <button onClick={() => handleOpenPBC(engagement)} className='px-4 py-2 bg-gray-800 hover:bg-gray-900 rounded-xl w-full text-white transition-all duration-300'>PBC WorkFlow</button>
                </div>
                
                {pendingRequests > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <Clock className="h-4 w-4 text-gray-800" />
                    <span className="text-sm text-gray-700 font-medium">
                      {pendingRequests} document request{pendingRequests === 1 ? '' : 's'} pending
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredEngagements.length === 0 && (
        <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
          <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Briefcase className="h-10 w-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            {activeTab === 'active' ? 'No Active Engagements' : 
             activeTab === 'completed' ? 'No Completed Engagements' : 
             'No Engagements Yet'}
          </h3>
          <p className="text-gray-600">
            {activeTab === 'active' ? 'You have no active audit engagements at the moment.' :
             activeTab === 'completed' ? 'You have no completed audit engagements yet.' :
             'Your audit engagements will appear here once they are created by your auditor.'}
          </p>
        </div>
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
    </div>
  );
};
