// @ts-nocheck

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type React from "react"
import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import FloatingNotesButton  from "./FloatingNotesButton"
import NotebookInterface from "./NotebookInterface"

interface ProcedureViewProps {
  procedure: any
  engagement: any
  onRegenerate: () => void
}

export const ProcedureView: React.FC<ProcedureViewProps> = ({ procedure, engagement, onRegenerate }) => {
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [recommendations, setRecommendations] = useState(procedure?.recommendations || "")
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

  const handleSaveRecommendations = (content: string) => {
    setRecommendations(content)
    // You can add API call here to persist the recommendations
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
            1: { cellWidth: pageWidth - 2 * margin - 8 - 20 - 70 },
            2: { cellWidth: pageWidth - 2 * margin - 8 - 20 - 70 },
          },
          margin: { left: margin, right: margin },
          didDrawPage: addFooter,
        })
      }

      // ---------- Recommendations ----------
      function stripInlineMd(s: string) {
        return s
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/__(.*?)__/g, "$1")
          .replace(/_(.*?)_/g, "$1")
          .replace(/`(.*?)`/g, "$1")
          .replace(/\s+/g, " ")
          .trim()
      }

      doc.addPage()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text("Audit Recommendations", margin, 20)

      const recMarkdown = recommendations || "No recommendations provided."
      const lines = recMarkdown.split(/\r?\n/)
      let cursorY = 30

      const writeWrapped = (text: string, font: "normal" | "bold", size = 11) => {
        doc.setFont("helvetica", font)
        doc.setFontSize(size)
        const wrapped = doc.splitTextToSize(text, pageWidth - 2 * margin)

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

        if (!line) {
          cursorY += 6
          return
        }

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

        if (line.startsWith("- ")) {
          const text = stripInlineMd(line.slice(2))
          doc.setFont("helvetica", "normal")
          doc.setFontSize(11)

          const indentX = margin + 6
          const avail = pageWidth - indentX - margin
          const wrapped = doc.splitTextToSize(text, avail)

          if (cursorY + wrapped.length * 6 > pageHeight - margin) {
            addFooter()
            doc.addPage()
            cursorY = 20
          }

          doc.text("•", margin, cursorY)
          wrapped.forEach((w, i) => {
            doc.text(w, indentX, cursorY + i * 6)
          })
          cursorY += wrapped.length * 6
          return
        }

        writeWrapped(stripInlineMd(line), "normal", 11)
      })

      addFooter()

      // ---------- Save ----------
      const date = new Date()
      const fname = `Audit_Procedures_${safeTitle.replace(/[^\\w\\s-]/g, "").replace(/\\s+/g, "_").slice(0, 60)}_${date
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

  return (
    <>
      {/* On-screen actions */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div>
          <h3 className="text-2xl font-bold text-foreground">Audit Procedures Report</h3>
          <div className="text-sm text-muted-foreground">
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

      {/* Procedures Card */}
      <Card className="no-print mt-6">
        <CardHeader>
          <CardTitle className="text-xl text-foreground">Audit Procedures</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {Object.entries(grouped).map(([classification, questions]) => (
                <div key={classification} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-semibold">{formatClassificationForDisplay(classification)}</Badge>
                    <div className="h-px bg-border flex-1" />
                  </div>
                  <div className="space-y-3">
                    {questions.map((q: any, i: number) => (
                      <div key={q.id || i} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs font-semibold text-primary">{i + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground mb-1">{q.question}</p>
                            {q.answer && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{q.answer}</p>
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

      {/* Floating Notes Button */}
      <FloatingNotesButton 
        onClick={() => setIsNotesOpen(true)}
        isOpen={isNotesOpen}
      />

      {/* Notebook Interface */}
      <NotebookInterface
        isOpen={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        recommendations={recommendations}
        onSave={handleSaveRecommendations}
      />
    </>
  )
}
