// @ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Sparkles, CheckCircle, AlertCircle, Eye, RefreshCw } from 'lucide-react'
import { ProcedureTypeSelection } from "./ProcedureTypeSelection"
import { ProcedureGeneration } from "./ProcedureGeneration" // Fieldwork
import { PlanningProcedureGeneration } from "./PlanningProcedureGeneration"
import { ProcedureView } from "./ProcedureView" // Fieldwork view
import { PlanningProcedureView } from "./PlanningProcedureView" // NEW
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

// Keep your authFetch helper
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

interface ProceduresTabProps { engagement: any }

export const ProceduresTab: React.FC<ProceduresTabProps> = ({ engagement }) => {
  const [activeTab, setActiveTab] = useState("generate")
  const [selectedProcedureType, setSelectedProcedureType] = useState<"planning" | "fieldwork" | "completion" | null>(null)
  const [fieldworkProcedure, setFieldworkProcedure] = useState<any>(null)
  const [planningProcedure, setPlanningProcedure] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (!engagement?._id) return
    // Preload both so "View" works immediately after selection
    loadFieldwork()
    loadPlanning()
  }, [engagement?._id])

  const base = import.meta.env.VITE_APIURL

  const loadFieldwork = async () => {
    try {
      const res = await authFetch(`${base}/api/procedures/${engagement._id}`)
      if (res.ok) setFieldworkProcedure(await res.json())
    } catch {}
  }
  const loadPlanning = async () => {
    try {
      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}`)
      if (res.ok) setPlanningProcedure(await res.json())
    } catch {}
  }

  const handleProcedureComplete = (procedureData: any) => {
    if (procedureData?.procedureType === "planning") {
      setPlanningProcedure(procedureData)
    } else {
      setFieldworkProcedure(procedureData)
    }
    setActiveTab("view")
    toast({ title: "Procedures Generated", description: "Saved successfully." })
  }

  const handleRegenerate = () => {
    setSelectedProcedureType(null)
    setActiveTab("generate")
  }

  const getProcedureStatusBadge = () => {
    const procedure =
      selectedProcedureType === "planning" ? planningProcedure :
      selectedProcedureType === "fieldwork" ? fieldworkProcedure : null
    if (!procedure) return null

    const statusConfig = {
      draft: { variant: "secondary" as const, label: "Draft", icon: FileText },
      "in-progress": { variant: "default" as const, label: "In Progress", icon: AlertCircle },
      completed: { variant: "default" as const, label: "Completed", icon: CheckCircle },
    }
    const config = statusConfig[procedure.status] || statusConfig.draft
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getProcedureTypeBadge = () => {
    if (!selectedProcedureType) return null
    const typeConfig = {
      planning: { label: "Planning", color: "bg-blue-500" },
      fieldwork: { label: "Field Work", color: "bg-green-500" },
      completion: { label: "Completion", color: "bg-purple-500" },
    }
    const config = typeConfig[selectedProcedureType]
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <div className={`h-2 w-2 rounded-full ${config.color}`} />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-2xl text-foreground">Audit Procedures</h2>
          <div className="flex items-center gap-2">
            {getProcedureStatusBadge()}
            {getProcedureTypeBadge()}
          </div>
        </div>
        {
          (selectedProcedureType)&&(
            <Button variant="outline" onClick={handleRegenerate} className="flex items-center gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" /> Back to Procedure Selection
          </Button>
          )
        }
          
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Generate Procedures
          </TabsTrigger>
          <TabsTrigger value="view" className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> View Procedures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="flex-1 mt-6">
          {!selectedProcedureType ? (
            <ProcedureTypeSelection onTypeSelect={setSelectedProcedureType} />
          ) : selectedProcedureType === "planning" ? (
            <PlanningProcedureGeneration
              engagement={engagement}
              existingProcedure={planningProcedure}
              onComplete={handleProcedureComplete}
              onBack={() => setSelectedProcedureType(null)}
            />
          ) : selectedProcedureType === "fieldwork" ? (
            <ProcedureGeneration
              engagement={engagement}
              existingProcedure={fieldworkProcedure}
              onComplete={handleProcedureComplete}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-body-semibold text-lg text-foreground mb-2">Coming Soon</h3>
                <p className="text-muted-foreground font-body">Completion procedures will be available soon.</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="view" className="flex-1 mt-6">
          {!selectedProcedureType ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-body-semibold text-lg text-foreground mb-2">Select a procedure type</h3>
                <p className="text-muted-foreground font-body">Choose Planning or Fieldwork to view.</p>
              </div>
            </div>
          ) : selectedProcedureType === "planning" ? (
            planningProcedure ? <PlanningProcedureView procedure={planningProcedure} /> : <div className="text-muted-foreground">No Planning procedures found.</div>
          ) : selectedProcedureType === "fieldwork" ? (
            fieldworkProcedure && fieldworkProcedure.status === "completed"
              ? <ProcedureView procedure={fieldworkProcedure} engagement={engagement} onRegenerate={handleRegenerate} />
              : <div className="text-muted-foreground">No Fieldwork procedures found.</div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
