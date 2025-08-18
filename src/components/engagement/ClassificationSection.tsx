"use client"

// @ts-nocheck

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  RefreshCw,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Search,
  Eye,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ClassificationSectionProps {
  engagement: any
  classification: string
  onClose?: () => void
  onClassificationJump?: (classification: string) => void
}

interface ETBRow {
  id: string
  code: string
  accountName: string
  currentYear: number
  priorYear: number
  adjustments: number
  finalBalance: number
  classification: string
  reference?: string
}

interface WorksheetRow {
  sheetName: string
  rowIndex: number
  data: any[]
}

interface ViewRowData {
  reference: {
    sheetName: string
    rowIndex: number
    data: any[]
  }
  leadSheetRow: {
    code: string
    accountName: string
    currentYear: number
    priorYear: number
    adjustments: number
    finalBalance: number
  }
}

// 🔹 Auth fetch helper: attaches Supabase Bearer token
async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const headers = new Headers(options.headers || {})
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`)
  }
  return fetch(url, { ...options, headers })
}

const isTopCategory = (c: string) => ["Equity", "Income", "Expenses"].includes(c)
const isAdjustments = (c: string) => c === "Adjustments"
const isETB = (c: string) => c === "ETB"

const TOP_CATEGORIES = ["Equity", "Income", "Expenses"]

const shouldHaveWorkingPapers = (classification: string) => {
  return !isETB(classification) && !isAdjustments(classification)
}

const groupByClassification = (rows: ETBRow[], collapseToTopCategory = false) => {
  const grouped: Record<string, ETBRow[]> = {}
  for (const r of rows) {
    let key = r.classification || "Unclassified"
    if (collapseToTopCategory && key.includes(" > ")) {
      const top = key.split(" > ")[0]
      if (TOP_CATEGORIES.includes(top)) key = top
    }
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  }
  return grouped
}

// ✅ Unified display rule
const formatClassificationForDisplay = (c: string) => {
  if (!c) return "—"
  if (isAdjustments(c)) return "Adjustments"
  if (isETB(c)) return "Extended Trial Balance"
  const parts = c.split(" > ")
  const top = parts[0]
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
  return top
}

/* -----------------------------
   Fullscreen wrapper (Portal)
------------------------------*/
function FullscreenOverlay({
  children,
  onExit,
}: {
  children: React.ReactNode
  onExit: () => void
}) {
  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onExit])

  // Render to body
  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 opacity-100 transition-opacity duration-200" onClick={onExit} />
      {/* Content container */}
      <div className="absolute inset-0 flex p-4 sm:p-6">
        <div
          className="
            relative w-full h-full
            bg-background rounded-xl shadow-xl
            transition-all duration-200
            opacity-100 scale-[1.00]
            border
          "
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export const ClassificationSection: React.FC<ClassificationSectionProps> = ({
  engagement,
  classification,
  onClose,
  onClassificationJump,
}) => {
  const [loading, setLoading] = useState(false)
  const [sectionData, setSectionData] = useState<ETBRow[]>([])
  const [viewSpreadsheetUrl, setViewSpreadsheetUrl] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)

  const [workingPapersInitialized, setWorkingPapersInitialized] = useState(false)
  const [workingPapersUrl, setWorkingPapersUrl] = useState<string>("")
  const [workingPapersId, setWorkingPapersId] = useState<string>("")
  const [availableSheets, setAvailableSheets] = useState<string[]>([])
  const [selectedRowForFetch, setSelectedRowForFetch] = useState<ETBRow | null>(null)
  const [fetchRowsDialog, setFetchRowsDialog] = useState(false)
  const [availableRows, setAvailableRows] = useState<WorksheetRow[]>([])
  const [selectedRow, setSelectedRow] = useState<WorksheetRow | null>(null)

  const [viewRowDialog, setViewRowDialog] = useState(false)
  const [viewRowData, setViewRowData] = useState<ViewRowData | null>(null)
  const [viewRowLoading, setViewRowLoading] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    loadSectionData()
    if (shouldHaveWorkingPapers(classification)) {
      checkWorkingPapersStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classification])

  const loadSectionData = async () => {
    setLoading(true)
    try {
      if (isAdjustments(classification) || isETB(classification)) {
        // Use the same ETB endpoint; no new APIs
        const etbResp = await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`)
        if (!etbResp.ok) throw new Error("Failed to load ETB")
        const etb = await etbResp.json()
        const rows: ETBRow[] = Array.isArray(etb.rows) ? etb.rows : []
        setSectionData(isAdjustments(classification) ? rows.filter((r) => Number(r.adjustments) !== 0) : rows)
        return
      }

      // Normal paths (server provides data by classification or by category)
      const endpoint = isTopCategory(classification)
        ? `${import.meta.env.VITE_APIURL}/api/engagements/${
            engagement._id
          }/etb/category/${encodeURIComponent(classification)}`
        : `${import.meta.env.VITE_APIURL}/api/engagements/${
            engagement._id
          }/etb/classification/${encodeURIComponent(classification)}`

      const response = await authFetch(endpoint)
      if (!response.ok) throw new Error("Failed to load section data")
      const data = await response.json()
      setSectionData(Array.isArray(data.rows) ? data.rows : [])
    } catch (error: any) {
      console.error("Load error:", error)
      toast({
        title: "Load failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const reloadDataFromETB = async () => {
    setLoading(true)
    try {
      if (isAdjustments(classification) || isETB(classification)) {
        await loadSectionData()
        toast({
          title: "Success",
          description: "Data reloaded from ETB successfully",
        })
        return
      }

      const endpoint = isTopCategory(classification)
        ? `${import.meta.env.VITE_APIURL}/api/engagements/${
            engagement._id
          }/etb/category/${encodeURIComponent(classification)}`
        : `${import.meta.env.VITE_APIURL}/api/engagements/${
            engagement._id
          }/etb/classification/${encodeURIComponent(classification)}/reload`

      const response = await authFetch(endpoint, {
        method: isTopCategory(classification) ? "GET" : "POST",
      })
      if (!response.ok) throw new Error("Failed to reload data from ETB")

      const data = await response.json()
      setSectionData(Array.isArray(data.rows) ? data.rows : [])
      toast({
        title: "Success",
        description: "Data reloaded from ETB successfully",
      })
    } catch (error: any) {
      console.error("Reload error:", error)
      toast({
        title: "Reload failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // put this helper near the top of the file (outside the component)
  // put this helper near the top of the file (outside the component)
  function withVersion(rawUrl: string) {
    if (!rawUrl) return rawUrl
    try {
      const u = new URL(rawUrl)
      if (!u.searchParams.has("v")) u.searchParams.set("v", String(Date.now()))
      else u.searchParams.set("v", String(Date.now())) // refresh existing
      return u.toString()
    } catch {
      const join = rawUrl.includes("?") ? "&" : "?"
      return `${rawUrl}${join}v=${Date.now()}`
    }
  }

  const createViewSpreadsheet = async () => {
    setLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${
          engagement._id
        }/sections/${encodeURIComponent(classification)}/view-spreadsheet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: sectionData }),
        },
      )
      if (!response.ok) throw new Error("Failed to create view spreadsheet")

      const result = await response.json()

      // ALWAYS use a cache-busted URL before storing/opening
      const freshUrl = withVersion(result.viewUrl)
      setViewSpreadsheetUrl(freshUrl)

      // Optional: force-open the latest file
      // window.open(freshUrl, "_blank", "noopener,noreferrer");

      toast({ title: "Success", description: "Spreadsheet Saved in Library" })
    } catch (error: any) {
      console.error("Create view spreadsheet error:", error)
      toast({ title: "Create failed", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const checkWorkingPapersStatus = async () => {
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/status`,
      )
      if (response.ok) {
        const data = await response.json()
        setWorkingPapersInitialized(data.initialized)
        setWorkingPapersUrl(data.url || "")
        setWorkingPapersId(data.spreadsheetId || "")
        setAvailableSheets(data.sheets || [])
      }
    } catch (error) {
      console.error("Error checking working papers status:", error)
    }
  }

  const initializeWorkingPapers = async () => {
    setLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/init`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadSheetData: sectionData }),
        },
      )

      if (!response.ok) throw new Error("Failed to initialize working papers")

      const result = await response.json()
      setWorkingPapersInitialized(true)
      setWorkingPapersUrl(result.url)
      setWorkingPapersId(result.spreadsheetId)
      setAvailableSheets(result.sheets || [])

      // Open the Excel sheet
      window.open(result.url, "_blank", "noopener,noreferrer")

      toast({
        title: "Success",
        description: "Working papers initialized with lead sheet data",
      })
    } catch (error: any) {
      console.error("Initialize working papers error:", error)
      toast({
        title: "Initialize failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const pushToWorkingPapers = async () => {
    setLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/push`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: sectionData }),
        },
      )

      if (!response.ok) throw new Error("Failed to push to working papers")

      toast({
        title: "Success",
        description: "Changes pushed to working papers successfully",
      })
    } catch (error: any) {
      console.error("Push to working papers error:", error)
      toast({
        title: "Push failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const pullFromWorkingPapers = async () => {
    setLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/pull`,
        {
          method: "POST",
        },
      )

      if (!response.ok) throw new Error("Failed to pull from working papers")

      const result = await response.json()
      setSectionData(result.rows)
      setAvailableSheets(result.sheets || [])

      toast({
        title: "Success",
        description: "Changes pulled from working papers successfully",
      })
    } catch (error: any) {
      console.error("Pull from working papers error:", error)
      toast({
        title: "Pull failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRowsFromSheets = async (row: ETBRow) => {
    setSelectedRowForFetch(row)
    setLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/fetch-rows`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowId: row.id }),
        },
      )

      if (!response.ok) throw new Error("Failed to fetch rows from sheets")

      const result = await response.json()
      setAvailableRows(result.rows)
      setFetchRowsDialog(true)
    } catch (error: any) {
      console.error("Fetch rows error:", error)
      toast({
        title: "Fetch failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const selectRowFromSheets = async () => {
    if (!selectedRow || !selectedRowForFetch) return

    setLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/select-row`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rowId: selectedRowForFetch.id,
            selectedRow: selectedRow,
          }),
        },
      )

      if (!response.ok) throw new Error("Failed to select row")

      const result = await response.json()
      setSectionData(result.rows)
      setFetchRowsDialog(false)
      setSelectedRow(null)
      setSelectedRowForFetch(null)

      toast({
        title: "Success",
        description: "Row selected and data updated",
      })
    } catch (error: any) {
      console.error("Select row error:", error)
      toast({
        title: "Select failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const viewSelectedRow = async (row: ETBRow) => {
    if (!row.reference) return

    setViewRowLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/sections/${encodeURIComponent(classification)}/working-papers/view-row`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rowId: row.id }),
        },
      )

      if (!response.ok) throw new Error("Failed to view selected row")

      const result = await response.json()
      setViewRowData(result)
      setViewRowDialog(true)
    } catch (error: any) {
      console.error("View row error:", error)
      toast({
        title: "View failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setViewRowLoading(false)
    }
  }

  const totals = useMemo(
    () =>
      sectionData.reduce(
        (acc, row) => ({
          currentYear: acc.currentYear + (Number(row.currentYear) || 0),
          priorYear: acc.priorYear + (Number(row.priorYear) || 0),
          adjustments: acc.adjustments + (Number(row.adjustments) || 0),
          finalBalance: acc.finalBalance + (Number(row.finalBalance) || 0),
        }),
        { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 },
      ),
    [sectionData],
  )

  // Grouping for Adjustments view
  const groupedForAdjustments = useMemo(
    () => (isAdjustments(classification) ? groupByClassification(sectionData, true) : {}),
    [classification, sectionData],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading…</span>
      </div>
    )
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-transparent"
              onClick={() => setIsFullscreen((v) => !v)}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={reloadDataFromETB} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Data
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Reload rows from ETB
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={createViewSpreadsheet} disabled={sectionData.length === 0} size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Save As Spreadsheet
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            Save this section as a view-only spreadsheet
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  const workingPapersActions = (
    <div className="flex items-center gap-2">
      <TooltipProvider delayDuration={200}>
        {!workingPapersInitialized ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={initializeWorkingPapers} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Initialize
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Initialize working papers with lead sheet data
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={pushToWorkingPapers} variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Push
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                Push changes to working papers
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={pullFromWorkingPapers} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Pull
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                Pull changes from working papers
              </TooltipContent>
            </Tooltip>

            {workingPapersUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => window.open(workingPapersUrl, "_blank", "noopener,noreferrer")}
                    variant="outline"
                    size="sm"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Open Excel
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  Open working papers in Excel
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}
      </TooltipProvider>
    </div>
  )

  const content = (
    <Card className="flex-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{formatClassificationForDisplay(classification)}</CardTitle>
            <Badge variant="outline" className="mt-1">
              {sectionData.length} {sectionData.length === 1 ? "account" : "accounts"}
            </Badge>
          </div>
          {headerActions}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {shouldHaveWorkingPapers(classification) ? (
          <Tabs defaultValue="lead-sheet" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lead-sheet">Lead Sheet</TabsTrigger>
              <TabsTrigger value="working-papers">Working Papers</TabsTrigger>
            </TabsList>

            <TabsContent value="lead-sheet" className="flex-1 flex flex-col">
              {renderLeadSheetContent()}
            </TabsContent>

            <TabsContent value="working-papers" className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Working Papers</h3>
                {workingPapersActions}
              </div>
              {workingPapersInitialized ? renderWorkingPapersContent() : renderWorkingPapersEmpty()}
            </TabsContent>
          </Tabs>
        ) : (
          renderLeadSheetContent()
        )}

        {/* Fetch Rows Dialog */}
        <Dialog open={fetchRowsDialog} onOpenChange={setFetchRowsDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Select Row from Other Sheets</DialogTitle>
              <DialogDescription>
                Choose a row from the available sheets to reference for {selectedRowForFetch?.accountName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {availableRows.length > 0 ? (
                <div className="space-y-2">
                  <Select
                    onValueChange={(value) => {
                      const row = availableRows.find((r, i) => i.toString() === value)
                      setSelectedRow(row || null)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a row..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRows.map((row, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {row.sheetName} - Row {row.rowIndex}: {row.data.slice(0, 3).join(" | ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedRow && (
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <h4 className="font-medium mb-2">Selected Row Preview:</h4>
                      <p>
                        <strong>Sheet:</strong> {selectedRow.sheetName}
                      </p>
                      <p>
                        <strong>Row:</strong> {selectedRow.rowIndex}
                      </p>
                      <p>
                        <strong>Data:</strong> {selectedRow.data.join(" | ")}
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setFetchRowsDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={selectRowFromSheets} disabled={!selectedRow}>
                      Select Row
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No rows found in other sheets</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={viewRowDialog} onOpenChange={setViewRowDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Referenced Row</DialogTitle>
              <DialogDescription>Viewing the referenced data for the selected account</DialogDescription>
            </DialogHeader>

            {viewRowData && (
              <div className="space-y-6">
                {/* Lead Sheet Row Info */}
                <div className="p-4 border rounded-lg bg-blue-50">
                  <h4 className="font-medium mb-3 text-blue-900">Lead Sheet Account</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Code:</span> {viewRowData.leadSheetRow.code}
                    </div>
                    <div>
                      <span className="font-medium">Account Name:</span> {viewRowData.leadSheetRow.accountName}
                    </div>
                    <div>
                      <span className="font-medium">Current Year:</span>{" "}
                      {viewRowData.leadSheetRow.currentYear.toLocaleString()}
                    </div>
                    
                    <div>
                      <span className="font-medium">Adjustments:</span>{" "}
                      {viewRowData.leadSheetRow.adjustments.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Final Balance:</span>{" "}
                      {viewRowData.leadSheetRow.finalBalance.toLocaleString()}
                    </div>
                    <div>
                      <span className="font-medium">Prior Year:</span>{" "}
                      {viewRowData.leadSheetRow.priorYear.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Referenced Row Info */}
                <div className="p-4 border rounded-lg bg-green-50">
                  <h4 className="font-medium mb-3 text-green-900">Referenced Working Paper</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Sheet:</span> {viewRowData.reference.sheetName}
                    </div>
                    <div>
                      <span className="font-medium">Row:</span> {viewRowData.reference.rowIndex}
                    </div>
                    <div>
                      <span className="font-medium">Data:</span>
                      <div className="mt-2 p-3 bg-white border rounded text-xs font-mono">
                        {viewRowData.reference.data.join(" | ")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setViewRowDialog(false)}>Close</Button>
                </div>
              </div>
            )}

            {!viewRowData && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading reference data...</span>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )

  function renderLeadSheetContent() {
    return (
      <>
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-3">
            <div className="text-xs text-gray-500">Current Year</div>
            <div className="text-lg font-semibold">{totals.currentYear.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Prior Year</div>
            <div className="text-lg font-semibold">{totals.priorYear.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Adjustments</div>
            <div className="text-lg font-semibold">{totals.adjustments.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Final Balance</div>
            <div className="text-lg font-semibold">{totals.finalBalance.toLocaleString()}</div>
          </Card>
        </div>

        {renderDataTable()}
      </>
    )
  }

  function renderWorkingPapersContent() {
    return (
      <>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-3">
            <div className="text-xs text-gray-500">Available Sheets</div>
            <div className="text-lg font-semibold">{availableSheets.length}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Current Year</div>
            <div className="text-lg font-semibold">{totals.currentYear.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Adjustments</div>
            <div className="text-lg font-semibold">{totals.adjustments.toLocaleString()}</div>
          </Card>
          <Card className="p-3">
            <div className="text-xs text-gray-500">Final Balance</div>
            <div className="text-lg font-semibold">{totals.finalBalance.toLocaleString()}</div>
          </Card>
        </div>

        {renderWorkingPapersTable()}
      </>
    )
  }

  function renderWorkingPapersEmpty() {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Working Papers Not Initialized</h3>
            <p className="text-gray-500 mt-1">
              Click the Initialize button to create working papers with lead sheet data
            </p>
          </div>
          <Button onClick={initializeWorkingPapers} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Initialize Working Papers
          </Button>
        </div>
      </div>
    )
  }

  function renderWorkingPapersTable() {
    return (
      <div className="flex-1 border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Account Name</th>
                <th className="px-4 py-2 text-right">Current Year</th>
                <th className="px-4 py-2 text-right">Prior Year</th>
                <th className="px-4 py-2 text-right">Adjustments</th>
                <th className="px-4 py-2 text-right">Final Balance</th>
                <th className="px-4 py-2 text-left">Reference</th>
              </tr>
            </thead>
            <tbody>
              {sectionData.map((row) => (
                <tr key={row.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-2">{row.accountName}</td>
                  <td className="px-4 py-2 text-right">{row.currentYear.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.priorYear.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{row.adjustments.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">{row.finalBalance.toLocaleString()}</td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center gap-1 justify-center">
                     
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => viewSelectedRow(row)}
                        disabled={!row.reference || viewRowLoading}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                       <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchRowsFromSheets(row)}
                        disabled={availableSheets.length <= 1}
                      >
                        <Search className="h-3 w-3 mr-1" />
                        Fetch Rows
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {sectionData.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No data available for working papers
                  </td>
                </tr>
              )}
              {sectionData.length > 0 && (
                <tr className="bg-muted/50 font-medium">
                  <td className="px-4 py-2" colSpan={2}>
                    TOTALS
                  </td>
                  <td className="px-4 py-2 text-right">{totals.currentYear.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{totals.priorYear.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{totals.adjustments.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">{totals.finalBalance.toLocaleString()}</td>
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  function renderDataTable() {
    if (isETB(classification)) {
      // ETB view
      return (
        <div className="flex-1 border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Account Name</th>
                  <th className="px-4 py-2 text-right">Current Year</th>
                  <th className="px-4 py-2 text-right">Prior Year</th>
                  <th className="px-4 py-2 text-right">Adjustments</th>
                  <th className="px-4 py-2 text-right">Final Balance</th>
                  <th className="px-4 py-2 text-left">Classification</th>
                </tr>
              </thead>
              <tbody>
                {sectionData.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-2">{row.accountName}</td>
                    <td className="px-4 py-2 text-right">{row.currentYear.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.priorYear.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.adjustments.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium">{row.finalBalance.toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() => onClassificationJump?.(row.classification)}
                        className="flex items-center gap-2"
                      >
                        <Badge variant="outline">{formatClassificationForDisplay(row.classification)}</Badge>
                      </button>
                    </td>
                  </tr>
                ))}
                {sectionData.length > 0 && (
                  <tr className="bg-muted/50 font-medium">
                    <td className="px-4 py-2" colSpan={2}>
                      TOTALS
                    </td>
                    <td className="px-4 py-2 text-right">{totals.currentYear.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{totals.priorYear.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{totals.adjustments.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{totals.finalBalance.toLocaleString()}</td>
                  </tr>
                )}
                {sectionData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No ETB rows found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    } else if (isAdjustments(classification)) {
      // Adjustments view: grouped by top categories
      return (
        <div className="overflow-auto max-h-96 space-y-6">
          {Object.entries(groupedForAdjustments).map(([cls, items]) => {
            const subtotal = items.reduce(
              (acc, r) => ({
                currentYear: acc.currentYear + (Number(r.currentYear) || 0),
                priorYear: acc.priorYear + (Number(r.priorYear) || 0),
                adjustments: acc.adjustments + (Number(r.adjustments) || 0),
                finalBalance: acc.finalBalance + (Number(r.finalBalance) || 0),
              }),
              {
                currentYear: 0,
                priorYear: 0,
                adjustments: 0,
                finalBalance: 0,
              },
            )
            return (
              <div key={cls} className="border rounded-lg ">
                <div className="px-4 py-2 border-b bg-gray-50 font-medium">
                  {formatClassificationForDisplay(cls) || "Unclassified"}
                </div>
                <div className="">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left">Code</th>
                        <th className="px-4 py-2 text-left">Account Name</th>
                        <th className="px-4 py-2 text-right">Current Year</th>
                        <th className="px-4 py-2 text-right">Prior Year</th>
                        <th className="px-4 py-2 text-right">Adjustments</th>
                        <th className="px-4 py-2 text-right">Final Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((row) => (
                        <tr key={row.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                          <td className="px-4 py-2">{row.accountName}</td>
                          <td className="px-4 py-2 text-right">{row.currentYear.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{row.priorYear.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-medium">{row.adjustments.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right">{row.finalBalance.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/50 font-medium border-t">
                        <td className="px-4 py-2" colSpan={2}>
                          Subtotal
                        </td>
                        <td className="px-4 py-2 text-right">{subtotal.currentYear.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{subtotal.priorYear.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{subtotal.adjustments.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{subtotal.finalBalance.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {/* Grand Totals for Adjustments */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b bg-gray-50 font-medium">Adjustments — Grand Total</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="px-4 py-2 font-medium">Current Year</td>
                    <td className="px-4 py-2 text-right">{totals.currentYear.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Prior Year</td>
                    <td className="px-4 py-2 text-right">{totals.priorYear.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Adjustments</td>
                    <td className="px-4 py-2 text-right">{totals.adjustments.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-medium">Final Balance</td>
                    <td className="px-4 py-2 text-right">{totals.finalBalance.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    } else {
      // Normal classification/category table
      return (
        <div className="flex-1 border rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">Code</th>
                  <th className="px-4 py-2 text-left">Account Name</th>
                  <th className="px-4 py-2 text-right">Current Year</th>
                  <th className="px-4 py-2 text-right">Prior Year</th>
                  <th className="px-4 py-2 text-right">Adjustments</th>
                  <th className="px-4 py-2 text-right">Final Balance</th>
                </tr>
              </thead>
              <tbody>
                {sectionData.map((row) => (
                  <tr key={row.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{row.code}</td>
                    <td className="px-4 py-2">{row.accountName}</td>
                    <td className="px-4 py-2 text-right">{row.currentYear.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.priorYear.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{row.adjustments.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-medium">{row.finalBalance.toLocaleString()}</td>
                  </tr>
                ))}
                {sectionData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No data available for this classification
                    </td>
                  </tr>
                )}
                {sectionData.length > 0 && (
                  <tr className="bg-muted/50 font-medium">
                    <td className="px-4 py-2" colSpan={2}>
                      TOTALS
                    </td>
                    <td className="px-4 py-2 text-right">{totals.currentYear.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{totals.priorYear.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{totals.adjustments.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{totals.finalBalance.toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }
  }

  // Inline (normal) vs fullscreen (portal)
  if (!isFullscreen) {
    return <div className="h-full flex flex-col">{content}</div>
  }

  return (
    <FullscreenOverlay onExit={() => setIsFullscreen(false)}>
      <div className="absolute right-4 top-4 z-10">{/* Exit button handled by FullscreenOverlay */}</div>
      <div className="h-full w-full overflow-auto">{content}</div>
    </FullscreenOverlay>
  )
}
