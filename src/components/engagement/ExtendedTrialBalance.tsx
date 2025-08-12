"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, Calculator, Loader2, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

// 🔹 Shared authFetch helper
async function authFetch(url: string, options: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${data.session?.access_token}`,
      ...options.headers,
    },
  })
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
}

interface ExtendedTrialBalanceProps {
  engagement: any
  trialBalanceData: any
  onClassificationChange: (classifications: string[]) => void
}

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

// Auto-classification rules
const CLASSIFICATION_RULES = [
  { keywords: ["bank", "cash", "petty"], classification: "Assets > Current > Cash & Cash Equivalents" },
  {
    keywords: ["trade receivable", "trade debtor", "accounts receivable", "debtors"],
    classification: "Assets > Current > Trade Receivables",
  },
  { keywords: ["prepayment", "prepaid", "advance"], classification: "Assets > Current > Prepayments" },
  { keywords: ["inventory", "stock", "raw materials"], classification: "Assets > Current > Inventory" },
  {
    keywords: ["vat recoverable", "input vat", "tax receivable"],
    classification: "Assets > Current > Recoverable VAT/Tax",
  },
  {
    keywords: ["property", "plant", "equipment", "machinery", "furniture"],
    classification: "Assets > Non-current > Property, Plant & Equipment",
  },
  {
    keywords: ["trade payable", "creditors", "accounts payable", "supplier"],
    classification: "Liabilities > Current > Trade Payables",
  },
  { keywords: ["accrual", "accrued"], classification: "Liabilities > Current > Accruals" },
  { keywords: ["vat payable", "output vat", "tax payable"], classification: "Liabilities > Current > Taxes Payable" },
  { keywords: ["loan", "borrowing", "mortgage"], classification: "Liabilities > Non-current > Borrowings (Long-term)" },
  { keywords: ["share capital", "ordinary shares"], classification: "Equity > Share Capital" },
  { keywords: ["retained earnings", "profit brought forward"], classification: "Equity > Retained Earnings" },
  { keywords: ["sales", "revenue", "turnover", "income"], classification: "Income > Operating > Revenue (Goods)" },
  { keywords: ["salary", "wages", "payroll"], classification: "Expenses > Administrative Expenses > Payroll" },
  {
    keywords: ["rent", "utilities", "electricity"],
    classification: "Expenses > Administrative Expenses > Rent & Utilities",
  },
  { keywords: ["office", "admin", "stationery"], classification: "Expenses > Administrative Expenses > Office/Admin" },
  { keywords: ["marketing", "advertising"], classification: "Expenses > Administrative Expenses > Marketing" },
  { keywords: ["insurance", "premium"], classification: "Expenses > Administrative Expenses > Insurance" },
  {
    keywords: ["depreciation", "amortisation"],
    classification: "Expenses > Administrative Expenses > Depreciation & Amortisation",
  },
]

export const ExtendedTrialBalance: React.FC<ExtendedTrialBalanceProps> = ({
  engagement,
  trialBalanceData,
  onClassificationChange,
}) => {
  const [etbRows, setEtbRows] = useState<ETBRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (trialBalanceData) {
      initializeETB()
    }
  }, [trialBalanceData])

  const autoClassify = (accountName: string): string => {
    const name = accountName.toLowerCase()
    for (const rule of CLASSIFICATION_RULES) {
      if (rule.keywords.some((keyword) => name.includes(keyword))) {
        return rule.classification
      }
    }
    return ""
  }

  const initializeETB = () => {
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
        id: `row-${index}`,
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
    const uniqueClassifications = [...new Set(etbData.map((row) => row.classification).filter(Boolean))]
    onClassificationChange(uniqueClassifications)
  }

  const updateRow = (id: string, field: keyof ETBRow, value: any) => {
    setEtbRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value }
          if (field === "adjustments") {
            updatedRow.finalBalance = updatedRow.currentYear + Number(value)
          }
          return updatedRow
        }
        return row
      }),
    )
  }

  const handleClassificationChange = (id: string, classification: string) => {
    updateRow(id, "classification", classification)
    const updatedRows = etbRows.map((row) => (row.id === id ? { ...row, classification } : row))
    const uniqueClassifications = [...new Set(updatedRows.map((row) => row.classification).filter(Boolean))]
    onClassificationChange(uniqueClassifications)
  }

  const saveETB = async () => {
    setSaving(true)
    try {
      const response = await authFetch(`${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: etbRows }),
      })
      if (!response.ok) {
        throw new Error("Failed to save Extended Trial Balance")
      }
      toast({ title: "Success", description: "Extended Trial Balance saved successfully" })
    } catch (error: any) {
      console.error("Save error:", error)
      toast({ title: "Save failed", description: error.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const totals = etbRows.reduce(
    (acc, row) => ({
      currentYear: acc.currentYear + row.currentYear,
      priorYear: acc.priorYear + row.priorYear,
      adjustments: acc.adjustments + row.adjustments,
      finalBalance: acc.finalBalance + row.finalBalance,
    }),
    { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 },
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Extended Trial Balance
            </CardTitle>
          </div>
          <Button onClick={saveETB} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save ETB
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {unclassifiedRows.length > 0 && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {unclassifiedRows.length} rows need classification before proceeding to section creation.
            </AlertDescription>
          </Alert>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead className="text-right">Current Year</TableHead>
                <TableHead className="text-right">Prior Year</TableHead>
                <TableHead className="text-right">Adjustments</TableHead>
                <TableHead className="text-right">Final Balance</TableHead>
                <TableHead>Classification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {etbRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.code}</TableCell>
                  <TableCell>{row.accountName}</TableCell>
                  <TableCell className="text-right">{row.currentYear.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.priorYear.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={row.adjustments}
                      onChange={(e) => updateRow(row.id, "adjustments", Number(e.target.value))}
                      className="w-24 text-right"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">{row.finalBalance.toLocaleString()}</TableCell>
                  <TableCell>
                    <Select
                      value={row.classification}
                      onValueChange={(value) => handleClassificationChange(row.id, value)}
                    >
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select classification" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASSIFICATION_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}

              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-medium">
                <TableCell colSpan={2}>TOTALS</TableCell>
                <TableCell className="text-right">{totals.currentYear.toLocaleString()}</TableCell>
                <TableCell className="text-right">{totals.priorYear.toLocaleString()}</TableCell>
                <TableCell className="text-right">{totals.adjustments.toLocaleString()}</TableCell>
                <TableCell className="text-right font-bold">{totals.finalBalance.toLocaleString()}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Classification Summary */}
        <div className="mt-6">
          <h4 className="font-medium mb-3">Classification Summary</h4>
          <div className="flex flex-wrap gap-2">
            {[...new Set(etbRows.map((row) => row.classification).filter(Boolean))].map((classification) => {
              const count = etbRows.filter((row) => row.classification === classification).length
              return (
                <Badge key={classification} variant="secondary">
                  {classification.split(" > ").pop()} ({count})
                </Badge>
              )
            })}
            {unclassifiedRows.length > 0 && (
              <Badge variant="destructive">Unclassified ({unclassifiedRows.length})</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
