// @ts-nocheck
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { engagementApi, documentRequestApi } from '@/services/api';
import { Briefcase, FileText, Clock, CheckCircle, Upload, Eye, User, Calendar, ArrowRight, BarChart3, Zap, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EnhancedLoader } from '@/components/ui/enhanced-loader';
import { ClientComprehensiveNavigation } from '@/components/ui/client-comprehensive-navigation';
import { getEngagementStatusLabel, getPBCStatusLabel } from '@/lib/statusLabels';

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
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader size="lg" text="Loading..." />
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
      trend: 'Current',
      color: "text-gray-300"
    },
    {
      title: 'Pending Requests',
      value: pendingRequests.length.toString(),
      description: 'Documents needed',
      icon: Clock,
      trend: 'Action required',
      color: "text-gray-300"
    },
    {
      title: 'Completed Requests',
      value: completedRequests.length.toString(),
      description: 'Documents submitted',
      icon: CheckCircle,
      trend: 'This month',
      color: "text-gray-300"
    },
    {
      title: 'Total Documents',
      value: completedRequests.reduce((acc, req) => acc + (req.documents?.length || 0), 0).toString(),
      description: 'Files uploaded',
      icon: FileText,
      trend: 'All time',
      color: "text-gray-300"
    }
  ];

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">Welcome to Your Client Portal</h1>
          <p className="text-gray-700">Track your audit engagements and document requests.</p>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
                  <div key={stat.title} className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30">
                    <div className="flex items-center justify-between mb-4">
                      <Icon className="h-6 w-6 text-gray-800" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                      <p className="text-sm text-gray-700">{stat.title}</p>
                  </div>
                </div>
          );
        })}
      </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
                <div className="flex items-center justify-between mb-4">
                  <Upload className="h-6 w-6 text-gray-800" />
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-semibold text-gray-900">{pendingRequests.length}</p>
                  <p className="text-sm text-gray-700">Pending Document Requests</p>
                  <p className="text-sm font-medium text-gray-600">Action required</p>
                </div>
              </div>
              <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircle className="h-6 w-6 text-gray-800" />
                </div>
                <div className="space-y-2">
                  <p className="text-3xl font-semibold text-gray-900">{completedRequests.length}</p>
                  <p className="text-sm text-gray-700">Completed Requests</p>
                  <p className="text-sm font-medium text-gray-600">This month</p>
                </div>
              </div>
            </div>

            {/* Quick Navigation - Employee Dashboard Style */}
            <ClientComprehensiveNavigation />
      </div>

          {/* Right Sidebar */}
          <div className="space-y-6">

        {/* Recent Engagements */}
            <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Engagements</h3>
              <div className="space-y-3">
                {clientEngagements.slice(0, 3).map((engagement) => (
                  <div key={engagement._id} className="p-3 hover:bg-gray-100/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Briefcase className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium truncate">{engagement.title}</p>
                          <p className="text-gray-600 text-sm truncate">Audit Engagement</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                asChild 
                        className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-xl flex-shrink-0"
              >
                        <Link to={`/client/engagements`}>
                          <Eye className="h-3 w-3" />
                </Link>
              </Button>
            </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-500 text-xs">
                        Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                        </span>
                    </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        engagement.status === "active" ? "bg-gray-800 text-white" :
                        engagement.status === "completed" ? "bg-gray-700 text-white" :
                        "bg-gray-600 text-white"
                      }`}>
                      {getPBCStatusLabel(engagement.status) || getEngagementStatusLabel(engagement.status)}
                      </span>
                  </div>
                </div>
              ))}
              {clientEngagements.length === 0 && (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600">No engagements yet. Your audit engagements will appear here once they are created by your auditor.</p>
                </div>
              )}
            </div>
            </div>

        {/* Pending Requests */}
            <div className="bg-white/80 border border-white/50 rounded-2xl p-6 hover:bg-white/90 shadow-lg shadow-gray-300/30 animate-slide-in-right">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Requests</h3>
              <div className="space-y-3">
                {pendingRequests.slice(0, 3).map((request) => (
                  <div key={request._id} className="p-3 hover:bg-gray-100/50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Clock className="h-5 w-5 text-gray-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 font-medium truncate">{request.category}</p>
                          <p className="text-gray-600 text-sm truncate">{request.description}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                asChild 
                        className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-xl flex-shrink-0"
              >
                        <Link to={`/client/requests`}>
                          <Upload className="h-3 w-3" />
                </Link>
              </Button>
            </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-500 text-xs">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-white">
                        Pending
                      </span>
                    </div>
                </div>
              ))}
              {pendingRequests.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600">No pending requests. All document requests have been completed.</p>
                </div>
              )}
            </div>
      </div>

      {/* User Information */}
            <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Account Information</h3>
              <p className="text-gray-300 mb-4">
                Welcome to your client portal. Track your audit engagements and manage document requests.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">User ID:</span>
                  <span className="text-white text-sm font-mono">{user?.id?.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Role:</span>
                  <span className="text-white text-sm">{user?.role || 'Client'}</span>
            </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Email:</span>
                  <span className="text-white text-sm truncate">{user?.email || 'N/A'}</span>
            </div>
          </div>
            </div>
            </div>
            </div>
          </div>
    </div>
  );
};
