'use client'; 

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Building2, TrendingUp, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { getServicesbyUserId } from '@/lib/api/apideck';
import { ApideckConnectionList } from './ApideckConnectionList';
import { ApideckDataDisplay } from './ApideckDataDisplay';
import { useAuth } from '@/contexts/AuthContext';

export default function ApideckHomePage() {
  const [connections, setConnections] = useState<any>([]);
  const [services, setServices] = useState<any>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<
    string | null
  >(null);
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      try {
        if (!user) return;

        const response = await getServicesbyUserId(user.id);
        console.log(response);
        console.log('services', response.getConsumerResponse.data.services);
        console.log(
          'connections',
          response.getConsumerResponse.data.connections
        );
        setServices(response.getConsumerResponse.data.services);
        setConnections(response.getConsumerResponse.data.connections);
      } catch (error) {
        console.log(error);
        toast.error('Something went wrong, while fetching services');
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading && user) {
      fetchServices();
    }
  }, [authLoading, user]);

  const handleConnectionClick = (connectionId: string) => {
    setSelectedConnectionId(connectionId);
  };

  const connectionsWithHandlers = connections.map((conn: any) => ({
    connection: conn, // Wrap the connection object
    onClick: handleConnectionClick,
    isActive: conn.serviceId === selectedConnectionId
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const activeConnections = connections.filter((conn: any) => conn.status === 'active').length;
  const totalConnections = connections.length;

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Services
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {services.length}
            </div>
            <p className="text-sm text-slate-600 mb-3">Available services</p>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
              <p className="text-xs font-semibold text-slate-700">
                API integrations
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Active Connections
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {activeConnections}
            </div>
            <p className="text-sm text-slate-600 mb-3">Currently active</p>
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100/50">
              <p className="text-xs font-semibold text-slate-700">
                Live connections
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                API Status
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              Unified
            </div>
            <p className="text-sm text-slate-600 mb-3">API platform</p>
            <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl border border-purple-100/50">
              <p className="text-xs font-semibold text-slate-700">
                Enterprise ready
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection List Section */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-blue-100/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              API Connections
            </CardTitle>
            <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200 rounded-xl px-4 py-2 text-sm font-semibold">
              {activeConnections} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-8">
        <ApideckConnectionList connections={connectionsWithHandlers} />
        </CardContent>
      </Card>

      {/* Data Display Section */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-blue-100/50">
          <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            Data Display
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
        <ApideckDataDisplay connectionId={selectedConnectionId} />
        </CardContent>
      </Card>
    </div>
  );
}
