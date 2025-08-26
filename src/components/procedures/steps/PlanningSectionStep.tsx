// @ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, ArrowRight, ArrowLeft, Filter, AlertCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface PlanningSectionStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}

const planningSections = [
  {
    id: "engagement_setup_acceptance_independence",
    title: "Engagement Setup, Acceptance & Independence",
    description: "Client acceptance, independence checks, and engagement setup procedures"
  },
  {
    id: "understanding_entity_environment",
    title: "Understanding the Entity & Its Environment",
    description: "Industry analysis, entity operations, control environment assessment"
  },
  {
    id: "materiality_risk_summary",
    title: "Materiality & Risk Summary",
    description: "Materiality determination and risk assessment summary"
  },
  {
    id: "risk_response_planning",
    title: "Risk Response Planning",
    description: "Audit response planning for identified risks"
  },
  {
    id: "fraud_gc_planning",
    title: "Fraud Risk & Going Concern Planning",
    description: "Fraud risk assessment and going concern evaluation"
  },
  {
    id: "compliance_laws_regulations",
    title: "Compliance with Laws and Regulations",
    description: "Legal and regulatory compliance assessment"
  }
]

export const PlanningSectionStep: React.FC<PlanningSectionStepProps> = ({
  engagement,
  mode,
  stepData,
  onComplete,
  onBack,
}) => {
  const [selectedSections, setSelectedSections] = useState<string[]>(stepData.selectedSections || [])
  const { toast } = useToast()

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) 
        ? prev.filter((s) => s !== sectionId) 
        : [...prev, sectionId]
    )
  }

  const handleProceed = () => {
    if (selectedSections.length === 0) {
      toast({
        title: "No Sections Selected",
        description: "Please select at least one planning section to proceed.",
        variant: "destructive",
      })
      return
    }

    onComplete({
      selectedSections,
    })
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Select Planning Sections
          </CardTitle>
          <p className="text-muted-foreground font-body">
            Choose the planning sections you want to include in your audit procedures. Each section contains specific procedures relevant to the planning phase.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-body">Selected Sections</p>
              <p className="text-xl font-body-semibold text-foreground">{selectedSections.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg text-foreground">Available Planning Sections</CardTitle>
          <p className="text-sm text-muted-foreground font-body">
            Select the sections you want to include in your planning procedures.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {planningSections.map((section) => (
              <div key={section.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/20 transition-colors">
                <Checkbox
                  checked={selectedSections.includes(section.id)}
                  onCheckedChange={() => handleSectionToggle(section.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-body-semibold text-foreground">{section.title}</h4>
                    {selectedSections.includes(section.id) && (
                      <Badge variant="default" className="text-xs">Selected</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground font-body">{section.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedSections.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="font-body">
            No sections are currently selected. Please select at least one planning section to proceed with procedure generation.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2 bg-transparent">
          <ArrowLeft className="h-4 w-4" />
          Back to Materiality
        </Button>
        <Button
          onClick={handleProceed}
          disabled={selectedSections.length === 0}
          className="flex items-center gap-2"
        >
          Proceed to Procedures
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
