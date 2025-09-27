import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress"; // Assuming you might want to show upload progress for individual files
import {
  Calendar,
  Download,
  FileText,
  Loader2,
  Upload,
  Paperclip,
} from "lucide-react";
import React, { useState } from "react";
import { deleteDocumentRequestsbyId } from "@/lib/api/documentRequests";
import { toast } from "sonner";

function PbcUpload({
  pbcRequests,
  getEngagementTitle,
  handleFileUpload,
  uploadingFiles,
}) {
  const [loading, setLoading] = useState(false); // Consider managing loading state per file more granularly

  const handleCurrentFileUpload = async (docId, reqId, file) => {
    setLoading(true); // This will set loading for all, consider per-file state if needed
    console.log(
      `Uploading file for document ID: ${docId}, Request ID: ${reqId}`
    );
    console.log(file);
    // Call your actual upload logic here
    // await handleFileUpload(reqId, [file]); // Assuming handleFileUpload can take a single file or an array
    setLoading(false);
  };

  const deleteRequest = async (id: string) => {
    try {
      const res = await deleteDocumentRequestsbyId(id);
      if (res.success || res.message) {
        toast.success(res.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {pbcRequests.length === 0 ? (
        <Card className="max-w-2xl mx-auto text-center border-dashed border-2 border-gray-300 bg-gray-50 shadow-none">
          <CardHeader className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-10 w-10 text-gray-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              No PBC Requests Found
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              There are no document requests categorized as 'PBC' at the moment.
              Check back later or contact your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Optional: Add a button to refresh or go back */}
            <Button variant="outline" className="mt-4">
              Refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1">
          {pbcRequests.map((request) => (
            <Card
              key={request._id}
              className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out"
            >
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  {/* <Button
                    onClick={() => deleteRequest(request._id)}
                    variant="destructive"
                  >
                    delete
                  </Button> */}
                  <CardTitle className="text-xl font-extrabold text-gray-900 leading-tight">
                    {getEngagementTitle(request.engagement)}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-700 mt-1 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-gray-500" />
                    Engagement: {getEngagementTitle(request.engagement)}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider shadow-sm"
                >
                  PBC
                </Badge>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1 rounded-full text-xs font-medium"
                    >
                      {request.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>
                      Requested:{" "}
                      {request.documents && request.documents.length > 0
                        ? new Date(
                            request.documents.sort(
                              (a, b) =>
                                new Date(b.uploadedAt).getTime() -
                                new Date(a.uploadedAt).getTime()
                            )[0].uploadedAt
                          ).toLocaleDateString()
                        : new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Requested Documents Section */}
                <div>
                  <p className="text-md font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <Download className="h-5 w-5" /> Pending Documents:
                  </p>
                  <ul className="space-y-3">
                    {request.documents
                      .filter((item) => item.status === "pending")
                      .map((doc, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-red-500" />
                            <span className="text-gray-800 font-medium">
                              {doc.name}
                            </span>
                            <Badge
                              variant="destructive"
                              className="ml-2 text-xs"
                            >
                              {doc.status}
                            </Badge>
                          </div>
                          <Label
                            htmlFor={`file-${doc._id}`}
                            className={`cursor-pointer text-blue-600 hover:text-blue-800 transition-colors duration-200 flex items-center gap-1 ${
                              loading ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            Upload
                            <Input
                              id={`file-${doc._id}`}
                              type="file"
                              className="hidden"
                              onChange={(e) =>
                                e.target.files &&
                                handleCurrentFileUpload(
                                  doc._id,
                                  request._id,
                                  e.target.files[0]
                                )
                              }
                              disabled={loading}
                            />
                          </Label>
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Uploaded Documents Section */}
                {request.documents.filter((item) => item.status === "uploaded")
                  .length > 0 && (
                  <div className="mt-6">
                    <p className="text-md font-semibold text-green-700 mb-3 flex items-center gap-2">
                      <Download className="h-5 w-5" /> Uploaded Documents:
                    </p>
                    <ul className="space-y-3">
                      {request.documents
                        .filter((item) => item.status === "uploaded")
                        .map((doc, index) => (
                          <li
                            key={index}
                            className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-green-600" />
                              <span className="text-gray-800 font-medium">
                                {doc.name}
                              </span>
                              <Badge className="ml-2 bg-green-500 text-white text-xs">
                                {doc.status}
                              </Badge>
                            </div>
                            <a
                              href={doc.url} // Use doc.url as the href
                              download={doc.name} // Suggests the file name for download
                              className="text-gray-600 hover:text-blue-700 hover:bg-gray-100 rounded-md p-1"
                              target="_blank" // Opens in a new tab (optional, but good for downloads)
                              rel="noopener noreferrer" // Recommended for target="_blank"
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-600 hover:text-blue-700 hover:bg-gray-100 rounded-md p-1"
                                onClick={(e) => e.stopPropagation()} // Prevents potential parent click handlers
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </a>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                <Separator />

                {/* Conditional rendering for upload functionality based on status */}
                {request.status === "pending" ? (
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50 text-center hover:bg-blue-100 transition-colors duration-300 group">
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="h-8 w-8 text-blue-600 mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                      <Label
                        htmlFor={`pbc-file-${request._id}`}
                        className="cursor-pointer"
                      >
                        <span className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                          Click to upload multiple files
                        </span>
                        <span className="text-sm text-gray-600 block mt-1">
                          or drag and drop them here
                        </span>
                      </Label>
                      <div className="mt-3 text-xs text-gray-500 space-y-1">
                        <p>Max 10 files, 50MB each</p>
                        <p>
                          Supported: PDF, Images (JPG, PNG), Office docs (DOCX,
                          XLSX), ZIP
                        </p>
                      </div>
                      <Input
                        id={`pbc-file-${request._id}`}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) =>
                          e.target.files &&
                          handleFileUpload(request._id, e.target.files)
                        }
                        disabled={uploadingFiles[request._id]}
                      />
                    </div>

                    {uploadingFiles[request._id] && (
                      <div className="mt-5 flex items-center justify-center gap-2 text-blue-600 font-medium">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Uploading files...</span>
                        {/* Optional: Add a progress bar here */}
                        {/* <Progress value={50} className="w-1/2" /> */}
                      </div>
                    )}
                  </div>
                ) : (
                  // This block handles already uploaded documents if the request status is not 'pending'
                  request.documents &&
                  request.documents.filter((doc) => doc.status === "uploaded")
                    .length > 0 && (
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                      <h4 className="font-semibold text-lg text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-700" /> All
                        Documents Uploaded
                      </h4>
                      <p className="text-gray-600 text-sm mb-4">
                        All required documents for this request have been
                        successfully uploaded.
                      </p>
                      <div className="space-y-3">
                        {request.documents
                          .filter((doc) => doc.status === "uploaded")
                          .map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-gray-900">
                                  {doc.name}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-600 hover:text-blue-700 hover:bg-gray-100 rounded-md p-1"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default PbcUpload;

