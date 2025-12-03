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

const PLANNING_SECTIONS = [
  { sectionId: "engagement_setup_acceptance_independence", title: "Engagement Setup, Acceptance & Independence" },
  { sectionId: "understanding_entity_environment", title: "Understanding the Entity & Its Environment" },
  { sectionId: "materiality_risk_summary", title: "Materiality & Risk Summary" },
  { sectionId: "risk_response_planning", title: "Risk Register & Audit Response Planning" },
  { sectionId: "fraud_gc_planning", title: "Fraud Risk & Going Concern Planning" },
  { sectionId: "compliance_laws_regulations", title: "Compliance with Laws & Regulations (ISA 250)" }
]

interface PlanningProcedureTabsViewProps {
  engagement: any
  stepData: any
  mode: "manual" | "ai" | "hybrid"
  onComplete: (data: any) => void
  onBack: () => void
  updateProcedureParams?: (updates: Record<string, string | null>, replace?: boolean) => void
}

export const PlanningProcedureTabsView: React.FC<PlanningProcedureTabsViewProps> = ({
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
    return PLANNING_SECTIONS.map(section => ({
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

  // Update questions when procedures change
  React.useEffect(() => {
    setQuestions(proceduresToQuestions(procedures))
  }, [procedures])

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    let filtered = questions
    if (questionFilter === "unanswered") {
      filtered = filtered.filter((q: any) => !q.answer || q.answer.trim() === "")
    }
    return filtered
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
    const firstSection = procedures[0]?.sectionId || PLANNING_SECTIONS[0].sectionId
    const newQuestion = {
      __uid: `new-${Date.now()}`,
      id: `new-${Date.now()}`,
      key: `q${questions.length + 1}`,
      question: "New question",
      answer: "",
      sectionId: firstSection,
      sectionTitle: procedures.find(p => p.sectionId === firstSection)?.title || PLANNING_SECTIONS[0].title,
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
        const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/section-questions`, {
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
        for (const section of PLANNING_SECTIONS) {
          const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/section-questions`, {
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
        proc.fields && proc.fields.some((f: any) => !f.answer || f.answer.trim() === "")
      )
      
      for (const section of sectionsToProcess) {
        const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/section-answers`, {
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
      const formData = new FormData()
      
      const payload = {
        ...stepData,
        procedures: procedures.map(sec => ({
          ...sec,
          fields: (sec.fields || []).map(({ __uid, ...rest }) => rest)
        })),
        recommendations: recommendations,
        status: "in-progress",
        procedureType: "planning",
        mode: mode,
      }
      
      formData.append("data", JSON.stringify(payload))
      
      const response = await authFetch(`${base}/api/planning-procedures/${engagement._id}/save`, {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) throw new Error("Failed to save answers")
      
      toast({ title: "Answers Saved", description: "Your answers have been saved successfully." })
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

  // Generate procedures/recommendations
  const handleGenerateProcedures = async () => {
    setGeneratingProcedures(true)
    try {
      const base = import.meta.env.VITE_APIURL
      
      // Generate recommendations
      const res = await authFetch(`${base}/api/planning-procedures/recommendations`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement._id,
          procedureId: stepData._id,
          framework: stepData.framework || "IFRS",
          selectedSections: stepData.selectedSections || [],
          procedures: procedures.map(sec => ({
            ...sec,
            fields: (sec.fields || []).map(({ __uid, ...rest }) => rest)
          })),
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
        toast({ title: "Procedures Generated", description: "Procedures and recommendations have been generated." })
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
        procedureType: "planning",
        mode: mode,
      }
      
      formData.append("data", JSON.stringify(payload))
      
      const response = await authFetch(`${base}/api/planning-procedures/${engagement._id}/save`, {
        method: "POST",
        body: formData,
      })
      
      if (!response.ok) throw new Error("Failed to save procedures")
      
      const savedProcedure = await response.json()
      
      toast({ title: "Procedures Saved", description: "Your planning procedures have been saved successfully." })
      
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
        <h3 className="font-heading text-xl">Planning Procedures</h3>
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
                  const filteredSectionQuestions = sectionQuestions.filter(q => 
                    questionFilter === "all" || !q.answer || q.answer.trim() === ""
                  )
                  
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
                                  
                                  const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/section-answers`, {
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
            <Button variant="outline" size="sm" onClick={handleAddQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Procedures
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {/* Audit Procedures */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Audit Procedures</h4>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {questionsWithAnswers.map((q: any, idx: number) => (
                    <Card key={q.__uid || idx}>
                      <CardContent className="pt-6">
                        <div className="font-medium mb-2">
                          {idx + 1}. {q.question || "—"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {String(q.answer || "No answer.")}
                          </ReactMarkdown>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Audit Recommendations */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Audit Recommendations</h4>
              <div className="h-[500px]">
                <NotebookInterface
                  items={recommendations}
                  onItemsChange={setRecommendations}
                  engagement={engagement}
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
