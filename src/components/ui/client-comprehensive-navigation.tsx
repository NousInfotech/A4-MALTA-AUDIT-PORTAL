import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Briefcase,
  FileText,
  Zap,
  CreditCard,
  Clock,
  CheckCircle,
  Upload,
  Eye,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Shield
} from 'lucide-react';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  percentage: number;
  description: string;
  subPages?: NavigationItem[];
  badge?: string;
}

interface ClientComprehensiveNavigationProps {
  className?: string;
}

export const ClientComprehensiveNavigation: React.FC<ClientComprehensiveNavigationProps> = ({ className }) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggleExpanded = (itemTitle: string) => {
    setExpandedItems(prev => 
      prev.includes(itemTitle) 
        ? prev.filter(item => item !== itemTitle)
        : [...prev, itemTitle]
    );
  };

  const navigationItems: NavigationItem[] = [
    {
      title: "Dashboard",
      href: "/client/dashboard",
      icon: BarChart3,
      color: "text-gray-800",
      bgColor: "bg-primary",
      percentage: 100,
      description: "Overview & Analytics"
    },
    {
      title: "Engagements",
      href: "/client/engagements",
      icon: Briefcase,
      color: "text-gray-700",
      bgColor: "bg-primary",
      percentage: 75,
      description: "Your Audit Engagements",
      subPages: [
        { title: "All Engagements", href: "/client/engagements", icon: Briefcase, color: "text-gray-700", bgColor: "bg-primary", percentage: 75, description: "View all engagements" },
        { title: "Active Projects", href: "/client/engagements?tab=active", icon: Clock, color: "text-gray-700", bgColor: "bg-primary", percentage: 90, description: "Active projects" },
        { title: "Completed", href: "/client/engagements?tab=completed", icon: CheckCircle, color: "text-gray-700", bgColor: "bg-primary", percentage: 70, description: "Completed work" }
      ]
    },
    {
      title: "Document Requests",
      href: "/client/requests",
      icon: FileText,
      color: "text-gray-600",
      bgColor: "bg-gray-700",
      percentage: 85,
      description: "Document Management",
      subPages: [
        { title: "All Requests", href: "/client/requests", icon: FileText, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 85, description: "View all requests" },
        { title: "Pending", href: "/client/requests?tab=pending", icon: Clock, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 60, description: "Pending uploads" },
        { title: "Completed", href: "/client/requests?tab=completed", icon: CheckCircle, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 90, description: "Completed uploads" },
        { title: "PBC", href: "/client/requests?tab=pbc", icon: Upload, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 40, description: "Provided by Client" },
        { title: "KYC", href: "/client/requests?tab=kyc", icon: Shield, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 40, description: "Know Your Client" }
      ]
    },
    {
      title: "Account & Finance",
      href: "/client/accounts",
      icon: Zap,
      color: "text-gray-500",
      bgColor: "bg-gray-600",
      percentage: 80,
      description: "Financial Data Integration",
      subPages: [
        { title: "Financial Data", href: "/client/accounts", icon: FileText, color: "text-gray-500", bgColor: "bg-gray-600", percentage: 80, description: "Financial overview" },
        { title: "Apideck Integration", href: "/client/accounts?tab=apideck", icon: Zap, color: "text-gray-500", bgColor: "bg-gray-600", percentage: 75, description: "API integrations" },
        { title: "Banking Data", href: "/client/accounts?tab=saltedge", icon: CreditCard, color: "text-gray-500", bgColor: "bg-gray-600", percentage: 85, description: "Banking connections" }
      ]
    }
  ];

  const renderNavigationItem = (item: NavigationItem, isSubItem = false) => {
    const Icon = item.icon;
    const circumference = 2 * Math.PI * 20;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href);
    const hasSubPages = item.subPages && item.subPages.length > 0;
    const isExpanded = expandedItems.includes(item.title);

    return (
      <div key={item.href} className={cn("group", isSubItem && "ml-4")}>
        <Link
          to={item.href}
          className={cn(
            "flex items-center justify-between p-3 rounded-xl transition-all duration-300 hover:scale-[1.01]",
            isActive 
              ? "bg-gray-200/50 border border-gray-300/50 shadow-lg" 
              : "hover:bg-gray-100/30"
          )}
        >
          <div className="flex items-center space-x-3 flex-1">
            {/* Circular Progress Chart */}
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 44 44">
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-300"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={cn("transition-all duration-1000 ease-out", item.color)}
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Icon in center */}
              <div className={cn(
                "absolute inset-0 flex items-center justify-center rounded-full",
                item.bgColor
              )}>
                <Icon className={cn(
                  "h-5 w-5",
                  item.bgColor === "bg-primary" ? "text-primary-foreground" : "text-white"
                )} />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  {item.title}
                </h4>
                {item.badge && (
                  <span className="px-2 py-0.5 bg-primary/20 text-gray-800 text-xs rounded-full font-medium">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 truncate">{item.description}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs font-medium text-gray-700">{item.percentage}%</span>
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div 
                    className={cn("h-1 rounded-full transition-all duration-1000 ease-out", item.bgColor)}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          {hasSubPages && (
            <button
              onClick={(e) => {
                e.preventDefault();
                toggleExpanded(item.title);
              }}
              className="p-1 rounded-lg hover:bg-gray-200/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </button>
          )}
        </Link>

        {/* Sub Pages */}
        {hasSubPages && isExpanded && (
          <div className="mt-2 space-y-1">
            {item.subPages!.map((subItem) => renderNavigationItem(subItem, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30 animate-fade-in", className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quick Navigation</h3>
        <div className="flex items-center space-x-2">
          <Sparkles className="h-4 w-4 text-gray-600" />
          <span className="text-xs text-gray-600">All Pages</span>
        </div>
      </div>
      
      <div 
        className="space-y-2 max-h-96 overflow-y-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <style dangerouslySetInnerHTML={{
          __html: `
            .navigation-scroll::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
          `
        }} />
        <div className="navigation-scroll">
          {navigationItems.map((item) => renderNavigationItem(item))}
        </div>
      </div>
    </div>
  );
};
