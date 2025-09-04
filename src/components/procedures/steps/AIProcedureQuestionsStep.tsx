// @ts-nocheck
import React, { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Sparkles, Edit3, Save, Trash2, CheckCircle } from "lucide-react"

/** ---------- auth fetch helper ---------- */
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

/** ---------- tiny uid helper (no external deps) ---------- */
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

/** Ensure every question has a stable unique key */
function normalizeQuestions(items: any[] | undefined | null): any[] {
  if (!Array.isArray(items)) return []
  return items.map((q, i) => {
    const base = q || {}
    // prefer existing stable keys if present
    const stable = base.__uid || base.id || base._id
    const __uid = stable ? String(stable) : `q_${uid()}_${i}`
    // do not mutate input
    return { ...base, __uid, id: base.id ?? __uid }
  })
}

/** Grouping key preference: recommendation bucket → classificationTag → General */
function groupKeyFor(q: any): string {
  return (
    q.recommendationBucket ||
    q.recommendationCategory ||
    q.classificationTag ||
    q.classification ||
    "General"
  )
}

const AIProcedureQuestionsStep: React.FC<{
  engagement: any
  mode: "ai"
  stepData: any
  onComplete: (patch: any) => void
  onBack: () => void
}> = ({ engagement, stepData, onComplete, onBack }) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Normalize the incoming draft (prevents "toggle all" on first render)
  const [questions, setQuestions] = useState<any[]>(
    normalizeQuestions(stepData.questions)
  )
  const [recommendations, setRecommendations] = useState<any[]>(
    Array.isArray(stepData.recommendations) ? stepData.recommendations : []
  )

function formatClassificationForDisplay(classification?: string) {
  if (!classification) return "General"
  const parts = classification.split(" > ")
  const top = parts[0]
  // Always show deepest for Assets/Liabilities
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
  // Otherwise top-level
  return top
}
  /** ---------- API: generate questions ---------- */
  const generateQuestions = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) throw new Error("VITE_APIURL is not set")
      const res = await authFetch(`${base}/api/procedures/ai/questions`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement?._id,
          materiality: stepData.materiality,
          classifications: stepData.selectedClassifications || [],
          validitySelections: stepData.validitySelections || [],
        }),
      })

      // don't try to parse JSON if server returned HTML error page
      const ct = res.headers.get("content-type") || ""
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(
          ct.includes("application/json") ? (JSON.parse(text)?.message || "Failed to generate AI questions")
          : (text?.slice(0, 120) || `Failed to generate AI questions (HTTP ${res.status}).`)
        )
      }

      const data = await res.json()
      const qs = normalizeQuestions(Array.isArray(data?.aiQuestions) ? data.aiQuestions : [])
      setQuestions(qs)
      setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : [])
      toast({ title: "AI Questions Ready", description: `Generated ${qs.length} questions.` })
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  /** ---------- state helpers (by __uid — never by id) ---------- */
  const updateQuestion = (uidKey: string, patch: Partial<any>) => {
    setQuestions(prev => prev.map(q => (q.__uid === uidKey ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (uidKey: string) => {
    setQuestions(prev => prev.filter(q => q.__uid !== uidKey))
  }

  /** ---------- save draft ---------- */
  const saveDraft = async () => {
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) throw new Error("VITE_APIURL is not set")
      await authFetch(`${base}/api/procedures/${engagement?._id}`, {
        method: "POST",
        body: JSON.stringify({
          ...stepData,
          // strip internal key on save
          questions: questions.map(({ __uid, ...rest }) => rest),
          recommendations,
          procedureType: "procedures",
          status: "in-progress",
          mode: "ai",
        }),
      })
      toast({ title: "Draft Saved", description: "Your AI questions were saved." })
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" })
    }
  }

  /** ---------- grouping (beautiful cards by recommendation bucket) ---------- */
  const groups = useMemo(() => {
    const by: Record<string, any[]> = {}
    for (const q of questions) {
      const key = groupKeyFor(q)
      if (!by[key]) by[key] = []
      by[key].push(q)
    }
    return by
  }, [questions])

  // try to show a short blurb from recommendations for each bucket
  const recTextFor = (bucket: string) => {
    // look for a recommendation object that matches the bucket/classification
    const hit =
      (recommendations || []).find((r: any) =>
        [r.bucket, r.category, r.classificationTag, r.classification]
          .filter(Boolean)
          .some((k) => String(k).toLowerCase() === String(bucket).toLowerCase())
      ) || null
    return typeof hit?.text === "string" ? hit.text
      : typeof hit?.recommendation === "string" ? hit.recommendation
      : ""
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI — Generate Questions
          </CardTitle>
          <div className="flex gap-3">
            <Button onClick={generateQuestions} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate Questions
            </Button>
            <Button variant="secondary" onClick={saveDraft} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions yet. Click "Generate Questions".</p>
          ) : (
            <>
              {/* Grouped, beautiful cards by bucket/classification */}
              {Object.entries(groups).map(([bucket, items]) => (
                <Card key={bucket} className="border-2 border-primary/10 shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{formatClassificationForDisplay(bucket)}</Badge>
                          <Badge variant="secondary">{items.length} item{items.length > 1 ? "s" : ""}</Badge>
                        </div>
                        {recTextFor(bucket) ? (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {recTextFor(bucket)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {items.map((q) => (
                      <div key={q.__uid} className="rounded border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{formatClassificationForDisplay(q.classificationTag) || "General"}</Badge>
                            {q.isRequired ? (
                              <Badge variant="default">Required</Badge>
                            ) : (
                              <Badge variant="outline">Optional</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuestion(q.__uid, { isRequired: !q.isRequired })}
                            >
                              {q.isRequired ? "Mark Optional" : "Mark Required"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => removeQuestion(q.__uid)}>
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>

                        <div className="mt-2">
                          <Textarea
                            value={q.question || ""}
                            onChange={(e) => updateQuestion(q.__uid, { question: e.target.value })}
                            placeholder="Edit the procedure question"
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end">
                <Button
                  onClick={() =>
                    onComplete({
                      questions: questions.map(({ __uid, ...rest }) => rest),
                      recommendations,
                    })
                  }
                  disabled={questions.length === 0}
                >
                  Continue
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
export default AIProcedureQuestionsStep