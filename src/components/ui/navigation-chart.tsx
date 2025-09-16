import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  percentage: number;
  description: string;
}

interface NavigationChartProps {
  items: NavigationItem[];
  className?: string;
}

export const NavigationChart: React.FC<NavigationChartProps> = ({ items, className }) => {
  return (
    <div className={cn("bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-lg", className)}>
      <h3 className="text-lg font-semibold text-white mb-6">Quick Navigation</h3>
      
      <div className="grid grid-cols-2 gap-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          const circumference = 2 * Math.PI * 20; // radius = 20
          const strokeDasharray = circumference;
          const strokeDashoffset = circumference - (item.percentage / 100) * circumference;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className="group relative flex flex-col items-center p-4 rounded-xl hover:bg-gray-700/50 transition-all duration-300 hover:scale-105"
            >
              {/* Circular Progress Chart */}
              <div className="relative w-16 h-16 mb-3">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 44 44">
                  {/* Background circle */}
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    className="text-gray-600"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="22"
                    cy="22"
                    r="20"
                    stroke="currentColor"
                    strokeWidth="3"
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
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
              
              {/* Content */}
              <div className="text-center">
                <h4 className="text-sm font-semibold text-white group-hover:text-gray-200 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                <div className="mt-2 text-xs font-medium text-gray-300">
                  {item.percentage}%
                </div>
              </div>
              
              {/* Hover effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gray-700/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </Link>
          );
        })}
      </div>
      
      {/* Additional Navigation Tabs */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          {items.slice(0, 4).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={`tab-${item.href}`}
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
      </div>
    </div>
  );
};
