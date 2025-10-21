// @ts-nocheck
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { EnhancedLoader } from "@/components/ui/enhanced-loader";
import { Link, useSearchParams, useNavigate } from "react-router-dom"; // Import useNavigate
import PbcUpload from "./components/PbcUpload";
import KycUpload from "./components/KycUpload";

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

  // Get the active tab from URL parameters
  const activeTab = searchParams.get("tab") || "pending";

  useEffect(() => {
    const fetchClientData = async () => {
      try {
        setLoading(true);
        const allEngagements = await engagementApi.getAll();
        const clientFiltered = allEngagements.filter(
          (e) => e.clientId === user?.id
        );
        setClientEngagements(clientFiltered);

        const promises = clientFiltered.map((e) =>
          documentRequestApi.getByEngagement(e._id).catch(() => [])
        );
        const arrays = await Promise.all(promises);
        console.log("allredocreqs", arrays);
        const allRequests = arrays.flat();
        console.log("All requests:", allRequests);
        console.log("KYC requests:", allRequests.filter((r) => r.category === "kyc"));
        console.log("Client engagements:", clientFiltered);
        console.log("Current user ID:", user?.id);
        
        // Temporary: Check all KYC requests in the system
        try {
          const allKYCRequests = await documentRequestApi.getAll();
          const kycOnly = allKYCRequests.filter((r) => r.category === "kyc");
          console.log("ALL KYC requests in system:", kycOnly);
          console.log("KYC requests by clientId:", kycOnly.map(k => ({ id: k._id, clientId: k.clientId, engagement: k.engagement })));
        } catch (error) {
          console.log("Could not fetch all KYC requests:", error);
        }
        
        setAllRequests(allRequests);
      } catch (err) {
        console.error(err);
        toast({
          title: "Error",
          description: "Failed to fetch requests",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchClientData();
  }, [user, toast]);

  const pendingRequests = allRequests.filter((r) => r.status === "pending");
  const completedRequests = allRequests.filter((r) => r.status === "completed");
  const pbcRequests = allRequests.filter((r) => r.category === "pbc");
  const kycRequests = allRequests.filter((r) => r.category === "kyc");

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
  console.log("allRequests", allRequests);
  console.log("PBCRequests", pbcRequests);

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900 mb-2 animate-fade-in">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          {" "}
          {/* Add onValueChange */}
          <TabsList className="bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl p-1">
            <TabsTrigger
              value="pending"
              className="rounded-xl data-[state=active]:bg-gray-800 data-[state=active]:text-white"
            >
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="rounded-xl data-[state=active]:bg-gray-800 data-[state=active]:text-white"
            >
              Completed ({completedRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="pbc"
              className="rounded-xl data-[state=active]:bg-gray-800 data-[state=active]:text-white"
            >
              PBC ({pbcRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="kyc"
              className="rounded-xl data-[state=active]:bg-gray-800 data-[state=active]:text-white"
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
                        className="bg-gray-800 text-white border-gray-800"
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
                        className="bg-gray-700 text-white border-gray-700"
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
                                  onClick={() => {
                                    if (doc.url) {
                                      console.log('Opening document:', {
                                        name: doc.name,
                                        url: doc.url,
                                        type: doc.type
                                      });
                                      
                                      // Check if it's a PDF file
                                      if (doc.url.toLowerCase().includes('.pdf') || doc.name.toLowerCase().endsWith('.pdf')) {
                                        // For PDFs, open in a new tab
                                        window.open(doc.url, '_blank');
                                      } else {
                                        // For other files, try to download or open
                                        const link = document.createElement('a');
                                        link.href = doc.url;
                                        link.download = doc.name;
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
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

                    const promises = clientFiltered.map((e) =>
                      documentRequestApi.getByEngagement(e._id).catch(() => [])
                    );
                    const arrays = await Promise.all(promises);
                    setAllRequests(arrays.flat());
                  } catch (err) {
                    console.error(err);
                  }
                };
                fetchClientData();
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
