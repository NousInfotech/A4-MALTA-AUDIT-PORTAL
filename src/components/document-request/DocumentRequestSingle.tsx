import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, Download, Trash2, FileEdit, FileUp, Upload, RefreshCw, LayoutTemplate, LayoutGrid, File, Eraser } from "lucide-react";
import { DocumentRequestDocumentSingle } from "./types";

interface UploadingDocumentState {
  documentRequestId?: string;
  documentIndex?: number;
}

interface DeleteDialogPayload {
  open: boolean;
  type?: 'document' | 'request';
  documentRequestId?: string;
  documentIndex?: number;
  documentName?: string;
}

interface DocumentRequestSingleProps {
  /** ID of the parent document request */
  requestId: string;
  /** Array of single-document requirements */
  documents: DocumentRequestDocumentSingle[];
  /** Uploading state coming from the parent, used to show spinners/disable inputs */
  uploadingDocument?: UploadingDocumentState | null;
  /** Called when user selects a file for a specific document (single file only) */
  onUpload: (requestId: string, documentIndex: number, file: File) => void | Promise<void>;
  /** Called when user clicks "Delete" icon (confirm dialog handled in parent) */
  onRequestDeleteDialog?: (payload: DeleteDialogPayload) => void;
  /** Called when user clicks "Clear" button to clear file only */
  /** Called when user clicks "Clear" button to clear file only */
  onClearDocument?: (requestId: string, documentIndex: number, documentName: string) => void | Promise<void>;
  isDisabled?: boolean;
  deleteButton?: boolean;
}

const DocumentRequestSingle: React.FC<DocumentRequestSingleProps> = ({
  requestId,
  documents,
  uploadingDocument,
  onUpload,
  onRequestDeleteDialog,
  onClearDocument,
  isDisabled,
}) => {
  const { toast } = useToast();

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm bg-white rounded-lg">
        No documents in this request yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc, docIndex) => {
        const docType =
          typeof doc.type === "string" ? doc.type : (doc as any).type?.type || "direct";
        const isUploading =
          uploadingDocument?.documentRequestId === requestId &&
          uploadingDocument?.documentIndex === docIndex;

        return (
          <div
            key={doc._id ?? `${requestId}-${docIndex}`}
            className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
          >
            <div className="flex items-center gap-3">
              {docType === "template" ? (
                <FileEdit className="h-5 w-5 text-gray-600" />
              ) : (
                <FileUp className="h-5 w-5 text-gray-600" />
              )}
              <div>
                <p className="font-medium text-gray-900">{doc.name}</p>
                {doc.description && (
                  <p className="text-xs text-gray-600 mt-0.5">{doc.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {docType === "template" ? (
                    <Badge
                      variant="outline"
                      className="text-gray-600 border-gray-300 bg-gray-50"
                    >
                      Template
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-gray-600 border-gray-300 bg-gray-50"
                    >
                      Direct
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-gray-600 border-gray-300">
                    {typeof doc.status === "string"
                      ? doc.status
                      : String(doc.status || "pending")}
                  </Badge>
                  {doc.uploadedAt && (
                    <span className="text-xs text-gray-500">
                      Uploaded: {(() => {
                        const date = new Date(doc.uploadedAt);
                        return isNaN(date.getTime())
                          ? "N/A"
                          : format(date, "MMM dd, yyyy HH:mm");
                      })()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {!doc.url ? (
                // Single-file upload input
                <label className={`cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onUpload(requestId, docIndex, file);
                      }
                      e.target.value = "";
                    }}
                    disabled={isUploading || isDisabled}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-blue-300 hover:bg-blue-50 hover:text-blue-800 text-blue-700"
                    title="Upload Document"
                    disabled={isUploading || isDisabled}
                    asChild
                  >
                    <span>
                      {isUploading ? (
                        <RefreshCw className="animate-spin" />
                      ) : (
                        <>
                         
                          <Upload />
                          Upload
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(doc.url!, "_blank")}
                    className="border-blue-300 hover:bg-blue-50 hover:text-blue-800 text-blue-700 h-8 w-8 p-0"
                    title="View Document"
                    disabled={isDisabled}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const response = await fetch(doc.url!);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = doc.uploadedFileName || doc.name;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error("Download error:", error);
                        toast({
                          title: "Error",
                          description: "Failed to download document",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="border-green-300 hover:bg-green-50 hover:text-green-800 text-green-700 h-8 w-8 p-0"
                    title="Download Document"
                    disabled={isDisabled}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}

             

              {/* Clear (reset) only the uploaded file, keep requirement row */}
              {onClearDocument && doc.url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onClearDocument(requestId, docIndex, doc.name)}
                  className="border-yellow-300 hover:bg-yellow-50 hover:text-yellow-800 text-yellow-700 h-8 px-2 text-xs"
                  title="Clear Uploaded File"
                  disabled={isDisabled}
                >
                  Clear
                </Button>
              )}

               {/* Template download button - always available for template documents,
                  so users can re-open the original blank template even after upload. */}
              {docType === "template" && (doc as any).template?.url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-300 text-amber-700 hover:bg-amber-700/20 hover:text-amber-700"
                  title="View Template"
                  disabled={isDisabled}
                  asChild
                >
                  <a
                    href={(doc as any).template.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center h-8 w-8 p-0 ${isDisabled ? 'pointer-events-none opacity-50' : ''}`}
                  >  
                    <span><File/></span>
                  </a>
                  
                </Button>
              )}

              {/* Full delete of document slot (handled via dialog in parent) */}
              {onRequestDeleteDialog && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onRequestDeleteDialog({
                      open: true,
                      type: 'document',
                      documentRequestId: requestId,
                      documentIndex: docIndex,
                      documentName: doc.name,
                    })
                  }
                  className="border-red-300 hover:bg-red-50 hover:text-red-800 text-red-700 h-8 w-8 p-0"
                  title="Delete Document Requirement"
                  disabled={isDisabled}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentRequestSingle;