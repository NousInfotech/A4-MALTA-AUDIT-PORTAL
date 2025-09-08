// Replace the entire file with this updated version
// @ts-nocheck
import React, { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Sparkles, Edit3, Save, Trash2, CheckCircle } from "lucide-react"

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

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

function normalizeQuestions(items: any[] | undefined | null): any[] {
  if (!Array.isArray(items)) return []
  return items.map((q, i) => {
    const base = q || {}
    const stable = base.__uid || base.id || base._id
    const __uid = stable ? String(stable) : `q_${uid()}_${i}`
    return { ...base, __uid, id: base.id ?? __uid }
  })
}

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
  const [generatingClassifications, setGeneratingClassifications] = useState<Set<string>>(new Set())

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
    if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
    return top
  }

  const generateQuestionsForClassification = async (classification: string) => {
    setLoading(true)
    setGeneratingClassifications(prev => {
      const newSet = new Set(prev)
      newSet.add(classification)
      return newSet
    })
    
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) throw new Error("VITE_APIURL is not set")
      const res = await authFetch(`${base}/api/procedures/ai/classification-questions`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement?._id,
          materiality: stepData.materiality,
          classification: classification,
          validitySelections: stepData.validitySelections || [],
        }),
      })

      const ct = res.headers.get("content-type") || ""
      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(
          ct.includes("application/json") ? (JSON.parse(text)?.message || "Failed to generate AI questions")
          : (text?.slice(0, 120) || `Failed to generate AI questions (HTTP ${res.status}).`)
        )
      }

      const data = await res.json()
      const newQuestions = normalizeQuestions(Array.isArray(data?.aiQuestions) ? data.aiQuestions : [])
      
      // Remove existing questions for this classification and add new ones
      setQuestions(prev => {
        const filtered = prev.filter(q => q.classification !== classification)
        return [...filtered, ...newQuestions.map(q => ({ ...q, classification }))]
      })
      
      toast({ 
        title: "AI Questions Ready", 
        description: `Generated ${newQuestions.length} questions for ${formatClassificationForDisplay(classification)}.` 
      })
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
      setGeneratingClassifications(prev => {
        const newSet = new Set(prev)
        newSet.delete(classification)
        return newSet
      })
    }
  }

  const updateQuestion = (uidKey: string, patch: Partial<any>) => {
    setQuestions(prev => prev.map(q => (q.__uid === uidKey ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (uidKey: string) => {
    setQuestions(prev => prev.filter(q => q.__uid !== uidKey))
  }

  const saveDraft = async () => {
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) throw new Error("VITE_APIURL is not set")
      await authFetch(`${base}/api/procedures/${engagement?._id}`, {
        method: "POST",
        body: JSON.stringify({
          ...stepData,
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

  const groups = useMemo(() => {
    const by: Record<string, any[]> = {}
    for (const q of questions) {
      const key = groupKeyFor(q)
      if (!by[key]) by[key] = []
      by[key].push(q)
    }
    return by
  }, [questions])

  const recTextFor = (bucket: string) => {
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
            <Button variant="secondary" onClick={saveDraft} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Classification buttons */}
          <div className="grid grid-cols-2 gap-3">
            {stepData.selectedClassifications?.map((classification: string) => (
              <Button
                key={classification}
                onClick={() => generateQuestionsForClassification(classification)}
                disabled={loading || generatingClassifications.has(classification)}
                className="flex items-center justify-center"
              >
                {generatingClassifications.has(classification) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate for {formatClassificationForDisplay(classification)}
              </Button>
            ))}
          </div>

          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions yet. Select a classification to generate questions.</p>
          ) : (
            <>
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