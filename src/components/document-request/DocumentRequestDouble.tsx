import React from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, Download, FileEdit, FileUp, Upload, RefreshCw, Trash2, Eraser, File } from "lucide-react";
import {
  DocumentRequestDocumentMultiple,
  MultipleDocumentItem,
} from "./types";

interface UploadingMultipleState {
  documentRequestId?: string;
  multipleDocumentId?: string;
  itemIndex?: number;
}

interface DeleteDialogPayload {
  open: boolean;
  type?: 'document' | 'multipleItem' | 'multipleGroup' | 'request';
  documentRequestId?: string;
  multipleDocumentId?: string;
  itemIndex?: number;
  documentName?: string;
}

interface DocumentRequestMultipleProps {
  /** ID of the parent document request */
  requestId: string;
  /** Array of grouped (multi) documents */
  multipleDocuments: DocumentRequestDocumentMultiple[];
  /** Uploading state coming from the parent, used to show spinners/disable inputs */
  uploadingState?: UploadingMultipleState | null;
  /**
   * Called when user selects one or more files for a grouped document.
   * This should typically use the backend `uploadMultipleDocuments` endpoint.
   * itemIndex is optional - if provided, uploads to that specific item, otherwise finds first pending item.
   */
  onUploadMultiple: (
    requestId: string,
    multipleDocumentId: string,
    files: FileList,
    itemIndex?: number
  ) => void | Promise<void>;
  /** Called when user clicks "Clear" button to clear file only for a specific item */
  onClearMultipleItem?: (
    requestId: string,
    multipleDocumentId: string,
    itemIndex: number,
    itemLabel: string
  ) => void | Promise<void>;
  /** Called when user clicks "Delete" icon (confirm dialog handled in parent) */
  onRequestDeleteDialog?: (payload: DeleteDialogPayload) => void;
  /** Called when user wants to clear all files in a multiple document group */
  onClearMultipleGroup?: (
    requestId: string,
    multipleDocumentId: string,
    groupName: string
  ) => void | Promise<void>;
  /** Called when user wants to download all files from a multiple document group */
  onDownloadMultipleGroup?: (
    requestId: string,
    multipleDocumentId: string,
    groupName: string,
    items: MultipleDocumentItem[]
  ) => void | Promise<void>;
  isDisabled?: boolean;
}

const DocumentRequestDouble: React.FC<DocumentRequestMultipleProps> = ({
  requestId,
  multipleDocuments,
  uploadingState,
  onUploadMultiple,
  onClearMultipleItem,
  onRequestDeleteDialog,
  onClearMultipleGroup,
  onDownloadMultipleGroup,
  isDisabled,
}) => {
  const { toast } = useToast();

  if (!multipleDocuments || multipleDocuments.length === 0) {
    return null;
  }

  const renderTypeBadge = (type: string | any) => {
    const typeStr = typeof type === "string" ? type : type?.type || "direct";

    return typeStr === "template" ? (
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
    );
  };

  const renderItemStatus = (item: MultipleDocumentItem) => {
    return (
      <Badge variant="outline" className="text-gray-600 border-gray-300">
        {typeof item.status === "string"
          ? item.status
          : String(item.status || "pending")}
      </Badge>
    );
  };

  return (
    <div className="space-y-3 mt-4">
      {multipleDocuments.map((group) => {
        const groupType =
          typeof group.type === "string"
            ? group.type
            : (group as any).type?.type || "direct";

        const isUploading =
          uploadingState?.documentRequestId === requestId &&
          uploadingState?.multipleDocumentId === group._id;

        return (
          <div
            key={group._id}
            className="p-3 bg-white rounded-lg border border-gray-200 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                {groupType === "template" ? (
                  <FileEdit className="h-5 w-5 text-gray-600 mt-1" />
                ) : (
                  <FileUp className="h-5 w-5 text-gray-600 mt-1" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{group.name}</p>
                    {renderTypeBadge(groupType)}
                  </div>
                  {group.instruction && (
                    <p className="text-xs text-gray-600">{group.instruction}</p>
                  )}
                </div>
              </div>
              
              {/* Group-level action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Download All button - download all uploaded files in the group */}
                {group.multiple && group.multiple.some((item) => item.url) && onDownloadMultipleGroup && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const uploadedItems = group.multiple.filter((item) => item.url);
                      if (uploadedItems.length > 0) {
                        onDownloadMultipleGroup(requestId, group._id, group.name, uploadedItems);
                      } else {
                        toast({
                          title: "No Files to Download",
                          description: "No uploaded files found in this group",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="border-green-300 hover:bg-green-50 hover:text-green-800 text-green-700 h-8 px-3"
                    title="Download All Files"
                    disabled={isDisabled}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="text-xs">Download All</span>
                  </Button>
                )}

                {/* Clear All button - clear all uploaded files in the group */}
                {group.multiple && group.multiple.some((item) => item.url) && onClearMultipleGroup && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onClearMultipleGroup(requestId, group._id, group.name);
                    }}
                    className="border-yellow-300 hover:bg-yellow-50 hover:text-yellow-800 text-yellow-700 h-8 px-2 text-xs"
                    title="Clear All Uploaded Files"
                    disabled={isDisabled}
                  >
                    <Eraser className="h-4 w-4 mr-1" />
                    <span className="text-xs">Clear All</span>
                  </Button>
                )}

                {/* Delete Group button - delete the entire multiple document group */}
                {onRequestDeleteDialog && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onRequestDeleteDialog({
                        open: true,
                        type: 'multipleGroup',
                        documentRequestId: requestId,
                        multipleDocumentId: group._id,
                        documentName: group.name,
                      })
                    }
                    className="border-red-300 hover:bg-red-50 hover:text-red-800 text-red-700 h-8 px-2 text-xs"
                    title="Delete Entire Group"
                    disabled={isDisabled}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    <span className="text-xs">Delete Document</span>
                  </Button>
                )}
              </div>
            </div>
          

            {/* Individual items */}
            {group.multiple && group.multiple.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {group.multiple.map((item, index) => {
                  const templateUrl = (item as any).template?.url as string | undefined;
                  const isItemUploading =
                    uploadingState?.documentRequestId === requestId &&
                    uploadingState?.multipleDocumentId === group._id &&
                    uploadingState?.itemIndex === index;

                  return (
                  <div
                    key={`${group._id}-${index}`}
                    className="flex items-center justify-between gap-3 border-2 p-3 rounded-md"
                  >
                    <div className="flex-1">
                      <p className="text-md">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.template?.instruction}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        {renderItemStatus(item)}
                        {item.uploadedAt && (
                          <span>
                            Uploaded:{" "}
                            {(() => {
                              const date = new Date(item.uploadedAt);
                              return isNaN(date.getTime())
                                ? "N/A"
                                : format(date, "MMM dd, yyyy HH:mm");
                            })()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Single file upload input for items without uploaded file (works for both direct and template types) */}
                      {!item.url && (
                        <label className={`cursor-pointer ${isDisabled ? 'cursor-not-allowed opacity-50' : ''}`}>
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Create a FileList-like object with single file for onUploadMultiple
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(file);
                                // Pass the item index so the file is uploaded to this specific item
                                onUploadMultiple(requestId, group._id, dataTransfer.files, index);
                              }
                              e.target.value = "";
                            }}
                            disabled={isItemUploading || isDisabled}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-300 hover:bg-blue-50 hover:text-blue-800 text-blue-700 h-8 px-3"
                            title="Upload Document"
                            disabled={isItemUploading || isDisabled}
                            asChild
                          >
                            <span>
                              {isItemUploading ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Upload />
                                  Upload
                                </>
                              )}
                            </span>
                          </Button>
                        </label>
                      )}

                      {/* Template download button - only visible when template URL exists */}
                      
                      {/* Uploaded file actions – only if item.url exists (works for both direct and template types) */}
                      {item.url && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(item.url!, "_blank")}
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
                                const response = await fetch(item.url!);
                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement("a");
                                link.href = url;
                                link.download = item.uploadedFileName || item.label;
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
                            title="Download Uploaded Document"
                            disabled={isDisabled}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {/* Clear (reset) only the uploaded file, keep requirement row (works for both direct and template types) */}
                      {onClearMultipleItem && item.url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onClearMultipleItem(requestId, group._id, index, item.label)}
                          className="border-yellow-300 hover:bg-yellow-50 hover:text-yellow-800 text-yellow-700 h-8 px-2 text-xs"
                          title="Clear Uploaded File"
                          disabled={isDisabled}
                        >
                          Clear
                        </Button>
                      )}
                       
                       {templateUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-amber-300 hover:bg-amber-50 hover:text-amber-700 text-amber-700"
                          title="Download Template"
                          disabled={isDisabled}
                          asChild
                        >
                          <a
                            href={templateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-sm ${isDisabled ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            <File/>
                          </a>
                        </Button>
                      )}


                      {/* Full delete of document item (handled via dialog in parent) */}
                      {onRequestDeleteDialog && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            onRequestDeleteDialog({
                              open: true,
                              type: 'multipleItem',
                              documentRequestId: requestId,
                              multipleDocumentId: group._id,
                              itemIndex: index,
                              documentName: item.label,
                            })
                          }
                          className="border-red-300 hover:bg-red-50 hover:text-red-800 text-red-700 h-8 w-8 p-0"
                          title="Delete Document Item"
                          disabled={isDisabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );})}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DocumentRequestDouble;