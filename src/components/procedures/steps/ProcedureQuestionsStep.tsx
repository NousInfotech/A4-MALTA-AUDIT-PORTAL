// @ts-nocheck
import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Loader2,
  CheckCircle,
  Sparkles,
  Brain,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface ProcedureQuestionsStepProps {
  engagement: any;
  mode: "manual" | "ai" | "hybrid";
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
    transition: { duration: 0.5, staggerChildren: 0.06 },
  },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
};

/* ------------ Helpers: IDs, grouping, labels ------------ */

const uid = () => Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);

/** Make every question have a stable unique __uid. Never mutate the source object. */
function normalizeQuestions(items: any[] | undefined | null): any[] {
  if (!Array.isArray(items)) return [];
  return items.map((q, i) => {
    const base = q || {};
    // Always generate a new unique __uid for each question to avoid duplicates
    const __uid = `q_${uid()}_${i}`;
    return { ...base, __uid, id: base.id ?? __uid };
  });
}

/** Prefer recommendation bucket, then category, then classification, then General */
function groupKeyFor(q: any): string {
  return (
    q.recommendationBucket ||
    q.recommendationCategory ||
    q.classification ||
    "General"
  );
}

/** For displaying the badge text: deepest node for Assets/Liabilities, else top level. */
function formatClassificationForDisplay(classification?: string) {
  if (!classification) return "General";
  const parts = classification.split(" > ");
  const top = parts[0];
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1];
  return top;
}

/* ------------ Classification Mapping ------------ */

// Map hierarchical classifications to procedure keys
const mapClassificationToProcedureKey = (classification: string): string => {
  const mapping: Record<string, string> = {
    // Assets > Current
    "Assets > Current > Cash & Cash Equivalents": "Bank and Cash",
    "Assets > Current > Trade Receivables": "Receivables",
    "Assets > Current > Other Receivables": "Receivables",
    "Assets > Current > Prepayments": "Receivables",
    "Assets > Current > Inventory": "Inventory",
    "Assets > Current > Recoverable VAT/Tax": "Taxation",

    // Assets > Non-current
    "Assets > Non-current > Property, Plant & Equipment": "PPE",
    "Assets > Non-current > Intangible Assets": "Intangible Assets",
    "Assets > Non-current > Investments": "Investments",
    "Assets > Non-current > Deferred Tax Asset": "Taxation",
    "Assets > Non-current > Long-term Receivables/Deposits": "Receivables",

    // Liabilities > Current
    "Liabilities > Current > Trade Payables": "Payables",
    "Liabilities > Current > Accruals": "Payables",
    "Liabilities > Current > Taxes Payable": "Taxation",
    "Liabilities > Current > Short-term Borrowings/Overdraft": "Borrowings and Loans",
    "Liabilities > Current > Other Payables": "Payables",

    // Liabilities > Non-current
    "Liabilities > Non-current > Borrowings (Long-term)": "Borrowings and Loans",
    "Liabilities > Non-current > Provisions": "Payables",
    "Liabilities > Non-current > Deferred Tax Liability": "Taxation",
    "Liabilities > Non-current > Lease Liabilities": "Borrowings and Loans",

    // Equity (root level)
    "Equity > Share Capital": "Equity",
    "Equity > Share Premium": "Equity",
    "Equity > Reserves": "Equity",
    "Equity > Retained Earnings": "Equity",

    // Income (root level)
    "Income > Operating > Revenue (Goods)": "Profit and Loss",
    "Income > Operating > Revenue (Services)": "Profit and Loss",
    "Income > Operating > Other Operating Income": "Profit and Loss",
    "Income > Non-operating > Other Income": "Profit and Loss",
    "Income > Non-operating > FX Gains": "Profit and Loss",

    // Expenses (root level)
    "Expenses > Cost of Sales > Materials/Purchases": "Profit and Loss",
    "Expenses > Cost of Sales > Freight Inwards": "Profit and Loss",
    "Expenses > Cost of Sales > Manufacturing Labour": "Profit and Loss",
    "Expenses > Cost of Sales > Production Overheads": "Profit and Loss",
    "Expenses > Direct Costs": "Profit and Loss",
    "Expenses > Administrative Expenses > Payroll": "Profit and Loss",
    "Expenses > Administrative Expenses > Rent & Utilities": "Profit and Loss",
    "Expenses > Administrative Expenses > Office/Admin": "Profit and Loss",
    "Expenses > Administrative Expenses > Marketing": "Profit and Loss",
    "Expenses > Administrative Expenses > Repairs & Maintenance": "Profit and Loss",
    "Expenses > Administrative Expenses > IT & Software": "Profit and Loss",
    "Expenses > Administrative Expenses > Insurance": "Profit and Loss",
    "Expenses > Administrative Expenses > Professional Fees": "Profit and Loss",
    "Expenses > Administrative Expenses > Depreciation & Amortisation": "Profit and Loss",
    "Expenses > Administrative Expenses > Research & Development": "Profit and Loss",
    "Expenses > Administrative Expenses > Lease Expenses": "Profit and Loss",
    "Expenses > Administrative Expenses > Bank Charges": "Profit and Loss",
    "Expenses > Administrative Expenses > Travel & Entertainment": "Profit and Loss",
    "Expenses > Administrative Expenses > Training & Staff Welfare": "Profit and Loss",
    "Expenses > Administrative Expenses > Telephone & Communication": "Profit and Loss",
    "Expenses > Administrative Expenses > Subscriptions & Memberships": "Profit and Loss",
    "Expenses > Administrative Expenses > Bad Debt Written Off": "Profit and Loss",
    "Expenses > Administrative Expenses > Stationery & Printing": "Profit and Loss",
    "Expenses > Finance Costs": "Profit and Loss",
    "Expenses > Other > FX Losses": "Profit and Loss",
    "Expenses > Other > Exceptional/Impairment": "Profit and Loss",
  }

  return mapping[classification] || "default"
}

/** Fallback map from a procedures array into Q&A (if backend returns a different shape) */
function proceduresToQuestionsFallback(result: any): any[] {
  const procArr = result?.procedure?.procedures || result?.procedures;
  if (!Array.isArray(procArr) || procArr.length === 0) return [];
  const narrative = result?.narrative || result?.procedure?.narrative || "";
  return procArr.map((p: any, idx: number) => ({
    id: p.id || `ai_${idx + 1}`,
    question: p.title || `Procedure ${idx + 1}`,
    answer: narrative || "",
    isRequired: false,
    classification: p.classification || p.area || "General",
    procedure: p,
  }));
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
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus[]>([]);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [editedAnswer, setEditedAnswer] = useState("");
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const { toast } = useToast();

  const groups = useMemo(() => {
    const by: Record<string, any[]> = {};
    for (const q of questions) {
      const key = groupKeyFor(q);
      if (!by[key]) by[key] = [];
      by[key].push(q);
    }
    return by;
  }, [questions]);

  // Section navigation
  const sectionIds = useMemo(() => Object.keys(groups).map((key, index) => `section-${index}`), [groups]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const currentSection = document.elementFromPoint(window.innerWidth / 2, 100)?.closest('[id^="section-"]');
      if (currentSection) {
        const currentIndex = sectionIds.indexOf(currentSection.id);
        if (event.key === 'ArrowUp' && currentIndex > 0) {
          scrollToSection(sectionIds[currentIndex - 1]);
        } else if (event.key === 'ArrowDown' && currentIndex < sectionIds.length - 1) {
          scrollToSection(sectionIds[currentIndex + 1]);
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sectionIds]);

  // pretty progress text while AI runs
  const [phase, setPhase] = useState("");
  useEffect(() => {
    if (!loading || mode === "manual") return;
    const phases = [
      "Analyzing working papers…",
      "Identifying risk areas…",
      "Generating procedures…",
      "Optimizing recommendations…",
      "Finalizing…",
    ];
    let i = 0;
    const int = setInterval(() => setPhase(phases[i++ % phases.length]), 1200);
    return () => clearInterval(int);
  }, [loading, mode]);

  useEffect(() => {
    if (mode === "manual") loadManual();
    else loadAI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, JSON.stringify(stepData?.selectedClassifications || [])]);

  /* ------------ Loaders ------------ */

  const loadManual = async () => {
    setLoading(true);
    try {
      const staticProceduresModule = await import("@/static/procedures");
      const staticProcedures = staticProceduresModule.default || {};
      const selected: string[] = Array.isArray(stepData?.selectedClassifications)
        ? stepData.selectedClassifications
        : [];
      const all: any[] = [];

      selected.forEach((hierarchicalClassification) => {
        // Map the hierarchical classification to a procedure key
        const procedureKey = mapClassificationToProcedureKey(hierarchicalClassification);
        const arr = staticProcedures[procedureKey] || staticProcedures.default || [];

        arr.forEach((proc: any) => all.push({
          ...proc,
          classification: hierarchicalClassification, // Keep original hierarchical classification for grouping
          answer: ""
        }));
      });

      setQuestions(normalizeQuestions(all));
      setRecommendations([]); // manual may not have recs

      // Debug logging
      console.log('Selected classifications:', selected);
      console.log('Loaded questions count:', all.length);
      console.log('Questions:', all);

      if (all.length === 0) {
        toast({
          title: "No Templates Found",
          description: "Add templates in src/static/procedures.ts for your selected classifications.",
        });
      } else {
        toast({
          title: "Manual Procedures Loaded",
          description: `Loaded ${all.length} procedures for ${selected.length} classifications.`,
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Template load failed", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadAI = async () => {
    setLoading(true);
    try {
      const selected = Array.isArray(stepData?.selectedClassifications)
        ? stepData.selectedClassifications
        : [];

      // pretty progress bar per classification
      setProcessingStatus(selected.map((c) => ({ classification: c, status: "queued", progress: 0 })));
      const progressInterval = setInterval(() => {
        setProcessingStatus((prev) =>
          prev.map((s) => {
            const p = Math.min((s.progress || 0) + Math.random() * 18, 97);
            return { ...s, progress: p, status: p > 80 ? "completed" : "loading" };
          })
        );
      }, 1200);

      const base = import.meta.env.VITE_APIURL;
      if (!base) throw new Error("VITE_APIURL is not set");
      if (!engagement?._id) throw new Error("Engagement id is missing");

      const res = await authFetch(`${base}/api/procedures/${engagement._id}/generate`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          materiality: stepData?.materiality,
          selectedClassifications: selected,
          validitySelections: stepData?.validitySelections,
        }),
      });

      // if server responded with HTML (404/500), don't json() it
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        clearInterval(progressInterval);
        throw new Error(
          text?.startsWith("<")
            ? "Backend returned HTML for /api/procedures/:id/generate — check the route."
            : (text || `Failed to generate procedures (HTTP ${res.status}).`)
        );
      }

      const result = await res.json().catch(() => ({}));
      clearInterval(progressInterval);

      const next = result?.procedure?.questions || result?.questions || proceduresToQuestionsFallback(result) || [];
      const recs = result?.procedure?.recommendations || result?.recommendations || [];
      setQuestions(normalizeQuestions(next));
      setRecommendations(Array.isArray(recs) ? recs : []);

      setProcessingStatus((prev) => prev.map((s) => ({ ...s, status: "completed", progress: 100 })));

      toast({
        title: "Procedures Ready",
        description: `Generated ${next?.length || 0} procedures.`,
      });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Generation failed", description: e?.message || "Unexpected error.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  /* ------------ Item edit/delete (by __uid, never by id) ------------ */

  const startEdit = (uidKey: string) => {
    const q = questions.find((x) => x.__uid === uidKey);
    if (!q) return;
    setEditingUid(uidKey);
    setEditedText(q.question || "");
    setEditedAnswer(q.answer || "");
  };

  const saveEdit = (uidKey: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.__uid === uidKey ? { ...q, question: editedText, answer: editedAnswer } : q))
    );
    setEditingUid(null);
    setEditedText("");
    setEditedAnswer("");
  };

  const cancelEdit = () => {
    setEditingUid(null);
    setEditedText("");
    setEditedAnswer("");
  };

  const deleteItem = (uidKey: string) => {
    setQuestions((prev) => prev.filter((q) => q.__uid !== uidKey));
    toast({ title: "Removed", description: "The procedure item was deleted." });
  };

  const addItem = (classification: string) => {
    const __uid = `custom_${uid()}`;
    const item = {
      __uid,
      id: __uid,
      question: "New custom procedure item",
      answer: "",
      isRequired: false,
      classification,
    };
    setQuestions((prev) => [...prev, item]);
    setEditingUid(__uid);
    setEditedText(item.question);
    setEditedAnswer("");
  };

  const setAnswer = (uidKey: string, answer: string) => {
    setQuestions((prev) => prev.map((q) => (q.__uid === uidKey ? { ...q, answer } : q)));
  };

  const toggleRequired = (uidKey: string) => {
    setQuestions((prev) => prev.map((q) => (q.__uid === uidKey ? { ...q, isRequired: !q.isRequired } : q)));
  };

  const recTextFor = (bucket: string) => {
    const hit =
      (recommendations || []).find((r: any) =>
        [r.bucket, r.category, r.classification, r.classificationTag]
          .filter(Boolean)
          .some((k) => String(k).toLowerCase() === String(bucket).toLowerCase())
      ) || null;
    return typeof hit?.text === "string"
      ? hit.text
      : typeof hit?.recommendation === "string"
        ? hit.recommendation
        : "";
  };

  /* ------------ Proceed guard ------------ */

  const handleProceed = () => {
    const req = questions.filter((q) => q.isRequired);
    // const missing = req.filter((q) => !String(q.answer || "").trim());
    // if (missing.length) {
    //   toast({
    //     title: "Required unanswered",
    //     description: `Please answer all ${missing.length} required item(s).`,
    //     variant: "destructive",
    //   });
    //   return;
    // }
    onComplete({
      questions: questions.map(({ __uid, ...rest }) => rest), // strip __uid before saving
      recommendations,
    });
  };

  if (loading && mode !== "manual") {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        <Card className="overflow-hidden relative border-2 border-primary/20">
          <CardHeader className="relative">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <CardTitle className="font-heading text-2xl">AI Procedure Generation</CardTitle>
            </div>
            <p className="text-muted-foreground mt-1">{phase || "Working…"}</p>
          </CardHeader>
          <CardContent className="py-8 flex items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{mode.toUpperCase()}</Badge>
          <span className="text-sm text-muted-foreground">Review & refine your procedures</span>
        </div>
        <div className="flex items-center gap-2">
          {/* <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button> */}
          <Button size="sm" onClick={handleProceed}>
            Continue <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Section dropdown navigation */}
      {Object.keys(groups).length > 0 && (
        <div className="flex justify-start">
          <div className="w-auto">
            <Select onValueChange={(value) => scrollToSection(value)}>
              <SelectTrigger className="w-auto bg-white text-black border border-black hover:bg-gray-100 focus:bg-gray-100">
                <SelectValue placeholder={formatClassificationForDisplay(Object.keys(groups)[0])} />
              </SelectTrigger>
              <SelectContent className="bg-white text-black border border-gray-200">
                {Object.keys(groups).map((bucket, index) => (
                  <SelectItem
                    key={bucket}
                    value={`section-${index}`}
                    className="bg-white data-[state=checked]:bg-gray-900 data-[state=checked]:text-white [&>svg]:text-white cursor-pointer"
                  >
                    {formatClassificationForDisplay(bucket)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* empty state */}
      {questions.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {mode === "manual"
              ? "No procedures for your selections. Ensure src/static/procedures.ts has entries matching your classifications."
              : "No AI procedures received. Verify the backend route /api/procedures/:id/generate or update the frontend to the correct path your backend exposes."}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* grouped cards */}
          <div className="h-[60vh] overflow-y-scroll space-y-5">
          {Object.entries(groups).map(([bucket, items], index) => (
            <Card key={bucket} id={`section-${index}`} className="border-2 border-primary/10 relative">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{formatClassificationForDisplay(bucket)}</Badge>
                      <Badge variant="secondary">{items.length} item{items.length > 1 ? "s" : ""}</Badge>
                    </div>
                    {recTextFor(bucket) ? (
                      <p className="text-xs text-muted-foreground mt-2">{recTextFor(bucket)}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {/* Section Navigation Buttons */}
                    {/* <div className="flex justify-between">
                      {index > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => scrollToSection(sectionIds[index - 1])}
                          className="flex items-center gap-2"
                        >
                          <ChevronUp className="h-4 w-4" />
                          Previous Section
                        </Button>
                      )}
                      {index < sectionIds.length - 1 && (
                        <Button
                          onClick={() => scrollToSection(sectionIds[index + 1])}
                          className="flex items-center gap-2 ml-auto"
                        >
                          Next Section
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      )}
                    </div> */}
                    <Button size="sm" variant="outline" onClick={() => addItem(bucket)}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((q) => {
                  const isEditing = editingUid === q.__uid;
                  const badge = formatClassificationForDisplay(q.classification);
                  return (
                    <motion.div key={q.__uid} variants={itemVariants} className="space-y-3 p-4 rounded-md border border-[hsl(0deg,0%,68.03%)] bg-card shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{badge}</Badge>
                          {q.isRequired ? (
                            <Badge variant="default">Required</Badge>
                          ) : (
                            <Badge variant="secondary">Optional</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Section Navigation Buttons */}
                          {/* <div className="flex justify-between">
                            {index > 0 && (
                              <Button
                                variant="outline"
                                onClick={() => scrollToSection(sectionIds[index - 1])}
                                className="flex items-center gap-2"
                              >
                                <ChevronUp className="h-4 w-4" />
                                Previous Section
                              </Button>
                            )}
                            {index < sectionIds.length - 1 && (
                              <Button
                                onClick={() => scrollToSection(sectionIds[index + 1])}
                                className="flex items-center gap-2 ml-auto"
                              >
                                Next Section
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            )}
                          </div> */}
                          <Button size="sm" variant="outline" onClick={() => toggleRequired(q.__uid)}>
                            {q.isRequired ? "Mark Optional" : "Mark Required"}
                          </Button>
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => saveEdit(q.__uid)}>
                                <Save className="h-4 w-4 mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                <X className="h-4 w-4 mr-1" /> Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEdit(q.__uid)}>
                                <Edit3 className="h-4 w-4 mr-1" /> Edit
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteItem(q.__uid)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="text-sm font-medium">Question</div>
                        {isEditing ? (
                          <Textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            placeholder="Edit the procedure question"
                          />
                        ) : (
                          <div className="text-sm">{q.question}</div>
                        )}

                        <div className="text-sm font-medium mt-2">Answer</div>
                        {isEditing ? (
                          <Textarea
                            value={editedAnswer}
                            onChange={(e) => setEditedAnswer(e.target.value)}
                            placeholder="Add the planned response / notes"
                          />
                        ) : (
                          <Textarea
                            value={String(q.answer ?? "")}
                            onChange={(e) => setAnswer(q.__uid, e.target.value)}
                            placeholder="Add the planned response / notes"
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
          </div>
        </>
      )}
    </motion.div>
  );
};