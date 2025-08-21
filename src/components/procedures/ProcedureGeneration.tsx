// @ts-nocheck
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, ArrowRight, User, Bot, Users } from "lucide-react"
import { MaterialityStep } from "./steps/MaterialityStep"
import { ClassificationStep } from "./steps/ClassificationStep"
import { ProcedureQuestionsStep } from "./steps/ProcedureQuestionsStep"
import { RecommendationsStep } from "./steps/RecommendationsStep"

interface ProcedureGenerationProps {
  engagement: any
  existingProcedure?: any
  onComplete: (procedure: any) => void
}

type GenerationMode = "manual" | "ai" | "hybrid"

interface StepData {
  materiality?: number
  selectedClassifications?: string[]
  validitySelections?: any[]
  questions?: any[]
  recommendations?: string
}

export const ProcedureGeneration: React.FC<ProcedureGenerationProps> = ({
  engagement,
  existingProcedure,
  onComplete,
}) => {
  const [selectedMode, setSelectedMode] = useState<GenerationMode | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepData, setStepData] = useState<StepData>({})

  const modes = [
    {
      id: "manual" as GenerationMode,
      title: "Manual",
      description: "Create procedures manually with predefined templates",
      icon: User,
      color: "bg-primary",
      features: [
        "Predefined procedure templates",
        "Manual question answering",
        "Full control over content",
        "Traditional audit approach",
      ],
    },
    {
      id: "ai" as GenerationMode,
      title: "AI",
      description: "Let AI generate procedures based on working papers",
      icon: Bot,
      color: "bg-accent",
      features: [
        "AI-powered procedure generation",
        "Working paper analysis",
        "Automated recommendations",
        "Intelligent insights",
      ],
    },
    {
      id: "hybrid" as GenerationMode,
      title: "Hybrid",
      description: "Combine AI intelligence with manual oversight",
      icon: Users,
      color: "bg-secondary",
      features: [
        "AI-enhanced templates",
        "Manual review and editing",
        "Best of both approaches",
        "Flexible customization",
      ],
    },
  ]

  const steps = [
    { title: "Set Materiality", component: MaterialityStep },
    { title: "Select Classifications", component: ClassificationStep },
    { title: "Review Procedures", component: ProcedureQuestionsStep },
    { title: "Recommendations", component: RecommendationsStep },
  ]

  const handleModeSelect = (mode: GenerationMode) => {
    setSelectedMode(mode)
    setCurrentStep(0)
    setStepData({})
  }

  const handleStepComplete = (data: any) => {
    setStepData((prev) => ({ ...prev, ...data }))
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      // Final step completed
      onComplete({
        mode: selectedMode,
        ...stepData,
        ...data,
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
          <h3 className="font-heading text-2xl text-foreground mb-2">Choose Your Approach</h3>
          <p className="text-muted-foreground font-body">Select how you'd like to generate your audit procedures</p>
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
