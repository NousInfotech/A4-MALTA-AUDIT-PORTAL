import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Building2,
  Briefcase,
  FileText,
  Shield,
  Users,
  BarChart3,
  FolderOpen,
  Settings,
  UserCheck,
  Activity,
  Zap,
  Calendar,
  Clock,
  Target,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Plus,
  Eye,
  Edit,
  Trash2
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

interface ComprehensiveNavigationProps {
  className?: string;
}

export const ComprehensiveNavigation: React.FC<ComprehensiveNavigationProps> = ({ className }) => {
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
      href: "/employee",
      icon: BarChart3,
      color: "text-gray-800",
      bgColor: "bg-primary",
      percentage: 100,
      description: "Overview & Analytics"
    },
    {
      title: "Clients",
      href: "/employee/clients",
      icon: Building2,
      color: "text-gray-700",
      bgColor: "bg-primary",
      percentage: 75,
      description: "Client Management",
      subPages: [
        { title: "All Clients", href: "/employee/clients", icon: Building2, color: "text-gray-700", bgColor: "bg-primary", percentage: 75, description: "View all clients" },
        { title: "Add Client", href: "/employee/clients/new", icon: Plus, color: "text-gray-700", bgColor: "bg-primary", percentage: 0, description: "Add new client" },
        { title: "Client Reports", href: "/employee/clients/reports", icon: FileText, color: "text-gray-700", bgColor: "bg-primary", percentage: 60, description: "Client analytics" }
      ]
    },
    {
      title: "Engagements",
      href: "/employee/engagements",
      icon: Briefcase,
      color: "text-gray-600",
      bgColor: "bg-gray-700",
      percentage: 85,
      description: "Audit Engagements",
      subPages: [
        { title: "All Engagements", href: "/employee/engagements", icon: Briefcase, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 85, description: "View all engagements" },
        { title: "Create Engagement", href: "/employee/engagements/new", icon: Plus, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 0, description: "Create new engagement" },
        { title: "Active Projects", href: "/employee/engagements/active", icon: Target, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 90, description: "Active projects" },
        { title: "Completed", href: "/employee/engagements/completed", icon: Clock, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 70, description: "Completed work" }
      ]
    },
    {
      title: "Library",
      href: "/employee/library",
      icon: FolderOpen,
      color: "text-gray-500",
      bgColor: "bg-gray-600",
      percentage: 60,
      description: "Document Library",
      subPages: [
        { title: "All Documents", href: "/employee/library", icon: FolderOpen, color: "text-gray-500", bgColor: "bg-gray-600", percentage: 60, description: "Browse documents" },
        { title: "Upload Files", href: "/employee/library/upload", icon: Plus, color: "text-gray-500", bgColor: "bg-gray-600", percentage: 0, description: "Upload new files" },
        { title: "Templates", href: "/employee/library/templates", icon: FileText, color: "text-gray-500", bgColor: "bg-gray-600", percentage: 80, description: "Document templates" }
      ]
    },
    {
      title: "ISQM",
      href: "/employee/isqm",
      icon: Shield,
      color: "text-gray-800",
      bgColor: "bg-primary",
      percentage: 45,
      description: "Quality Management",
      badge: "New",
      subPages: [
        { title: "Questionnaire", href: "/employee/isqm", icon: Shield, color: "text-gray-800", bgColor: "bg-primary", percentage: 45, description: "Quality assessment" },
        { title: "Reports", href: "/employee/isqm/reports", icon: BarChart3, color: "text-gray-800", bgColor: "bg-primary", percentage: 30, description: "Quality reports" },
        { title: "Compliance", href: "/employee/isqm/compliance", icon: Target, color: "text-gray-800", bgColor: "bg-primary", percentage: 65, description: "Compliance status" }
      ]
    },
    {
      title: "KYC",
      href: "/employee/kyc",
      icon: UserCheck,
      color: "text-gray-700",
      bgColor: "bg-primary",
      percentage: 70,
      description: "Know Your Client",
      badge: "New",
      subPages: [
        { title: "KYC Forms", href: "/employee/kyc", icon: UserCheck, color: "text-gray-700", bgColor: "bg-primary", percentage: 70, description: "Client verification" },
        { title: "Due Diligence", href: "/employee/kyc/due-diligence", icon: Eye, color: "text-gray-700", bgColor: "bg-primary", percentage: 55, description: "Due diligence checks" },
        { title: "Risk Assessment", href: "/employee/kyc/risk", icon: Shield, color: "text-gray-700", bgColor: "bg-primary", percentage: 40, description: "Risk evaluation" }
      ]
    },
    {
      title: "Accounts & Finance",
      href: "/employee/accounts",
      icon: Zap,
      color: "text-gray-600",
      bgColor: "bg-gray-700",
      percentage: 80,
      description: "Financial Data",
      subPages: [
        { title: "Financial Reports", href: "/employee/accounts", icon: Zap, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 80, description: "Financial overview" },
        { title: "Banking", href: "/employee/accounts/banking", icon: Building2, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 75, description: "Banking details" },
        { title: "Transactions", href: "/employee/accounts/transactions", icon: Activity, color: "text-gray-600", bgColor: "bg-gray-700", percentage: 85, description: "Transaction history" }
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
    <div className={cn("bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30", className)}>
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

      {/* Quick Actions Footer */}
      {/* <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300">Quick Actions</h4>
          <span className="text-xs text-gray-500">{navigationItems.length} sections</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {navigationItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={`quick-${item.href}`}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                  "hover:scale-105 hover:shadow-lg",
                  item.bgColor,
                  "text-white"
                )}
              >
                <Icon className="h-3 w-3" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </div> */}
    </div>
  );
};
