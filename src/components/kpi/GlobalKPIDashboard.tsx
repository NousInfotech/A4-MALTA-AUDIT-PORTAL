import { ModernKPISection } from './ModernKPICard';
import { mockGlobalKPIData } from '../../data/kpiMockData';
import { BarChart3, Users, Shield, AlertTriangle, MessageSquare, Clock, FileText, Flag, CheckSquare, PenTool, Home, Calendar, Folder, Link as LinkIcon, Globe, TrendingUp } from 'lucide-react';

export function GlobalKPIDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-blue-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                    Global KPI Dashboard
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Comprehensive engagement metrics and performance overview
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <ModernKPISection
          title="1. Opinion & Outcome Metrics"
          description="Audit opinion quality and outcome tracking across all engagements"
          metrics={mockGlobalKPIData.opinionMetrics}
          icon="📊"
        />
        <ModernKPISection
          title="2. Engagement Volume & Progress"
          description="Engagement volume, progress tracking, and delivery performance"
          metrics={mockGlobalKPIData.engagementVolume}
          icon="📁"
        />
        <ModernKPISection
          title="3. Resource & Utilization"
          description="Team efficiency and resource allocation metrics"
          metrics={mockGlobalKPIData.resourceUtilization}
          icon="⏱️"
        />
        <ModernKPISection
          title="4. Risk & Quality Indicators"
          description="Risk assessment and quality control metrics"
          metrics={mockGlobalKPIData.riskQuality}
          icon="🚩"
        />
        <ModernKPISection
          title="5. Client Interaction Metrics"
          description="Client communication and responsiveness tracking"
          metrics={mockGlobalKPIData.clientInteraction}
          icon="💬"
        />
      </div>
    </div>
  );
}
