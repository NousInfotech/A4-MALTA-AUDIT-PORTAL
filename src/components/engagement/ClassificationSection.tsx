"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Download, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "../../integrations/supabase/client" // make sure this path is correct

interface ClassificationSectionProps {
  engagement: any
  classification: string
  onClose?: () => void
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

// Helper that always attaches Supabase auth token
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

export const ClassificationSection: React.FC<ClassificationSectionProps> = ({
  engagement,
  classification,
  onClose,
}) => {
  const [loading, setLoading] = useState(false)
  const [sectionData, setSectionData] = useState<ETBRow[]>([])
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>("")
  const { toast } = useToast()

  useEffect(() => {
    loadSectionData()
  }, [classification])

  const loadSectionData = async () => {
    setLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb/classification/${encodeURIComponent(
          classification,
        )}`,
      )

      if (!response.ok) {
        throw new Error("Failed to load section data")
      }

      const data = await response.json()
      setSectionData(data.rows || [])
      setSpreadsheetUrl(data.spreadsheetUrl || "")
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
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb/classification/${encodeURIComponent(
          classification,
        )}/reload`,
        {
          method: "POST",
        },
      )

      if (!response.ok) {
        throw new Error("Failed to reload data from ETB")
      }

      const data = await response.json()
      setSectionData(data.rows || [])

      if (spreadsheetUrl) {
        await updateSpreadsheet(data.rows)
      }

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

  const createSpreadsheet = async () => {
    setLoading(true)
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb/classification/${encodeURIComponent(
          classification,
        )}/spreadsheet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: sectionData,
          }),
        },
      )

      if (!response.ok) {
        throw new Error("Failed to create spreadsheet")
      }

      const result = await response.json()
      setSpreadsheetUrl(result.spreadsheetUrl)

      toast({
        title: "Success",
        description: "Spreadsheet created successfully",
      })
    } catch (error: any) {
      console.error("Create spreadsheet error:", error)
      toast({
        title: "Create failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateSpreadsheet = async (data: ETBRow[]) => {
    try {
      const response = await authFetch(
        `${import.meta.env.VITE_APIURL}/api/engagements/${engagement._id}/etb/classification/${encodeURIComponent(
          classification,
        )}/spreadsheet/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: data || sectionData,
            spreadsheetUrl,
          }),
        },
      )

      if (!response.ok) {
        throw new Error("Failed to update spreadsheet")
      }
    } catch (error: any) {
      console.error("Update spreadsheet error:", error)
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getClassificationDisplayName = (classification: string) => {
    const parts = classification.split(" > ")
    return parts[parts.length - 1]
  }

  const calculateTotals = () => {
    return sectionData.reduce(
      (acc, row) => ({
        currentYear: acc.currentYear + row.currentYear,
        priorYear: acc.priorYear + row.priorYear,
        adjustments: acc.adjustments + row.adjustments,
        finalBalance: acc.finalBalance + row.finalBalance,
      }),
      { currentYear: 0, priorYear: 0, adjustments: 0, finalBalance: 0 },
    )
  }

  const totals = calculateTotals()

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{getClassificationDisplayName(classification)}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {sectionData.length} accounts
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={reloadDataFromETB} disabled={loading} variant="outline" size="sm">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Reload Data
              </Button>
              {!spreadsheetUrl && (
                <Button onClick={createSpreadsheet} disabled={loading || sectionData.length === 0} size="sm">
                  Create Spreadsheet
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
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

          {/* Embedded Spreadsheet */}
          <div className="flex-1 border rounded-lg overflow-hidden">
            {spreadsheetUrl ? (
              <iframe
                src={`${spreadsheetUrl}?embedded=true`}
                className="w-full h-full min-h-[500px]"
                frameBorder="0"
                title={`${getClassificationDisplayName(classification)} Spreadsheet`}
              />
            ) : (
              // <div className="flex items-center justify-center h-full bg-gray-50">
              //   <div className="text-center">
              //     <h3 className="text-lg font-medium text-gray-900 mb-2">No Spreadsheet Created</h3>
              //     <p className="text-gray-500 mb-4">Create a spreadsheet to work with this classification data</p>
              //     <Button onClick={createSpreadsheet} disabled={loading || sectionData.length === 0}>
              //       {loading ? (
              //         <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              //       ) : (
              //         <Download className="h-4 w-4 mr-2" />
              //       )}
              //       Create Spreadsheet
              //     </Button>
              //   </div>
              // </div>
              <></>
            )}
          </div>

          {/* Account List */}
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium mb-2">Accounts in this classification:</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sectionData.map((row) => (
                <div key={row.id} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{row.code}</span>
                  <span className="flex-1 mx-2">{row.accountName}</span>
                  <span className="font-medium">{row.finalBalance.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
