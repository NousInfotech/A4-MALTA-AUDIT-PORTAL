import { useState, useEffect, useCallback } from 'react';
import { employeeLogApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export interface EmployeeLog {
  _id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  action: string;
  details: string;
  ipAddress?: string;
  location?: string;
  deviceInfo?: string;
  status: 'SUCCESS' | 'FAIL';
  timestamp: string;
}

export interface EmployeeLogFilters {
  employeeId?: string;
  action?: string;
  status?: 'SUCCESS' | 'FAIL';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeLogResponse {
  logs: EmployeeLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface EmployeeLogStatistics {
  summary: {
    totalLogs: number;
    successLogs: number;
    failedLogs: number;
    successRate: string;
  };
  actionBreakdown: Array<{
    _id: string;
    count: number;
  }>;
  topEmployees: Array<{
    _id: string;
    employeeName: string;
    count: number;
  }>;
  recentActivity: EmployeeLog[];
}

export const useEmployeeLogs = () => {
  const [logs, setLogs] = useState<EmployeeLog[]>([]);
  const [statistics, setStatistics] = useState<EmployeeLogStatistics | null>(null);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });

  const { toast } = useToast();

  // Fetch logs with filters
  const fetchLogs = useCallback(async (filters: EmployeeLogFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response: EmployeeLogResponse = await employeeLogApi.getAll({
        page: filters.page || 1,
        limit: filters.limit || 50,
        sortBy: filters.sortBy || 'timestamp',
        sortOrder: filters.sortOrder || 'desc',
        ...filters,
      });

      setLogs(response.logs);
      setPagination(response.pagination);
      
      console.log('✅ Employee logs fetched successfully:', response);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch employee logs';
      setError(errorMessage);
      console.error('❌ Failed to fetch employee logs:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch statistics
  const fetchStatistics = useCallback(async (filters?: {
    startDate?: string;
    endDate?: string;
    employeeId?: string;
  }) => {
    try {
      const stats: EmployeeLogStatistics = await employeeLogApi.getStatistics(filters);
      setStatistics(stats);
      console.log('✅ Employee log statistics fetched successfully:', stats);
    } catch (err: any) {
      console.error('❌ Failed to fetch statistics:', err);
      toast({
        title: "Error",
        description: "Failed to fetch statistics",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Fetch available actions
  const fetchAvailableActions = useCallback(async () => {
    try {
      const response = await employeeLogApi.getAvailableActions();
      setAvailableActions(response.actions);
      console.log('✅ Available actions fetched successfully:', response.actions);
    } catch (err: any) {
      console.error('❌ Failed to fetch available actions:', err);
    }
  }, []);

  // Create new log entry
  const createLog = useCallback(async (logData: {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    action: string;
    details: string;
    ipAddress?: string;
    location?: string;
    deviceInfo?: string;
    status: 'SUCCESS' | 'FAIL';
  }) => {
    try {
      const newLog = await employeeLogApi.create(logData);
      
      // Refresh logs to include the new entry
      await fetchLogs();
      
      toast({
        title: "Success",
        description: "Log entry created successfully",
      });
      
      return newLog;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create log entry';
      console.error('❌ Failed to create log entry:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [fetchLogs, toast]);

  // Update log entry
  const updateLog = useCallback(async (id: string, data: {
    details?: string;
    status?: 'SUCCESS' | 'FAIL';
  }) => {
    try {
      const updatedLog = await employeeLogApi.update(id, data);
      
      // Update the log in the local state
      setLogs(prevLogs => 
        prevLogs.map(log => 
          log._id === id ? { ...log, ...data } : log
        )
      );
      
      toast({
        title: "Success",
        description: "Log entry updated successfully",
      });
      
      return updatedLog;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update log entry';
      console.error('❌ Failed to update log entry:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  // Delete log entry
  const deleteLog = useCallback(async (id: string) => {
    try {
      await employeeLogApi.delete(id);
      
      // Remove the log from local state
      setLogs(prevLogs => prevLogs.filter(log => log._id !== id));
      
      toast({
        title: "Success",
        description: "Log entry deleted successfully",
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete log entry';
      console.error('❌ Failed to delete log entry:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  // Bulk delete logs
  const bulkDeleteLogs = useCallback(async (criteria: {
    logIds?: string[];
    employeeId?: string;
    action?: string;
    status?: 'SUCCESS' | 'FAIL';
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      const result = await employeeLogApi.bulkDelete(criteria);
      
      // Refresh logs to reflect the deletion
      await fetchLogs();
      
      toast({
        title: "Success",
        description: `${result.deletedCount} log entries deleted successfully`,
      });
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete log entries';
      console.error('❌ Failed to bulk delete logs:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [fetchLogs, toast]);

  // Export logs
  const exportLogs = useCallback(async (filters?: {
    employeeId?: string;
    action?: string;
    status?: 'SUCCESS' | 'FAIL';
    startDate?: string;
    endDate?: string;
    format?: 'csv' | 'json';
  }) => {
    try {
      const data = await employeeLogApi.exportLogs(filters);
      
      if (filters?.format === 'csv' || !filters?.format) {
        // Handle CSV download
        const csvContent = [
          ["ID", "Employee Name", "Employee Email", "Action", "Details", "IP Address", "Location", "Timestamp", "Device Info", "Status"],
          ...data.map((log: EmployeeLog) => [
            log._id,
            log.employeeName,
            log.employeeEmail,
            log.action,
            log.details || "",
            log.ipAddress || "",
            log.location || "",
            new Date(log.timestamp).toLocaleString(),
            log.deviceInfo || "",
            log.status || ""
          ])
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `employee-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      
      toast({
        title: "Success",
        description: "Logs exported successfully",
      });
      
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export logs';
      console.error('❌ Failed to export logs:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  // Load initial data
  useEffect(() => {
    fetchLogs();
    fetchStatistics();
    fetchAvailableActions();
  }, [fetchLogs, fetchStatistics, fetchAvailableActions]);

  return {
    logs,
    statistics,
    availableActions,
    loading,
    error,
    pagination,
    fetchLogs,
    fetchStatistics,
    fetchAvailableActions,
    createLog,
    updateLog,
    deleteLog,
    bulkDeleteLogs,
    exportLogs,
  };
};
