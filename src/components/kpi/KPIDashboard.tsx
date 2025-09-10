// @ts-nocheck
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Ban,
  Home,
  FolderOpen,
  Clock,
  BarChart3,
  Calendar,
  FileText,
  AlertCircle,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Briefcase,
  Eye,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";

// Mock data for KPIs
const mockGlobalKPIs = {
  unqualifiedOpinions: { count: 45, percentage: 78.9 },
  qualifiedOpinions: { count: 8, percentage: 14.0 },
  adverseOpinions: { count: 2, percentage: 3.5 },
  disclaimers: { count: 2, percentage: 3.5 },
  goingConcernIssues: { count: 3, percentage: 5.3 },
  totalEngagements: { completed: 57, ongoing: 12 },
  averageCompletionTime: 28.5
};

const mockEngagementKPIs = [
  {
    id: "1",
    clientName: "Tech Solutions Ltd",
    engagementTitle: "Annual Audit 2024",
    status: "Fieldwork",
    plannedCompletionDate: "2024-03-15",
    actualCompletionDate: null,
    plannedOpinionType: "Unqualified",
    finalOpinionType: null,
    materialAdjustmentsProposed: 2,
    materialAdjustmentsAccepted: 1,
    goingConcernFlag: false,
    outstandingClientQueries: 3,
    yearEndDate: "2024-12-31"
  },
  {
    id: "2",
    clientName: "Green Energy Corp",
    engagementTitle: "Annual Audit 2024",
    status: "Planning",
    plannedCompletionDate: "2024-04-20",
    actualCompletionDate: null,
    plannedOpinionType: "Unqualified",
    finalOpinionType: null,
    materialAdjustmentsProposed: 0,
    materialAdjustmentsAccepted: 0,
    goingConcernFlag: false,
    outstandingClientQueries: 1,
    yearEndDate: "2024-12-31"
  },
  {
    id: "3",
    clientName: "Manufacturing Inc",
    engagementTitle: "Annual Audit 2024",
    status: "Completion",
    plannedCompletionDate: "2024-02-28",
    actualCompletionDate: "2024-03-02",
    plannedOpinionType: "Unqualified",
    finalOpinionType: "Unqualified",
    materialAdjustmentsProposed: 1,
    materialAdjustmentsAccepted: 1,
    goingConcernFlag: false,
    outstandingClientQueries: 0,
    yearEndDate: "2024-12-31"
  },
  {
    id: "4",
    clientName: "Retail Chain Co",
    engagementTitle: "Annual Audit 2024",
    status: "Fieldwork",
    plannedCompletionDate: "2024-03-30",
    actualCompletionDate: null,
    plannedOpinionType: "Unqualified",
    finalOpinionType: null,
    materialAdjustmentsProposed: 3,
    materialAdjustmentsAccepted: 2,
    goingConcernFlag: true,
    outstandingClientQueries: 5,
    yearEndDate: "2024-12-31"
  },
  {
    id: "5",
    clientName: "Service Provider Ltd",
    engagementTitle: "Annual Audit 2024",
    status: "Completion",
    plannedCompletionDate: "2024-02-15",
    actualCompletionDate: "2024-02-20",
    plannedOpinionType: "Unqualified",
    finalOpinionType: "Qualified",
    materialAdjustmentsProposed: 2,
    materialAdjustmentsAccepted: 1,
    goingConcernFlag: false,
    outstandingClientQueries: 0,
    yearEndDate: "2024-12-31"
  }
];

export const KPIDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [globalKPIs, setGlobalKPIs] = useState(mockGlobalKPIs);
  const [engagementKPIs, setEngagementKPIs] = useState(mockEngagementKPIs);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Planning":
        return "from-blue-500 to-indigo-600";
      case "Fieldwork":
        return "from-yellow-500 to-amber-600";
      case "Completion":
        return "from-green-500 to-emerald-600";
      default:
        return "from-slate-500 to-gray-600";
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case "Planning":
        return "from-blue-50 to-indigo-50";
      case "Fieldwork":
        return "from-yellow-50 to-amber-50";
      case "Completion":
        return "from-green-50 to-emerald-50";
      default:
        return "from-slate-50 to-gray-50";
    }
  };

  const getOpinionIcon = (opinionType: string) => {
    switch (opinionType) {
      case "Unqualified":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Qualified":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "Adverse":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "Disclaimer":
        return <Ban className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-slate-600" />;
    }
  };

  const getCompletionTrend = (planned: string, actual: string | null) => {
    if (!actual) return null;
    
    const plannedDate = new Date(planned);
    const actualDate = new Date(actual);
    const diffDays = Math.ceil((actualDate.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return <div className="flex items-center text-red-600"><TrendingUp className="h-3 w-3 mr-1" />+{diffDays} days</div>;
    } else if (diffDays < 0) {
      return <div className="flex items-center text-green-600"><TrendingDown className="h-3 w-3 mr-1" />{diffDays} days</div>;
    } else {
      return <div className="flex items-center text-green-600"><CheckCircle className="h-3 w-3 mr-1" />On time</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader variant="pulse" size="lg" text="Loading KPIs..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                    KPI Dashboard
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Monitor audit quality, risk, and efficiency metrics
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto" 
                asChild
              >
                <Link to="/employee/engagements">
                  <Briefcase className="h-5 w-5 mr-2" />
                  View Engagements
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
              >
                <Link to="/employee/dashboard">
                  <ArrowRight className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="global" className="space-y-6">
        <div className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100/50 p-6">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-2xl p-1">
              <TabsTrigger 
                value="global" 
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <Globe className="h-4 w-4 mr-2" />
                Global KPIs
              </TabsTrigger>
              <TabsTrigger 
                value="engagement" 
                className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
              >
                <Briefcase className="h-4 w-4 mr-2" />
                Per Engagement KPIs
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="global" className="space-y-6">
              {/* Global KPIs Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Global KPIs (Phase 1 – Necessary Only)</h2>
                    <p className="text-slate-600 italic text-sm">This already gives partners an overview of quality, risk, and efficiency at a glance.</p>
                  </div>
                </div>

                {/* Opinion Types Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="group bg-white/80 backdrop-blur-sm border border-green-100/50 hover:border-green-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                    <CardHeader className="relative pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Unqualified (Clean) Opinions
                        </CardTitle>
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <CheckCircle className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-3xl font-bold text-slate-800 mb-2">
                        {globalKPIs.unqualifiedOpinions.count}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {globalKPIs.unqualifiedOpinions.percentage}% of total
                      </p>
                      <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100/50">
                        <p className="text-xs font-semibold text-slate-700">High quality indicator</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="group bg-white/80 backdrop-blur-sm border border-yellow-100/50 hover:border-yellow-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                    <CardHeader className="relative pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Qualified Opinions
                        </CardTitle>
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-3xl font-bold text-slate-800 mb-2">
                        {globalKPIs.qualifiedOpinions.count}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {globalKPIs.qualifiedOpinions.percentage}% of total
                      </p>
                      <div className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-100/50">
                        <p className="text-xs font-semibold text-slate-700">Monitor closely</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="group bg-white/80 backdrop-blur-sm border border-red-100/50 hover:border-red-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                    <CardHeader className="relative pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Adverse Opinions
                        </CardTitle>
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <XCircle className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-3xl font-bold text-slate-800 mb-2">
                        {globalKPIs.adverseOpinions.count}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {globalKPIs.adverseOpinions.percentage}% of total
                      </p>
                      <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-100/50">
                        <p className="text-xs font-semibold text-slate-700">Risk indicator</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="group bg-white/80 backdrop-blur-sm border border-red-100/50 hover:border-red-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                    <CardHeader className="relative pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Disclaimers
                        </CardTitle>
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Ban className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-3xl font-bold text-slate-800 mb-2">
                        {globalKPIs.disclaimers.count}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {globalKPIs.disclaimers.percentage}% of total
                      </p>
                      <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-2xl border border-red-100/50">
                        <p className="text-xs font-semibold text-slate-700">Risk indicator</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Global KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="group bg-white/80 backdrop-blur-sm border border-orange-100/50 hover:border-orange-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                    <CardHeader className="relative pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Going Concern Issues
                        </CardTitle>
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Home className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-3xl font-bold text-slate-800 mb-2">
                        {globalKPIs.goingConcernIssues.count}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {globalKPIs.goingConcernIssues.percentage}% of engagements
                      </p>
                      <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border border-orange-100/50">
                        <p className="text-xs font-semibold text-slate-700">Risk assessment</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                    <CardHeader className="relative pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Total Engagements
                        </CardTitle>
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <FolderOpen className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-3xl font-bold text-slate-800 mb-2">
                        {globalKPIs.totalEngagements.completed + globalKPIs.totalEngagements.ongoing}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {globalKPIs.totalEngagements.completed} completed, {globalKPIs.totalEngagements.ongoing} ongoing
                      </p>
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50">
                        <p className="text-xs font-semibold text-slate-700">Portfolio overview</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="group bg-white/80 backdrop-blur-sm border border-purple-100/50 hover:border-purple-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                    <CardHeader className="relative pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-slate-600">
                          Average Completion Time
                        </CardTitle>
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <div className="text-3xl font-bold text-slate-800 mb-2">
                        {globalKPIs.averageCompletionTime}
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Days per engagement
                      </p>
                      <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-100/50">
                        <p className="text-xs font-semibold text-slate-700">Efficiency metric</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="engagement" className="space-y-6">
              {/* Per Engagement KPIs Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Per Engagement KPIs (Phase 1 – Necessary Only)</h2>
                    <p className="text-slate-600 italic text-sm">This keeps teams focused on delivery, opinion, and client responsiveness.</p>
                  </div>
                </div>

                {/* Engagement KPIs Table */}
                <Card className="bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100/50">
                    <CardTitle className="text-xl font-bold text-slate-800">Engagement Performance Overview</CardTitle>
                    <CardDescription className="text-slate-600">Detailed metrics for each active engagement</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {engagementKPIs.map((engagement) => (
                        <div
                          key={engagement.id}
                          className="group p-6 bg-gradient-to-r from-slate-50 to-blue-50/30 border border-blue-100/50 rounded-2xl hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg"
                        >
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column - Basic Info */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-semibold text-slate-800 text-lg">{engagement.clientName}</h3>
                                  <p className="text-sm text-slate-600">{engagement.engagementTitle}</p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`rounded-2xl px-3 py-1 text-sm font-semibold bg-gradient-to-r ${getStatusBgColor(engagement.status)} border-blue-200`}
                                >
                                  {engagement.status}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="h-4 w-4 text-blue-600" />
                                    <span className="text-xs font-medium text-slate-600">Planned Completion</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {new Date(engagement.plannedCompletionDate).toLocaleDateString()}
                                  </p>
                                </div>

                                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Clock className="h-4 w-4 text-green-600" />
                                    <span className="text-xs font-medium text-slate-600">Actual Completion</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {engagement.actualCompletionDate 
                                      ? new Date(engagement.actualCompletionDate).toLocaleDateString()
                                      : "Pending"
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Right Column - KPI Metrics */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                {/* Opinion Type */}
                                <div className="p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-slate-100/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <FileText className="h-4 w-4 text-slate-600" />
                                    <span className="text-xs font-medium text-slate-600">Opinion Type</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getOpinionIcon(engagement.finalOpinionType || engagement.plannedOpinionType)}
                                    <span className="text-sm font-semibold text-slate-800">
                                      {engagement.finalOpinionType || engagement.plannedOpinionType}
                                    </span>
                                  </div>
                                </div>

                                {/* Material Adjustments */}
                                <div className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl border border-yellow-100/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    <span className="text-xs font-medium text-slate-600">Material Adjustments</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {engagement.materialAdjustmentsProposed} proposed, {engagement.materialAdjustmentsAccepted} accepted
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {/* Going Concern */}
                                <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Home className="h-4 w-4 text-orange-600" />
                                    <span className="text-xs font-medium text-slate-600">Going Concern</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {engagement.goingConcernFlag ? "Yes" : "No"}
                                  </p>
                                </div>

                                {/* Outstanding Queries */}
                                <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <MessageSquare className="h-4 w-4 text-purple-600" />
                                    <span className="text-xs font-medium text-slate-600">Outstanding Queries</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-800">
                                    {engagement.outstandingClientQueries} queries
                                  </p>
                                </div>
                              </div>

                              {/* Completion Trend */}
                              {engagement.actualCompletionDate && (
                                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100/50">
                                  <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                    <span className="text-xs font-medium text-slate-600">Completion Trend</span>
                                  </div>
                                  {getCompletionTrend(engagement.plannedCompletionDate, engagement.actualCompletionDate)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex justify-end mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="border-blue-200 hover:bg-blue-50/50 text-blue-700 hover:text-blue-800 rounded-xl"
                            >
                              <Link to={`/employee/engagements/${engagement.id}`}>
                                <Eye className="h-3 w-3 mr-1" />
                                View Details
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
};
