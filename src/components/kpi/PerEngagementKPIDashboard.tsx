import { ModernKPISection } from './ModernKPICard';
import { mockPerEngagementKPIData } from '../../data/kpiMockData';
import { ClipboardList, Clock, FileText, Shield, MessageSquare, Users, AlertTriangle, CheckCircle, Globe } from 'lucide-react';

interface PerEngagementKPIDashboardProps {
  engagementId?: string;
}

export function PerEngagementKPIDashboard({ engagementId }: PerEngagementKPIDashboardProps) {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-8 shadow-lg shadow-gray-300/30 animate-fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-900 animate-fade-in">
                  Per-Engagement KPIs
                </h1>
                <p className="text-gray-700 animate-fade-in-delay">
                  Performance metrics for this specific engagement
                </p>
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
