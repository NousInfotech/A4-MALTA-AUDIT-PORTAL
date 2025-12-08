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

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const token = data?.session?.access_token
  
  // Don't set Content-Type for FormData - let browser set it with boundary
  const isFormData = options.body instanceof FormData
  const existingHeaders = (options.headers || {}) as Record<string, string>
  
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...existingHeaders,
  }
  
  // Only set Content-Type if not FormData and not already explicitly set
  if (!isFormData && !existingHeaders["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  } else if (isFormData) {
    // Remove Content-Type for FormData to let browser set it with boundary
    delete headers["Content-Type"]
  }
  
  return fetch(url, {
    ...options,
    headers,
  })
}

// Convert procedures/fields structure to questions-like structure
function proceduresToQuestions(procedures: any[]): any[] {
  const questions: any[] = []
  procedures.forEach((proc) => {
    (proc.fields || []).forEach((field: any) => {
      questions.push({
        __uid: field.__uid || field.key || `q_${Math.random().toString(36).slice(2, 10)}`,
        id: field.key || field.__uid,
        key: field.key,
        question: field.label || field.question || "",
        answer: field.answer || "",
        sectionId: proc.sectionId,
        sectionTitle: proc.title,
        type: field.type,
        required: field.required,
        help: field.help,
      })
    })
  })
  return questions
}

// Convert questions back to procedures/fields structure
function questionsToProcedures(questions: any[], originalProcedures: any[]): any[] {
  const sectionMap = new Map<string, any>()
  
  // Initialize sections from original procedures
  originalProcedures.forEach((proc) => {
    sectionMap.set(proc.sectionId, {
      ...proc,
      fields: [],
    })
  })
  
  // Group questions by section
  questions.forEach((q) => {
    const sectionId = q.sectionId
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, {
        sectionId,
        title: q.sectionTitle || sectionId,
        fields: [],
      })
    }
    const section = sectionMap.get(sectionId)
    section.fields.push({
      __uid: q.__uid,
      key: q.key,
      label: q.question,
      answer: q.answer,
      type: q.type || "text",
      required: q.required,
      help: q.help,
    })
  })
  
  return Array.from(sectionMap.values())
}

const COMPLETION_SECTIONS = [
  { sectionId: "initial_completion", title: "P1: Initial Completion" },
  { sectionId: "audit_highlights_report", title: "P2: Audit Highlights Report" },
  { sectionId: "final_analytical_review", title: "P3: Final Analytical Review" },
  { sectionId: "points_forward_next_year", title: "P4: Points Forward for Next Year" },
  { sectionId: "final_client_meeting_notes", title: "P5: Notes of Final Client Meeting" },
  { sectionId: "summary_unadjusted_errors", title: "P6: Summary of Unadjusted Errors" },
  { sectionId: "reappointment_schedule", title: "P7: Reappointment Schedule" },
]

interface CompletionProcedureTabsViewProps {
  engagement: any
  stepData: any
  mode: "manual" | "ai" | "hybrid"
  onComplete: (data: any) => void
  onBack: () => void
  updateProcedureParams?: (updates: Record<string, string | null>, replace?: boolean) => void
}

export const CompletionProcedureTabsView: React.FC<CompletionProcedureTabsViewProps> = ({
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
  
  // Initialize procedures from stepData
  const [procedures, setProcedures] = useState<any[]>(() => {
    if (stepData.procedures && stepData.procedures.length > 0) {
      return stepData.procedures
    }
    // Create empty sections
    return COMPLETION_SECTIONS.map(section => ({
      id: section.sectionId,
      sectionId: section.sectionId,
      title: section.title,
      fields: []
    }))
  })
  
  // Convert to questions for easier manipulation
  const [questions, setQuestions] = useState<any[]>(() => proceduresToQuestions(procedures))
  
  // Questions state
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
  const [editingRecommendationId, setEditingRecommendationId] = useState<string | null>(null)
  const [editRecommendationText, setEditRecommendationText] = useState("")

  // Update questions when procedures change
  React.useEffect(() => {
    setQuestions(proceduresToQuestions(procedures))
  }, [procedures])

  // Helper function to safely check if answer is non-empty
  const hasAnswer = (answer: any): boolean => {
    if (!answer) return false
    if (typeof answer === 'string') return answer.trim() !== ""
    if (typeof answer === 'number') return true
    return false
  }

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    let filtered = questions
    if (questionFilter === "unanswered") {
      filtered = filtered.filter((q: any) => !hasAnswer(q.answer))
    }
    return filtered
  }, [questions, questionFilter])

  // Questions with answers
  const questionsWithAnswers = useMemo(() => {
    return questions.filter((q: any) => hasAnswer(q.answer))
  }, [questions])

  // Unanswered questions
  const unansweredQuestions = useMemo(() => {
    return questions.filter((q: any) => !hasAnswer(q.answer))
  }, [questions])

  // Handle add question
  const handleAddQuestion = () => {
    const firstSection = procedures[0]?.sectionId || COMPLETION_SECTIONS[0].sectionId
    const newQuestion = {
      __uid: `new-${Date.now()}`,
      id: `new-${Date.now()}`,
      key: `q${questions.length + 1}`,
      question: "New question",
      answer: "",
      sectionId: firstSection,
      sectionTitle: procedures.find(p => p.sectionId === firstSection)?.title || COMPLETION_SECTIONS[0].title,
      type: "text",
    }
    const updatedQuestions = [...questions, newQuestion]
    setQuestions(updatedQuestions)
    setProcedures(questionsToProcedures(updatedQuestions, procedures))
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
    const updatedQuestions = questions.map(q =>
      q.__uid === editingQuestionId
        ? { ...q, question: editQuestionText, answer: editAnswerText }
        : q
    )
    setQuestions(updatedQuestions)
    setProcedures(questionsToProcedures(updatedQuestions, procedures))
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
    const updatedQuestions = questions.filter(q => q.__uid !== questionUid)
    setQuestions(updatedQuestions)
    setProcedures(questionsToProcedures(updatedQuestions, procedures))
    toast({ title: "Question deleted", description: "The question has been removed." })
  }

  // Generate/Regenerate questions for a section
  const handleGenerateQuestions = async (sectionId?: string) => {
    setGeneratingQuestions(true)
    try {
      const base = import.meta.env.VITE_APIURL
      
      if (sectionId) {
        // Generate for specific section
        const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}/generate/section-questions`, {
          method: "POST",
          body: JSON.stringify({ sectionId }),
        })
        
        if (!res.ok) throw new Error("Failed to generate questions")
        const data = await res.json()
        
        setProcedures(prev => prev.map(section =>
          section.sectionId === sectionId ? { ...section, fields: data.fields } : section
        ))
        
        toast({ title: "Questions Generated", description: `Questions for section generated successfully.` })
      } else {
        // Generate for all sections
        for (const section of COMPLETION_SECTIONS) {
          const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}/generate/section-questions`, {
            method: "POST",
            body: JSON.stringify({ sectionId: section.sectionId }),
          })
          
          if (res.ok) {
            const data = await res.json()
            setProcedures(prev => prev.map(sec =>
              sec.sectionId === section.sectionId ? { ...sec, fields: data.fields } : sec
            ))
          }
        }
        
        toast({ title: "Questions Generated", description: "Questions for all sections generated successfully." })
      }
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
      
      // Generate answers for all sections that have questions without answers
      const sectionsToProcess = procedures.filter(proc => 
        proc.fields && proc.fields.some((f: any) => {
          const answer = f.answer
          if (!answer) return true
          if (typeof answer === 'string') return answer.trim() === ""
          return false
        })
      )
      
      for (const section of sectionsToProcess) {
        const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}/generate/section-answers`, {
          method: "POST",
          body: JSON.stringify({ sectionId: section.sectionId }),
        })
        
        if (res.ok) {
          const data = await res.json()
          const answers: Record<string, any> = {}
          
          if (data.fields && Array.isArray(data.fields)) {
            data.fields.forEach((fieldItem: any) => {
              const fieldData = fieldItem._doc || fieldItem
              const key = fieldData.key
              if (key) {
                answers[key] = fieldItem.answer !== undefined ? fieldItem.answer :
                  fieldData.answer !== undefined ? fieldData.answer :
                  fieldData.content !== undefined ? fieldData.content : null
              }
            })
          }
          
          setProcedures(prev => prev.map(sec =>
            sec.sectionId === section.sectionId
              ? {
                  ...sec,
                  fields: (sec.fields || []).map((f: any) => ({
                    ...f,
                    answer: answers[f.key] !== undefined ? answers[f.key] : f.answer
                  }))
                }
              : sec
          ))
        }
      }
      
      toast({ title: "Answers Generated", description: "Answers have been generated successfully." })
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
      if (!base) throw new Error("VITE_APIURL is not set")
      
      const formData = new FormData()
      
      const payload = {
        ...stepData,
        procedures: procedures.map(sec => ({
          ...sec,
          fields: (sec.fields || []).map(({ __uid, ...rest }) => rest)
        })),
        recommendations: recommendations,
        status: "in-progress",
        procedureType: "completion",
        mode: mode,
      }
      
      formData.append("data", JSON.stringify(payload))
      
      // Collect all files & a single fileMap array (if any files exist)
      const fileMap: Array<{ sectionId: string; fieldKey: string; originalName: string }> = []
      procedures.forEach((proc) => {
        (proc.fields || []).forEach((field: any) => {
          if (field.type === "file" && field.answer instanceof File) {
            formData.append("files", field.answer, field.answer.name)
            fileMap.push({ 
              sectionId: proc.sectionId, 
              fieldKey: field.key, 
              originalName: field.answer.name 
            })
          }
        })
      })
      if (fileMap.length) formData.append("fileMap", JSON.stringify(fileMap))
      
      const response = await authFetch(`${base}/api/completion-procedures/${engagement._id}/save`, {
        method: "POST",
        body: formData,
        headers: {}, // let browser set multipart boundary
      })
      
      if (!response.ok) {
        const text = await response.text().catch(() => "")
        const errorMessage = text || `Failed to save answers (HTTP ${response.status})`
        throw new Error(errorMessage)
      }
      
      toast({ title: "Answers Saved", description: "Your answers have been saved successfully." })
    } catch (error: any) {
      console.error("Save answers error:", error)
      toast({
        title: "Save failed",
        description: error.message || "Could not save answers.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Generate procedures/recommendations
  const handleGenerateProcedures = async () => {
    setGeneratingProcedures(true)
    // Ensure we stay on the procedures tab
    setActiveTab("procedures")
    try {
      const base = import.meta.env.VITE_APIURL
      
      // Generate recommendations - use correct endpoint format
      const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}/generate/recommendations`, {
        method: "POST",
        body: JSON.stringify({
          procedures: procedures.map(sec => ({
            ...sec,
            fields: (sec.fields || []).map(({ __uid, ...rest }) => rest)
          })),
          materiality: stepData.materiality || 0,
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        // Handle both checklist format and legacy string format
        let recs = []
        if (data.recommendations && Array.isArray(data.recommendations)) {
          recs = data.recommendations
        } else if (data.recommendations && typeof data.recommendations === 'string') {
          recs = data.recommendations.split("\n").filter((l: string) => l.trim()).map((text: string, idx: number) => ({
            id: `rec-${Date.now()}-${idx}`,
            text: text.trim(),
            checked: false,
          }))
        }
        setRecommendations(recs)
        toast({ title: "Procedures Generated", description: "Recommendations have been generated successfully." })
      } else {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to generate recommendations")
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

  // Handle edit recommendation
  const handleEditRecommendation = (rec: any, idx: number) => {
    const recId = rec.id || rec.__uid || `rec-${idx}`
    setEditingRecommendationId(recId)
    const recText = typeof rec === 'string' ? rec : rec.text || rec.content || ""
    setEditRecommendationText(recText)
  }

  // Handle save recommendation
  const handleSaveRecommendation = () => {
    if (!editingRecommendationId) return
    setRecommendations(prev =>
      prev.map((rec, idx) => {
        const recId = rec.id || rec.__uid || `rec-${idx}`
        if (recId === editingRecommendationId) {
          if (typeof rec === 'string') {
            return editRecommendationText
          }
          return { ...rec, text: editRecommendationText }
        }
        return rec
      })
    )
    setEditingRecommendationId(null)
    setEditRecommendationText("")
    toast({
      title: "Recommendation Updated",
      description: "Your recommendation has been updated.",
    })
  }

  // Handle cancel edit
  const handleCancelEditRecommendation = () => {
    setEditingRecommendationId(null)
    setEditRecommendationText("")
  }

  // Handle delete recommendation
  const handleDeleteRecommendation = (rec: any, idx: number) => {
    const recId = rec.id || rec.__uid || `rec-${idx}`
    setRecommendations(prev => prev.filter((r, i) => {
      const rId = r.id || r.__uid || `rec-${i}`
      return rId !== recId
    }))
    toast({ title: "Recommendation deleted", description: "The recommendation has been removed." })
  }

  // Handle add recommendation
  const handleAddRecommendation = () => {
    const newRec = {
      id: `rec-${Date.now()}`,
      text: "New recommendation",
      checked: false,
    }
    setRecommendations([...recommendations, newRec])
    setEditingRecommendationId(newRec.id)
    setEditRecommendationText(newRec.text)
  }

  // Save all and complete
  const handleComplete = async () => {
    setIsSaving(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const formData = new FormData()
      
      const payload = {
        ...stepData,
        procedures: procedures.map(sec => ({
          ...sec,
          fields: (sec.fields || []).map(({ __uid, ...rest }) => rest)
        })),
        recommendations: recommendations,
        status: "completed",
        procedureType: "completion",
        mode: mode,
      }
      
      formData.append("data", JSON.stringify(payload))
      
      const response = await authFetch(`${base}/api/completion-procedures/${engagement._id}/save`, {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) throw new Error("Failed to save procedures")
      
      const savedProcedure = await response.json()
      
      toast({ title: "Procedures Saved", description: "Your completion procedures have been saved successfully." })
      
      onComplete({ ...payload, _id: savedProcedure._id })
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Could not save procedures.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Group questions by section for display
  const questionsBySection = useMemo(() => {
    const grouped: Record<string, any[]> = {}
    questions.forEach((q) => {
      const sectionId = q.sectionId || "general"
      if (!grouped[sectionId]) grouped[sectionId] = []
      grouped[sectionId].push(q)
    })
    return grouped
  }, [questions])

  const hasQuestions = questions.length > 0
  const hasAnswers = questionsWithAnswers.length > 0
  const hasProcedures = recommendations.length > 0

  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl">Completion Procedures</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleComplete} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save & Complete
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="answers">Answers</TabsTrigger>
          <TabsTrigger value="procedures">Procedures</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
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
            <div className="flex gap-2">
              {hasQuestions ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateQuestions()}
                  disabled={generatingQuestions}
                >
                  {generatingQuestions ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate Questions
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleGenerateQuestions()}
                  disabled={generatingQuestions}
                >
                  {generatingQuestions ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FileText className="h-4 w-4 mr-2" />
                  )}
                  Generate Questions
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleAddQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {hasQuestions ? "No questions match the filter." : "No questions available. Generate or add questions to get started."}
                </div>
              ) : (
                Object.entries(questionsBySection).map(([sectionId, sectionQuestions]) => {
                  const section = procedures.find(p => p.sectionId === sectionId)
                  const sectionTitle = section?.title || sectionId
                  const filteredSectionQuestions = sectionQuestions.filter(q => {
                    if (questionFilter === "all") return true
                    return !hasAnswer(q.answer)
                  })
                  
                  if (filteredSectionQuestions.length === 0) return null
                  
                  return (
                    <div key={sectionId} className="space-y-2">
                      <h4 className="font-semibold text-lg">{sectionTitle}</h4>
                      {filteredSectionQuestions.map((q: any, idx: number) => (
                        <Card key={q.__uid || idx}>
                          <CardContent className="pt-6">
                            {editingQuestionId === q.__uid ? (
                              <div className="space-y-3">
                                <Input
                                  value={editQuestionText}
                                  onChange={(e) => setEditQuestionText(e.target.value)}
                                  placeholder="Question"
                                />
                                <Textarea
                                  value={editAnswerText}
                                  onChange={(e) => setEditAnswerText(e.target.value)}
                                  placeholder="Answer (optional)"
                                />
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
                            ) : (
                              <>
                                <div className="flex justify-between items-start">
                                  <div className="font-medium mb-1">
                                    {idx + 1}. {q.question || "—"}
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(q)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(q.__uid)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Answers Tab */}
        <TabsContent value="answers" className="flex-1 flex flex-col mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {!hasQuestions ? (
                <div className="text-muted-foreground">No questions added yet.</div>
              ) : hasAnswers ? (
                <>
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
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Regenerate Answers
                    </Button>
                  )}
                </>
              ) : (
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
            </div>
            {(hasAnswers || unansweredQuestions.length > 0) && (
              <Button variant="default" size="sm" onClick={handleSaveAnswers} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Answers
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {!hasQuestions ? (
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
                                  const updatedQuestions = questions.map(question =>
                                    question.__uid === q.__uid
                                      ? { ...question, answer: editAnswerValue }
                                      : question
                                  )
                                  setQuestions(updatedQuestions)
                                  setProcedures(questionsToProcedures(updatedQuestions, procedures))
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
                                  const section = procedures.find(p => p.sectionId === q.sectionId)
                                  if (!section) return
                                  
                                  const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}/generate/section-answers`, {
                                    method: "POST",
                                    body: JSON.stringify({ sectionId: q.sectionId }),
                                  })
                                  
                                  if (res.ok) {
                                    const data = await res.json()
                                    const answers: Record<string, any> = {}
                                    
                                    if (data.fields && Array.isArray(data.fields)) {
                                      data.fields.forEach((fieldItem: any) => {
                                        const fieldData = fieldItem._doc || fieldItem
                                        const key = fieldData.key
                                        if (key) {
                                          answers[key] = fieldItem.answer !== undefined ? fieldItem.answer :
                                            fieldData.answer !== undefined ? fieldData.answer :
                                            fieldData.content !== undefined ? fieldData.content : null
                                        }
                                      })
                                    }
                                    
                                    const answer = answers[q.key] || ""
                                    const updatedQuestions = questions.map(question =>
                                      question.__uid === q.__uid ? { ...question, answer } : question
                                    )
                                    setQuestions(updatedQuestions)
                                    setProcedures(questionsToProcedures(updatedQuestions, procedures))
                                    toast({ title: "Answer Generated", description: "Answer has been generated for this question." })
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
            <h4 className="text-lg font-semibold">Audit Recommendations</h4>
            <div className="flex items-center gap-2">
              {hasQuestions && hasAnswers ? (
                hasProcedures ? (
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
                    Regenerate Procedures
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleGenerateProcedures}
                    disabled={generatingProcedures}
                  >
                    {generatingProcedures ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Generate Procedures
                  </Button>
                )
              ) : (
                <div className="text-muted-foreground">
                  {!hasQuestions ? "Generate questions first." : "Generate answers first."}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={handleAddRecommendation}>
                <Plus className="h-4 w-4 mr-2" />
                Add Procedures
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleComplete}
                disabled={isSaving || !hasQuestions || !hasAnswers}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save & Complete
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {hasQuestions && hasAnswers
                    ? "No recommendations generated yet. Click 'Generate Procedures' to create recommendations."
                    : "Generate questions and answers first, then generate procedures."}
                </div>
              ) : (
                recommendations.map((rec: any, idx: number) => {
                  const recId = rec.id || rec.__uid || `rec-${idx}`
                  const recText = typeof rec === 'string' 
                    ? rec 
                    : rec.text || rec.content || "—"
                  const isEditing = editingRecommendationId === recId
                  
                  return (
                    <Card key={recId}>
                      <CardContent className="pt-6">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="font-medium">{idx + 1}.</div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveRecommendation}>
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEditRecommendation}>
                                  <X className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                            <Textarea
                              value={editRecommendationText}
                              onChange={(e) => setEditRecommendationText(e.target.value)}
                              placeholder="Recommendation"
                              className="min-h-[100px]"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-start">
                              <div className="font-medium mb-2 text-black">
                                {idx + 1}. {recText}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditRecommendation(rec, idx)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRecommendation(rec, idx)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {rec.checked !== undefined && (
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={rec.checked ? "default" : "secondary"}>
                                  {rec.checked ? "Completed" : "Pending"}
                                </Badge>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

