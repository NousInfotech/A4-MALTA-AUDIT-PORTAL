// @ts-nocheck
import type React from "react";
import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  FileText,
  Save,
  AlertCircle,
  Plus,
  Edit3,
  X,
  CheckCircle,
  Trash2,
} from "lucide-react";

/** auth fetch */
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

const mkUid = () =>
  Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36);

/** Ensure every question has stable ids AND a key q1..qN (for aiAnswers mapping) */
function normalize(items?: any[]) {
  if (!Array.isArray(items)) return [];
  return items.map((q, i) => {
    const __uid = q.__uid || q.id || q._id || `q_${mkUid()}_${i}`;
    const id = q.id ?? __uid;
    const key = q.key || q.aiKey || `q${i + 1}`; // <— critical
    return { ...q, __uid, id, key };
  });
}

/** Classify missing items using selectedClassifications from previous step */
function ensureClassifications(questions: any[], selected: string[]) {
  if (!selected?.length) return questions;
  let i = 0;
  return questions.map((q) => {
    if (q.classification && String(q.classification).trim()) return q;
    return { ...q, classification: selected[i++ % selected.length] };
  });
}

/** Show deepest node for Assets/Liabilities; top-level otherwise */
function formatClassificationForDisplay(classification?: string) {
  if (!classification) return "General";
  const parts = classification.split(" > ");
  const top = parts[0];
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1];
  return top;
}

/** Array → single markdown string with ## and *** as requested */
function formatRecommendationsMarkdown(recs: any[]): string {
  if (!Array.isArray(recs) || !recs.length) return "";
  const out: string[] = ["## Recommendations", ""];
  for (const r of recs) {
    const title = (r?.title || "Recommendation").toString().trim();
    const body = (r?.body || "").toString().trim();
    out.push(`***${title}***`);
    if (body) out.push(body);
    out.push("");
  }
  return out.join("\n");
}

/** Merge AI answers [{key, answer}] onto current questions */
function mergeAiAnswers(questions: any[], aiAnswers: any[]) {
  const map = new Map<string, string>();
  (aiAnswers || []).forEach((a) => {
    const k = String(a?.key || "").trim().toLowerCase();
    if (k) map.set(k, a?.answer || "");
  });

  // Prefer key mapping; fall back to index if keys missing
  return questions.map((q, i) => {
    const k = String(q.key || `q${i + 1}`).trim().toLowerCase();
    const answer = map.has(k) ? map.get(k) || "" : q.answer || "";
    return { ...q, answer };
  });
}

const AIProcedureAnswersStep: React.FC<{
  engagement: any;
  mode: "ai";
  stepData: any;
  onComplete: (patch: any) => void;
  onBack: () => void;
}> = ({ engagement, mode, stepData, onComplete, onBack }) => {
  const { toast } = useToast();

  // ✅ receive questions + selectedClassifications from previous step
  const [questions, setQuestions] = useState<any[]>(
    normalize(
      ensureClassifications(
        stepData.questions || [],
        stepData.selectedClassifications || []
      )
    )
  );
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editedQ, setEditedQ] = useState("");
  const [editedA, setEditedA] = useState("");
  const [recommendationsStr, setRecommendationsStr] = useState<string>(
    typeof stepData.recommendations === "string"
      ? stepData.recommendations
      : formatRecommendationsMarkdown(stepData.recommendations || [])
  );
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(() => {
    const by: Record<string, any[]> = {};
    for (const q of questions) {
      const key = q.classification || "General";
      if (!by[key]) by[key] = [];
      by[key].push(q);
    }
    return by;
  }, [questions]);

  /** Call backend and MERGE aiAnswers onto existing questions by key */
  const fillAnswers = async () => {
    setLoading(true);
    try {
      const base = import.meta.env.VITE_APIURL;
      const res = await authFetch(`${base}/api/procedures/ai/answers`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement?._id,
          questions: questions.map(({ __uid, ...rest }) => rest),
          classifications: stepData.selectedClassifications,
        }),
      });

      const ct = res.headers.get("content-type") || "";
      const raw = await res.text();
      if (!res.ok)
        throw new Error(
          ct.includes("application/json")
            ? JSON.parse(raw)?.message || "Failed"
            : raw
        );

      const data = ct.includes("application/json") ? JSON.parse(raw) : {};

      // Your AI returns { aiAnswers: [{key, answer}], recommendations: string }
      let nextQs = questions;
      if (Array.isArray(data?.aiAnswers)) {
        nextQs = mergeAiAnswers(questions, data.aiAnswers);
      } else if (Array.isArray(data?.questions)) {
        // also support alternative payloads
        nextQs = normalize(data.questions);
      }

      // keep/repair classification after merge
      nextQs = normalize(
        ensureClassifications(nextQs, stepData.selectedClassifications || [])
      );

      const recStr =
        typeof data?.recommendations === "string"
          ? data.recommendations
          : Array.isArray(data?.recommendations)
          ? formatRecommendationsMarkdown(data.recommendations)
          : recommendationsStr;

      setQuestions(nextQs);
      setRecommendationsStr(recStr);
      toast({
        title: "Answers Generated",
        description: "Draft answers & recommendations updated.",
      });
    } catch (e: any) {
      toast({
        title: "Generation failed",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    try {
      const base = import.meta.env.VITE_APIURL;
      await authFetch(`${base}/api/procedures/${engagement?._id}/save`, {
        method: "POST",
        body: JSON.stringify({
          ...stepData,
          // keep forwarding the classifications buffer
          selectedClassifications: stepData.selectedClassifications || [],
          questions: questions.map(({ __uid, ...rest }) => rest),
          recommendations: recommendationsStr, // single markdown string
          procedureType: "procedures",
          status: "in-progress",
          mode: "ai",
        }),
      });
      toast({ title: "Draft Saved", description: "Your AI answers were saved." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const startEdit = (uid: string) => {
    const q = questions.find((x) => x.__uid === uid);
    if (!q) return;
    setEditingUid(uid);
    setEditedQ(q.question || "");
    setEditedA(q.answer || "");
  };
  const saveEdit = (uid: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.__uid === uid ? { ...q, question: editedQ, answer: editedA } : q
      )
    );
    setEditingUid(null);
    setEditedQ("");
    setEditedA("");
  };
  const cancelEdit = () => {
    setEditingUid(null);
    setEditedQ("");
    setEditedA("");
  };
  const setAnswer = (uid: string, val: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.__uid === uid ? { ...q, answer: val } : q))
    );
  };
  const removeItem = (uid: string) =>
    setQuestions((prev) => prev.filter((q) => q.__uid !== uid));
  const addItem = (classification: string) => {
    const __uid = `custom_${mkUid()}`;
    const key = `q${questions.length + 1}`;
    const item = {
      __uid,
      id: __uid,
      key,
      question: "New custom answer item",
      answer: "",
      isRequired: false,
      classification,
    };
    setQuestions((prev) => [...prev, item]);
    setEditingUid(__uid);
    setEditedQ(item.question);
    setEditedA("");
  };

  const handleProceed = () => {
    onComplete({
      questions: questions.map(({ __uid, ...rest }) => rest),
      recommendations: recommendationsStr, // single formatted string for next step
      selectedClassifications: stepData.selectedClassifications || [],
      validitySelections: stepData.validitySelections || [],
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            AI — Generate Answers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex gap-3">
            <Button onClick={fillAnswers} disabled={loading || questions.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate Answers
            </Button>
            <Button variant="secondary" onClick={saveDraft} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>

          {questions.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No questions to answer. Go back and generate questions first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {Object.entries(grouped).map(([bucket, items]) => (
                <Card key={bucket} className="border-2 border-primary/10">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {formatClassificationForDisplay(bucket)}
                        </Badge>
                        <Badge variant="secondary">
                          {items.length} item{items.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatClassificationForDisplay(bucket)} — review and
                        refine the drafted answers.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addItem(bucket)}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((q) => {
                      const isEditing = editingUid === q.__uid;
                      const badge = formatClassificationForDisplay(q.classification);
                      return (
                        <div key={q.__uid} className="rounded border p-3">
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
                              {isEditing ? (
                                <>
                                  <Button size="sm" onClick={() => saveEdit(q.__uid)}>
                                    <CheckCircle className="h-4 w-4 mr-1" /> Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={cancelEdit}
                                  >
                                    <X className="h-4 w-4 mr-1" /> Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEdit(q.__uid)}
                                  >
                                    <Edit3 className="h-4 w-4 mr-1" /> Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeItem(q.__uid)}
                                  >
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
                                value={editedQ}
                                onChange={(e) => setEditedQ(e.target.value)}
                                placeholder="Edit the question"
                              />
                            ) : (
                              <div className="text-sm">
                                {q.question || (
                                  <span className="text-muted-foreground italic">
                                    Untitled
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="text-sm font-medium mt-2">Answer</div>
                            {isEditing ? (
                              <Textarea
                                value={editedA}
                                onChange={(e) => setEditedA(e.target.value)}
                                placeholder="Refine the drafted answer"
                              />
                            ) : (
                              <Textarea
                                value={String(q.answer ?? "")}
                                onChange={(e) => setAnswer(q.__uid, e.target.value)}
                                placeholder="Refine the drafted answer"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onBack}>
              Back
            </Button>
            <Button onClick={handleProceed}>Continue</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
export default AIProcedureAnswersStep