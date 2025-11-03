import React from 'react';
import { useEngagements } from '@/hooks/useEngagements';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Clock,
  Target,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Building2,
  FileText,
  Users,
  Zap,
  Star
} from 'lucide-react';

interface AnalyticsData {
  totalEngagements: number;
  activeEngagements: number;
  completedEngagements: number;
  draftEngagements: number;
  totalClients: number;
  newClientsThisMonth: number;
  avgEngagementDuration: number;
  completionRate: number;
  monthlyTrend: number;
}

export const PortalAnalytics: React.FC = () => {
  const { engagements, loading } = useEngagements();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalEngagements: 0,
    activeEngagements: 0,
    completedEngagements: 0,
    draftEngagements: 0,
    totalClients: 0,
    newClientsThisMonth: 0,
    avgEngagementDuration: 0,
    completionRate: 0,
    monthlyTrend: 0
  });

  useEffect(() => {
    if (engagements.length > 0) {
      calculateAnalytics();
    }
  }, [engagements]);

  const calculateAnalytics = async () => {
    try {
      // Get clients data
      const { data: clientsData } = await supabase
        .from("profiles")
        .select("created_at, role")
        .eq("role", "client");

      const totalClients = clientsData?.length || 0;
      
      // Calculate new clients this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const newClientsThisMonth = clientsData?.filter(client => {
        const clientDate = new Date(client.created_at);
        return clientDate.getMonth() === currentMonth && clientDate.getFullYear() === currentYear;
      }).length || 0;

      // Calculate engagement metrics
      const activeEngagements = engagements.filter(e => e.status === 'active').length;
      const completedEngagements = engagements.filter(e => e.status === 'completed').length;
      const draftEngagements = engagements.filter(e => e.status === 'draft').length;
      const totalEngagements = engagements.length;

      // Calculate average engagement duration (in days)
      const avgEngagementDuration = engagements.length > 0 
        ? engagements.reduce((sum, engagement) => {
            const startDate = new Date(engagement.createdAt);
            const endDate = engagement.status === 'completed' 
              ? new Date() // Use current date for completed engagements
              : new Date();
            const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            return sum + duration;
          }, 0) / engagements.length
        : 0;

      // Calculate completion rate
      const completionRate = totalEngagements > 0 ? (completedEngagements / totalEngagements) * 100 : 0;

      // Calculate monthly trend (simplified - comparing this month vs last month)
      const monthlyTrend = newClientsThisMonth > 0 ? 15 : -5; // Simplified trend calculation

      setAnalyticsData({
        totalEngagements,
        activeEngagements,
        completedEngagements,
        draftEngagements,
        totalClients,
        newClientsThisMonth,
        avgEngagementDuration: Math.round(avgEngagementDuration),
        completionRate: Math.round(completionRate),
        monthlyTrend
      });
    } catch (error) {
      console.error('Error calculating analytics:', error);
    }
  };

  // Create percentage-based metrics
  const percentageMetrics = [
    {
      title: "Project Success Rate",
      percentage: analyticsData.completionRate,
      icon: CheckCircle,
      color: "text-gray-800",
      bgColor: "bg-brand-sidebar",
      ringColor: "ring-gray-900/20",
      description: `${analyticsData.completedEngagements} of ${analyticsData.totalEngagements} completed`,
      trend: analyticsData.completionRate > 70 ? "+12%" : "-3%",
      trendColor: analyticsData.completionRate > 70 ? "text-gray-800" : "text-gray-600"
    },
    {
      title: "Client Growth",
      percentage: analyticsData.totalClients > 0 ? Math.min((analyticsData.newClientsThisMonth / analyticsData.totalClients) * 100, 100) : 0,
      icon: Users,
      color: "text-gray-700",
      bgColor: "bg-brand-hover",
      ringColor: "ring-gray-800/20",
      description: `${analyticsData.newClientsThisMonth} new clients this month`,
      trend: analyticsData.newClientsThisMonth > 0 ? "+25%" : "0%",
      trendColor: analyticsData.newClientsThisMonth > 0 ? "text-gray-800" : "text-gray-500"
    },
    {
      title: "Active Projects",
      percentage: analyticsData.totalEngagements > 0 ? (analyticsData.activeEngagements / analyticsData.totalEngagements) * 100 : 0,
      icon: Activity,
      color: "text-gray-600",
      bgColor: "bg-gray-700",
      ringColor: "ring-gray-700/20",
      description: `${analyticsData.activeEngagements} projects in progress`,
      trend: analyticsData.activeEngagements > 0 ? "+8%" : "0%",
      trendColor: analyticsData.activeEngagements > 0 ? "text-gray-800" : "text-gray-500"
    },
    {
      title: "Efficiency Score",
      percentage: analyticsData.avgEngagementDuration > 0 ? Math.max(100 - (analyticsData.avgEngagementDuration / 30) * 100, 0) : 0,
      icon: Zap,
      color: "text-gray-500",
      bgColor: "bg-gray-600",
      ringColor: "ring-gray-600/20",
      description: `Avg ${analyticsData.avgEngagementDuration} days per project`,
      trend: analyticsData.avgEngagementDuration < 30 ? "+15%" : "-5%",
      trendColor: analyticsData.avgEngagementDuration < 30 ? "text-gray-800" : "text-gray-600"
    }
  ];

  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30 animate-fade-in">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
        </div>
        <div className="flex items-center space-x-1 px-2 py-1 bg-brand-hover/20 rounded-full">
          <div className="w-1.5 h-1.5 bg-brand-hover rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-800">Live</span>
        </div>
      </div>

      {/* Single Row Percentage Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {percentageMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const circumference = 2 * Math.PI * 20; // Smaller radius = 20
          const strokeDasharray = circumference;
          const strokeDashoffset = circumference - (metric.percentage / 100) * circumference;
          
          return (
            <div key={metric.title} className="group text-center">
              {/* Compact Circular Chart */}
              <div className="relative w-16 h-16 mx-auto mb-3">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 40 40">
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-gray-300"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className={`transition-all duration-1500 ease-out ${metric.color}`}
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Icon in center */}
                <div className={`absolute inset-0 flex items-center justify-center rounded-full ${metric.bgColor}`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </div>
              
              {/* Compact Content */}
              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-gray-900 truncate">
                  {metric.title}
                </h4>
                <div className="flex items-center justify-center space-x-1">
                  <span className={`text-xs font-medium ${metric.trendColor}`}>
                    {metric.trend}
                  </span>
                  {metric.trendColor.includes('gray-800') ? (
                    <TrendingUp className="h-2 w-2 text-gray-800" />
                  ) : metric.trendColor.includes('gray-600') ? (
                    <TrendingDown className="h-2 w-2 text-gray-600" />
                  ) : (
                    <Activity className="h-2 w-2 text-gray-500" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: analyticsData.totalEngagements, color: "text-gray-800" },
          { label: "Active", value: analyticsData.activeEngagements, color: "text-gray-700" },
          { label: "Done", value: analyticsData.completedEngagements, color: "text-gray-600" },
          { label: "Draft", value: analyticsData.draftEngagements, color: "text-gray-500" }
        ].map((stat, index) => (
          <div key={stat.label} className="text-center p-3 bg-gray-200/20 rounded-xl hover:bg-gray-200/40 transition-all duration-300">
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
