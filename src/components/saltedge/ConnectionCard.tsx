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
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200';
      case 'inactive':
        return 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200';
      case 'error':
        return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border-red-200';
      default:
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200';
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
        className="group bg-white/80 backdrop-blur-sm border border-blue-100/50 hover:border-blue-300/50 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden cursor-pointer"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        <CardHeader className="relative pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors duration-300">
                  {connection.provider_name}
                </CardTitle>
                <CardDescription className="text-slate-600 font-medium">
                  {connection.provider_code}
                </CardDescription>
              </div>
            </div>
            <Badge 
              variant={getStatusBadgeVariant(connection.status)} 
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${getStatusStyle(connection.status)}`}
            >
              {connection.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl">
              <Calendar className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600 font-semibold uppercase">Created</p>
                <p className="text-sm font-semibold text-slate-700">
                  {formatDateTime(connection.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl">
              <Shield className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-green-600 font-semibold uppercase">Last Success</p>
                <p className="text-sm font-semibold text-slate-700">
                  {formatDateTime(connection.last_success_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl">
              <span className="text-sm font-medium text-slate-600">Connection ID:</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-slate-700 truncate max-w-[150px] cursor-help font-mono">
                    {connection.id.slice(0, 8)}...
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{connection.id}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl">
              <span className="text-sm font-medium text-slate-600">Country:</span>
              <span className="text-sm font-semibold text-slate-700">{connection.country_code}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl">
              <span className="text-sm font-medium text-slate-600">Daily Refresh:</span>
              <Badge 
                variant={connection.daily_refresh ? 'outline' : 'secondary'}
                className={`rounded-xl px-3 py-1 text-xs font-semibold ${
                  connection.daily_refresh 
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200' 
                    : 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-600 border-slate-200'
                }`}
              >
                {connection.daily_refresh ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>

        <CardFooter className="relative flex justify-end gap-3 p-6 pt-4">
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-2xl px-4 py-2 border-blue-200 hover:bg-blue-50 text-blue-700 hover:text-blue-800 transition-all duration-300"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          <Button 
            size="sm"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-4 py-2"
          >
            <Settings className="h-4 w-4 mr-2" />
            Manage
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
};

export default ConnectionCard;