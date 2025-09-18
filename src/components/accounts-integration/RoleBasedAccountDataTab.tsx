import React, { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CreditCard, Shield, Zap, Eye, Lock } from "lucide-react";
import ApideckIntegrationCard from "../apideck/ApideckIntegrationCard";
import ApideckHomePage from "../apideck/ApideckHomePage";
import BankData from "../saltedge/BankData";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";

interface RoleBasedAccountDataTabProps {}

const RoleBasedAccountDataTab: React.FC<RoleBasedAccountDataTabProps> = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isClient = user?.role === 'client';
  const isEmployee = user?.role === 'employee';

  // Get the active tab from URL parameters
  const activeTab = searchParams.get('tab') || 'saltedge';

  // Example of how you might handle a successful integration
  const handleApideckSubmit = (integration: any) => {
    console.log("Apideck integration submitted successfully:", integration);
    // You'd typically update your application state here,
    // e.g., show a list of connected integrations.
    // Maybe trigger a re-fetch of user integrations.
  };

  return (
    <div className="min-h-screen bg-amber-50 p-6 space-y-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-xl">
              <FileText className="h-8 w-8 text-gray-800" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Accounts & Finance</h1>
              <p className="text-gray-700">
                {isClient 
                  ? "Connect and manage your financial data integrations" 
                  : "View connected financial data integrations (Read-only access)"
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-gray-100 text-gray-800 border-gray-300 rounded-xl px-4 py-2 text-sm font-semibold">
              <Shield className="h-4 w-4 mr-2" />
              {isClient ? "Full Access" : "Read-Only Access"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Integration Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="group bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-gray-300 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-gray-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Apideck Integration
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Zap className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-gray-800 mb-2">
              {isClient ? "API Ready" : "Connected"}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {isClient ? "Connect to multiple services" : "View connected services"}
            </p>
            <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-700">
                {isClient ? "Unified API platform" : "Read-only access to data"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-gray-300 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-500/5 to-gray-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">
                Salt Edge Banking
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-gray-800 mb-2">
              {isClient ? "Bank Level" : "Connected"}
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {isClient ? "Secure banking connections" : "View banking data"}
            </p>
            <div className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-700">
                {isClient ? "PCI DSS compliant" : "Read-only access to transactions"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Tabs */}
      <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-3xl shadow-xl overflow-hidden">
        <Tabs.Root value={activeTab} className="w-full">
          <Tabs.List className="flex border-b border-gray-200 bg-gradient-to-r from-gray-50/50 to-gray-100/50">
            <Tabs.Trigger
              className="flex-1 px-6 py-4 text-sm font-medium text-gray-600 hover:text-gray-800 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 data-[state=active]:text-gray-800 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border-b-2 data-[state=active]:border-gray-800 transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
              value="apideck"
            >
              <Zap className="h-4 w-4" />
              Apideck Integration
            </Tabs.Trigger>
            <Tabs.Trigger
              className="flex-1 px-6 py-4 text-sm font-medium text-gray-600 hover:text-gray-800 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-gray-500 data-[state=active]:text-gray-800 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border-b-2 data-[state=active]:border-gray-800 transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
              value="saltedge"
            >
              <CreditCard className="h-4 w-4" />
              Salt Edge Banking
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content
            className="p-8 focus:outline-none focus-visible:ring focus-visible:ring-gray-500"
            value="apideck"
          >
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Apideck Integration
                </h3>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                  {isClient 
                    ? "Connect to multiple services through our unified API platform. Manage your integrations seamlessly with enterprise-grade security."
                    : "View connected Apideck integrations and financial data. You have read-only access to ensure data security."
                  }
                </p>
              </div>
              
              {isClient ? (
                <>
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                    <ApideckIntegrationCard onSubmit={handleApideckSubmit} />
                  </div>
                  
                  <div className="w-full">
                    <ApideckHomePage />
                  </div>
                </>
              ) : (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                      <Eye className="h-8 w-8 text-gray-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-800">Read-Only Access</h4>
                    <p className="text-gray-600 max-w-md mx-auto">
                      As an auditor, you can view connected Apideck integrations and financial data, but cannot modify or create new connections.
                    </p>
                    <div className="w-full">
                      <ApideckHomePage />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Tabs.Content>

          <Tabs.Content
            className="p-8 focus:outline-none focus-visible:ring focus-visible:ring-gray-500"
            value="saltedge"
          >
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800">
                  Salt Edge Banking
                </h3>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                  {isClient 
                    ? "Securely connect your bank accounts with bank-level security. Your financial data is encrypted and protected with industry-leading standards."
                    : "View connected banking data and transactions. You have read-only access to ensure data security and compliance."
                  }
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">
                      Bank-level security with PCI DSS compliance
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-gray-600" />
                    <span className="text-sm font-semibold text-gray-700">
                      Your data is encrypted end-to-end
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {isClient ? (
                      <>
                        <Shield className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">
                          You can disconnect at any time
                        </span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">
                          Read-only access for audit purposes
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="w-full">
                <BankData readOnly={!isClient} />
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </Card>
    </div>
  );
};

export default RoleBasedAccountDataTab;
