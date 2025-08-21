// @ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, CheckCircle, Lightbulb, Save, Loader2, Sparkles, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import ReactMarkdown from "react-markdown"

interface RecommendationsStepProps {
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
  return fetch(url, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
}

export const RecommendationsStep: React.FC<RecommendationsStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [recommendations, setRecommendations] = useState(stepData.recommendations || "")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // only auto-generate if no recommendations already exist
    if ((mode === "ai" || mode === "hybrid") && !stepData.recommendations) {
      generateAIRecommendations()
    }
  }, [mode, stepData.questions])

  const generateAIRecommendations = async () => {
    setLoading(true)
    try {
      const proceduresAndFindings = stepData.questions
        ?.map((q: any) => `${q.question}: ${q.answer || "No answer provided"}`)
        .join("\n")

      // TODO: call your backend AI service instead of hardcoding
      const sampleRecommendations = `### Audit Recommendations for ${engagement.title}

#### 1. Internal Control Weaknesses Identified (ISA 265)
- **Priority Level**: High
- **Specific Recommendation**: Strengthen internal controls over cash handling.
- **Rationale**: Weaknesses identified in payables reconciliations.
- **Follow-up**: Quarterly internal audit review.

...`

      setRecommendations(sampleRecommendations)
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

      const procedureData = {
        ...stepData,
        recommendations,
        status: "completed",
        mode,
      }

      const response = await authFetch(`${base}/api/procedures/${engagement._id}`, {
        method: "POST",
        body: JSON.stringify(procedureData),
      })

      if (!response.ok) throw new Error("Failed to save procedures")

      const savedProcedure = await response.json()

      toast({
        title: "Procedures Saved",
        description: "Your audit procedures and recommendations have been saved successfully.",
      })

      onComplete({ ...procedureData, _id: savedProcedure._id })
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)

  const getSummaryStats = () => {
    const totalQuestions = stepData.questions?.length || 0
    const answeredQuestions = stepData.questions?.filter((q: any) => q.answer?.trim()).length || 0
    const requiredQuestions = stepData.questions?.filter((q: any) => q.isRequired).length || 0
    const answeredRequired = stepData.questions?.filter((q: any) => q.isRequired && q.answer?.trim()).length || 0

    return {
      totalQuestions,
      answeredQuestions,
      requiredQuestions,
      answeredRequired,
      completionRate: totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0,
    }
  }

  const stats = getSummaryStats()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Generating AI Recommendations
          </CardTitle>
          <p className="text-muted-foreground">
            AI is analyzing your procedures to generate tailored audit recommendations...
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
      {/* Recommendations Input */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Audit Recommendations</CardTitle>
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Preview Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Audit Recommendations Preview</DialogTitle>
              </DialogHeader>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{recommendations || "No recommendations provided."}</ReactMarkdown>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Enter or review audit recommendations..."
            className="min-h-64 font-body"
          />
          {mode !== "manual" && (
            <Alert className="mt-3">
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>AI-Generated:</strong> These recommendations are based on your audit procedures. Please review
                and adjust them for your client.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end">
        {/* <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Procedures
        </Button> */}
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
