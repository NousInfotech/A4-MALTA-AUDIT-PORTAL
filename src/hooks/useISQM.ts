import { useState, useEffect, useCallback } from 'react';
import { isqmApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface ISQMParent {
  _id: string;
  metadata: {
    title: string;
    version: string;
    jurisdiction_note: string;
    sources: string[];
    generated: string;
  };
  children: string[];
  createdBy: string;
  status: 'draft' | 'in-progress' | 'completed' | 'archived';
  completionStats: {
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
  };
  questionnaires: ISQMQuestionnaire[];
  createdAt: string;
  updatedAt: string;
}

export interface ISQMQuestionnaire {
  _id: string;
  parentId: string;
  key: string;
  heading: string;
  description?: string;
  version?: string;
  framework?: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'under-review';
  stats: {
    totalQuestions: number;
    answeredQuestions: number;
    completionPercentage: number;
    lastUpdated?: string;
  };
  sections: ISQMSection[];
  assignedTo?: string;
  policyUrls?: ISQMDocumentUrl[];
  procedureUrls?: ISQMDocumentUrl[];
  createdAt: string;
  updatedAt: string;
}

export interface ISQMSection {
  _id?: string;
  heading: string;
  sectionId?: string;
  order?: number;
  isCompleted?: boolean;
  completionPercentage?: number;
  qna: ISQMQuestion[];
  notes: ISQMNote[];
}

export interface ISQMQuestion {
  question: string;
  answer: string;
  state: boolean;
  status?: 'Implemented' | 'Partially Implemented' | 'Not Implemented';
  questionId?: string;
  isMandatory?: boolean;
  questionType?: string;
  answeredAt?: string;
  answeredBy?: string;
  comments?: string;
}

export interface ISQMNote {
  text: string;
  addedBy: string;
  addedAt: string;
}

export interface ISQMDocumentUrl {
  _id?: string;
  name: string;
  url: string;
  version?: string;
  uploadedBy: string;
  description?: string;
  updatedAt?: string;
}

export interface ISQMSupportingDocument {
  _id: string;
  parentId: string;
  category: string;
  title: string;
  description: string;
  status: 'pending' | 'uploaded' | 'reviewed' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  isMandatory: boolean;
  dueDate?: string;
  tags: string[];
  framework?: string;
  jurisdiction?: string;
  requestedBy: string;
  requestedAt: string;
  documents: ISQMDocument[];
  notes: ISQMDocumentNote[];
  completionPercentage: number;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface ISQMDocument {
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  fileSize: number;
  mimeType: string;
  version: string;
  isLatest: boolean;
}

export interface ISQMDocumentNote {
  text: string;
  addedBy: string;
  addedAt: string;
}

export interface ISQMFilters {
  status?: string;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ISQMPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ISQMResponse {
  parents: ISQMParent[];
  pagination: ISQMPagination;
}

export const useISQM = () => {
  const { user } = useAuth();
  const [parents, setParents] = useState<ISQMParent[]>([]);
  const [currentParent, setCurrentParent] = useState<ISQMParent | null>(null);
  const [questionnaires, setQuestionnaires] = useState<ISQMQuestionnaire[]>([]);
  const [supportingDocuments, setSupportingDocuments] = useState<ISQMSupportingDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<ISQMPagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });

  const { toast } = useToast();

  // ISQM Parent Management
  const fetchParents = useCallback(async (filters: ISQMFilters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching ISQM Parents with filters:', filters);
      
      // Build filters based on user role
      const roleBasedFilters = { ...filters };
      
      // If user is employee, only show ISQM packs they created
      if (user?.role === 'employee' && user?.id) {
        roleBasedFilters.createdBy = user.id;
        console.log('🔒 Employee filtering by createdBy:', user.id);
      }
      // If user is admin, show all ISQM packs (no additional filter)
      else if (user?.role === 'admin') {
        console.log('👑 Admin can see all ISQM packs');
      }
      
      const response: ISQMResponse = await isqmApi.getAllParents({
        page: roleBasedFilters.page || 1,
        limit: roleBasedFilters.limit || 20,
        sortBy: roleBasedFilters.sortBy || 'createdAt',
        sortOrder: roleBasedFilters.sortOrder || 'desc',
        ...roleBasedFilters,
      });

      setParents(response.parents);
      setPagination(response.pagination);
      
      console.log('✅ ISQM Parents fetched successfully:', response);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch ISQM parents';
      setError(errorMessage);
      console.error('❌ Failed to fetch ISQM parents:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  const createParent = useCallback(async (data: {
    metadata: {
      title: string;
      version: string;
      jurisdiction_note: string;
      sources: string[];
      generated: string;
    };
    questionnaires: Array<{
      key: string;
      heading: string;
      description?: string;
      version?: string;
      framework?: string;
      sections: Array<{
        heading: string;
        sectionId?: string;
        order?: number;
        qna: Array<{
          question: string;
          questionId?: string;
          isMandatory?: boolean;
          questionType?: string;
        }>;
      }>;
    }>;
    status?: string;
  }) => {
    try {
      console.log('🔄 Creating ISQM Parent...');
      const newParent = await isqmApi.createParent(data);
      
      // Refresh parents list
      await fetchParents();
      
      toast({
        title: "Success",
        description: "ISQM Parent created successfully",
      });
      
      return newParent;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create ISQM parent';
      console.error('❌ Failed to create ISQM parent:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [fetchParents, toast]);

  const updateParent = useCallback(async (id: string, data: {
    status?: string;
    metadata?: any;
  }) => {
    try {
      console.log('🔄 Updating ISQM Parent:', id, data);
      const updatedParent = await isqmApi.updateParent(id, data);
      
      // Update the parent in the local state
      setParents(prevParents => 
        prevParents.map(parent => 
          parent._id === id ? { ...parent, ...data } as ISQMParent : parent
        )
      );
      
      if (currentParent?._id === id) {
        setCurrentParent(prev => prev ? { ...prev, ...data } as ISQMParent : null);
      }
      
      toast({
        title: "Success",
        description: "ISQM Parent updated successfully",
      });
      
      return updatedParent;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update ISQM parent';
      console.error('❌ Failed to update ISQM parent:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [currentParent, toast]);

  const deleteParent = useCallback(async (id: string) => {
    try {
      console.log('🔄 Deleting ISQM Parent:', id);
      await isqmApi.deleteParent(id);
      
      // Remove the parent from local state
      setParents(prevParents => prevParents.filter(parent => parent._id !== id));
      
      if (currentParent?._id === id) {
        setCurrentParent(null);
        setQuestionnaires([]);
        setSupportingDocuments([]);
      }
      
      toast({
        title: "Success",
        description: "ISQM Parent deleted successfully",
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete ISQM parent';
      console.error('❌ Failed to delete ISQM parent:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [currentParent, toast]);

  // ISQM Questionnaire Management
  const fetchQuestionnaires = useCallback(async (parentId: string) => {
    try {
      console.log('🔄 Fetching questionnaires for parent:', parentId);
      const response = await isqmApi.getQuestionnairesByParent(parentId);
      setQuestionnaires(response);
      
      console.log('✅ Questionnaires fetched successfully:', response);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch questionnaires';
      console.error('❌ Failed to fetch questionnaires:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const createQuestionnaire = useCallback(async (data: {
    parentId: string;
    key: string;
    heading: string;
    description?: string;
    version?: string;
    framework?: string;
    sections: Array<{
      heading: string;
      sectionId?: string;
      order?: number;
      qna: Array<{
        question: string;
        questionId?: string;
        isMandatory?: boolean;
        questionType?: string;
      }>;
    }>;
  }) => {
    try {
      console.log('🔄 Creating ISQM Questionnaire...');
      const newQuestionnaire = await isqmApi.createQuestionnaire(data);
      
      // Refresh questionnaires list
      await fetchQuestionnaires(data.parentId);
      
      toast({
        title: "Success",
        description: "ISQM Questionnaire created successfully",
      });
      
      return newQuestionnaire;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create ISQM questionnaire';
      console.error('❌ Failed to create ISQM questionnaire:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [fetchQuestionnaires, toast]);

  const updateQuestionnaire = useCallback(async (id: string, data: {
    heading?: string;
    description?: string;
    assignedTo?: string;
  }) => {
    try {
      console.log('📝 Updating questionnaire:', id, data);
      const updatedQuestionnaire = await isqmApi.updateQuestionnaire(id, data);
      
      // Update the questionnaire in local state
      setQuestionnaires(prevQuestionnaires => 
        prevQuestionnaires.map(q => 
          q._id === id ? { ...q, ...updatedQuestionnaire } : q
        )
      );
      
      toast({
        title: "Success",
        description: "Questionnaire updated successfully",
      });
      
      return updatedQuestionnaire;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update questionnaire';
      console.error('❌ Failed to update questionnaire:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const deleteQuestionnaire = useCallback(async (id: string) => {
    try {
      console.log('📝 Deleting questionnaire:', id);
      await isqmApi.deleteQuestionnaire(id);
      
      // Remove the questionnaire from local state
      setQuestionnaires(prevQuestionnaires => 
        prevQuestionnaires.filter(q => q._id !== id)
      );
      
      toast({
        title: "Success",
        description: "Questionnaire deleted successfully",
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete questionnaire';
      console.error('❌ Failed to delete questionnaire:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const getQuestionnaireStats = useCallback(async (id: string) => {
    try {
      console.log('📊 Fetching questionnaire statistics:', id);
      return await isqmApi.getQuestionnaireStats(id);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch questionnaire statistics';
      console.error('❌ Failed to fetch questionnaire statistics:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const exportQuestionnaire = useCallback(async (id: string, format: 'csv' | 'json' = 'json') => {
    try {
      console.log('📤 Exporting questionnaire:', id, format);
      return await isqmApi.exportQuestionnaire(id, format);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export questionnaire';
      console.error('❌ Failed to export questionnaire:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const updateQuestionAnswer = useCallback(async (
    questionnaireId: string,
    sectionIndex: number,
    questionIndex: number,
    answer: string,
    comments?: string,
    state?: boolean
  ) => {
    try {
      console.log('🔄 Updating question answer:', { questionnaireId, sectionIndex, questionIndex, answer });
      const updatedQuestionnaire = await isqmApi.updateQuestionAnswer(
        questionnaireId,
        sectionIndex,
        questionIndex,
        answer,
        comments,
        state
      );
      
      // Update the questionnaire in local state
      setQuestionnaires(prevQuestionnaires => 
        prevQuestionnaires.map(q => 
          q._id === questionnaireId ? updatedQuestionnaire : q
        )
      );
      
      console.log('✅ Question answer updated successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update question answer';
      console.error('❌ Failed to update question answer:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const bulkUpdateAnswers = useCallback(async (
    questionnaireId: string,
    answers: Array<{
      sectionIndex: number;
      questionIndex: number;
      answer: string;
    }>
  ) => {
    try {
      console.log('🔄 Bulk updating answers:', { questionnaireId, answers });
      const updatedQuestionnaire = await isqmApi.bulkUpdateAnswers(questionnaireId, { answers });
      
      // Update the questionnaire in local state
      setQuestionnaires(prevQuestionnaires => 
        prevQuestionnaires.map(q => 
          q._id === questionnaireId ? updatedQuestionnaire : q
        )
      );
      
      toast({
        title: "Success",
        description: `${answers.length} answers updated successfully`,
      });
      
      console.log('✅ Bulk answers updated successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to bulk update answers';
      console.error('❌ Failed to bulk update answers:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  // Supporting Document Management
  const fetchSupportingDocuments = useCallback(async (parentId: string, filters?: {
    category?: string;
    status?: string;
    priority?: string;
  }) => {
    try {
      console.log('🔄 Fetching supporting documents for parent:', parentId, filters);
      const response = await isqmApi.getSupportingDocumentsByParent(parentId, filters);
      setSupportingDocuments(response);
      
      console.log('✅ Supporting documents fetched successfully:', response);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch supporting documents';
      console.error('❌ Failed to fetch supporting documents:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const createSupportingDocument = useCallback(async (data: {
    parentId: string;
    category: string;
    title: string;
    description: string;
    priority?: string;
    isMandatory?: boolean;
    dueDate?: string;
    tags?: string[];
    framework?: string;
    jurisdiction?: string;
  }) => {
    try {
      console.log('🔄 Creating supporting document:', data);
      const newDocument = await isqmApi.createSupportingDocument(data);
      
      // Add to local state
      setSupportingDocuments(prev => [...prev, newDocument]);
      
      toast({
        title: "Success",
        description: "Supporting document created successfully",
      });
      
      return newDocument;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create supporting document';
      console.error('❌ Failed to create supporting document:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const uploadDocumentFile = useCallback(async (documentId: string, file: File) => {
    try {
      console.log('🔄 Uploading document file:', documentId, file.name);
      const formData = new FormData();
      formData.append('files', file);
      
      const updatedDocument = await isqmApi.uploadDocumentFile(documentId, formData);
      
      // Update the document in local state
      setSupportingDocuments(prev => 
        prev.map(doc => 
          doc._id === documentId ? updatedDocument : doc
        )
      );
      
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      
      return updatedDocument;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to upload document';
      console.error('❌ Failed to upload document:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const reviewSupportingDocument = useCallback(async (documentId: string, status: string, reviewComments?: string) => {
    try {
      console.log('🔄 Reviewing supporting document:', documentId, status);
      const updatedDocument = await isqmApi.reviewSupportingDocument(documentId, { status, reviewComments });
      
      // Update the document in local state
      setSupportingDocuments(prev => 
        prev.map(doc => 
          doc._id === documentId ? updatedDocument : doc
        )
      );
      
      toast({
        title: "Success",
        description: "Document reviewed successfully",
      });
      
      return updatedDocument;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to review document';
      console.error('❌ Failed to review document:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const updateSupportingDocument = useCallback(async (id: string, data: {
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    tags?: string[];
  }) => {
    try {
      console.log('📄 Updating supporting document:', id, data);
      const updatedDocument = await isqmApi.updateSupportingDocument(id, data);
      
      // Update the document in local state
      setSupportingDocuments(prevDocuments => 
        prevDocuments.map(doc => 
          doc._id === id ? { ...doc, ...updatedDocument } : doc
        )
      );
      
      toast({
        title: "Success",
        description: "Supporting document updated successfully",
      });
      
      return updatedDocument;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update supporting document';
      console.error('❌ Failed to update supporting document:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const deleteSupportingDocument = useCallback(async (id: string) => {
    try {
      console.log('📄 Deleting supporting document:', id);
      await isqmApi.deleteSupportingDocument(id);
      
      // Remove the document from local state
      setSupportingDocuments(prevDocuments => 
        prevDocuments.filter(doc => doc._id !== id)
      );
      
      toast({
        title: "Success",
        description: "Supporting document deleted successfully",
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete supporting document';
      console.error('❌ Failed to delete supporting document:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const addDocumentNote = useCallback(async (id: string, data: {
    text: string;
  }) => {
    try {
      console.log('📝 Adding document note:', id, data);
      const result = await isqmApi.addDocumentNote(id, data);
      
      toast({
        title: "Success",
        description: "Document note added successfully",
      });
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to add document note';
      console.error('❌ Failed to add document note:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const getSupportingDocumentStats = useCallback(async (parentId: string) => {
    try {
      console.log('📊 Fetching supporting document statistics:', parentId);
      return await isqmApi.getSupportingDocumentStats(parentId);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch supporting document statistics';
      console.error('❌ Failed to fetch supporting document statistics:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  // Update question text
  const updateQuestionText = async (questionnaireId: string, sectionIndex: number, questionIndex: number, newText: string) => {
    try {
      console.log('🔄 Updating question text:', { questionnaireId, sectionIndex, questionIndex, newText });
      const response = await isqmApi.updateQuestionText(questionnaireId, sectionIndex, questionIndex, { text: newText });
      console.log('✅ Question text updated successfully:', response);
      await fetchQuestionnaires(currentParent?._id || '');
    } catch (error) {
      console.error('❌ Failed to update question text:', error);
      throw error;
    }
  };

  // Delete question
  const deleteQuestion = async (questionnaireId: string, sectionIndex: number, questionIndex: number) => {
    try {
      console.log('🔄 Deleting question:', { questionnaireId, sectionIndex, questionIndex });
      const response = await isqmApi.deleteQuestion(questionnaireId, sectionIndex, questionIndex);
      console.log('✅ Question deleted successfully:', response);
      await fetchQuestionnaires(currentParent?._id || '');
    } catch (error) {
      console.error('❌ Failed to delete question:', error);
      throw error;
    }
  };

  // Add question note
  const addQuestionNote = async (questionnaireId: string, sectionIndex: number, questionIndex: number, note: string) => {
    try {
      console.log('🔄 Adding question note:', { questionnaireId, sectionIndex, questionIndex, note });
      const response = await isqmApi.addQuestionNote(questionnaireId, sectionIndex, questionIndex, { note });
      console.log('✅ Question note added successfully:', response);
      await fetchQuestionnaires(currentParent?._id || '');
    } catch (error) {
      console.error('❌ Failed to add question note:', error);
      throw error;
    }
  };

  // Update section heading
  const updateSectionHeading = async (questionnaireId: string, sectionIndex: number, newHeading: string) => {
    try {
      console.log('🔄 Updating section heading:', { questionnaireId, sectionIndex, newHeading });
      const response = await isqmApi.updateSectionHeading(questionnaireId, sectionIndex, { heading: newHeading });
      console.log('✅ Section heading updated successfully:', response);
      await fetchQuestionnaires(currentParent?._id || '');
    } catch (error) {
      console.error('❌ Failed to update section heading:', error);
      throw error;
    }
  };

  // Add section note
  const addSectionNote = async (questionnaireId: string, sectionIndex: number, note: string) => {
    try {
      console.log('🔄 Adding section note:', { questionnaireId, sectionIndex, note });
      const response = await isqmApi.addSectionNote(questionnaireId, sectionIndex, { note });
      console.log('✅ Section note added successfully:', response);
      await fetchQuestionnaires(currentParent?._id || '');
    } catch (error) {
      console.error('❌ Failed to add section note:', error);
      throw error;
    }
  };

  // Delete section
  const deleteSection = async (questionnaireId: string, sectionIndex: number) => {
    try {
      console.log('🔄 Deleting section:', { questionnaireId, sectionIndex });
      const response = await isqmApi.deleteSection(questionnaireId, sectionIndex);
      console.log('✅ Section deleted successfully:', response);
      await fetchQuestionnaires(currentParent?._id || '');
    } catch (error) {
      console.error('❌ Failed to delete section:', error);
      throw error;
    }
  };

  // AI Document Generation
  const generatePolicy = useCallback(async (questionnaireId: string, data: {
    firmDetails: {
      size: string;
      specializations: string[];
      jurisdiction: string;
      additionalInfo?: string;
    }
  }) => {
    try {
      console.log('🤖 Generating policy document:', questionnaireId, data);
      const result = await isqmApi.generatePolicy(questionnaireId, data);
      
      toast({
        title: "Success",
        description: "Policy document generated successfully",
      });
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate policy document';
      console.error('❌ Failed to generate policy document:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  // Generate documents from QNA array
  const generateDocumentsFromQNA = useCallback(async (data: {
    qnaArray: Array<{
      question: string;
      answer: string;
      state: boolean;
    }>;
    categoryName: string;
    firmDetails?: {
      size?: string;
      jurisdiction?: string;
      specializations?: string[];
      [key: string]: any;
    };
  }) => {
    try {
      console.log('🤖 Generating documents from QNA array:', data.categoryName);
      const result = await isqmApi.generateDocumentsFromQNA(data);
      
      toast({
        title: "Success",
        description: `Documents generated successfully for ${data.categoryName}`,
      });
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate documents from QNA';
      console.error('❌ Failed to generate documents from QNA:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  // Download generated document
  const downloadGeneratedDocument = useCallback(async (filename: string) => {
    try {
      console.log('📥 Downloading generated document:', filename);
      const result = await isqmApi.downloadGeneratedDocument(filename);
      
      // Create download link
      const blob = new Blob([result], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Document downloaded successfully",
      });
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to download document';
      console.error('❌ Failed to download document:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const generateProcedure = useCallback(async (questionnaireId: string, data: {
    firmDetails: {
      size: string;
      specializations: string[];
      processes?: string[];
      jurisdiction: string;
    };
    policyDetails?: {
      title: string;
      requirements: string[];
      responsibilities: Record<string, string>;
    };
  }) => {
    try {
      console.log('🤖 Generating procedure document:', questionnaireId, data);
      const result = await isqmApi.generateProcedure(questionnaireId, data);
      
      toast({
        title: "Success",
        description: "Procedure document generated successfully",
      });
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate procedure document';
      console.error('❌ Failed to generate procedure document:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const generateRiskAssessment = useCallback(async (questionnaireId: string, data: {
    firmDetails: {
      size: string;
      specializations: string[];
      jurisdiction: string;
    }
  }) => {
    try {
      console.log('🤖 Generating risk assessment:', questionnaireId, data);
      const result = await isqmApi.generateRiskAssessment(questionnaireId, data);
      
      toast({
        title: "Success",
        description: "Risk assessment generated successfully",
      });
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate risk assessment';
      console.error('❌ Failed to generate risk assessment:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const generateComplianceChecklist = useCallback(async (questionnaireId: string, data: {
    firmDetails: {
      size: string;
      specializations: string[];
      jurisdiction: string;
    }
  }) => {
    try {
      console.log('🤖 Generating compliance checklist:', questionnaireId, data);
      const result = await isqmApi.generateComplianceChecklist(questionnaireId, data);
      
      toast({
        title: "Success",
        description: "Compliance checklist generated successfully",
      });
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate compliance checklist';
      console.error('❌ Failed to generate compliance checklist:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const generateAllDocuments = useCallback(async (parentId: string, data: {
    firmDetails: {
      size: string;
      specializations: string[];
      jurisdiction: string;
      additionalInfo?: string;
    }
  }) => {
    try {
      console.log('🤖 Generating all documents for parent:', parentId, data);
      const result = await isqmApi.generateAllDocuments(parentId, data);
      
      toast({
        title: "Success",
        description: "All documents generated successfully",
      });
      
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate all documents';
      console.error('❌ Failed to generate all documents:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  const getGenerationTypes = useCallback(async () => {
    try {
      console.log('🤖 Fetching available generation types');
      return await isqmApi.getGenerationTypes();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch generation types';
      console.error('❌ Failed to fetch generation types:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      throw err;
    }
  }, [toast]);

  return {
    // State
    parents,
    currentParent,
    questionnaires,
    supportingDocuments,
    loading,
    error,
    pagination,
    
    // Parent Management
    fetchParents,
    createParent,
    updateParent,
    deleteParent,
    setCurrentParent,
    
    // Questionnaire Management
    fetchQuestionnaires,
    createQuestionnaire,
    updateQuestionnaire,
    deleteQuestionnaire,
    updateQuestionAnswer,
    bulkUpdateAnswers,
    getQuestionnaireStats,
    exportQuestionnaire,
    updateQuestionText,
    deleteQuestion,
    addQuestionNote,
    updateSectionHeading,
    deleteSection,
    addSectionNote,
    
    // Supporting Document Management
    fetchSupportingDocuments,
    createSupportingDocument,
    updateSupportingDocument,
    deleteSupportingDocument,
    uploadDocumentFile,
    reviewSupportingDocument,
    addDocumentNote,
    getSupportingDocumentStats,
    
    // AI Document Generation
    generatePolicy,
    generateProcedure,
    generateRiskAssessment,
    generateComplianceChecklist,
    generateAllDocuments,
    getGenerationTypes,
    
    // QNA Document Generation
    generateDocumentsFromQNA,
    downloadGeneratedDocument,
  };
};
