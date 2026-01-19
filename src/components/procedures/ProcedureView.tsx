// @ts-nocheck
import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Edit, Save, X, Trash2, Plus, Loader2, RefreshCw, FileText, CheckCircle, Eye, MessageSquare, Sparkles } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import FloatingNotesButton from "./FloatingNotesButton"
import NotebookInterface from "./NotebookInterface"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { supabase } from "@/integrations/supabase/client"

// Helper function for authenticated fetch
const authFetch = async (url: string, options: RequestInit = {}) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw new Error('No active session')
  }
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  })
}

// Helper function to sanitize data before JSON.stringify (removes circular references and React internals)
function sanitizeForJSON(obj: any, seen = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return undefined;
  }
  seen.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForJSON(item, seen)).filter(item => item !== undefined);
  }

  // Handle plain objects
  const sanitized: any = {};
  for (const key in obj) {
    // Skip React internal properties
    if (key.startsWith('__reactFiber$') || 
        key.startsWith('__reactInternalInstance$') || 
        key.startsWith('__reactInternalContainer$') ||
        key === '__uid' ||
        key === 'stateNode' ||
        typeof obj[key] === 'function') {
      continue;
    }

    // Skip DOM elements and other non-serializable objects
    if (obj[key] instanceof HTMLElement || 
        obj[key] instanceof Event ||
        (typeof obj[key] === 'object' && obj[key] !== null && obj[key].constructor && 
         obj[key].constructor.name !== 'Object' && obj[key].constructor.name !== 'Array')) {
      continue;
    }

    const value = sanitizeForJSON(obj[key], seen);
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Add these helpers near the top of ProcedureView.tsx (outside the component)
function normalizeKey(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[\s/_-]+/g, " ")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim()
}

// Update the splitRecommendationsByClassification function
function splitRecommendationsByClassification(markdown?: string) {
  const map: Record<string, string> = {}
  if (!markdown) return map

  const lines = markdown.split(/\r?\n/)
  let currentKey: string | null = null
  let bucket: string[] = []

  const flush = () => {
    if (currentKey && bucket.length > 0) {
      map[currentKey] = bucket.join("\n").trim()
    }
    bucket = []
  }

  for (const raw of lines) {
    // Match both formats: *classification* and plain classification headers
    const asteriskMatch = raw.match(/^\s*\*([^*]+)\*\s*$/)
    const plainHeaderMatch = raw.match(/^([A-Za-z][^•\-].*[^:\-])\s*$/) // Match lines that look like headers

    if (asteriskMatch || plainHeaderMatch) {
      // New classification section starts
      flush()
      currentKey = asteriskMatch ? asteriskMatch[1].trim() : plainHeaderMatch[1].trim()
      continue
    }

    // Skip bullet points that might be mistaken as headers
    const isBulletPoint = /^\s*[-•*]\s+/.test(raw)

    if (!currentKey) {
      // Ignore prelude text or attach it to a special key if needed
      continue
    }

    // Add content lines (including bullet points) to the current bucket
    if (raw.trim().length > 0) {
      bucket.push(raw)
    }
  }
  flush()
  return map
}


interface ChecklistItem {
  id: string
  text: string
  checked: boolean
  classification?: string
}

interface ProcedureViewProps {
  procedure: any
  engagement: any
  onRegenerate?: () => void
  currentClassification?: string
  onProcedureUpdate?: (updatedProcedure: any) => void // This should be here
}

export const ProcedureView: React.FC<ProcedureViewProps> = ({
  procedure,
  engagement,
  onRegenerate,
  onProcedureUpdate,
  currentClassification,
}) => {
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const { toast } = useToast()
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editQuestionText, setEditQuestionText] = useState("")
  const [editAnswerText, setEditAnswerText] = useState("")
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null)
  const [editAnswerValue, setEditAnswerValue] = useState("")
  const [localQuestions, setLocalQuestions] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("questions")
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoadingReviews, setIsLoadingReviews] = useState(false)
  const activeTabRef = React.useRef("questions")
  const [proceduresViewMode, setProceduresViewMode] = useState<'procedures' | 'reviews'>('procedures')
  const [classificationProceduresViewMode, setClassificationProceduresViewMode] = useState<Record<string, 'procedures' | 'reviews'>>({})
  
  // Review state
  const [reviewStatus, setReviewStatus] = useState<string>(procedure?.reviewStatus || "in-progress")
  const [reviewComments, setReviewComments] = useState<string>(procedure?.reviewComments || "")
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [isEditingOverallComment, setIsEditingOverallComment] = useState(false)
  const [editOverallCommentValue, setEditOverallCommentValue] = useState<string>("")
  
  // Edit Review Dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<any>(null)
  const [editReviewStatus, setEditReviewStatus] = useState<string>("")
  const [editReviewComments, setEditReviewComments] = useState<string>("")
  const [isUpdatingReview, setIsUpdatingReview] = useState(false)
  
  // Advanced Review & Sign-off state
  const [reviewerId, setReviewerId] = useState<string>(procedure?.reviewerId || "")
  const [reviewedAt, setReviewedAt] = useState<string>(procedure?.reviewedAt ? new Date(procedure.reviewedAt).toISOString().split('T')[0] : "")
  const [approvedBy, setApprovedBy] = useState<string>(procedure?.approvedBy || "")
  const [approvedAt, setApprovedAt] = useState<string>(procedure?.approvedAt ? new Date(procedure.approvedAt).toISOString().split('T')[0] : "")
  const [signedOffBy, setSignedOffBy] = useState<string>(procedure?.signedOffBy || "")
  const [signedOffAt, setSignedOffAt] = useState<string>(procedure?.signedOffAt ? new Date(procedure.signedOffAt).toISOString().split('T')[0] : "")
  const [signOffComments, setSignOffComments] = useState<string>(procedure?.signOffComments || "")
  const [isSignedOff, setIsSignedOff] = useState<boolean>(procedure?.isSignedOff || false)
  const [isLocked, setIsLocked] = useState<boolean>(procedure?.isLocked || false)
  const [lockedAt, setLockedAt] = useState<string>(procedure?.lockedAt ? new Date(procedure.lockedAt).toISOString().split('T')[0] : "")
  const [lockedBy, setLockedBy] = useState<string>(procedure?.lockedBy || "")
  const [reopenedAt, setReopenedAt] = useState<string>(procedure?.reopenedAt ? new Date(procedure.reopenedAt).toISOString().split('T')[0] : "")
  const [reopenedBy, setReopenedBy] = useState<string>(procedure?.reopenedBy || "")
  const [reopenReason, setReopenReason] = useState<string>(procedure?.reopenReason || "")
  const [reviewVersion, setReviewVersion] = useState<number>(procedure?.reviewVersion || 1)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  
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

  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({})

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

  // Fetch reviews for engagement (filtered by itemType: "procedure")
  const fetchReviews = async () => {
    if (!engagement?._id) return
    setIsLoadingReviews(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const response = await authFetch(`${base}/api/review/workflows/engagement/${engagement._id}`)
      if (response.ok) {
        const data = await response.json()
        // Filter reviews by itemType: "procedure" for ProcedureView
        const filteredReviews = (data.workflows || []).filter((w: any) => w.itemType === 'procedure')
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

  // Fetch reviews when engagement or review tab is active
  React.useEffect(() => {
    if (engagement?._id && activeTab === "review") {
      fetchReviews()
    }
  }, [engagement?._id, activeTab])

  // Fetch reviews when switching to reviews view mode in procedures tab
  React.useEffect(() => {
    if (engagement?._id && activeTab === "procedures" && proceduresViewMode === "reviews") {
      fetchReviews()
    }
  }, [engagement?._id, activeTab, proceduresViewMode])

  // Fetch reviews when switching to reviews view mode in multi-classification view
  React.useEffect(() => {
    if (engagement?._id && activeTab === "procedures") {
      // Check if any classification is in reviews mode
      const hasReviewsMode = Object.values(classificationProceduresViewMode).some(mode => mode === 'reviews')
      if (hasReviewsMode) {
        fetchReviews()
      }
    }
  }, [engagement?._id, activeTab, classificationProceduresViewMode])

  // Sync review data from procedure prop (when loaded from backend)
  React.useEffect(() => {
    if (procedure) {
      // Update review status
      if (procedure.reviewStatus) {
        setReviewStatus(procedure.reviewStatus)
      }
      // Update review comments
      if (procedure.reviewComments !== undefined) {
        setReviewComments(procedure.reviewComments || "")
      }
      // Advanced review fields - auto-set to current user
      if (currentUserId) {
        if (!procedure.reviewerId) setReviewerId(currentUserId)
        if (!procedure.approvedBy) setApprovedBy(currentUserId)
        if (!procedure.signedOffBy) setSignedOffBy(currentUserId)
        if (!procedure.lockedBy) setLockedBy(currentUserId)
        if (!procedure.reopenedBy) setReopenedBy(currentUserId)
      }
      // Update existing values if present
      if (procedure.reviewerId) setReviewerId(procedure.reviewerId)
      if (procedure.reviewedAt) setReviewedAt(new Date(procedure.reviewedAt).toISOString().split('T')[0])
      if (procedure.approvedBy) setApprovedBy(procedure.approvedBy)
      if (procedure.approvedAt) setApprovedAt(new Date(procedure.approvedAt).toISOString().split('T')[0])
      if (procedure.signedOffBy) setSignedOffBy(procedure.signedOffBy)
      if (procedure.signedOffAt) setSignedOffAt(new Date(procedure.signedOffAt).toISOString().split('T')[0])
      if (procedure.signOffComments !== undefined) setSignOffComments(procedure.signOffComments || "")
      if (procedure.isSignedOff !== undefined) setIsSignedOff(procedure.isSignedOff)
      if (procedure.isLocked !== undefined) setIsLocked(procedure.isLocked)
      if (procedure.lockedAt) setLockedAt(new Date(procedure.lockedAt).toISOString().split('T')[0])
      if (procedure.lockedBy) setLockedBy(procedure.lockedBy)
      if (procedure.reopenedAt) setReopenedAt(new Date(procedure.reopenedAt).toISOString().split('T')[0])
      if (procedure.reopenedBy) setReopenedBy(procedure.reopenedBy)
      if (procedure.reopenReason !== undefined) setReopenReason(procedure.reopenReason || "")
      if (procedure.reviewVersion) setReviewVersion(procedure.reviewVersion)
    }
  }, [procedure, currentUserId])
  
  // Update ref when activeTab changes
  React.useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])
  const [generatingClassification, setGeneratingClassification] = useState<string | null>(null)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [generatingAnswers, setGeneratingAnswers] = useState(false)
  const [generatingProcedures, setGeneratingProcedures] = useState(false)
  const [selectedClassification, setSelectedClassification] = useState<string | null>(currentClassification || null)
  const [classificationTabs, setClassificationTabs] = useState<Record<string, string>>({})

  // Track if we're in the middle of generating to prevent reset
  const isGeneratingRef = React.useRef(false)
  const lastProcedureQuestionsRef = React.useRef<string>("")
  const localQuestionsRef = React.useRef(localQuestions)
  
  // Update ref when localQuestions changes
  React.useEffect(() => {
    localQuestionsRef.current = localQuestions
  }, [localQuestions])
  
  // Initialize local questions when procedure changes
  // But don't reset if we just generated answers (to prevent losing them)
  React.useEffect(() => {
    if (procedure?.questions) {
      const currentQuestions = Array.isArray(procedure.questions) ? procedure.questions : []
      const currentQuestionsStr = JSON.stringify(currentQuestions)
      
      // Only update if:
      // 1. We're not in the middle of generating, AND
      // 2. The procedure questions actually changed (not just a re-render)
      const questionsChanged = currentQuestionsStr !== lastProcedureQuestionsRef.current
      
      if (!isGeneratingRef.current && questionsChanged) {
        const localQs = localQuestionsRef.current
        
        // Check if localQuestions has answers that procedure doesn't have
        const hasLocalAnswers = localQs.some((q: any) => q.answer && q.answer.trim() !== "")
        const procedureHasAnswers = currentQuestions.some((q: any) => q.answer && q.answer.trim() !== "")
        
        // If local has answers but procedure doesn't, merge them intelligently
        if (hasLocalAnswers) {
          // Create a map of local questions by their key/id for quick lookup
          const localMap = new Map()
          localQs.forEach((q: any) => {
            const key = q.id || q.key || q._id || q.__uid
            if (key) {
              localMap.set(String(key), q)
            }
          })
          
          // Merge: use procedure questions as base, but preserve answers from local if they exist
          const mergedQuestions = currentQuestions.map((procQ: any) => {
            const key = procQ.id || procQ.key || procQ._id || procQ.__uid
            const localQ = key ? localMap.get(String(key)) : null
            
            // If local question has an answer and procedure question doesn't, use local answer
            if (localQ && localQ.answer && localQ.answer.trim() !== "" && (!procQ.answer || procQ.answer.trim() === "")) {
              return { ...procQ, answer: localQ.answer }
            }
            
            // Otherwise use procedure question (it might have a newer answer from API)
            return procQ
          })
          
          // Add any local questions that aren't in procedure (shouldn't happen, but just in case)
          localQs.forEach((localQ: any) => {
            const key = localQ.id || localQ.key || localQ._id || localQ.__uid
            if (key && !mergedQuestions.some((q: any) => (q.id || q.key || q._id || q.__uid) === key)) {
              mergedQuestions.push(localQ)
            }
          })
          
          setLocalQuestions(mergedQuestions)
          lastProcedureQuestionsRef.current = currentQuestionsStr
          return
        }
        
        // If no local answers, just use procedure questions
        setLocalQuestions([...currentQuestions])
        lastProcedureQuestionsRef.current = currentQuestionsStr
      } else if (questionsChanged) {
        // Update the ref even if we're generating
        lastProcedureQuestionsRef.current = currentQuestionsStr
      }
    }
  }, [procedure?.questions])

  // Update selectedClassification when currentClassification prop changes
  React.useEffect(() => {
    if (currentClassification) {
      setSelectedClassification(currentClassification)
    } else {
      // Clear selectedClassification if currentClassification is removed
      setSelectedClassification(null)
    }
  }, [currentClassification])

  // Extract available classifications from procedure
  const availableClassifications = useMemo(() => {
    const classifications = new Set<string>()
    
    // From selectedClassifications in procedure
    if (Array.isArray(procedure?.selectedClassifications)) {
      procedure.selectedClassifications.forEach((c: string) => classifications.add(c))
    }
    
    // From questions
    if (Array.isArray(localQuestions)) {
      localQuestions.forEach((q: any) => {
        if (q.classification) {
          classifications.add(q.classification)
        }
      })
    }
    
    return Array.from(classifications).sort()
  }, [procedure?.selectedClassifications, localQuestions])

  // Use currentClassification if provided, otherwise use selectedClassification
  // This ensures that when currentClassification is passed from ClassificationSection,
  // we use that exact value for filtering
  const activeClassification = currentClassification || selectedClassification
  
  // Debug: Log activeClassification when it changes
  React.useEffect(() => {
    console.log("ProcedureView - activeClassification updated:", {
      currentClassification,
      selectedClassification,
      activeClassification,
      activeClassificationType: typeof activeClassification
    });
  }, [currentClassification, selectedClassification, activeClassification])

  const safeTitle = (engagement?.title || "Engagement")
  const yEnd = engagement?.yearEndDate ? new Date(engagement.yearEndDate) : null
  const yearEndStr = yEnd
    ? `${yEnd.getFullYear()}-${String(yEnd.getMonth() + 1).padStart(2, "0")}-${String(
      yEnd.getDate()
    ).padStart(2, "0")}`
    : "N/A"

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(amount ?? 0)

  function formatClassificationForDisplay(classification?: string) {
    if (!classification) return "General"
    const parts = classification.split(" > ")
    // For 3+ parts, return the 3rd part (index 2), otherwise return the last part
    // This matches the logic in TrialBalanceTab.tsx
    // e.g., "Equity > Equity > Share Capital" -> "Share Capital"
    return parts.length >= 3 ? parts[2] : parts[parts.length - 1]
  }

  // Helper function to normalize classification strings for comparison
  // Normalizes whitespace around ">" separators and trims
  const normalizeClassification = (classification: string): string => {
    if (!classification) return ""
    return classification
      .trim()
      .replace(/\s*>\s*/g, " > ") // Normalize spaces around ">"
      .trim()
  }

  // ✅ filter questions to this classification
  // When currentClassification is provided, match questions that belong to this classification
  // This handles cases where:
  // - Sidebar uses level 3 (e.g., "Equity > Equity > Share capital") and questions have the same 3-part classification (exact match)
  // - Sidebar uses level 3 but questions have longer paths (e.g., "Equity > Equity > Share capital > Sub-category") (prefix match)
  // - Sidebar uses level 3 but questions might have shorter normalized paths (handled via normalization)
  const filteredQuestions = useMemo(() => {
    const all = Array.isArray(localQuestions) ? localQuestions : []
    // Use currentClassification if provided (passed from ClassificationSection),
    // otherwise fall back to activeClassification
    const filterBy = currentClassification || activeClassification
    if (!filterBy) return all
    
    // Normalize the filter classification
    const normalizedFilter = normalizeClassification(filterBy)
    
    return all.filter((q: any) => {
      if (!q.classification) return false
      
      // Normalize question classification
      const normalizedQ = normalizeClassification(q.classification)
      
      // 1. Exact match (handles 3-part classifications that match exactly)
      if (normalizedQ === normalizedFilter) return true
      
      // 2. Prefix match - question classification is a child of filterBy
      // e.g., filterBy="Equity > Equity > Share capital", q.classification="Equity > Equity > Share capital > Sub-category"
      if (normalizedQ.startsWith(normalizedFilter + " > ")) return true
      
      // 3. Reverse prefix match - filterBy is a child of question classification
      // e.g., filterBy="Equity > Equity > Share capital > Sub-category", q.classification="Equity > Equity > Share capital"
      if (normalizedFilter.startsWith(normalizedQ + " > ")) return true
      
      return false
    })
  }, [localQuestions, currentClassification, activeClassification])

  // group (even though single classification, keeps UI consistent)
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    const source = filteredQuestions
    source.forEach((q: any) => {
      const key = q.classification || "General"
      if (!g[key]) g[key] = []
      g[key].push(q)
    })
    return g
  }, [filteredQuestions])

  // Questions with answers
  const questionsWithAnswers = useMemo(() => {
    return filteredQuestions.filter((q: any) => q.answer && q.answer.trim() !== "")
  }, [filteredQuestions])

  const validCount = filteredQuestions?.filter((q: any) => q?.isValid)?.length || 0

  // Get recommendations for current classification as checklist items
  const recommendationsForClass = React.useMemo(() => {
    if (!procedure?.recommendations) return []

    // If recommendations is already an array of checklist items, use it directly
    if (Array.isArray(procedure.recommendations)) {
      // Use currentClassification if provided (passed from ClassificationSection),
      // otherwise fall back to activeClassification
      const filterBy = currentClassification || activeClassification
      if (!filterBy) {
        return procedure.recommendations
      }
      // Normalize the filter classification using the same helper function
      const normalizedFilter = normalizeClassification(filterBy)
      
      return procedure.recommendations.filter((item: ChecklistItem) => {
        if (!item.classification) return false
        
        // Normalize item classification
        const normalizedItem = normalizeClassification(item.classification)
        
        // 1. Exact match (handles 3-part classifications that match exactly)
        if (normalizedItem === normalizedFilter) return true
        
        // 2. Prefix match - item classification is a child of activeClassification
        if (normalizedItem.startsWith(normalizedFilter + " > ")) return true
        
        // 3. Reverse prefix match - activeClassification is a child of item classification
        if (normalizedFilter.startsWith(normalizedItem + " > ")) return true
        
        return false
      })
    }

    // Handle legacy string format
    const text = typeof procedure.recommendations === "string" ? procedure.recommendations : ""
    const byClassFromServer = splitRecommendationsByClassification(text)

    // Use currentClassification if provided (passed from ClassificationSection),
    // otherwise fall back to activeClassification
    const filterBy = currentClassification || activeClassification

    if (!filterBy) {
      // If no current classification, convert entire text to checklist items
      return text.split('\n')
        .filter(line => line.trim())
        .map((line, index) => ({
          id: `legacy-${index}`,
          text: line.trim(),
          checked: false,
          classification: "general"
        }))
    }

    // Normalize classification for matching (lowercase and trim for legacy format)
    const normalizeClassificationLegacy = (s: string) => s.toLowerCase().trim()

    let content = ""
    
    // 1) Exact match on full classification path
    if (byClassFromServer[filterBy]) {
      content = byClassFromServer[filterBy]
    } else {
      // 2) Try matching even with minor variations
      const normalizedFilterBy = normalizeClassificationLegacy(filterBy)
      for (const key of Object.keys(byClassFromServer)) {
        if (normalizeClassificationLegacy(key) === normalizedFilterBy) {
          content = byClassFromServer[key]
          break
        }
      }
      
      // 3) Last resort: Try suffix match for deeper parts of the classification
      if (!content) {
        const leaf = filterBy.split(">").pop()?.trim() || ""
        const wantLeaf = normalizeClassificationLegacy(leaf)
        for (const key of Object.keys(byClassFromServer)) {
          const keyLeaf = normalizeClassificationLegacy(key.split(">").pop() || key)
          if (keyLeaf === wantLeaf) {
            content = byClassFromServer[key]
            break
          }
        }
      }
    }

    // Convert content to checklist items
    if (content) {
      return content.split('\n')
        .filter(line => line.trim())
        .map((line, index) => ({
          id: `item-${Date.now()}-${index}`,
          text: line.trim(),
          checked: false,
          classification: filterBy
        }))
    }

    return []
  }, [procedure?.recommendations, currentClassification, activeClassification])

  // state to allow in-place editing from the notebook - now as checklist items
  // For multi-classification view, initialize with all recommendations from procedure
  const initialRecommendations = React.useMemo(() => {
    if (!currentClassification && procedure?.recommendations && Array.isArray(procedure.recommendations)) {
      // Multi-classification view: use all recommendations
      return procedure.recommendations
    }
    // Single classification view: use filtered recommendations
    return recommendationsForClass
  }, [currentClassification, procedure?.recommendations, recommendationsForClass])
  
  const [recommendations, setRecommendations] = useState<ChecklistItem[]>(initialRecommendations)
  React.useEffect(() => {
    if (currentClassification) {
      // Single classification view: update with filtered recommendations
      setRecommendations(recommendationsForClass)
    } else if (procedure?.recommendations && Array.isArray(procedure.recommendations)) {
      // Multi-classification view: update with all recommendations from procedure
      setRecommendations(procedure.recommendations)
    }
  }, [currentClassification, recommendationsForClass, procedure?.recommendations])

  const handleEditQuestion = (question: any) => {
    setEditingQuestionId(question.id)
    setEditQuestionText(question.question || "")
    setEditAnswerText(question.answer || "")
  }

  const handleSaveQuestion = () => {
    if (!editingQuestionId) return

    setLocalQuestions(prev =>
      prev.map(q =>
        q.id === editingQuestionId
          ? { ...q, question: editQuestionText, answer: editAnswerText }
          : q
      )
    )

    setEditingQuestionId(null)
    setEditQuestionText("")
    setEditAnswerText("")
  }

  const handleCancelEdit = () => {
    setEditingQuestionId(null)
    setEditQuestionText("")
    setEditAnswerText("")
  }

  const handleDeleteQuestion = (questionId: string) => {
    setLocalQuestions(prev => prev.filter(q => q.id !== questionId))
  }

  const handleAddQuestion = () => {
      const newQuestion = {
      id: `new-${Date.now()}`,
      question: "New question",
      answer: "",
      classification: activeClassification || "General",
      isValid: false
    }

    setLocalQuestions(prev => [...prev, newQuestion])
    setEditingQuestionId(newQuestion.id)
    setEditQuestionText(newQuestion.question)
    setEditAnswerText(newQuestion.answer)
  }

  const handleSaveAllChanges = async () => {
    setIsSaving(true);
    try {
      const base = import.meta.env.VITE_APIURL;

      const url = activeClassification?`${base}/api/procedures/${engagement._id}/section`:`${base}/api/procedures/${engagement._id}`;
      const method = "POST";
      
      // Prepare recommendations: merge current classification with existing ones
      let finalRecommendations = recommendations;
      
      if (activeClassification && Array.isArray(procedure?.recommendations)) {
        // Get existing recommendations from other classifications
        const otherClassificationRecommendations = procedure.recommendations.filter(
          (item: ChecklistItem) => item.classification !== activeClassification
        );
        
        // Combine current classification recommendations with other classifications
        finalRecommendations = [
          ...otherClassificationRecommendations,
          ...recommendations
        ];
      }
      
      // Sanitize procedure data before sending
      const sanitizedProcedure = sanitizeForJSON({
        ...procedure,
        status:"completed",
        questions: localQuestions,
        recommendations: finalRecommendations,
      });
      const body = JSON.stringify(sanitizedProcedure);
      const response = await authFetch(url, { method, body });

      if (response.ok) {
        toast({
          title: "Changes Saved",
          description: "All changes have been saved successfully.",
        });

        // Fetch the updated procedure after successful save
        const updatedResponse = await authFetch(url);
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          // Extract the procedure from the response
          const updatedProcedure = updatedData.procedure || updatedData;
          
          // Update parent component's state with the new procedure
          if (onProcedureUpdate) {
            onProcedureUpdate(updatedProcedure);
          }
        }
      } else {
        throw new Error("Failed to save changes");
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle checklist item toggle
  const handleCheckboxToggle = (itemId: string) => {
    setRecommendations(prev => 
      prev.map(item => 
        item.id === itemId ? { ...item, checked: !item.checked } : item
      )
    )
  }

  // Generate/Regenerate questions for classification
  const handleGenerateQuestions = async (classification?: string) => {
    const targetClassification = classification || activeClassification
    // Ensure classification is a valid non-empty string
    if (!targetClassification || typeof targetClassification !== 'string' || targetClassification.trim() === '') {
      toast({ title: "No Classification Selected", description: "Please select a classification to generate questions.", variant: "destructive" })
      return
    }
    setGeneratingClassification(targetClassification)
    setGeneratingQuestions(true)
    try {
      const base = import.meta.env.VITE_APIURL
      // Ensure all required fields are present and valid before sanitizing
      const payloadData = {
        engagementId: engagement?._id,
        materiality: procedure?.materiality,
        classification: String(targetClassification).trim(), // Ensure it's a string
        validitySelections: Array.isArray(procedure?.validitySelections) ? procedure.validitySelections : [],
      };
      
      // Validate required fields
      if (!payloadData.engagementId || !payloadData.classification) {
        throw new Error("Missing required fields: engagementId or classification");
      }
      
      // Sanitize payload before sending
      const payload = sanitizeForJSON(payloadData);
      
      // Double-check classification is still present after sanitization
      if (!payload || !payload.classification) {
        console.error("Payload after sanitization:", payload);
        console.error("Original targetClassification:", targetClassification);
        throw new Error("Classification was removed during sanitization");
      }
      
      // Log the payload being sent for debugging
      console.log("Sending generate questions request with classification:", payload.classification);
      
      const res = await authFetch(`${base}/api/procedures/ai/classification-questions`, {
        method: "POST",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorText = await res.text().catch(() => "")
        let errorMessage = "Failed to generate AI questions";
        
        if (errorText) {
          try {
            const errorData = errorText.startsWith("{") ? JSON.parse(errorText) : { message: errorText };
            errorMessage = errorData.error || errorData.message || errorText.slice(0, 200);
          } catch {
            errorMessage = errorText.slice(0, 200);
          }
        }
        
        // Check for quota errors
        if (res.status === 429 || errorMessage.toLowerCase().includes("quota")) {
          errorMessage = "OpenAI API quota exceeded. Please check your OpenAI account billing and quota limits.";
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json()
      const newQuestions = (Array.isArray(data?.aiQuestions) ? data.aiQuestions : []).map((q: any, i: number) => {
        const __uid = q.__uid || q.id || q._id || `q_${Math.random().toString(36).slice(2, 10)}_${i}`
        const id = q.id ?? __uid
        const key = q.key || q.aiKey || `q${i + 1}`
        return { ...q, __uid, id, key, classification: targetClassification }
      })

      // Set flag to prevent useEffect from resetting localQuestions
      isGeneratingRef.current = true
      
      setLocalQuestions(prev => {
        const filtered = prev.filter(q => q.classification !== targetClassification)
        return [...filtered, ...newQuestions]
      })

      // Auto-save after generating questions (without triggering onProcedureUpdate)
      try {
        const base = import.meta.env.VITE_APIURL
        const url = activeClassification?`${base}/api/procedures/${engagement._id}/section`:`${base}/api/procedures/${engagement._id}`
        
        // Prepare recommendations
        let finalRecommendations = recommendations
        if (activeClassification && Array.isArray(procedure?.recommendations)) {
          const otherClassificationRecommendations = procedure.recommendations.filter(
            (item: ChecklistItem) => item.classification !== activeClassification
          )
          finalRecommendations = [...otherClassificationRecommendations, ...recommendations]
        }
        
        const updatedLocalQuestions = localQuestions.filter(q => q.classification !== targetClassification).concat(newQuestions)
        
        // Sanitize and save
        const sanitizedProcedure = sanitizeForJSON({
          ...procedure,
          status: "completed",
          questions: updatedLocalQuestions,
          recommendations: finalRecommendations,
        })
        
        const response = await authFetch(url, {
          method: "POST",
          body: JSON.stringify(sanitizedProcedure),
        })
        
        if (response.ok) {
          toast({
            title: "Questions Saved",
            description: "Questions have been saved successfully.",
          })
          // Don't call onProcedureUpdate to prevent reload
        } else {
          throw new Error("Failed to save questions")
        }
        
        // Reset flag after save completes
        setTimeout(() => {
          isGeneratingRef.current = false
        }, 1000)
      } catch (error) {
        console.error("Failed to auto-save after generating questions:", error)
        isGeneratingRef.current = false
      }

      toast({
        title: "AI Questions Ready",
        description: `Generated ${newQuestions.length} questions for ${formatClassificationForDisplay(targetClassification)}.`,
      })
    } catch (e: any) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" })
    } finally {
      setGeneratingClassification(null)
      setGeneratingQuestions(false)
    }
  }

  // Generate/Regenerate answers
  const handleGenerateAnswers = async (classification?: string) => {
    // Debug: Log all classification values
    console.log("handleGenerateAnswers - classification parameter:", classification);
    console.log("handleGenerateAnswers - currentClassification prop:", currentClassification);
    console.log("handleGenerateAnswers - selectedClassification state:", selectedClassification);
    console.log("handleGenerateAnswers - activeClassification:", activeClassification);
    
    const targetClassification = classification || activeClassification
    
    console.log("handleGenerateAnswers - targetClassification:", targetClassification);
    console.log("handleGenerateAnswers - targetClassification type:", typeof targetClassification);
    
    // Ensure classification is a valid non-empty string
    if (!targetClassification || typeof targetClassification !== 'string' || targetClassification.trim() === '') {
      console.error("handleGenerateAnswers - Classification validation failed:", {
        targetClassification,
        type: typeof targetClassification,
        trimmed: targetClassification?.trim(),
        currentClassification,
        selectedClassification,
        activeClassification
      });
      toast({ title: "No Classification Selected", description: "Please select a classification to generate answers.", variant: "destructive" })
      return
    }
    setGeneratingAnswers(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const questionsForClassification = localQuestions.filter((q: any) => q.classification === targetClassification)
      
      // Check if there are any questions at all
      if (questionsForClassification.length === 0) {
        toast({ title: "No Questions", description: "Please generate questions first before generating answers.", variant: "destructive" })
        setGeneratingAnswers(false)
        return
      }
      
      const questionsWithoutAnswers = questionsForClassification
        .filter((q: any) => !q.answer || q.answer.trim() === "")

      if (questionsWithoutAnswers.length === 0) {
        toast({ title: "Info", description: "All questions already have answers." })
        setGeneratingAnswers(false)
        return
      }

      // Sanitize questions before sending
      const sanitizedQuestions = questionsWithoutAnswers
        .map(({ answer, __uid, ...rest }) => sanitizeForJSON(rest))
        .filter((q: any) => q !== undefined);
      
      const res = await authFetch(`${base}/api/procedures/ai/classification-answers`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement._id,
          questions: sanitizedQuestions,
        }),
      })

      if (!res.ok) throw new Error("Failed to generate answers")

      const data = await res.json()
      let updatedQuestions = [...localQuestions]

      if (Array.isArray(data?.aiAnswers)) {
        const answerMap = new Map<string, string>()
        data.aiAnswers.forEach((a: any) => {
          const k = String(a?.key || "").trim().toLowerCase()
          if (k) answerMap.set(k, a?.answer || "")
        })
        updatedQuestions = localQuestions.map((q: any) => {
          // Only update answers for questions in the target classification
          if (q.classification === targetClassification) {
            const k = String(q.key || "").trim().toLowerCase()
            return answerMap.has(k) ? { ...q, answer: answerMap.get(k) || "" } : q
          }
          return q
        })
      } else if (Array.isArray(data?.questions)) {
        // Replace questions for this classification with updated ones
        const otherQuestions = localQuestions.filter((q: any) => q.classification !== targetClassification)
        const updatedClassificationQuestions = data.questions.map((q: any, i: number) => {
          const __uid = q.__uid || q.id || q._id || `q_${Math.random().toString(36).slice(2, 10)}_${i}`
          const id = q.id ?? __uid
          const key = q.key || q.aiKey || `q${i + 1}`
          return { ...q, __uid, id, key, classification: targetClassification }
        })
        updatedQuestions = [...otherQuestions, ...updatedClassificationQuestions]
      }

      // Set flag to prevent useEffect from resetting localQuestions
      isGeneratingRef.current = true
      
      setLocalQuestions(updatedQuestions)
      
      // Ensure we stay on the answers tab after generating
      // Use both state and ref to ensure it persists through re-renders
      setActiveTab("answers")
      activeTabRef.current = "answers"

      // Auto-save after generating answers (but don't trigger onProcedureUpdate to prevent reload)
      try {
        const base = import.meta.env.VITE_APIURL
        const url = activeClassification?`${base}/api/procedures/${engagement._id}/section`:`${base}/api/procedures/${engagement._id}`
        
        // Prepare recommendations
        let finalRecommendations = recommendations
        if (activeClassification && Array.isArray(procedure?.recommendations)) {
          const otherClassificationRecommendations = procedure.recommendations.filter(
            (item: ChecklistItem) => item.classification !== activeClassification
          )
          finalRecommendations = [...otherClassificationRecommendations, ...recommendations]
        }
        
        // Sanitize and save
        const sanitizedProcedure = sanitizeForJSON({
          ...procedure,
          status: "completed",
          questions: updatedQuestions,
          recommendations: finalRecommendations,
        })
        
        const response = await authFetch(url, {
          method: "POST",
          body: JSON.stringify(sanitizedProcedure),
        })
        
        if (response.ok) {
          toast({
            title: "Answers Saved",
            description: "Answers have been saved successfully.",
          })
          // Don't call onProcedureUpdate here to prevent reload that resets state
          // The parent will reload when user navigates away or manually refreshes
        } else {
          throw new Error("Failed to save answers")
        }
        
        // Reset flag after save completes
        setTimeout(() => {
          isGeneratingRef.current = false
        }, 1000)
      } catch (error) {
        console.error("Failed to auto-save after generating answers:", error)
        isGeneratingRef.current = false
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
      await handleSaveAllChanges()
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

  // Generate/Regenerate procedures (recommendations)
  const handleGenerateProcedures = async (classification?: string) => {
    // Debug: Log all classification values
    console.log("handleGenerateProcedures - classification parameter:", classification);
    console.log("handleGenerateProcedures - currentClassification prop:", currentClassification);
    console.log("handleGenerateProcedures - selectedClassification state:", selectedClassification);
    console.log("handleGenerateProcedures - activeClassification:", activeClassification);
    
    const targetClassification = classification || activeClassification
    
    console.log("handleGenerateProcedures - targetClassification:", targetClassification);
    console.log("handleGenerateProcedures - targetClassification type:", typeof targetClassification);
    
    // Ensure classification is a valid non-empty string
    if (!targetClassification || typeof targetClassification !== 'string' || targetClassification.trim() === '') {
      console.error("handleGenerateProcedures - Classification validation failed:", {
        targetClassification,
        type: typeof targetClassification,
        trimmed: targetClassification?.trim(),
        currentClassification,
        selectedClassification,
        activeClassification
      });
      toast({ title: "No Classification Selected", description: "Please select a classification to generate procedures.", variant: "destructive" })
      return
    }
    setGeneratingProcedures(true)
    
    // Switch UI to procedures tab immediately - handle both single and multi-view modes
    setActiveTab("procedures")
    if (classification) {
      setClassificationTabs(prev => ({ ...prev, [classification]: "procedures" }))
    }
    
    try {
      // First ensure we have answers
      const questionsForClassification = localQuestions.filter((q: any) => q.classification === targetClassification)
      if (questionsForClassification.some((q: any) => !q.answer || q.answer.trim() === "")) {
        await handleGenerateAnswers(targetClassification)
      }

      // Generate recommendations
      const base = import.meta.env.VITE_APIURL
      const questionsWithAnswersForClassification = questionsForClassification.filter((q: any) => q.answer && q.answer.trim() !== "")
      // Sanitize questions before sending
      const sanitizedQuestions = questionsWithAnswersForClassification
        .map(({ __uid, ...rest }) => sanitizeForJSON(rest))
        .filter((q: any) => q !== undefined);
      
      const res = await authFetch(`${base}/api/procedures/recommendations`, {
        method: "POST",
        body: JSON.stringify({
          engagementId: engagement._id,
          procedureId: procedure._id,
          framework: procedure.framework || "IFRS",
          classifications: [targetClassification],
          questions: sanitizedQuestions,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        let recs: ChecklistItem[] = []
        
        if (Array.isArray(data.recommendations)) {
          // If it's already an array, ensure each item has the classification
          recs = data.recommendations.map((rec: any) => {
            if (typeof rec === 'string') {
              return {
                id: `rec-${Date.now()}-${Math.random()}`,
                text: rec.trim(),
                checked: false,
                classification: targetClassification
              }
            }
            // Ensure existing items have classification
            return {
              ...rec,
              classification: rec.classification || targetClassification,
              id: rec.id || rec.__uid || `rec-${Date.now()}-${Math.random()}`
            }
          })
        } else if (typeof data.recommendations === "string") {
          // Convert string to checklist items
          recs = data.recommendations.split("\n")
            .filter((l: string) => l.trim())
            .map((text: string, idx: number) => ({
              id: `rec-${Date.now()}-${idx}`,
              text: text.trim(),
              checked: false,
              classification: targetClassification
            }))
        }
        
        // Update recommendations - merge with existing ones for other classifications
        if (currentClassification) {
          // Single classification view: replace all
          setRecommendations(recs)
        } else {
          // Multi-classification view: merge with existing ones
          setRecommendations(prev => {
            const otherRecs = prev.filter((r: any) => r.classification !== targetClassification)
            return [...otherRecs, ...recs]
          })
        }
        
        // Set flag to prevent useEffect from resetting localQuestions
        isGeneratingRef.current = true
        
        // Auto-save after generating procedures (without triggering onProcedureUpdate)
        try {
          const base = import.meta.env.VITE_APIURL
          const url = activeClassification?`${base}/api/procedures/${engagement._id}/section`:`${base}/api/procedures/${engagement._id}`
          
          // Prepare recommendations (use the updated recs from above)
          let finalRecommendations = recs
          if (activeClassification && Array.isArray(procedure?.recommendations)) {
            const otherClassificationRecommendations = procedure.recommendations.filter(
              (item: ChecklistItem) => item.classification !== activeClassification
            )
            finalRecommendations = [...otherClassificationRecommendations, ...recs]
          }
          
          // Sanitize and save
          const sanitizedProcedure = sanitizeForJSON({
            ...procedure,
            status: "completed",
            questions: localQuestions, // Use current localQuestions (which should have answers)
            recommendations: finalRecommendations,
          })
          
          const response = await authFetch(url, {
            method: "POST",
            body: JSON.stringify(sanitizedProcedure),
          })
          
          if (response.ok) {
            toast({
              title: "Procedures Saved",
              description: "Procedures have been saved successfully.",
            })
            // Don't call onProcedureUpdate to prevent reload
          } else {
            throw new Error("Failed to save procedures")
          }
          
          // Reset flag after save completes
          setTimeout(() => {
            isGeneratingRef.current = false
          }, 1000)
        } catch (error) {
          console.error("Failed to auto-save after generating procedures:", error)
          isGeneratingRef.current = false
        }

        toast({
          title: "Procedures Generated",
          description: `Generated ${recs.length} recommendations for ${formatClassificationForDisplay(targetClassification)}.`,
        })
      } else {
        const errorText = await res.text().catch(() => "")
        throw new Error(errorText || "Failed to generate recommendations")
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

  // Review functions

  const handleSaveReview = async () => {
    setIsSavingReview(true)
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) throw new Error("VITE_APIURL is not set")
      
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
      
      const updatedProcedure = {
        ...procedure,
        reviewStatus: reviewStatus,
        reviewComments: reviewComments,
        questions: localQuestions.map(({ __uid, ...rest }) => rest),
        // Auto-populated fields based on status
        ...autoFields,
      }

      const response = await authFetch(`${base}/api/procedures/${engagement._id}`, {
        method: "POST",
        body: JSON.stringify(updatedProcedure),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        const errorMessage = text || `Failed to save review (HTTP ${response.status})`
        throw new Error(errorMessage)
      }

      // Update reviewVersion state after successful save
      setReviewVersion(currentVersion)

      if (onProcedureUpdate) {
        const savedData = await response.json()
        onProcedureUpdate(savedData.procedure || savedData)
      }

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

  // Check if user owns a review
  const isReviewOwner = (review: any) => {
    if (!currentUserId) return false
    return (
      review.reviewedBy === currentUserId ||
      review.approvedBy === currentUserId ||
      review.signedOffBy === currentUserId ||
      review.reopenedBy === currentUserId ||
      review.assignedReviewer === currentUserId
    )
  }

  // Handle edit review
  const handleEditReview = (review: any) => {
    setEditingReview(review)
    setEditReviewStatus(review.status || '')
    setEditReviewComments(review.reviewComments || '')
    setIsEditDialogOpen(true)
  }

  // Handle update review
  const handleUpdateReview = async () => {
    if (!editingReview) return
    
    setIsUpdatingReview(true)
    try {
      const base = import.meta.env.VITE_APIURL
      const response = await authFetch(`${base}/api/review/workflows/${editingReview._id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: editReviewStatus,
          reviewComments: editReviewComments,
        }),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(text || `Failed to update review (HTTP ${response.status})`)
      }

      await fetchReviews()
      setIsEditDialogOpen(false)
      setEditingReview(null)
      
      toast({
        title: "Review Updated",
        description: "Your review has been updated successfully.",
      })
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
    if (!confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      return
    }

    setIsDeletingReview(reviewId)
    try {
      const base = import.meta.env.VITE_APIURL
      const response = await authFetch(`${base}/api/review/workflows/${reviewId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(text || `Failed to delete review (HTTP ${response.status})`)
      }

      await fetchReviews()
      
      toast({
        title: "Review Deleted",
        description: "Your review has been deleted successfully.",
      })
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



  // PDF export (still includes just this classification)
  const handleExportPDF = async () => {
    try {
      const [{ default: jsPDF }] = await Promise.all([import("jspdf")])
      const autoTable = (await import("jspdf-autotable")).default

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 14

      const addFooter = () => {
        const pageCount = doc.getNumberOfPages()
        doc.setFontSize(8)
        doc.setTextColor(120)
        doc.setFont("helvetica", "normal")
        const footerY = pageHeight - 8
        doc.text(
          "Confidential — For audit purposes only. Unauthorized sharing is prohibited.",
          margin,
          footerY
        )
        doc.text(`Page ${pageCount}`, pageWidth - margin, footerY, { align: "right" })
      }

      doc.setFillColor(245, 246, 248)
      doc.rect(0, 0, pageWidth, pageHeight, "F")
      doc.setFont("helvetica", "bold")
      doc.setTextColor(20)
      doc.setFontSize(18)
      doc.text("Audit Procedures Report", margin, 40)

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.text(`Engagement: ${safeTitle}`, margin, 55)
      doc.text(`Mode: ${(procedure?.mode || "").toUpperCase() || "N/A"}`, margin, 63)
      doc.text(`Materiality: ${formatCurrency(procedure?.materiality || 0)}`, margin, 71)
      doc.text(`Year End: ${yearEndStr}`, margin, 79)
      if (activeClassification) {
        doc.text(`Classification: ${activeClassification}`, margin, 87)
      }

      doc.setDrawColor(200)
      doc.line(margin, 96, pageWidth - margin, 96)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text("Summary", margin, 110)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      doc.text(`Total Procedures: ${filteredQuestions?.length || 0}`, margin, 120)
      doc.text(`Valid Items: ${validCount}`, margin, 128)

      addFooter()

      doc.addPage()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text(
        `Procedures — ${activeClassification ? activeClassification : "All"}`,
        margin,
        20
      )

      const body = filteredQuestions.map((q: any, idx: number) => [
        String(idx + 1),
        q.question || "",
        q.answer ? String(q.answer) : "",
      ])

      // @ts-ignore
      autoTable(doc, {
        startY: 26,
        head: [["#", "Question", "Answer"]],
        body,
        styles: { font: "helvetica", fontSize: 9, cellPadding: 2, valign: "top" },
        headStyles: { fillColor: [240, 240, 240], textColor: 20, halign: "left" },
        margin: { left: margin, right: margin },
        didDrawPage: addFooter,
      })

      doc.addPage()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text(
        `Audit Recommendations${activeClassification ? ` — ${formatClassificationForDisplay(activeClassification)}` : ""
        }`,
        margin,
        20
      )

      const strip = (s: string) =>
        s
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/__(.*?)__/g, "$1")
          .replace(/_(.*?)_/g, "$1")
          .replace(/`(.*?)`/g, "$1")
          .replace(/\s+/g, " ")
          .trim()

      // Convert checklist items to display format for PDF
      const recommendationsText = recommendations.length > 0 
        ? recommendations.map(item => `${item.checked ? '[x]' : '[ ]'} ${item.text}`).join('\n')
        : "No recommendations provided."

      const lines = recommendationsText.split(/\r?\n/)
      let y = 30
      const write = (text: string, bold = false, size = 11) => {
        doc.setFont("helvetica", bold ? "bold" : "normal")
        doc.setFontSize(size)
        const wrapped = doc.splitTextToSize(text, pageWidth - 2 * margin)
        if (y + wrapped.length * 6 > pageHeight - margin) {
          addFooter()
          doc.addPage()
          y = 20
        }
        doc.text(wrapped, margin, y)
        y += wrapped.length * 6
      }

      for (const raw of lines) {
        const line = raw.trim()
        if (!line) {
          y += 6
          continue
        }
        if (line.startsWith("### ")) {
          write(strip(line.replace(/^###\s*/, "")), true, 13)
          y += 2
          continue
        }
        if (line.startsWith("#### ")) {
          write(strip(line.replace(/^####\s*/, "")), true, 12)
          y += 2
          continue
        }
        if (line.startsWith("- ")) {
          const indentX = margin + 6
          const avail = pageWidth - indentX - margin
          const wrapped = doc.splitTextToSize(strip(line.slice(2)), avail)
          if (y + wrapped.length * 6 > pageHeight - margin) {
            addFooter()
            doc.addPage()
            y = 20
          }
          doc.text("•", margin, y)
          wrapped.forEach((w, i) => doc.text(w, indentX, y + i * 6))
          y += wrapped.length * 6
          continue
        }
        write(strip(line))
      }

      addFooter()
      const date = new Date()
      const fname = `Audit_Procedures_${safeTitle
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60)}_${date.toISOString().slice(0, 10)}.pdf`
      doc.save(fname)
      toast({ title: "Exported", description: `${fname} has been downloaded.` })
    } catch (err: any) {
      console.error(err)
      toast({
        title: "Export failed",
        description: err?.message || "Could not export the PDF.",
        variant: "destructive",
      })
    }
  }

  // Get questions for a specific classification
  const getQuestionsForClassification = (classification: string) => {
    return localQuestions.filter((q: any) => q.classification === classification)
  }

  // Get questions with answers for a specific classification
  const getQuestionsWithAnswersForClassification = (classification: string) => {
    return getQuestionsForClassification(classification).filter((q: any) => q.answer && q.answer.trim() !== "")
  }

  // Get recommendations for a specific classification
  // Use local recommendations state (which includes newly generated ones) instead of procedure.recommendations
  const getRecommendationsForClassification = (classification: string) => {
    // First check local state (includes newly generated recommendations)
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      const fromLocal = recommendations.filter((item: ChecklistItem) => 
        item.classification === classification
      )
      if (fromLocal.length > 0) return fromLocal
    }
    
    // Fallback to procedure.recommendations if local state is empty
    if (!procedure?.recommendations) return []
    if (Array.isArray(procedure.recommendations)) {
      return procedure.recommendations.filter((item: ChecklistItem) => 
        item.classification === classification
      )
    }
    return []
  }

  // Handle add question for a specific classification
  const handleAddQuestionForClassification = (classification: string) => {
    const newQuestion = {
      id: `new-${Date.now()}`,
      question: "New question",
      answer: "",
      classification: classification,
      isValid: false
    }
    setLocalQuestions(prev => [...prev, newQuestion])
    setEditingQuestionId(newQuestion.id)
    setEditQuestionText(newQuestion.question)
    setEditAnswerText(newQuestion.answer)
  }

  // --- SUB-COMPONENT: SINGLE VIEW CONTENT ---
  const renderSingleView = () => (
    <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {formatClassificationForDisplay(currentClassification)}
                </CardTitle>
                <div className="text-sm text-muted-foreground mt-1">
                  {safeTitle} • Mode: {(procedure?.mode || "").toUpperCase() || "N/A"} • Materiality:{" "}
                  {formatCurrency(procedure?.materiality)} • Year End: {yearEndStr}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const classificationToUse = currentClassification || activeClassification;
                  if (classificationToUse) {
                    handleGenerateQuestions(classificationToUse);
                  } else {
                    toast({ title: "No Classification", description: "Please select a classification first.", variant: "destructive" });
                  }
                }}
                disabled={!!generatingClassification}
              >
                {generatingClassification === (currentClassification || activeClassification) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Questions
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => {
                setActiveTab(value)
                activeTabRef.current = value
              }} 
              className="w-full"
            >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="answers">Answers</TabsTrigger>
              <TabsTrigger value="procedures">Procedures</TabsTrigger>
            </TabsList>
            
            <TabsContent value="questions" className="space-y-3 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleAddQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
                <div className="flex gap-2">
                  {filteredQuestions.length > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const classificationToUse = currentClassification || activeClassification;
                        if (classificationToUse) {
                          handleGenerateQuestions(classificationToUse);
                        } else {
                          toast({ title: "No Classification", description: "Please select a classification first.", variant: "destructive" });
                        }
                      }}
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
                      onClick={() => {
                        const classificationToUse = currentClassification || activeClassification;
                        if (classificationToUse) {
                          handleGenerateQuestions(classificationToUse);
                        } else {
                          toast({ title: "No Classification", description: "Please select a classification first.", variant: "destructive" });
                        }
                      }}
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
                  <Button variant="outline" size="sm" onClick={handleExportPDF}>
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveAllChanges}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {filteredQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No questions available. Click "Generate Questions" or "Add Question" to create one.
                    </div>
                  ) : (
                    filteredQuestions.map((q: any, idx: number) => (
                      <Card key={q.id || idx}>
                        <CardContent className="pt-6">
                          {editingQuestionId === q.id ? (
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
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteQuestion(q.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              {q.framework && (
                                <Badge className="mr-2 mt-2" variant="default">{q.framework}</Badge>
                              )}
                              {q.reference && (
                                <Badge className="mt-2" variant="default">{q.reference}</Badge>
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
            
            <TabsContent value="answers" className="space-y-3 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  {filteredQuestions.length > 0 ? (
                    questionsWithAnswers.length > 0 ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          const classificationToUse = currentClassification || activeClassification;
                          if (classificationToUse) {
                            handleGenerateAnswers(classificationToUse);
                          } else {
                            toast({ title: "No Classification", description: "Please select a classification first.", variant: "destructive" });
                          }
                        }}
                        disabled={generatingAnswers}
                      >
                        {generatingAnswers ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Regenerate Answers
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          const classificationToUse = currentClassification || activeClassification;
                          if (classificationToUse) {
                            handleGenerateAnswers(classificationToUse);
                          } else {
                            toast({ title: "No Classification", description: "Please select a classification first.", variant: "destructive" });
                          }
                        }}
                        disabled={generatingAnswers}
                      >
                        {generatingAnswers ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        Generate Answers
                      </Button>
                    )
                  ) : (
                    <div className="text-muted-foreground text-sm">No questions added yet.</div>
                  )}
                </div>
                {filteredQuestions.length > 0 && (
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
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {questionsWithAnswers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No answers available. Go to Questions tab to add questions.
                    </div>
                  ) : (
                    questionsWithAnswers.map((q: any, idx: number) => (
                      <Card key={q.id || idx}>
                        <CardContent className="pt-6">
                          <div className="font-medium mb-2">
                            {idx + 1}. {q.question || "—"}
                          </div>
                          {editingAnswerId === q.id ? (
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
                                    setLocalQuestions(prev =>
                                      prev.map(question =>
                                        question.id === q.id
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
                                    setEditingAnswerId(q.id)
                                    setEditAnswerValue(q.answer || "")
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
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
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="procedures" className="space-y-3 mt-4">
              {proceduresViewMode === 'reviews' ? (
                <React.Fragment>
                  <div className="space-y-3 overflow-x-hidden flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '500px', width: '100%', maxWidth: '100%' }}>
                    <div className="flex flex-col gap-2 mb-4 flex-shrink-0 w-full">
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

                      <div className="mb-4 flex-shrink-0 w-full" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                        <div className="flex items-center justify-between mb-2 w-full">
                          <Label htmlFor="review-comments-main" className="flex-shrink-0">Overall Review Comments</Label>
                        </div>
                        <Textarea
                          id="review-comments-main"
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          placeholder="Add your review comments here..."
                          className="min-h-[100px] max-h-[200px] mt-2 w-full resize-none border border-input focus:border-input focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                          style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}
                        />
                      </div>

                      <ScrollArea className="h-[500px] border rounded-md p-4">
                        <div className="space-y-6">
                          {/* Reviews List Section */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-md font-semibold flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Reviews ({reviews.filter((r) => r.classification === currentClassification || !r.classification).length} reviews)
                              </h5>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchReviews}
                                disabled={isLoadingReviews}
                              >
                                {isLoadingReviews ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Refresh
                              </Button>
                            </div>
                            
                            {isLoadingReviews ? (
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="text-center text-muted-foreground py-8">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                    Loading reviews...
                                  </div>
                                </CardContent>
                              </Card>
                            ) : reviews.filter((r) => r.classification === currentClassification || !r.classification).length === 0 ? (
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="text-center text-muted-foreground py-8">
                                    No reviews found for this engagement.
                                  </div>
                                </CardContent>
                              </Card>
                            ) : (
                              reviews
                                .filter((r) => r.classification === currentClassification || !r.classification)
                                .map((review: any, idx: number) => {
                                const statusColors: Record<string, string> = {
                                  'in-progress': 'bg-gray-100 text-gray-800',
                                  'ready-for-review': 'bg-blue-100 text-blue-800',
                                  'under-review': 'bg-yellow-100 text-yellow-800',
                                  'approved': 'bg-green-100 text-green-800',
                                  'rejected': 'bg-red-100 text-red-800',
                                  'signed-off': 'bg-purple-100 text-purple-800',
                                  're-opened': 'bg-orange-100 text-orange-800',
                                }
                                
                                const isOwner = isReviewOwner(review)
                                
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
                                                // Determine reviewer based on status
                                                let reviewerId = null
                                                if (review.status === 'approved') {
                                                  reviewerId = review.approvedBy || review.reviewedBy || review.assignedReviewer
                                                } else if (review.status === 'signed-off') {
                                                  reviewerId = review.signedOffBy || review.approvedBy || review.reviewedBy || review.assignedReviewer
                                                } else if (review.status === 're-opened') {
                                                  reviewerId = review.reopenedBy || review.reviewedBy || review.assignedReviewer
                                                } else if (review.status === 'ready-for-review' || review.status === 'under-review') {
                                                  reviewerId = review.reviewedBy || review.assignedReviewer
                                                } else {
                                                  reviewerId = review.reviewedBy || review.assignedReviewer
                                                }
                                                return reviewerId ? (userNamesMap[reviewerId] || reviewerId) : 'Not assigned'
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
                                )
                              })
                            )}
                          </div>
                        </div>
                      </ScrollArea>
                  </div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold">Audit Recommendations</h4>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => setProceduresViewMode('reviews')}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Reviews
                          </Button>
                          {filteredQuestions.length > 0 && questionsWithAnswers.length > 0 ? (
                            recommendations.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const classificationToUse = currentClassification || activeClassification;
                                  if (classificationToUse) {
                                    handleGenerateProcedures(classificationToUse);
                                  } else {
                                    toast({ title: "No Classification", description: "Please select a classification first.", variant: "destructive" });
                                  }
                                }}
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
                                onClick={() => {
                                  const classificationToUse = currentClassification || activeClassification;
                                  if (classificationToUse) {
                                    handleGenerateProcedures(classificationToUse);
                                  } else {
                                    toast({ title: "No Classification", description: "Please select a classification first.", variant: "destructive" });
                                  }
                                }}
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
                            <div className="text-muted-foreground text-sm">
                              {filteredQuestions.length === 0 ? "Generate questions first." : "Generate answers first."}
                            </div>
                          )}
                          <Button variant="outline" size="sm" onClick={() => {
                            const newRec = {
                              id: `rec-${Date.now()}`,
                              text: "New recommendation",
                              checked: false,
                              classification: activeClassification
                            }
                            setRecommendations(prev => [...prev, newRec])
                          }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Procedures
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={handleSaveAllChanges}
                            disabled={isSaving || filteredQuestions.length === 0 || questionsWithAnswers.length === 0 || !activeClassification}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Save Procedures
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="h-[500px]">
                        <div className="space-y-4">
                          {recommendations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No recommendations generated yet. Click "Add Recommendation" to create one.
                            </div>
                          ) : (
                            recommendations.map((rec: any, idx: number) => {
                              const recId = rec.id || rec.__uid || `rec-${idx}`
                              const recText = typeof rec === 'string' 
                                ? rec 
                                : rec.text || rec.content || "—"
                              const isEditing = editingQuestionId === `rec-${recId}`
                              const editText = editQuestionText || recText
                              
                              return (
                                <Card key={recId}>
                                  <CardContent className="pt-6">
                                    {isEditing ? (
                                      <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                          <div className="font-medium">{idx + 1}.</div>
                                          <div className="flex gap-2">
                                            <Button size="sm" onClick={() => {
                                              setRecommendations(prev =>
                                                prev.map((r: any, i: number) => {
                                                  const rId = r.id || r.__uid || `rec-${i}`
                                                  if (rId === recId) {
                                                    if (typeof r === 'string') {
                                                      return editText
                                                    }
                                                    return { ...r, text: editText }
                                                  }
                                                  return r
                                                })
                                              )
                                              setEditingQuestionId(null)
                                              setEditQuestionText("")
                                            }}>
                                              <Save className="h-4 w-4 mr-1" />
                                              Save
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => {
                                              setEditingQuestionId(null)
                                              setEditQuestionText("")
                                            }}>
                                              <X className="h-4 w-4 mr-1" />
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                        <Textarea
                                          value={editText}
                                          onChange={(e) => setEditQuestionText(e.target.value)}
                                          placeholder="Recommendation"
                                          className="min-h-[100px]"
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex justify-between items-start">
                                          <div className="flex items-start space-x-3 flex-1">
                                            <Checkbox
                                              checked={rec.checked || false}
                                              onCheckedChange={() => handleCheckboxToggle(recId)}
                                              className="mt-1"
                                            />
                                            <span className={rec.checked ? "line-through text-muted-foreground flex-1" : "font-medium mb-2 text-black flex-1"}>
                                              {recText}
                                            </span>
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setEditingQuestionId(`rec-${recId}`)
                                                setEditQuestionText(recText)
                                              }}
                                            >
                                              <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setRecommendations(prev => prev.filter((r: any, i: number) => {
                                                  const rId = r.id || r.__uid || `rec-${i}`
                                                  return rId !== recId
                                                }))
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </CardContent>
                                </Card>
                              )
                            })
                          )}
                        </div>
                      </ScrollArea>
                </React.Fragment>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
  );

  // --- SUB-COMPONENT: MULTI VIEW CONTENT ---
  const renderMultiView = () => (
    <Accordion type="multiple" className="space-y-4">
      {availableClassifications.map((classification, idx) => {
        const activeClassTab = classificationTabs[classification] || "questions";
        const viewMode = classificationProceduresViewMode[classification] || 'procedures';
        const classificationQuestions = getQuestionsForClassification(classification)
        const classificationQuestionsWithAnswers = getQuestionsWithAnswersForClassification(classification)
        const classificationRecommendations = getRecommendationsForClassification(classification)
        const activeClassificationTab = classificationTabs[classification] || "questions"
        const setActiveClassificationTab = (value: string) => {
          setClassificationTabs(prev => ({ ...prev, [classification]: value }))
        }
        // Explicitly check if there are any valid questions to display
        // Filter out any invalid/empty questions to match what's actually displayed
        const validQuestions = classificationQuestions.filter((q: any) => q && (q.question || q.id))
        const hasQuestions = validQuestions.length > 0

        return (
          <AccordionItem key={classification} value={classification} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="text-left">
                <div className="font-heading text-lg">
                  {formatClassificationForDisplay(classification)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {safeTitle} • Mode: {(procedure?.mode || "").toUpperCase() || "N/A"} • Materiality:{" "}
                  {formatCurrency(procedure?.materiality)} • Year End: {yearEndStr}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-4">
              <Tabs value={activeClassificationTab} onValueChange={setActiveClassificationTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="questions">Questions</TabsTrigger>
                      <TabsTrigger value="answers">Answers</TabsTrigger>
                      <TabsTrigger value="procedures">Procedures</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="questions" className="space-y-3 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleAddQuestionForClassification(classification)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Question
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          {hasQuestions ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateQuestions(classification)}
                              disabled={generatingClassification === classification}
                            >
                              {generatingClassification === classification ? (
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
                              onClick={() => handleGenerateQuestions(classification)}
                              disabled={generatingClassification === classification}
                            >
                              {generatingClassification === classification ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <FileText className="h-4 w-4 mr-2" />
                              )}
                              Generate Questions
                            </Button>
                          )}
                        </div>
                      </div>
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {!hasQuestions ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No questions available. Click "Generate Questions" or "Add Question" to create one.
                            </div>
                          ) : (
                            classificationQuestions.map((q: any, idx: number) => (
                              <Card key={q.id || idx}>
                                <CardContent className="pt-6">
                                  {editingQuestionId === q.id ? (
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
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteQuestion(q.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      {q.framework && (
                                        <Badge className="mr-2 mt-2" variant="default">{q.framework}</Badge>
                                      )}
                                      {q.reference && (
                                        <Badge className="mt-2" variant="default">{q.reference}</Badge>
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
                    
                    <TabsContent value="answers" className="space-y-3 mt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                          {classificationQuestions.length > 0 ? (
                            classificationQuestionsWithAnswers.length > 0 ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleGenerateAnswers(classification)}
                                disabled={generatingAnswers}
                              >
                                {generatingAnswers ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Regenerate Answers
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleGenerateAnswers(classification)}
                                disabled={generatingAnswers}
                              >
                                {generatingAnswers ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <FileText className="h-4 w-4 mr-2" />
                                )}
                                Generate Answers
                              </Button>
                            )
                          ) : (
                            <div className="text-muted-foreground text-sm">No questions added yet.</div>
                          )}
                        </div>
                        {classificationQuestions.length > 0 && (
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
                      <ScrollArea className="h-[400px]">
                        <div className="space-y-4">
                          {classificationQuestions.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              No questions available. Go to Questions tab to add questions.
                            </div>
                          ) : (
                            classificationQuestions.map((q: any, idx: number) => (
                              <Card key={q.id || idx}>
                                <CardContent className="pt-6">
                                  <div className="font-medium mb-2">
                                    {idx + 1}. {q.question || "—"}
                                  </div>
                                  {editingAnswerId === q.id ? (
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
                                            setLocalQuestions(prev =>
                                              prev.map(question =>
                                                question.id === q.id
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
                                        {q.answer ? (
                                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {String(q.answer)}
                                          </ReactMarkdown>
                                        ) : (
                                          <span className="italic">No answer.</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingAnswerId(q.id)
                                            setEditAnswerValue(q.answer || "")
                                          }}
                                        >
                                          <Edit className="h-4 w-4 mr-1" />
                                          {q.answer ? "Edit Answer" : "Add Answer"}
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
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                    
                    <TabsContent value="procedures" className="space-y-3 mt-4">
                      {(classificationProceduresViewMode[classification] || 'procedures') === 'reviews' ? (
                        <>
                          <div className="space-y-3 overflow-x-hidden" style={{ width: '100%', maxWidth: '100%' }}>
                          <div className="flex items-center justify-between mb-4 w-full">
                            <div className="flex flex-col gap-2 w-full">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setClassificationProceduresViewMode(prev => ({ ...prev, [classification]: 'procedures' }))}
                                className="w-full"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Back to Procedures
                              </Button>
                              <div className="flex items-center justify-between w-full">
                                <h4 className="text-lg font-semibold">Review Procedures - {formatClassificationForDisplay(classification)}</h4>
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
                          </div>

                          <div className="mb-4 w-full">
                            <div className="flex items-center justify-between mb-2 w-full">
                              <Label htmlFor={`review-comments-${classification}`} className="flex-shrink-0">Overall Review Comments</Label>
                            </div>
                            <Textarea
                              id={`review-comments-${classification}`}
                              value={reviewComments}
                              onChange={(e) => setReviewComments(e.target.value)}
                              placeholder="Add your review comments here..."
                              className="min-h-[100px] max-h-[200px] mt-2 w-full resize-none border border-input focus:border-input focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflowX: 'hidden' }}
                            />
                          </div>

                          <ScrollArea className="h-[500px] border rounded-md p-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between mb-4">
                                <h5 className="text-md font-semibold flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Reviews ({reviews.filter((r) => r.classification === classification || (!r.classification && idx === 0)).length})
                                </h5>
                                <Button variant="outline" size="sm" onClick={fetchReviews} disabled={isLoadingReviews}>
                                  {isLoadingReviews ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                </Button>
                              </div>
                              
                              {reviews
                                .filter((r) => r.classification === classification || (!r.classification && idx === 0))
                                .map((review, rIdx) => (
                                  <Card key={review._id || rIdx}>
                                    <CardContent className="pt-4">
                                      <div className="flex justify-between items-start mb-2">
                                        <Badge>{review.status}</Badge>
                                        {isReviewOwner(review) && (
                                          <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => handleEditReview(review)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteReview(review._id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-sm">{review.reviewComments || "No comment."}</p>
                                    </CardContent>
                                  </Card>
                                ))
                              }
                              {reviews.filter((r) => r.classification === classification || (!r.classification && idx === 0)).length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">No reviews yet.</div>
                              )}
                            </div>
                          </ScrollArea>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-semibold">Audit Recommendations</h4>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => setClassificationProceduresViewMode(prev => ({ ...prev, [classification]: 'reviews' }))}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Reviews
                              </Button>
                              {classificationQuestions.length > 0 && classificationQuestionsWithAnswers.length > 0 ? (
                                classificationRecommendations.length > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleGenerateProcedures(classification)}
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
                                    onClick={() => handleGenerateProcedures(classification)}
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
                                <div className="text-muted-foreground text-sm">
                                  {classificationQuestions.length === 0 ? "Generate questions first." : "Generate answers first."}
                                </div>
                              )}
                              <Button variant="outline" size="sm" onClick={() => {
                                const newRec = {
                                  id: `rec-${Date.now()}`,
                                  text: "New recommendation",
                                  checked: false,
                                  classification: classification
                                }
                                setRecommendations(prev => [...prev, newRec])
                              }}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Procedures
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={handleSaveAllChanges}
                                disabled={isSaving || classificationQuestions.length === 0 || classificationQuestionsWithAnswers.length === 0}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                  <Save className="h-4 w-4 mr-2" />
                                )}
                                Save Procedures
                              </Button>
                            </div>
                          </div>
                          <ScrollArea className="h-[400px]">
                            <div className="space-y-4">
                              {classificationRecommendations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  No recommendations generated yet. Click "Add Recommendation" to create one.
                                </div>
                              ) : (
                                classificationRecommendations.map((rec: any, idx: number) => {
                                  const recId = rec.id || rec.__uid || `rec-${idx}`
                                  const recText = typeof rec === 'string' 
                                    ? rec 
                                    : rec.text || rec.content || "—"
                                  const isEditing = editingQuestionId === `rec-${recId}`
                                  const editText = editQuestionText || recText
                                  
                                  return (
                                    <Card key={recId}>
                                      <CardContent className="pt-6">
                                        {isEditing ? (
                                          <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                              <div className="font-medium">{idx + 1}.</div>
                                              <div className="flex gap-2">
                                                <Button size="sm" onClick={() => {
                                                  setRecommendations(prev =>
                                                    prev.map((r: any, i: number) => {
                                                      const rId = r.id || r.__uid || `rec-${i}`
                                                      if (rId === recId) {
                                                        if (typeof r === 'string') {
                                                          return editText
                                                        }
                                                        return { ...r, text: editText }
                                                      }
                                                      return r
                                                    })
                                                  )
                                                  setEditingQuestionId(null)
                                                  setEditQuestionText("")
                                                }}>
                                                  <Save className="h-4 w-4 mr-1" />
                                                  Save
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => {
                                                  setEditingQuestionId(null)
                                                  setEditQuestionText("")
                                                }}>
                                                  <X className="h-4 w-4 mr-1" />
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                            <Textarea
                                              value={editText}
                                              onChange={(e) => setEditQuestionText(e.target.value)}
                                              placeholder="Recommendation"
                                              className="min-h-[100px]"
                                            />
                                          </div>
                                        ) : (
                                          <>
                                            <div className="flex justify-between items-start">
                                              <div className="flex items-start space-x-3 flex-1">
                                                <Checkbox
                                                  checked={rec.checked || false}
                                                  onCheckedChange={() => handleCheckboxToggle(recId)}
                                                  className="mt-1"
                                                />
                                                <span className={rec.checked ? "line-through text-muted-foreground flex-1" : "font-medium mb-2 text-black flex-1"}>
                                                  {recText}
                                                </span>
                                              </div>
                                              <div className="flex gap-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    setEditingQuestionId(`rec-${recId}`)
                                                    setEditQuestionText(recText)
                                                  }}
                                                >
                                                  <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    setRecommendations(prev => prev.filter((r: any, i: number) => {
                                                      const rId = r.id || r.__uid || `rec-${i}`
                                                      return rId !== recId
                                                    }))
                                                  }}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          </>
                                        )}
                                      </CardContent>
                                    </Card>
                                  )
                                })
                              )}
                            </div>
                          </ScrollArea>
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            );
          })}
    </Accordion>
  );

  // --- FINAL SINGLE RETURN ---
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground font-body">
        Step-1: Generate questions for each classification separately. You can freely edit / add / remove questions here before moving to the next step.
      </div>

      {currentClassification ? renderSingleView() : renderMultiView()}

      {/* SHARED COMPONENTS - Always Rendered */}
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

      <FloatingNotesButton onClick={() => setIsNotesOpen(true)} isOpen={isNotesOpen} />
      
      <NotebookInterface
        isOpen={isNotesOpen}
        isEditable={true}
        isPlanning={false}
        onClose={() => setIsNotesOpen(false)}
        recommendations={recommendations}
        onSave={(content) => {
          setRecommendations(content as ChecklistItem[])
        }}
      />
    </div>
  )
}

export default ProcedureView