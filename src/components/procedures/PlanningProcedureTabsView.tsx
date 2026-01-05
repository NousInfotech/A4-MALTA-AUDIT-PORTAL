// @ts-nocheck
import React, { useState, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Plus, 
  RefreshCw, 
  Save, 
  Loader2, 
  Edit2, 
  Trash2, 
  X,
  FileText,
  CheckCircle,
  Eye,
  MessageSquare,
  Edit,
  Sparkles,
  Trash2 as TrashIcon
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
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
  const [activeTab, setActiveTab] = useState<"questions" | "answers" | "procedures" | "review">("questions")
  const [proceduresViewMode, setProceduresViewMode] = useState<'procedures' | 'reviews'>('procedures')
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
  const [editingRecommendationId, setEditingRecommendationId] = useState<string | null>(null)
  const [editRecommendationText, setEditRecommendationText] = useState("")
  
  // Review state
  const [reviewStatus, setReviewStatus] = useState<string>(stepData.reviewStatus || "in-progress")
  const [reviewComments, setReviewComments] = useState<string>(stepData.reviewComments || "")
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [isEditingOverallComment, setIsEditingOverallComment] = useState(false)
  const [editOverallCommentValue, setEditOverallCommentValue] = useState<string>("")
  
  // Advanced Review & Sign-off state
  const [reviewerId, setReviewerId] = useState<string>(stepData.reviewerId || "")
  const [reviewedAt, setReviewedAt] = useState<string>(stepData.reviewedAt ? new Date(stepData.reviewedAt).toISOString().split('T')[0] : "")
  const [approvedBy, setApprovedBy] = useState<string>(stepData.approvedBy || "")
  const [approvedAt, setApprovedAt] = useState<string>(stepData.approvedAt ? new Date(stepData.approvedAt).toISOString().split('T')[0] : "")
  const [signedOffBy, setSignedOffBy] = useState<string>(stepData.signedOffBy || "")
  const [signedOffAt, setSignedOffAt] = useState<string>(stepData.signedOffAt ? new Date(stepData.signedOffAt).toISOString().split('T')[0] : "")
  const [signOffComments, setSignOffComments] = useState<string>(stepData.signOffComments || "")
  const [isSignedOff, setIsSignedOff] = useState<boolean>(stepData.isSignedOff || false)
  const [isLocked, setIsLocked] = useState<boolean>(stepData.isLocked || false)
  const [lockedAt, setLockedAt] = useState<string>(stepData.lockedAt ? new Date(stepData.lockedAt).toISOString().split('T')[0] : "")
  const [lockedBy, setLockedBy] = useState<string>(stepData.lockedBy || "")
  const [reopenedAt, setReopenedAt] = useState<string>(stepData.reopenedAt ? new Date(stepData.reopenedAt).toISOString().split('T')[0] : "")
  const [reopenedBy, setReopenedBy] = useState<string>(stepData.reopenedBy || "")
  const [reopenReason, setReopenReason] = useState<string>(stepData.reopenReason || "")
  const [reviewVersion, setReviewVersion] = useState<number>(stepData.reviewVersion || 1)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [editingReview, setEditingReview] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editReviewStatus, setEditReviewStatus] = useState<string>("")
  const [editReviewComments, setEditReviewComments] = useState<string>("")
  const [isUpdatingReview, setIsUpdatingReview] = useState(false)
  const [isDeletingReview, setIsDeletingReview] = useState<string | null>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({})
  
  // Added missing state variables
  const [reviewedItems, setReviewedItems] = useState<Set<string>>(new Set())
  const [itemReviewComments, setItemReviewComments] = useState<Record<string, string>>({})

  // Get current user ID
  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session?.user?.id) {
        setCurrentUserId(data.session.user.id)
      }
    }
    getCurrentUser()
  }, [])

  // Fetch user name from Supabase profiles
  const fetchUserName = async (userId: string): Promise<string> => {
    if (!userId || userNamesMap[userId]) return userNamesMap[userId] || userId
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', userId)
        .single()
      if (!error && data?.name) {
        setUserNamesMap(prev => ({ ...prev, [userId]: data.name }))
        return data.name
      }
    } catch (error) {
      console.error('Error fetching user name:', error)
    }
    return userId
  }

  // Fetch user names for all user IDs in reviews
  const fetchUserNames = async (reviews: any[]) => {
    const userIds = new Set<string>()
    reviews.forEach(review => {
      if (review.reviewedBy) userIds.add(review.reviewedBy)
      if (review.assignedReviewer) userIds.add(review.assignedReviewer)
      if (review.approvedBy) userIds.add(review.approvedBy)
      if (review.signedOffBy) userIds.add(review.signedOffBy)
      if (review.lockedBy) userIds.add(review.lockedBy)
      if (review.reopenedBy) userIds.add(review.reopenedBy)
    })
    
    const namesMap: Record<string, string> = {}
    await Promise.all(
      Array.from(userIds).map(async (userId) => {
        if (!userNamesMap[userId]) {
          const name = await fetchUserName(userId)
          namesMap[userId] = name
        } else {
          namesMap[userId] = userNamesMap[userId]
        }
      })
    )
    setUserNamesMap(prev => ({ ...prev, ...namesMap }))
  }

  // Fetch reviews for engagement (filtered by itemType: "planning-procedure")
  const fetchReviews = async () => {
    if (!engagement?._id) return
    setIsLoadingReviews(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const response = await authFetch(`${base}/api/review/workflows/engagement/${engagement._id}`)
      if (response.ok) {
        const data = await response.json()
        // Filter reviews by itemType: "planning-procedure" for PlanningProcedureTabsView
        const filteredReviews = (data.workflows || []).filter((w: any) => w.itemType === 'planning-procedure')
        setReviews(filteredReviews)
        // Fetch user names for all reviewers
        await fetchUserNames(filteredReviews)
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error)
      toast({
        title: "Error",
        description: "Failed to fetch reviews.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingReviews(false)
    }
  }

  // Fetch reviews when engagement changes or review tab is active
  React.useEffect(() => {
    if (engagement?._id && activeTab === "procedures" && proceduresViewMode === "reviews") {
      fetchReviews()
    }
  }, [engagement?._id, activeTab, proceduresViewMode])

  // Helper to check if the current user owns the review
  const isReviewOwner = (review: any) => {
    return review.reviewedBy === currentUserId || review.assignedReviewer === currentUserId
  }

  // Handle edit review
  const handleEditReview = (review: any) => {
    setEditingReview(review)
    setEditReviewStatus(review.status || "")
    setEditReviewComments(review.reviewComments || "")
    setIsEditDialogOpen(true)
  }

  // Handle update review
  const handleUpdateReview = async () => {
    setIsUpdatingReview(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const payload = {
        status: editReviewStatus,
        reviewComments: editReviewComments,
        reviewerId: currentUserId,
      }

      const response = await authFetch(`${base}/api/review/workflows/${editingReview._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({ title: "Review Updated", description: "The review has been updated successfully." })
        setIsEditDialogOpen(false)
        await fetchReviews()
      } else {
        throw new Error("Failed to update review")
      }
    } catch (error: any) {
      console.error("Update review error:", error)
      toast({
        title: "Update failed",
        description: error.message || "Could not update review.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingReview(false)
    }
  }

  // Handle delete review
  const handleDeleteReview = async (reviewId: string) => {
    setIsDeletingReview(reviewId)
    try {
      const base = import.meta.env.VITE_APIURL
      const response = await authFetch(`${base}/api/review/workflows/${reviewId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({ title: "Review Deleted", description: "The review has been deleted." })
        await fetchReviews()
      } else {
        throw new Error("Failed to delete review")
      }
    } catch (error: any) {
      console.error("Delete review error:", error)
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete review.",
        variant: "destructive",
      })
    } finally {
      setIsDeletingReview(null)
    }
  }

  // Sync review data from stepData (when loaded from backend)
  React.useEffect(() => {
    if (stepData) {
      if (stepData.reviewStatus) {
        setReviewStatus(stepData.reviewStatus)
      }
      if (stepData.reviewComments !== undefined) {
        setReviewComments(stepData.reviewComments || "")
      }
      // Advanced review fields - auto-set to current user
      if (currentUserId) {
        if (!stepData.reviewerId) setReviewerId(currentUserId)
        if (!stepData.approvedBy) setApprovedBy(currentUserId)
        if (!stepData.signedOffBy) setSignedOffBy(currentUserId)
        if (!stepData.lockedBy) setLockedBy(currentUserId)
        if (!stepData.reopenedBy) setReopenedBy(currentUserId)
      }
      // Update existing values if present
      if (stepData.reviewerId) setReviewerId(stepData.reviewerId)
      if (stepData.reviewedAt) setReviewedAt(new Date(stepData.reviewedAt).toISOString().split('T')[0])
      if (stepData.approvedBy) setApprovedBy(stepData.approvedBy)
      if (stepData.approvedAt) setApprovedAt(new Date(stepData.approvedAt).toISOString().split('T')[0])
      if (stepData.signedOffBy) setSignedOffBy(stepData.signedOffBy)
      if (stepData.signedOffAt) setSignedOffAt(new Date(stepData.signedOffAt).toISOString().split('T')[0])
      if (stepData.signOffComments !== undefined) setSignOffComments(stepData.signOffComments || "")
      if (stepData.isSignedOff !== undefined) setIsSignedOff(stepData.isSignedOff)
      if (stepData.isLocked !== undefined) setIsLocked(stepData.isLocked)
      if (stepData.lockedAt) setLockedAt(new Date(stepData.lockedAt).toISOString().split('T')[0])
      if (stepData.lockedBy) setLockedBy(stepData.lockedBy)
      if (stepData.reopenedAt) setReopenedAt(new Date(stepData.reopenedAt).toISOString().split('T')[0])
      if (stepData.reopenedBy) setReopenedBy(stepData.reopenedBy)
      if (stepData.reopenReason !== undefined) setReopenReason(stepData.reopenReason || "")
      if (stepData.reviewVersion) setReviewVersion(stepData.reviewVersion)
    }
  }, [stepData, currentUserId])

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
        
        if (!res.ok) {
          const errorText = await res.text().catch(() => "")
          let errorMessage = "Failed to generate questions"
          try {
            const errorData = errorText ? (errorText.startsWith("{") ? JSON.parse(errorText) : { message: errorText }) : {}
            errorMessage = errorData.error || errorData.message || errorMessage
          } catch {
            errorMessage = errorText?.slice(0, 200) || errorMessage
          }
          if (res.status === 429 || errorMessage.toLowerCase().includes("quota")) {
            errorMessage = "OpenAI API quota exceeded. Please check your OpenAI account billing and quota limits."
          }
          throw new Error(errorMessage)
        }
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
        proc.fields && proc.fields.some((f: any) => {
          const answer = f.answer
          if (!answer) return true
          if (typeof answer === 'string') return answer.trim() === ""
          return false
        })
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
        procedureType: "planning",
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
      
      const response = await authFetch(`${base}/api/planning-procedures/${engagement._id}/save`, {
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
      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}/generate/recommendations`, {
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

  // Review functions
  const handleToggleItemReview = (itemId: string) => {
    setReviewedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const handleSaveReview = async () => {
    setIsSavingReview(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const formData = new FormData()
      
      const now = new Date()
      const currentVersion = (reviewVersion || 1) + 1
      
      // Auto-populate fields based on reviewStatus
      let autoFields: any = {
        reviewVersion: currentVersion,
      }
      
      // Set fields based on status
      if (reviewStatus === 'ready-for-review' || reviewStatus === 'under-review') {
        autoFields.reviewerId = currentUserId
        autoFields.reviewedAt = now.toISOString()
      }
      
      if (reviewStatus === 'approved') {
        autoFields.approvedBy = currentUserId
        autoFields.approvedAt = now.toISOString()
      }
      
      if (reviewStatus === 'signed-off') {
        autoFields.signedOffBy = currentUserId
        autoFields.signedOffAt = now.toISOString()
        autoFields.isSignedOff = true
        autoFields.signOffComments = reviewComments || signOffComments || undefined
      }
      
      if (reviewStatus === 're-opened') {
        autoFields.reopenedBy = currentUserId
        autoFields.reopenedAt = now.toISOString()
        autoFields.reopenReason = reviewComments || reopenReason || undefined
      }
      
      const payload = {
        ...stepData,
        procedures: procedures.map(sec => ({
          ...sec,
          fields: (sec.fields || []).map(({ __uid, ...rest }) => rest)
        })),
        recommendations: recommendations,
        reviewStatus: reviewStatus,
        reviewComments: reviewComments,
        status: "completed",
        procedureType: "planning",
        mode: mode,
        // Auto-populated fields based on status
        ...autoFields,
      }
      
      formData.append("data", JSON.stringify(payload))
      
      const response = await authFetch(`${base}/api/planning-procedures/${engagement._id}/save`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        const errorMessage = text || `Failed to save review (HTTP ${response.status})`
        throw new Error(errorMessage)
      }

      // Update reviewVersion state after successful save
      setReviewVersion(currentVersion)

      // Refresh the reviews list to show the newly saved review
      await fetchReviews()

      toast({
        title: "Review Saved",
        description: "Your review has been saved successfully.",
      })
    } catch (error: any) {
      console.error("Save review error:", error)
      toast({
        title: "Save failed",
        description: error.message || "Could not save review.",
        variant: "destructive",
      })
    } finally {
      setIsSavingReview(false)
    }
  }

  const handleUpdateItemReviewComment = (itemId: string, comment: string) => {
    setItemReviewComments(prev => ({
      ...prev,
      [itemId]: comment
    }))
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
        {/* Procedures Tab */}
        <TabsContent value="procedures" className="space-y-3 mt-4">
          {proceduresViewMode === 'reviews' ? (
            <div className="flex-1 flex flex-col overflow-x-hidden" style={{ width: '100%', maxWidth: '100%' }}>
              <div className="flex flex-col gap-2 mb-4 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setProceduresViewMode('procedures')}
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Back to Procedures
                </Button>
                <div className="flex items-center justify-between w-full">
                  <h4 className="text-lg font-semibold">Overall Review</h4>
                  <div className="flex items-center gap-2">
                    <Select value={reviewStatus} onValueChange={setReviewStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Review Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="ready-for-review">Ready for Review</SelectItem>
                        <SelectItem value="under-review">Under Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="signed-off">Signed Off</SelectItem>
                        <SelectItem value="re-opened">Re-opened</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={handleSaveReview}
                      disabled={isSavingReview}
                    >
                      {isSavingReview ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Review
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mb-4 w-full">
                <Label htmlFor="review-comments" className="mb-2 block">Overall Review Comments</Label>
                <Textarea
                  id="review-comments"
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Add your review comments here..."
                  className="min-h-[100px] w-full"
                />
              </div>

              <ScrollArea className="h-[500px] border rounded-md p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-md font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Reviews ({reviews.length})
                    </h5>
                    <Button variant="outline" size="sm" onClick={fetchReviews} disabled={isLoadingReviews}>
                      {isLoadingReviews ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No reviews yet.</div>
                  ) : (
                    reviews.map((review: any, idx: number) => {
                      const statusColors: Record<string, string> = {
                        'in-progress': 'bg-gray-100 text-gray-800',
                        'ready-for-review': 'bg-blue-100 text-blue-800',
                        'under-review': 'bg-yellow-100 text-yellow-800',
                        'approved': 'bg-green-100 text-green-800',
                        'rejected': 'bg-red-100 text-red-800',
                        'signed-off': 'bg-purple-100 text-purple-800',
                        're-opened': 'bg-orange-100 text-orange-800',
                      };
                      
                      const isOwner = isReviewOwner(review);
                      
                      return (
                        <Card key={review._id || idx} className="mb-4">
                          <CardContent className="pt-6 pb-6">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={statusColors[review.status] || 'bg-gray-100 text-gray-800'}>
                                      {review.status || 'N/A'}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {review.itemType || 'N/A'}
                                    </span>
                                  </div>
                                  {review.reviewComments && (
                                    <div className="text-sm text-muted-foreground mb-2">
                                      {review.reviewComments}
                                    </div>
                                  )}
                                </div>
                                {isOwner && (
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditReview(review)}
                                      disabled={isDeletingReview === review._id}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteReview(review._id)}
                                      disabled={isDeletingReview === review._id}
                                    >
                                      {isDeletingReview === review._id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Reviewer:</span>{' '}
                                  <span className="text-muted-foreground">
                                    {(() => {
                                      let reviewerId = null;
                                      if (review.status === 'approved') {
                                        reviewerId = review.approvedBy || review.reviewedBy || review.assignedReviewer;
                                      } else if (review.status === 'signed-off') {
                                        reviewerId = review.signedOffBy || review.approvedBy || review.reviewedBy || review.assignedReviewer;
                                      } else if (review.status === 're-opened') {
                                        reviewerId = review.reopenedBy || review.reviewedBy || review.assignedReviewer;
                                      } else if (review.status === 'ready-for-review' || review.status === 'under-review') {
                                        reviewerId = review.reviewedBy || review.assignedReviewer;
                                      } else {
                                        reviewerId = review.reviewedBy || review.assignedReviewer;
                                      }
                                      return reviewerId ? (userNamesMap[reviewerId] || reviewerId) : 'Not assigned';
                                    })()}
                                  </span>
                                </div>
                                {review.reviewedAt && (review.status === 'ready-for-review' || review.status === 'under-review') && (
                                  <div>
                                    <span className="font-medium">Reviewed At:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {new Date(review.reviewedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {review.status === 'approved' && review.approvedBy && (
                                  <div>
                                    <span className="font-medium">Approved By:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {userNamesMap[review.approvedBy] || review.approvedBy}
                                    </span>
                                  </div>
                                )}
                                {review.status === 'approved' && review.approvedAt && (
                                  <div>
                                    <span className="font-medium">Approved At:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {new Date(review.approvedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {review.status === 'signed-off' && review.signedOffBy && (
                                  <div>
                                    <span className="font-medium">Signed Off By:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {userNamesMap[review.signedOffBy] || review.signedOffBy}
                                    </span>
                                  </div>
                                )}
                                {review.status === 'signed-off' && review.signedOffAt && (
                                  <div>
                                    <span className="font-medium">Signed Off At:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {new Date(review.signedOffAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {review.isLocked && (
                                  <div>
                                    <span className="font-medium">Locked:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {review.lockedBy ? `Yes (by ${userNamesMap[review.lockedBy] || review.lockedBy})` : 'Yes'}
                                    </span>
                                  </div>
                                )}
                                {review.status === 're-opened' && review.reopenedBy && (
                                  <div>
                                    <span className="font-medium">Reopened By:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {userNamesMap[review.reopenedBy] || review.reopenedBy}
                                    </span>
                                  </div>
                                )}
                                {review.status === 're-opened' && review.reopenedAt && (
                                  <div>
                                    <span className="font-medium">Reopened At:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {new Date(review.reopenedAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                                {review.reviewVersion && (
                                  <div>
                                    <span className="font-medium">Version:</span>{' '}
                                    <span className="text-muted-foreground">
                                      {review.reviewVersion}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Audit Recommendations</h4>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setProceduresViewMode('reviews')}>
                    <FileText className="h-4 w-4 mr-2" /> Reviews
                  </Button>
                  {hasAnswers ? (
                    recommendations.length > 0 ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleGenerateProcedures}
                        disabled={generatingProcedures || !hasAnswers}
                      >
                        {generatingProcedures ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Regenerate Procedures
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handleGenerateProcedures}
                        disabled={generatingProcedures || !hasAnswers}
                      >
                        {generatingProcedures ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                        Generate Procedures
                      </Button>
                    )
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      Generate answers first.
                    </div>
                  )}
                  <Button variant="outline" size="sm" onClick={handleAddRecommendation}>
                    <Plus className="h-4 w-4 mr-2" /> Add
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {recommendations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      No recommendations yet.
                    </div>
                  ) : (
                    recommendations.map((rec, idx) => {
                      const recId = rec.id || rec.__uid || `rec-${idx}`;
                      const isEditing = editingRecommendationId === recId;
                      return (
                        <Card key={recId}>
                          <CardContent className="pt-6">
                            {isEditing ? (
                              <div className="space-y-3">
                                <Textarea 
                                  value={editRecommendationText} 
                                  onChange={(e) => setEditRecommendationText(e.target.value)} 
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={handleSaveRecommendation}>Save</Button>
                                  <Button size="sm" variant="outline" onClick={handleCancelEditRecommendation}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{typeof rec === 'string' ? rec : rec.text}</p>
                                  <Badge variant={rec.checked ? "default" : "secondary"} className="mt-2">
                                    {rec.checked ? "Completed" : "Pending"}
                                  </Badge>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditRecommendation(rec, idx)}><Edit2 className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRecommendation(rec, idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>
        
      </Tabs>

        {/* Edit Review Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-review-status">Status</Label>
                <Select value={editReviewStatus} onValueChange={setEditReviewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="ready-for-review">Ready for Review</SelectItem>
                    <SelectItem value="under-review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="signed-off">Signed Off</SelectItem>
                    <SelectItem value="re-opened">Re-opened</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-review-comments">Review Comments</Label>
                <Textarea
                  id="edit-review-comments"
                  value={editReviewComments}
                  onChange={(e) => setEditReviewComments(e.target.value)}
                  placeholder="Enter review comments..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateReview} disabled={isUpdatingReview}>
                {isUpdatingReview ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Update Review"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
