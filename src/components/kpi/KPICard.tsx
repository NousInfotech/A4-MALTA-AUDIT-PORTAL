import { KPIMetric } from '../../types/kpi';
import { TrendingUp, TrendingDown, Minus, ClipboardList, Clock, FileText, Shield, MessageSquare, Users, AlertTriangle, CheckCircle, Globe, Calendar, Home, Flag, CheckSquare, PenTool, BarChart3, Link as LinkIcon } from 'lucide-react';

// Icon mapping from emoji strings to Lucide React icons
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  '📋': ClipboardList,
  '🔄': Clock,
  '⏳': Clock,
  '📅': Calendar,
  '⏱️': Clock,
  '👥': Users,
  '📄': FileText,
  '🏠': Home,
  '⚠️': AlertTriangle,
  '🚩': Flag,
  '✅': CheckSquare,
  '📝': PenTool,
  '❓': MessageSquare,
  '🌐': Globe,
  '✓': CheckSquare,
  '▲': AlertTriangle,
  '✗': AlertTriangle,
  '🏢': Home,
  '📈': TrendingUp,
  '📁': FileText,
  '📊': BarChart3,
  '⏰': Clock,
  '🔗': LinkIcon,
  '⬜': CheckSquare,
  '🔴': AlertTriangle,
};

interface KPICardProps {
  metric: KPIMetric;
}

export function KPICard({ metric }: KPICardProps) {
  const IconComponent = iconMap[metric.icon] || FileText;
  
  return (
    <div className="p-4 rounded-xl border-2 bg-blue-50 border-blue-200 text-blue-800">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconComponent className="h-5 w-5" />
          <h3 className="font-semibold text-sm">{metric.label}</h3>
        </div>
      </div>
      
      <div className="mb-2">
        <span className="text-2xl font-bold">
          {metric.value}
          {metric.unit && <span className="text-sm font-normal ml-1">{metric.unit}</span>}
        </span>
      </div>
      
      {metric.description && (
        <p className="text-xs opacity-75">{metric.description}</p>
      )}
    </div>
  );
}

interface KPISectionProps {
  title: string;
  metrics: KPIMetric[];
  icon?: string;
}

export function KPISection({ title, metrics, icon }: KPISectionProps) {
  const SectionIcon = icon ? iconMap[icon] || ClipboardList : ClipboardList;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SectionIcon className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <KPICard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}
