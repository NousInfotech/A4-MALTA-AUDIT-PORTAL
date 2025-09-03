// @ts-nocheck

  import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type React from "react"
import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  FileText,
  Download,
  PrinterIcon as Print,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProcedureViewProps {
  procedure: any
  engagement: any
  onRegenerate: () => void
}


export const ProcedureView: React.FC<ProcedureViewProps> = ({ procedure, engagement, onRegenerate }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedRecommendations, setEditedRecommendations] = useState(procedure?.recommendations || "")
  const printRef = useRef<HTMLDivElement | null>(null)
  const { toast } = useToast()

  const safeTitle = (engagement?.title || "Engagement")
  const yEnd = engagement?.yearEndDate ? new Date(engagement.yearEndDate) : null
  const yearEndStr = yEnd
    ? `${yEnd.getFullYear()}-${String(yEnd.getMonth() + 1).padStart(2, "0")}-${String(yEnd.getDate()).padStart(2, "0")}`
    : "N/A"

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(amount ?? 0)

  const validCount = procedure?.validitySelections?.filter((v: any) => v.isValid)?.length || 0

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    ;(procedure?.questions || []).forEach((q: any) => {
      const key = q.classification || "General"
      if (!g[key]) g[key] = []
      g[key].push(q)
    })
    return g
  }, [procedure?.questions])
function formatClassificationForDisplay(classification?: string) {
  if (!classification) return "General"
  const parts = classification.split(" > ")
  const top = parts[0]
  // Always show deepest for Assets/Liabilities
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
  // Otherwise top-level
  return top
}
  const handleSaveRecommendations = () => {
    // Persist if you want (API call)
    setIsEditing(false)
    toast({ title: "Recommendations Updated", description: "Your audit recommendations have been saved." })
  }

  const handlePrint = () => {
    // Render the print layout only, with A4 sizing & fixed header/footer
    setTimeout(() => window.print(), 20)
  }

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
          footerY,
        )
        doc.text(`Page ${pageCount}`, pageWidth - margin, footerY, { align: "right" })
      }

      // ---------- Cover Page ----------
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

      doc.setDrawColor(200)
      doc.line(margin, 90, pageWidth - margin, 90)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text("Summary", margin, 102)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      doc.text(`Total Procedures: ${procedure?.questions?.length || 0}`, margin, 112)
      doc.text(
        `Classifications: ${procedure?.selectedClassifications?.length || 0}`,
        margin,
        120,
      )
      doc.text(`Valid Items: ${validCount}`, margin, 128)

      addFooter()

      // ---------- Metadata / Summary Table ----------
      doc.addPage()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text("Engagement Metadata", margin, 20)

      autoTable(doc, {
        startY: 26,
        head: [["Field", "Value"]],
        body: [
          ["Engagement", safeTitle],
          ["Mode", (procedure?.mode || "").toUpperCase() || "N/A"],
          ["Materiality", formatCurrency(procedure?.materiality)],
          ["Year End", yearEndStr],
          ["Generated On", new Date().toLocaleString()],
        ],
        styles: { font: "helvetica", fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: 20, halign: "left" },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: pageWidth - 2 * margin - 60 } },
        margin: { left: margin, right: margin },
      })

      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text("KPIs Summary", margin, (doc as any).lastAutoTable.finalY + 12)

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 18,
        head: [["Metric", "Value"]],
        body: [
          ["Total Procedures", String(procedure?.questions?.length || 0)],
          ["Classifications", String(procedure?.selectedClassifications?.length || 0)],
          ["Valid Items", String(validCount)],
        ],
        styles: { font: "helvetica", fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: 20, halign: "left" },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: pageWidth - 2 * margin - 60 } },
        margin: { left: margin, right: margin },
      })

      addFooter()

      // ---------- Detailed Procedures by Classification ----------
      const classifications = Object.keys(grouped)
      for (let i = 0; i < classifications.length; i++) {
        const c = classifications[i]
        const rows = grouped[c] || []

        doc.addPage()
        doc.setFont("helvetica", "bold")
        doc.setFontSize(14)
        doc.text(`Procedures — ${c}`, margin, 20)

        // Build table rows
        const body = rows.map((q: any, idx: number) => [
          String(idx + 1),
          q.question || "",
          q.answer ? String(q.answer) : "",
        ])

        autoTable(doc, {
          startY: 26,
          head: [["#", "Question", "Answer"]],
          body,
          styles: { font: "helvetica", fontSize: 9, cellPadding: 2, valign: "top" },
          headStyles: { fillColor: [240, 240, 240], textColor: 20, halign: "left" },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: pageWidth - 2 * margin - 8 - 20 - 70 }, // auto fit Question
            2: { cellWidth: pageWidth - 2 * margin - 8 - 20 - 70 },
          },
          margin: { left: margin, right: margin },
          didDrawPage: addFooter,
        })
      }

      // ---------- Recommendations ----------
    // ---------- Helper: strip inline markdown emphasis ----------
function stripInlineMd(s: string) {
  // remove bold/italic markers but keep the text
  return s
    .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
    .replace(/\*(.*?)\*/g, "$1")     // *italic*
    .replace(/__(.*?)__/g, "$1")     // __bold__
    .replace(/_(.*?)_/g, "$1")       // _italic_
    .replace(/`(.*?)`/g, "$1")       // `inline code` -> plain
    .replace(/\s+/g, " ")            // collapse spaces
    .trim()
}

// ---------- Recommendations ----------
doc.addPage()
doc.setFont("helvetica", "bold")
doc.setFontSize(14)
doc.text("Audit Recommendations", margin, 20)

const recMarkdown =
  (isEditing ? editedRecommendations : procedure?.recommendations) ||
  "No recommendations provided."

const lines = recMarkdown.split(/\r?\n/)
let cursorY = 30

const writeWrapped = (text: string, font: "normal" | "bold", size = 11) => {
  doc.setFont("helvetica", font)
  doc.setFontSize(size)
  const wrapped = doc.splitTextToSize(text, pageWidth - 2 * margin)

  // page break if needed
  if (cursorY + wrapped.length * 6 > pageHeight - margin) {
    addFooter()
    doc.addPage()
    cursorY = 20
  }
  doc.text(wrapped, margin, cursorY)
  cursorY += wrapped.length * 6
}

lines.forEach((raw) => {
  const line = raw.trim()

  // blank line spacing
  if (!line) {
    cursorY += 6
    return
  }

  // Headings
  if (line.startsWith("### ")) {
    writeWrapped(stripInlineMd(line.replace(/^###\s*/, "")), "bold", 13)
    cursorY += 2
    return
  }
  if (line.startsWith("#### ")) {
    writeWrapped(stripInlineMd(line.replace(/^####\s*/, "")), "bold", 12)
    cursorY += 2
    return
  }

  // Bullet items: keep a proper bullet without markdown asterisks
  if (line.startsWith("- ")) {
    const text = stripInlineMd(line.slice(2))
    // render a bullet, then the text with a small indent
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)

    // compute available width after bullet indent
    const indentX = margin + 6
    const avail = pageWidth - indentX - margin
    const wrapped = doc.splitTextToSize(text, avail)

    // page break if needed
    if (cursorY + wrapped.length * 6 > pageHeight - margin) {
      addFooter()
      doc.addPage()
      cursorY = 20
    }

    // draw bullet
    doc.text("•", margin, cursorY)
    // draw wrapped lines aligned to indent
    wrapped.forEach((w, i) => {
      doc.text(w, indentX, cursorY + i * 6)
    })
    cursorY += wrapped.length * 6
    return
  }

  // Normal paragraph (with emphasis markers removed)
  writeWrapped(stripInlineMd(line), "normal", 11)
})

addFooter()

      // ---------- Save ----------
      const date = new Date()
      const fname = `Audit_Procedures_${safeTitle.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_").slice(0, 60)}_${date
        .toISOString()
        .slice(0, 10)}.pdf`
      doc.save(fname)

      toast({ title: "Exported", description: `${fname} has been downloaded.` })
    } catch (err: any) {
      console.error(err)
      if (/autotable/i.test(String(err))) {
        toast({
          title: "Missing dependency",
          description: "Please install jspdf and jspdf-autotable: npm i jspdf jspdf-autotable",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Export failed",
          description: err?.message || "Could not export the PDF.",
          variant: "destructive",
        })
      }
    }
  }

  // ---------- Print Layout (official look) ----------
  return (
    <>
      {/* On-screen actions */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div>
          <h3 className="font-heading text-2xl text-foreground">Audit Procedures Report</h3>
          <div className="text-sm text-muted-foreground font-body">
            {safeTitle} • Mode: {(procedure?.mode || "").toUpperCase() || "N/A"} • Materiality:{" "}
            {formatCurrency(procedure?.materiality)} • Year End: {yearEndStr}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* App view: procedures & recommendations (unchanged) */}
      <Card className="no-print mt-6">
        <CardHeader><CardTitle className="font-heading text-xl text-foreground">Audit Procedures</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {Object.entries(grouped).map(([classification, questions]) => (
                <div key={classification} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-body-semibold">{formatClassificationForDisplay(classification)}</Badge>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <div className="space-y-3">
                    {questions.map((q: any, i: number) => (
                      <div key={q.id || i} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs font-body-semibold text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-body-semibold text-foreground mb-1">{q.question}</p>
                            {q.answer && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm font-body text-muted-foreground whitespace-pre-wrap">{q.answer}</p>
                              </div>
                            )}
                            {q.isRequired && <Badge variant="secondary" className="mt-2 text-xs">Required</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

<Card className="no-print mt-6">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle className="font-heading text-xl text-foreground">
        Audit Recommendations
      </CardTitle>
      {!isEditing ? (
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit3 className="h-4 w-4 mr-2" />
          Edit
        </Button>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsEditing(false)
              setEditedRecommendations(procedure?.recommendations || "")
            }}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveRecommendations}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      )}
    </div>
  </CardHeader>

  <CardContent>
    {isEditing ? (
      <Textarea
        value={editedRecommendations}
        onChange={(e) => setEditedRecommendations(e.target.value)}
        placeholder="Enter audit recommendations..."
        className="min-h-40 font-body"
      />
    ) : (
      <div
        className={[
          // Typography (Tailwind Typography plugin friendly)
          "prose prose-sm max-w-none",
          // Better spacing & rhythm
          "prose-p:my-2 prose-li:my-1 prose-ul:my-2",
          "prose-h3:mt-6 prose-h3:mb-2 prose-h4:mt-4 prose-h4:mb-2",
          // Colors and lists
          "prose-headings:text-foreground prose-p:text-muted-foreground",
          "prose-ul:list-disc prose-ul:pl-6",
          // Dark mode support if you have it
          "dark:prose-invert",
        ].join(" ")}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          // Components let us control spacing exactly
          components={{
            h3: ({ node, ...props }) => (
              <h3 className="text-base font-semibold leading-6" {...props} />
            ),
            h4: ({ node, ...props }) => (
              <h4 className="text-sm font-semibold leading-6" {...props} />
            ),
            p: ({ node, ...props }) => (
              <p className="leading-6 whitespace-pre-wrap" {...props} />
            ),
            ul: ({ node, ordered, ...props }) => (
              <ul className="list-disc pl-6 my-2" {...props} />
            ),
            li: ({ node, ...props }) => (
              <li className="my-1 leading-6" {...props} />
            ),
            // Keep strong/em readable but not shouty
            strong: ({ node, ...props }) => (
              <span className="font-semibold" {...props} />
            ),
            em: ({ node, ...props }) => (
              <span className="italic" {...props} />
            ),
            // Prevent inline code from shrinking the line-height
            code: ({ node, inline, ...props }) =>
              inline ? (
                <code className="px-1 py-0.5 rounded bg-muted text-foreground" {...props} />
              ) : (
                <code className="block p-3 rounded bg-muted text-foreground" {...props} />
              ),
          }}
        >
          {procedure?.recommendations || "No recommendations provided."}
        </ReactMarkdown>
      </div>
    )}
  </CardContent>
</Card>


    </>
  )
}

