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
  const { toast } = useToast()

  useEffect(() => {
    if (mode === "manual") {
      loadManualProcedures()
    } else {
      generateAIProcedures()
    }
  }, [mode, stepData.selectedClassifications])

  const loadManualProcedures = async () => {
    setLoading(true)
    try {
      // Load static procedures for manual mode
      const staticProcedures = {
  "Assets > Current > Cash & Cash Equivalents": [
    {
      id: "cash_1",
      question: "Have bank reconciliations been prepared for all bank accounts as at year-end?",
      isRequired: true,
    },
    {
      id: "cash_2",
      question: "Have outstanding items on bank reconciliations been reviewed for validity?",
      isRequired: true,
    },
    {
      id: "cash_3",
      question: "Has cash on hand been counted and verified?",
      isRequired: false,
    },
    {
      id: "cash_4",
      question: "Have bank confirmations been obtained for all accounts?",
      isRequired: true,
    },
    {
      id: "cash_5",
      question: "Have restrictions on cash been properly disclosed?",
      isRequired: false,
    },
  ],
  "Assets > Current > Trade Receivables": [
    {
      id: "receivables_1",
      question: "Has an aged debtors analysis been prepared and reviewed?",
      isRequired: true,
    },
    {
      id: "receivables_2",
      question: "Have doubtful debts been adequately provided for?",
      isRequired: true,
    },
    {
      id: "receivables_3",
      question: "Have debtor confirmations been sent and responses reviewed?",
      isRequired: false,
    },
    {
      id: "receivables_4",
      question: "Has subsequent cash receipts testing been performed?",
      isRequired: true,
    },
    {
      id: "receivables_5",
      question: "Have credit terms and collection procedures been reviewed?",
      isRequired: false,
    },
  ],
  "Assets > Current > Inventory": [
    {
      id: "inventory_1",
      question: "Has a physical inventory count been performed?",
      isRequired: true,
    },
    {
      id: "inventory_2",
      question: "Have inventory valuation methods been reviewed for consistency?",
      isRequired: true,
    },
    {
      id: "inventory_3",
      question: "Has obsolete or slow-moving inventory been identified and provided for?",
      isRequired: true,
    },
    {
      id: "inventory_4",
      question: "Have cut-off procedures been performed?",
      isRequired: false,
    },
    {
      id: "inventory_5",
      question: "Has the lower of cost or net realizable value been applied?",
      isRequired: true,
    },
  ],
  "Assets > Non-current > Property, Plant & Equipment": [
    {
      id: "ppe_1",
      question: "Has a fixed asset register been maintained and reconciled?",
      isRequired: true,
    },
    {
      id: "ppe_2",
      question: "Have depreciation rates and methods been reviewed for reasonableness?",
      isRequired: true,
    },
    {
      id: "ppe_3",
      question: "Have additions and disposals been properly authorized and recorded?",
      isRequired: true,
    },
    {
      id: "ppe_4",
      question: "Has impairment testing been considered where appropriate?",
      isRequired: false,
    },
    {
      id: "ppe_5",
      question: "Have capital vs. revenue expenditures been properly classified?",
      isRequired: true,
    },
  ],
  "Liabilities > Current > Trade Payables": [
    {
      id: "payables_1",
      question: "Has an aged creditors analysis been prepared and reviewed?",
      isRequired: true,
    },
    {
      id: "payables_2",
      question: "Have supplier statements been reconciled?",
      isRequired: true,
    },
    {
      id: "payables_3",
      question: "Has search for unrecorded liabilities been performed?",
      isRequired: true,
    },
    {
      id: "payables_4",
      question: "Have creditor confirmations been obtained where necessary?",
      isRequired: false,
    },
    {
      id: "payables_5",
      question: "Have cut-off procedures been performed for purchases?",
      isRequired: true,
    },
  ],
  Income: [
    {
      id: "revenue_1",
      question: "Has revenue recognition policy been reviewed for compliance with accounting standards?",
      isRequired: true,
    },
    {
      id: "revenue_2",
      question: "Have cut-off procedures been performed for sales?",
      isRequired: true,
    },
    {
      id: "revenue_3",
      question: "Has analytical review of revenue been performed?",
      isRequired: true,
    },
    {
      id: "revenue_4",
      question: "Have sales returns and allowances been properly recorded?",
      isRequired: false,
    },
    {
      id: "revenue_5",
      question: "Has completeness of revenue been tested?",
      isRequired: true,
    },
  ],
  Expenses: [
    {
      id: "expenses_1",
      question: "Have expense classifications been reviewed for accuracy?",
      isRequired: true,
    },
    {
      id: "expenses_2",
      question: "Has analytical review of expenses been performed?",
      isRequired: true,
    },
    {
      id: "expenses_3",
      question: "Have accruals and prepayments been properly recorded?",
      isRequired: true,
    },
    {
      id: "expenses_4",
      question: "Have related party transactions been identified and disclosed?",
      isRequired: false,
    },
    {
      id: "expenses_5",
      question: "Has cut-off testing been performed for expenses?",
      isRequired: true,
    },
  ],
  Equity: [
    {
      id: "equity_1",
      question: "Have share capital movements been properly authorized and recorded?",
      isRequired: true,
    },
    {
      id: "equity_2",
      question: "Has retained earnings been properly calculated and presented?",
      isRequired: true,
    },
    {
      id: "equity_3",
      question: "Have dividend payments been properly authorized and recorded?",
      isRequired: false,
    },
    {
      id: "equity_4",
      question: "Have reserves been properly classified and disclosed?",
      isRequired: false,
    },
  ],
  default: [
    {
      id: "general_1",
      question: "Have supporting documents been reviewed and found adequate?",
      isRequired: true,
    },
    {
      id: "general_2",
      question: "Has analytical review been performed and variances investigated?",
      isRequired: true,
    },
    {
      id: "general_3",
      question: "Have journal entries been reviewed for appropriateness?",
      isRequired: false,
    },
    {
      id: "general_4",
      question: "Has management representation been obtained where appropriate?",
      isRequired: false,
    },
  ],
}
      const allQuestions: any[] = []

      stepData.selectedClassifications.forEach((classification: string) => {
        const classificationProcedures = staticProcedures.default[classification] || staticProcedures.default.default
        classificationProcedures.forEach((proc: any) => {
          allQuestions.push({
            ...proc,
            classification,
            answer: "",
          })
        })
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
      // Initialize processing status
      const initialStatus = stepData.selectedClassifications.map((classification: string) => ({
        classification,
        status: "queued" as const,
      }))
      setProcessingStatus(initialStatus)

      const base = import.meta.env.VITE_APIURL
      if (!base) {
        throw new Error("VITE_APIURL is not set")
      }

      const response = await authFetch(`${base}/api/procedures/${engagement._id}/generate`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          materiality: stepData.materiality,
          selectedClassifications: stepData.selectedClassifications,
          validitySelections: stepData.validitySelections,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate procedures")
      }

      const result = await response.json()
      setQuestions(result.procedure.questions || [])
      setProcessingStatus(result.processingResults || [])

      toast({
        title: "Procedures Generated",
        description: `Successfully generated ${result.procedure.questions?.length || 0} procedures.`,
      })
    } catch (error: any) {
      console.error("Error generating AI procedures:", error)
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate procedures.",
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
      description: "The procedure question has been removed.",
    })
  }

  const handleAddQuestion = (classification: string) => {
    const newQuestion = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      question: "New custom procedure question",
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
    // Validate required questions
    const requiredQuestions = questions.filter((q) => q.isRequired)
    const unansweredRequired = requiredQuestions.filter((q) => !q.answer?.trim())

    if (unansweredRequired.length > 0) {
      toast({
        title: "Required Questions Unanswered",
        description: `Please answer all ${unansweredRequired.length} required questions before proceeding.`,
        variant: "destructive",
      })
      return
    }

    onComplete({ questions })
  }

  const getQuestionsByClassification = () => {
    const grouped: { [key: string]: any[] } = {}
    questions.forEach((question) => {
      const classification = question.classification || "General"
      if (!grouped[classification]) {
        grouped[classification] = []
      }
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

  if (loading && mode !== "manual") {
    return (
      <div className="space-y-6">
        <Card>
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
              ))}
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
          <CardTitle className="font-heading text-xl text-foreground">
            {mode === "manual" ? "Manual Procedures" : "AI-Generated Procedures"}
          </CardTitle>
          <p className="text-muted-foreground font-body">
            {mode === "manual"
              ? "Review and answer the predefined audit procedures for each classification."
              : "Review the AI-generated procedures and customize them as needed."}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Total Questions</p>
                <p className="text-xl font-body-semibold text-foreground">{questions.length}</p>
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
        </CardContent>
      </Card>

      {/* Questions by Classification */}
      <div className="space-y-6">
        {Object.entries(groupedQuestions).map(([classification, classificationQuestions]) => (
          <Card key={classification}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-body-semibold">
                    {formatClassificationForDisplay(classification)}
                  </Badge>
                  <span className="text-sm text-muted-foreground font-body">
                    {classificationQuestions.length} questions
                  </span>
                </div>
                {(mode === "ai" || mode === "hybrid") && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddQuestion(classification)}
                    className="flex items-center gap-2 bg-transparent"
                  >
                    <Plus className="h-4 w-4" />
                    Add Question
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  {classificationQuestions.map((question, index) => (
                    <div key={question.id} className="space-y-3 p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs font-body-semibold text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            {editingQuestion === question.id ? (
                              <div className="space-y-3">
                                <Textarea
                                  value={editedText}
                                  onChange={(e) => setEditedText(e.target.value)}
                                  placeholder="Enter question..."
                                  className="font-body"
                                />
                                <Textarea
                                  value={editedAnswer}
                                  onChange={(e) => setEditedAnswer(e.target.value)}
                                  placeholder="Enter answer..."
                                  className="font-body"
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
                                  <p className="font-body-semibold text-foreground flex-1">{question.question}</p>
                                  {question.isRequired && (
                                    <Badge variant="secondary" className="text-xs">
                                      Required
                                    </Badge>
                                  )}
                                </div>
                                <Textarea
                                  value={question.answer || ""}
                                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                  placeholder="Enter your answer..."
                                  className="font-body"
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
        ))}
      </div>

      {requiredCount > answeredRequired && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-body">
            You have {requiredCount - answeredRequired} required questions that need answers before you can proceed.
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
