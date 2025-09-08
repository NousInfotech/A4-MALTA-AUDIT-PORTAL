// @ts-nocheck
import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download, Edit, Save, X, Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import FloatingNotesButton from "./FloatingNotesButton"
import NotebookInterface from "./NotebookInterface"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { supabase } from "@/integrations/supabase/client"

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

interface ProcedureViewProps {
  procedure: any
  engagement: any
  onRegenerate?: () => void
  /** when provided, this component shows only this classification's procedures & recs */
  currentClassification?: string
}

export const ProcedureView: React.FC<ProcedureViewProps> = ({
  procedure,
  engagement,
  onRegenerate,
  currentClassification,
}) => {
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const { toast } = useToast()
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editQuestionText, setEditQuestionText] = useState("")
  const [editAnswerText, setEditAnswerText] = useState("")
  const [localQuestions, setLocalQuestions] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Initialize local questions when procedure changes
  React.useEffect(() => {
    if (procedure?.questions) {
      setLocalQuestions([...procedure.questions])
    }
  }, [procedure?.questions])

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
    const top = parts[0]
    if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
    return top
  }

  // ✅ filter questions to this classification
  const filteredQuestions = useMemo(() => {
    const all = Array.isArray(localQuestions) ? localQuestions : []
    if (!currentClassification) return all
    return all.filter((q: any) => q.classification === currentClassification)
  }, [localQuestions, currentClassification])

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

  const validCount = filteredQuestions?.filter((q: any) => q?.isValid)?.length || 0

  const recommendationsForClass = React.useMemo(() => {
  const text = typeof procedure?.recommendations === "string" ? procedure.recommendations : ""
  const byClassFromServer = splitRecommendationsByClassification(text)

  if (!currentClassification) {
    // If no current classification, return the whole string (fallback behavior)
    return text
  }

  // Ensure we're matching the exact full path
  const normalizeClassification = (s: string) => s.toLowerCase().trim()

  // 1) Exact match on full classification path
  if (byClassFromServer[currentClassification]) {
    return byClassFromServer[currentClassification]
  }

  // 2) Try matching even with minor variations
  for (const key of Object.keys(byClassFromServer)) {
    if (normalizeClassification(key) === normalizeClassification(currentClassification)) {
      return byClassFromServer[key]
    }
  }

  // 3) Last resort: Try suffix match for deeper parts of the classification (e.g., "Cash & Cash Equivalents")
  const leaf = currentClassification.split(">").pop()?.trim() || ""
  const wantLeaf = normalizeClassification(leaf)
  for (const key of Object.keys(byClassFromServer)) {
    const keyLeaf = normalizeClassification(key.split(">").pop() || key)
    if (keyLeaf === wantLeaf) {
      return byClassFromServer[key]
    }
  }

  // 4) Nothing found: Empty or fallback to full text (you can adjust this fallback)
  return ""
}, [procedure?.recommendations, currentClassification])

  // state to allow in-place editing from the notebook
  const [recommendations, setRecommendations] = useState<string>(recommendationsForClass)
  React.useEffect(() => {
    setRecommendations(recommendationsForClass)
  }, [recommendationsForClass])

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
      classification: currentClassification || "General",
      isValid: false
    }
    
    setLocalQuestions(prev => [...prev, newQuestion])
    setEditingQuestionId(newQuestion.id)
    setEditQuestionText(newQuestion.question)
    setEditAnswerText(newQuestion.answer)
  }

  const handleSaveAllChanges = async () => {
    setIsSaving(true)
    try {
      const base = import.meta.env.VITE_APIURL
      if(currentClassification)
      {
        const response = await authFetch(`${base}/api/procedures/${engagement._id}`, {
        method: "POST",
        body: JSON.stringify({
          ...procedure,
          questions: localQuestions,
        }),
      })
      if (response.ok) {
        toast({
          title: "Changes Saved",
          description: "All changes have been saved successfully.",
        })
      } else {
        throw new Error("Failed to save changes")
      }
      }
      else{
              const response = await authFetch(`${base}/api/procedures/${engagement._id}`, {
        method: "POST",
        body: JSON.stringify({
          ...procedure,
          questions: localQuestions,
          recommendations: recommendations
        }),
      })
      if (response.ok) {
        toast({
          title: "Changes Saved",
          description: "All changes have been saved successfully.",
        })
      } else {
        throw new Error("Failed to save changes")
      }
      }

    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Could not save changes.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
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
      doc.text(`Materiality: ${formatCurrency(procedure?.materiality)}`, margin, 71)
      doc.text(`Year End: ${yearEndStr}`, margin, 79)
      if (currentClassification) {
        doc.text(`Classification: ${currentClassification}`, margin, 87)
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
        `Procedures — ${currentClassification ? currentClassification : "All"}`,
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
        `Audit Recommendations${
          currentClassification ? ` — ${formatClassificationForDisplay(currentClassification)}` : ""
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

      const lines = (recommendations || "No recommendations provided.").split(/\r?\n/)
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

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Audit Procedures</h3>
          <div className="text-sm text-muted-foreground">
            {safeTitle} • Mode: {(procedure?.mode || "").toUpperCase() || "N/A"} • Materiality:{" "}
            {formatCurrency(procedure?.materiality)} • Year End: {yearEndStr}
            {currentClassification ? (
              <>
                {" "}
                | Classification:{" "}
                <span className="font-medium">
                  {formatClassificationForDisplay(currentClassification)}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Body */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">
              {currentClassification
                ? formatClassificationForDisplay(currentClassification)
                : "Procedures"}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              <Badge variant="outline">{filteredQuestions.length} procedures</Badge>{" "}
            </div>
          </div>
          {currentClassification && (
            <Button variant="outline" size="sm" onClick={handleAddQuestion}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {Object.entries(grouped).map(([klass, list]) => (
                <div key={klass} className="border rounded-lg p-4">
                  <div className="font-semibold mb-3">
                    {formatClassificationForDisplay(klass)}
                  </div>
                  <div className="space-y-3">
                    {list.map((q: any, idx: number) => (
                      <div key={q.id || idx} className="p-3 rounded-md border">
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
                            <Textarea
                              value={editAnswerText}
                              onChange={(e) => setEditAnswerText(e.target.value)}
                              placeholder="Answer"
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
                            {q.answer ? (
                              <div className="text-sm text-muted-foreground">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                  {String(q.answer)}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">No answer.</div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ✅ Floating button that opens a notebook showing ONLY this classification's recommendations */}
      <FloatingNotesButton onClick={() => setIsNotesOpen(true)} isOpen={isNotesOpen} />
      <NotebookInterface
        isOpen={isNotesOpen}
        isEditable={!currentClassification}
        isPlanning={false}
        onClose={() => setIsNotesOpen(false)}
        recommendations={
          recommendations && currentClassification
            ? `### ${formatClassificationForDisplay(currentClassification)}\n\n${recommendations}`
            : recommendations || ""
        }
        onSave={(content) => {
          // Remove the header if it exists before saving
          const contentWithoutHeader = content.replace(/^### .+\n\n/, '')
          setRecommendations(contentWithoutHeader)
        }}
      />
    </>
  )
}

export default ProcedureView