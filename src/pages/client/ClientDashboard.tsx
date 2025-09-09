// @ts-nocheck
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { engagementApi, documentRequestApi } from '@/services/api';
import { Briefcase, FileText, Clock, CheckCircle, Upload, Eye, User, Calendar, ArrowRight, BarChart3 } from 'lucide-react';
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
      <div className="flex items-center justify-center h-64">
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
      trend: 'Current',
      color: "from-green-500 to-emerald-600",
      bgColor: "from-green-50 to-emerald-50"
    },
    {
      title: 'Pending Requests',
      value: pendingRequests.length.toString(),
      description: 'Documents needed',
      icon: Clock,
      trend: 'Action required',
      color: "from-yellow-500 to-amber-600",
      bgColor: "from-yellow-50 to-amber-50"
    },
    {
      title: 'Completed Requests',
      value: completedRequests.length.toString(),
      description: 'Documents submitted',
      icon: CheckCircle,
      trend: 'This month',
      color: "from-blue-500 to-indigo-600",
      bgColor: "from-blue-50 to-indigo-50"
    },
    {
      title: 'Total Documents',
      value: completedRequests.reduce((acc, req) => acc + (req.documents?.length || 0), 0).toString(),
      description: 'Files uploaded',
      icon: FileText,
      trend: 'All time',
      color: "from-purple-500 to-pink-600",
      bgColor: "from-purple-50 to-pink-50"
    }
  ];

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
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                                      <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent leading-tight">
                      Client Dashboard
                    </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Welcome! Track your audit engagements and document requests.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto" 
                asChild
              >
                <Link to="/client/requests">
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Documents
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-green-200 hover:bg-green-50/50 text-green-700 hover:text-green-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
              >
                <Link to="/client/engagements">
                  <Eye className="h-5 w-5 mr-2" />
                  View Engagements
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="group bg-white/80 backdrop-blur-sm border border-green-100/50 hover:border-green-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <CardHeader className="relative pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-10 h-10 bg-gradient-to-br ${stat.color} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-slate-800 mb-2">
                  {stat.value}
                </div>
                <p className="text-sm text-slate-600 mb-3">
                  {stat.description}
                </p>
                <div className={`p-3 bg-gradient-to-r ${stat.bgColor} rounded-2xl border border-green-100/50`}>
                  <p className="text-xs font-semibold text-slate-700">{stat.trend}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Engagements */}
        <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">Your Engagements</CardTitle>
                  <CardDescription className="text-slate-600">Current audit projects</CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                asChild 
                className="border-green-200 hover:bg-green-50/50 text-green-700 hover:text-green-800 rounded-2xl"
              >
                <Link to="/client/engagements">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {clientEngagements.slice(0, 3).map((engagement) => (
                <div
                  key={engagement._id}
                  className="group flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-gradient-to-r from-slate-50 to-green-50/30 border border-green-100/50 rounded-2xl hover:border-green-300/50 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate group-hover:text-green-700 transition-colors duration-300">
                      {engagement.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <p className="text-xs text-slate-500">
                        Year End: {new Date(engagement.yearEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <Badge
                      variant="outline"
                      className={
                        engagement.status === 'active'
                          ? 'text-green-600 border-green-600 bg-green-50'
                          : engagement.status === 'completed'
                          ? 'text-slate-600 border-slate-600 bg-slate-50'
                          : 'text-yellow-600 border-yellow-600 bg-yellow-50'
                      }
                    >
                      {engagement.status}
                    </Badge>
                  </div>
                </div>
              ))}

              {clientEngagements.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-slate-600 font-medium">
                    No engagements yet. Your audit engagements will appear here once they are created by your auditor.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-yellow-100/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-800">Pending Requests</CardTitle>
                  <CardDescription className="text-slate-600">Documents needed from you</CardDescription>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                asChild 
                className="border-yellow-200 hover:bg-yellow-50/50 text-yellow-700 hover:text-yellow-800 rounded-2xl"
              >
                <Link to="/client/requests">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {pendingRequests.slice(0, 3).map((request) => (
                <div key={request._id} className="p-4 bg-gradient-to-r from-slate-50 to-yellow-50/30 border border-yellow-100/50 rounded-2xl hover:border-yellow-300/50 transition-all duration-300 hover:shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <Badge variant="secondary" className="w-fit bg-yellow-100 text-yellow-700 border-yellow-200">
                      {request.category}
                    </Badge>
                    <span className="text-xs text-slate-500">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{request.description}</p>
                  <Button size="sm" asChild className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white border-0 rounded-xl">
                    <Link to={`/client/requests`}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Documents
                    </Link>
                  </Button>
                </div>
              ))}

              {pendingRequests.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-slate-600 font-medium">
                    No pending requests. All document requests have been completed.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Information */}
      <Card className="bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-100/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-slate-800">User Information</CardTitle>
              <CardDescription className="text-slate-600">Your account details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-100/50">
              <div className="text-sm text-slate-600 mb-2">User ID</div>
              <div className="font-medium text-slate-800 break-all text-sm">{user?.id || 'N/A'}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-100/50">
              <div className="text-sm text-slate-600 mb-2">Role</div>
              <div className="font-medium text-slate-800">{user?.role || 'N/A'}</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl border border-slate-100/50">
              <div className="text-sm text-slate-600 mb-2">Email</div>
              <div className="font-medium text-slate-800 break-all text-sm">{user?.email || 'N/A'}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
