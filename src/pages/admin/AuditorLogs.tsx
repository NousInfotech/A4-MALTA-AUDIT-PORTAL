import React, { useState, useMemo } from 'react';
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
} from "lucide-react";
import { AuditorLog } from "@/lib/types/auditorLog";
import { format } from "date-fns";
import { Link } from "react-router-dom";

// Mock data generator
const generateMockAuditorLogs = (): AuditorLog[] => {
  const actions = [
    "LOGIN",
    "LOGOUT", 
    "UPLOAD_DOCUMENT",
    "VIEW_CLIENT_FILE",
    "CREATE_ENGAGEMENT",
    "UPDATE_ENGAGEMENT",
    "DELETE_DOCUMENT",
    "EXPORT_REPORT",
    "VIEW_DASHBOARD",
    "UPDATE_PROFILE",
    "CHANGE_PASSWORD",
    "VIEW_AUDIT_TRAIL",
    "APPROVE_DOCUMENT",
    "REJECT_DOCUMENT",
    "SEND_MESSAGE",
    "DOWNLOAD_FILE",
    "CREATE_CLIENT",
    "UPDATE_CLIENT",
    "VIEW_REPORTS",
    "SYSTEM_BACKUP"
  ];

  const auditorNames = [
    "John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis", 
    "David Wilson", "Lisa Anderson", "Robert Taylor", "Jennifer Martinez",
    "Christopher Lee", "Amanda Garcia", "Matthew Rodriguez", "Jessica White",
    "Daniel Thompson", "Ashley Jackson", "James Harris", "Michelle Clark"
  ];

  const auditorEmails = [
    "john.smith@auditfirm.com", "sarah.johnson@auditfirm.com", "michael.brown@auditfirm.com",
    "emily.davis@auditfirm.com", "david.wilson@auditfirm.com", "lisa.anderson@auditfirm.com",
    "robert.taylor@auditfirm.com", "jennifer.martinez@auditfirm.com", "christopher.lee@auditfirm.com",
    "amanda.garcia@auditfirm.com", "matthew.rodriguez@auditfirm.com", "jessica.white@auditfirm.com",
    "daniel.thompson@auditfirm.com", "ashley.jackson@auditfirm.com", "james.harris@auditfirm.com",
    "michelle.clark@auditfirm.com"
  ];

  const locations = [
    "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX", "Phoenix, AZ",
    "Philadelphia, PA", "San Antonio, TX", "San Diego, CA", "Dallas, TX", "San Jose, CA",
    "Austin, TX", "Jacksonville, FL", "Fort Worth, TX", "Columbus, OH", "Charlotte, NC"
  ];

  const deviceInfo = [
    "Chrome 120.0.0.0 on Windows 10", "Safari 17.1 on macOS 14.1", "Firefox 121.0 on Ubuntu 22.04",
    "Edge 120.0.0.0 on Windows 11", "Chrome 120.0.0.0 on macOS 14.1", "Safari 17.1 on iOS 17.1",
    "Chrome 120.0.0.0 on Android 14", "Firefox 121.0 on Windows 10", "Edge 120.0.0.0 on macOS 14.1"
  ];

  const details = [
    "Successfully logged into the system",
    "Uploaded financial statements for Q3 2023",
    "Viewed client ABC Corp engagement details",
    "Created new engagement for XYZ Ltd",
    "Updated engagement status to 'In Progress'",
    "Downloaded audit report PDF",
    "Exported client data to Excel",
    "Changed password for security update",
    "Viewed audit trail for engagement #12345",
    "Approved document submission",
    "Rejected document due to missing signatures",
    "Sent message to client regarding document request",
    "Created new client profile for TechStart Inc",
    "Updated client contact information",
    "Viewed quarterly reports dashboard",
    "Performed system backup operation",
    "Logged out after 2 hours of activity",
    "Accessed client file repository",
    "Generated compliance report",
    "Updated user profile information"
  ];

  const logs: AuditorLog[] = [];
  const now = new Date();

  for (let i = 0; i < 150; i++) {
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    const randomAuditorIndex = Math.floor(Math.random() * auditorNames.length);
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];
    const randomDevice = deviceInfo[Math.floor(Math.random() * deviceInfo.length)];
    const randomDetail = details[Math.floor(Math.random() * details.length)];
    
    // Generate random timestamp within last 30 days
    const randomDaysAgo = Math.floor(Math.random() * 30);
    const randomHoursAgo = Math.floor(Math.random() * 24);
    const randomMinutesAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date(now.getTime() - (randomDaysAgo * 24 * 60 * 60 * 1000) - (randomHoursAgo * 60 * 60 * 1000) - (randomMinutesAgo * 60 * 1000));

    // Generate random IP address
    const ipAddress = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    logs.push({
      id: `log-${i + 1}`,
      auditorId: `auditor-${randomAuditorIndex + 1}`,
      auditorName: auditorNames[randomAuditorIndex],
      auditorEmail: auditorEmails[randomAuditorIndex],
      action: randomAction,
      details: randomDetail,
      ipAddress: ipAddress,
      location: randomLocation,
      timestamp: timestamp,
      deviceInfo: randomDevice,
      status: Math.random() > 0.1 ? "SUCCESS" : "FAIL" // 90% success rate
    });
  }

  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export const AuditorLogs = () => {
  const [logs] = useState<AuditorLog[]>(generateMockAuditorLogs());
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditorLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  // Filter logs based on search and filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.auditorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.auditorEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.location?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;

      return matchesSearch && matchesAction && matchesStatus;
    });
  }, [logs, searchTerm, actionFilter, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, actionFilter, statusFilter]);

  // Get unique actions for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = [...new Set(logs.map(log => log.action))];
    return actions.sort();
  }, [logs]);

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

  const exportLogs = async () => {
    setLoading(true);
    try {
      // Simulate loading for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const csvContent = [
        ["ID", "Auditor Name", "Auditor Email", "Action", "Details", "IP Address", "Location", "Timestamp", "Device Info", "Status"],
        ...filteredLogs.map(log => [
          log.id,
          log.auditorName,
          log.auditorEmail,
          log.action,
          log.details || "",
          log.ipAddress || "",
          log.location || "",
          format(log.timestamp, "yyyy-MM-dd HH:mm:ss"),
          log.deviceInfo || "",
          log.status || ""
        ])
      ].map(row => row.join(",")).join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auditor-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

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
                  <img src="/logo.png" alt="Logo" className="h-10 w-10" />
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
                onClick={exportLogs}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-6 py-3 h-auto disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
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
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-5 w-5 mr-2" />
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
                <div className="text-2xl font-bold text-blue-600">{logs.length}</div>
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
                <div className="text-2xl font-bold text-green-600">{new Set(logs.map(log => log.auditorId)).size}</div>
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
                  {Math.round((logs.filter(log => log.status === "SUCCESS").length / logs.length) * 100)}%
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
                    {uniqueActions.map(action => (
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
                    <TableRow key={log.id} className="border-purple-100/50 hover:bg-purple-50/30 transition-colors duration-200 group">
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">
                            {log.auditorName}
                          </div>
                          <div className="text-sm text-slate-500">{log.auditorEmail}</div>
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
                            {format(log.timestamp, "MMM dd, yyyy")}
                          </div>
                          <div className="text-xs text-slate-500">
                            {format(log.timestamp, "HH:mm:ss")}
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
                                  <div className="text-lg font-semibold text-slate-800">{selectedLog.auditorName}</div>
                                  <div className="text-sm text-slate-600">{selectedLog.auditorEmail}</div>
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
                                    <span>{format(selectedLog.timestamp, "MMM dd, yyyy 'at' HH:mm:ss")}</span>
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

