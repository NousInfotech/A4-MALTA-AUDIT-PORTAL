"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Building2, TrendingUp, Shield } from "lucide-react";
import ConnectionCard from "./ConnectionCard";
import ConnectButton from "./ConnectButton";
import { SaltEdgeAccountDataModal } from "./SaltEdgeAccountDataModal";
import { useAuth } from "@/contexts/AuthContext";
import { fetchConnections } from "@/lib/api/saltedge";

export default function BankData() {
  const { user, isLoading: authLoading } = useAuth();

  const [connections, setConnections] = useState<any>([]);
  const [selectedConnection, setSelectedConnection] = useState<any | null>(
    null
  );

  const handleConnectionSelect = (currentAccount: any) => {
    setSelectedConnection(currentAccount);
  };

  const handleCloseModal = () => {
    setSelectedConnection(null);
  };

  const listConnections = async (customerId: string) => {
    try {
      const connections = await fetchConnections(customerId);
      console.log("connections", connections);
      setConnections(connections);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    console.log(user);
    if (!authLoading && user?.bankconnectionid) {
      listConnections(user?.bankconnectionid);
    }
  }, [authLoading, user, user?.bankconnectionid]);

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
                Total Connections
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Building2 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              {totalConnections}
            </div>
            <p className="text-sm text-slate-600 mb-3">Bank connections</p>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
              <p className="text-xs font-semibold text-slate-700">
                All connections
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
                Security Status
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              PCI DSS
            </div>
            <p className="text-sm text-slate-600 mb-3">Compliant</p>
            <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl border border-purple-100/50">
              <p className="text-xs font-semibold text-slate-700">
                Bank-level security
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connect Button Section */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-blue-100/50">
          <CardTitle className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            Bank Account Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <ConnectButton />
        </CardContent>
      </Card>

      {/* Connections Grid */}
      {connections.length > 0 && (
        <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-b border-blue-100/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                Connected Banks
              </CardTitle>
              <Badge className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200 rounded-xl px-4 py-2 text-sm font-semibold">
                {activeConnections} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections.map((connection: any) => (
                <ConnectionCard
                  key={connection?.id}
                  connection={connection}
                  onSelect={handleConnectionSelect}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedConnection && (
        <SaltEdgeAccountDataModal
          connectionId={selectedConnection?.id}
          isOpen={!!selectedConnection}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
