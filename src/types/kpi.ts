export interface KPIMetric {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  icon: string;
  color: string;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
}

export interface KPICategory {
  id: string;
  title: string;
  metrics: KPIMetric[];
}

export interface GlobalKPIData {
  opinionMetrics: KPIMetric[];
  engagementVolume: KPIMetric[];
  resourceUtilization: KPIMetric[];
  riskQuality: KPIMetric[];
  clientInteraction: KPIMetric[];
}

export interface PerEngagementKPIData {
  engagementProgress: KPIMetric[];
  resourceBudget: KPIMetric[];
  opinionReporting: KPIMetric[];
  riskQuality: KPIMetric[];
  clientInteraction: KPIMetric[];
}
