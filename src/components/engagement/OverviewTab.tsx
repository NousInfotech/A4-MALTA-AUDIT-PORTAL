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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" }).format(amount ?? 0)
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
        // if (!res.ok) throw new Error(`Failed to fetch procedures (${res.status})`)
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
    </div>
  )
}
