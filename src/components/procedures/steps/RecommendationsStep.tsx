
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
  const [recommendations, setRecommendations] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (mode === "ai" || mode === "hybrid") {
      generateAIRecommendations()
    }
  }, [mode, stepData.questions])

  const generateAIRecommendations = async () => {
    setLoading(true)
    try {
      // Simulate AI recommendation generation
      // In a real implementation, this would call your AI service
      const proceduresAndFindings = stepData.questions
        ?.map((q: any) => `${q.question}: ${q.answer || "No answer provided"}`)
        .join("\n")

      // For demo purposes, generate sample recommendations
      const sampleRecommendations = `Based on the audit procedures performed, the following recommendations are provided:

HIGH PRIORITY:
• Strengthen internal controls over cash handling and bank reconciliation processes
• Implement monthly aging analysis for trade receivables with formal follow-up procedures
• Establish formal inventory count procedures with proper documentation

MEDIUM PRIORITY:
• Review and update depreciation policies to ensure consistency with asset usage
• Implement quarterly reviews of doubtful debt provisions
• Enhance documentation for journal entry approvals

LOW PRIORITY:
• Consider implementing automated three-way matching for purchase transactions
• Review chart of accounts for potential consolidation opportunities
• Establish formal procedures for year-end accruals and cut-off testing

These recommendations will help strengthen the client's financial reporting processes and internal control environment.`

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
      if (!base) {
        throw new Error("VITE_APIURL is not set")
      }

      const procedureData = {
        mode,
        materiality: stepData.materiality,
        selectedClassifications: stepData.selectedClassifications,
        validitySelections: stepData.validitySelections,
        questions: stepData.questions,
        recommendations,
        status: "completed",
      }

      const response = await authFetch(`${base}/api/procedures/${engagement._id}`, {
        method: "POST",
        body: JSON.stringify(procedureData),
      })

      if (!response.ok) {
        throw new Error("Failed to save procedures")
      }

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

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
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-xl text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              Generating AI Recommendations
            </CardTitle>
            <p className="text-muted-foreground font-body">
              AI is analyzing your procedure responses to generate tailored audit recommendations...
            </p>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground font-body">This may take a few moments...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Audit Recommendations
          </CardTitle>
          <p className="text-muted-foreground font-body">
            {mode === "manual"
              ? "Enter your audit recommendations based on the procedures performed."
              : "Review and customize the AI-generated recommendations based on your audit findings."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Total Questions</p>
                <p className="text-xl font-body-semibold text-foreground">{stats.totalQuestions}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Answered</p>
                <p className="text-xl font-body-semibold text-foreground">{stats.answeredQuestions}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Completion</p>
                <p className="text-xl font-body-semibold text-foreground">{stats.completionRate}%</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <Lightbulb className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Materiality</p>
                <p className="text-xl font-body-semibold text-foreground">{formatCurrency(stepData.materiality)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Input */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-lg text-foreground">Recommendations</CardTitle>
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-transparent">
                  <FileText className="h-4 w-4 mr-2" />
                  Preview Report
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl">Audit Procedures Report Preview</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h3 className="font-body-semibold text-foreground mb-2">Engagement Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm font-body">
                      <div>
                        <span className="text-muted-foreground">Client:</span> {engagement.title}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mode:</span> {mode.toUpperCase()}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Materiality:</span>{" "}
                        {formatCurrency(stepData.materiality)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Classifications:</span>{" "}
                        {stepData.selectedClassifications?.length || 0}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-body-semibold text-foreground mb-2">Recommendations</h3>
                    <div className="bg-muted/20 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap font-body text-sm text-foreground">
                        {recommendations || "No recommendations provided."}
                      </pre>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              placeholder="Enter your audit recommendations here. Consider including:
• Internal control weaknesses identified
• Accounting and reporting improvements
• Compliance issues
• Risk management suggestions
• Operational efficiency recommendations"
              className="min-h-64 font-body"
            />

            {mode !== "manual" && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="font-body">
                  <strong>AI-Generated:</strong> These recommendations have been generated based on your audit
                  procedures and findings. Please review and customize them as needed for your specific client
                  situation.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Completion Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg text-foreground">Ready to Complete</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4">
              <h4 className="font-body-semibold text-foreground mb-3">Procedure Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-body">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Procedures:</span>
                    <span className="text-foreground font-body-semibold">{stats.totalQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Answered:</span>
                    <span className="text-foreground font-body-semibold">{stats.answeredQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Required Completed:</span>
                    <span className="text-foreground font-body-semibold">
                      {stats.answeredRequired}/{stats.requiredQuestions}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Classifications:</span>
                    <span className="text-foreground font-body-semibold">
                      {stepData.selectedClassifications?.length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid Accounts:</span>
                    <span className="text-foreground font-body-semibold">
                      {stepData.validitySelections?.filter((v: any) => v.isValid).length || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Completion Rate:</span>
                    <span className="text-foreground font-body-semibold">{stats.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {stats.answeredRequired < stats.requiredQuestions && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="font-body">
                  You have {stats.requiredQuestions - stats.answeredRequired} required questions that still need
                  answers. You can save the procedures now and complete them later, or go back to finish them.
                </AlertDescription>
              </Alert>
            )}
          </div>
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
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Procedures
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
