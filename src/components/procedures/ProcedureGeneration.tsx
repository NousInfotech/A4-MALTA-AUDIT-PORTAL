// @ts-nocheck
import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, User, Bot, Users } from "lucide-react"

import { MaterialityStep } from "./steps/MaterialityStep"         // unchanged (keep as-is)
import { ClassificationStep } from "./steps/ClassificationStep"   // unchanged (keep as-is)
import { ProcedureQuestionsStep } from "./steps/ProcedureQuestionsStep" // now MANUAL-only

import AIProcedureQuestionsStep from "./steps/AIProcedureQuestionsStep"
import AIProcedureAnswersStep  from "./steps/AIProcedureAnswersStep"
import { HybridProceduresStep } from "./steps/HybridProceduresStep"

import { RecommendationsStep } from "./steps/RecommendationsStep" // unchanged

interface ProcedureGenerationProps {
  engagement: any
  existingProcedure?: any
  onComplete: (procedure: any) => void
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
}) => {
  const [selectedMode, setSelectedMode] = useState<GenerationMode | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [stepData, setStepData] = useState<any>({})

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
    setStepData((prev: any) => ({ ...prev, ...patch }))
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      onComplete({
        ...stepData,
        ...patch,
        mode: selectedMode,
        status: "completed",
        procedureType: "procedures",
      })
    }
  }

  const onBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
    else setSelectedMode(null)
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
        {
          title: "AI — Generate Answers",
          render: ({ stepData, setStepData, onStepDone, onBack }) => (
            <AIProcedureAnswersStep
              engagement={engagement}
              mode="ai"
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
      {
          title: "AI — Generate Answers",
          render: ({ stepData, setStepData, onStepDone, onBack }) => (
            <AIProcedureAnswersStep
              engagement={engagement}
              mode="ai"
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
            mode="hybrid"
            stepData={stepData}
            onBack={onBack}
            onComplete={onStepDone}
          />
        ),
      },
    ]
  }, [selectedMode, engagement])

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

  const StepBody = steps[currentStep]?.render

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-xl">
          {currentStep + 1} / {steps.length} — {steps[currentStep]?.title}
        </h3>
      </div>

      {StepBody
        ? StepBody({ stepData, setStepData, onStepDone, onBack })
        : <div className="text-muted-foreground">No step.</div>}
    </div>
  )
}
