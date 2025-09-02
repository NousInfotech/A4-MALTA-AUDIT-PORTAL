// @ts-nocheck
import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, Sparkles, PlusCircle, Save } from "lucide-react"

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
  const [recommendations, setRecommendations] = useState<any[]>([])

  // 1) Load MANUAL procedures first (filtered by selections)
  useEffect(() => {
    const loadManual = async () => {
      setLoading(true)
      try {
        const base = import.meta.env.VITE_APIURL
        const res = await authFetch(`${base}/api/procedures/manual`, {
          method: "POST",
          body: JSON.stringify({
            selectedClassifications: stepData.selectedClassifications || [],
            materiality: stepData.materiality,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.message || "Failed to load manual procedures")
        const qs = Array.isArray(data?.questions) ? data.questions : (Array.isArray(data?.procedures) ? data.procedures : [])
        // normalize to {id, classification, question, answer?, isRequired?}
        const normalized = qs.map((q: any, i: number) => ({
          id: q.id || `man_${i + 1}`,
          classification: q.classification || "General",
          question: q.question || q.title || "",
          answer: q.answer || "",
          isRequired: !!q.isRequired,
          origin: "manual",
        }))
        setQuestions(normalized)
      } catch (e: any) {
        toast({ title: "Load failed", description: e.message, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    loadManual()
  }, [engagement?._id, JSON.stringify(stepData?.selectedClassifications || []), stepData?.materiality])

  const addCustom = (classification: string) => {
    setQuestions(prev => [
      ...prev,
      {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        classification,
        question: "New custom procedure item",
        answer: "",
        isRequired: false,
        origin: "manual",
      },
    ])
  }

  // 2) Generate MORE questions with AI, given manual
  const generateMoreWithAI = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const res = await authFetch(`${base}/api/procedures/hybrid/questions`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement?._id,
          materiality: stepData.materiality,
          selectedClassifications: stepData.selectedClassifications || [],
          manualQuestions: questions.map(({ id, ...rest }) => rest),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || "Failed to generate AI additions")

      const extra = Array.isArray(data?.additionalQuestions) ? data.additionalQuestions : (Array.isArray(data?.questions) ? data.questions : [])
      const normalized = extra.map((q: any, i: number) => ({
        id: q.id || `ai_${i + 1}_${Math.random().toString(36).slice(2, 6)}`,
        classification: q.classification || "General",
        question: q.question || q.title || "",
        answer: q.answer || "",
        isRequired: !!q.isRequired,
        origin: "ai",
      }))
      setQuestions(prev => [...prev, ...normalized])
      setRecommendations(data?.recommendations || [])
      toast({ title: "AI Added", description: `Appended ${normalized.length} AI questions.` })
    } catch (e: any) {
      toast({ title: "AI append failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const updateQuestion = (id: string, patch: Partial<any>) => {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  const saveDraft = async () => {
    try {
      const base = import.meta.env.VITE_APIURL
      await authFetch(`${base}/api/procedures/${engagement?._id}/save`, {
        method: "POST",
        body: JSON.stringify({
          ...stepData,
          questions,
          recommendations,
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

          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No manual questions loaded yet. If this persists, verify your `/api/procedures/manual` endpoint.
            </p>
          ) : (
            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="rounded border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>{q.classification || "General"}</Badge>
                      <Badge variant={q.origin === "ai" ? "default" : "secondary"}>
                        {q.origin === "ai" ? "AI" : "Manual"}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => updateQuestion(q.id, { isRequired: !q.isRequired })}>
                        {q.isRequired ? "Required" : "Optional"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => removeQuestion(q.id)}>Delete</Button>
                    </div>
                  </div>
                  <Textarea
                    value={q.question || ""}
                    onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => addCustom("General")}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Custom Question
            </Button>
            <Button onClick={() => onComplete({ questions, recommendations })} disabled={questions.length === 0}>
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
