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
    <div className="h-full flex flex-col bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 overflow-hidden">
      <div className="flex items-center justify-between mb-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Audit Procedures</h2>
            <div className="flex items-center gap-2 mt-1">
              {getProcedureStatusBadge()}
              {getProcedureTypeBadge()}
            </div>
          </div>
        </div>
        {
          (selectedProcedureType)&&(
            <Button 
              variant="outline" 
              onClick={handleRegenerate} 
              className="flex items-center gap-2 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4" /> Back to Procedure Selection
            </Button>
          )
        }
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 px-6">
        <TabsList className="grid w-full grid-cols-2 bg-gray-50/80 backdrop-blur-sm border border-gray-200/50 p-1 rounded-xl">
          <TabsTrigger 
            value="generate" 
            className="flex items-center gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
          >
            <Sparkles className="h-4 w-4" /> Generate Procedures
          </TabsTrigger>
          <TabsTrigger 
            value="view" 
            className="flex items-center gap-2 data-[state=active]:bg-gray-800 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg"
          >
            <Eye className="h-4 w-4" /> View Procedures
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="flex-1 mt-6">
          {!selectedProcedureType ? (
            <ProcedureTypeSelection onTypeSelect={setSelectedProcedureType} title={"Choose the type of audit procedures you want to generate"} />
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
                <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Coming Soon</h3>
                <p className="text-gray-600">Completion procedures will be available soon.</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="view" className="flex-1 mt-6">
          {!selectedProcedureType ? (
              <ProcedureTypeSelection onTypeSelect={setSelectedProcedureType} title={"Choose the type of audit procedures you want to view"} />
          ) : selectedProcedureType === "planning" ? (
            planningProcedure ? <PlanningProcedureView procedure={planningProcedure} engagement={engagement} /> : <div className="text-gray-600 text-center py-8">No Planning procedures found.</div>
          ) : selectedProcedureType === "fieldwork" ? (
            fieldworkProcedure && fieldworkProcedure.status === "completed"
              ? <ProcedureView procedure={fieldworkProcedure} engagement={engagement} onRegenerate={handleRegenerate} />
              : <div className="text-gray-600 text-center py-8">No Fieldwork procedures found.</div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
