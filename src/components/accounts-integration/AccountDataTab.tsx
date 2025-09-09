import React, { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, CreditCard, Shield, Zap } from "lucide-react";
import ApideckIntegrationCard from "../apideck/ApideckIntegrationCard";
import ApideckHomePage from "../apideck/ApideckHomePage";
import BankData from "../saltedge/BankData";

interface AccountDataTabProps {}

const AccountDataTab: React.FC<AccountDataTabProps> = () => {
  // Example of how you might handle a successful integration
  const handleApideckSubmit = (integration: any) => {
    console.log("Apideck integration submitted successfully:", integration);
    // You'd typically update your application state here,
    // e.g., show a list of connected integrations.
    // Maybe trigger a re-fetch of user integrations.
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Accounts & Finance
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Connect and manage your financial data integrations
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 rounded-xl px-4 py-2 text-sm font-semibold">
                <Shield className="h-4 w-4 mr-2" />
                Secure Integration
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Apideck Integration
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Zap className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              API Ready
            </div>
            <p className="text-sm text-slate-600 mb-3">Connect to multiple services</p>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
              <p className="text-xs font-semibold text-slate-700">
                Unified API platform
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardHeader className="relative pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Salt Edge Banking
              </CardTitle>
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-800 mb-2">
              Bank Level
            </div>
            <p className="text-sm text-slate-600 mb-3">Secure banking connections</p>
            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100/50">
              <p className="text-xs font-semibold text-slate-700">
                PCI DSS compliant
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Tabs */}
      <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
        <Tabs.Root defaultValue="saltedge" className="w-full">
          <Tabs.List className="flex border-b border-blue-100/50 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <Tabs.Trigger
              className="flex-1 px-6 py-4 text-sm font-medium text-slate-600 hover:text-blue-600 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border-b-2 data-[state=active]:border-blue-600 transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
          value="apideck"
        >
              <Zap className="h-4 w-4" />
              Apideck Integration
        </Tabs.Trigger>
        <Tabs.Trigger
              className="flex-1 px-6 py-4 text-sm font-medium text-slate-600 hover:text-blue-600 focus:z-10 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 data-[state=active]:text-blue-600 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border-b-2 data-[state=active]:border-blue-600 transition-all duration-300 ease-in-out flex items-center justify-center gap-2"
          value="saltedge"
        >
              <CreditCard className="h-4 w-4" />
              Salt Edge Banking
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content
            className="p-8 focus:outline-none focus-visible:ring focus-visible:ring-blue-500"
        value="apideck"
      >
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
          Apideck Integration
        </h3>
                <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                  Connect to multiple services through our unified API platform. Manage your integrations seamlessly with enterprise-grade security.
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50">
        <ApideckIntegrationCard onSubmit={handleApideckSubmit} />
              </div>
              
              <div className="w-full">
          <ApideckHomePage />
              </div>
        </div>
      </Tabs.Content>

      <Tabs.Content
            className="p-8 focus:outline-none focus-visible:ring focus-visible:ring-blue-500"
        value="saltedge"
      >
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                  <CreditCard className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800">
                  Salt Edge Banking
        </h3>
                <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                  Securely connect your bank accounts with bank-level security. Your financial data is encrypted and protected with industry-leading standards.
                </p>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100/50">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-slate-700">
                      Bank-level security with PCI DSS compliance
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-slate-700">
                      Your data is encrypted end-to-end
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-semibold text-slate-700">
                      You can disconnect at any time
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="w-full">
            <BankData />
          </div>
        </div>
      </Tabs.Content>
    </Tabs.Root>
      </Card>
    </div>
  );
};

export default AccountDataTab;
