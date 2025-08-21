// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Bot, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface OverviewTabProps {
  engagement: any
  procedures?: any[]
  handleGenerateProcedures: () => void
  isGeneratingProcedures: boolean
}

const API_BASE = import.meta.env.VITE_APIURL

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount ?? 0)
}

function yearEndStr(d?: string | Date) {
  if (!d) return "N/A"
  const yEnd = new Date(d)
  if (isNaN(yEnd.getTime())) return "N/A"
  return `${yEnd.getFullYear()}-${String(yEnd.getMonth() + 1).padStart(2, "0")}-${String(
    yEnd.getDate()
  ).padStart(2, "0")}`
}

export const OverviewTab = ({
  engagement,
  procedures: proceduresProp = [],
  handleGenerateProcedures,
  isGeneratingProcedures,
}: OverviewTabProps) => {
  const { toast } = useToast()
  const [isLoadingProcedures, setIsLoadingProcedures] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [proceduresDocs, setProceduresDocs] = useState<any[]>(proceduresProp || [])

  const engagementId = engagement?._id ?? engagement?.id ?? ""

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!engagementId) return
      setIsLoadingProcedures(true)
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        const token = data.session?.access_token
        if (!token) throw new Error("Not authenticated")

        const url = `${API_BASE}/api/procedures/${encodeURIComponent(engagementId)}`
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        if (!res.ok) throw new Error(`Failed to fetch procedures (${res.status})`)
        const json = await res.json()
        const arr = Array.isArray(json) ? json : [json]
        if (!cancelled) setProceduresDocs(arr)
      } catch (e: any) {
        console.error(e)
        if (!cancelled) {
          toast({
            title: "Could not fetch procedures",
            description: e?.message || "We couldn't load procedures for this engagement.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) setIsLoadingProcedures(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [engagementId])

  // Choose the latest procedure doc
  const latest = useMemo(() => {
    const arr = [...(proceduresDocs || [])]
    arr.sort((a, b) => {
      const da = new Date(a?.updatedAt || a?.createdAt || 0).getTime()
      const db = new Date(b?.updatedAt || b?.createdAt || 0).getTime()
      return db - da
    })
    return arr[0] ?? null
  }, [proceduresDocs])

  // Group questions by classification (like ProcedureView)
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {}
    ;(latest?.questions || []).forEach((q: any) => {
      const key = q?.classification || "General"
      if (!g[key]) g[key] = []
      g[key].push(q)
    })
    return g
  }, [latest?.questions])

  const safeTitle = engagement?.title || "Engagement"
  const ye = yearEndStr(engagement?.yearEndDate)
  const procedureDocsCount = proceduresDocs.length
  const latestQuestionsCount = latest?.questions?.length ?? 0
  const classificationsCount = latest?.selectedClassifications?.length ?? 0
  const validCount =
    latest?.validitySelections?.filter?.((v: any) => v?.isValid)?.length ?? 0

  const statusColor =
    engagement?.status === "active"
      ? "text-success"
      : engagement?.status === "completed"
      ? "text-muted-foreground"
      : engagement?.status === "draft"
      ? "text-warning"
      : "text-foreground"

  // ---------- Export PDF (mirrors your ProcedureView export) ----------
  const handleExportPDF = async () => {
    setIsExporting(true)
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
      doc.text(`Mode: ${(latest?.mode || "").toUpperCase() || "N/A"}`, margin, 63)
      doc.text(`Materiality: ${formatCurrency(latest?.materiality ?? 0)}`, margin, 71)
      doc.text(`Year End: ${ye}`, margin, 79)

      doc.setDrawColor(200)
      doc.line(margin, 90, pageWidth - margin, 90)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text("Summary", margin, 102)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      doc.text(`Total Procedures: ${latestQuestionsCount}`, margin, 112)
      doc.text(`Classifications: ${classificationsCount}`, margin, 120)
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
          ["Mode", (latest?.mode || "").toUpperCase() || "N/A"],
          ["Materiality", formatCurrency(latest?.materiality ?? 0)],
          ["Year End", ye],
          ["Generated On", new Date().toLocaleString()],
          ["Procedure Docs Found", String(procedureDocsCount)],
        ],
        styles: { font: "helvetica", fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [240, 240, 240], textColor: 20, halign: "left" },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: pageWidth - 2 * margin - 60 } },
        margin: { left: margin, right: margin },
      })

      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      // @ts-ignore
      doc.text("KPIs Summary", margin, (doc as any).lastAutoTable.finalY + 12)

      autoTable(doc, {
        // @ts-ignore
        startY: (doc as any).lastAutoTable.finalY + 18,
        head: [["Metric", "Value"]],
        body: [
          ["Total Procedures", String(latestQuestionsCount)],
          ["Classifications", String(classificationsCount)],
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

        const body = rows.map((q: any, idx: number) => [
          String(idx + 1),
          q?.question || "",
          q?.isRequired ? "Yes" : "No",
          q?.answer ? String(q.answer) : "",
        ])

        autoTable(doc, {
          startY: 26,
          head: [["#", "Question", "Required", "Answer"]],
          body,
          styles: { font: "helvetica", fontSize: 9, cellPadding: 2, valign: "top" },
          headStyles: { fillColor: [240, 240, 240], textColor: 20, halign: "left" },
          columnStyles: {
            0: { cellWidth: 8, halign: "center" },
            1: { cellWidth: pageWidth - 2 * margin - 8 - 20 - 70 },
            2: { cellWidth: 20, halign: "center" },
            3: { cellWidth: 70 },
          },
          margin: { left: margin, right: margin },
          didDrawPage: addFooter,
        })
      }

      // ---------- Recommendations (with markdown stripping like your view) ----------
      // Helper
      function stripInlineMd(s: string) {
        return s
          .replace(/\*\*(.*?)\*\*/g, "$1") // **bold**
          .replace(/\*(.*?)\*/g, "$1") // *italic*
          .replace(/__(.*?)__/g, "$1") // __bold__
          .replace(/_(.*?)_/g, "$1") // _italic_
          .replace(/`(.*?)`/g, "$1") // `inline code`
          .replace(/\s+/g, " ")
          .trim()
      }

      doc.addPage()
      doc.setFont("helvetica", "bold")
      doc.setFontSize(14)
      doc.text("Audit Recommendations", margin, 20)

      const recMarkdown = latest?.recommendations || "No recommendations provided."
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
      const fname = `Audit_Procedures_${safeTitle
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 60)}_${date.toISOString().slice(0, 10)}.pdf`
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
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg truncate">Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Procedure Docs</span>
            {isLoadingProcedures ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="text-foreground">{procedureDocsCount}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Procedures in Latest Doc</span>
            <span className="text-foreground">{latestQuestionsCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg truncate">Engagement Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>
              {engagement?.createdAt ? new Date(engagement.createdAt).toLocaleDateString() : "N/A"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={statusColor}>{engagement?.status ?? "Unknown"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg truncate">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full bg-transparent"
            variant="outline"
            onClick={handleGenerateProcedures}
            disabled={isGeneratingProcedures}
          >
            {isGeneratingProcedures ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            <span>Generate Procedures</span>
          </Button>

          <Button
            className="w-full bg-transparent"
            variant="outline"
            onClick={handleExportPDF}
            disabled={isExporting || !latest}
            title={latest ? "Export PDF" : "No procedures to export yet"}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            <span>{isExporting ? "Exporting…" : "Export PDF"}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
