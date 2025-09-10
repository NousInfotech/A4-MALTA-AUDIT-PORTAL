// components/ConnectionCard.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, Calendar, Shield, Eye, Settings } from "lucide-react";
import { format, parseISO } from 'date-fns';

interface Connection {
  id: string;
  secret: string;
  provider_id: string;
  provider_code: string;
  provider_name: string;
  customer_id: string;
  next_refresh_possible_at: string;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'error'; // Added for example, adjust as per your actual data
  categorization: string;
  daily_refresh: boolean;
  store_credentials: boolean;
  country_code: string;
  last_success_at: string;
  show_consent_confirmation: boolean;
  last_consent_id: string;
  last_attempt: {
    id: string;
    finished: boolean;
    api_mode: string;
    api_version: string;
    locale: string;
    user_present: boolean;
    customer_last_logged_at: string | null;
    remote_ip: string;
    finished_recent: boolean;
    partial: boolean;
    automatic_fetch: boolean;
    daily_refresh: boolean;
    categorize: boolean;
    custom_fields: {};
    device_type: string;
    user_agent: string;
    exclude_accounts: any[];
    fetch_scopes: string[];
    from_date: string;
    to_date: string;
    interactive: boolean;
    store_credentials: boolean;
    include_natures: any | null;
    show_consent_confirmation: boolean;
    consent_id: string;
    fail_at: string | null;
    fail_message: string | null;
    fail_error_class: string | null;
    created_at: string;
    updated_at: string;
    success_at: string | null;
    unduplication_strategy: string;
    last_stage: {
      id: string;
      name: string;
      interactive_html: string | null;
      interactive_fields_names: string | null;
      interactive_fields_options: string | null;
      created_at: string;
      updated_at: string;
    };
  };
}

interface ConnectionCardProps {
  connection: Connection;
  onSelect: (connection:any) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ connection, onSelect }) => {
  const getStatusBadgeVariant = (status: Connection['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusStyle = (status: Connection['status']) => {
    switch (status) {
      case 'active':
        return 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-green-300 shadow-green-100';
      case 'inactive':
        return 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 border-amber-300 shadow-amber-100';
      case 'error':
        return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-300 shadow-red-100';
      default:
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-300 shadow-blue-100';
    }
  };

  const getStatusIcon = (status: Connection['status']) => {
    switch (status) {
      case 'active':
        return <Shield className="h-3 w-3" />;
      case 'inactive':
        return <Calendar className="h-3 w-3" />;
      case 'error':
        return <Settings className="h-3 w-3" />;
      default:
        return <Building2 className="h-3 w-3" />;
    }
  };

  const formatDateTime = (isoString: string | null) => {
    if (!isoString) return 'N/A';
    try {
      return format(parseISO(isoString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error("Error parsing date:", isoString, error);
      return 'Invalid Date';
    }
  };

  return (
    <TooltipProvider>
      <Card 
        onClick={() => onSelect(connection)} 
        className="group bg-white border border-gray-200 hover:border-blue-300 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden cursor-pointer w-full max-w-sm"
      >
        {/* Header */}
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold text-gray-900 truncate">
                {connection.provider_name}
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                {connection.provider_code}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="space-y-4">
          {/* Status Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">CREATED</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDateTime(connection.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <Shield className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs font-medium text-green-600 uppercase tracking-wide">LAST SUCCESS</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDateTime(connection.last_success_at)}
                </p>
              </div>
            </div>
          </div>

          {/* Connection Details */}
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Connection ID:</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-mono text-gray-900 cursor-help">
                    {connection.id.slice(0, 8)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{connection.id}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Country:</span>
              <span className="text-sm font-semibold text-gray-900">{connection.country_code}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Daily Refresh:</span>
              <Badge 
                variant="secondary"
                className={`text-xs px-2 py-1 ${
                  connection.daily_refresh 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {connection.daily_refresh ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>

        {/* Footer */}
        <CardFooter className="flex  flex-col justify-between items-center pt-4 border-t border-gray-100 px-4 pb-4">
          <div className="flex mb-2 items-center gap-2 flex-shrink-0">
            <div className={`w-2 h-2 rounded-full ${
              connection.status === 'active' ? 'bg-green-500' : 
              connection.status === 'inactive' ? 'bg-yellow-500' : 
              connection.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm font-medium text-gray-600 capitalize">{connection.status}</span>
          </div>
          
          <div className="flex gap-1.5 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              className="text-xs px-2 py-1.5 h-7 min-w-0 flex-shrink-0"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1.5 h-7 min-w-0 flex-shrink-0"
            >
              <Settings className="h-3 w-3 mr-1" />
              Manage
            </Button>
          </div>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
};

export default ConnectionCard;