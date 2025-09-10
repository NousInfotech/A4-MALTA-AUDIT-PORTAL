import { GlobalKPIData, PerEngagementKPIData } from '../types/kpi';

export const mockGlobalKPIData: GlobalKPIData = {
  opinionMetrics: [
    {
      id: 'unqualified-opinions',
      label: 'Unqualified (Clean) Opinions',
      value: 45,
      unit: 'count',
      icon: '✓',
      color: 'green',
      description: 'count and % of total',
      trend: 'up',
      trendValue: 5
    },
    {
      id: 'qualified-opinions',
      label: 'Qualified Opinions',
      value: 3,
      unit: 'count',
      icon: '▲',
      color: 'orange',
      description: 'count and %',
      trend: 'down',
      trendValue: 1
    },
    {
      id: 'adverse-opinions',
      label: 'Adverse Opinions',
      value: 0,
      unit: 'count',
      icon: '✗',
      color: 'red',
      description: 'count',
      trend: 'neutral'
    },
    {
      id: 'disclaimers',
      label: 'Disclaimers of Opinion',
      value: 1,
      unit: 'count',
      icon: '📄',
      color: 'pink',
      description: 'count',
      trend: 'neutral'
    },
    {
      id: 'going-concern',
      label: 'Going Concern Issues',
      value: 2,
      unit: 'count',
      icon: '🏢',
      color: 'brown',
      description: 'count',
      trend: 'up',
      trendValue: 1
    },
    {
      id: 'restatements',
      label: 'Restatements / Reissued FS',
      value: 0,
      unit: 'count',
      icon: '📈',
      color: 'purple',
      description: 'count (signals reporting quality)',
      trend: 'neutral'
    }
  ],
  engagementVolume: [
    {
      id: 'total-engagements',
      label: 'Total Engagements',
      value: 48,
      unit: 'count',
      icon: '📁',
      color: 'yellow',
      description: 'active + completed',
      trend: 'up',
      trendValue: 3
    },
    {
      id: 'status-breakdown',
      label: 'Engagement Status Breakdown',
      value: '65%',
      unit: 'completion',
      icon: '📊',
      color: 'purple',
      description: '% Planning / Fieldwork / Completion',
      trend: 'up',
      trendValue: 5
    },
    {
      id: 'avg-completion',
      label: 'Average Completion Time',
      value: 45,
      unit: 'days',
      icon: '⏰',
      color: 'green',
      description: 'days from start to opinion',
      trend: 'down',
      trendValue: 3
    },
    {
      id: 'late-deliveries',
      label: '% of Audits Delivered Late',
      value: 8,
      unit: '%',
      icon: '📅',
      color: 'red',
      description: 'vs statutory deadlines',
      trend: 'down',
      trendValue: 2
    },
    {
      id: 'engagement-backlog',
      label: 'Engagement Backlog',
      value: 12,
      unit: 'count',
      icon: '🔗',
      color: 'blue',
      description: 'count not yet started or assigned',
      trend: 'up',
      trendValue: 2
    }
  ],
  resourceUtilization: [
    {
      id: 'budgeted-hours',
      label: 'Average % Budgeted Hours Used per Engagement',
      value: 95,
      unit: '%',
      icon: '⏱️',
      color: 'gray',
      description: 'measure of efficiency',
      trend: 'up',
      trendValue: 2
    },
    {
      id: 'team-utilization',
      label: 'Team Utilization Rate',
      value: 87,
      unit: '%',
      icon: '👥',
      color: 'purple',
      description: 'aggregate staff allocation vs capacity',
      trend: 'up',
      trendValue: 3
    }
  ],
  riskQuality: [
    {
      id: 'high-risk-engagements',
      label: 'High-Risk Engagements Flagged',
      value: 5,
      unit: 'count',
      icon: '🚩',
      color: 'red',
      description: 'count or %',
      trend: 'down',
      trendValue: 1
    },
    {
      id: 'open-findings',
      label: 'Open vs Resolved Findings',
      value: '12/45',
      unit: 'ratio',
      icon: '⬜',
      color: 'white',
      description: 'across all engagements',
      trend: 'down',
      trendValue: 3
    },
    {
      id: 'review-notes',
      label: 'Average Review Notes per Engagement',
      value: 8,
      unit: 'count',
      icon: '📝',
      color: 'white',
      description: 'signals complexity or training needs',
      trend: 'down',
      trendValue: 1
    },
    {
      id: 'material-misstatements',
      label: 'Material Misstatements Identified',
      value: 3,
      unit: 'count',
      icon: '🔴',
      color: 'pink',
      description: 'total count/value across portfolio',
      trend: 'neutral'
    },
    {
      id: 'fraud-risks',
      label: 'Fraud Risks Reported',
      value: 1,
      unit: 'count',
      icon: '⚠️',
      color: 'red',
      description: 'count of flagged engagements',
      trend: 'neutral'
    }
  ],
  clientInteraction: [
    {
      id: 'outstanding-queries',
      label: 'Total Outstanding Client Queries',
      value: 18,
      unit: 'count',
      icon: '💬',
      color: 'purple',
      description: 'all active engagements',
      trend: 'down',
      trendValue: 4
    },
    {
      id: 'avg-response-time',
      label: 'Average Client Response Time',
      value: 2.5,
      unit: 'days',
      icon: '🌐',
      color: 'blue',
      description: 'portfolio-wide bottlenecks',
      trend: 'down',
      trendValue: 0.5
    }
  ]
};

export const mockPerEngagementKPIData: PerEngagementKPIData = {
  engagementProgress: [
    {
      id: 'engagement-status',
      label: 'Engagement Status',
      value: 'Fieldwork',
      unit: '',
      icon: '📋',
      color: 'blue',
      description: 'Planning / Fieldwork / Completion',
      trend: 'up'
    },
    {
      id: 'planned-vs-actual',
      label: 'Planned vs Actual Completion Date',
      value: 'On Track',
      unit: '',
      icon: '🔄',
      color: 'green',
      description: 'tracks schedule adherence',
      trend: 'neutral'
    },
    {
      id: 'days-past-deadline',
      label: 'Days Past Deadline',
      value: 0,
      unit: 'days',
      icon: '⏳',
      color: 'green',
      description: '(if overdue)',
      trend: 'neutral'
    },
    {
      id: 'last-updated',
      label: 'Last Updated Date',
      value: '2025-01-15',
      unit: '',
      icon: '📅',
      color: 'blue',
      description: 'shows recency of activity',
      trend: 'up'
    }
  ],
  resourceBudget: [
    {
      id: 'budgeted-hours-used',
      label: '% Budgeted Hours Used',
      value: 78,
      unit: '%',
      icon: '⏱️',
      color: 'green',
      description: 'signals overruns early',
      trend: 'up',
      trendValue: 5
    },
    {
      id: 'staff-turnover',
      label: 'Staff Turnover on Engagement',
      value: 'No',
      unit: '',
      icon: '👥',
      color: 'green',
      description: '(Yes/No or count) – continuity risk',
      trend: 'neutral'
    }
  ],
  opinionReporting: [
    {
      id: 'opinion-type',
      label: 'Opinion Type',
      value: 'Unqualified',
      unit: '',
      icon: '📄',
      color: 'green',
      description: 'Planned vs Final',
      trend: 'neutral'
    },
    {
      id: 'going-concern-flag',
      label: 'Going Concern Flag',
      value: 'No',
      unit: '',
      icon: '🏠',
      color: 'green',
      description: 'Yes/No',
      trend: 'neutral'
    },
    {
      id: 'material-adjustments',
      label: 'Material Adjustments Proposed & Accepted',
      value: 2,
      unit: 'count',
      icon: '⚠️',
      color: 'yellow',
      description: 'count/value',
      trend: 'up',
      trendValue: 1
    }
  ],
  riskQuality: [
    {
      id: 'high-risk-areas',
      label: 'High-Risk Areas Flagged',
      value: 3,
      unit: 'count',
      icon: '🚩',
      color: 'red',
      description: 'count or categories',
      trend: 'neutral'
    },
    {
      id: 'open-resolved-findings',
      label: 'Open vs Resolved Findings',
      value: '2/8',
      unit: 'ratio',
      icon: '✅',
      color: 'green',
      description: 'ensures all issues are cleared before sign-off',
      trend: 'down',
      trendValue: 1
    },
    {
      id: 'review-notes-raised',
      label: 'Review Notes Raised & Cleared',
      value: '5/7',
      unit: 'ratio',
      icon: '📝',
      color: 'blue',
      description: 'reflects review effort/complexity',
      trend: 'up',
      trendValue: 2
    }
  ],
  clientInteraction: [
    {
      id: 'outstanding-queries',
      label: 'Outstanding Client Queries',
      value: 3,
      unit: 'count',
      icon: '❓',
      color: 'purple',
      description: 'count of pending requests',
      trend: 'down',
      trendValue: 1
    },
    {
      id: 'avg-client-response',
      label: 'Average Client Response Time',
      value: 1.2,
      unit: 'days',
      icon: '🌐',
      color: 'blue',
      description: 'highlights client-side bottlenecks',
      trend: 'down',
      trendValue: 0.3
    }
  ]
};
