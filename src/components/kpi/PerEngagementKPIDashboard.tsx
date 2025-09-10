import { ModernKPISection } from './ModernKPICard';
import { mockPerEngagementKPIData } from '../../data/kpiMockData';
import { ClipboardList, Clock, FileText, Shield, MessageSquare, Users, AlertTriangle, CheckCircle, Globe } from 'lucide-react';

interface PerEngagementKPIDashboardProps {
  engagementId?: string;
}

export function PerEngagementKPIDashboard({ engagementId }: PerEngagementKPIDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-6 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-green-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <ClipboardList className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent leading-tight">
                    Per-Engagement KPIs
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Performance metrics for this specific engagement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <ModernKPISection
          title="Engagement Progress & Timeline"
          description="Track engagement status, completion dates, and timeline adherence"
          metrics={mockPerEngagementKPIData.engagementProgress}
          icon="📋"
        />
        <ModernKPISection
          title="Resource & Budget Control"
          description="Monitor budgeted hours usage and staff continuity"
          metrics={mockPerEngagementKPIData.resourceBudget}
          icon="⏱️"
        />
        <ModernKPISection
          title="Opinion & Reporting"
          description="Audit opinion type, going concern flags, and material adjustments"
          metrics={mockPerEngagementKPIData.opinionReporting}
          icon="📄"
        />
        <ModernKPISection
          title="Risk & Quality Indicators"
          description="High-risk areas, findings resolution, and review notes tracking"
          metrics={mockPerEngagementKPIData.riskQuality}
          icon="🚩"
        />
        <ModernKPISection
          title="Client Interaction & Responsiveness"
          description="Outstanding queries and client response time monitoring"
          metrics={mockPerEngagementKPIData.clientInteraction}
          icon="💬"
        />
      </div>
    </div>
  );
}
