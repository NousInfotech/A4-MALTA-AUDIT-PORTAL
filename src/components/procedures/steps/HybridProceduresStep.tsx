// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Sparkles, PlusCircle, Save, Edit3, X, CheckCircle, Trash2 } from "lucide-react"

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
    return { ...q, __uid, id: q.id ?? __uid, isRequired: !!q.isRequired }
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
  // Always show deepest for Assets/Liabilities
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
  // Otherwise top-level
  return top
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

export const HybridProceduresStep: React.FC<{
  engagement: any
  mode: "hybrid"
  stepData: any
  onComplete: (patch: any) => void
  onBack: () => void
}> = ({ engagement, stepData, onComplete, onBack }) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState<any[]>([])
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [editedQ, setEditedQ] = useState("")
  const [editedA, setEditedA] = useState("")
  const [recommendationsStr, setRecommendationsStr] = useState<string>(
    typeof stepData.recommendations === "string" ? stepData.recommendations : ""
  )

  // 1) Load MANUAL procedures from local templates (no API)
  useEffect(() => {
    const loadManual = async () => {
      setLoading(true)
      try {
        const module = await import("@/static/procedures")
        const staticProcedures = module.default || {}

        const selected: string[] = Array.isArray(stepData?.selectedClassifications)
          ? stepData.selectedClassifications
          : []

        const all: any[] = []
        selected.forEach((cls) => {
          const arr = staticProcedures[cls] || staticProcedures.default || []
          arr.forEach((p: any) =>
            all.push({
              id: p.id || `man_${mkUid()}`,
              classification: cls,
              question: p.question || p.title || "",
              answer: p.answer || "",
              isRequired: !!p.isRequired,
              origin: "manual",
            })
          )
        })

        setQuestions(normalize(all))
        if (all.length === 0) {
          toast({
            title: "No Templates",
            description: "Add entries in src/static/procedures.ts for your selected classifications.",
          })
        }
      } catch (e: any) {
        toast({ title: "Load failed", description: e.message, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    loadManual()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagement?._id, JSON.stringify(stepData?.selectedClassifications || []), stepData?.materiality])

  /* ---------------- AI append ---------------- */

  const generateMoreWithAI = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const res = await authFetch(`${base}/api/procedures/hybrid/questions`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement?._id,
          materiality: stepData.materiality,
          classifications: stepData.selectedClassifications || [],
          // keep payload lightweight; drop local ids/uids
          manualQuestions: questions.map(({ __uid, id, ...rest }) => rest),
        }),
      })

      const contentType = res.headers.get("content-type") || ""
      const raw = await res.text()
      if (!res.ok) {
        throw new Error(
          contentType.includes("application/json")
            ? JSON.parse(raw)?.message || "Failed to generate AI additions"
            : raw?.slice(0, 200) || `HTTP ${res.status}`
        )
      }
      const data = contentType.includes("application/json") ? JSON.parse(raw) : {}

      const extra = Array.isArray(data?.aiQuestions)
        ? data.aiQuestions
        : Array.isArray(data?.aiQuestions)
        ? data.aiQuestions
        : []

      let normalized = extra.map((q: any, i: number) => ({
        id: q.id || `ai_${i + 1}_${Math.random().toString(36).slice(2, 6)}`,
        classification: q.classification || "",
        question: q.question || q.title || "",
        answer: q.answer || "",
        isRequired: !!q.isRequired,
        origin: "ai",
      }))

      // ensure classification separation if missing
      normalized = ensureClassifications(normalized, stepData?.selectedClassifications || [])
      normalized = normalize(normalized)

      setQuestions((prev) => [...prev, ...normalized])

      // recommendations: array -> single markdown string
      const nextRecs = Array.isArray(data?.recommendations)
        ? formatRecommendationsMarkdown(data.recommendations)
        : typeof data?.recommendations === "string"
        ? data.recommendations
        : ""
      if (nextRecs) setRecommendationsStr(nextRecs)

      toast({ title: "AI Added", description: `Appended ${normalized.length} AI questions.` })
    } catch (e: any) {
      toast({ title: "AI append failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------- per-row handlers (scoped by __uid) ---------------- */

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

  const toggleRequired = (uid: string) => {
    setQuestions((prev) => prev.map((q) => (q.__uid === uid ? { ...q, isRequired: !q.isRequired } : q)))
  }

  const removeItem = (uid: string) => {
    setQuestions((prev) => prev.filter((q) => q.__uid !== uid))
  }

  const addCustom = (classification: string) => {
    const __uid = `custom_${mkUid()}`
    const item = {
      __uid,
      id: __uid,
      classification,
      question: "New custom procedure item",
      answer: "",
      isRequired: false,
      origin: "manual",
    }
    setQuestions((prev) => [...prev, item])
    setEditingUid(__uid)
    setEditedQ(item.question)
    setEditedA("")
  }

  /* ---------------- grouping ---------------- */

  const grouped = useMemo(() => {
    const by: Record<string, any[]> = {}
    for (const q of questions) {
      const key = q.classification || "General"
      if (!by[key]) by[key] = []
      by[key].push(q)
    }
    return by
  }, [questions])

  /* ---------------- save / continue ---------------- */

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
          mode: "hybrid",
        }),
      })
      toast({ title: "Draft Saved", description: "Your hybrid draft was saved." })
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    }
  }

  const handleProceed = () => {
    onComplete({
      questions: questions.map(({ __uid, ...rest }) => rest),
      recommendations: recommendationsStr, // single formatted string for next component
      selectedClassifications: stepData?.selectedClassifications || [],
    })
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hybrid — Start with Manual, then Add AI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button onClick={generateMoreWithAI} disabled={loading || questions.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate More with AI
            </Button>
            <Button variant="secondary" onClick={saveDraft} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>

          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

          {Object.keys(grouped).length === 0 ? (
            <Alert>
              <AlertDescription>
                No manual questions loaded yet. If this persists, ensure <code>src/static/procedures.ts</code> has
                templates for your selected classifications.
              </AlertDescription>
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
                        {formatClassificationForDisplay(bucket)} — review and refine.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addCustom(bucket)}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Custom Question
                    </Button>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {items.map((q) => {
                      const isEditing = editingUid === q.__uid
                      const badge = formatClassificationForDisplay(q.classification)
                      return (
                        <div key={q.__uid} className="rounded border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{badge}</Badge>
                              <Badge variant={q.origin === "ai" ? "default" : "secondary"}>
                                {q.origin === "ai" ? "AI" : "Manual"}
                              </Badge>
                              {q.isRequired ? (
                                <Badge variant="default">Required</Badge>
                              ) : (
                                <Badge variant="secondary">Optional</Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => toggleRequired(q.__uid)}>
                                {q.isRequired ? "Mark Optional" : "Mark Required"}
                              </Button>
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

                          <div className="space-y-2">
                            <div className="text-sm font-medium">Question</div>
                            {isEditing ? (
                              <Textarea
                                value={editedQ}
                                onChange={(e) => setEditedQ(e.target.value)}
                                placeholder="Edit the question"
                              />
                            ) : (
                              <div className="text-sm">{q.question || <span className="text-muted-foreground italic">Untitled</span>}</div>
                            )}

                            <div className="text-sm font-medium mt-2">Answer</div>
                            {isEditing ? (
                              <Textarea
                                value={editedA}
                                onChange={(e) => setEditedA(e.target.value)}
                                placeholder="Add/Refine the answer"
                              />
                            ) : (
                              <Textarea
                                value={String(q.answer ?? "")}
                                onChange={(e) => setAnswer(q.__uid, e.target.value)}
                                placeholder="Add/Refine the answer"
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

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onBack}>Back</Button>
            <Button onClick={handleProceed} disabled={Object.keys(grouped).length === 0}>Continue</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
