// src/types/reviews_module/index.ts

// --- Enums ---
// UserRole is not directly from the ReviewWorkflow schema but good to keep
export type UserRole = 'client' | 'employee' | 'reviewer' | 'partner' | 'admin';

// ReviewStatus enum based on ReviewWorkflowSchema's 'status' field
export enum ReviewStatus {
  InProgress = 'in-progress',
  ReadyForReview = 'ready-for-review',
  UnderReview = 'under-review',
  Approved = 'approved',
  Rejected = 'rejected',
  SignedOff = 'signed-off',
  ReOpened = 're-opened',
}

// Exporting ReviewStatus as ReviewWorkflowStatus for clarity
export type ReviewWorkflowStatus = ReviewStatus;

// AuditItemType enum based on ReviewWorkflowSchema's 'itemType' field
export enum AuditItemType {
  Procedure = 'procedure',
  PlanningProcedure = 'planning-procedure',
  DocumentRequest = 'document-request',
  ChecklistItem = 'checklist-item',
  Pbc = 'pbc',
  Kyc = 'kyc',
  IsqmDocument = 'isqm-document',
  WorkingPaper = 'working-paper',
  ClassificationSection ='classification-section',
  
}

// ReviewPriority enum based on ReviewWorkflowSchema's 'priority' field
export enum ReviewPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

// --- Nested Interfaces ---

// Interface for notes within ReviewWorkflow
export interface ReviewWorkflowNote {
  text: string;
  addedBy: string; // User ID
  addedAt: Date;
}

// --- Main Interfaces ---

// Assuming Engagement interface
export interface Engagement {
  _id: string;
  clientId: string;
  title: string;
  yearEndDate: Date; // Changed to Date based on typical usage for dates
  status: 'draft' | 'active' | 'completed';
  // Add other relevant fields for an engagement
}

// Interface for a generic Audit Item.
// This is not the ReviewWorkflow itself, but potentially what the ReviewWorkflow references.
// It combines some fields from the item itself and some from its associated ReviewWorkflow.
export interface AuditItem {
  _id: string; // The _id of the actual audit item (e.g., Procedure._id)
  itemType: AuditItemType;
  engagement: string | Engagement; // Can be ID or populated object
  // Fields that might come from the actual item document (e.g., a Procedure)
  title: string;
  description: string;
  // Fields that typically come from the associated ReviewWorkflow document
  reviewStatus: ReviewStatus;
  reviewerId?: string; // Mapped from ReviewWorkflow.assignedReviewer
  reviewerName?: string; // Assuming this would be populated from reviewerId
  dueDate?: Date;
  isLocked?: boolean;
  signedOffBy?: string;
  signedOffAt?: Date;
  comments?: string; // Mapped from ReviewWorkflow.reviewComments or signOffComments
  // You might want to include the ReviewWorkflow _id here if you often access it directly
  reviewWorkflowId?: string;
  // Add any other relevant fields for an audit item
}


// Corrected and complete ReviewWorkflow interface
export interface ReviewWorkflow {
  _id: string; // Mongoose _id is always present
  itemType: AuditItemType; // Uses enum
  itemId: string; // Refers to the _id of the specific audit item
  engagement: string | Engagement; // Can be ObjectId string or populated Engagement object

  status: ReviewStatus; // Uses enum, has default but always present on fetched docs

  // Review assignment
  assignedReviewer?: string; // User ID
  assignedAt?: Date;

  // Review process
  submittedForReviewAt?: Date;
  submittedBy?: string; // User ID

  // Review completion
  reviewedAt?: Date;
  reviewedBy?: string; // User ID
  reviewComments?: string;

  // Sign-off process
  signedOffAt?: Date;
  signedOffBy?: string; // User ID
  signOffComments?: string;

  // Locking mechanism
  isLocked: boolean; // Has default: false in schema, so always present
  lockedAt?: Date;
  lockedBy?: string; // User ID

  // Re-opening tracking
  reopenedAt?: Date;
  reopenedBy?: string; // User ID
  reopenReason?: string;

  // Priority and urgency
  priority: ReviewPriority; // Uses enum, has default: 'medium' in schema, so always present
  dueDate?: Date;

  // Additional metadata
  tags?: string[]; // Array of strings
  notes?: ReviewWorkflowNote[]; // Array of nested notes

  // Version tracking
  version: number; // Has default: 1 in schema, so always present
  previousVersion?: number; // Only set after re-opening

  // Mongoose Timestamps - always present
  createdAt: Date;
  updatedAt: Date;

  // Virtuals (only present if populated from the backend)
  // The 'item' virtual can be any of the referenced types.
  // Using 'any' is flexible, but a union type would be more precise if all item interfaces are known.
  item?: any; // Represents the populated document of type itemType (e.g., Procedure, DocumentRequest)
}

export interface ReviewHistoryEntry {
  _id: string;
  itemType: AuditItemType;
  itemId: string;
  engagement: string;
  action: string; // e.g., 'signed-off', 'review-approved', 're-opened'
  performedBy: string; // User ID or Name
  performedAt: Date;
  previousStatus?: ReviewStatus;
  newStatus?: ReviewStatus;
  comments?: string;
  metadata?: Record<string, any>; // For additional contextual data
}

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  token: string;
}

// --- API Responses ---
// Generic data type for pagination results
export interface PaginatedResponse<T> {
  docs: T[]; // The actual array of documents (e.g., ReviewWorkflow[])
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage?: number;
  prevPage?: number;
  pagingCounter: number;
}

// API Response specific for a single workflow or array of workflows
export interface ApiResponse<T = ReviewWorkflow | ReviewWorkflow[]> { // Default to ReviewWorkflow
  success: boolean;
  message?: string;
  // Adjusted to use a generic 'data' property which can be T or PaginatedResponse<T>
  data?: T | PaginatedResponse<T extends (infer U)[] ? U : T>; // Allows single item, array, or paginated response
  error?: string;
  history?: ReviewHistoryEntry[]; // For responses that include history
  stats?: any; // Define a more specific type if needed for statistics
}

// Pagination interface for frontend components (often used for request parameters)
export interface PaginationRequest {
  page?: number;
  limit?: number;
  sortBy?: string; // e.g., 'createdAt:desc'
}

export interface ReviewWorkflowFilters extends PaginationRequest {
  status?: ReviewStatus; // Use enum for type safety
  engagementId?: string; // ObjectId string
  assignedReviewer?: string; // User ID
  itemType?: AuditItemType; // Use enum
  priority?: ReviewPriority; // Use enum
  dueDateFrom?: Date; // For date range filtering
  dueDateTo?: Date; // For date range filtering
  // Add other filterable fields as needed
}