
import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Lightbulb, Save, Loader2, Sparkles } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PlanningRecommendationsStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}

export const PlanningRecommendationsStep: React.FC<PlanningRecommendationsStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [recommendations, setRecommendations] = useState(stepData.recommendations || "")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if ((mode === "ai" || mode === "hybrid") && !stepData.recommendations) {
      generateAIRecommendations()
    }
  }, [mode, stepData.questions])

  const generateAIRecommendations = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/procedures/planning/generate-recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          engagementId: engagement._id,
          questions: stepData.questions,
          materiality: stepData.materiality,
          selectedSections: stepData.selectedSections,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate recommendations")

      const data = await response.json()
      setRecommendations(data.recommendations)
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
      const procedureData = {
        procedureType: "planning",
        ...stepData,
        recommendations,
        status: "completed",
        mode,
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/procedures/${engagement._id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(procedureData),
      })

      if (!response.ok) throw new Error("Failed to save procedures")

      const savedProcedure = await response.json()

      toast({
        title: "Procedures Saved",
        description: "Your planning procedures and recommendations have been saved successfully.",
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Generating Planning Recommendations
          </CardTitle>
          <p className="text-muted-foreground">
            AI is analyzing your planning procedures to generate tailored recommendations...
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
          <CardTitle>Planning Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={recommendations}
            onChange={(e) => setRecommendations(e.target.value)}
            placeholder="Enter or review planning recommendations..."
            className="min-h-64 font-body"
          />
          {mode !== "manual" && (
            <Alert className="mt-3">
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>AI-Generated:</strong> These recommendations are based on your planning procedures. Please
                review and adjust them for your client.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2 bg-transparent">
          <ArrowLeft className="h-4 w-4" />
          Back to Procedures
        </Button>
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
