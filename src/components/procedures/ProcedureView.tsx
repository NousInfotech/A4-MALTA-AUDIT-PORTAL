// @ts-nocheck
import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import FloatingNotesButton from "./FloatingNotesButton"
import NotebookInterface from "./NotebookInterface"
// Add these helpers near the top of ProcedureView.tsx (outside the component)
function normalizeKey(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[\s/_-]+/g, " ")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim()
}

function splitRecommendationsByClassification(markdown?: string) {
  const map: Record<string, string> = {}
  if (!markdown) return map

  const lines = markdown.split(/\r?\n/)
  let currentKey: string | null = null
  let bucket: string[] = []

  const flush = () => {
    if (currentKey) {
      map[currentKey] = bucket.join("\n").trim()
    }
    bucket = []
  }

  for (const raw of lines) {
    const m = raw.match(/^\s*\*([^*]+)\*\s*$/) // Match *classification path*
    if (m) {
      // New classification section starts
      flush()
      currentKey = m[1].trim()
      continue
    }
    if (!currentKey) {
      // Ignore prelude text or attach it to a special key if needed
      continue
    }
    bucket.push(raw)
  }
  flush()
  return map
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
    const all = Array.isArray(procedure?.questions) ? procedure.questions : []
    if (!currentClassification) return all
    return all.filter((q: any) => q.classification === currentClassification)
  }, [procedure?.questions, currentClassification])

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
        </div>
      </div>

      {/* Body */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {currentClassification
              ? formatClassificationForDisplay(currentClassification)
              : "Procedures"}
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            <Badge variant="outline">{filteredQuestions.length} procedures</Badge>{" "}
          </div>
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
            <div className="font-medium mb-1">
              {idx + 1}. {q.question || "—"}
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
        isEditable={currentClassification?false:true}
        isPlanning={false}
        onClose={() => setIsNotesOpen(false)
        }
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