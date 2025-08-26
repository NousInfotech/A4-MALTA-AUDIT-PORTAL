// @ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Sparkles, CheckCircle, AlertCircle, Eye, RefreshCw } from 'lucide-react'
import { ProcedureTypeSelection } from "./ProcedureTypeSelection"
import { ProcedureGeneration } from "./ProcedureGeneration"
import { PlanningProcedureGeneration } from "./PlanningProcedureGeneration"
import { ProcedureView } from "./ProcedureView"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface ProceduresTabProps {
  engagement: any
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

export const ProceduresTab: React.FC<ProceduresTabProps> = ({ engagement }) => {
  const [activeTab, setActiveTab] = useState("generate")
  const [selectedProcedureType, setSelectedProcedureType] = useState<"planning" | "fieldwork" | "completion" | null>(null)
  const [procedure, setProcedure] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadExistingProcedure()
  }, [engagement?._id])

  const loadExistingProcedure = async () => {
    if (!engagement?._id) return

    setLoading(true)
    try {
      const base = import.meta.env.VITE_APIURL
      if (!base) {
        console.warn("VITE_APIURL is not set")
        return
      }

      const response = await authFetch(`${base}/api/procedures/${engagement._id}`)
      if (response.ok) {
        const data = await response.json()
        setProcedure(data)
        if (data.status === "completed") {
          setActiveTab("view")
          setSelectedProcedureType(data.procedureType || "fieldwork")
        }
      } else if (response.status !== 404) {
        console.warn("Failed to load procedure:", response.status)
      }
    } catch (error) {
      console.error("Error loading procedure:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleProcedureComplete = (procedureData: any) => {
    setProcedure(procedureData)
    setActiveTab("view")
    toast({
      title: "Procedures Generated",
      description: "Your audit procedures have been successfully generated.",
    })
  }

  const handleRegenerate = () => {
    setSelectedProcedureType(null)
    setActiveTab("generate")
    toast({
      title: "Regenerating Procedures",
      description: "You can now generate new procedures to replace the existing ones.",
    })
  }

  const handleBackToTypeSelection = () => {
    setSelectedProcedureType(null)
  }

  const getProcedureStatusBadge = () => {
    if (!procedure) return null

    const statusConfig = {
      draft: { variant: "secondary", label: "Draft", icon: FileText },
      "in-progress": { variant: "default", label: "In Progress", icon: AlertCircle },
      completed: { variant: "default", label: "Completed", icon: CheckCircle },
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
    if (!procedure?.procedureType) return null

    const typeConfig = {
      planning: { label: "Planning", color: "bg-blue-500" },
      fieldwork: { label: "Field Work", color: "bg-green-500" },
      completion: { label: "Completion", color: "bg-purple-500" },
    }

    const config = typeConfig[procedure.procedureType] || typeConfig.fieldwork

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
        {procedure?.status === "completed" && (
          <Button variant="outline" onClick={handleRegenerate} className="flex items-center gap-2 bg-transparent">
            <RefreshCw className="h-4 w-4" />
            Regenerate
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Procedures
          </TabsTrigger>
          <TabsTrigger
            value="view"
            disabled={!procedure || procedure.status !== "completed"}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            View Procedures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="flex-1 mt-6">
          {!selectedProcedureType ? (
            <ProcedureTypeSelection onTypeSelect={setSelectedProcedureType} />
          ) : selectedProcedureType === "planning" ? (
            <PlanningProcedureGeneration
              engagement={engagement}
              existingProcedure={procedure}
              onComplete={handleProcedureComplete}
              onBack={handleBackToTypeSelection}
            />
          ) : selectedProcedureType === "fieldwork" ? (
            <ProcedureGeneration
              engagement={engagement}
              existingProcedure={procedure}
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
          {procedure && procedure.status === "completed" ? (
            <ProcedureView procedure={procedure} engagement={engagement} onRegenerate={handleRegenerate} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-body-semibold text-lg text-foreground mb-2">No Procedures Available</h3>
                <p className="text-muted-foreground font-body">Generate procedures first to view them here.</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}