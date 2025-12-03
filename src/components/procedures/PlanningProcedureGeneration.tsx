// @ts-nocheck
import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ArrowRight, User, Bot, Users } from 'lucide-react'
// PlanningMaterialityStep removed - no longer needed
import { PlanningProceduresStep } from "./steps/PlanningProceduresStep"
import { RecommendationsStep } from "./steps/RecommendationsStep"
import { PlanningClassificationStep } from "./steps/PlanningClassificationStep"
import { AIPlanningQuestionsStep } from "./steps/AIPlanningQuestionsStep"
import AIPlanningAnswersStep from "./steps/AIPlanningAnswersStep"
import { PlanningRecommendationsStep } from "./steps/PlanningRecommendationsStep"
import { HybridPlanningProceduresStep } from "./steps/HybridPlanningProceduresStep"
import { PlanningProcedureTabsView } from "./PlanningProcedureTabsView"
interface PlanningProcedureGenerationProps {
  engagement: any
  existingProcedure?: any
  onComplete: (procedure: any) => void
  onBack: () => void
  updateProcedureParams?: (updates: Record<string, string | null>, replace?: boolean) => void
  searchParams?: URLSearchParams | null
}

type GenerationMode = "manual" | "ai" | "hybrid"

interface StepData {
  materiality?: number
  selectedSections?: string[]
  procedures?: any[]
  recommendations?: string
}

export const PlanningProcedureGeneration: React.FC<PlanningProcedureGenerationProps> = ({
  engagement,
  existingProcedure,
  onComplete,
  onBack,
  updateProcedureParams,
  searchParams,
}) => {
  // Initialize state from URL parameters to support browser back/forward navigation
  const modeFromUrl = (searchParams?.get("mode") as GenerationMode) || null
  const stepFromUrl = searchParams?.get("step") ? parseInt(searchParams.get("step") || "0", 10) : null
  
  const [selectedMode, setSelectedMode] = useState<GenerationMode | null>(modeFromUrl)
  const [currentStep, setCurrentStep] = useState(stepFromUrl !== null ? stepFromUrl : 0)
  const [stepData, setStepData] = useState<StepData>({})
  const [steps, setSteps] = useState<any[]>([])
  const [showTabsView, setShowTabsView] = useState(false)

  // Initialize steps array when mode is available
  useEffect(() => {
    if (!selectedMode || steps.length > 0) return
    
    // Build steps array based on mode (without updating URL)
    if (selectedMode === "ai") {
      setSteps([
        { title: "Select Classifications", component: PlanningClassificationStep },
        { title: "Generate Procedures", component: AIPlanningQuestionsStep },
      ])
    } else if (selectedMode === "hybrid") {
      setSteps([
        { title: "Select Classifications", component: PlanningClassificationStep },
        { title: "Generate Procedures", component: HybridPlanningProceduresStep },
      ])
    } else {
      setSteps([
        { title: "Select Classifications", component: PlanningClassificationStep },
        { title: "Planning Procedures", component: PlanningProceduresStep },
        { title: "Recommendations", component: PlanningRecommendationsStep },
      ])
    }
  }, [selectedMode, steps.length])

  // Sync state with URL parameters when they change (browser back/forward)
  useEffect(() => {
    const modeFromUrl = (searchParams?.get("mode") as GenerationMode) || null
    const stepFromUrl = searchParams?.get("step") ? parseInt(searchParams.get("step") || "0", 10) : null
    
    if (modeFromUrl !== selectedMode) {
      setSelectedMode(modeFromUrl)
    }
    if (stepFromUrl !== null && stepFromUrl !== currentStep) {
      setCurrentStep(stepFromUrl)
    }
  }, [searchParams])

  // Clamp currentStep to valid range whenever steps change or URL drives out-of-range value
  useEffect(() => {
    if (!steps || steps.length === 0) return
    if (currentStep < 0 || currentStep >= steps.length) {
      const safeStep = Math.max(0, Math.min(currentStep, steps.length - 1))
      setCurrentStep(safeStep)
      if (updateProcedureParams) {
        updateProcedureParams({ step: safeStep.toString() }, true)
      }
    }
  }, [steps, currentStep])

  const modes = [
    {
      id: "manual" as GenerationMode,
      title: "Manual",
      description: "Create planning procedures manually with predefined templates",
      icon: User,
      color: "bg-primary",
      features: [
        "Predefined planning templates",
        "Manual procedure completion",
        "Full control over content",
        "Traditional planning approach",
      ],
    },
    {
      id: "ai" as GenerationMode,
      title: "AI",
      description: "Let AI generate planning procedures based on client context",
      icon: Bot,
      color: "bg-accent",
      features: [
        "AI-powered procedure generation",
        "Client context analysis",
        "Automated recommendations",
        "Intelligent planning insights",
      ],
    },
    {
      id: "hybrid" as GenerationMode,
      title: "Hybrid",
      description: "Combine AI intelligence with manual oversight for planning",
      icon: Users,
      color: "bg-secondary",
      features: [
        "AI-enhanced planning templates",
        "Manual review and editing",
        "Best of both approaches",
        "Flexible customization",
      ],
    },
  ]

  const handleModeSelect = (mode: GenerationMode, updateUrl = true) => {
    setSelectedMode(mode)
    if (mode ==="ai") {
      setSteps([
        { title: "Select Classifications", component: PlanningClassificationStep },
        { title: "Generate Procedures", component: AIPlanningQuestionsStep },
      ])
    }
    else if(mode==="hybrid")
    {
       setSteps([
        { title: "Select Classifications", component: PlanningClassificationStep },
        { title: "Generate Procedures", component: HybridPlanningProceduresStep },
      ])
    }
    else {
      setSteps([
        { title: "Select Classifications", component: PlanningClassificationStep },
        { title: "Planning Procedures", component: PlanningProceduresStep },
        { title: "Recommendations", component: PlanningRecommendationsStep },
      ])
    }
    setCurrentStep(0)
    setStepData({})
    // Update URL with selected mode and reset step (create new history entry)
    if (updateUrl && updateProcedureParams) {
      updateProcedureParams({ mode: mode, step: "0" }, false)
    }
  }

 // In PlanningProcedureGeneration.tsx
// In PlanningProcedureGeneration.tsx
const handleStepComplete = (data: any) => {
  // Format section recommendations with section titles
  let combinedRecommendations = "";
  
  if (data.sectionRecommendations) {
    // Get the section titles from the PLANNING_SECTIONS array
    const sectionTitles = {
      "engagement_setup_acceptance_independence": "Engagement Setup, Acceptance & Independence",
      "understanding_entity_environment": "Understanding the Entity & Its Environment",
      "materiality_risk_summary": "Materiality & Risk Summary",
      "risk_response_planning": "Risk Register & Audit Response Planning",
      "fraud_gc_planning": "Fraud Risk & Going Concern Planning",
      "compliance_laws_regulations": "Compliance with Laws & Regulations (ISA 250)"
    };
    
    // Add each section with its title and recommendations
    Object.entries(data.sectionRecommendations).forEach(([sectionId, recommendations]) => {
      const sectionTitle = sectionTitles[sectionId] || sectionId;
      combinedRecommendations += `### Section: ${sectionTitle}\n${recommendations}\n\n`;
    });
  }
  
  const updatedData = { ...stepData, ...data, recommendations: combinedRecommendations }
  setStepData(updatedData)
  
   // After questions/procedures are generated (step 1 for AI/Hybrid), show tabs view
   // Check if procedures have fields (questions)
   const hasQuestions = updatedData.procedures && 
     Array.isArray(updatedData.procedures) && 
     updatedData.procedures.some((proc: any) => proc.fields && proc.fields.length > 0)
   
   if (hasQuestions && (selectedMode === "ai" || selectedMode === "hybrid") && currentStep === 1) {
     setShowTabsView(true)
     if (updateProcedureParams) {
       updateProcedureParams({ step: "tabs" }, false)
     }
     return
   }
  
  if (currentStep < steps.length - 1) {
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)
    // Update URL with new step (create new history entry for browser back button)
    if (updateProcedureParams) {
      updateProcedureParams({ step: nextStep.toString() }, false)
    }
  } else {
    // Procedure complete - clear URL params (will be handled by parent)
    if (updateProcedureParams) {
      updateProcedureParams({ mode: null, step: null }, false)
    }
    onComplete({
      mode: selectedMode,
      procedureType: "planning",
      ...stepData,
      ...data,
      recommendations: combinedRecommendations,
      status: "completed",
    })
  }
}

  const handleStepBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      // Update URL with previous step (create new history entry)
      if (updateProcedureParams) {
        updateProcedureParams({ step: prevStep.toString() }, false)
      }
    } else {
      // Go back to mode selection
      setSelectedMode(null)
      // Clear mode and step from URL (create new history entry)
      if (updateProcedureParams) {
        updateProcedureParams({ mode: null, step: null }, false)
      }
    }
  }

  if (!selectedMode) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h3 className="font-heading text-2xl text-foreground mb-2">Choose Your Planning Approach</h3>
          <p className="text-muted-foreground font-body">Select how you'd like to generate your planning procedures</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((mode) => {
            const Icon = mode.icon
            return (
              <Card
                key={mode.id}
                className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20"
                onClick={() => handleModeSelect(mode.id, true)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-3 rounded-lg ${mode.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="font-heading text-xl text-foreground">{mode.title}</CardTitle>
                  <p className="text-muted-foreground font-body text-sm">{mode.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {mode.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm font-body">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* <div className="flex justify-start">
          <button
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground transition-colors font-body text-sm"
          >
            ← Back to Procedure Types
          </button>
        </div> */}
      </div>
    )
  }

  // Show tabs view if questions have been generated
  if (showTabsView || (stepData.procedures && Array.isArray(stepData.procedures) && stepData.procedures.some((proc: any) => proc.fields && proc.fields.length > 0) && (selectedMode === "ai" || selectedMode === "hybrid"))) {
    return (
       <PlanningProcedureTabsView
         engagement={engagement}
         stepData={stepData}
         mode={selectedMode || "ai"}
         onComplete={(data) => {
           setShowTabsView(false)
           onComplete({
             ...data,
             mode: selectedMode,
             status: "completed",
             procedureType: "planning",
           })
           if (updateProcedureParams) {
             updateProcedureParams({ mode: null, step: null }, false)
           }
         }}
         onBack={() => {
           setShowTabsView(false)
           setCurrentStep(1) // Go back to questions step
           if (updateProcedureParams) {
             updateProcedureParams({ step: "1" }, false)
           }
         }}
         updateProcedureParams={updateProcedureParams}
       />
    )
  }

  const CurrentStepComponent = steps[currentStep]?.component

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-2">
            {React.createElement(modes.find((m) => m.id === selectedMode)?.icon || FileText, { className: "h-4 w-4" })}
            {selectedMode?.toUpperCase()} Mode
          </Badge>
          <h3 className="font-heading text-xl text-foreground">{steps[currentStep]?.title || ""}</h3>
        </div>
        <div className="text-sm text-muted-foreground font-body">
          Step {Math.min(currentStep + 1, Math.max(steps.length, 1))} of {steps.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Step Content */}
      {CurrentStepComponent ? (
        <CurrentStepComponent
          engagement={engagement}
          mode={selectedMode}
          stepData={stepData}
          onComplete={handleStepComplete}
          onBack={handleStepBack}
        />
      ) : (
        <div className="text-muted-foreground">Preparing step…</div>
      )}
    </div>
  )
}
