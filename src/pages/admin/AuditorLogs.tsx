import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  Download,
  Filter,
  Search,
  Eye,
  RefreshCw,
  FileText,
  User,
  Clock,
  MapPin,
  Monitor,
  Shield,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Activity,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { useEmployeeLogs, EmployeeLog, EmployeeLogFilters } from "@/hooks/useEmployeeLogs";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { EnhancedLoader } from "@/components/ui/enhanced-loader";

export const AuditorLogs = () => {
  const {
    logs,
    statistics,
    availableActions,
    loading,
    error,
    pagination,
    fetchLogs,
    fetchStatistics,
    exportLogs,
  } = useEmployeeLogs();

  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<EmployeeLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [exportLoading, setExportLoading] = useState(false);

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.employeeEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.location?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;

      return matchesSearch && matchesAction && matchesStatus;
    });
  }, [logs, searchTerm, actionFilter, statusFilter]);

  // Pagination logic for filtered results
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, statusFilter]);

  // Refresh data when filters change
  useEffect(() => {
    const filters: EmployeeLogFilters = {
      page: currentPage,
      limit: itemsPerPage,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    };

    if (actionFilter !== "all") filters.action = actionFilter;
    if (statusFilter !== "all") filters.status = statusFilter as 'SUCCESS' | 'FAIL';

    fetchLogs(filters);
  }, [currentPage, actionFilter, statusFilter, fetchLogs]);

  const getStatusBadge = (status?: string) => {
    if (status === "SUCCESS") {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    } else if (status === "FAIL") {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    return null;
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "LOGIN":
      case "LOGOUT":
        return <Shield className="h-4 w-4" />;
      case "UPLOAD_DOCUMENT":
      case "DOWNLOAD_FILE":
        return <FileText className="h-4 w-4" />;
      case "VIEW_CLIENT_FILE":
      case "VIEW_DASHBOARD":
      case "VIEW_REPORTS":
        return <Eye className="h-4 w-4" />;
      case "CREATE_ENGAGEMENT":
      case "UPDATE_ENGAGEMENT":
      case "CREATE_CLIENT":
      case "UPDATE_CLIENT":
        return <User className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleExportLogs = async () => {
    setExportLoading(true);
    try {
      const filters: any = {};
      if (actionFilter !== "all") filters.action = actionFilter;
      if (statusFilter !== "all") filters.status = statusFilter;
      if (searchTerm) {
        // Note: API doesn't support text search, so we'll export all and filter client-side
      }
      
      await exportLogs({ ...filters, format: 'csv' });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchLogs();
    fetchStatistics();
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 sm:h-[40vh]">
        <EnhancedLoader variant="pulse" size="lg" text="Loading auditor logs..." />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 space-y-8">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-indigo-600/10 rounded-3xl blur-3xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl p-8 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <img src="/logo.png" alt="Logo" className="h-12 w-12 object-cover rounded" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
                    Auditor Logs
                  </h1>
                  <p className="text-slate-600 mt-1 text-lg">
                    Monitor and track all auditor activities and system access
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleExportLogs}
                disabled={exportLoading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto disabled:opacity-50"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-purple-200 hover:bg-purple-50/50 text-purple-700 hover:text-purple-800 transition-all duration-300 rounded-2xl px-6 py-3 h-auto"
              >
                <Link to="/admin">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Horizontal Layout */}
      <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Logs */}
            <div className="group flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100/50 hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-bold text-blue-600">
                  {statistics?.summary?.totalLogs || logs.length}
                </div>
                <div className="text-sm text-slate-600 font-medium">Total Logs</div>
                <div className="text-xs text-slate-500">All time activities</div>
              </div>
            </div>

            {/* Active Auditors */}
            <div className="group flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100/50 hover:border-green-300/50 transition-all duration-300 hover:shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-bold text-green-600">
                  {statistics?.topEmployees?.length || new Set(logs.map(log => log.employeeId)).size}
                </div>
                <div className="text-sm text-slate-600 font-medium">Active Auditors</div>
                <div className="text-xs text-slate-500">Unique auditors</div>
              </div>
            </div>

            {/* Success Rate */}
            <div className="group flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-100/50 hover:border-yellow-300/50 transition-all duration-300 hover:shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-bold text-yellow-600">
                  {statistics?.summary?.successRate || 
                   (logs.length > 0 ? Math.round((logs.filter(log => log.status === "SUCCESS").length / logs.length) * 100) : 0)}%
                </div>
                <div className="text-sm text-slate-600 font-medium">Success Rate</div>
                <div className="text-xs text-slate-500">Successful actions</div>
              </div>
            </div>

            {/* Today's Activity */}
            <div className="group flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-100/50 hover:border-purple-300/50 transition-all duration-300 hover:shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300 shrink-0">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-bold text-purple-600">
                  {logs.filter(log => {
                    const today = new Date();
                    const logDate = new Date(log.timestamp);
                    return logDate.toDateString() === today.toDateString();
                  }).length}
                </div>
                <div className="text-sm text-slate-600 font-medium">Today's Activity</div>
                <div className="text-xs text-slate-500">Actions today</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <Filter className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Filters & Search</CardTitle>
                <CardDescription className="text-slate-600">Filter and search through auditor activity logs</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
              <Input
                placeholder="Search by auditor name, email, action, or details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full border-purple-200 focus:border-purple-400 rounded-2xl h-12 text-base"
              />
            </div>
            
            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Action Type</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full rounded-2xl border-purple-200 focus:border-purple-400 h-12">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {availableActions.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full rounded-2xl border-purple-200 focus:border-purple-400 h-12">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="SUCCESS">✅ Success</SelectItem>
                    <SelectItem value="FAIL">❌ Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setActionFilter("all");
                    setStatusFilter("all");
                    setCurrentPage(1);
                  }}
                  className="rounded-2xl border-purple-200 hover:bg-purple-50 text-purple-700 h-12 px-6"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(searchTerm || actionFilter !== "all" || statusFilter !== "all") && (
              <div className="flex flex-wrap gap-2 p-3 bg-purple-50 rounded-2xl border border-purple-100">
                <span className="text-sm font-medium text-purple-700">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                    Search: "{searchTerm}"
                  </Badge>
                )}
                {actionFilter !== "all" && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                    Action: {actionFilter}
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                    Status: {statusFilter}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-white/80 backdrop-blur-sm border border-purple-100/50 rounded-3xl shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">
                  Activity Logs ({filteredLogs.length} results)
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length}
                  </span>
                </CardTitle>
                <CardDescription className="text-slate-600">Detailed view of all auditor activities and system interactions</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="border-purple-100/50">
                  <TableHead className="text-slate-700 font-semibold">Auditor</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Action</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Details</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Location</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Timestamp</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Status</TableHead>
                  <TableHead className="text-slate-700 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-600">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <FileText className="h-8 w-8 text-purple-600" />
                      </div>
                      <p className="font-medium">
                        {searchTerm || actionFilter !== "all" || statusFilter !== "all"
                          ? "No logs found matching your criteria."
                          : "No logs found."}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLogs.map((log) => (
                    <TableRow key={log._id} className="border-purple-100/50 hover:bg-purple-50/30 transition-colors duration-200 group">
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">
                            {log.employeeName}
                          </div>
                          <div className="text-sm text-slate-500">{log.employeeEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center">
                            {getActionIcon(log.action)}
                          </div>
                          <span className="font-medium text-slate-700">{log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="max-w-xs">
                          <div className="text-slate-600 text-sm line-clamp-2" title={log.details}>
                            {log.details}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-1 text-slate-500">
                          <MapPin className="h-3 w-3" />
                          <span className="text-sm">{log.location}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-700">
                            {format(new Date(log.timestamp), "MMM dd, yyyy")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {format(new Date(log.timestamp), "HH:mm:ss")}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell className="py-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-purple-200 hover:bg-purple-50 text-purple-700 hover:text-purple-800 transition-all duration-200 hover:shadow-md"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Log Details
                            </DialogTitle>
                            <DialogDescription>
                              Complete information about this auditor activity
                            </DialogDescription>
                          </DialogHeader>
                          {selectedLog && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-slate-600">Auditor</label>
                                  <div className="text-lg font-semibold text-slate-800">{selectedLog.employeeName}</div>
                                  <div className="text-sm text-slate-600">{selectedLog.employeeEmail}</div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-600">Action</label>
                                  <div className="flex items-center gap-2">
                                    {getActionIcon(selectedLog.action)}
                                    <span className="text-lg font-semibold text-slate-800">{selectedLog.action}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium text-slate-600">Details</label>
                                <div className="text-slate-800 bg-slate-50 p-3 rounded-lg">
                                  {selectedLog.details}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-slate-600">Timestamp</label>
                                  <div className="flex items-center gap-1 text-slate-800">
                                    <Clock className="h-4 w-4" />
                                    <span>{format(new Date(selectedLog.timestamp), "MMM dd, yyyy 'at' HH:mm:ss")}</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-600">Status</label>
                                  <div className="mt-1">
                                    {getStatusBadge(selectedLog.status)}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium text-slate-600">IP Address</label>
                                  <div className="text-slate-800 font-mono text-sm bg-slate-50 p-2 rounded">
                                    {selectedLog.ipAddress || "N/A"}
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-600">Location</label>
                                  <div className="flex items-center gap-1 text-slate-800">
                                    <MapPin className="h-4 w-4" />
                                    <span>{selectedLog.location || "N/A"}</span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="text-sm font-medium text-slate-600">Device Information</label>
                                <div className="flex items-center gap-1 text-slate-800 bg-slate-50 p-3 rounded-lg">
                                  <Monitor className="h-4 w-4" />
                                  <span className="text-sm">{selectedLog.deviceInfo || "N/A"}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls */}
          {filteredLogs.length > itemsPerPage && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-purple-100/50 bg-gradient-to-r from-purple-50/30 to-indigo-50/30">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Rows per page:</span>
                <span className="font-medium">{itemsPerPage}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl border-purple-200 hover:bg-purple-50 text-purple-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`rounded-xl ${
                          currentPage === pageNum
                            ? "bg-purple-600 text-white hover:bg-purple-700"
                            : "border-purple-200 hover:bg-purple-50 text-purple-700"
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  {totalPages > 5 && currentPage < totalPages - 2 && (
                    <>
                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        className="rounded-xl border-purple-200 hover:bg-purple-50 text-purple-700"
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl border-purple-200 hover:bg-purple-50 text-purple-700 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

