// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  RefreshCw, 
  Save, 
  Loader2, 
  Edit2, 
  Trash2, 
  X,
  FileText,
  CheckCircle,
  Eye,
  MessageSquare,
  Edit,
  Sparkles,
  Trash2 as TrashIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}

function normalize(items?: any[]) {
  if (!Array.isArray(items)) return [];
  return items.map((q, i) => {
    const __uid =
      q.__uid ||
      q.id ||
      q._id ||
      `q_${Math.random().toString(36).slice(2, 10)}_${i}`;
    const id = q.id ?? __uid;
    const key = q.key || q.aiKey || `q${i + 1}`;
    return { ...q, __uid, id, key };
  });
}

function mergeAiAnswers(questions: any[], aiAnswers: any[]) {
  const map = new Map<string, string>();
  (aiAnswers || []).forEach((a) => {
    const k = String(a?.key || "")
      .trim()
      .toLowerCase();
    if (k) map.set(k, a?.answer || "");
  });
  return questions.map((q, i) => {
    const k = String(q.key || `q${i + 1}`)
      .trim()
      .toLowerCase();
    const answer = map.has(k) ? map.get(k) || "" : q.answer || "";
    return { ...q, answer };
  });
}

function formatClassificationForDisplay(classification?: string) {
  if (!classification) return "General";
  const parts = classification.split(" > ");
  const top = parts[0];
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1];
  return top;
}

interface ProcedureTabsViewProps {
  engagement: any;
  stepData: any;
  mode: "manual" | "ai" | "hybrid";
  onComplete: (data: any) => void;
  onBack: () => void;
  updateProcedureParams?: (
    updates: Record<string, string | null>,
    replace?: boolean
  ) => void;
}

export const ProcedureTabsView: React.FC<ProcedureTabsViewProps> = ({
  engagement,
  stepData,
  mode,
  onComplete,
  onBack,
  updateProcedureParams,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    "questions" | "answers" | "procedures" | "review"
  >("questions");
  const [proceduresViewMode, setProceduresViewMode] = useState<
    "procedures" | "reviews"
  >("procedures");
  const [questionFilter, setQuestionFilter] = useState<"all" | "unanswered">(
    "all"
  );
  
  // Questions state
  const [questions, setQuestions] = useState<any[]>(
    normalize(stepData.questions || [])
  );
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null
  );
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editAnswerText, setEditAnswerText] = useState("");
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  
  // Answers state
  const [generatingAnswers, setGeneratingAnswers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editAnswerValue, setEditAnswerValue] = useState("");
  
  // Procedures state
  const [recommendations, setRecommendations] = useState<any[]>(
    Array.isArray(stepData.recommendations) ? stepData.recommendations : []
  );
  const [generatingProcedures, setGeneratingProcedures] = useState(false);
  const [editingRecommendationId, setEditingRecommendationId] = useState<
    string | null
  >(null);
  const [editRecommendationText, setEditRecommendationText] = useState("");

  // Review state
  const [reviewStatus, setReviewStatus] = useState<string>(
    stepData.reviewStatus || "in-progress"
  );
  const [reviewComments, setReviewComments] = useState<string>(
    stepData.reviewComments || ""
  );
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isEditingOverallComment, setIsEditingOverallComment] = useState(false);
  const [editOverallCommentValue, setEditOverallCommentValue] =
    useState<string>("");

  // Advanced Review & Sign-off state
  const [reviewerId, setReviewerId] = useState<string>(
    stepData.reviewerId || ""
  );
  const [reviewedAt, setReviewedAt] = useState<string>(
    stepData.reviewedAt
      ? new Date(stepData.reviewedAt).toISOString().split("T")[0]
      : ""
  );
  const [approvedBy, setApprovedBy] = useState<string>(
    stepData.approvedBy || ""
  );
  const [approvedAt, setApprovedAt] = useState<string>(
    stepData.approvedAt
      ? new Date(stepData.approvedAt).toISOString().split("T")[0]
      : ""
  );
  const [signedOffBy, setSignedOffBy] = useState<string>(
    stepData.signedOffBy || ""
  );
  const [signedOffAt, setSignedOffAt] = useState<string>(
    stepData.signedOffAt
      ? new Date(stepData.signedOffAt).toISOString().split("T")[0]
      : ""
  );
  const [signOffComments, setSignOffComments] = useState<string>(
    stepData.signOffComments || ""
  );
  const [isSignedOff, setIsSignedOff] = useState<boolean>(
    stepData.isSignedOff || false
  );
  const [isLocked, setIsLocked] = useState<boolean>(stepData.isLocked || false);
  const [lockedAt, setLockedAt] = useState<string>(
    stepData.lockedAt
      ? new Date(stepData.lockedAt).toISOString().split("T")[0]
      : ""
  );
  const [lockedBy, setLockedBy] = useState<string>(stepData.lockedBy || "");
  const [reopenedAt, setReopenedAt] = useState<string>(
    stepData.reopenedAt
      ? new Date(stepData.reopenedAt).toISOString().split("T")[0]
      : ""
  );
  const [reopenedBy, setReopenedBy] = useState<string>(
    stepData.reopenedBy || ""
  );
  const [reopenReason, setReopenReason] = useState<string>(
    stepData.reopenReason || ""
  );
  const [reviewVersion, setReviewVersion] = useState<number>(
    stepData.reviewVersion || 1
  );
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [editingReview, setEditingReview] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editReviewStatus, setEditReviewStatus] = useState<string>("");
  const [editReviewComments, setEditReviewComments] = useState<string>("");
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);
  const [isDeletingReview, setIsDeletingReview] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});

  // Added missing state variables
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set());
  const [itemReviewComments, setItemReviewComments] = useState<
    Record<string, string>
  >({});

  // Get current user ID
  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        setCurrentUserId(data.session.user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch user name from Supabase profiles
  const fetchUserName = async (userId: string): Promise<string> => {
    if (!userId || userNamesMap[userId]) return userNamesMap[userId] || userId;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", userId)
        .single();
      if (!error && data?.name) {
        setUserNamesMap((prev) => ({ ...prev, [userId]: data.name }));
        return data.name;
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
    return userId;
  };

  // Fetch user names for all user IDs in reviews
  const fetchUserNames = async (reviews: any[]) => {
    const userIds = new Set<string>();
    reviews.forEach((review) => {
      if (review.reviewedBy) userIds.add(review.reviewedBy);
      if (review.assignedReviewer) userIds.add(review.assignedReviewer);
      if (review.approvedBy) userIds.add(review.approvedBy);
      if (review.signedOffBy) userIds.add(review.signedOffBy);
      if (review.lockedBy) userIds.add(review.lockedBy);
      if (review.reopenedBy) userIds.add(review.reopenedBy);
    });

    const namesMap: Record<string, string> = {};
    await Promise.all(
      Array.from(userIds).map(async (userId) => {
        if (!userNamesMap[userId]) {
          const name = await fetchUserName(userId);
          namesMap[userId] = name;
        } else {
          namesMap[userId] = userNamesMap[userId];
        }
      })
    );
    setUserNamesMap((prev) => ({ ...prev, ...namesMap }));
  };

  // Fetch reviews for engagement (filtered by itemType: "procedure")
  const fetchReviews = async () => {
    if (!engagement?._id) return;
    setIsLoadingReviews(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const response = await authFetch(
        `${base}/api/review/workflows/engagement/${engagement._id}`
      );
      if (response.ok) {
        const data = await response.json();
        // Filter reviews by itemType: "procedure" for ProcedureTabsView
        const filteredReviews = (data.workflows || []).filter(
          (w: any) => w.itemType === "procedure"
        );
        setReviews(filteredReviews);
        // Fetch user names for all reviewers
        await fetchUserNames(filteredReviews);
      }
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast({
        title: "Error",
        description: "Failed to fetch reviews.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReviews(false);
    }
  };

  // Fetch reviews when engagement changes or review tab is active
  React.useEffect(() => {
    if (engagement?._id && activeTab === "review") {
      fetchReviews();
    }
  }, [engagement?._id, activeTab]);

  // Fetch reviews when switching to reviews view mode in procedures tab
  React.useEffect(() => {
    if (engagement?._id && activeTab === "procedures" && proceduresViewMode === "reviews") {
      fetchReviews();
    }
  }, [engagement?._id, activeTab, proceduresViewMode]);

  // Sync review data from stepData (when loaded from backend)
  React.useEffect(() => {
    if (stepData) {
      if (stepData.reviewStatus) {
        setReviewStatus(stepData.reviewStatus);
      }
      if (stepData.reviewComments !== undefined) {
        setReviewComments(stepData.reviewComments || "");
      }
      // Advanced review fields - auto-set to current user
      if (currentUserId) {
        if (!stepData.reviewerId) setReviewerId(currentUserId);
        if (!stepData.approvedBy) setApprovedBy(currentUserId);
        if (!stepData.signedOffBy) setSignedOffBy(currentUserId);
        if (!stepData.lockedBy) setLockedBy(currentUserId);
        if (!stepData.reopenedBy) setReopenedBy(currentUserId);
      }
      // Update existing values if present
      if (stepData.reviewerId) setReviewerId(stepData.reviewerId);
      if (stepData.reviewedAt)
        setReviewedAt(
          new Date(stepData.reviewedAt).toISOString().split("T")[0]
        );
      if (stepData.approvedBy) setApprovedBy(stepData.approvedBy);
      if (stepData.approvedAt)
        setApprovedAt(
          new Date(stepData.approvedAt).toISOString().split("T")[0]
        );
      if (stepData.signedOffBy) setSignedOffBy(stepData.signedOffBy);
      if (stepData.signedOffAt)
        setSignedOffAt(
          new Date(stepData.signedOffAt).toISOString().split("T")[0]
        );
      if (stepData.signOffComments !== undefined)
        setSignOffComments(stepData.signOffComments || "");
      if (stepData.isSignedOff !== undefined)
        setIsSignedOff(stepData.isSignedOff);
      if (stepData.isLocked !== undefined) setIsLocked(stepData.isLocked);
      if (stepData.lockedAt)
        setLockedAt(new Date(stepData.lockedAt).toISOString().split("T")[0]);
      if (stepData.lockedBy) setLockedBy(stepData.lockedBy);
      if (stepData.reopenedAt)
        setReopenedAt(
          new Date(stepData.reopenedAt).toISOString().split("T")[0]
        );
      if (stepData.reopenedBy) setReopenedBy(stepData.reopenedBy);
      if (stepData.reopenReason !== undefined)
        setReopenReason(stepData.reopenReason || "");
      if (stepData.reviewVersion) setReviewVersion(stepData.reviewVersion);
    }
  }, [stepData, currentUserId]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (questionFilter === "unanswered") {
      return questions.filter((q: any) => !q.answer || q.answer.trim() === "");
    }
    return questions;
  }, [questions, questionFilter]);

  // Questions with answers
  const questionsWithAnswers = useMemo(() => {
    return questions.filter((q: any) => q.answer && q.answer.trim() !== "");
  }, [questions]);

  // Unanswered questions
  const unansweredQuestions = useMemo(() => {
    return questions.filter((q: any) => !q.answer || q.answer.trim() === "");
  }, [questions]);

  // Handle add question
  const handleAddQuestion = () => {
    const newQuestion = {
      __uid: `new-${Date.now()}`,
      id: `new-${Date.now()}`,
      key: `q${questions.length + 1}`,
      question: "New question",
      answer: "",
      classification: stepData.selectedClassifications?.[0] || "General",
    };
    setQuestions([...questions, newQuestion]);
    setEditingQuestionId(newQuestion.__uid);
    setEditQuestionText(newQuestion.question);
    setEditAnswerText("");
  };

  // Handle edit question
  const handleEditQuestion = (question: any) => {
    setEditingQuestionId(question.__uid);
    setEditQuestionText(question.question || "");
    setEditAnswerText(question.answer || "");
  };

  // Handle save question
  const handleSaveQuestion = () => {
    if (!editingQuestionId) return;
    setQuestions((prev) =>
      prev.map((q) =>
        q.__uid === editingQuestionId
          ? { ...q, question: editQuestionText, answer: editAnswerText }
          : q
      )
    );
    setEditingQuestionId(null);
    setEditQuestionText("");
    setEditAnswerText("");
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditQuestionText("");
    setEditAnswerText("");
  };

  // Handle delete question
  const handleDeleteQuestion = (questionUid: string) => {
    setQuestions((prev) => prev.filter((q) => q.__uid !== questionUid));
    toast({
      title: "Question deleted",
      description: "The question has been removed.",
    });
  };

  // Generate/Regenerate questions
  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const selected = Array.isArray(stepData?.selectedClassifications)
        ? stepData.selectedClassifications
        : [];

      const res = await authFetch(
        `${base}/api/procedures/${engagement._id}/generate`,
        {
        method: "POST",
        body: JSON.stringify({
          mode,
          materiality: stepData?.materiality,
          selectedClassifications: selected,
          validitySelections: stepData?.validitySelections,
        }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        let errorMessage = "Failed to generate questions";
        try {
          const errorData = errorText
            ? errorText.startsWith("{")
              ? JSON.parse(errorText)
              : { message: errorText }
            : {};
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText?.slice(0, 200) || errorMessage;
        }
        if (
          res.status === 429 ||
          errorMessage.toLowerCase().includes("quota")
        ) {
          errorMessage =
            "OpenAI API quota exceeded. Please check your OpenAI account billing and quota limits.";
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      const generatedQuestions =
        result?.procedure?.questions || result?.questions || [];
      const normalizedQuestions = normalize(generatedQuestions);

      setQuestions(normalizedQuestions);
      
      // Update recommendations if provided
      if (result?.procedure?.recommendations || result?.recommendations) {
        const recs =
          result.procedure?.recommendations || result.recommendations;
        setRecommendations(Array.isArray(recs) ? recs : []);
      }

      toast({
        title: "Questions Generated",
        description: `Generated ${normalizedQuestions.length} questions.`,
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate questions.",
        variant: "destructive",
      });
    } finally {
      setGeneratingQuestions(false);
    }
  };

  // Generate answers
  const handleGenerateAnswers = async () => {
    setGeneratingAnswers(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const questionsWithoutAnswers = questions
        .filter((q: any) => !q.answer || q.answer.trim() === "")
        .map(({ answer, __uid, ...rest }) => rest);

      if (questionsWithoutAnswers.length === 0) {
        toast({
          title: "Info",
          description: "All questions already have answers.",
        });
        return;
      }

      const res = await authFetch(
        `${base}/api/procedures/ai/classification-answers`,
        {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement._id,
          questions: questionsWithoutAnswers,
        }),
        }
      );

      if (!res.ok) throw new Error("Failed to generate answers");

      const data = await res.json();
      let updatedQuestions = questions;

      if (Array.isArray(data?.aiAnswers)) {
        updatedQuestions = mergeAiAnswers(questions, data.aiAnswers);
      } else if (Array.isArray(data?.questions)) {
        updatedQuestions = normalize(data.questions);
      }

      setQuestions(updatedQuestions);

      // Update recommendations if provided
      if (data.recommendations) {
        const recs = Array.isArray(data.recommendations) 
          ? data.recommendations 
          : typeof data.recommendations === "string"
          ? data.recommendations
              .split("\n")
              .filter((l: string) => l.trim())
              .map((text: string, idx: number) => ({
              id: `rec-${Date.now()}-${idx}`,
              text: text.trim(),
              checked: false,
            }))
          : [];
        setRecommendations(recs);
      }

      toast({
        title: "Answers Generated",
        description: "Answers have been generated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate answers.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAnswers(false);
    }
  };

  // Save answers
  const handleSaveAnswers = async () => {
    setIsSaving(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      if (!base) throw new Error("VITE_APIURL is not set");
      
      const payload = {
        ...stepData,
        questions: questions.map(({ __uid, ...rest }) => rest),
        recommendations: recommendations,
        status: "draft",
        procedureType: "procedures",
        mode: mode,
      };

      const response = await authFetch(
        `${base}/api/procedures/${engagement._id}`,
        {
        method: "POST",
        body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const errorMessage =
          text || `Failed to save answers (HTTP ${response.status})`;
        throw new Error(errorMessage);
      }

      toast({
        title: "Answers Saved",
        description: "Your answers have been saved successfully.",
      });
    } catch (error: any) {
      console.error("Save answers error:", error);
      toast({
        title: "Save failed",
        description: error.message || "Could not save answers.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate procedures
  const handleGenerateProcedures = async () => {
    setGeneratingProcedures(true);
    // Ensure we stay on the procedures tab
    setActiveTab("procedures");
    try {
      // First ensure we have answers
      if (unansweredQuestions.length > 0) {
        await handleGenerateAnswers();
      }

      // Generate recommendations
      const base = import.meta.env.VITE_APIURL;
      const res = await authFetch(`${base}/api/procedures/recommendations`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement._id,
          procedureId: stepData._id,
          framework: stepData.framework || "IFRS",
          classifications: stepData.selectedClassifications || [],
          questions: questionsWithAnswers.map(({ __uid, ...rest }) => rest),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const recs = Array.isArray(data.recommendations)
          ? data.recommendations
          : typeof data.recommendations === "string"
          ? data.recommendations
              .split("\n")
              .filter((l: string) => l.trim())
              .map((text: string, idx: number) => ({
              id: `rec-${Date.now()}-${idx}`,
              text: text.trim(),
              checked: false,
            }))
          : [];
        setRecommendations(recs);
        toast({
          title: "Procedures Generated",
          description: "Recommendations have been generated successfully.",
        });
      } else {
        throw new Error("Failed to generate recommendations");
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate procedures.",
        variant: "destructive",
      });
    } finally {
      setGeneratingProcedures(false);
    }
  };

  // Save all and complete
  const handleComplete = async () => {
    setIsSaving(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const payload = {
        ...stepData,
        questions: questions.map(({ __uid, ...rest }) => rest),
        recommendations: recommendations,
        status: "completed",
        procedureType: "procedures",
        mode: mode,
      };

      const saved = await authFetch(
        `${base}/api/procedures/${engagement._id}`,
        {
        method: "POST",
        body: JSON.stringify(payload),
        }
      );

      if (saved.ok) {
        const savedData = await saved.json();
        toast({
          title: "Procedures Saved",
          description: "Your audit procedures have been saved successfully.",
        });
        onComplete({
          ...payload,
          _id: savedData._id || savedData.procedure?._id,
        });
      } else {
        throw new Error("Failed to save procedures");
      }
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Could not save procedures.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle edit recommendation
  const handleEditRecommendation = (rec: any, idx: number) => {
    const recId = rec.id || rec.__uid || `rec-${idx}`;
    setEditingRecommendationId(recId);
    const recText =
      typeof rec === "string" ? rec : rec.text || rec.content || "";
    setEditRecommendationText(recText);
  };

  // Handle save recommendation
  const handleSaveRecommendation = () => {
    if (!editingRecommendationId) return;
    setRecommendations((prev) =>
      prev.map((rec, idx) => {
        const recId = rec.id || rec.__uid || `rec-${idx}`;
        if (recId === editingRecommendationId) {
          if (typeof rec === "string") {
            return editRecommendationText;
          }
          return { ...rec, text: editRecommendationText };
        }
        return rec;
      })
    );
    setEditingRecommendationId(null);
    setEditRecommendationText("");
    toast({
      title: "Recommendation Updated",
      description: "Your recommendation has been updated.",
    });
  };

  // Handle cancel edit
  const handleCancelEditRecommendation = () => {
    setEditingRecommendationId(null);
    setEditRecommendationText("");
  };

  // Handle delete recommendation
  const handleDeleteRecommendation = (rec: any, idx: number) => {
    const recId = rec.id || rec.__uid || `rec-${idx}`;
    setRecommendations((prev) =>
      prev.filter((r, i) => {
        const rId = r.id || r.__uid || `rec-${i}`;
        return rId !== recId;
      })
    );
    toast({
      title: "Recommendation deleted",
      description: "The recommendation has been removed.",
    });
  };

  // Handle add recommendation
  const handleAddRecommendation = () => {
    const newRec = {
      id: `rec-${Date.now()}`,
      text: "New recommendation",
      checked: false,
    };
    setRecommendations([...recommendations, newRec]);
    setEditingRecommendationId(newRec.id);
    setEditRecommendationText(newRec.text);
  };

  // Review functions
  const handleToggleItemReview = (itemId: string) => {
    setReviewedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleSaveReview = async () => {
    setIsSavingReview(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      if (!base) throw new Error("VITE_APIURL is not set");

      const now = new Date();
      const currentVersion = (reviewVersion || 1) + 1;

      // Auto-populate fields based on reviewStatus
      let autoFields: any = {
        reviewVersion: currentVersion,
      };

      // Set fields based on status
      if (
        reviewStatus === "ready-for-review" ||
        reviewStatus === "under-review"
      ) {
        autoFields.reviewerId = currentUserId;
        autoFields.reviewedAt = now.toISOString();
      }

      if (reviewStatus === "approved") {
        autoFields.approvedBy = currentUserId;
        autoFields.approvedAt = now.toISOString();
      }

      if (reviewStatus === "signed-off") {
        autoFields.signedOffBy = currentUserId;
        autoFields.signedOffAt = now.toISOString();
        autoFields.isSignedOff = true;
        autoFields.signOffComments =
          reviewComments || signOffComments || undefined;
      }

      if (reviewStatus === "re-opened") {
        autoFields.reopenedBy = currentUserId;
        autoFields.reopenedAt = now.toISOString();
        autoFields.reopenReason = reviewComments || reopenReason || undefined;
      }

      const payload = {
        ...stepData,
        questions: questions.map(({ __uid, ...rest }) => rest),
        recommendations: recommendations,
        reviewStatus: reviewStatus,
        reviewComments: reviewComments,
        status: "completed",
        procedureType: "procedures",
        mode: mode,
        // Auto-populated fields based on status
        ...autoFields,
      };

      const response = await authFetch(
        `${base}/api/procedures/${engagement._id}`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const errorMessage =
          text || `Failed to save review (HTTP ${response.status})`;
        throw new Error(errorMessage);
      }

      // Update reviewVersion state after successful save
      setReviewVersion(currentVersion);

      // Refresh the reviews list to show the newly saved review
      await fetchReviews();

      toast({
        title: "Review Saved",
        description: "Your review has been saved successfully.",
      });
    } catch (error: any) {
      console.error("Save review error:", error);
      toast({
        title: "Save failed",
        description: error.message || "Could not save review.",
        variant: "destructive",
      });
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleUpdateItemReviewComment = (itemId: string, comment: string) => {
    setItemReviewComments((prev) => ({
      ...prev,
      [itemId]: comment,
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="answers">Answers</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={questionFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuestionFilter("all")}
              >
                All Questions
              </Button>
              <Button
                variant={
                  questionFilter === "unanswered" ? "default" : "outline"
                }
                size="sm"
                onClick={() => setQuestionFilter("unanswered")}
              >
                Unanswered Questions
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateQuestions}
                disabled={generatingQuestions}
              >
                {generatingQuestions ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {questions.length > 0
                  ? "Regenerate Questions"
                  : "Generate Questions"}
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {questionFilter === "unanswered"
                    ? "All questions have been answered."
                    : "No questions available. Click 'Generate Questions' or 'Add Question' to create one."}
                </div>
              ) : (
                filteredQuestions.map((q: any, idx: number) => (
                  <Card key={q.__uid || idx}>
                    <CardContent className="pt-6">
                      {editingQuestionId === q.__uid ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{idx + 1}.</div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveQuestion}>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                          <Input
                            value={editQuestionText}
                            onChange={(e) =>
                              setEditQuestionText(e.target.value)
                            }
                            placeholder="Question"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <div className="font-medium mb-1">
                              {idx + 1}. {q.question || "—"}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditQuestion(q)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteQuestion(q.__uid)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {q.framework && (
                            <Badge className="mr-2" variant="default">
                              {q.framework}
                            </Badge>
                          )}
                          {q.reference && (
                            <Badge variant="default">{q.reference}</Badge>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Answers Tab */}
        <TabsContent value="answers" className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {questionsWithAnswers.length} answered •{" "}
              {unansweredQuestions.length} unanswered
            </div>
            <div className="flex items-center gap-2">
              {unansweredQuestions.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleGenerateAnswers}
                  disabled={generatingAnswers}
                >
                  {generatingAnswers ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Answers
                </Button>
              )}
              {questionsWithAnswers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAnswers}
                  disabled={generatingAnswers}
                >
                  {generatingAnswers ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate Answers
                </Button>
              )}
              {(questionsWithAnswers.length > 0 ||
                unansweredQuestions.length > 0) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveAnswers}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Answers
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No questions available. Go to Questions tab to add questions.
                </div>
              ) : (
                <>
                  {/* Answered Questions */}
                  {questionsWithAnswers.map((q: any, idx: number) => (
                    <Card key={q.__uid || idx}>
                      <CardContent className="pt-6">
                        <div className="font-medium mb-2">
                          {idx + 1}. {q.question || "—"}
                        </div>
                        {editingAnswerId === q.__uid ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editAnswerValue}
                              onChange={(e) =>
                                setEditAnswerValue(e.target.value)
                              }
                              placeholder="Answer"
                              className="min-h-[100px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setQuestions((prev) =>
                                    prev.map((question) =>
                                      question.__uid === q.__uid
                                        ? {
                                            ...question,
                                            answer: editAnswerValue,
                                          }
                                        : question
                                    )
                                  );
                                  setEditingAnswerId(null);
                                  setEditAnswerValue("");
                                }}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingAnswerId(null);
                                  setEditAnswerValue("");
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-muted-foreground mb-3">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {String(q.answer || "No answer.")}
                              </ReactMarkdown>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingAnswerId(q.__uid);
                                  setEditAnswerValue(q.answer || "");
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit Answer
                              </Button>
                              {q.framework && (
                                <Badge variant="default">{q.framework}</Badge>
                              )}
                              {q.reference && (
                                <Badge variant="default">{q.reference}</Badge>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Unanswered Questions */}
                  {unansweredQuestions.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold mb-4">
                        Unanswered Questions
                      </h4>
                      {unansweredQuestions.map((q: any, idx: number) => (
                        <Card key={q.__uid || idx} className="mb-4">
                          <CardContent className="pt-6">
                            <div className="font-medium mb-2">
                              {questionsWithAnswers.length + idx + 1}.{" "}
                              {q.question || "—"}
                            </div>
                            <div className="text-sm text-muted-foreground italic mb-3">
                              No answer.
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                // Generate answer for this specific question
                                try {
                                  const base = import.meta.env.VITE_APIURL;
                                  const res = await authFetch(
                                    `${base}/api/procedures/ai/classification-answers/separate`,
                                    {
                                      method: "POST",
                                      body: JSON.stringify({
                                        engagementId: engagement._id,
                                        questions: [
                                          { ...q, answer: undefined },
                                        ],
                                        classification:
                                          q.classification || "General",
                                      }),
                                    }
                                  );
                                  
                                  if (res.ok) {
                                    const data = await res.json();
                                    const aiAnswer = Array.isArray(
                                      data?.aiAnswers
                                    )
                                      ? data.aiAnswers.find(
                                          (a: any) => a.key === q.key
                                        )?.answer
                                      : null;

                                    setQuestions((prev) =>
                                      prev.map((question) =>
                                        question.__uid === q.__uid
                                          ? {
                                              ...question,
                                              answer: aiAnswer || "",
                                            }
                                          : question
                                      )
                                    );
                                    toast({
                                      title: "Answer Generated",
                                      description:
                                        "Answer has been generated for this question.",
                                    });
                                  }
                                } catch (error: any) {
                                  toast({
                                    title: "Generation failed",
                                    description:
                                      error.message ||
                                      "Could not generate answer.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={generatingAnswers}
                            >
                              {generatingAnswers ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Plus className="h-4 w-4 mr-2" />
                              )}
                              Add Answer
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Procedures Tab */}
        <TabsContent value="procedures" className="flex-1 flex flex-col mt-4">
          {proceduresViewMode === "reviews" ? (
            <div
              className="flex-1 flex flex-col overflow-x-hidden"
              style={{ width: "100%", maxWidth: "100%" }}
            >
              <div className="flex flex-col gap-2 mb-4 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProceduresViewMode("procedures")}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Back to Procedures
                </Button>
                <div className="flex items-center justify-between w-full">
                  <h4 className="text-lg font-semibold">Overall Review</h4>
                  <div className="flex items-center gap-2">
                    <Select
                      value={reviewStatus}
                      onValueChange={setReviewStatus}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Review Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="ready-for-review">
                          Ready for Review
                        </SelectItem>
                        <SelectItem value="under-review">
                          Under Review
                        </SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="signed-off">Signed Off</SelectItem>
                        <SelectItem value="re-opened">Re-opened</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveReview}
                      disabled={isSavingReview}
                    >
                      {isSavingReview ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Review
                    </Button>
                  </div>
                </div>

                <div className="mb-4 w-full">
                  <div className="flex items-center justify-between mb-2 w-full">
                    <Label htmlFor="review-comments" className="flex-shrink-0">
                      Overall Review Comments
                    </Label>
                  </div>
                  <Textarea
                    id="review-comments"
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    placeholder="Add your review comments here..."
                    className="min-h-[100px] max-h-[200px] mt-2 w-full resize-none border border-input focus:border-input focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      overflowX: "hidden",
                    }}
                  />
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-6">
                    {/* Reviews List Section */}
                    <div>
          <div className="flex items-center justify-between mb-4">
                        <h5 className="text-md font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Reviews ({reviews.length} reviews)
                        </h5>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={fetchReviews}
                          disabled={isLoadingReviews}
                        >
                          {isLoadingReviews ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Refresh
                        </Button>
                      </div>

                      {isLoadingReviews ? (
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center text-muted-foreground py-8">
                              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                              Loading reviews...
                            </div>
                          </CardContent>
                        </Card>
                      ) : reviews.length === 0 ? (
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center text-muted-foreground py-8">
                              No reviews found for this engagement.
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        reviews.map((review: any, idx: number) => {
                          const statusColors: Record<string, string> = {
                            "in-progress": "bg-gray-100 text-gray-800",
                            "ready-for-review": "bg-blue-100 text-blue-800",
                            "under-review": "bg-yellow-100 text-yellow-800",
                            approved: "bg-green-100 text-green-800",
                            rejected: "bg-red-100 text-red-800",
                            "signed-off": "bg-purple-100 text-purple-800",
                            "re-opened": "bg-orange-100 text-orange-800",
                          };

                          const isOwner = isReviewOwner(review);

                          return (
                            <Card key={review._id || idx} className="mb-4">
                              <CardContent className="pt-6 pb-6">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Badge
                                          className={
                                            statusColors[review.status] ||
                                            "bg-gray-100 text-gray-800"
                                          }
                                        >
                                          {review.status || "N/A"}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                          {review.itemType || "N/A"}
                                        </span>
                                      </div>
                                      {review.reviewComments && (
                                        <div className="text-sm text-muted-foreground mb-2">
                                          {review.reviewComments}
                                        </div>
                                      )}
                                    </div>
                                    {isOwner && (
                                      <div className="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleEditReview(review)
                                          }
                                          disabled={
                                            isDeletingReview === review._id
                                          }
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleDeleteReview(review._id)
                                          }
                                          disabled={
                                            isDeletingReview === review._id
                                          }
                                        >
                                          {isDeletingReview === review._id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <TrashIcon className="h-4 w-4 text-destructive" />
                                          )}
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="font-medium">
                                        Reviewer:
                                      </span>{" "}
                                      <span className="text-muted-foreground">
                                        {(() => {
                                          // Determine reviewer based on status
                                          let reviewerId = null;
                                          if (review.status === "approved") {
                                            reviewerId =
                                              review.approvedBy ||
                                              review.reviewedBy ||
                                              review.assignedReviewer;
                                          } else if (
                                            review.status === "signed-off"
                                          ) {
                                            reviewerId =
                                              review.signedOffBy ||
                                              review.approvedBy ||
                                              review.reviewedBy ||
                                              review.assignedReviewer;
                                          } else if (
                                            review.status === "re-opened"
                                          ) {
                                            reviewerId =
                                              review.reopenedBy ||
                                              review.reviewedBy ||
                                              review.assignedReviewer;
                                          } else if (
                                            review.status ===
                                              "ready-for-review" ||
                                            review.status === "under-review"
                                          ) {
                                            reviewerId =
                                              review.reviewedBy ||
                                              review.assignedReviewer;
                                          } else {
                                            reviewerId =
                                              review.reviewedBy ||
                                              review.assignedReviewer;
                                          }
                                          return reviewerId
                                            ? userNamesMap[reviewerId] ||
                                                reviewerId
                                            : "Not assigned";
                                        })()}
                                      </span>
                                    </div>
                                    {review.reviewedAt &&
                                      (review.status === "ready-for-review" ||
                                        review.status === "under-review") && (
                                        <div>
                                          <span className="font-medium">
                                            Reviewed At:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {new Date(
                                              review.reviewedAt
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    {review.status === "approved" &&
                                      review.approvedBy && (
                                        <div>
                                          <span className="font-medium">
                                            Approved By:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {userNamesMap[review.approvedBy] ||
                                              review.approvedBy}
                                          </span>
                                        </div>
                                      )}
                                    {review.status === "approved" &&
                                      review.approvedAt && (
                                        <div>
                                          <span className="font-medium">
                                            Approved At:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {new Date(
                                              review.approvedAt
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    {review.status === "signed-off" &&
                                      review.signedOffBy && (
                                        <div>
                                          <span className="font-medium">
                                            Signed Off By:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {userNamesMap[review.signedOffBy] ||
                                              review.signedOffBy}
                                          </span>
                                        </div>
                                      )}
                                    {review.status === "signed-off" &&
                                      review.signedOffAt && (
                                        <div>
                                          <span className="font-medium">
                                            Signed Off At:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {new Date(
                                              review.signedOffAt
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    {review.isLocked && (
                                      <div>
                                        <span className="font-medium">
                                          Locked:
                                        </span>{" "}
                                        <span className="text-muted-foreground">
                                          {review.lockedBy
                                            ? `Yes (by ${
                                                userNamesMap[review.lockedBy] ||
                                                review.lockedBy
                                              })`
                                            : "Yes"}
                                        </span>
                                      </div>
                                    )}
                                    {review.status === "re-opened" &&
                                      review.reopenedBy && (
                                        <div>
                                          <span className="font-medium">
                                            Reopened By:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {userNamesMap[review.reopenedBy] ||
                                              review.reopenedBy}
                                          </span>
                                        </div>
                                      )}
                                    {review.status === "re-opened" &&
                                      review.reopenedAt && (
                                        <div>
                                          <span className="font-medium">
                                            Reopened At:
                                          </span>{" "}
                                          <span className="text-muted-foreground">
                                            {new Date(
                                              review.reopenedAt
                                            ).toLocaleDateString()}
                                          </span>
                                        </div>
                                      )}
                                    {review.reviewVersion && (
                                      <div>
                                        <span className="font-medium">
                                          Version:
                                        </span>{" "}
                                        <span className="text-muted-foreground">
                                          {review.reviewVersion}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </div>
              ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold">
                    Audit Recommendations
                  </h4>
            <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProceduresViewMode("reviews")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Reviews
                    </Button>
                    {questionsWithAnswers.length > 0 ? (
                      recommendations.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateProcedures}
                          disabled={generatingProcedures || questionsWithAnswers.length === 0}
              >
                {generatingProcedures ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                          Regenerate Procedures
              </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={handleGenerateProcedures}
                          disabled={generatingProcedures || questionsWithAnswers.length === 0}
                        >
                          {generatingProcedures ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <FileText className="h-4 w-4 mr-2" />
                          )}
                          Generate Procedures
                        </Button>
                      )
                    ) : (
                      <div className="text-muted-foreground text-sm">
                        Generate answers first.
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddRecommendation}
                    >
                <Plus className="h-4 w-4 mr-2" />
                Add Procedures
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleComplete}
                disabled={isSaving || questionsWithAnswers.length === 0}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save & Complete
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {questionsWithAnswers.length > 0 
                    ? "No recommendations generated yet. Click 'Generate Procedures' to create recommendations."
                    : "Generate questions and answers first, then generate procedures."}
                </div>
              ) : (
                recommendations.map((rec: any, idx: number) => {
                        const recId = rec.id || rec.__uid || `rec-${idx}`;
                        const recText =
                          typeof rec === "string"
                    ? rec 
                            : rec.text || rec.content || "—";
                        const isEditing = editingRecommendationId === recId;
                  
                  return (
                    <Card key={recId}>
                      <CardContent className="pt-6">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                    <div className="font-medium">
                                      {idx + 1}.
                                    </div>
                              <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={handleSaveRecommendation}
                                      >
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEditRecommendation}
                                      >
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                            <Textarea
                              value={editRecommendationText}
                                    onChange={(e) =>
                                      setEditRecommendationText(e.target.value)
                                    }
                              placeholder="Recommendation"
                              className="min-h-[100px]"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <div className="font-medium mb-2 text-black">
                                {idx + 1}. {recText}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                        onClick={() =>
                                          handleEditRecommendation(rec, idx)
                                        }
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                        onClick={() =>
                                          handleDeleteRecommendation(rec, idx)
                                        }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {rec.checked !== undefined && (
                              <div className="flex items-center gap-2 mt-2">
                                      <Badge
                                        variant={
                                          rec.checked ? "default" : "secondary"
                                        }
                                      >
                                  {rec.checked ? "Completed" : "Pending"}
                                </Badge>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                        );
                })
              )}
            </div>
          </ScrollArea>
              </>
            </div>
          ) : (
            ""
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Review Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-review-status">Status</Label>
              <Select
                value={editReviewStatus}
                onValueChange={setEditReviewStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="ready-for-review">
                    Ready for Review
                  </SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="signed-off">Signed Off</SelectItem>
                  <SelectItem value="re-opened">Re-opened</SelectItem>
                </SelectContent>
              </Select>
    </div>
            <div>
              <Label htmlFor="edit-review-comments">Review Comments</Label>
              <Textarea
                id="edit-review-comments"
                value={editReviewComments}
                onChange={(e) => setEditReviewComments(e.target.value)}
                placeholder="Enter review comments..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateReview} disabled={isUpdatingReview}>
              {isUpdatingReview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Review"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
