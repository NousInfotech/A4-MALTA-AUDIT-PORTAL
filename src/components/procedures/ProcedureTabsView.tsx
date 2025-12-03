// @ts-nocheck
import React, { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { 
  Plus, 
  RefreshCw, 
  Save, 
  Loader2, 
  Edit2, 
  Trash2, 
  X,
  FileText
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import NotebookInterface from "./NotebookInterface"

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

function normalize(items?: any[]) {
  if (!Array.isArray(items)) return []
  return items.map((q, i) => {
    const __uid = q.__uid || q.id || q._id || `q_${Math.random().toString(36).slice(2, 10)}_${i}`
    const id = q.id ?? __uid
    const key = q.key || q.aiKey || `q${i + 1}`
    return { ...q, __uid, id, key }
  })
}

function mergeAiAnswers(questions: any[], aiAnswers: any[]) {
  const map = new Map<string, string>()
  ;(aiAnswers || []).forEach((a) => {
    const k = String(a?.key || "").trim().toLowerCase()
    if (k) map.set(k, a?.answer || "")
  })
  return questions.map((q, i) => {
    const k = String(q.key || `q${i + 1}`).trim().toLowerCase()
    const answer = map.has(k) ? map.get(k) || "" : q.answer || ""
    return { ...q, answer }
  })
}

function formatClassificationForDisplay(classification?: string) {
  if (!classification) return "General"
  const parts = classification.split(" > ")
  const top = parts[0]
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
  return top
}

interface ProcedureTabsViewProps {
  engagement: any
  stepData: any
  mode: "manual" | "ai" | "hybrid"
  onComplete: (data: any) => void
  onBack: () => void
  updateProcedureParams?: (updates: Record<string, string | null>, replace?: boolean) => void
}

export const ProcedureTabsView: React.FC<ProcedureTabsViewProps> = ({
  engagement,
  stepData,
  mode,
  onComplete,
  onBack,
  updateProcedureParams,
}) => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"questions" | "answers" | "procedures">("questions")
  const [questionFilter, setQuestionFilter] = useState<"all" | "unanswered">("all")
  
  // Questions state
  const [questions, setQuestions] = useState<any[]>(normalize(stepData.questions || []))
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editQuestionText, setEditQuestionText] = useState("")
  const [editAnswerText, setEditAnswerText] = useState("")
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  
  // Answers state
  const [generatingAnswers, setGeneratingAnswers] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null)
  const [editAnswerValue, setEditAnswerValue] = useState("")
  
  // Procedures state
  const [recommendations, setRecommendations] = useState<any[]>(
    Array.isArray(stepData.recommendations) ? stepData.recommendations : []
  )
  const [generatingProcedures, setGeneratingProcedures] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    if (questionFilter === "unanswered") {
      return questions.filter((q: any) => !q.answer || q.answer.trim() === "")
    }
    return questions
  }, [questions, questionFilter])

  // Questions with answers
  const questionsWithAnswers = useMemo(() => {
    return questions.filter((q: any) => q.answer && q.answer.trim() !== "")
  }, [questions])

  // Unanswered questions
  const unansweredQuestions = useMemo(() => {
    return questions.filter((q: any) => !q.answer || q.answer.trim() === "")
  }, [questions])

  // Handle add question
  const handleAddQuestion = () => {
    const newQuestion = {
      __uid: `new-${Date.now()}`,
      id: `new-${Date.now()}`,
      key: `q${questions.length + 1}`,
      question: "New question",
      answer: "",
      classification: stepData.selectedClassifications?.[0] || "General",
    }
    setQuestions([...questions, newQuestion])
    setEditingQuestionId(newQuestion.__uid)
    setEditQuestionText(newQuestion.question)
    setEditAnswerText("")
  }

  // Handle edit question
  const handleEditQuestion = (question: any) => {
    setEditingQuestionId(question.__uid)
    setEditQuestionText(question.question || "")
    setEditAnswerText(question.answer || "")
  }

  // Handle save question
  const handleSaveQuestion = () => {
    if (!editingQuestionId) return
    setQuestions(prev =>
      prev.map(q =>
        q.__uid === editingQuestionId
          ? { ...q, question: editQuestionText, answer: editAnswerText }
          : q
      )
    )
    setEditingQuestionId(null)
    setEditQuestionText("")
    setEditAnswerText("")
  }

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingQuestionId(null)
    setEditQuestionText("")
    setEditAnswerText("")
  }

  // Handle delete question
  const handleDeleteQuestion = (questionUid: string) => {
    setQuestions(prev => prev.filter(q => q.__uid !== questionUid))
    toast({ title: "Question deleted", description: "The question has been removed." })
  }

  // Generate/Regenerate questions
  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const selected = Array.isArray(stepData?.selectedClassifications)
        ? stepData.selectedClassifications
        : []

      const res = await authFetch(`${base}/api/procedures/${engagement._id}/generate`, {
        method: "POST",
        body: JSON.stringify({
          mode,
          materiality: stepData?.materiality,
          selectedClassifications: selected,
          validitySelections: stepData?.validitySelections,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate questions")

      const result = await res.json()
      const generatedQuestions = result?.procedure?.questions || result?.questions || []
      const normalizedQuestions = normalize(generatedQuestions)
      
      setQuestions(normalizedQuestions)
      
      // Update recommendations if provided
      if (result?.procedure?.recommendations || result?.recommendations) {
        const recs = result.procedure?.recommendations || result.recommendations
        setRecommendations(Array.isArray(recs) ? recs : [])
      }

      toast({
        title: "Questions Generated",
        description: `Generated ${normalizedQuestions.length} questions.`,
      })
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate questions.",
        variant: "destructive",
      })
    } finally {
      setGeneratingQuestions(false)
    }
  }

  // Generate answers
  const handleGenerateAnswers = async () => {
    setGeneratingAnswers(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const questionsWithoutAnswers = questions
        .filter((q: any) => !q.answer || q.answer.trim() === "")
        .map(({ answer, __uid, ...rest }) => rest)

      if (questionsWithoutAnswers.length === 0) {
        toast({ title: "Info", description: "All questions already have answers." })
        return
      }

      const res = await authFetch(`${base}/api/procedures/ai/classification-answers`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement._id,
          questions: questionsWithoutAnswers,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate answers")

      const data = await res.json()
      let updatedQuestions = questions

      if (Array.isArray(data?.aiAnswers)) {
        updatedQuestions = mergeAiAnswers(questions, data.aiAnswers)
      } else if (Array.isArray(data?.questions)) {
        updatedQuestions = normalize(data.questions)
      }

      setQuestions(updatedQuestions)

      // Update recommendations if provided
      if (data.recommendations) {
        const recs = Array.isArray(data.recommendations) 
          ? data.recommendations 
          : typeof data.recommendations === "string"
          ? data.recommendations.split("\n").filter((l: string) => l.trim()).map((text: string, idx: number) => ({
              id: `rec-${Date.now()}-${idx}`,
              text: text.trim(),
              checked: false,
            }))
          : []
        setRecommendations(recs)
      }

      toast({
        title: "Answers Generated",
        description: "Answers have been generated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate answers.",
        variant: "destructive",
      })
    } finally {
      setGeneratingAnswers(false)
    }
  }

  // Save answers
  const handleSaveAnswers = async () => {
    setIsSaving(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const payload = {
        ...stepData,
        questions: questions.map(({ __uid, ...rest }) => rest),
        recommendations: recommendations,
        status: "draft",
        procedureType: "procedures",
        mode: mode,
      }

      await authFetch(`${base}/api/procedures/${engagement._id}`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      toast({
        title: "Answers Saved",
        description: "Your answers have been saved successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Could not save answers.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Generate procedures
  const handleGenerateProcedures = async () => {
    setGeneratingProcedures(true)
    try {
      // First ensure we have answers
      if (unansweredQuestions.length > 0) {
        await handleGenerateAnswers()
      }

      // Generate recommendations if not already present
      if (recommendations.length === 0 && questionsWithAnswers.length > 0) {
        try {
          const base = import.meta.env.VITE_APIURL
          const res = await authFetch(`${base}/api/procedures/recommendations`, {
            method: "POST",
            body: JSON.stringify({
              engagementId: engagement._id,
              procedureId: stepData._id,
              framework: stepData.framework || "IFRS",
              classifications: stepData.selectedClassifications || [],
              questions: questionsWithAnswers.map(({ __uid, ...rest }) => rest),
            }),
          })

          if (res.ok) {
            const data = await res.json()
            const recs = Array.isArray(data.recommendations)
              ? data.recommendations
              : typeof data.recommendations === "string"
              ? data.recommendations.split("\n").filter((l: string) => l.trim()).map((text: string, idx: number) => ({
                  id: `rec-${Date.now()}-${idx}`,
                  text: text.trim(),
                  checked: false,
                }))
              : []
            setRecommendations(recs)
          }
        } catch (error: any) {
          console.error("Failed to generate recommendations:", error)
          // Continue without recommendations - user can add them manually
        }
      }

      // Save everything as completed
      const base = import.meta.env.VITE_APIURL
      const payload = {
        ...stepData,
        questions: questions.map(({ __uid, ...rest }) => rest),
        recommendations: recommendations,
        status: "completed",
        procedureType: "procedures",
        mode: mode,
      }

      const saved = await authFetch(`${base}/api/procedures/${engagement._id}`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (saved.ok) {
        const savedData = await saved.json()
        toast({
          title: "Procedures Generated",
          description: "Your audit procedures have been generated and saved.",
        })
        onComplete({
          ...payload,
          _id: savedData._id || savedData.procedure?._id,
        })
      }
    } catch (error: any) {
      toast({
        title: "Generation failed",
        description: error.message || "Could not generate procedures.",
        variant: "destructive",
      })
    } finally {
      setGeneratingProcedures(false)
    }
  }

  // Handle save recommendations
  const handleSaveRecommendations = async (content: any) => {
    const recs = Array.isArray(content) ? content : []
    setRecommendations(recs)
    toast({
      title: "Recommendations Saved",
      description: "Your recommendations have been updated.",
    })
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="answers">Answers</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={questionFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuestionFilter("all")}
              >
                All Questions
              </Button>
              <Button
                variant={questionFilter === "unanswered" ? "default" : "outline"}
                size="sm"
                onClick={() => setQuestionFilter("unanswered")}
              >
                Unanswered Questions
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateQuestions}
                disabled={generatingQuestions}
              >
                {generatingQuestions ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {questions.length > 0 ? "Regenerate Questions" : "Generate Questions"}
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {questionFilter === "unanswered"
                    ? "All questions have been answered."
                    : "No questions available. Click 'Generate Questions' or 'Add Question' to create one."}
                </div>
              ) : (
                filteredQuestions.map((q: any, idx: number) => (
                  <Card key={q.__uid || idx}>
                    <CardContent className="pt-6">
                      {editingQuestionId === q.__uid ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="font-medium">{idx + 1}.</div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleSaveQuestion}>
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                          <Input
                            value={editQuestionText}
                            onChange={(e) => setEditQuestionText(e.target.value)}
                            placeholder="Question"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start">
                            <div className="font-medium mb-1">
                              {idx + 1}. {q.question || "—"}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditQuestion(q)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteQuestion(q.__uid)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {q.framework && (
                            <Badge className="mr-2" variant="default">{q.framework}</Badge>
                          )}
                          {q.reference && (
                            <Badge variant="default">{q.reference}</Badge>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Answers Tab */}
        <TabsContent value="answers" className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {questionsWithAnswers.length} answered • {unansweredQuestions.length} unanswered
            </div>
            <div className="flex items-center gap-2">
              {unansweredQuestions.length > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleGenerateAnswers}
                  disabled={generatingAnswers}
                >
                  {generatingAnswers ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Answers
                </Button>
              )}
              {questionsWithAnswers.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAnswers}
                  disabled={generatingAnswers}
                >
                  {generatingAnswers ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate Answers
                </Button>
              )}
              {(questionsWithAnswers.length > 0 || unansweredQuestions.length > 0) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveAnswers}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Answers
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {questions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No questions available. Go to Questions tab to add questions.
                </div>
              ) : (
                <>
                  {/* Answered Questions */}
                  {questionsWithAnswers.map((q: any, idx: number) => (
                    <Card key={q.__uid || idx}>
                      <CardContent className="pt-6">
                        <div className="font-medium mb-2">
                          {idx + 1}. {q.question || "—"}
                        </div>
                        {editingAnswerId === q.__uid ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editAnswerValue}
                              onChange={(e) => setEditAnswerValue(e.target.value)}
                              placeholder="Answer"
                              className="min-h-[100px]"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setQuestions(prev =>
                                    prev.map(question =>
                                      question.__uid === q.__uid
                                        ? { ...question, answer: editAnswerValue }
                                        : question
                                    )
                                  )
                                  setEditingAnswerId(null)
                                  setEditAnswerValue("")
                                }}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingAnswerId(null)
                                  setEditAnswerValue("")
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-muted-foreground mb-3">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {String(q.answer || "No answer.")}
                              </ReactMarkdown>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingAnswerId(q.__uid)
                                  setEditAnswerValue(q.answer || "")
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit Answer
                              </Button>
                              {q.framework && (
                                <Badge variant="default">{q.framework}</Badge>
                              )}
                              {q.reference && (
                                <Badge variant="default">{q.reference}</Badge>
                              )}
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {/* Unanswered Questions */}
                  {unansweredQuestions.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-lg font-semibold mb-4">Unanswered Questions</h4>
                      {unansweredQuestions.map((q: any, idx: number) => (
                        <Card key={q.__uid || idx} className="mb-4">
                          <CardContent className="pt-6">
                            <div className="font-medium mb-2">
                              {questionsWithAnswers.length + idx + 1}. {q.question || "—"}
                            </div>
                            <div className="text-sm text-muted-foreground italic mb-3">
                              No answer.
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                // Generate answer for this specific question
                                try {
                                  const base = import.meta.env.VITE_APIURL
                                  const res = await authFetch(
                                    `${base}/api/procedures/ai/classification-answers/separate`,
                                    {
                                      method: "POST",
                                      body: JSON.stringify({
                                        engagementId: engagement._id,
                                        questions: [{ ...q, answer: undefined }],
                                        classification: q.classification || "General",
                                      }),
                                    }
                                  )
                                  
                                  if (res.ok) {
                                    const data = await res.json()
                                    const aiAnswer = Array.isArray(data?.aiAnswers)
                                      ? data.aiAnswers.find((a: any) => a.key === q.key)?.answer
                                      : null
                                    
                                    setQuestions(prev =>
                                      prev.map(question =>
                                        question.__uid === q.__uid
                                          ? { ...question, answer: aiAnswer || "" }
                                          : question
                                      )
                                    )
                                    toast({
                                      title: "Answer Generated",
                                      description: "Answer has been generated for this question.",
                                    })
                                  }
                                } catch (error: any) {
                                  toast({
                                    title: "Generation failed",
                                    description: error.message || "Could not generate answer.",
                                    variant: "destructive",
                                  })
                                }
                              }}
                              disabled={generatingAnswers}
                            >
                              {generatingAnswers ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Plus className="h-4 w-4 mr-2" />
                              )}
                              Add Answer
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Procedures Tab */}
        <TabsContent value="procedures" className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Audit Procedures & Recommendations</h4>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateProcedures}
                disabled={generatingProcedures}
              >
                {generatingProcedures ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {questionsWithAnswers.length > 0 ? "Regenerate Procedures" : "Generate Procedures"}
              </Button>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-6 overflow-auto">
            {/* Audit Procedures Section */}
            {questions.length > 0 && (
              <div className="space-y-4">
                <h5 className="text-md font-semibold">Audit Procedures</h5>
                <Card>
                  <CardContent className="pt-6">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {questions.map((q: any, idx: number) => (
                          <div key={q.__uid || idx} className="border-b pb-4 last:border-b-0">
                            <div className="font-medium mb-2">
                              {idx + 1}. {q.question || "—"}
                            </div>
                            {q.answer ? (
                              <div className="text-sm text-muted-foreground mb-2">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {String(q.answer)}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic mb-2">
                                No answer.
                              </div>
                            )}
                            <div className="flex gap-2">
                              {q.framework && (
                                <Badge variant="default">{q.framework}</Badge>
                              )}
                              {q.reference && (
                                <Badge variant="default">{q.reference}</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Audit Recommendations Section */}
            <div className="space-y-4">
              <h5 className="text-md font-semibold">Audit Recommendations</h5>
              <div className="flex-1 relative min-h-[400px]">
                <NotebookInterface
                  isOpen={true}
                  isEditable={true}
                  isPlanning={false}
                  onClose={() => {}}
                  recommendations={recommendations}
                  onSave={handleSaveRecommendations}
                  dismissible={false}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

