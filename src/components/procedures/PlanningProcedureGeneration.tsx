// @ts-nocheck
import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ArrowRight, User, Bot, Users } from 'lucide-react'
import { PlanningMaterialityStep } from "./steps/PlanningMaterialityStep"
import { PlanningProceduresStep } from "./steps/PlanningProceduresStep"
import { RecommendationsStep } from "./steps/RecommendationsStep"
import { PlanningClassificationStep } from "./steps/PlanningClassificationStep"
import { AIPlanningQuestionsStep } from "./steps/AIPlanningQuestionsStep"
import AIPlanningAnswersStep from "./steps/AIPlanningAnswersStep"
import { PlanningRecommendationsStep } from "./steps/PlanningRecommendationsStep"
import { HybridPlanningProceduresStep } from "./steps/HybridPlanningProceduresStep"
interface PlanningProcedureGenerationProps {
  engagement: any
  existingProcedure?: any
  onComplete: (procedure: any) => void
  onBack: () => void
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
}) => {
  const [selectedMode, setSelectedMode] = useState<GenerationMode | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepData, setStepData] = useState<StepData>({})
  const [steps, setSteps] = useState<String>([])

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

  const handleModeSelect = (mode: GenerationMode) => {
    setSelectedMode(mode)
    if (mode ==="ai") {
      setSteps([
        { title: "Set Materiality", component: PlanningMaterialityStep },
        { title: "Select Classifications", component: PlanningClassificationStep },
        { title: "Generate Procedures", component: AIPlanningQuestionsStep },
        { title: "Generate Answers", component: AIPlanningAnswersStep },
        { title: "Recommendations", component: PlanningRecommendationsStep },
      ])
    }
    else if(mode==="hybrid")
    {
       setSteps([
        { title: "Set Materiality", component: PlanningMaterialityStep },
        { title: "Select Classifications", component: PlanningClassificationStep },
        { title: "Generate Procedures", component: HybridPlanningProceduresStep },
        { title: "Recommendations", component: PlanningRecommendationsStep },
      ])
    }
    else {
      setSteps([
        { title: "Set Materiality", component: PlanningMaterialityStep },
        { title: "Select Classifications", component: PlanningClassificationStep },
        { title: "Planning Procedures", component: PlanningProceduresStep },
        { title: "Recommendations", component: PlanningRecommendationsStep },
      ])
    }
    setCurrentStep(0)
    setStepData({})
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
  
  setStepData((prev) => ({ 
    ...prev, 
    ...data,
    recommendations: combinedRecommendations 
  }));
  
  if (currentStep < steps.length - 1) {
    setCurrentStep((prev) => prev + 1)
  } else {
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
      setCurrentStep((prev) => prev - 1)
    } else {
      setSelectedMode(null)
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
                onClick={() => handleModeSelect(mode.id)}
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

        <div className="flex justify-start">
          <button
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground transition-colors font-body text-sm"
          >
            ← Back to Procedure Types
          </button>
        </div>
      </div>
    )
  }

  const CurrentStepComponent = steps[currentStep].component

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-2">
            {React.createElement(modes.find((m) => m.id === selectedMode)?.icon || FileText, { className: "h-4 w-4" })}
            {selectedMode?.toUpperCase()} Mode
          </Badge>
          <h3 className="font-heading text-xl text-foreground">{steps[currentStep].title}</h3>
        </div>
        <div className="text-sm text-muted-foreground font-body">
          Step {currentStep + 1} of {steps.length}
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
      <CurrentStepComponent
        engagement={engagement}
        mode={selectedMode}
        stepData={stepData}
        onComplete={handleStepComplete}
        onBack={handleStepBack}
      />
    </div>
  )
}
