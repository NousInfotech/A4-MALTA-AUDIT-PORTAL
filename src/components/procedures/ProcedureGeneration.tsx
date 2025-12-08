// @ts-nocheck
import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, User, Bot, Users } from "lucide-react"

import { MaterialityStep } from "./steps/MaterialityStep"
import { ClassificationStep } from "./steps/ClassificationStep"   // unchanged (keep as-is)
import { ProcedureQuestionsStep } from "./steps/ProcedureQuestionsStep" // now MANUAL-only

import AIProcedureQuestionsStep from "./steps/AIProcedureQuestionsStep"
import AIProcedureAnswersStep  from "./steps/AIProcedureAnswersStep"
import { HybridProceduresStep } from "./steps/HybridProceduresStep"

import { RecommendationsStep } from "./steps/RecommendationsStep" // unchanged
import { ProcedureTabsView } from "./ProcedureTabsView"

interface ProcedureGenerationProps {
  engagement: any
  existingProcedure?: any
  onComplete: (procedure: any) => void
  onBack?: () => void
  updateProcedureParams?: (updates: Record<string, string | null>, replace?: boolean) => void
  searchParams?: URLSearchParams | null
}

type GenerationMode = "manual" | "ai" | "hybrid"

interface StepDef {
  title: string
  render: (ctx: {
    stepData: any
    setStepData: React.Dispatch<React.SetStateAction<any>>
    onStepDone: (patch: any) => void
    onBack: () => void
  }) => React.ReactNode
}

export const ProcedureGeneration: React.FC<ProcedureGenerationProps> = ({
  engagement,
  existingProcedure,
  onComplete,
  onBack,
  updateProcedureParams,
  searchParams,
}) => {
  // Initialize state from URL parameters to support browser back/forward navigation
  const modeFromUrl = (searchParams?.get("mode") as GenerationMode) || null
  const stepFromUrl = searchParams?.get("step")
  const stepFromUrlNum = stepFromUrl && stepFromUrl !== "tabs" ? parseInt(stepFromUrl || "0", 10) : null
  
  const [selectedMode, setSelectedMode] = useState<GenerationMode | null>(modeFromUrl)
  const [currentStep, setCurrentStep] = useState(stepFromUrlNum !== null ? stepFromUrlNum : 0)
  const [stepData, setStepData] = useState<any>({})
  const [showTabsView, setShowTabsView] = useState(stepFromUrl === "tabs")

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

  const modes = [
    {
      id: "manual" as GenerationMode,
      title: "Manual",
      description: "Use predefined manual procedures from templates, filtered by your selections.",
      icon: User,
      color: "bg-primary",
      features: ["Predefined templates", "Full manual control", "Auditor-crafted wording"],
    },
    {
      id: "ai" as GenerationMode,
      title: "AI",
      description: "Two-step AI flow: generate questions, then generate answers & recommendations.",
      icon: Bot,
      color: "bg-accent",
      features: ["AI-generated questions", "AI-generated draft answers", "Context-aware insights"],
    },
    {
      id: "hybrid" as GenerationMode,
      title: "Hybrid",
      description: "Start from manual templates, then ask AI to add more — keep full oversight.",
      icon: Users,
      color: "bg-secondary",
      features: ["Manual first", "AI adds more", "Flexible editing"],
    },
  ]

  const onStepDone = (patch: any) => {
    const updatedData = { ...stepData, ...patch }
    setStepData(updatedData)
    
    // When "Proceed to Procedures" is clicked (moving from step 1 to step 2)
    // Switch to View tab immediately and skip showing step 2 UI
    if (currentStep === 1) {
      // Create minimal procedure structure from selectedClassifications for View components
      const selectedClassifications = updatedData.selectedClassifications || []
      const initialQuestions = selectedClassifications.map((classification: string) => ({
        classification: classification,
        question: "",
        answer: "",
        __uid: `temp-${Date.now()}-${Math.random()}`
      }))
      
      // Create minimal procedure object and pass to parent
      const minimalProcedure = {
        procedureType: "procedures",
        mode: selectedMode,
        materiality: updatedData.materiality || 0,
        questions: initialQuestions,
        selectedClassifications: selectedClassifications,
        validitySelections: updatedData.validitySelections || {},
        recommendations: [],
        status: "in_progress"
      }
      
      // Switch to View tab
      if (updateProcedureParams) {
        updateProcedureParams({ procedureTab: "view", step: "tabs" }, false)
      }
      
      // Pass minimal procedure to parent so View components can show it
      onComplete(minimalProcedure)
      
      // Don't increment step - we're going directly to View tab
      return
    }
    
    // After questions are generated (for any mode), show tabs view
    // AI mode: step 2 is questions generation (after materiality + classifications)
    // Hybrid mode: step 2 is questions generation (after materiality + classifications)
    // Manual mode: step 2 is questions/procedures (after materiality + classifications)
    if (updatedData.questions && updatedData.questions.length > 0) {
      if ((selectedMode === "ai" && currentStep === 2) ||
          (selectedMode === "hybrid" && currentStep === 2) ||
          (selectedMode === "manual" && currentStep === 2)) {
        setShowTabsView(true)
        if (updateProcedureParams) {
          updateProcedureParams({ step: "tabs", procedureTab: "view" }, false)
        }
        return
      }
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
        ...stepData,
        ...patch,
        mode: selectedMode,
        status: "completed",
        procedureType: "procedures",
      })
    }
  }

  const handleBack = () => {
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
      // Call parent's onBack if provided
      if (onBack) {
        onBack()
      }
    }
  }

  const steps: StepDef[] = React.useMemo(() => {
    if (!selectedMode) return []
    if (selectedMode === "manual") {
      return [
        {
          title: "Set Materiality",
          render: ({ stepData, setStepData, onStepDone, onBack }) => (
            <MaterialityStep
              engagement={engagement}
              mode="manual"
              stepData={stepData}
              onBack={onBack}
              onComplete={onStepDone}
            />
          ),
        },
        {
          title: "Select Classifications",
          render: ({ stepData, setStepData, onStepDone, onBack }) => (
            <ClassificationStep
              engagement={engagement}
              mode="manual"
              stepData={stepData}
              onBack={onBack}
              onComplete={onStepDone}
            />
          ),
        },
        {
          title: "Manual Procedures",
          render: ({ stepData, setStepData, onStepDone, onBack }) => (
            <ProcedureQuestionsStep
              engagement={engagement}
              mode="manual"
              stepData={stepData}
              onBack={onBack}
              onComplete={onStepDone}
            />
          ),
        },
        {
          title: "Recommendations",
          render: ({ stepData, setStepData, onStepDone, onBack }) => (
            <RecommendationsStep
              engagement={engagement}
              mode="manual"
              stepData={stepData}
              onBack={onBack}
              onComplete={onStepDone}
            />
          ),
        },
      ]
    }
    if (selectedMode === "ai") {
      return [
        {
          title: "Set Materiality",
          render: ({ stepData, setStepData, onStepDone, onBack }) => (
            <MaterialityStep
              engagement={engagement}
              mode="ai"
              stepData={stepData}
              onBack={onBack}
              onComplete={onStepDone}
            />
          ),
        },
        {
          title: "Select Classifications",
          render: ({ stepData, setStepData, onStepDone, onBack }) => (
            <ClassificationStep
              engagement={engagement}
              mode="ai"
              stepData={stepData}
              onBack={onBack}
              onComplete={onStepDone}
            />
          ),
        },
        {
          title: "AI — Generate Questions",
          render: ({ stepData, setStepData, onStepDone, onBack }) => (
            <AIProcedureQuestionsStep
              engagement={engagement}
              mode="ai"
              stepData={stepData}
              onBack={onBack}
              onComplete={onStepDone}
            />
          ),
        },
      ]
    }
    // hybrid
    return [
      {
        title: "Set Materiality",
        render: ({ stepData, setStepData, onStepDone, onBack }) => (
          <MaterialityStep
            engagement={engagement}
            mode="hybrid"
            stepData={stepData}
            onBack={onBack}
            onComplete={onStepDone}
          />
        ),
      },
      {
        title: "Select Classifications",
        render: ({ stepData, setStepData, onStepDone, onBack }) => (
          <ClassificationStep
            engagement={engagement}
            mode="hybrid"
            stepData={stepData}
            onBack={onBack}
            onComplete={onStepDone}
          />
        ),
      },
      {
        title: "Hybrid — Manual First, then AI",
        render: ({ stepData, setStepData, onStepDone, onBack }) => (
          <HybridProceduresStep
            engagement={engagement}
            mode="hybrid"
            stepData={stepData}
            onBack={onBack}
            onComplete={onStepDone}
          />
        ),
      },
    ]
  }, [selectedMode, engagement])

  // Switch to View tab when TabsView should be shown
  useEffect(() => {
    if ((showTabsView || (stepData.questions && stepData.questions.length > 0 && (selectedMode === "ai" || selectedMode === "hybrid" || selectedMode === "manual"))) && updateProcedureParams) {
      updateProcedureParams({ procedureTab: "view" }, false)
    }
  }, [showTabsView, stepData.questions, selectedMode, updateProcedureParams])

  if (!selectedMode) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h3 className="font-heading text-2xl text-foreground mb-2">Choose Your Approach</h3>
          <p className="text-muted-foreground font-body">Generate your audit procedures the way you prefer</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((m) => {
            const Icon = m.icon
            return (
              <Card
                key={m.id}
                className="relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20"
                onClick={() => {
                  setSelectedMode(m.id)
                  setCurrentStep(0)
                  setStepData({})
                  // Update URL with selected mode and reset step (create new history entry)
                  if (updateProcedureParams) {
                    updateProcedureParams({ mode: m.id, step: "0" }, false)
                  }
                }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-3 rounded-lg ${m.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="font-heading text-xl text-foreground">{m.title}</CardTitle>
                  <p className="text-muted-foreground font-body text-sm">{m.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {m.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm font-body">
                        <span>•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // Show tabs view if questions have been generated
  if (showTabsView || (stepData.questions && stepData.questions.length > 0 && (selectedMode === "ai" || selectedMode === "hybrid" || selectedMode === "manual"))) {
    return (
      <ProcedureTabsView
        engagement={engagement}
        stepData={stepData}
        mode={selectedMode || "ai"}
        onComplete={(data) => {
          setShowTabsView(false)
          onComplete({
            ...data,
            mode: selectedMode,
            status: "completed",
            procedureType: "procedures",
          })
          if (updateProcedureParams) {
            updateProcedureParams({ mode: null, step: null }, false)
          }
        }}
        onBack={() => {
          setShowTabsView(false)
          setCurrentStep(2) // Go back to questions step (after Materiality + Classifications)
          if (updateProcedureParams) {
            updateProcedureParams({ step: "2", procedureTab: "generate" }, false)
          }
        }}
        updateProcedureParams={updateProcedureParams}
      />
    )
  }

  const StepBody = steps[currentStep]?.render

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl">
          {currentStep + 1} / {steps.length} — {steps[currentStep]?.title}
        </h3>
      </div>

      {StepBody
        ? StepBody({ stepData, setStepData, onStepDone, onBack: handleBack })
        : <div className="text-muted-foreground">No step.</div>}
    </div>
  )
}
