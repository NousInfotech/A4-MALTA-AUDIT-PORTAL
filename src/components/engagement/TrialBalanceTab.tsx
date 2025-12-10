// @ts-nocheck
import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Calculator,
  FolderOpen,
  Loader2,
  Wrench,
  ArrowLeftRight,
  FileText,
  Scale,
  Download,
  Search,
  CheckCircle,
  X,
  Sparkles,
  Eye,
  RefreshCw,
  ArrowLeft,
  User,
  Bot,
  Users,
} from "lucide-react";
import { TrialBalanceUpload } from "./TrialBalanceUpload";
import { ExtendedTrialBalance } from "./ExtendedTrialBalance";
import { ClassificationSection } from "./ClassificationSection";
import { IncomeStatementSection } from "./IncomeStatementSection";
import { BalanceSheetSection } from "./BalanceSheetSection";
import { ExportSection } from "./ExportSection";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "../../integrations/supabase/client";
import ProcedureView from "../procedures/ProcedureView";
import { PlanningProcedureView } from "../procedures/PlanningProcedureView";
import { CompletionProcedureView } from "../procedures/CompletionProcedureView";
import { ProcedureTypeSelection } from "../procedures/ProcedureTypeSelection";
import { ProcedureGeneration } from "../procedures/ProcedureGeneration";
import { PlanningProcedureGeneration } from "../procedures/PlanningProcedureGeneration";
import { CompletionProcedureGeneration } from "../procedures/CompletionProcedureGeneration";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface TrialBalanceTabProps {
  engagement: any;
  setEngagement: any;
}

// 🔧 safer auth fetch (don’t throw if no session yet)
async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
}

const formatClassificationForDisplay = (classification: string) => {
  if (!classification) return "—";
  const parts = classification.split(" > ");
  return parts.length >= 3 ? parts[2] : parts[parts.length - 1];
};

export const TrialBalanceTab: React.FC<TrialBalanceTabProps> = ({
  engagement,
  setEngagement,
}) => {
  console.log(
    "formatClassificationForDisplay",
    formatClassificationForDisplay("Equity > Equity > Share Capital")
  );

  console.log(engagement);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("upload");
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [classifications, setClassifications] = useState<string[]>([]);
  const [selectedClassification, setSelectedClassification] =
    useState<string>("");
  const [loading, setLoading] = useState(false);

  // counts for special sections
  const [etbCount, setEtbCount] = useState(0);
  const [adjustmentsCount, setAdjustmentsCount] = useState(0);
  const [reclassificationsCount, setReclassificationsCount] = useState(0);
  
  // ETB rows for Income Statement and Balance Sheet
  const [etbRows, setEtbRows] = useState<any[]>([]);

  // notification counts for classifications
  const [
    classificationNotificationCounts,
    setClassificationNotificationCounts,
  ] = useState<{ [key: string]: number }>({});

  // Procedure states - read from URL params for proper navigation (like ProceduresTab.tsx)
  const selectedProcedureType = (searchParams.get("procedureType") as "planning" | "fieldwork" | "completion") || null;
  const procedureTab = (searchParams.get("procedureTab") as "generate" | "view") || "view";
  const [planningProcedure, setPlanningProcedure] = useState<any>(null);
  const [fieldworkProcedure, setFieldworkProcedure] = useState<any>(null);
  const [completionProcedure, setCompletionProcedure] = useState<any>(null);
  const [procedureLoading, setProcedureLoading] = useState(false);
  const [generatingAnswers, setGeneratingAnswers] = useState(false);
  const [generatingPlanningSections, setGeneratingPlanningSections] = useState<Set<string>>(new Set());
  const [generatingCompletionSections, setGeneratingCompletionSections] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  // 🔧 define AFTER hooks so closures capture the setters
  const loadExistingData = useCallback(async () => {
    if (!engagement?._id) return;
    setLoading(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      if (!base) {
        console.warn("VITE_APIURL is not set");
        setLoading(false);
        return;
      }

      // Trial Balance
      const tbResponse = await authFetch(
        `${base}/api/engagements/${engagement._id}/trial-balance`
      );
      if (tbResponse.ok) {
        const tbData = await tbResponse.json();
        setTrialBalanceData(tbData);
      } else {
        // Not fatal; continue to ETB
        console.warn("TB response not OK:", tbResponse.status);
      }

      // Extended Trial Balance + counts
      const etbResponse = await authFetch(
        `${base}/api/engagements/${engagement._id}/etb`
      );
      if (etbResponse.ok) {
        const etbData = await etbResponse.json();
        const rows = Array.isArray(etbData?.rows) ? etbData.rows : [];

        setEtbRows(rows); // Store ETB rows for Income Statement and Balance Sheet
        setEtbCount(rows.length);
        const adjCount = rows.filter(
          (r: any) => Number(r?.adjustments) !== 0
        ).length;
        const rclsCount = rows.filter(
          (r: any) => Number(r?.reclassification) !== 0
        ).length;
        setAdjustmentsCount(adjCount);
        setReclassificationsCount(rclsCount);

        const uniqueClassifications = [
          ...new Set(rows.map((r: any) => r.classification).filter(Boolean)),
        ];
        setClassifications(uniqueClassifications);

        // Load notification counts immediately after classifications are set
        if (uniqueClassifications.length > 0) {
          // Use a small timeout to ensure state is updated
          setTimeout(() => {
            loadNotificationCountsForClassifications(uniqueClassifications);
          }, 100);
        }

        if (trialBalanceData || tbResponse.ok) setActiveTab("etb");
      } else {
        console.warn("ETB response not OK:", etbResponse.status);
      }
    } catch (error) {
      console.error("Failed to load existing data:", error);
    } finally {
      setLoading(false);
    }
  }, [engagement?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔧 Refresh ETB data only (without switching tabs) - for use when updating from ClassificationSection
  const refreshEtbDataOnly = useCallback(async () => {
    if (!engagement?._id) return;
    
    try {
      const base = import.meta.env.VITE_APIURL;
      if (!base) {
        console.warn("VITE_APIURL is not set");
        return;
      }

      // Only load Extended Trial Balance data
      const etbResponse = await authFetch(
        `${base}/api/engagements/${engagement._id}/etb`
      );
      if (etbResponse.ok) {
        const etbData = await etbResponse.json();
        const rows = Array.isArray(etbData?.rows) ? etbData.rows : [];

        setEtbCount(rows.length);
        const adjCount = rows.filter(
          (r: any) => Number(r?.adjustments) !== 0
        ).length;
        const rclsCount = rows.filter(
          (r: any) => Number(r?.reclassification) !== 0
        ).length;
        setAdjustmentsCount(adjCount);
        setReclassificationsCount(rclsCount);

        const uniqueClassifications = [
          ...new Set(rows.map((r: any) => r.classification).filter(Boolean)),
        ];
        setClassifications(uniqueClassifications);

        // Load notification counts
        if (uniqueClassifications.length > 0) {
          setTimeout(() => {
            loadNotificationCountsForClassifications(uniqueClassifications);
          }, 100);
        }

        // DON'T switch tabs - this is the key difference from loadExistingData
      } else {
        console.warn("ETB response not OK:", etbResponse.status);
      }
    } catch (error) {
      console.error("Failed to refresh ETB data:", error);
    }
  }, [engagement?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 🔧 fetch notification counts for classifications (with direct classifications parameter)
  const loadNotificationCountsForClassifications = useCallback(
    async (classificationsList: string[]) => {
      if (!engagement?._id || classificationsList.length === 0) {
        console.log(
          "loadNotificationCountsForClassifications: Skipping - no engagement ID or classifications"
        );
        return;
      }

      console.log(
        "loadNotificationCountsForClassifications: Loading for classifications:",
        classificationsList
      );

      try {
        const base = import.meta.env.VITE_APIURL;
        if (!base) {
          console.log("loadNotificationCountsForClassifications: No API URL");
          return;
        }

        // Fetch all reviews at once instead of per classification
        const response = await authFetch(
          `${base}/api/classification-reviews?engagementId=${engagement._id}`
        );

        if (response.ok) {
          const data = await response.json();
          const reviews = data.reviews || [];

          console.log(
            "loadNotificationCountsForClassifications: Found",
            reviews.length,
            "total reviews"
          );

          const counts: { [key: string]: number } = {};

          // Process all classifications at once
          for (const classification of classificationsList) {
            // Filter reviews for this classification that are not signed off
            const classificationReviews = reviews.filter((review: any) => {
              const reviewClassification =
                typeof review.classificationId === "string"
                  ? review.classificationId
                  : review.classificationId?.classification || "";
              return (
                reviewClassification === classification &&
                review.status !== "signed-off"
              );
            });

            // Count unique review points (reviews with comments)
            const reviewPointsCount = classificationReviews.filter(
              (review: any) => review.comment && review.comment.trim() !== ""
            ).length;

            counts[classification] = reviewPointsCount;
            console.log(
              `loadNotificationCountsForClassifications: ${classification} = ${reviewPointsCount} notifications`
            );
          }

          console.log(
            "loadNotificationCountsForClassifications: Final counts:",
            counts
          );
          setClassificationNotificationCounts(counts);
        } else {
          console.log(
            "loadNotificationCountsForClassifications: API response not OK:",
            response.status
          );
        }
      } catch (error) {
        console.error("Failed to load notification counts:", error);
      }
    },
    [engagement?._id]
  );

  // 🔧 fetch notification counts for classifications (using state)
  const loadNotificationCounts = useCallback(async () => {
    if (!engagement?._id || classifications.length === 0) {
      console.log(
        "loadNotificationCounts: Skipping - no engagement ID or classifications"
      );
      return;
    }

    console.log(
      "loadNotificationCounts: Loading counts for",
      classifications.length,
      "classifications"
    );
    await loadNotificationCountsForClassifications(classifications);
  }, [
    engagement?._id,
    classifications,
    loadNotificationCountsForClassifications,
  ]);

  // 🔧 call the memoized loader when _id becomes available/changes
  useEffect(() => {
    loadExistingData();
  }, [loadExistingData]);

  // 🔧 load notification counts when classifications change
  useEffect(() => {
    loadNotificationCounts();
  }, [loadNotificationCounts]);

  const handleUploadSuccess = (data: any) => {
    setTrialBalanceData(data);
    setActiveTab("etb");
    setEngagement((prev: any) => ({ ...prev, status: "active" }));
    toast({
      title: "Success",
      description:
        "Trial Balance uploaded successfully. You can now proceed to the Extended Trial Balance.",
    });
  };

  const getClassificationDisplayName = (classification: string) => {
    const parts = classification.split(" > ");
    return parts[parts.length - 1];
  };

  const handleClassificationChange = (newClassifications: string[]) => {
    setClassifications(newClassifications);
  };

  const getClassificationCategory = (classification: string) =>
    classification.split(" > ")[0];

  const shouldCreateSeparateTab = (classification: string) => {
    const category = getClassificationCategory(classification);
    return (
      category === "Assets" ||
      category === "Liabilities" ||
      category === "Equity"
    );
  };

  // const groupClassifications = () => {
  //   const grouped: { [key: string]: string[] } = {};
  //   classifications.forEach((classification) => {
  //     if (shouldCreateSeparateTab(classification)) {
  //       grouped[classification] = [classification];
  //     } else {
  //       const category = getClassificationCategory(classification);
  //       if (!grouped[category]) grouped[category] = [];
  //       grouped[category].push(classification);
  //     }
  //   });
  //   return grouped;
  // };

  const groupClassifications = () => {
  const grouped: { [key: string]: string[] } = {};
  console.log(classifications);
  classifications.forEach((classification) => {
    const parts = classification.split(" > ");
    if (parts.length < 3) return; // ignore level 1–2

    // Group by first 3 levels (the parent)
    const groupKey = parts.slice(0, 3).join(" > ");
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push(classification);
  });

  return grouped;
};


  const groupedClassifications = groupClassifications();
  console.log(groupedClassifications);

  const jumpToClassification = (classification: string) => {
    const key = shouldCreateSeparateTab(classification)
      ? classification
      : getClassificationCategory(classification);

    setSelectedClassification(key);

    setActiveTab("sections");
  };

  // Load procedure data when procedure type changes from URL
  const loadProcedure = useCallback(async (procedureType: "planning" | "fieldwork" | "completion") => {
    if (!engagement?._id) return;
    
    setProcedureLoading(true);
    
    try {
      const base = import.meta.env.VITE_APIURL;
      
      if (procedureType === "planning") {
        const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}`);
        if (res.ok) {
          const data = await res.json();
          setPlanningProcedure(data);
        }
      } else if (procedureType === "fieldwork") {
        const res = await authFetch(`${base}/api/procedures/${engagement._id}`);
        if (res.ok) {
          const data = await res.json();
          setFieldworkProcedure(data?.procedure || data);
        }
      } else if (procedureType === "completion") {
        const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}`);
        if (res.ok) {
          const data = await res.json();
          setCompletionProcedure(data);
        }
      }
    } catch (error) {
      console.error("Error loading procedure:", error);
      toast({
        title: "Error",
        description: "Failed to load procedure data",
        variant: "destructive",
      });
    } finally {
      setProcedureLoading(false);
    }
  }, [engagement?._id, toast]);

  // Separate load functions for initial loading (like ProceduresTab.tsx)
  const base = import.meta.env.VITE_APIURL;
  const loadFieldwork = async () => {
    try {
      const res = await authFetch(`${base}/api/procedures/${engagement._id}`);
      const data = await res.json();
      if (res.ok && data?.procedure) {
        setFieldworkProcedure(data.procedure);
      }
    } catch (error) {
      console.error("Error fetching fieldwork procedure:", error);
    }
  };

  const loadCompletion = async () => {
    try {
      const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}`);
      if (res.ok) setCompletionProcedure(await res.json());
    } catch { }
  };

  const loadPlanning = async () => {
    try {
      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}`);
      if (res.ok) setPlanningProcedure(await res.json());
    } catch { }
  };

  // Initial load of all procedures (like ProceduresTab.tsx)
  useEffect(() => {
    if (!engagement?._id) return;
    loadFieldwork();
    loadPlanning();
    loadCompletion();
  }, [engagement?._id]);

  // Load procedures when procedureType changes from URL (like ProceduresTab.tsx)
  useEffect(() => {
    if (!engagement?._id) return;
    if (selectedProcedureType) {
      loadProcedure(selectedProcedureType);
    }
  }, [engagement?._id, selectedProcedureType, loadProcedure]);

  // Generate Answers for Field Work Procedures (all classifications)
  const generateAnswersForAllClassifications = async () => {
    if (!fieldworkProcedure || !engagement?._id) return;

    setGeneratingAnswers(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      
      // Get all questions without answers
      const questionsWithoutAnswers = (fieldworkProcedure.questions || [])
        .filter((q: any) => !q.answer || q.answer.trim() === "")
        .map(({ answer, ...rest }: any) => rest);

      if (questionsWithoutAnswers.length === 0) {
        toast({
          title: "Info",
          description: "All questions already have answers.",
        });
        return;
      }

      const res = await authFetch(
        `${base}/api/procedures/ai/classification-answers/separate`,
        {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            engagementId: engagement._id,
            questions: questionsWithoutAnswers,
            classification: null, // Generate for all classifications
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to generate answers");

      const data = await res.json();

      let updatedProcedure = { ...fieldworkProcedure };

      if (Array.isArray(data?.aiAnswers)) {
        // Merge answers with existing questions
        const answerMap = new Map();
        data.aiAnswers.forEach((a: any) => {
          const key = String(a?.key || "").trim().toLowerCase();
          if (key) answerMap.set(key, a?.answer || "");
        });

        updatedProcedure.questions = (fieldworkProcedure.questions || []).map((q: any) => {
          const qKey = String(q.key || "").trim().toLowerCase();
          if (answerMap.has(qKey) && (!q.answer || q.answer.trim() === "")) {
            return { ...q, answer: answerMap.get(qKey) };
          }
          return q;
        });
      } else if (Array.isArray(data?.questions)) {
        updatedProcedure.questions = data.questions;
      }

      if (data.recommendations) {
        updatedProcedure.recommendations = data.recommendations;
      }

      setFieldworkProcedure(updatedProcedure);
      toast({
        title: "Success",
        description: "Answers generated successfully for all classifications.",
      });
    } catch (error: any) {
      console.error("Generate answers error:", error);
      toast({
        title: "Error",
        description: `Generation failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setGeneratingAnswers(false);
    }
  };

  // Generate Answers for Planning Procedures (for a specific section)
  const generateAnswersForPlanningSection = async (sectionId: string) => {
    if (!planningProcedure || !engagement?._id) return;

    setGeneratingPlanningSections(prev => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      return newSet;
    });

    try {
      const base = import.meta.env.VITE_APIURL;
      const res = await authFetch(
        `${base}/api/planning-procedures/${engagement._id}/generate/section-answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId }),
        }
      );

      if (!res.ok) throw new Error("Failed to generate answers for section");
      const data = await res.json();

      const extractAnswers = (responseData: any) => {
        const answers: Record<string, any> = {};
        if (responseData.fields && Array.isArray(responseData.fields)) {
          responseData.fields.forEach((fieldItem: any) => {
            const fieldData = fieldItem._doc || fieldItem;
            const key = fieldData.key;
            if (!key) return;
            const answer =
              fieldItem.answer !== undefined ? fieldItem.answer :
              fieldData.answer !== undefined ? fieldData.answer :
              fieldData.content !== undefined ? fieldData.content : null;
            answers[key] = answer;
          });
        }
        return answers;
      };

      const answers = extractAnswers(data);

      setPlanningProcedure((prev: any) => {
        const updated = { ...prev };
        updated.procedures = (prev.procedures || []).map((sec: any) =>
          sec.sectionId === data.sectionId
            ? {
                ...sec,
                fields: (sec.fields || []).map((existingField: any) => {
                  const key = existingField?.key;
                  if (!key) return existingField;
                  const answerFromResponse = answers[key] !== undefined ? answers[key] : existingField.answer;
                  return {
                    ...existingField,
                    answer: answerFromResponse
                  };
                })
              }
            : sec
        );
        return updated;
      });

      toast({
        title: "Success",
        description: `Answers generated successfully for section.`,
      });
    } catch (error: any) {
      console.error("Generate planning answers error:", error);
      toast({
        title: "Error",
        description: `Generation failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setGeneratingPlanningSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }
  };

  // Generate Answers for Completion Procedures (for a specific section)
  const generateAnswersForCompletionSection = async (sectionId: string) => {
    if (!completionProcedure || !engagement?._id) return;

    setGeneratingCompletionSections(prev => {
      const newSet = new Set(prev);
      newSet.add(sectionId);
      return newSet;
    });

    try {
      const base = import.meta.env.VITE_APIURL;
      const res = await authFetch(
        `${base}/api/completion-procedures/${engagement._id}/generate/section-answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId }),
        }
      );

      if (!res.ok) throw new Error("Failed to generate answers for section");
      const data = await res.json();

      const extractAnswers = (responseData: any) => {
        const answers: Record<string, any> = {};
        if (responseData.fields && Array.isArray(responseData.fields)) {
          responseData.fields.forEach((fieldItem: any) => {
            const fieldData = fieldItem._doc || fieldItem;
            const key = fieldData.key;
            if (!key) return;
            const answer =
              fieldItem.answer !== undefined ? fieldItem.answer :
              fieldData.answer !== undefined ? fieldData.answer :
              fieldData.content !== undefined ? fieldData.content : null;
            answers[key] = answer;
          });
        }
        return answers;
      };

      const answers = extractAnswers(data);

      setCompletionProcedure((prev: any) => {
        const updated = { ...prev };
        updated.procedures = (prev.procedures || []).map((sec: any) =>
          sec.sectionId === data.sectionId
            ? {
                ...sec,
                fields: (sec.fields || []).map((existingField: any) => {
                  const key = existingField?.key;
                  if (!key) return existingField;
                  const answerFromResponse = answers[key] !== undefined ? answers[key] : existingField.answer;
                  return {
                    ...existingField,
                    answer: answerFromResponse
                  };
                })
              }
            : sec
        );
        return updated;
      });

      toast({
        title: "Success",
        description: `Answers generated successfully for section.`,
      });
    } catch (error: any) {
      console.error("Generate completion answers error:", error);
      toast({
        title: "Error",
        description: `Generation failed: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setGeneratingCompletionSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(sectionId);
        return newSet;
      });
    }
  };

  // Helper function to update procedure params (for generation flow navigation)
  const updateProcedureParams = useCallback((updates: Record<string, string | null>, replace = false) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    setSearchParams(newParams, { replace });
  }, [searchParams, setSearchParams]);

  const handleProcedureButtonClick = (procedureType: "planning" | "fieldwork" | "completion") => {
    setSelectedClassification(""); // Clear classification selection
    
    // Determine default tab based on whether questions/answers exist
    let defaultTab: "generate" | "view" = "generate";
    
    if (procedureType === "planning") {
      const hasQuestions = planningProcedure?.procedures?.some((sec: any) => 
        sec?.fields && Array.isArray(sec.fields) && sec.fields.length > 0
      );
      defaultTab = hasQuestions ? "view" : "generate";
    } else if (procedureType === "fieldwork") {
      const hasQuestions = fieldworkProcedure?.questions && 
        Array.isArray(fieldworkProcedure.questions) && 
        fieldworkProcedure.questions.length > 0;
      defaultTab = hasQuestions ? "view" : "generate";
    } else if (procedureType === "completion") {
      const hasQuestions = completionProcedure?.procedures?.some((sec: any) => 
        sec?.fields && Array.isArray(sec.fields) && sec.fields.length > 0
      );
      defaultTab = hasQuestions ? "view" : "generate";
    }
    
    updateProcedureParams({
      procedureType: procedureType,
      procedureTab: defaultTab,
      mode: null,
      step: null
    }, false);
  };

  const handleProcedureTypeSelect = (type: "planning" | "fieldwork" | "completion") => {
    // Set procedure type and clear mode/step (will be set by the generation component)
    updateProcedureParams({
      procedureType: type,
      procedureTab: "generate",
      mode: null,
      step: null
    }, false);
  };

  const handleProcedureTypeBack = () => {
    // Clear procedure type and all nested params
    updateProcedureParams({
      procedureType: null,
      mode: null,
      step: null
    }, false);
  };

  const handleProcedureComplete = (procedureData: any) => {
    if (procedureData?.procedureType === "planning") {
      setPlanningProcedure(procedureData);
      loadProcedure("planning"); // Reload to get latest data
    } else if (procedureData?.procedureType === "fieldwork" || procedureData?.procedureType === "procedures") {
      setFieldworkProcedure(procedureData);
      loadProcedure("fieldwork"); // Reload to get latest data
    } else {
      setCompletionProcedure(procedureData);
      loadProcedure("completion"); // Reload to get latest data
    }
    // Navigate to view tab and clear procedure generation params
    updateProcedureParams({
      procedureTab: "view",
      procedureType: procedureData?.procedureType === "procedures" ? "fieldwork" : procedureData?.procedureType || null,
      mode: null,
      step: null
    }, false);
    toast({
      title: "Procedures Generated",
      description: "Saved successfully."
    });
  };

  const handleProcedureTabChange = (tab: "generate" | "view") => {
    updateProcedureParams({ procedureTab: tab }, false);
  };

  const handleRegenerate = () => {
    // Hierarchical back navigation (matching EngagementDetails.tsx logic)
    const procedureType = searchParams.get("procedureType");
    const mode = searchParams.get("mode");
    const step = searchParams.get("step");
    
    // If in tabs view (step === "tabs"), go back to questions step
    if (procedureType && step === "tabs") {
      updateProcedureParams({
        procedureTab: "generate",
        step: "1" // Go back to questions step (step 1)
      }, false);
      return;
    }
    
    // If in a numbered step, go back one step or to mode selection
    if (procedureType && mode && step) {
      const stepNum = parseInt(step, 10);
      
      if (stepNum > 0) {
        // Go back one step
        updateProcedureParams({
          procedureTab: "generate",
          step: (stepNum - 1).toString()
        }, false);
      } else {
        // At step 0, go back to mode selection (clear step and mode)
        updateProcedureParams({
          procedureTab: "generate",
          mode: null,
          step: null
        }, false);
      }
      return;
    }
    
    // If at mode selection (mode exists but no step), clear mode
    if (procedureType && mode && !step) {
      updateProcedureParams({
        procedureTab: "generate",
        mode: null
      }, false);
      return;
    }
    
    // If at procedure type selection (procedureType exists but no mode), clear procedureType
    if (procedureType && !mode) {
      updateProcedureParams({
        procedureTab: "generate",
        procedureType: null
      }, false);
      return;
    }
    
    // Fallback: Clear all procedure params
    updateProcedureParams({
      procedureTab: "generate",
      procedureType: null,
      mode: null,
      step: null
    }, false);
  };

  const handleCloseProcedure = () => {
    updateProcedureParams({
      procedureType: null,
      procedureTab: null,
      mode: null,
      step: null
    }, false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading Trial Balance data...</span>
      </div>
    );
  }
  console.log("selectedClassification", selectedClassification);
  return (
    <div className="h-full flex flex-col bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
      <div className="flex-1">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="h-full flex flex-col"
        >
          {/* Fixed tabs container outside of any table constraints */}
          <div className="flex-shrink-0 border-b bg-gray-50/80 backdrop-blur-sm">
            <div className="px-4 py-2">
              <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-white/30 p-1 rounded-xl">
                <TabsTrigger
                  value="upload"
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg rounded-lg"
                >
                  <FileSpreadsheet className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Upload TB</span>
                  <span className="sm:hidden">Upload</span>
                </TabsTrigger>
                <TabsTrigger
                  value="etb"
                  disabled={!trialBalanceData}
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg disabled:opacity-50 rounded-lg"
                >
                  <Calculator className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Extended TB</span>
                  <span className="sm:hidden">ETB</span>
                </TabsTrigger>

                

                <TabsTrigger
                  value="sections"
                  className="flex items-center gap-2 whitespace-nowrap text-sm px-3 py-2 data-[state=active]:bg-amber-100 data-[state=active]:text-gray-900 data-[state=active]:shadow-lg rounded-lg"
                >
                  <FolderOpen className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Sections</span>
                  <span className="sm:hidden">Sections</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="etb" className="flex-1 overflow-hidden">
            {trialBalanceData && (
              <ExtendedTrialBalance
                engagement={engagement}
                trialBalanceData={trialBalanceData}
                onClassificationChange={handleClassificationChange}
                onClassificationJump={jumpToClassification}
                loadExistingData={loadExistingData}
              />
            )}
          </TabsContent>

          <TabsContent value="upload" className="flex-1 overflow-hidden">
            <TrialBalanceUpload
              engagement={engagement}
              onUploadSuccess={handleUploadSuccess}
            />
          </TabsContent>

          

          <TabsContent value="sections" className="flex-1 overflow-hidden">
            <div className="flex h-full flex-col md:flex-row">
              {/* Sidebar */}
              <div className="w-full md:w-80 border-r bg-gray-50/80 backdrop-blur-sm flex-shrink-0">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Sections</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Quick views and classifications
                  </p>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {/* Procedure Type Buttons */}
                    <Button
                      variant={selectedProcedureType === "planning" ? "default" : "outline"}
                      className="w-full justify-between h-auto p-3 bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => handleProcedureButtonClick("planning")}
                    >
                      <span className="flex items-center gap-2">
                        <Search className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          Planning Procedures
                        </span>
                        <span className="sm:hidden">Planning</span>
                      </span>
                    </Button>

                    <Button
                      variant={selectedProcedureType === "fieldwork" ? "default" : "outline"}
                      className="w-full justify-between h-auto p-3 bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => handleProcedureButtonClick("fieldwork")}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          Field Work Procedures
                        </span>
                        <span className="sm:hidden">Field Work</span>
                      </span>
                    </Button>

                    <Button
                      variant={selectedProcedureType === "completion" ? "default" : "outline"}
                      className="w-full justify-between h-auto p-3 bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => handleProcedureButtonClick("completion")}
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">
                          Completion Procedures
                        </span>
                        <span className="sm:hidden">Completion</span>
                      </span>
                    </Button>

                    {etbCount > 0 && (
                      <Button
                        variant={
                          selectedClassification === "ETB"
                            ? "default"
                            : "outline"
                        }
                        className="w-full justify-between h-auto p-3  bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                        onClick={() => {
                          updateProcedureParams({ procedureType: null, mode: null, step: null }, false);
                          setSelectedClassification("ETB");
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          <span className="hidden sm:inline">
                            Extended Trial Balance
                          </span>
                          <span className="sm:hidden">ETB</span>
                        </span>
                        <Badge variant="secondary">{etbCount}</Badge>
                      </Button>
                    )}

                    <Button
                      variant={
                        selectedClassification === "Adjustments"
                          ? "default"
                          : "outline"
                      }
                      className="w-full justify-between h-auto p-3  bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => {
                        updateProcedureParams({ procedureType: null, mode: null, step: null }, false);
                        setSelectedClassification("Adjustments");
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Adjustments
                      </span>
                      {adjustmentsCount === 0 ? "" : <Badge variant="secondary">{adjustmentsCount}</Badge>}
                    </Button>

                    <Button
                      variant={
                        selectedClassification === "Reclassifications"
                          ? "default"
                          : "outline"
                      }
                      className="w-full justify-between h-auto p-3  bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => {
                        updateProcedureParams({ procedureType: null, mode: null, step: null }, false);
                        setSelectedClassification("Reclassifications");
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4" />
                        Reclassifications
                      </span>
                      {reclassificationsCount === 0 ? "" : <Badge variant="secondary">{reclassificationsCount}</Badge>}
                    </Button>

                    <Button
                      variant={
                        selectedClassification === "Exports"
                          ? "default"
                          : "outline"
                      }
                      className="w-full justify-between h-auto p-3 bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => {
                        updateProcedureParams({ procedureType: null, mode: null, step: null }, false);
                        setSelectedClassification("Exports");
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Exports
                      </span>
                    </Button>

                    <Button
                      variant={
                        selectedClassification === "IncomeStatement"
                          ? "default"
                          : "outline"
                      }
                      className="w-full justify-between h-auto p-3  bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => {
                        updateProcedureParams({ procedureType: null, mode: null, step: null }, false);
                        setSelectedClassification("IncomeStatement");
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Income Statement
                      </span>
                    </Button>

                    <Button
                      variant={
                        selectedClassification === "BalanceSheet"
                          ? "default"
                          : "outline"
                      }
                      className="w-full justify-between h-auto p-3  bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                      onClick={() => {
                        updateProcedureParams({ procedureType: null, mode: null, step: null }, false);
                        setSelectedClassification("BalanceSheet");
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Scale className="h-4 w-4" />
                        Balance Sheet
                      </span>
                    </Button>

                    {(etbCount > 0 || adjustmentsCount > 0 || reclassificationsCount > 0) && (
                      <div className="text-xs uppercase text-gray-500 px-3 pt-3">
                        Classifications
                      </div>
                    )}

                    <div className="mt-1" />
                    {(() => {
                      // Helper function to check if a classification is a leaf node
                      const isLeafNode = (key: string) => {
                        const allKeys = Object.keys(groupedClassifications);
                        return !allKeys.some(
                          (otherKey) =>
                            otherKey !== key &&
                            otherKey.startsWith(key + " > ")
                        );
                      };

                      // Group classifications by the desired structure
                      const assetsGroup: {
                        [subtitle: string]: Array<[string, string[]]>;
                      } = {};
                      const equityGroup: {
                        [subtitle: string]: Array<[string, string[]]>;
                      } = {};
                      const liabilitiesGroup: {
                        [subtitle: string]: Array<[string, string[]]>;
                      } = {};

                      Object.entries(groupedClassifications).forEach(
                        ([key, classificationList]) => {
                          if (key === "Adjustments" || key === "Reclassifications") return;

                          const parts = key.split(" > ");
                          if (parts.length < 3) return;

                          const level1 = parts[0] || "";
                          const level2 = parts[1] || "";

                          // Group Assets
                          if (level1 === "Assets") {
                            if (!assetsGroup[level2]) assetsGroup[level2] = [];
                            assetsGroup[level2].push([key, classificationList]);
                          }
                          // Group Equity
                          else if (level1 === "Equity") {
                            if (!equityGroup[level2]) equityGroup[level2] = [];
                            equityGroup[level2].push([key, classificationList]);
                          }
                          // Group Liabilities
                          else if (level1 === "Liabilities") {
                            if (!liabilitiesGroup[level2]) liabilitiesGroup[level2] = [];
                            liabilitiesGroup[level2].push([key, classificationList]);
                          }
                        }
                      );

                      // Define subtitle order for each group
                      const assetsSubtitleOrder = ["Non-current", "Current"];
                      const equitySubtitleOrder = ["Equity", "Current Year Profits & Losses"];
                      const liabilitiesSubtitleOrder = ["Non-current", "Current"];

                      const sortSubtitles = (
                        subtitles: string[],
                        order: string[]
                      ) => {
                        return subtitles.sort((a, b) => {
                          // Case-insensitive matching
                          const normalizedOrder = order.map(o => o.toLowerCase());
                          const aIndex = normalizedOrder.indexOf(a.toLowerCase());
                          const bIndex = normalizedOrder.indexOf(b.toLowerCase());
                          if (aIndex === -1 && bIndex === -1)
                            return a.localeCompare(b);
                          if (aIndex === -1) return 1;
                          if (bIndex === -1) return -1;
                          return aIndex - bIndex;
                        });
                      };

                      // Render function for a group
                      const renderGroup = (
                        level1Title: string,
                        group: { [subtitle: string]: Array<[string, string[]]> },
                        subtitleOrder: string[]
                      ) => {
                        const subtitles = sortSubtitles(
                          Object.keys(group),
                          subtitleOrder
                        );

                        if (subtitles.length === 0) return null;

                        return (
                          <div key={level1Title}>
                            {/* Level 1 Header */}
                            <div className="text-sm uppercase text-gray-700 px-3 pt-4 pb-2 font-bold">
                              {level1Title}
                            </div>

                            {/* Level 2 Subtitles */}
                            {subtitles.map((subtitle) => {
                              const items = group[subtitle];
                              return (
                                <div key={`${level1Title}-${subtitle}`}>
                                  {/* Level 2 Header */}
                                  <div className="text-xs uppercase text-gray-500 px-3 pt-2 pb-1 font-semibold">
                                    {subtitle}
                                  </div>

                                  {/* Level 3 Items */}
                                  {items
                                    .filter(([key]) => isLeafNode(key))
                                    .map(([key, classificationList]) => {
                                      const notificationCount =
                                        classificationNotificationCounts[key] ||
                                        0;

                                      return (
                                        <div key={key} className="px-2 mb-2">
                                          <Button
                                            variant={
                                              selectedClassification === key
                                                ? "default"
                                                : "outline"
                                            }
                                            className="w-full justify-between text-left h-auto p-3 bg-brand-body hover:bg-amber-100 border border-amber-200 text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl flex flex-row flex-wrap items-start gap-2 overflow-hidden whitespace-normal break-words"
                                            onClick={() => {
                                              updateProcedureParams({ procedureType: null, mode: null, step: null }, false);
                                              setSelectedClassification(key);
                                            }}
                                          >
                                            <div className="flex flex-col items-start flex-1 min-w-0">
                                              <div className="font-medium whitespace-normal break-words">
                                                {formatClassificationForDisplay(
                                                  key
                                                )}
                                              </div>
                                            </div>
                                            {notificationCount > 0 && (
                                              <Badge
                                                variant="destructive"
                                                className="ml-2 bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 flex-shrink-0"
                                              >
                                                {notificationCount}
                                              </Badge>
                                            )}
                                          </Button>
                                        </div>
                                      );
                                    })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      };

                      return (
                        <>
                          {/* Assets Section */}
                          {renderGroup("Assets", assetsGroup, assetsSubtitleOrder)}

                          {/* Liabilities & Equity Section */}
                          {(Object.keys(equityGroup).length > 0 ||
                            Object.keys(liabilitiesGroup).length > 0) && (
                            <div>
                              {/* Grouping Title */}
                              <div className="text-sm uppercase text-gray-800 px-3 pt-4 pb-2 font-bold bg-gray-100/50 rounded-lg mx-2">
                                Liabilities & Equity
                              </div>

                              {/* Equity Subsection */}
                              {renderGroup(
                                "Equity",
                                equityGroup,
                                equitySubtitleOrder
                              )}

                              {/* Liabilities Subsection */}
                              {renderGroup(
                                "Liabilities",
                                liabilitiesGroup,
                                liabilitiesSubtitleOrder
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {etbCount === 0 &&
                      adjustmentsCount === 0 &&
                      reclassificationsCount === 0 &&
                      Object.keys(groupedClassifications).length === 0 && (
                        <div className="text-center text-sm text-gray-500 py-6">
                          No sections available yet.
                        </div>
                      )}
                  </div>
                </ScrollArea>
              </div>

              {/* Content Panel */}
              <div className="flex-1 min-w-0">
                {selectedProcedureType ? (
                  // Procedure Content with Generate/View Tabs
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b bg-gray-50/80">
                      <div className="flex items-center gap-3">
                        {selectedProcedureType && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl bg-white border border-gray-200 text-brand-body hover:bg-gray-100 hover:text-brand-body shadow-sm"
                            aria-label="Back"
                            onClick={() => {
                              const procedureType = searchParams.get("procedureType");
                              const mode = searchParams.get("mode");
                              const step = searchParams.get("step");
                              
                              // If in tabs view (step === "tabs"), go back to questions step
                              if (procedureType && step === "tabs") {
                                updateProcedureParams({
                                  procedureTab: "generate",
                                  step: "1" // Go back to questions step (step 1)
                                }, false);
                                return;
                              }
                              
                              // If in a numbered step, go back one step or to mode selection
                              if (procedureType && mode && step) {
                                const stepNum = parseInt(step, 10);
                                
                                if (stepNum > 0) {
                                  // Go back one step
                                  updateProcedureParams({
                                    procedureTab: "generate",
                                    step: (stepNum - 1).toString()
                                  }, false);
                                } else {
                                  // At step 0, go back to mode selection (clear step and mode)
                                  updateProcedureParams({
                                    procedureTab: "generate",
                                    mode: null,
                                    step: null
                                  }, false);
                                }
                                return;
                              }
                              
                              // If at mode selection (mode exists but no step), clear mode
                              if (procedureType && mode && !step) {
                                updateProcedureParams({
                                  procedureTab: "generate",
                                  mode: null
                                }, false);
                                return;
                              }
                              
                              // If at procedure type selection (procedureType exists but no mode), clear procedureType
                              if (procedureType && !mode) {
                                updateProcedureParams({
                                  procedureTab: "generate",
                                  procedureType: null
                                }, false);
                                return;
                              }
                              
                              // Fallback: Clear all procedure params
                              updateProcedureParams({
                                procedureTab: "generate",
                                procedureType: null,
                                mode: null,
                                step: null
                              }, false);
                            }}
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                        )}
                        <h3 className="font-semibold text-lg">
                          {selectedProcedureType === "planning" && "Planning Procedures"}
                          {selectedProcedureType === "fieldwork" && "Field Work Procedures"}
                          {selectedProcedureType === "completion" && "Completion Procedures"}
                        </h3>
                        {selectedProcedureType && (
                          <Button 
                            variant="outline" 
                            onClick={handleRegenerate} 
                            className="flex items-center gap-2 bg-transparent"
                            size="sm"
                          >
                            <RefreshCw className="h-4 w-4" /> Back to Procedure Selection
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCloseProcedure}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {procedureLoading ? (
                      <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading Procedures...</span>
                      </div>
                    ) : (
                      <Tabs value={procedureTab} onValueChange={(value) => handleProcedureTabChange(value as "generate" | "view")} className="flex-1">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="generate" className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" /> Generate Procedures
                          </TabsTrigger>
                          <TabsTrigger value="view" className="flex items-center gap-2">
                            <Eye className="h-4 w-4" /> View Procedures
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="generate" className="flex-1 mt-6">
                          {!selectedProcedureType ? (
                            <ProcedureTypeSelection 
                              onTypeSelect={handleProcedureTypeSelect} 
                              title="Choose the type of audit procedures you want to generate" 
                            />
                          ) : !searchParams.get("mode") ? (
                            // Show vertical approach selection when procedure type is selected but mode is not
                            <div className="p-6">
                              <div className="text-center mb-6">
                                <h3 className="font-heading text-xl text-foreground mb-2">Choose Your Approach</h3>
                                <p className="text-muted-foreground text-sm">Select how you'd like to generate your procedures</p>
                              </div>
                              <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                                <Button
                                  variant={searchParams.get("mode") === "manual" ? "default" : "outline"}
                                  className="w-full flex flex-row items-center justify-start gap-4 h-auto p-6 hover:bg-primary/5 hover:border-primary/50 transition-all"
                                  onClick={() => updateProcedureParams({ mode: "manual", step: "0" }, false)}
                                >
                                  <div className="p-3 rounded-lg bg-primary text-white">
                                    <User className="h-6 w-6" />
                                  </div>
                                  <div className="text-left flex-1">
                                    <div className="font-semibold text-base">Manual</div>
                                    <div className="text-xs text-muted-foreground mt-1">Predefined templates</div>
                                  </div>
                                </Button>
                                <Button
                                  variant={searchParams.get("mode") === "ai" ? "default" : "outline"}
                                  className="w-full flex flex-row items-center justify-start gap-4 h-auto p-6 hover:bg-accent/5 hover:border-accent/50 transition-all"
                                  onClick={() => updateProcedureParams({ mode: "ai", step: "0" }, false)}
                                >
                                  <div className="p-3 rounded-lg bg-accent text-white">
                                    <Bot className="h-6 w-6" />
                                  </div>
                                  <div className="text-left flex-1">
                                    <div className="font-semibold text-base">AI</div>
                                    <div className="text-xs text-muted-foreground mt-1">AI-powered generation</div>
                                  </div>
                                </Button>
                                <Button
                                  variant={searchParams.get("mode") === "hybrid" ? "default" : "outline"}
                                  className="w-full flex flex-row items-center justify-start gap-4 h-auto p-6 hover:bg-secondary/5 hover:border-secondary/50 transition-all"
                                  onClick={() => updateProcedureParams({ mode: "hybrid", step: "0" }, false)}
                                >
                                  <div className="p-3 rounded-lg bg-secondary text-white">
                                    <Users className="h-6 w-6" />
                                  </div>
                                  <div className="text-left flex-1">
                                    <div className="font-semibold text-base">Hybrid</div>
                                    <div className="text-xs text-muted-foreground mt-1">AI + Manual control</div>
                                  </div>
                                </Button>
                              </div>
                            </div>
                          ) : selectedProcedureType === "planning" ? (
                            <PlanningProcedureGeneration
                              engagement={engagement}
                              existingProcedure={planningProcedure}
                              onComplete={handleProcedureComplete}
                              onBack={handleProcedureTypeBack}
                              updateProcedureParams={updateProcedureParams}
                              searchParams={searchParams}
                            />
                          ) : selectedProcedureType === "fieldwork" ? (
                            <ProcedureGeneration
                              engagement={engagement}
                              existingProcedure={fieldworkProcedure}
                              onBack={handleProcedureTypeBack}
                              onComplete={handleProcedureComplete}
                              updateProcedureParams={updateProcedureParams}
                              searchParams={searchParams}
                            />
                          ) : selectedProcedureType === "completion" ? (
                            <CompletionProcedureGeneration
                              engagement={engagement}
                              onBack={handleProcedureTypeBack}
                              existingProcedure={completionProcedure}
                              onComplete={handleProcedureComplete}
                              updateProcedureParams={updateProcedureParams}
                              searchParams={searchParams}
                            />
                          ) : null}
                        </TabsContent>

                        <TabsContent value="view" className="flex-1 mt-6 px-4 pb-4">
                          {!selectedProcedureType ? (
                            <ProcedureTypeSelection onTypeSelect={handleProcedureTypeSelect} title={"Choose the type of audit procedures you want to view"} />
                          ) : selectedProcedureType === "planning" ? (
                            planningProcedure ? (
                              <PlanningProcedureView procedure={planningProcedure} engagement={engagement} />
                            ) : <div className="text-muted-foreground">No Planning procedures found.</div>
                          ) : selectedProcedureType === "fieldwork" ? (
                            fieldworkProcedure ? (
                              <ProcedureView procedure={fieldworkProcedure} engagement={engagement} onRegenerate={handleRegenerate} />
                            ) : <div className="text-muted-foreground">No Fieldwork procedures found.</div>
                          ) : completionProcedure ? (
                            <CompletionProcedureView procedure={completionProcedure} engagement={engagement} onRegenerate={handleRegenerate} />
                          ) : <div className="text-muted-foreground">No Completion procedures found.</div>}
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                ) : selectedClassification === "IncomeStatement" ? (
                  <IncomeStatementSection
                    engagement={engagement}
                    etbRows={etbRows}
                    financialYearStart={engagement?.financialYearStart}
                    financialYearEnd={engagement?.financialYearEnd}
                  />
                ) : selectedClassification === "BalanceSheet" ? (
                  <BalanceSheetSection
                    engagement={engagement}
                    etbRows={etbRows}
                    financialYearStart={engagement?.financialYearStart}
                    financialYearEnd={engagement?.financialYearEnd}
                  />
                ) : selectedClassification === "Exports" ? (
                  <ExportSection
                    engagement={engagement}
                    onClose={() => setSelectedClassification("")}
                  />
                ) : selectedClassification ? (
                  <ClassificationSection
                    engagement={engagement}
                    classification={selectedClassification}
                    onClose={() => setSelectedClassification("")}
                    onClassificationJump={jumpToClassification}
                    onReviewStatusChange={loadNotificationCounts}
                    loadExistingData={refreshEtbDataOnly}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full p-6">
                    <div className="text-center">
                      <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Select a Section
                      </h3>
                      <p className="text-gray-500">
                        Pick <strong>Planning Procedures</strong>, <strong>Field Work Procedures</strong>, <strong>Completion Procedures</strong>,{" "}
                        <strong>Extended Trial Balance</strong>,{" "}
                        <strong>Adjustments</strong>, <strong>Reclassifications</strong>,{" "}
                        <strong>Income Statement</strong>, <strong>Balance Sheet</strong>, <strong>Exports</strong>, or any classification from
                        the sidebar.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
