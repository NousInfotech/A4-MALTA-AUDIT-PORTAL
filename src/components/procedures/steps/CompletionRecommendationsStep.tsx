// File: steps/CompletionRecommendationsStep.tsx
import type React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Lightbulb, Save, Loader2, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import NotebookInterface from "../NotebookInterface"

interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  section?: string
}

interface CompletionRecommendationsStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data?.session?.access_token

  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData

  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  })
}

export const CompletionRecommendationsStep: React.FC<CompletionRecommendationsStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [recommendations, setRecommendations] = useState<ChecklistItem[]>(() => {
    if (Array.isArray(stepData.recommendations)) {
      return stepData.recommendations;
    } else if (stepData.recommendations && typeof stepData.recommendations === 'string') {
      try {
        const parsed = JSON.parse(stepData.recommendations);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    } else if (stepData.sectionRecommendations) {
      const allRecommendations: ChecklistItem[] = [];
      Object.values(stepData.sectionRecommendations).forEach((sectionRecs: any) => {
        if (Array.isArray(sectionRecs)) {
          allRecommendations.push(...sectionRecs);
        }
      });
      return allRecommendations;
    }
    return [];
  });

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if ((mode === "ai" || mode === "hybrid") && (!recommendations || recommendations.length === 0)) {
      generateAIRecommendations()
    }
  }, [mode, recommendations])

  const generateAIRecommendations = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_APIURL
      
      const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}/generate/recommendations`, {
        method: "POST",
        body: JSON.stringify({
          procedures: stepData.procedures,
          materiality: stepData.materiality || 0,
        }),
      })
      
      if (!res.ok) throw new Error("Failed to generate recommendations")
      const data = await res.json()
      
      if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations)
      } else if (data.recommendations && typeof data.recommendations === 'string') {
        const checklistItems: ChecklistItem[] = data.recommendations
          .split('\n')
          .filter(line => line.trim())
          .map((line, index) => ({
            id: `rec-${Date.now()}-${index}`,
            text: line.trim(),
            checked: false,
            section: 'general'
          }));
        setRecommendations(checklistItems)
      } else {
        setRecommendations([])
      }
    } catch (error) {
      console.error("Error generating AI recommendations:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate AI recommendations. You can enter them manually.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProcedures = async () => {
    setSaving(true)
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) throw new Error("VITE_APIURL is not set")

      const payload = {
        ...stepData,
        recommendations: recommendations,
        status: "completed",
        mode,
        procedures: stepData.procedures || [],
      }

      const formData = new FormData()
      formData.append("data", JSON.stringify(payload))

      const fileMap: Array<{ sectionId: string; fieldKey: string; originalName: string }> = []

      ;(payload.procedures || []).forEach((proc: any) => {
        const sectionId = proc.sectionId || proc.id
        ;(proc.fields || []).forEach((f: any) => {
          if (f?.type === "file" && f?.answer instanceof File) {
            const file: File = f.answer
            formData.append("files", file, file.name)
            fileMap.push({
              sectionId,
              fieldKey: f.key,
              originalName: file.name,
            })
          }
        })
      })

      if (fileMap.length) {
        formData.append("fileMap", JSON.stringify(fileMap))
      }

      const response = await authFetch(`${base}/api/completion-procedures/${engagement._id}/save`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Failed to save procedures")

      const savedProcedure = await response.json()

      toast({
        title: "Procedures Saved",
        description: "Your completion procedures and recommendations have been saved successfully.",
      })

      onComplete({ ...payload, _id: savedProcedure._id })
    } catch (error: any) {
      console.error("Error saving procedures:", error)
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save procedures.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Generating AI Recommendations
          </CardTitle>
          <p className="text-muted-foreground">
            AI is analyzing your procedures to generate tailored completion recommendations...
          </p>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Completion Recommendations</CardTitle>
          {mode !== "manual" && (
            <Alert className="mt-3">
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>AI-Generated:</strong> These recommendations are based on your completion procedures. Please review
                and adjust them for your client.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>

        <CardContent>
          <NotebookInterface
            isOpen={true}
            isEditable={true}
            onClose={() => {}}
            recommendations={recommendations}
            onSave={(content) => {
              if (Array.isArray(content)) {
                setRecommendations(content);
              } else if (typeof content === 'string') {
                const checklistItems: ChecklistItem[] = content
                  .split('\n')
                  .filter(line => line.trim())
                  .map((line, index) => ({
                    id: `rec-${Date.now()}-${index}`,
                    text: line.trim(),
                    checked: false,
                    section: 'general'
                  }));
                setRecommendations(checklistItems);
              }
            }}
            isPlanning={false}
            dismissible={false}
          />
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        <Button onClick={handleSaveProcedures} disabled={saving} className="flex items-center gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Save Procedures
            </>
          )}
        </Button>
      </div>
    </div>
  )
}