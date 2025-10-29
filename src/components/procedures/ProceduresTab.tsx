// @ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
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
import { CompletionProcedureGeneration } from "./CompletionProcedureGeneration"
import { CompletionProcedureView } from "./CompletionProcedureView"

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
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Read navigation state from URL query parameters
  // Format: ?section=procedures&procedureTab=generate&procedureType=planning&mode=ai&step=2
  const activeTab = searchParams.get("procedureTab") || "generate"
  const selectedProcedureType = (searchParams.get("procedureType") as "planning" | "fieldwork" | "completion") || null
  
  const [fieldworkProcedure, setFieldworkProcedure] = useState<any>(null)
  const [completionProcedure, setCompletionProcedure] = useState<any>(null)
  const [planningProcedure, setPlanningProcedure] = useState<any>(null)
  const { toast } = useToast()

  // Helper function to update URL parameters while preserving other params (like section)
  const updateProcedureParams = (updates: Record<string, string | null>, replace = false) => {
    const newParams = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        newParams.delete(key)
      } else {
        newParams.set(key, value)
      }
    })
    setSearchParams(newParams, { replace })
  }

  useEffect(() => {
    if (!engagement?._id) return;
    loadFieldwork();
    loadPlanning();
    loadCompletion();
  }, [engagement?._id]);

  // Note: Navigation state is automatically synced from URL parameters via searchParams
  // This enables proper browser back/forward navigation through procedure steps


  const base = import.meta.env.VITE_APIURL
  const loadFieldwork = async () => {
    try {
      const res = await authFetch(`${base}/api/procedures/${engagement._id}`);
      const data = await res.json();
      console.log('API Response:', data); // Debugging response

      // Check if the procedure exists in the response
      if (res.ok && data?.procedure) {
        console.log('Setting fieldwork procedure:', data.procedure); // Debugging
        setFieldworkProcedure(data.procedure); // Set the procedure directly into the state
      } else {
        console.error("Fieldwork procedure not found");
      }
    } catch (error) {
      console.error("Error fetching fieldwork procedure:", error);
    }
  }

  const loadCompletion = async () => {
    try {
      const res = await authFetch(`${base}/api/completion-procedures/${engagement._id}`)
      if (res.ok) setCompletionProcedure(await res.json())
    } catch { }
  }

  const loadPlanning = async () => {
    try {
      const res = await authFetch(`${base}/api/planning-procedures/${engagement._id}`)
      if (res.ok) setPlanningProcedure(await res.json())
    } catch { }
  }

  const handleProcedureComplete = (procedureData: any) => {
    if (procedureData?.procedureType === "planning") {
      setPlanningProcedure(procedureData)
    } else if (procedureData?.procedureType === "fieldwork" || procedureData?.procedureType === "procedures") {
      setFieldworkProcedure(procedureData)
    } else {
      setCompletionProcedure(procedureData)
    }
    // Navigate to view tab and clear procedure generation params
    updateProcedureParams({ 
      procedureTab: "view",
      procedureType: procedureData?.procedureType === "procedures" ? "fieldwork" : procedureData?.procedureType || null,
      mode: null,
      step: null
    }, false) // Create new history entry
    toast({ title: "Procedures Generated", description: "Saved successfully." })
  }

  const handleRegenerate = () => {
    // Clear procedure generation params, stay on generate tab
    updateProcedureParams({ 
      procedureType: null,
      mode: null,
      step: null
    }, false) // Create new history entry
  }

  const handleTabChange = (tab: string) => {
    updateProcedureParams({ procedureTab: tab }, false) // Create new history entry
  }

  const handleProcedureTypeSelect = (type: "planning" | "fieldwork" | "completion") => {
    // Set procedure type and clear mode/step (will be set by the generation component)
    updateProcedureParams({ 
      procedureType: type,
      mode: null,
      step: null
    }, false) // Create new history entry
  }

  const handleProcedureTypeBack = () => {
    // Clear procedure type and all nested params
    updateProcedureParams({ 
      procedureType: null,
      mode: null,
      step: null
    }, false) // Create new history entry
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
          (selectedProcedureType) && (
            <Button variant="outline" onClick={handleRegenerate} className="flex items-center gap-2 bg-transparent">
              <RefreshCw className="h-4 w-4" /> Back to Procedure Selection
            </Button>
          )
        }

      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1">
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
            <ProcedureTypeSelection onTypeSelect={handleProcedureTypeSelect} title={"Choose the type of audit procedures you want to generate"} />
          ) : selectedProcedureType === "planning" ? (
            <PlanningProcedureGeneration
              engagement={engagement}
              existingProcedure={planningProcedure}
              onComplete={handleProcedureComplete}
              onBack={handleProcedureTypeBack}
              updateProcedureParams={updateProcedureParams}
              searchParams={searchParams}
            />
          ) : selectedProcedureType === "fieldwork" ? (
            <ProcedureGeneration
              engagement={engagement}
              existingProcedure={fieldworkProcedure}
              onBack={handleProcedureTypeBack}
              onComplete={handleProcedureComplete}
              updateProcedureParams={updateProcedureParams}
              searchParams={searchParams}
            />
          ) : (
            <CompletionProcedureGeneration
              engagement={engagement}
              onBack={handleProcedureTypeBack}
              existingProcedure={completionProcedure}
              onComplete={handleProcedureComplete}
              updateProcedureParams={updateProcedureParams}
              searchParams={searchParams}
            />
          )}
        </TabsContent>

        <TabsContent value="view" className="flex-1 mt-6">
          {!selectedProcedureType ? (
            <ProcedureTypeSelection onTypeSelect={handleProcedureTypeSelect} title={"Choose the type of audit procedures you want to view"} />
          ) : selectedProcedureType === "planning" ? (
            planningProcedure ? <PlanningProcedureView procedure={planningProcedure} engagement={engagement} /> : <div className="text-muted-foreground">No Planning procedures found.</div>
          ) : selectedProcedureType === "fieldwork" ? (
            fieldworkProcedure && fieldworkProcedure.status === "completed"
              ? <ProcedureView procedure={fieldworkProcedure} engagement={engagement} onRegenerate={handleRegenerate} />
              : <div className="text-muted-foreground">No Fieldwork procedures found.</div>
          ) : completionProcedure ? <CompletionProcedureView procedure={completionProcedure} engagement={engagement} onRegenerate={handleRegenerate} /> : <div className="text-muted-foreground">No Completion procedures found.</div>}
        </TabsContent>
      </Tabs>
    </div>
  )
}
