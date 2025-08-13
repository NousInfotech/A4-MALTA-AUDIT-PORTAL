"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Save,
  Calculator,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  ChevronsUpDown,
  Check,
  RefreshCw,
  ExternalLink,
  CloudUpload,
  CloudDownload,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------
   Helpers & Types
------------------------------------------------------- */

// Ensure each row has a unique client-only ID
const withClientIds = <T extends object>(rows: T[]) =>
  rows.map((r: any, i: number) => ({
    ...r,
    id: r.id || r._id || `row-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }))

interface ETBRow {
  id: string
  code: string
  accountName: string
  currentYear: number
  priorYear: number
  adjustments: number
  finalBalance: number
  classification: string
}

interface ExtendedTrialBalanceProps {
  engagement: any
  trialBalanceData: any
  onClassificationChange: (classifications: string[]) => void
  onClassificationJump?: (classification: string) => void
}

/* -------------------------------------------------------
   Domain data
------------------------------------------------------- */

const CLASSIFICATION_OPTIONS = [
  "Assets > Current > Cash & Cash Equivalents",
  "Assets > Current > Trade Receivables",
  "Assets > Current > Other Receivables",
  "Assets > Current > Prepayments",
  "Assets > Current > Inventory",
  "Assets > Current > Recoverable VAT/Tax",
  "Assets > Non-current > Property, Plant & Equipment",
  "Assets > Non-current > Intangible Assets",
  "Assets > Non-current > Investments",
  "Assets > Non-current > Deferred Tax Asset",
  "Assets > Non-current > Long-term Receivables/Deposits",
  "Liabilities > Current > Trade Payables",
  "Liabilities > Current > Accruals",
  "Liabilities > Current > Taxes Payable",
  "Liabilities > Current > Short-term Borrowings/Overdraft",
  "Liabilities > Current > Other Payables",
  "Liabilities > Non-current > Borrowings (Long-term)",
  "Liabilities > Non-current > Provisions",
  "Liabilities > Non-current > Deferred Tax Liability",
  "Liabilities > Non-current > Lease Liabilities",
  "Equity > Share Capital",
  "Equity > Share Premium",
  "Equity > Reserves",
  "Equity > Retained Earnings",
  "Income > Operating > Revenue (Goods)",
  "Income > Operating > Revenue (Services)",
  "Income > Operating > Other Operating Income",
  "Income > Non-operating > Other Income",
  "Income > Non-operating > FX Gains",
  "Expenses > Cost of Sales > Materials/Purchases",
  "Expenses > Cost of Sales > Freight Inwards",
  "Expenses > Cost of Sales > Manufacturing Labour",
  "Expenses > Cost of Sales > Production Overheads",
  "Expenses > Direct Costs",
  "Expenses > Administrative Expenses > Payroll",
  "Expenses > Administrative Expenses > Rent & Utilities",
  "Expenses > Administrative Expenses > Office/Admin",
  "Expenses > Administrative Expenses > Marketing",
  "Expenses > Administrative Expenses > Repairs & Maintenance",
  "Expenses > Administrative Expenses > IT & Software",
  "Expenses > Administrative Expenses > Insurance",
  "Expenses > Administrative Expenses > Professional Fees",
  "Expenses > Administrative Expenses > Depreciation & Amortisation",
  "Expenses > Administrative Expenses > Research & Development",
  "Expenses > Administrative Expenses > Lease Expenses",
  "Expenses > Administrative Expenses > Bank Charges",
  "Expenses > Administrative Expenses > Travel & Entertainment",
  "Expenses > Administrative Expenses > Training & Staff Welfare",
  "Expenses > Administrative Expenses > Telephone & Communication",
  "Expenses > Administrative Expenses > Subscriptions & Memberships",
  "Expenses > Administrative Expenses > Bad Debt Written Off",
  "Expenses > Administrative Expenses > Stationery & Printing",
  "Expenses > Finance Costs",
  "Expenses > Other > FX Losses",
  "Expenses > Other > Exceptional/Impairment",
]

const CLASSIFICATION_RULES = [
  { keywords: ["bank", "cash", "petty"], classification: "Assets > Current > Cash & Cash Equivalents" },
  { keywords: ["trade receivable", "trade debtor", "accounts receivable", "debtors"], classification: "Assets > Current > Trade Receivables" },
  { keywords: ["prepayment", "prepaid", "advance"], classification: "Assets > Current > Prepayments" },
  { keywords: ["inventory", "stock", "raw materials"], classification: "Assets > Current > Inventory" },
  { keywords: ["vat recoverable", "input vat", "tax receivable"], classification: "Assets > Current > Recoverable VAT/Tax" },
  { keywords: ["property", "plant", "equipment", "machinery", "furniture"], classification: "Assets > Non-current > Property, Plant & Equipment" },
  { keywords: ["trade payable", "creditors", "accounts payable", "supplier"], classification: "Liabilities > Current > Trade Payables" },
  { keywords: ["accrual", "accrued"], classification: "Liabilities > Current > Accruals" },
  { keywords: ["vat payable", "output vat", "tax payable"], classification: "Liabilities > Current > Taxes Payable" },
  { keywords: ["loan", "borrowing", "mortgage"], classification: "Liabilities > Non-current > Borrowings (Long-term)" },
  { keywords: ["share capital", "ordinary shares"], classification: "Equity > Share Capital" },
  { keywords: ["retained earnings", "profit brought forward"], classification: "Equity > Retained Earnings" },
  { keywords: ["sales", "revenue", "turnover", "income"], classification: "Income > Operating > Revenue (Goods)" },
  { keywords: ["salary", "wages", "payroll"], classification: "Expenses > Administrative Expenses > Payroll" },
  { keywords: ["rent", "utilities", "electricity"], classification: "Expenses > Administrative Expenses > Rent & Utilities" },
  { keywords: ["office", "admin", "stationery"], classification: "Expenses > Administrative Expenses > Office/Admin" },
  { keywords: ["marketing", "advertising"], classification: "Expenses > Administrative Expenses > Marketing" },
  { keywords: ["insurance", "premium"], classification: "Expenses > Administrative Expenses > Insurance" },
  { keywords: ["depreciation", "amortisation"], classification: "Expenses > Administrative Expenses > Depreciation & Amortisation" },
]

/* -------------------------------------------------------
   Classification split helpers
------------------------------------------------------- */

const getClassificationLevels = (classification: string) => {
  const parts = (classification || "").split(" > ")
  return { level1: parts[0] || "", level2: parts[1] || "", level3: parts[2] || "" }
}
const buildClassification = (level1: string, level2: string, level3: string) =>
  [level1, level2, level3].filter(Boolean).join(" > ")
const getUniqueLevel1 = () => [...new Set(CLASSIFICATION_OPTIONS.map((opt) => opt.split(" > ")[0]))]
const getUniqueLevel2 = (level1: string) => [
  ...new Set(CLASSIFICATION_OPTIONS.filter((opt) => opt.startsWith(level1)).map((opt) => opt.split(" > ")[1]).filter(Boolean)),
]
const getUniqueLevel3 = (level1: string, level2: string) => [
  ...new Set(CLASSIFICATION_OPTIONS.filter((opt) => opt.startsWith(`${level1} > ${level2}`)).map((opt) => opt.split(" > ")[2]).filter(Boolean)),
]
const formatClassificationForDisplay = (c: string) => {
  if (!c) return "—"
  const parts = c.split(" > ")
  const top = parts[0]
  if (top === "Assets" || top === "Liabilities") return parts[parts.length - 1]
  return top
}
const hasNonZeroAdjustments = (rows: ETBRow[]) => rows.some((r) => Number(r.adjustments) !== 0)

/* -------------------------------------------------------
   Searchable Combobox (shadcn style)
------------------------------------------------------- */

type ComboOption = { value: string; label?: string }
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  emptyText = "No results.",
  disabled,
  widthClass = "w-40",
}: {
  value: string
  onChange: (value: string) => void
  options: string[] | ComboOption[]
  placeholder?: string
  className?: string
  emptyText?: string
  disabled?: boolean
  widthClass?: string
}) {
  const [open, setOpen] = useState(false)
  const normalized = useMemo<ComboOption[]>(
    () =>
      (options as any[]).map((o) =>
        typeof o === "string" ? { value: o, label: o } : ({ value: o.value, label: o.label ?? o.value } as ComboOption),
      ),
    [options],
  )
  const selectedLabel = normalized.find((o) => o.value === value)?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", widthClass, className)}
          disabled={disabled}
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {selectedLabel || placeholder || "Select"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("p-0", widthClass)}>
        <Command filter={(val, search) => (val.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder={placeholder || "Search..."} />
          <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">{emptyText}</CommandEmpty>
          <CommandGroup className="max-h-24 w-auto overflow-auto">
            {normalized.map((opt) => (
              <CommandItem
                key={opt.value}
                value={opt.label || opt.value}
                onSelect={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className="cursor-pointer"
              >
                <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{opt.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/* -------------------------------------------------------
   Auth fetch helper (Supabase token)
------------------------------------------------------- */

async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const headers = new Headers(options.headers || {})
  if (data.session?.access_token) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`)
  }
  return fetch(url, { ...options, headers })
}

/* -------------------------------------------------------
   Component
------------------------------------------------------- */

export const ExtendedTrialBalance: React.FC<ExtendedTrialBalanceProps> = ({
  engagement,
  trialBalanceData,
  onClassificationChange,
  onClassificationJump,
}) => {
  const [etbRows, setEtbRows] = useState<ETBRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [excelUrl, setExcelUrl] = useState<string>("")
  const { toast } = useToast()

  const refreshClassificationSummary = (rows: ETBRow[]) => {
    const unique = new Set(rows.map((r) => r.classification).filter(Boolean))
    if (hasNonZeroAdjustments(rows)) unique.add("Adjustments")
    onClassificationChange([...unique])
  }

  useEffect(() => {
    if (trialBalanceData) initializeETB()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialBalanceData])

  const autoClassify = (accountName: string): string => {
    const name = (accountName || "").toLowerCase()
    for (const rule of CLASSIFICATION_RULES) {
      if (rule.keywords.some((keyword) => name.includes(keyword))) return rule.classification
    }
    return ""
  }

  const initializeETB = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!data.session?.access_token) throw new Error("Not authenticated")

      const etbResponse = await fetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
        }
      )

      if (etbResponse.ok) {
        const existingETB = await etbResponse.json()
        if (existingETB.rows && existingETB.rows.length > 0) {
          const rowsWithIds = withClientIds(existingETB.rows)
          setEtbRows(rowsWithIds)
          refreshClassificationSummary(rowsWithIds)
          setLoading(false)
          return
        }
      }

      if (!trialBalanceData?.data) return

      const [headers, ...rows] = trialBalanceData.data
      const codeIndex = headers.findIndex((h: string) => h.toLowerCase().includes("code"))
      const nameIndex = headers.findIndex((h: string) => h.toLowerCase().includes("account name"))
      const currentYearIndex = headers.findIndex((h: string) => h.toLowerCase().includes("current year"))
      const priorYearIndex = headers.findIndex((h: string) => h.toLowerCase().includes("prior year"))

      const etbData: ETBRow[] = rows.map((row: any[], index: number) => {
        const accountName = row[nameIndex] || ""
        const currentYear = Number(row[currentYearIndex]) || 0
        const adjustments = 0
        return {
          id: `row-${index}-${Date.now()}`,
          code: row[codeIndex] || "",
          accountName,
          currentYear,
          priorYear: Number(row[priorYearIndex]) || 0,
          adjustments,
          finalBalance: currentYear + adjustments,
          classification: autoClassify(accountName),
        }
      })

      setEtbRows(etbData)
      refreshClassificationSummary(etbData)
    } catch (error) {
      console.error("Failed to initialize ETB:", error)
    } finally {
      setLoading(false)
    }
  }

  const addNewRow = () => {
    const newRow: ETBRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      code: "",
      accountName: "",
      currentYear: 0,
      priorYear: 0,
      adjustments: 0,
      finalBalance: 0,
      classification: "",
    }
    const newRows = [...etbRows, newRow]
    setEtbRows(newRows)
    refreshClassificationSummary(newRows)
  }

  const deleteRow = (id: string) => {
    const newRows = etbRows.filter((row) => row.id !== id)
    setEtbRows(newRows)
    refreshClassificationSummary(newRows)
  }

  const updateRow = (id: string, field: keyof ETBRow, value: any) => {
    const newRows = etbRows.map((row) => {
      if (row.id !== id) return row
      const updatedRow = { ...row, [field]: value }
      if (field === "adjustments" || field === "currentYear") {
        updatedRow.finalBalance = Number(updatedRow.currentYear) + Number(updatedRow.adjustments)
      }
      return updatedRow
    })
    setEtbRows(newRows)
    refreshClassificationSummary(newRows)
  }

  // Save ETB (optionally mute toast)
  const saveETB = async (showToast = true) => {
    setSaving(true)
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!data.session?.access_token) throw new Error("Not authenticated")

      const response = await fetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ rows: etbRows }),
        }
      )

      if (!response.ok) throw new Error("Failed to save Extended Trial Balance")

      refreshClassificationSummary(etbRows)
      if (showToast) toast({ title: "Success", description: "Extended Trial Balance saved successfully" })
    } catch (error: any) {
      console.error("Save error:", error)
      toast({ title: "Save failed", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  /* ---------------------------------------------
     Excel Cloud actions (init/open, push, pull)
  --------------------------------------------- */

  async function openInExcel() {
    setLoading(true)
    try {
      const res = await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb/excel/init`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to initialize Excel workbook.")
      const json = await res.json()
      setExcelUrl(json.url)
      window.open(json.url, "_blank")
      toast({ title: "Excel Online", description: "Workbook is ready and opened in a new tab." })
    } catch (e: any) {
      console.error(e)
      toast({ title: "Excel error", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function pushToCloud() {
    setLoading(true)
    try {
      // Save ETB before push (so backend reads latest rows)
      await saveETB(false)

      const res = await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb/excel/push`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to push ETB to Excel.")
      const json = await res.json()
      setExcelUrl(json.url)
      toast({ title: "Pushed", description: "ETB uploaded to Excel Online." })
    } catch (e: any) {
      console.error(e)
      toast({ title: "Push failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function pullFromCloud() {
    setLoading(true)
    try {
      const res = await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb/excel/pull`, {
        method: "POST",
      })
      if (!res.ok) throw new Error("Failed to fetch data from Excel Online.")
      const etb = await res.json()
      const withIds = (etb.rows || []).map((r: any, i: number) => ({ id: r.id || `row-${i}-${Date.now()}`, ...r }))
      setEtbRows(withIds)
      refreshClassificationSummary(withIds)
      toast({ title: "Fetched", description: "Latest data pulled from Excel into ETB." })
    } catch (e: any) {
      console.error(e)
      toast({ title: "Fetch failed", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  /* ---------------------------------------------
     Totals & UI
  --------------------------------------------- */

  const totals = useMemo(
    () =>
      etbRows.reduce(
        (acc, row) => ({
          currentYear: acc.currentYear + Number(row.currentYear) || 0,
          priorYear: acc.priorYear + Number(row.priorYear) || 0,
          adjustments: acc.adjustments + Number(row.adjustments) || 0,
          finalBalance: acc.finalBalance + Number(row.finalBalance) || 0,
        }),
        { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 },
      ),
    [etbRows],
  )

  const unclassifiedRows = etbRows.filter((row) => !row.classification)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading Extended Trial Balance...</span>
      </div>
    )
  }

  /* ---------------------------------------------
     Row-level Classification Controls
  --------------------------------------------- */

  const ClassificationCombos: React.FC<{ row: ETBRow }> = ({ row }) => {
    const levels = getClassificationLevels(row.classification)
    const [level1, setLevel1] = useState(levels.level1)
    const [level2, setLevel2] = useState(levels.level2)
    const [level3, setLevel3] = useState(levels.level3)

    useEffect(() => {
      const lv = getClassificationLevels(row.classification)
      setLevel1(lv.level1); setLevel2(lv.level2); setLevel3(lv.level3)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row.classification])

    const level2Options = useMemo(() => (level1 ? getUniqueLevel2(level1) : []), [level1])
    const level3Options = useMemo(
      () => (level1 && level2 ? getUniqueLevel3(level1, level2) : []),
      [level1, level2],
    )

    const onL1 = (v: string) => {
      setLevel1(v); setLevel2(""); setLevel3("")
      updateRow(row.id, "classification", buildClassification(v, "", ""))
    }
    const onL2 = (v: string) => {
      setLevel2(v); setLevel3("")
      updateRow(row.id, "classification", buildClassification(level1, v, ""))
    }
    const onL3 = (v: string) => {
      setLevel3(v)
      updateRow(row.id, "classification", buildClassification(level1, level2, v))
    }

    return (
      <div className="flex items-center gap-2">
        <SearchableSelect
          value={level1}
          onChange={onL1}
          options={getUniqueLevel1()}
          placeholder="Level 1"
          className="max-h-44 overflow-y-auto"
        />
        {level2Options.length > 0 && (
          <SearchableSelect
            value={level2}
            className="max-h-44 overflow-y-auto"
            onChange={onL2}
            options={level2Options}
            placeholder="Level 2"
          />
        )}
        {level3Options.length > 0 && (
          <SearchableSelect
            value={level3}
            onChange={onL3}
            options={level3Options}
            placeholder="Level 3"
            className="max-h-44 w-auto overflow-y-auto"
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">

      {/* ----- Main ETB Card (original UI preserved) ----- */}
      <Card className="border-muted-foreground/10 flex-1">
        <CardHeader className=" top-0 z-10 bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/40">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Extended Trial Balance
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openInExcel} title="Create/Reuse workbook and open">
                <ExternalLink className="h-4 w-4 mr-2" /> Open in Excel Online
              </Button>
              <Button size="sm" variant="outline" onClick={pushToCloud} title="Overwrite Excel from current ETB">
                <CloudUpload className="h-4 w-4 mr-2" /> Push to Cloud
              </Button>
              <Button variant="outline" size="sm" onClick={pullFromCloud} title="Fetch Excel back into ETB">
                <CloudDownload className="h-4 w-4 mr-2" /> Fetch from Cloud
              </Button>
              
              <Button variant="outline" onClick={() => saveETB(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save ETB
              </Button>
              <Button onClick={addNewRow} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* Unclassified notice */}
          {unclassifiedRows.length > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {unclassifiedRows.length} rows are unclassified. You can save the ETB and classify them later.
              </AlertDescription>
            </Alert>
          )}

          {/* Grid */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="min-w-[6rem]">Code</TableHead>
                    <TableHead className="min-w-[16rem]">Account Name</TableHead>
                    <TableHead className="text-right min-w-[8rem]">Current Year</TableHead>
                    <TableHead className="text-right min-w-[8rem]">Prior Year</TableHead>
                    <TableHead className="text-right min-w-[8rem]">Adjustments</TableHead>
                    <TableHead className="text-right min-w-[10rem]">Final Balance</TableHead>
                    <TableHead className="min-w-[22rem]">Classification</TableHead>
                    <TableHead className="w-[4rem]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {etbRows.map((row, idx) => (
                    <TableRow
                      key={row.id}
                      className={cn(idx % 2 === 1 && "bg-muted/20", "hover:bg-muted/40 transition-colors")}
                    >
                      <TableCell>
                        <Input
                          value={row.code}
                          onChange={(e) => updateRow(row.id, "code", e.target.value)}
                          className="w-24 font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.accountName}
                          onChange={(e) => updateRow(row.id, "accountName", e.target.value)}
                          className="min-w-64"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={row.currentYear}
                          onChange={(e) => updateRow(row.id, "currentYear", Number(e.target.value))}
                          className="w-28 text-right"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={row.priorYear}
                          onChange={(e) => updateRow(row.id, "priorYear", Number(e.target.value))}
                          className="w-28 text-right"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={row.adjustments}
                          onChange={(e) => updateRow(row.id, "adjustments", Number(e.target.value))}
                          className="w-28 text-right"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {Number(row.finalBalance).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="cursor-pointer"
                            title="Jump to section"
                            onClick={() => row.classification && onClassificationJump?.(row.classification)}
                          >
                            {formatClassificationForDisplay(row.classification)}
                          </Badge>
                          <ClassificationCombos row={row} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRow(row.id)}
                          className="text-red-600 hover:text-red-700"
                          aria-label="Delete row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals Row */}
                  <TableRow className="bg-muted/60 font-medium">
                    <TableCell colSpan={2}>TOTALS</TableCell>
                    <TableCell className="text-right">{totals.currentYear.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{totals.priorYear.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{totals.adjustments.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-bold">{totals.finalBalance.toLocaleString()}</TableCell>
                    <TableCell colSpan={2}></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer actions & summary */}
          <div className="mt-6 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              {[...new Set(etbRows.map((row) => row.classification).filter(Boolean))].map((classification) => {
                const count = etbRows.filter((row) => row.classification === classification).length
                return (
                  <Badge
                    key={classification}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => onClassificationJump?.(classification)}
                    title="Open in Sections"
                  >
                    {formatClassificationForDisplay(classification)} ({count})
                  </Badge>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Button onClick={addNewRow} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Row
              </Button>
              <Button onClick={() => saveETB(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>

          {!!excelUrl && (
            <div className="mt-2 text-xs">
              <a className="underline" href={excelUrl} target="_blank" rel="noreferrer">
                Reopen Excel Online
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ExtendedTrialBalance
