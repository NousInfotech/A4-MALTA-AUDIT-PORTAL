// @ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, ArrowRight, ArrowLeft, Filter, AlertCircle, Euro } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface ClassificationStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
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

export const ClassificationStep: React.FC<ClassificationStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [etbRows, setEtbRows] = useState<any[]>([])
  const [validitySelections, setValiditySelections] = useState<any[]>([])
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadETBData()
  }, [engagement?._id, stepData.materiality])

  const loadETBData = async () => {
    setLoading(true)
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) {
        console.warn("VITE_APIURL is not set")
        return
      }

      const response = await authFetch(`${base}/api/engagements/${engagement?._id}/etb`)
      if (response.ok) {
        const etbData = await response.json()
        const rows = etbData.rows || []
        setEtbRows(rows)

        // Initialize validity selections based on materiality
        const initialSelections = rows.map((row: any, idx: number) => {
  const rowId =
    row.id ??
    row._id ??
    `${row.code ?? "NA"}::${row.accountName ?? "NA"}::${idx}`

  return {
    rowId,
    code: row.code,
    accountName: row.accountName,
    finalBalance: row.finalBalance,
    classification: row.classification,
    isValid: Math.abs(row.finalBalance ?? 0) >= (stepData.materiality || 0),
  }
})


        setValiditySelections(initialSelections)

        // Get unique classifications from selected rows
        const validRows = initialSelections.filter((s) => s.isValid && s.classification)
        const uniqueClassifications = [...new Set(validRows.map((r) => getDeepestClassification(r.classification)))]
        setSelectedClassifications(uniqueClassifications)
      }
    } catch (error) {
      console.error("Error loading ETB data:", error)
      toast({
        title: "Error Loading Data",
        description: "Failed to load Extended Trial Balance data.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getDeepestClassification = (classification: string) => {
    if (!classification) return ""
    const parts = classification.split(" > ")
    const topLevel = parts[0]
    // For Assets and Liabilities, return the deepest level
    if (topLevel === "Assets" || topLevel === "Liabilities") {
      return classification
    }
    // For others, return the top level
    return topLevel
  }

  const formatClassificationForDisplay = (classification: string) => {
    if (!classification) return "Unclassified"
    const parts = classification.split(" > ")
    const topLevel = parts[0]
    if (topLevel === "Assets" || topLevel === "Liabilities") {
      return parts[parts.length - 1]
    }
    return topLevel
  }

  const handleValidityChange = (rowId: string, isValid: boolean) => {
  setValiditySelections((prev) => {
    const next = prev.map((selection) =>
      selection.rowId === rowId ? { ...selection, isValid } : selection
    )

    const validRows = next.filter((s) => s.isValid && s.classification)
    const uniqueClassifications = [
      ...new Set(validRows.map((r) => getDeepestClassification(r.classification))),
    ]

    setSelectedClassifications(uniqueClassifications)
    return next
  })
}


  const handleSelectAll = () => {
    const allSelected = validitySelections.every((s) => s.isValid)
    const newIsValid = !allSelected

    setValiditySelections((prev) => {
      const next = prev.map((selection) => ({ ...selection, isValid: newIsValid }))
      const validRows = next.filter((s) => s.isValid && s.classification)
      const uniqueClassifications = [
        ...new Set(validRows.map((r) => getDeepestClassification(r.classification))),
      ]
      setSelectedClassifications(uniqueClassifications)
      return next
    })
  }

  const handleClassificationToggle = (classification: string) => {
    setSelectedClassifications((prev) =>
      prev.includes(classification) ? prev.filter((c) => c !== classification) : [...prev, classification],
    )
  }

  const handleProceed = () => {
    if (selectedClassifications.length === 0) {
      toast({
        title: "No Classifications Selected",
        description: "Please select at least one classification to proceed.",
        variant: "destructive",
      })
      return
    }

    onComplete({
      validitySelections,
      selectedClassifications,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const validSelections = validitySelections.filter((s) => s.isValid)
  const totalValidAmount = validSelections.reduce((sum, s) => sum + Math.abs(s.finalBalance), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-body">Loading Extended Trial Balance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Account Selection & Classifications
          </CardTitle>
          <p className="text-muted-foreground font-body">
            Review and adjust the accounts selected based on your materiality threshold of{" "}
            <strong>{formatCurrency(stepData.materiality)}</strong>. Then confirm the classifications for procedure
            generation.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Selected Accounts</p>
                <p className="text-xl font-body-semibold text-foreground">{validSelections.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Euro className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Total Amount</p>
                <p className="text-xl font-body-semibold text-foreground">{formatCurrency(totalValidAmount)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <AlertCircle className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Classifications</p>
                <p className="text-xl font-body-semibold text-foreground">{selectedClassifications.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ETB Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-lg text-foreground">Extended Trial Balance</CardTitle>
            <Button
              size="sm"
              onClick={handleSelectAll}
              className="font-body"
            >
              {validitySelections.every((s) => s.isValid) ? "Deselect All" : "Select All"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Accounts with final balance ≥ {formatCurrency(stepData.materiality)} are pre-selected. You can adjust
            selections manually.
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Valid</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Final Balance</TableHead>
                  <TableHead>Classification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validitySelections.map((selection) => (
                  <TableRow key={selection?.rowId} className={selection.isValid ? "bg-muted/20" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={selection.isValid}
                        onCheckedChange={(checked) => handleValidityChange(selection.rowId, !!checked)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{selection.code}</TableCell>
                    <TableCell className="font-body">{selection.accountName}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(selection.finalBalance)}</TableCell>
                    <TableCell>
                      {selection.classification ? (
                        <Badge variant="outline" className="font-body text-xs">
                          {formatClassificationForDisplay(selection.classification)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm font-body">Unclassified</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Classifications Selection */}
      {selectedClassifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg text-foreground">Selected Classifications</CardTitle>
            <p className="text-sm text-muted-foreground font-body">
              These classifications will be used for procedure generation. You can deselect any you don't want to
              include.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[...new Set(validSelections.map((s) => getDeepestClassification(s.classification)).filter(Boolean))].map(
                (classification) => (
                  <div key={classification} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedClassifications.includes(classification)}
                      onCheckedChange={() => handleClassificationToggle(classification)}
                    />
                    <Badge
                      variant={selectedClassifications.includes(classification) ? "default" : "outline"}
                      className="font-body cursor-pointer"
                      onClick={() => handleClassificationToggle(classification)}
                    >
                      {formatClassificationForDisplay(classification)}
                    </Badge>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClassifications.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-body">
            No classifications are currently selected. Please select at least one account with a classification to
            proceed with procedure generation.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-end justify-end">
          {/* <Button variant="outline" onClick={onBack} className="flex items-center gap-2 bg-transparent">
            <ArrowLeft className="h-4 w-4 text-brand-body" />
            Back to Materiality
          </Button> */}
        <Button
          onClick={handleProceed}
          disabled={selectedClassifications.length === 0}
          className="flex items-center gap-2"
        >
          Proceed to Procedures
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

