import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { FileText, Plus } from "lucide-react";
import {
  DocumentRequest as DocumentRequestType,
  DocumentRequestDocumentSingle,
  DocumentRequestDocumentMultiple,
} from "./types";
import DocumentRequestSingle from "./DocumentRequestSingle";
import DocumentRequestDouble from "./DocumentRequestDouble";
import { AddDocumentDialog } from "./AddDocumentDialog/AddDocumentDialog";

interface UploadingDocumentState {
  documentRequestId?: string;
  documentIndex?: number;
}

interface UploadingMultipleState {
  documentRequestId?: string;
  multipleDocumentId?: string;
}

interface DeleteDialogPayload {
  open: boolean;
  type?: 'document' | 'multipleItem' | 'request';
  documentRequestId?: string;
  documentIndex?: number;
  multipleDocumentId?: string;
  itemIndex?: number;
  documentName?: string;
}

interface DocumentRequestProps {
  request: DocumentRequestType;
  uploadingSingle?: UploadingDocumentState | null;
  uploadingMultiple?: UploadingMultipleState | null;
  onUploadSingle: (
    requestId: string,
    documentIndex: number,
    file: File
  ) => void | Promise<void>;
  onUploadMultiple: (
    requestId: string,
    multipleDocumentId: string,
    files: FileList,
    itemIndex?: number
  ) => void | Promise<void>;
  /** Delete whole document request */
  onDeleteRequest?: (requestId: string) => void | Promise<void>;
  /** Clear (reset) a single document slot – implemented via deleteDocument on backend */
  onClearDocument?: (
    requestId: string,
    documentIndex: number,
    documentName: string
  ) => void | Promise<void>;
  /** Clear (reset) a multiple document item – clears file only */
  onClearMultipleItem?: (
    requestId: string,
    multipleDocumentId: string,
    itemIndex: number,
    itemLabel: string
  ) => void | Promise<void>;
  onRequestDeleteDialog?: (payload: DeleteDialogPayload) => void;
  /** Called when documents are added to refresh the parent list */
  onDocumentsAdded?: () => void | Promise<void>;
  /** Engagement ID for adding documents */
  engagementId?: string;
  /** Client ID for adding documents */
  clientId?: string;
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
    items: any[]
  ) => void | Promise<void>;

  /** Optional flag to disable all actions (for when parent is updating) */
  isDisabled?: boolean;
}

const DocumentRequest: React.FC<DocumentRequestProps> = ({
  request,
  uploadingSingle,
  uploadingMultiple,
  onUploadSingle,
  onUploadMultiple,
   onDeleteRequest,
   onClearDocument,
  onClearMultipleItem,
  onRequestDeleteDialog,
  onDocumentsAdded,
  engagementId,
  clientId,
  onClearMultipleGroup,
  onDownloadMultipleGroup,
  isDisabled,
}) => {
  const [addDocumentDialogOpen, setAddDocumentDialogOpen] = useState(false);
  const {
    _id,
    category,
    description,
    comment,
    status,
    requestedAt,
    completedAt,
    documents,
    multipleDocuments,
  } = request;

  const statusLabel =
    typeof status === "string" ? status : String(status || "pending");

  const renderStatusBadge = () => (
    <Badge variant="outline" className="text-gray-600 border-gray-600 bg-gray-50">
      {statusLabel}
    </Badge>
  );

  const handleDocumentsAdded = async () => {
    if (onDocumentsAdded) {
      await onDocumentsAdded();
    }
  };

  return (
     <div>
      {/* <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base font-semibold text-gray-900">
                {category}
              </CardTitle>
              {renderStatusBadge()}
            </div>
            <p className="text-sm text-gray-600">{description}</p>
            {comment && (
              <p className="text-xs text-gray-500 mt-1">Comment: {comment}</p>
            )}
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
              <span>
                Requested:{" "}
                {(() => {
                  const dateStr = requestedAt || (request as any).createdAt;
                  if (!dateStr) return "N/A";
                  const date = new Date(dateStr);
                  return isNaN(date.getTime())
                    ? "N/A"
                    : format(date, "MMM dd, yyyy");
                })()}
              </span>
              {completedAt && (
                <span>
                  Completed:{" "}
                  {(() => {
                    const date = new Date(completedAt);
                    return isNaN(date.getTime())
                      ? "N/A"
                      : format(date, "MMM dd, yyyy");
                  })()}
                </span>
              )}
            </div>
          </div>

          {onDeleteRequest && (
            <div className="flex flex-col items-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => onDeleteRequest(_id)}
                disabled={isDisabled}
              >
                Delete Request
              </Button>
            </div>
          )}
        </div>
      </CardHeader> */}

      {/* Add Document Button */}
      {(engagementId || clientId) && ( 
        <div className="mb-4 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddDocumentDialogOpen(true)}
            className="border-blue-300 hover:bg-blue-50 hover:text-blue-800 text-blue-700"
            disabled={isDisabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      )}

        {/* Single-document section (one file per requirement) */}
        {Array.isArray(documents) && documents.length > 0 && (
          <DocumentRequestSingle
            requestId={_id}
            documents={documents as DocumentRequestDocumentSingle[]}
            uploadingDocument={uploadingSingle}
            onUpload={onUploadSingle}
            onRequestDeleteDialog={onRequestDeleteDialog}
            onClearDocument={onClearDocument}
            isDisabled={isDisabled}
          />
        )}

        {/* Multi-document section (multi-file upload) */}
        {Array.isArray(multipleDocuments) && multipleDocuments.length > 0 && (
          <DocumentRequestDouble
            requestId={_id}
            multipleDocuments={multipleDocuments as DocumentRequestDocumentMultiple[]}
            uploadingState={uploadingMultiple}
            onUploadMultiple={onUploadMultiple}
            onClearMultipleItem={onClearMultipleItem}
            onRequestDeleteDialog={onRequestDeleteDialog}
            onClearMultipleGroup={onClearMultipleGroup}
            onDownloadMultipleGroup={onDownloadMultipleGroup}
            isDisabled={isDisabled}
          />
        )}

        {/* Add Document Dialog */}
        {(engagementId || clientId) && (
          <AddDocumentDialog
            open={addDocumentDialogOpen}
            onOpenChange={setAddDocumentDialogOpen}
            documentRequestId={_id}
            engagementId={engagementId || ""}
            clientId={clientId || ""} 
            onSuccess={handleDocumentsAdded}
          />
        )}
     
      </div>
  );
};

export default DocumentRequest;