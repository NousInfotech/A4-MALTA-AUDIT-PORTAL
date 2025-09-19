import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  Calendar,
  Target,
  PieChart,
  Activity,
  Award,
  Zap,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useISQM, ISQMParent, ISQMQuestionnaire } from '@/hooks/useISQM';

interface ISQMAnalyticsProps {
  parentId: string;
}

export const ISQMAnalytics: React.FC<ISQMAnalyticsProps> = ({ parentId }) => {
  const {
    parents,
    questionnaires,
    supportingDocuments,
    loading,
    fetchParents,
    fetchQuestionnaires,
    fetchSupportingDocuments,
  } = useISQM();

  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("30d");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Load data when component mounts
  useEffect(() => {
    if (parentId) {
      console.log('🔄 ISQMAnalytics: Loading analytics data for parent:', parentId);
      fetchQuestionnaires(parentId);
      fetchSupportingDocuments(parentId);
    }
  }, [parentId, fetchQuestionnaires, fetchSupportingDocuments]);

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    if (!questionnaires.length && !supportingDocuments.length) {
      return {
        overall: {
          totalQuestions: 0,
          answeredQuestions: 0,
          completionRate: 0,
          totalDocuments: 0,
          approvedDocuments: 0,
          documentCompletionRate: 0,
        },
        byQuestionnaire: [],
        bySection: [],
        byCategory: [],
        trends: {
          dailyProgress: [],
          weeklyProgress: [],
          monthlyProgress: [],
        },
        insights: [],
        recommendations: []
      };
    }

    // Overall statistics
    const totalQuestions = questionnaires.reduce((acc, q) => acc + q.stats.totalQuestions, 0);
    const answeredQuestions = questionnaires.reduce((acc, q) => acc + q.stats.answeredQuestions, 0);
    const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    const totalDocuments = supportingDocuments.length;
    const approvedDocuments = supportingDocuments.filter(doc => doc.status === 'approved').length;
    const documentCompletionRate = totalDocuments > 0 ? (approvedDocuments / totalDocuments) * 100 : 0;

    // By questionnaire analysis
    const byQuestionnaire = questionnaires.map(q => ({
      id: q._id,
      name: q.heading,
      key: q.key,
      totalQuestions: q.stats.totalQuestions,
      answeredQuestions: q.stats.answeredQuestions,
      completionRate: q.stats.completionPercentage,
      status: q.status,
      sections: q.sections.length,
      lastUpdated: q.stats.lastUpdated || q.updatedAt
    }));

    // By section analysis
    const bySection = questionnaires.flatMap(q => 
      q.sections.map(section => ({
        questionnaireId: q._id,
        questionnaireName: q.heading,
        sectionName: section.heading,
        totalQuestions: section.qna.length,
        answeredQuestions: section.qna.filter(q => q.answer.trim() !== "").length,
        completionRate: section.qna.length > 0 ? (section.qna.filter(q => q.answer.trim() !== "").length / section.qna.length) * 100 : 0,
        implementedQuestions: section.qna.filter(q => q.state).length,
        implementationRate: section.qna.length > 0 ? (section.qna.filter(q => q.state).length / section.qna.length) * 100 : 0
      }))
    );

    // By category analysis (for documents)
    const categoryStats = supportingDocuments.reduce((acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = { total: 0, approved: 0, pending: 0, rejected: 0 };
      }
      acc[doc.category].total++;
      acc[doc.category][doc.status]++;
      return acc;
    }, {} as Record<string, { total: number; approved: number; pending: number; rejected: number }>);

    const byCategory = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      total: stats.total,
      approved: stats.approved,
      pending: stats.pending,
      rejected: stats.rejected,
      completionRate: stats.total > 0 ? (stats.approved / stats.total) * 100 : 0
    }));

    // Generate insights
    const insights = [];
    if (completionRate < 25) {
      insights.push({
        type: 'warning',
        title: 'Low Completion Rate',
        message: 'Questionnaire completion is below 25%. Consider prioritizing key sections.',
        icon: AlertCircle
      });
    } else if (completionRate > 75) {
      insights.push({
        type: 'success',
        title: 'Excellent Progress',
        message: 'Questionnaire completion is above 75%. Great work!',
        icon: CheckCircle
      });
    }

    if (documentCompletionRate < 50) {
      insights.push({
        type: 'warning',
        title: 'Document Backlog',
        message: 'Document approval rate is low. Review pending documents.',
        icon: FileText
      });
    }

    // Generate recommendations
    const recommendations = [];
    const incompleteSections = bySection.filter(s => s.completionRate < 50);
    if (incompleteSections.length > 0) {
      recommendations.push({
        type: 'focus',
        title: 'Focus Areas',
        message: `Complete ${incompleteSections.length} sections with low completion rates.`,
        priority: 'high'
      });
    }

    const pendingDocuments = supportingDocuments.filter(doc => doc.status === 'pending');
    if (pendingDocuments.length > 0) {
      recommendations.push({
        type: 'action',
        title: 'Document Action Required',
        message: `${pendingDocuments.length} documents are pending upload or review.`,
        priority: 'medium'
      });
    }

    return {
      overall: {
        totalQuestions,
        answeredQuestions,
        completionRate,
        totalDocuments,
        approvedDocuments,
        documentCompletionRate,
      },
      byQuestionnaire,
      bySection,
      byCategory,
      trends: {
        dailyProgress: [], // Would be populated from historical data
        weeklyProgress: [],
        monthlyProgress: [],
      },
      insights,
      recommendations
    };
  }, [questionnaires, supportingDocuments]);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      console.log('🔄 Generating comprehensive ISQM report...');
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create downloadable report
      const reportData = {
        generatedAt: new Date().toISOString(),
        parentId,
        analytics,
        questionnaires: questionnaires.map(q => ({
          id: q._id,
          name: q.heading,
          status: q.status,
          completion: q.stats.completionPercentage,
          sections: q.sections.length,
          questions: q.stats.totalQuestions,
          answered: q.stats.answeredQuestions
        })),
        documents: supportingDocuments.map(doc => ({
          id: doc._id,
          title: doc.title,
          category: doc.category,
          status: doc.status,
          priority: doc.priority,
          completion: doc.completionPercentage
        }))
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `isqm-analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      console.log('✅ Report generated successfully');
    } catch (error) {
      console.error('❌ Failed to generate report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Analytics & Reporting</h2>
          <p className="text-gray-600">Comprehensive insights and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="border-2 border-gray-200 focus:border-blue-400 rounded-xl px-3 py-2"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button 
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {isGeneratingReport ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Generate Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">Question Completion</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overall.completionRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-600">{analytics.overall.answeredQuestions} of {analytics.overall.totalQuestions} questions</p>
              </div>
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">Document Approval</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overall.documentCompletionRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-600">{analytics.overall.approvedDocuments} of {analytics.overall.totalDocuments} documents</p>
              </div>
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">Questionnaires</p>
                <p className="text-2xl font-bold text-gray-900">{questionnaires.length}</p>
                <p className="text-xs text-gray-600">Active questionnaires</p>
              </div>
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 font-medium">Sections</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.bySection.length}</p>
                <p className="text-xs text-gray-600">Total sections</p>
              </div>
              <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Key Insights</h3>
                <p className="text-sm text-muted-foreground">Automated analysis and observations</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.insights.length > 0 ? (
              analytics.insights.map((insight, index) => (
                <div key={index} className={`p-3 rounded-xl border ${
                  insight.type === 'success' ? 'bg-green-50 border-green-200' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <insight.icon className={`w-5 h-5 mt-0.5 ${
                      insight.type === 'success' ? 'text-green-600' :
                      insight.type === 'warning' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                    <div>
                      <h4 className="font-medium text-gray-800">{insight.title}</h4>
                      <p className="text-sm text-gray-600">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No insights available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-xl">
                <Award className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Recommendations</h3>
                <p className="text-sm text-muted-foreground">Suggested actions and improvements</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.recommendations.length > 0 ? (
              analytics.recommendations.map((rec, index) => (
                <div key={index} className={`p-3 rounded-xl border ${
                  rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                  rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <Zap className={`w-5 h-5 mt-0.5 ${
                      rec.priority === 'high' ? 'text-red-600' :
                      rec.priority === 'medium' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} />
                    <div>
                      <h4 className="font-medium text-gray-800">{rec.title}</h4>
                      <p className="text-sm text-gray-600">{rec.message}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No recommendations at this time</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="questionnaires" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border-0 shadow-lg rounded-2xl p-1">
          <TabsTrigger value="questionnaires" className="rounded-xl">
            <FileText className="w-4 h-4 mr-2" />
            Questionnaires
          </TabsTrigger>
          <TabsTrigger value="sections" className="rounded-xl">
            <BarChart3 className="w-4 h-4 mr-2" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="documents" className="rounded-xl">
            <Download className="w-4 h-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questionnaires" className="space-y-4 mt-6">
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Questionnaire Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.byQuestionnaire.map((q) => (
                  <div key={q.id} className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800">{q.name}</h4>
                        <p className="text-sm text-gray-600">{q.sections} sections • {q.totalQuestions} questions</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${
                          q.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                          q.status === 'in-progress' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                          'bg-gray-100 text-gray-700 border-gray-200'
                        }`}>
                          {q.status}
                        </Badge>
                        <span className="text-lg font-bold text-blue-600">{q.completionRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <Progress value={q.completionRate} className="h-2" />
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>{q.answeredQuestions} answered</span>
                      <span>{q.totalQuestions - q.answeredQuestions} remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sections" className="space-y-4 mt-6">
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Section Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.bySection.map((section, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800">{section.sectionName}</h4>
                        <p className="text-sm text-gray-600">{section.questionnaireName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Completion:</span>
                        <span className="text-lg font-bold text-blue-600">{section.completionRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Progress value={section.completionRate} className="h-2 mb-2" />
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Answered: {section.answeredQuestions}/{section.totalQuestions}</span>
                        </div>
                      </div>
                      <div>
                        <Progress value={section.implementationRate} className="h-2 mb-2" />
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Implemented: {section.implementedQuestions}/{section.totalQuestions}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-6">
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Document Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.byCategory.map((category, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800">{category.category}</h4>
                        <p className="text-sm text-gray-600">{category.total} documents</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Approval Rate:</span>
                        <span className="text-lg font-bold text-green-600">{category.completionRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <Progress value={category.completionRate} className="h-2 mb-3" />
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{category.approved}</div>
                        <div className="text-gray-600">Approved</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-yellow-600">{category.pending}</div>
                        <div className="text-gray-600">Pending</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{category.rejected}</div>
                        <div className="text-gray-600">Rejected</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-gray-600">{category.total}</div>
                        <div className="text-gray-600">Total</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
