//@ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight, ArrowLeft, Sparkles, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PlanningProcedureQuestionsStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}

export const PlanningProcedureQuestionsStep: React.FC<PlanningProcedureQuestionsStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [questions, setQuestions] = useState<any[]>(stepData.questions || [])
  const [loading, setLoading] = useState(false)
  const [generatingAnswers, setGeneratingAnswers] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (questions.length === 0) {
      generateQuestions()
    }
  }, [])

  const generateQuestions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/procedures/planning/generate-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          engagementId: engagement._id,
          mode,
          selectedSections: stepData.selectedSections,
          materiality: stepData.materiality,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate questions")

      const data = await response.json()
      setQuestions(data.questions)
    } catch (error) {
      console.error("Error generating questions:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate procedure questions. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateAnswers = async () => {
    setGeneratingAnswers(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/procedures/planning/generate-answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          engagementId: engagement._id,
          questions: questions,
          materiality: stepData.materiality,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate answers")

      const data = await response.json()
      setQuestions(data.questions)

      toast({
        title: "Answers Generated",
        description: "AI has generated answers for your planning procedures.",
      })
    } catch (error) {
      console.error("Error generating answers:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate answers. You can fill them manually.",
        variant: "destructive",
      })
    } finally {
      setGeneratingAnswers(false)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, answer } : q)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/procedures/${engagement._id}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedureType: "planning",
          mode,
          materiality: stepData.materiality,
          selectedSections: stepData.selectedSections,
          questions,
          status: "in-progress",
        }),
      })

      if (!response.ok) throw new Error("Failed to save")

      toast({
        title: "Progress Saved",
        description: "Your planning procedures have been saved.",
      })
    } catch (error) {
      console.error("Error saving:", error)
      toast({
        title: "Save Failed",
        description: "Failed to save progress.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleProceed = () => {
    onComplete({ questions })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Generating Planning Procedures
          </CardTitle>
          <p className="text-muted-foreground">Generating procedure questions based on your selected sections...</p>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  const groupedQuestions = questions.reduce(
    (acc, question) => {
      const section = question.sectionId || "general"
      if (!acc[section]) acc[section] = []
      acc[section].push(question)
      return acc
    },
    {} as Record<string, any[]>,
  )

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-xl text-foreground">Planning Procedures</h3>
          <p className="text-muted-foreground font-body">Review and complete the planning procedure questions</p>
        </div>
        <div className="flex items-center gap-2">
          {(mode === "ai" || mode === "hybrid") && (
            <Button
              variant="outline"
              onClick={generateAnswers}
              disabled={generatingAnswers}
              className="flex items-center gap-2 bg-transparent"
            >
              {generatingAnswers ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Answers
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-transparent"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Progress
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Questions by Section */}
      {Object.entries(groupedQuestions).map(([sectionId, sectionQuestions]) => (
        <Card key={sectionId}>
          <CardHeader>
            <CardTitle className="font-heading text-lg text-foreground">
              {sectionQuestions[0]?.sectionTitle || sectionId}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {sectionQuestions.length} Question{sectionQuestions.length > 1 ? "s" : ""}
              </Badge>
              <Badge variant="secondary">{sectionQuestions.filter((q) => q.answer?.trim()).length} Completed</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {sectionQuestions.map((question) => (
              <div key={question.id} className="space-y-3">
                <div className="flex items-start gap-2">
                  <Badge variant={question.isRequired ? "destructive" : "secondary"} className="mt-1">
                    {question.isRequired ? "Required" : "Optional"}
                  </Badge>
                  <div className="flex-1">
                    <h4 className="font-body-semibold text-foreground mb-1">{question.label || question.question}</h4>
                    {question.help && <p className="text-sm text-muted-foreground font-body mb-2">{question.help}</p>}
                    <Textarea
                      value={question.answer || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder="Enter your response..."
                      className="min-h-24 font-body"
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2 bg-transparent">
          <ArrowLeft className="h-4 w-4" />
          Back to Sections
        </Button>
        <Button onClick={handleProceed} className="flex items-center gap-2">
          Proceed to Recommendations
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
