// @ts-nocheck
import React, { useMemo, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, FileText, Save, AlertCircle, Plus, Edit3, X, CheckCircle, Trash2 } from "lucide-react"

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data?.session?.access_token
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
}

/* ---------------- helpers ---------------- */

const mkUid = () => Math.random().toString(36).slice(2, 10) + "_" + Date.now().toString(36)

function normalize(items?: any[]) {
  if (!Array.isArray(items)) return []
  return items.map((q, i) => {
    const __uid = q.__uid || q.id || q._id || `q_${mkUid()}_${i}`
    return { ...q, __uid, id: q.id ?? __uid }
  })
}

function formatRecommendationsMarkdown(recs: any[]): string {
  if (!Array.isArray(recs) || !recs.length) return ""
  const out: string[] = ["## Recommendations", ""]
  for (const r of recs) {
    const title = (r?.title || "Recommendation").toString().trim()
    const body = (r?.body || "").toString().trim()
    out.push(`***${title}***`)
    if (body) out.push(body)
    out.push("")
  }
  return out.join("\n")
}

function formatClassificationForDisplay(classification?: string) {
  if (!classification) return "General"
  const parts = classification.split(" > ")
  const top = parts[0]
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
  return top
}

/* merge AI answers (aiAnswers[{key,answer}]) onto current questions:
   - prefer match by .key (case-insensitive) => question.key / question.id
   - else by index order */
function mergeAiAnswers(questions: any[], aiAnswers: any[]) {
  const qs = [...questions]
  const map = new Map<string, string>()
  aiAnswers.forEach((a) => {
    if (!a) return
    const k = (a.key || "").toString().trim().toLowerCase()
    if (k) map.set(k, a.answer || "")
  })

  // index fallback
  const byIndex = !map.size

  return qs.map((q, i) => {
    let ans = q.answer || ""
    if (!byIndex) {
      const k =
        (q.key || q.id || `q${i + 1}`)
          .toString()
          .trim()
          .toLowerCase()
      if (map.has(k)) ans = map.get(k) || ""
    } else if (Array.isArray(aiAnswers) && aiAnswers[i]) {
      ans = aiAnswers[i].answer || ""
    }
    return { ...q, answer: ans }
  })
}

/* Assign classification if missing: round-robin from selectedClassifications */
function ensureClassifications(questions: any[], selected: string[]) {
  if (!selected?.length) return questions
  let i = 0
  return questions.map((q) => {
    if (q.classification && String(q.classification).trim()) return q
    const cls = selected[i % selected.length]
    i++
    return { ...q, classification: cls }
  })
}

/* ---------------- component ---------------- */

export const AIProcedureAnswersStep: React.FC<{
  engagement: any
  mode: "ai"
  stepData: any
  onComplete: (patch: any) => void
  onBack: () => void
}> = ({ engagement, stepData, onComplete, onBack }) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // questions come from the previous step
  const [questions, setQuestions] = useState<any[]>(normalize(stepData.questions || []))
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [editedQ, setEditedQ] = useState("")
  const [editedA, setEditedA] = useState("")

  // store a single formatted recommendations string, not an array
  const [recommendationsStr, setRecommendationsStr] = useState<string>(
    typeof stepData.recommendations === "string" ? stepData.recommendations : ""
  )

  const grouped = useMemo(() => {
    const by: Record<string, any[]> = {}
    for (const q of questions) {
      const key = q.classification || "General"
      if (!by[key]) by[key] = []
      by[key].push(q)
    }
    return by
  }, [questions])

  const fillAnswers = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const res = await authFetch(`${base}/api/procedures/ai/answers`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement?._id,
          questions, // will be normalized on server if needed
        }),
      })

      const contentType = res.headers.get("content-type") || ""
      const raw = await res.text()
      if (!res.ok) {
        throw new Error(
          contentType.includes("application/json")
            ? JSON.parse(raw)?.message || "Failed to generate answers"
            : raw?.slice(0, 200) || `HTTP ${res.status}`
        )
      }

      const data = contentType.includes("application/json") ? JSON.parse(raw) : {}

      // Accept BOTH shapes:
      // 1) { questions: [...] , recommendations: [...]|string }
      // 2) { aiAnswers: [{key,answer}], recommendations: [{title,body}] }
      let nextQs = questions
      let nextRecsStr = recommendationsStr

      if (Array.isArray(data?.questions)) {
        nextQs = data.questions
      } else if (Array.isArray(data?.aiAnswers)) {
        nextQs = mergeAiAnswers(questions, data.aiAnswers)
      }

      // ensure classification separation
      nextQs = ensureClassifications(nextQs, stepData?.selectedClassifications || [])
      nextQs = normalize(nextQs)

      if (typeof data?.recommendations === "string") {
        nextRecsStr = data.recommendations
      } else if (Array.isArray(data?.recommendations)) {
        nextRecsStr = formatRecommendationsMarkdown(data.recommendations)
      }

      setQuestions(nextQs)
      setRecommendationsStr(nextRecsStr)

      toast({ title: "Answers Generated", description: "Draft answers & recommendations updated." })
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const saveDraft = async () => {
    try {
      const base = import.meta.env.VITE_APIURL
      await authFetch(`${base}/api/procedures/${engagement?._id}/save`, {
        method: "POST",
        body: JSON.stringify({
          ...stepData,
          questions: questions.map(({ __uid, ...rest }) => rest),
          recommendations: recommendationsStr, // single markdown string
          procedureType: "procedures",
          status: "in-progress",
          mode: "ai",
        }),
      })
      toast({ title: "Draft Saved", description: "Your AI answers were saved." })
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    }
  }

  /* -------- per-item handlers keyed by __uid -------- */

  const startEdit = (uid: string) => {
    const q = questions.find((x) => x.__uid === uid)
    if (!q) return
    setEditingUid(uid)
    setEditedQ(q.question || "")
    setEditedA(q.answer || "")
  }

  const saveEdit = (uid: string) => {
    setQuestions((prev) => prev.map((q) => (q.__uid === uid ? { ...q, question: editedQ, answer: editedA } : q)))
    setEditingUid(null)
    setEditedQ("")
    setEditedA("")
  }

  const cancelEdit = () => {
    setEditingUid(null)
    setEditedQ("")
    setEditedA("")
  }

  const setAnswer = (uid: string, val: string) => {
    setQuestions((prev) => prev.map((q) => (q.__uid === uid ? { ...q, answer: val } : q)))
  }

  const removeItem = (uid: string) => {
    setQuestions((prev) => prev.filter((q) => q.__uid !== uid))
  }

  const addItem = (classification: string) => {
    const __uid = `custom_${mkUid()}`
    const item = { __uid, id: __uid, question: "New custom answer item", answer: "", isRequired: false, classification }
    setQuestions((prev) => [...prev, item])
    setEditingUid(__uid)
    setEditedQ(item.question)
    setEditedA("")
  }

  const handleProceed = () => {
    onComplete({
      questions: questions.map(({ __uid, ...rest }) => rest),
      recommendations: recommendationsStr, // single formatted string for next step
    })
  }

  /* ---------------- UI ---------------- */

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
              <AlertDescription>No questions to answer. Go back and generate questions first.</AlertDescription>
            </Alert>
          ) : (
            <>
              {Object.entries(grouped).map(([bucket, items]) => (
                <Card key={bucket} className="border-2 border-primary/10">
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{formatClassificationForDisplay(bucket)}</Badge>
                        <Badge variant="secondary">
                          {items.length} item{items.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatClassificationForDisplay(bucket)} — review and refine the drafted answers.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addItem(bucket)}>
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((q) => {
                      const isEditing = editingUid === q.__uid
                      const badge = formatClassificationForDisplay(q.classification)
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
                                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                    <X className="h-4 w-4 mr-1" /> Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => startEdit(q.__uid)}>
                                    <Edit3 className="h-4 w-4 mr-1" /> Edit
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => removeItem(q.__uid)}>
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            <div className="text-sm font-medium">Question</div>
                            {isEditing ? (
                              <Textarea value={editedQ} onChange={(e) => setEditedQ(e.target.value)} placeholder="Edit the question" />
                            ) : (
                              <div className="text-sm">{q.question || <span className="text-muted-foreground italic">Untitled</span>}</div>
                            )}

                            <div className="text-sm font-medium mt-2">Answer</div>
                            {isEditing ? (
                              <Textarea value={editedA} onChange={(e) => setEditedA(e.target.value)} placeholder="Refine the drafted answer" />
                            ) : (
                              <Textarea
                                value={String(q.answer ?? "")}
                                onChange={(e) => setAnswer(q.__uid, e.target.value)}
                                placeholder="Refine the drafted answer"
                              />
                            )}
                          </div>
                        </div>
                      )
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
            <Button onClick={() => handleProceed()}>
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
