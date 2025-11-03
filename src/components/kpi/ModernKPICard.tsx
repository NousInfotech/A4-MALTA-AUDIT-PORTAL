import { KPIMetric } from '../../types/kpi';
import { TrendingUp, TrendingDown, Minus, ClipboardList, Clock, FileText, Shield, MessageSquare, Users, AlertTriangle, CheckCircle, Globe, Calendar, Home, Flag, CheckSquare, PenTool, BarChart3, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

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

interface ModernKPICardProps {
  metric: KPIMetric;
}

export function ModernKPICard({ metric }: ModernKPICardProps) {
  const IconComponent = iconMap[metric.icon] || FileText;
  
  // Calculate progress percentage for visual representation
  const getProgressValue = () => {
    if (typeof metric.value === 'number') {
      if (metric.unit === '%') return metric.value;
      if (metric.unit === 'count') {
        // Normalize count values to percentage (assuming max reasonable values)
        const maxValue = 100;
        return Math.min((metric.value / maxValue) * 100, 100);
      }
      if (metric.unit === 'days') {
        // For days, show inverse (fewer days = higher progress)
        const maxDays = 60;
        return Math.max(0, ((maxDays - metric.value) / maxDays) * 100);
      }
    }
    return 50; // Default progress
  };

  const getTrendIcon = () => {
    if (metric.trend === 'up') return <TrendingUp className="h-4 w-4 text-gray-600" />;
    if (metric.trend === 'down') return <TrendingDown className="h-4 w-4 text-gray-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (metric.trend === 'up') return 'text-gray-600';
    if (metric.trend === 'down') return 'text-gray-600';
    return 'text-gray-400';
  };

  const progressValue = getProgressValue();

  return (
    <Card className="group bg-white/60 backdrop-blur-md border border-white/30 hover:bg-white/70 rounded-2xl shadow-lg shadow-gray-300/30 hover:shadow-xl transition-all duration-300 overflow-hidden">
      <CardHeader className="relative pb-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-hover rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-gray-700">
                {metric.label}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            {metric.trendValue && (
              <span className={`text-xs font-semibold ${getTrendColor()}`}>
                {metric.trend === 'up' ? '+' : ''}{metric.trendValue}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative p-6">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {metric.value}
                {metric.unit && <span className="text-lg font-normal ml-1 text-gray-600">{metric.unit}</span>}
              </div>
              {metric.description && (
                <p className="text-xs text-gray-500">{metric.description}</p>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{Math.round(progressValue)}%</span>
            </div>
            <Progress 
              value={progressValue} 
              className="h-2 bg-gray-100"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ModernKPISectionProps {
  title: string;
  metrics: KPIMetric[];
  icon?: string;
  description?: string;
}

export function ModernKPISection({ title, metrics, icon, description }: ModernKPISectionProps) {
  const SectionIcon = icon ? iconMap[icon] || ClipboardList : ClipboardList;
  
  return (
    <div className="space-y-6">
      <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-hover rounded-xl flex items-center justify-center shadow-lg">
            <SectionIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {description && (
              <p className="text-gray-700 mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <ModernKPICard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}
