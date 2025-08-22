// @ts-nocheck
import type React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Loader2,
  Bug,
  Sparkles,
  Zap,
  Brain,
  Target,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

interface ProcedureQuestionsStepProps {
  engagement: any;
  mode: string;
  stepData: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}

interface ProcessingStatus {
  classification: string;
  status: "queued" | "loading" | "completed" | "error";
  error?: string;
  progress?: number;
}

const DEFAULT_VISIBLE = 8;

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

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Number.POSITIVE_INFINITY,
      ease: "easeInOut",
    },
  },
};

const shimmerVariants = {
  shimmer: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 2,
      repeat: Number.POSITIVE_INFINITY,
      ease: "linear",
    },
  },
};

const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/20 rounded-full"
          initial={{
            x: Math.random() * 400,
            y: Math.random() * 300,
          }}
          animate={{
            x: Math.random() * 400,
            y: Math.random() * 300,
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

const ProgressRing = ({
  progress,
  size = 60,
}: {
  progress: number;
  size?: number;
}) => {
  const circumference = 2 * Math.PI * (size / 2 - 4);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          stroke="currentColor"
          strokeWidth="2"
          fill="transparent"
          className="text-muted-foreground/20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 4}
          stroke="url(#gradient)"
          strokeWidth="3"
          fill="transparent"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray,
          }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-primary">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

function proceduresToQuestionsFallback(result: any): any[] {
  const procArr = result?.procedure?.procedures;
  if (!Array.isArray(procArr) || procArr.length === 0) return [];

  const narrative = result?.narrative || result?.procedure?.narrative || "";

  const qs = procArr.map((p: any, idx: number) => ({
    id: p.id || `ai_${idx + 1}`,
    question: p.title || `Procedure ${idx + 1}`,
    answer: narrative || "",
    isRequired: false,
    classification: p.classification || p.area || "General",
    procedure: p,
  }));

  return qs;
}

export const ProcedureQuestionsStep: React.FC<ProcedureQuestionsStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus[]>(
    []
  );
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [editedAnswer, setEditedAnswer] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [rawResult, setRawResult] = useState<any>(null);
  const [recommendations, setRecommendations] = useState([]);
  const [showDebug, setShowDebug] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<string>("");
  const [aiThinking, setAiThinking] = useState(false);
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    if (loading && mode !== "manual") {
      const phases = [
        "Analyzing working papers...",
        "Identifying risk areas...",
        "Generating procedures...",
        "Optimizing recommendations...",
        "Finalizing results...",
      ];

      let phaseIndex = 0;
      const phaseInterval = setInterval(() => {
        if (phaseIndex < phases.length) {
          setProcessingPhase(phases[phaseIndex]);
          phaseIndex++;
        } else {
          clearInterval(phaseInterval);
        }
      }, 1200);

      return () => clearInterval(phaseInterval);
    }
  }, [loading, mode]);

  useEffect(() => {
    if (mode === "manual") {
      loadManualProcedures();
    } else {
      generateAIProcedures();
    }
  }, [mode, JSON.stringify(stepData?.selectedClassifications || [])]);

  const loadManualProcedures = async () => {
    setLoading(true);
    try {
      const staticProceduresModule = await import("../../../static/procedures");
      const staticProcedures = staticProceduresModule.default;
      const allQuestions: any[] = [];

      stepData.selectedClassifications.forEach((classification: string) => {
        const classificationProcedures =
          staticProcedures[classification] || staticProcedures.default;
        if (classificationProcedures) {
          classificationProcedures.forEach((proc: any) => {
            allQuestions.push({
              ...proc,
              classification,
              answer: "",
            });
          });
        }
      });

      setQuestions(allQuestions);
    } catch (error) {
      console.error("Error loading manual procedures:", error);
      toast({
        title: "Error Loading Procedures",
        description: "Failed to load procedure templates.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAIProcedures = async () => {
    setLoading(true);
    setAiThinking(true);
    try {
      const selected = Array.isArray(stepData?.selectedClassifications)
        ? stepData.selectedClassifications
        : [];

      const initialStatus = selected.map((classification: string) => ({
        classification,
        status: "queued" as const,
        progress: 0,
      }));
      setProcessingStatus(initialStatus);

      const progressInterval = setInterval(() => {
        setProcessingStatus((prev) =>
          prev.map((status) => ({
            ...status,
            progress: Math.min((status.progress || 0) + Math.random() * 15, 97),
            status:
              status.progress && status.progress > 80
                ? ("completed" as const)
                : ("loading" as const),
          }))
        );
      }, 1200);

      const base = import.meta.env.VITE_APIURL;
      if (!base) {
        throw new Error("VITE_APIURL is not set");
      }
      if (!engagement?._id) {
        throw new Error("Engagement id is missing");
      }

      const response = await authFetch(
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

      const result = await response.json();
      setRawResult(result);

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(result?.message || "Failed to generate procedures");
      }

      const nextQuestions: any[] = result?.procedure?.questions || [];
      setQuestions(nextQuestions || []);
      setRecommendations(result?.procedure?.recommendations || []);

      setProcessingStatus((prev) =>
        prev.map((status) => ({
          ...status,
          status: "completed" as const,
          progress: 100,
        }))
      );

      toast({
        title: "🎉 Procedures Generated Successfully!",
        description: `Generated ${
          nextQuestions?.length || 0
        } intelligent audit procedures.`,
      });
    } catch (error: any) {
      console.error("Error generating AI procedures:", error);
      toast({
        title: "Generation Failed",
        description: error?.message || "Failed to generate procedures.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setAiThinking(false);
    }
  };

  const handleQuestionEdit = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      setEditingQuestion(questionId);
      setEditedText(question.question);
      setEditedAnswer(question.answer || "");
    }
  };

  const handleQuestionSave = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              question: editedText,
              answer: editedAnswer,
            }
          : q
      )
    );
    setEditingQuestion(null);
    setEditedText("");
    setEditedAnswer("");

    setCompletedItems((prev) => new Set([...prev, questionId]));
    setTimeout(() => {
      setCompletedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }, 2000);
  };

  const handleQuestionCancel = () => {
    setEditingQuestion(null);
    setEditedText("");
    setEditedAnswer("");
  };

  const handleQuestionDelete = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    toast({
      title: "Question Deleted",
      description: "The procedure item has been removed.",
    });
  };

  const handleAddQuestion = (classification: string) => {
    const newQuestion = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      question: "New custom procedure item",
      answer: "",
      isRequired: false,
      classification,
    };
    setQuestions((prev) => [...prev, newQuestion]);
    setEditingQuestion(newQuestion.id);
    setEditedText(newQuestion.question);
    setEditedAnswer("");
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, answer } : q))
    );
  };

  const handleProceed = () => {
    const requiredQuestions = questions.filter((q) => q.isRequired);
    const unansweredRequired = requiredQuestions.filter(
      (q) => !q.answer?.trim()
    );

    if (unansweredRequired.length > 0) {
      toast({
        title: "Required Questions Unanswered",
        description: `Please answer all ${unansweredRequired.length} required items before proceeding.`,
        variant: "destructive",
      });
      return;
    }

    onComplete({ questions, recommendations });
  };

  const getQuestionsByClassification = () => {
    const grouped: { [key: string]: any[] } = {};
    questions.forEach((question) => {
      const classification = question.classification || "General";
      if (!grouped[classification]) grouped[classification] = [];
      grouped[classification].push(question);
    });
    return grouped;
  };

  const formatClassificationForDisplay = (classification: string) => {
    if (!classification) return "General";
    const parts = classification.split(" > ");
    const topLevel = parts[0];
    if (topLevel === "Assets" || topLevel === "Liabilities") {
      return parts[parts.length - 1];
    }
    return topLevel;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "loading":
        return (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          >
            <Loader2 className="h-4 w-4 text-primary" />
          </motion.div>
        );
      case "completed":
        return (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
          </motion.div>
        );
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getOverallProgress = () => {
    if (processingStatus.length === 0) return 100;
    const totalProgress = processingStatus.reduce(
      (sum, status) => sum + (status.progress || 0),
      0
    );
    return totalProgress / processingStatus.length;
  };

  const groupedQuestions = getQuestionsByClassification();
  const requiredCount = questions.filter((q) => q.isRequired).length;
  const answeredRequired = questions.filter(
    (q) => q.isRequired && q.answer?.trim()
  ).length;

  if (loading && mode !== "manual") {
    return (
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="overflow-hidden relative border-2 border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
          <FloatingParticles />

          <CardHeader className="relative">
            <motion.div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="font-heading text-2xl text-foreground flex items-center gap-2">
                  AI Procedure Generation
                  <motion.div>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </motion.div>
                </CardTitle>
                <motion.p
                  className="text-muted-foreground font-body text-lg"
                  key={processingPhase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {processingPhase || "Initializing AI analysis..."}
                </motion.p>
              </div>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6 relative">
            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ProgressRing progress={getOverallProgress()} size={80} />
                  <div>
                    <div className="text-sm text-muted-foreground font-body">
                      Overall Progress
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {Math.round(getOverallProgress())}%
                    </div>
                  </div>
                </div>
                <motion.div
                  className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    AI Processing
                  </span>
                </motion.div>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {processingStatus.map((status, index) => (
                    <motion.div
                      key={status.classification}
                      className="relative overflow-hidden"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-background to-muted/30 rounded-xl border border-border/50 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                          <motion.div
                            className="relative"
                            whileHover={{ scale: 1.1 }}
                          >
                            {getStatusIcon(status.status)}
                          </motion.div>
                          <div>
                            <span className="font-body-semibold text-foreground text-lg">
                              {formatClassificationForDisplay(
                                status.classification
                              )}
                            </span>
                            <div className="text-sm text-muted-foreground">
                              {status.status === "loading"
                                ? "Analyzing..."
                                : status.status}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {status.progress !== undefined && (
                            <div className="w-24">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">
                                  Progress
                                </span>
                                <span className="font-medium">
                                  {Math.round(status.progress)}%
                                </span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${status.progress}%` }}
                                  transition={{
                                    duration: 0.5,
                                    ease: "easeOut",
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {status.error && (
                            <Badge
                              variant="destructive"
                              className="max-w-[22rem] truncate"
                            >
                              {status.error}
                            </Badge>
                          )}

                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Badge
                              variant={
                                status.status === "completed"
                                  ? "default"
                                  : status.status === "error"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="font-medium"
                            >
                              {status.status}
                            </Badge>
                          </motion.div>
                        </div>
                      </div>

                      {status.status === "loading" && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                          variants={shimmerVariants}
                          animate="shimmer"
                          style={{
                            backgroundSize: "200% 100%",
                          }}
                        />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Empty state if nothing to show
  const isEmpty = Object.keys(groupedQuestions).length === 0;

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden relative border-2 border-primary/10 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />

          <CardHeader className="flex items-start justify-between gap-2 relative">
            <div className="flex items-center gap-4">
              <motion.div
                className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Target className="h-6 w-6 text-white" />
              </motion.div>
              <div>
                <CardTitle className="font-heading text-2xl text-foreground">
                  {mode === "manual"
                    ? "Manual Procedures"
                    : "AI-Generated Procedures"}
                </CardTitle>
                <p className="text-muted-foreground font-body text-lg">
                  {mode === "manual"
                    ? "Review and answer the predefined audit procedures for each classification."
                    : "Review the AI-generated procedures and customize them as needed."}
                </p>
              </div>
            </div>

            {(mode === "ai" || mode === "hybrid") && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebug((v) => !v)}
                  className="flex items-center gap-2 bg-background/50 backdrop-blur-sm"
                  title="Toggle debug view"
                >
                  <Bug className="h-4 w-4" />
                  Debug
                </Button>
              </motion.div>
            )}
          </CardHeader>

          <CardContent className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: CheckCircle,
                  label: "Total Items",
                  value: questions.length,
                  color: "primary",
                  gradient: "from-primary to-primary/80",
                },
                {
                  icon: AlertCircle,
                  label: "Required",
                  value: `${answeredRequired}/${requiredCount}`,
                  color: "orange-500",
                  gradient: "from-orange-500 to-orange-600",
                },
                {
                  icon: Bot,
                  label: "Classifications",
                  value: Object.keys(groupedQuestions).length,
                  color: "purple-500",
                  gradient: "from-purple-500 to-purple-600",
                },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="flex items-center gap-4 p-4 bg-gradient-to-br from-background to-muted/30 rounded-xl border border-border/50"
                  variants={itemVariants}
                  transition={{ type: "smooth", stiffness: 400, damping: 10 }}
                >
                  <motion.div
                    className={`p-3 bg-gradient-to-br ${stat.gradient} rounded-lg shadow-lg`}
                    transition={{ duration: 0.6 }}
                  >
                    <stat.icon className="h-5 w-5 text-white" />
                  </motion.div>
                  <div>
                    <p className="text-sm text-muted-foreground font-body">
                      {stat.label}
                    </p>
                    <motion.p
                      className="text-2xl font-bold text-foreground"
                      key={stat.value}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            </div>

            <AnimatePresence>
              {showDebug && rawResult && (
                <motion.div
                  className="mt-6"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ScrollArea className="h-64 rounded-md border p-3 bg-muted/30">
                    <pre className="text-xs whitespace-pre-wrap">
                      {JSON.stringify(rawResult, null, 2)}
                    </pre>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {isEmpty && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="py-16 flex flex-col items-center justify-center gap-6">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                >
                  <AlertCircle className="h-16 w-16 text-muted-foreground" />
                </motion.div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    No Items to Display
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    No items to display. This can happen if the AI returned a
                    structure without the
                    <code className="mx-1 px-1 py-0.5 bg-muted rounded">
                      procedure.questions
                    </code>{" "}
                    array.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={onBack}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Classifications
                  </Button>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button onClick={() => generateAIProcedures()}>
                      Retry Generate
                    </Button>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isEmpty && (
          <motion.div className="space-y-6" variants={containerVariants}>
            {Object.entries(groupedQuestions).map(
              ([classification, classificationQuestions], classIndex) => {
                const isExpanded = !!expanded[classification];
                const visibleQuestions = isExpanded
                  ? classificationQuestions
                  : classificationQuestions.slice(0, DEFAULT_VISIBLE);
                const hasMore =
                  classificationQuestions.length > DEFAULT_VISIBLE;

                return (
                  <motion.div
                    key={classification}
                    variants={itemVariants}
                    custom={classIndex}
                  >
                    <Card className="overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <CardHeader className="bg-gradient-to-r from-background to-muted/30">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 10,
                              }}
                            >
                              <Badge
                                variant="outline"
                                className="font-body-semibold truncate bg-primary/10 border-primary/20 text-primary"
                              >
                                {formatClassificationForDisplay(classification)}
                              </Badge>
                            </motion.div>
                            <span className="text-sm text-muted-foreground font-body whitespace-nowrap">
                              {classificationQuestions.length} items
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasMore && (
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setExpanded((prev) => ({
                                      ...prev,
                                      [classification]: !isExpanded,
                                    }))
                                  }
                                  className="h-8"
                                >
                                  {isExpanded
                                    ? "Show less"
                                    : `Show all (${classificationQuestions.length})`}
                                </Button>
                              </motion.div>
                            )}
                            {(mode === "ai" || mode === "hybrid") && (
                              <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleAddQuestion(classification)
                                  }
                                  className="flex items-center gap-2 bg-primary/5 border-primary/20 hover:bg-primary/10"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add Item
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-6">
                        <ScrollArea className="h-[32rem] pr-3">
                          <div className="space-y-4">
                            <AnimatePresence>
                              {visibleQuestions.map((question, index) => (
                                <motion.div
                                  key={question.id}
                                  className={`space-y-3 p-6 border rounded-xl transition-all duration-300 ${
                                    completedItems.has(question.id)
                                      ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
                                      : "border-border hover:border-primary/30 hover:shadow-md"
                                  }`}
                                  initial={{ opacity: 0, y: 20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -20 }}
                                  transition={{ delay: index * 0.05 }}
                                  whileHover={{ scale: 1.01 }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                      <motion.div
                                        className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mt-0.5 shadow-lg"
                                        whileHover={{ scale: 1.1, rotate: 5 }}
                                        transition={{
                                          type: "spring",
                                          stiffness: 400,
                                          damping: 10,
                                        }}
                                      >
                                        <span className="text-sm font-bold text-white">
                                          {index + 1}
                                        </span>
                                      </motion.div>
                                      <div className="flex-1 min-w-0">
                                        <AnimatePresence mode="wait">
                                          {editingQuestion === question.id ? (
                                            <motion.div
                                              className="space-y-4"
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              exit={{ opacity: 0 }}
                                            >
                                              <Textarea
                                                value={editedText}
                                                onChange={(e) =>
                                                  setEditedText(e.target.value)
                                                }
                                                placeholder="Enter item..."
                                                className="font-body resize-none break-words border-primary/20 focus:border-primary"
                                              />
                                              <Textarea
                                                value={editedAnswer}
                                                onChange={(e) =>
                                                  setEditedAnswer(
                                                    e.target.value
                                                  )
                                                }
                                                placeholder="Enter answer / notes..."
                                                className="font-body resize-none break-words border-primary/20 focus:border-primary"
                                              />
                                              <div className="flex items-center gap-2">
                                                <motion.div
                                                  whileHover={{ scale: 1.05 }}
                                                  whileTap={{ scale: 0.95 }}
                                                >
                                                  <Button
                                                    size="sm"
                                                    onClick={() =>
                                                      handleQuestionSave(
                                                        question.id
                                                      )
                                                    }
                                                  >
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save
                                                  </Button>
                                                </motion.div>
                                                <motion.div
                                                  whileHover={{ scale: 1.05 }}
                                                  whileTap={{ scale: 0.95 }}
                                                >
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={
                                                      handleQuestionCancel
                                                    }
                                                  >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Cancel
                                                  </Button>
                                                </motion.div>
                                              </div>
                                            </motion.div>
                                          ) : (
                                            <motion.div
                                              className="space-y-3"
                                              initial={{ opacity: 0 }}
                                              animate={{ opacity: 1 }}
                                              exit={{ opacity: 0 }}
                                            >
                                              <div className="flex items-start gap-2">
                                                <p className="font-body-semibold text-foreground flex-1 break-words text-lg">
                                                  {question.question}
                                                </p>
                                                {question.isRequired && (
                                                  <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{
                                                      type: "spring",
                                                      stiffness: 500,
                                                      damping: 30,
                                                    }}
                                                  >
                                                    <Badge
                                                      variant="secondary"
                                                      className="text-xs shrink-0 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                                    >
                                                      Required
                                                    </Badge>
                                                  </motion.div>
                                                )}
                                              </div>
                                              <Textarea
                                                value={question.answer || ""}
                                                onChange={(e) =>
                                                  handleAnswerChange(
                                                    question.id,
                                                    e.target.value
                                                  )
                                                }
                                                placeholder="Enter your answer..."
                                                className="font-body resize-none break-words border-border/50 focus:border-primary transition-colors"
                                                rows={3}
                                              />
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    </div>

                                    {editingQuestion !== question.id &&
                                      (mode === "ai" || mode === "hybrid") && (
                                        <div className="flex items-center gap-1 ml-2">
                                          <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                          >
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleQuestionEdit(question.id)
                                              }
                                              className="h-8 w-8 p-0 hover:bg-primary/10"
                                            >
                                              <Edit3 className="h-4 w-4" />
                                            </Button>
                                          </motion.div>
                                          <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                          >
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleQuestionDelete(
                                                  question.id
                                                )
                                              }
                                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </motion.div>
                                        </div>
                                      )}
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              }
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {requiredCount > answeredRequired && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
              <motion.div
              >
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </motion.div>
              <AlertDescription className="font-body text-orange-800 dark:text-orange-200">
                You have {requiredCount - answeredRequired} required items that
                need answers before you can proceed.
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="flex items-center justify-between"
        variants={itemVariants}
      >
        <Button
                    variant="outline"
                    onClick={onBack}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Classifications
                  </Button>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={handleProceed}
            disabled={requiredCount > answeredRequired}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            Proceed to Recommendations
            <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
