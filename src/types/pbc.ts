export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'employee' | 'client' | 'admin';
}

export interface Engagement {
  _id: string;
  title: string;
  yearEndDate: string;
}

export interface DocumentRequest {
  _id: string;
  category: string;
  description: string;
  status: 'pending' | 'submitted' | 'approved';
  documents: any;
}

export interface Discussion {
  _id: string;
  message: string;
  createdBy: string;
  createdAt: string;
  replyTo?: string;
}

export interface QnAQuestion {
  _id: string;
  question: string;
  isMandatory: boolean;
  answer: string;
  status: 'unanswered' | 'answered' | 'doubt';
  discussions: Discussion[];
  answeredAt: string | null;
  doubtReason?: string;
}

export interface QnACategory {
  _id: string;
  pbcId: string;
  title: string;
  qnaQuestions: QnAQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface PBCWorkflow {
  _id: string;
  engagement: Engagement;
  clientId: string;
  auditorId: string;
  documentRequests: DocumentRequest[];
  status: 'document-collection' | 'qna-preparation' | 'client-responses' | 'doubt-resolution' | 'submitted';
  categories: QnACategory[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePBCWorkflowRequest {
  engagementId: string;
  clientId: string;
  auditorId: string;
  documentRequests: string[];
}

export interface CreateCategoryRequest {
  pbcId: string;
  title: string;
}

export interface AddQuestionRequest {
  question: string;
  isMandatory: boolean;
}

export interface UpdateQuestionRequest {
  status: 'answered' | 'unanswered' | 'doubt';
  answer?: string;
  doubtReason?: string;
}

export interface AddDiscussionRequest {
  message: string;
  replyTo?: string;
}