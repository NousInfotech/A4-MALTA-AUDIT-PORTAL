// Status values
export enum DocumentStatusEnum {
    PENDING = "pending",
    SUBMITTED = "submitted",
    APPROVED = "approved",
    REJECTED = "rejected",
  }
  
  export enum RequestStatusEnum {
    PENDING = "pending",
    SUBMITTED = "submitted",
    COMPLETED = "completed",
  }
  
  // Document type
  export enum DocumentTypeEnum {
    DIRECT = "direct",
    TEMPLATE = "template",
  }
  
  // Template info
  export interface Template {
    url?: string;
    instruction?: string;
  }
  
  // Upload info
  export interface UploadInfo {
    url?: string;
    uploadedFileName?: string;
    uploadedAt?: Date;
  }
  
  // Single document
  export interface DocumentRequestDocumentSingle extends UploadInfo {
    _id: string;
    name: string;
    type: DocumentTypeEnum;
    template?: Template;
    status: DocumentStatusEnum;
    comment?: string;
    description?: string;
  }
  
  // One item inside a multi-document set
  export interface MultipleDocumentItem extends UploadInfo {
    label: string;
    template?: Template;
    status: DocumentStatusEnum;
    comment?: string;
  }
  
  // Multi-document container
  export interface DocumentRequestDocumentMultiple {
    _id: string;
    name: string;
    type: DocumentTypeEnum;
    instruction?: string;
    multiple: MultipleDocumentItem[];
  }
  
  // Main document request
  export interface DocumentRequest {
    _id: string;
    engagement: string;
    clientId: string;
  
    name?: string;
    category: string;
    description: string;
  
    comment?: string;
    status: RequestStatusEnum;
  
    requestedAt: Date;
    completedAt?: Date;
  
    documents: DocumentRequestDocumentSingle[];
    multipleDocuments: DocumentRequestDocumentMultiple[];
  }
  