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
import { Progress } from "@/components/ui/progress";
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
  const [individualFileUploadProgress, setIndividualFileUploadProgress] =
    useState({});

  const handleCurrentFileUpload = async (docId, reqId, file) => {
    setLoading(true); // This will set loading for all, consider per-file state if needed
    console.log(
      `Uploading file for document ID: ${docId}, Request ID: ${reqId}`
    );
    console.log(file);

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setIndividualFileUploadProgress((prev) => ({
        ...prev,
        [docId]: progress,
      }));
      if (progress >= 100) {
        clearInterval(interval);
        setLoading(false);
        // Call your actual upload logic here after simulation
        // await handleFileUpload(reqId, [file]);
        toast.success(`File "${file.name}" uploaded successfully!`);
      }
    }, 100);
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
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-extrabold text-brand-body mb-8 text-center">
        PBC Document Management
      </h2>
      {pbcRequests.length === 0 ? (
        <Card className="max-w-2xl mx-auto text-center border-dashed border-2 border-gray-300 bg-white shadow-lg transform hover:scale-[1.01] transition-all duration-300 ease-in-out">
          <CardHeader className="flex flex-col items-center justify-center p-8">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 shadow-inner group-hover:bg-blue-50 transition-colors duration-300">
              <FileText className="h-12 w-12 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              No PBC Requests Found
            </CardTitle>
            <CardDescription className="text-gray-600 mt-2 text-base">
              There are no document requests categorized as 'PBC' at the moment.
              Check back later or contact your administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <Button
              variant="outline"
              className="mt-4 px-6 py-3 text-base border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-300 ease-in-out group"
            >
              <Loader2 className="h-5 w-5 mr-2 animate-spin-slow opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8 grid-cols-1">
          {pbcRequests.map((request) => (
            <Card
              key={request._id}
              className="overflow-hidden shadow-xl border border-gray-100 transform hover:-translate-y-2 hover:shadow-2xl transition-all duration-500 ease-in-out group bg-white rounded-xl"
            >
              <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group-hover:from-blue-100 group-hover:to-indigo-200 transition-all duration-500">
                <div>
                  <CardTitle className="text-2xl font-extrabold text-gray-900 leading-tight group-hover:text-blue-800 transition-colors duration-300">
                    {getEngagementTitle(request.engagement)}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-700 mt-1 flex items-center gap-2 group-hover:text-indigo-700 transition-colors duration-300">
                    <Paperclip className="h-4 w-4 text-gray-500 group-hover:text-indigo-600 transition-colors duration-300 transform group-hover:rotate-45" />
                    Engagement: {getEngagementTitle(request.engagement)}
                  </CardDescription>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-blue-600 text-white text-xs px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider shadow-md group-hover:bg-blue-700 group-hover:scale-105 transition-all duration-300 ease-out"
                >
                  PBC
                </Badge>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2 transition-transform duration-300 hover:translate-x-1">
                    <Badge
                      variant="outline"
                      className="bg-purple-100 text-purple-700 border-purple-200 px-3 py-1 rounded-full text-xs font-medium hover:bg-purple-200 hover:border-purple-300 transition-all duration-300"
                    >
                      {request.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 transition-transform duration-300 hover:translate-x-1">
                    <Calendar className="h-4 w-4 text-gray-500 group-hover:text-blue-500 transition-colors duration-300" />
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

                <Separator className="bg-gray-200 group-hover:bg-blue-200 transition-colors duration-300" />

                {/* Requested Documents Section */}
                <div>
                  <p className="text-md font-semibold text-red-600 mb-3 flex items-center gap-2 group-hover:text-red-700 transition-colors duration-300">
                    <Download className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />{" "}
                    Pending Documents:
                  </p>
                  <ul className="space-y-3">
                    {request.documents
                      .filter((item) => item.status === "pending")
                      .map((doc, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between p-3 border border-red-200 bg-red-50 rounded-lg hover:shadow-md hover:border-red-300 hover:bg-red-100 transition-all duration-300 ease-in-out"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-red-500 group-hover:text-red-600 transition-colors duration-300" />
                            <span className="text-gray-800 font-medium group-hover:text-gray-900 transition-colors duration-300">
                              {doc.name}
                            </span>
                            <Badge
                              variant="destructive"
                              className="ml-2 text-xs group-hover:scale-105 transition-transform duration-300"
                            >
                              {doc.status}
                            </Badge>
                          </div>
                          <Label
                            htmlFor={`file-${doc._id}`}
                            className={`cursor-pointer text-blue-600 hover:text-blue-800 hover:bg-blue-100 px-3 py-1 rounded-md transition-all duration-300 ease-in-out flex items-center gap-1 ${
                              loading ? "opacity-70 cursor-not-allowed" : ""
                            }`}
                          >
                            {individualFileUploadProgress[doc._id] > 0 &&
                            individualFileUploadProgress[doc._id] < 100 ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                            )}
                            {individualFileUploadProgress[doc._id] > 0 &&
                            individualFileUploadProgress[doc._id] < 100
                              ? `Uploading (${
                                  individualFileUploadProgress[doc._id]
                                }%)`
                              : "Upload"}
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
                          {individualFileUploadProgress[doc._id] > 0 &&
                            individualFileUploadProgress[doc._id] < 100 && (
                              <Progress
                                value={individualFileUploadProgress[doc._id]}
                                className="w-24 h-2 ml-2"
                              />
                            )}
                        </li>
                      ))}
                  </ul>
                </div>

                {/* Uploaded Documents Section */}
                {request.documents.filter((item) => item.status === "uploaded")
                  .length > 0 && (
                  <div className="mt-6">
                    <p className="text-md font-semibold text-green-700 mb-3 flex items-center gap-2 group-hover:text-green-800 transition-colors duration-300">
                      <Download className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />{" "}
                      Uploaded Documents:
                    </p>
                    <ul className="space-y-3">
                      {request.documents
                        .filter((item) => item.status === "uploaded")
                        .map((doc, index) => (
                          <li
                            key={index}
                            className="flex items-center justify-between p-3 border border-green-200 bg-green-50 rounded-lg hover:shadow-md hover:border-green-300 hover:bg-green-100 transition-all duration-300 ease-in-out"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-green-600 group-hover:text-green-700 transition-colors duration-300" />
                              <span className="text-gray-800 font-medium group-hover:text-gray-900 transition-colors duration-300">
                                {doc.name}
                              </span>
                              <Badge className="ml-2 bg-green-500 text-white text-xs group-hover:bg-green-600 transition-colors duration-300">
                                {doc.status}
                              </Badge>
                            </div>
                            <a
                              href={doc.url} // Use doc.url as the href
                              download={doc.name} // Suggests the file name for download
                              target="_blank" // Opens in a new tab (optional, but good for downloads)
                              rel="noopener noreferrer" // Recommended for target="_blank"
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-md p-2 transition-all duration-300 ease-in-out group/button"
                                onClick={(e) => e.stopPropagation()} // Prevents potential parent click handlers
                              >
                                <Download className="h-4 w-4 mr-1 group-hover/button:scale-110 transition-transform duration-300" />
                                <span className="group-hover/button:underline">
                                  Download
                                </span>
                              </Button>
                            </a>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                <Separator className="bg-gray-200 group-hover:bg-blue-200 transition-colors duration-300" />

                {/* Conditional rendering for upload functionality based on status */}
                {request.status === "pending" ? (
                  <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50 text-center hover:bg-blue-100 transition-colors duration-300 ease-in-out group/upload cursor-pointer">
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="h-10 w-10 text-blue-600 mx-auto mb-3 group-hover/upload:scale-110 group-hover/upload:text-blue-700 transition-all duration-300 ease-out" />
                      <Label
                        htmlFor={`pbc-file-${request._id}`}
                        className="cursor-pointer"
                      >
                        <span className="text-base font-semibold text-gray-900 group-hover/upload:text-blue-800 transition-colors duration-300">
                          Click to upload multiple files
                        </span>
                        <span className="text-sm text-gray-600 block mt-1 group-hover/upload:text-blue-600 transition-colors duration-300">
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
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Uploading files...</span>
                        <Progress
                          value={uploadingFiles[request._id].progress || 0}
                          className="w-1/2 h-2"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  // This block handles already uploaded documents if the request status is not 'pending'
                  request.documents &&
                  request.documents.filter((doc) => doc.status === "uploaded")
                    .length > 0 && (
                    <div className="bg-green-50 p-5 rounded-xl border border-green-200 shadow-md transform hover:shadow-lg hover:border-green-300 transition-all duration-300 ease-in-out">
                      <h4 className="font-semibold text-lg text-green-800 mb-4 flex items-center gap-2 group-hover:text-green-900 transition-colors duration-300">
                        <FileText className="h-5 w-5 text-green-700 group-hover:scale-110 transition-transform duration-300" />{" "}
                        All Documents Uploaded
                      </h4>
                      <p className="text-gray-700 text-sm mb-4">
                        All required documents for this request have been
                        successfully uploaded.
                      </p>
                      <div className="space-y-3">
                        {request.documents
                          .filter((doc) => doc.status === "uploaded")
                          .map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md hover:border-gray-300 transition-all duration-300 ease-in-out"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-green-600 group-hover:text-green-700 transition-colors duration-300" />
                                <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
                                  {doc.name}
                                </span>
                              </div>
                              <a
                                href={doc.url} // Use doc.url as the href
                                download={doc.name} // Suggests the file name for download
                                target="_blank" // Opens in a new tab (optional, but good for downloads)
                                rel="noopener noreferrer" // Recommended for target="_blank"
                              >
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-md p-2 transition-all duration-300 ease-in-out group/download"
                                >
                                  <Download className="h-4 w-4 mr-1 group-hover/download:scale-110 transition-transform duration-300" />
                                  <span className="group-hover/download:underline">
                                    Download
                                  </span>
                                </Button>
                              </a>
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
