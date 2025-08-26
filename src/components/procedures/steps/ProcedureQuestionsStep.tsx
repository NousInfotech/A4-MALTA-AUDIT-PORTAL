// @ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Loader2,
  Bug,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface ProcedureQuestionsStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}

interface ProcessingStatus {
  classification: string
  status: "queued" | "loading" | "completed" | "error"
  error?: string
}

const DEFAULT_VISIBLE = 8

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

// ---- helper: transform procedures -> questions fallback ----
function proceduresToQuestionsFallback(result: any): any[] {
  const procArr = result?.procedure?.procedures
  if (!Array.isArray(procArr) || procArr.length === 0) return []

  // If API returned a top-level narrative, prefer it; else blank
  const narrative =
    result?.narrative ||
    result?.procedure?.narrative || // if you ever add it to the saved doc
    ""

  // Each ProcedureDetail has { id, title, ... }
  // We map each to a "question" line so the UI can render them.
  const qs = procArr.map((p: any, idx: number) => ({
    id: p.id || `ai_${idx + 1}`,
    question: p.title || `Procedure ${idx + 1}`,
    answer: narrative || "",
    isRequired: false,
    classification:
      // best effort: some backends include classification inside tests or title;
      // if not present, drop into "General"
      p.classification ||
      p.area ||
      "General",
    procedure: p,
  }))

  return qs
}

export const ProcedureQuestionsStep: React.FC<ProcedureQuestionsStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus[]>([])
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [editedText, setEditedText] = useState("")
  const [editedAnswer, setEditedAnswer] = useState("")
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [rawResult, setRawResult] = useState<any>(null)
  const [recommendations,setRecommendations] = useState([])
  const [showDebug, setShowDebug] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (mode === "manual") {
      loadManualProcedures()
    } else {
      generateAIProcedures()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, JSON.stringify(stepData?.selectedClassifications || [])])

  const loadManualProcedures = async () => {
    setLoading(true)
    try {
      const staticProceduresModule = await import("../../../static/procedures")
      const staticProcedures = staticProceduresModule.default
      const allQuestions: any[] = []

      stepData.selectedClassifications.forEach((classification: string) => {
        const classificationProcedures = staticProcedures[classification] || staticProcedures.default
        if (classificationProcedures) {
          classificationProcedures.forEach((proc: any) => {
            allQuestions.push({
              ...proc,
              classification,
              answer: "",
            })
          })
        }
      })

      setQuestions(allQuestions)
    } catch (error) {
      console.error("Error loading manual procedures:", error)
      toast({
        title: "Error Loading Procedures",
        description: "Failed to load procedure templates.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateAIProcedures = async () => {
    setLoading(true)
    try {
      const selected = Array.isArray(stepData?.selectedClassifications)
        ? stepData.selectedClassifications
        : []

      const initialStatus = selected.map((classification: string) => ({
        classification,
        status: "queued" as const,
      }))
      setProcessingStatus(initialStatus)

      const base = import.meta.env.VITE_APIURL
      if (!base) {
        throw new Error("VITE_APIURL is not set")
      }
      if (!engagement?._id) {
        throw new Error("Engagement id is missing")
      }

      const response = await authFetch(`${base}/api/procedures/${engagement._id}/generate`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          materiality: stepData?.materiality,
          selectedClassifications: selected,
          validitySelections: stepData?.validitySelections,
        }),
      })

<<<<<<< Updated upstream
      const result = await response.json()
      setRawResult(result)
=======
      const result = await response.json();
setRawResult(result);

const fromAPI = result?.procedure?.questions || [];
let nextQuestions = fromAPI;

// Fallback: if API didn't send questions, try to derive from 'procedures'
if (!Array.isArray(nextQuestions) || nextQuestions.length === 0) {
  const derived = proceduresToQuestionsFallback(result);
  if (derived.length > 0) nextQuestions = derived;
}

setQuestions(nextQuestions);
setRecommendations(result?.procedure?.recommendations || []);

      setRawResult(result);

      clearInterval(progressInterval);
>>>>>>> Stashed changes

      if (!response.ok) {
        throw new Error(result?.message || "Failed to generate procedures")
      }

      // Prefer the server-provided questions
      let nextQuestions: any[] = result?.procedure?.questions || []

      // // Fallback: build from procedures if questions are empty
      // if ((!nextQuestions || nextQuestions.length === 0) && Array.isArray(result?.procedure?.procedures)) {
      //   nextQuestions = proceduresToQuestionsFallback(result)
      // }

      setQuestions(nextQuestions || [])
      console.log("recommendations ",result)
      setRecommendations(result?.procedure?.recommendations || [])
      setProcessingStatus(result?.procedure?.aiProcessingStatus || [])

      toast({
        title: "Procedures Generated",
        description: `Successfully generated ${nextQuestions?.length || 0} items.`,
      })
    } catch (error: any) {
      console.error("Error generating AI procedures:", error)
      toast({
        title: "Generation Failed",
        description: error?.message || "Failed to generate procedures.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuestionEdit = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId)
    if (question) {
      setEditingQuestion(questionId)
      setEditedText(question.question)
      setEditedAnswer(question.answer || "")
    }
  }

  const handleQuestionSave = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              question: editedText,
              answer: editedAnswer,
            }
          : q,
      ),
    )
    setEditingQuestion(null)
    setEditedText("")
    setEditedAnswer("")
  }

  const handleQuestionCancel = () => {
    setEditingQuestion(null)
    setEditedText("")
    setEditedAnswer("")
  }

  const handleQuestionDelete = (questionId: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId))
    toast({
      title: "Question Deleted",
      description: "The procedure item has been removed.",
    })
  }

  const handleAddQuestion = (classification: string) => {
    const newQuestion = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      question: "New custom procedure item",
      answer: "",
      isRequired: false,
      classification,
    }
    setQuestions((prev) => [...prev, newQuestion])
    setEditingQuestion(newQuestion.id)
    setEditedText(newQuestion.question)
    setEditedAnswer("")
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, answer } : q)))
  }

  const handleProceed = () => {
    const requiredQuestions = questions.filter((q) => q.isRequired)
    const unansweredRequired = requiredQuestions.filter((q) => !q.answer?.trim())

    if (unansweredRequired.length > 0) {
      toast({
        title: "Required Questions Unanswered",
        description: `Please answer all ${unansweredRequired.length} required items before proceeding.`,
        variant: "destructive",
      })
      return
    }

    onComplete({ questions, recommendations })
  }

  const getQuestionsByClassification = () => {
    const grouped: { [key: string]: any[] } = {}
    questions.forEach((question) => {
      const classification = question.classification || "General"
      if (!grouped[classification]) grouped[classification] = []
      grouped[classification].push(question)
    })
    return grouped
  }

  const formatClassificationForDisplay = (classification: string) => {
    if (!classification) return "General"
    const parts = classification.split(" > ")
    const topLevel = parts[0]
    if (topLevel === "Assets" || topLevel === "Liabilities") {
      return parts[parts.length - 1]
    }
    return topLevel
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "queued":
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case "loading":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />
      default:
        return null
    }
  }

  const getOverallProgress = () => {
    if (processingStatus.length === 0) return 100
    const completed = processingStatus.filter((s) => s.status === "completed").length
    return (completed / processingStatus.length) * 100
  }

  const groupedQuestions = getQuestionsByClassification()
  const requiredCount = questions.filter((q) => q.isRequired).length
  const answeredRequired = questions.filter((q) => q.isRequired && q.answer?.trim()).length

  // Loading view (AI/hybrid)
  if (loading && mode !== "manual") {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="font-heading text-xl text-foreground flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Generating AI Procedures
            </CardTitle>
            <p className="text-muted-foreground font-body">
              AI is analyzing your working papers and generating customized audit procedures...
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-body text-foreground">Overall Progress</span>
                <span className="font-body-semibold text-foreground">{Math.round(getOverallProgress())}%</span>
              </div>
              <Progress value={getOverallProgress()} className="h-2" />
            </div>

            <div className="space-y-3">
              {processingStatus.map((status) => (
                <div
                  key={status.classification}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.status)}
                    <span className="font-body text-foreground">
                      {formatClassificationForDisplay(status.classification)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {status.error && (
                      <Badge variant="destructive" className="max-w-[22rem] truncate">
                        {status.error}
                      </Badge>
                    )}
                    <Badge
                      variant={
                        status.status === "completed"
                          ? "default"
                          : status.status === "error"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {status.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty state if nothing to show
  const isEmpty = Object.keys(groupedQuestions).length === 0

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="overflow-hidden">
        <CardHeader className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="font-heading text-xl text-foreground">
              {mode === "manual" ? "Manual Procedures" : "AI-Generated Procedures"}
            </CardTitle>
            <p className="text-muted-foreground font-body">
              {mode === "manual"
                ? "Review and answer the predefined audit procedures for each classification."
                : "Review the AI-generated procedures and customize them as needed."}
            </p>
          </div>

          {(mode === "ai" || mode === "hybrid") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDebug((v) => !v)}
              className="flex items-center gap-2"
              title="Toggle debug view"
            >
              <Bug className="h-4 w-4" />
              Debug
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Total Items</p>
                <p className="text-xl font-body-semibold text-foreground">{[questions].length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Required</p>
                <p className="text-xl font-body-semibold text-foreground">
                  {answeredRequired}/{requiredCount}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Bot className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Classifications</p>
                <p className="text-xl font-body-semibold text-foreground">{Object.keys(groupedQuestions).length}</p>
              </div>
            </div>
          </div>

          {showDebug && rawResult && (
            <div className="mt-4">
              <ScrollArea className="h-64 rounded-md border p-3">
                <pre className="text-xs whitespace-pre-wrap">
{JSON.stringify(rawResult, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state */}
      {isEmpty && (
        <Card className="border-dashed">
          <CardContent className="py-10 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center max-w-md">
              No items to display. This can happen if the AI returned a structure without the
              <code className="mx-1">procedure.questions</code> array. We’ll now try to build a
              view from the <code className="mx-1">procedure.procedures</code> fallback (if present)
              or you can retry generation.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onBack}>
                Back to Classifications
              </Button>
              <Button onClick={() => generateAIProcedures()}>
                Retry Generate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions by Classification */}
      {!isEmpty && (
        <div className="space-y-6">
          {Object.entries(groupedQuestions).map(([classification, classificationQuestions]) => {
            const isExpanded = !!expanded[classification]
            const visibleQuestions = isExpanded
              ? classificationQuestions
              : classificationQuestions.slice(0, DEFAULT_VISIBLE)
            const hasMore = classificationQuestions.length > DEFAULT_VISIBLE

            return (
              <Card key={classification} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="font-body-semibold truncate">
                        {formatClassificationForDisplay(classification)}
                      </Badge>
                      <span className="text-sm text-muted-foreground font-body whitespace-nowrap">
                        {classificationQuestions.length} items
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasMore && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [classification]: !isExpanded }))
                          }
                          className="h-8"
                        >
                          {isExpanded ? "Show less" : `Show all (${classificationQuestions.length})`}
                        </Button>
                      )}
                      {(mode === "ai" || mode === "hybrid") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddQuestion(classification)}
                          className="flex items-center gap-2 bg-transparent"
                        >
                          <Plus className="h-4 w-4" />
                          Add Item
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <ScrollArea className="h-[28rem] pr-3">
                    <div className="space-y-4">
                      {visibleQuestions.map((question, index) => (
                        <div key={question.id} className="space-y-3 p-4 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                                <span className="text-xs font-body-semibold text-primary">
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                {editingQuestion === question.id ? (
                                  <div className="space-y-3">
                                    <Textarea
                                      value={editedText}
                                      onChange={(e) => setEditedText(e.target.value)}
                                      placeholder="Enter item..."
                                      className="font-body resize-none break-words"
                                    />
                                    <Textarea
                                      value={editedAnswer}
                                      onChange={(e) => setEditedAnswer(e.target.value)}
                                      placeholder="Enter answer / notes..."
                                      className="font-body resize-none break-words"
                                    />
                                    <div className="flex items-center gap-2">
                                      <Button size="sm" onClick={() => handleQuestionSave(question.id)}>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save
                                      </Button>
                                      <Button variant="outline" size="sm" onClick={handleQuestionCancel}>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                      <p className="font-body-semibold text-foreground flex-1 break-words">
                                        {question.question}
                                      </p>
                                      {question.isRequired && (
                                        <Badge variant="secondary" className="text-xs shrink-0">
                                          Required
                                        </Badge>
                                      )}
                                    </div>
                                    <Textarea
                                      value={question.answer || ""}
                                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                      placeholder="Enter your answer..."
                                      className="font-body resize-none break-words"
                                      rows={3}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {editingQuestion !== question.id && (mode === "ai" || mode === "hybrid") && (
                              <div className="flex items-center gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuestionEdit(question.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuestionDelete(question.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {requiredCount > answeredRequired && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-body">
            You have {requiredCount - answeredRequired} required items that need answers before you can proceed.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2 bg-transparent">
          <ArrowLeft className="h-4 w-4" />
          Back to Classifications
        </Button>
        <Button onClick={handleProceed} disabled={requiredCount > answeredRequired} className="flex items-center gap-2">
          Proceed to Recommendations
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
