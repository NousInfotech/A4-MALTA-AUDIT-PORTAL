// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { engagementApi, documentRequestApi } from "@/services/api";
import {
  Upload,
  FileText,
  Clock,
  CheckCircle,
  Download,
  Calendar,
  Loader2,
  User,
  ArrowLeft,
  Paperclip,
  Search,
  Filter,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { Link, useSearchParams, useNavigate } from "react-router-dom"; // Import useNavigate
import PbcUpload from "./components/PbcUpload";
import KycUpload from "./components/KycUpload";
import { EngagementKYC } from "../employee/EngagementKYC";

export const DocumentRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams(); // Get setSearchParams
  const navigate = useNavigate(); // Initialize useNavigate
  const [clientEngagements, setClientEngagements] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState({});
  const [uploadComments, setUploadComments] = useState({});
  const [kycSearchTerm, setKycSearchTerm] = useState("");
  const [kycDateFilter, setKycDateFilter] = useState("all"); // "all", "recent", "old"

  // Get the active tab from URL parameters
  const activeTab = searchParams.get("tab") || "pending";

  const hasFetched = useRef(false);

  const fetchClientData = useCallback(async (showLoading = true, force = false) => {
    // Prevent fetching if we already have data and not forcing
    // Also check if we have already fetched successfully to avoid repeated fetches on re-renders
    if (!force && (hasFetched.current || (allRequests.length > 0 && clientEngagements.length > 0))) {
      if (showLoading) setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      const allEngagements = await engagementApi.getAll();
      const clientFiltered = allEngagements.filter(
        (e) => e.clientId === user?.id
      );
      setClientEngagements(clientFiltered);

      // Fetch document requests by company
      const promises = clientFiltered.map((e) =>
        documentRequestApi.getByCompany(e.companyId).catch(() => [])
      );
      const arrays = await Promise.all(promises);
      const engagementRequests = arrays.flat();
      
      // Also fetch all KYC requests for this client directly
      let kycRequests = [];
      try {
        const allKYCRequests = await documentRequestApi.getAll();
        kycRequests = allKYCRequests.filter((r) => r.category === "kyc" && r.clientId === user?.id);
      } catch (error) {
        console.log("Could not fetch KYC requests directly:", error);
      }
      
      // Combine both sources and remove duplicates
      const allRequests = [...engagementRequests, ...kycRequests];
      const uniqueRequests = allRequests.filter((request, index, self) => 
        index === self.findIndex(r => r._id === request._id)
      );
      
      setAllRequests(uniqueRequests);
      hasFetched.current = true; // Mark as fetched
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Failed to fetch requests",
        variant: "destructive",
      });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [user, toast]); // Removed other dependencies to keep it stable

  useEffect(() => {
    if (user) fetchClientData(true, false);
  }, [user, fetchClientData]);

  // Filter requests for different tabs
  // Pending tab: Show ALL pending requests (including KYC)
  const pendingRequests = allRequests.filter((r) => r.status === "pending");
  
  // Completed tab: Show all completed requests (including KYC)
  const completedRequests = allRequests.filter((r) => r.status === "completed");
  
  // PBC tab: Show all PBC requests regardless of status
  const pbcRequests = allRequests.filter((r) => r.category === "pbc");
  
  // KYC tab: Show all KYC requests with search and date filtering
  const allKycRequests = allRequests.filter((r) => r.category === "kyc");
  
  // Filter KYC requests based on search term and date filter
  const kycRequests = allKycRequests.filter((request) => {
    try {
      // Search filter
      const matchesSearch = !kycSearchTerm.trim() || (() => {
        const searchLower = kycSearchTerm.toLowerCase();
        const engagementTitle = getEngagementTitle(request.engagement) || '';
        
        return (
          (request.description?.toLowerCase().includes(searchLower)) ||
          (request.name?.toLowerCase().includes(searchLower)) ||
          (engagementTitle.toLowerCase().includes(searchLower)) ||
          (request.status?.toLowerCase().includes(searchLower))
        );
      })();
      
      // Date filter
      const matchesDateFilter = (() => {
        if (kycDateFilter === "all") return true;
        
        const requestDate = new Date(request.requestedAt || request.createdAt);
        const now = new Date();
        
        // Set time to start of day for accurate date comparisons
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - (24 * 60 * 60 * 1000));
        const oneWeekAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        
        // Set request date to start of day for comparison
        const requestDateStart = new Date(requestDate.getFullYear(), requestDate.getMonth(), requestDate.getDate());
        
        switch (kycDateFilter) {
          case "today":
            return requestDateStart.getTime() === today.getTime();
          case "yesterday":
            return requestDateStart.getTime() === yesterday.getTime();
          case "week":
            return requestDateStart >= oneWeekAgo;
          case "30days":
            return requestDateStart >= thirtyDaysAgo;
          default:
            return true;
        }
      })();
      
      return matchesSearch && matchesDateFilter;
    } catch (error) {
      console.error('Error filtering KYC request:', error, request);
      return true; // Return true to show the request if there's an error
    }
  });

  const handleFileUpload = async (requestId, files) => {
    if (!files?.length) return;

    // Validate file sizes and types before upload
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "application/zip",
      "application/x-zip-compressed",
    ];

    for (const file of Array.from(files)) {
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 50MB. Please compress or split the file.`,
          variant: "destructive",
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} has an unsupported file type. Please use PDF, images, or Office documents.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (files.length > 10) {
      toast({
        title: "Too many files",
        description: "You can upload a maximum of 10 files at once.",
        variant: "destructive",
      });
      return;
    }

    setUploadingFiles((prev) => ({ ...prev, [requestId]: true }));

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("files", file));
      formData.append("markCompleted", "true"); // optional flag
      
      // Add comment if provided
      const comment = uploadComments[requestId] || "";
      if (comment.trim()) {
        formData.append("comment", comment.trim());
      }

      // Call the real upload endpoint
      console.log("📤 Uploading documents for request:", requestId);
      console.log(
        "📤 Files being uploaded:",
        Array.from(files).map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type,
        }))
      );

      const updatedReq = await documentRequestApi.uploadDocuments(
        requestId,
        formData
      );

      console.log("✅ Upload successful, updated request:", updatedReq);

      // Sync local state with response
      setAllRequests((prev) =>
        prev.map((req) => (req._id === requestId ? updatedReq : req))
      );

      // Clear the comment after successful upload
      setUploadComments((prev) => ({ ...prev, [requestId]: "" }));

      toast({
        title: "Documents uploaded successfully",
        description: `${files.length} file(s) sent to your auditor.`,
      });
    } catch (error: any) {
      console.error("Upload error:", error);

      let errorMessage = "Please try again.";

      if (error.message?.includes("FILE_TOO_LARGE")) {
        errorMessage =
          "One or more files are too large. Maximum size is 50MB per file.";
      } else if (error.message?.includes("TOO_MANY_FILES")) {
        errorMessage = "Too many files. Maximum 10 files allowed.";
      } else if (error.message?.includes("INVALID_FILE_TYPE")) {
        errorMessage = "One or more files have unsupported file types.";
      } else if (
        error.message?.includes("Network error") ||
        error.message?.includes("Failed to fetch")
      ) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploadingFiles((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const getEngagementTitle = (id) =>
    clientEngagements.find((e) => e._id === id)?.title || "Unknown Engagement";

  const getCompanyName = (request) => {
    // 1. Direct population
    if (request?.company?.name) return request.company.name;
    
    // 2. Via engagement lookup
    const engagementId = request?.engagement?._id || request?.engagement;
    const engagement = clientEngagements.find(e => e._id === engagementId);
    if (engagement?.company?.name) return engagement.company.name;

    // 3. Via company ID lookup (scan engagements for matching company)
    const companyId = request?.company?._id || request?.company;
    if (companyId) {
        const found = clientEngagements.find(e => 
            (e.company?._id === companyId) || (e.companyId === companyId)
        );
        if (found?.company?.name) return found.company.name;
    }
    
    return "Unknown Company";
  };

  // Function to handle tab changes and update URL
  const handleTabChange = (newTabValue: string) => {
    setSearchParams({ tab: newTabValue });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <EnhancedLoader variant="pulse" size="lg" text="Loading..." />
      </div>
    );
  }

  // Safety check for user
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h3>
          <p className="text-gray-600">Please log in to view document requests.</p>
        </div>
      </div>
    );
  }
  // console.log("allRequests", allRequests);
  // console.log("PBCRequests", pbcRequests);
  // console.log("kycRequests", kycRequests);
  // console.log("pendingRequests", pendingRequests);
  // console.log("completedRequests", completedRequests);
  // console.log("loading state:", loading);
  // console.log("user:", user);

  return (
    <div className="min-h-screen  bg-brand-body p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-brand-body mb-2 animate-fade-in">
                Document Requests
              </h1>
              <p className="text-gray-700 animate-fade-in-delay">
                View and respond to document requests from your auditors
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 transition-all duration-300 rounded-xl"
            >
              <Link to="/client">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
      {false && <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
            <div className="flex items-center justify-between mb-4">
              <Clock className="h-6 w-6 text-gray-800" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">
                {pendingRequests.length}
              </p>
              <p className="text-sm text-gray-700">Pending Requests</p>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="h-6 w-6 text-gray-800" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">
                {completedRequests.length}
              </p>
              <p className="text-sm text-gray-700">Completed</p>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 hover:bg-white/70 transition-all duration-300 shadow-lg shadow-gray-300/30">
            <div className="flex items-center justify-between mb-4">
              <FileText className="h-6 w-6 text-gray-800" />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-semibold text-gray-900">
                {completedRequests.reduce(
                  (acc, req) => acc + (req.documents?.length || 0),
                  0
                )}
              </p>
              <p className="text-sm text-gray-700">Files Uploaded</p>
            </div>
          </div>
        </div>}

         {false && <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          {" "}
          {/* Add onValueChange */}
          <TabsList className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-1">
            <TabsTrigger
              value="pending"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Completed ({completedRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="pbc"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              PBC ({pbcRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="kyc"
              className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              KYC ({kycRequests.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-6">
            {pendingRequests.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  All caught up!
                </h3>
                <p className="text-gray-600">
                  You have no pending document requests at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingRequests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.description}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Engagement: {getEngagementTitle(request.engagement)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-primary text-primary-foreground border-gray-800"
                      >
                        Pending
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-700 border-gray-200"
                          >
                            {request.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Requested:{" "}
                            {new Date(request.requestedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-gray-50">
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-gray-800 mx-auto mb-2" />
                          <Label
                            htmlFor={`file-${request._id}`}
                            className="cursor-pointer"
                          >
                            <span className="text-sm font-medium text-gray-900">
                              Click to upload files
                            </span>
                            <span className="text-sm text-gray-600 block">
                              or drag and drop
                            </span>
                          </Label>
                          <div className="mt-2 text-xs text-gray-500">
                            <p>Max 10 files, 50MB each</p>
                            <p>Supported: PDF, Images, Office docs, ZIP</p>
                          </div>
                          <Input
                            id={`file-${request._id}`}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(request._id, e.target.files)
                            }
                            disabled={uploadingFiles[request._id]}
                          />
                        </div>
                        
                        {/* Optional comment field */}
                        <div className="mt-4 space-y-2">
                          <Label htmlFor={`comment-${request._id}`} className="text-sm font-medium text-gray-700">
                            Add a comment (Optional)
                          </Label>
                          <Input
                            id={`comment-${request._id}`}
                            type="text"
                            placeholder="Add any notes about these documents..."
                            value={uploadComments[request._id] || ""}
                            onChange={(e) =>
                              setUploadComments((prev) => ({
                                ...prev,
                                [request._id]: e.target.value,
                              }))
                            }
                            disabled={uploadingFiles[request._id]}
                            className="text-sm"
                          />
                          <div className="text-xs text-gray-500">
                            Optional: Add any notes or context about the documents you're uploading.
                          </div>
                        </div>

                        {uploadingFiles[request._id] && (
                          <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm text-blue-600 font-medium">
                              Uploading files...
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-6">
            {completedRequests.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No completed requests yet
                </h3>
                <p className="text-gray-600">
                  Your completed document submissions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {completedRequests.map((request) => (
                  <div
                    key={request._id}
                    className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.description}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Engagement: {getEngagementTitle(request.engagement)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="bg-gray-700 text-primary-foreground border-gray-700"
                      >
                        Completed
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-gray-100 text-gray-700 border-gray-200"
                          >
                            {request.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>
                            Completed:{" "}
                            {request.completedAt
                              ? new Date(
                                  request.completedAt
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                      </div>

                      {request.documents && request.documents.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 text-gray-900">
                            Uploaded Documents:
                          </h4>
                          <div className="space-y-3">
                            {request.documents.map((doc, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 transition-all duration-300 hover:shadow-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-gray-800" />
                                  <span className="text-sm font-medium text-gray-900">
                                    {doc.name}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={async () => {
                                    if (doc.url) {
                                      try {
                                        // Use uploadedFileName if available, otherwise fall back to doc.name
                                        const actualFileName = doc.uploadedFileName || doc.name;
                                        const fileExtension = actualFileName.split('.').pop()?.toLowerCase() || '';
                                        
                                        console.log('Opening document:', {
                                          name: doc.name,
                                          uploadedFileName: doc.uploadedFileName,
                                          actualFileName,
                                          fileExtension,
                                          url: doc.url
                                        });
                                        
                                        // For PDFs, open in a new tab to view directly
                                        if (fileExtension === 'pdf') {
                                          window.open(doc.url, '_blank');
                                          return;
                                        }

                                        // For other files, download with proper filename and extension
                                        const response = await fetch(doc.url);
                                        if (!response.ok) {
                                          throw new Error('Failed to fetch document');
                                        }

                                        const blob = await response.blob();
                                        
                                        // Create a new blob with the correct MIME type
                                        const mimeTypes: Record<string, string> = {
                                          'pdf': 'application/pdf',
                                          'doc': 'application/msword',
                                          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                                          'xls': 'application/vnd.ms-excel',
                                          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                                          'jpg': 'image/jpeg',
                                          'jpeg': 'image/jpeg',
                                          'png': 'image/png',
                                          'gif': 'image/gif',
                                          'txt': 'text/plain',
                                          'zip': 'application/zip',
                                        };
                                        const mimeType = mimeTypes[fileExtension] || 'application/octet-stream';
                                        const typedBlob = new Blob([blob], { type: mimeType });
                                        const downloadUrl = window.URL.createObjectURL(typedBlob);
                                        
                                        const link = document.createElement('a');
                                        link.href = downloadUrl;
                                        link.download = actualFileName; // Use the actual filename with extension
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        
                                        // Clean up the object URL
                                        window.URL.revokeObjectURL(downloadUrl);
                                        
                                      } catch (error) {
                                        console.error('Error downloading document:', error);
                                        // Fallback: open in new tab
                                        window.open(doc.url, '_blank');
                                      }
                                    } else {
                                      console.error('No URL found for document:', doc);
                                    }
                                  }}
                                  className="border-gray-300 hover:bg-gray-100 text-gray-700 hover:text-gray-900 rounded-xl"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          {/* New PBC Tab Content */}
          <TabsContent value="pbc" className="space-y-6">
            <PbcUpload
              pbcRequests={pbcRequests}
              getEngagementTitle={getEngagementTitle}
              handleFileUpload={handleFileUpload}
              uploadingFiles={uploadingFiles}
            />
          </TabsContent>
          {/* New KYC Tab Content */}
          <TabsContent value="kyc" className="space-y-6">
            {/* KYC Search and Filter Bar */}
            <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-6 shadow-lg shadow-gray-300/30">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                    <Input
                      placeholder="Search KYC document requests..."
                      value={kycSearchTerm}
                      onChange={(e) => {
                        try {
                          console.log('Search term changed:', e.target.value);
                          setKycSearchTerm(e.target.value);
                        } catch (error) {
                          console.error('Error updating search term:', error);
                        }
                      }}
                      className="pl-10 w-full border-gray-300 focus:border-gray-500 rounded-xl"
                    />
                  </div>
                </div>
                
                {/* Date Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={kycDateFilter} onValueChange={setKycDateFilter}>
                    <SelectTrigger className="w-32 border-gray-300 focus:border-gray-500 rounded-xl">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="yesterday">Yesterday</SelectItem>
                      <SelectItem value="week">Past Week</SelectItem>
                      <SelectItem value="30days">Past 30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Results Count */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">
                    {kycRequests?.length || 0} of {allKycRequests?.length || 0} requests
                  </span>
                </div>
              </div>
              
              {/* Clear Filters Button */}
              {(kycSearchTerm.trim() || kycDateFilter !== "all") && (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setKycSearchTerm("");
                      setKycDateFilter("all");
                    }}
                    className="border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>

            {/* KYC Requests Content */}
            {kycRequests && kycRequests.length > 0 ? (
              <KycUpload
              kycRequests={kycRequests}
              getEngagementTitle={getEngagementTitle}
              handleFileUpload={handleFileUpload}
              uploadingFiles={uploadingFiles}
              onRequestUpdate={() => {
                // Refresh the data after upload
                const fetchClientData = async () => {
                  try {
                    const allEngagements = await engagementApi.getAll();
                    const clientFiltered = allEngagements.filter(
                      (e) => e.clientId === user?.id
                    );
                    setClientEngagements(clientFiltered);

                    // Fetch document requests by engagement
                    const promises = clientFiltered.map((e) =>
                      documentRequestApi.getByEngagement(e._id).catch(() => [])
                    );
                    const arrays = await Promise.all(promises);
                    const engagementRequests = arrays.flat();
                    
                    // Also fetch all KYC requests for this client directly
                    let kycRequests = [];
                    try {
                      const allKYCRequests = await documentRequestApi.getAll();
                      kycRequests = allKYCRequests.filter((r) => r.category === "kyc" && r.clientId === user?.id);
                    } catch (error) {
                      console.log("Could not fetch KYC requests directly:", error);
                    }
                    
                    // Combine both sources and remove duplicates
                    const allRequests = [...engagementRequests, ...kycRequests];
                    const uniqueRequests = allRequests.filter((request, index, self) => 
                      index === self.findIndex(r => r._id === request._id)
                    );
                    
                    setAllRequests(uniqueRequests);
                  } catch (err) {
                    console.error(err);
                  }
                };
                fetchClientData();
              }}
            />
            ) : (
              <div className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-lg shadow-gray-300/30">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Search className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {kycSearchTerm.trim() || kycDateFilter !== "all" 
                    ? 'No matching KYC requests found' 
                    : 'No KYC requests available'
                  }
                </h3>
                <p className="text-gray-600 mb-4">
                  {kycSearchTerm.trim() 
                    ? `No KYC document requests match your search for "${kycSearchTerm}".`
                    : kycDateFilter !== "all"
                    ? `No KYC document requests found for the selected time period.`
                    : 'You have no KYC document requests at the moment.'
                  }
                </p>
                {(kycSearchTerm.trim() || kycDateFilter !== "all") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setKycSearchTerm("");
                      setKycDateFilter("all");
                    }}
                    className="border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>}

        {/* <h1 className="text-lg text-red-500 text-center underline">Under Development</h1> */}
        {/* KYC Component */}
        {clientEngagements.length > 0 ? (
           <EngagementKYC 
             companyId={clientEngagements[0].companyId} 
             clientId={user?.id}
             showStatusManagement={false}
             deleteRequest={false}
           />
        ) : (
           <div className="flex justify-center p-12">
             <div className="text-center">
               <p className="text-gray-500">No active engagement found.</p>
             </div>
           </div>
        )}
          
      </div>
    </div>
  );
};
