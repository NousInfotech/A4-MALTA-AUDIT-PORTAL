// File: steps/CompletionMaterialityStep.tsx
import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calculator, TrendingUp, ArrowRight, Info, Euro } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"

interface CompletionMaterialityStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}

export const CompletionMaterialityStep: React.FC<CompletionMaterialityStepProps> = ({ 
  engagement, 
  mode, 
  stepData, 
  onComplete, 
  onBack 
}) => {
  const [materiality, setMateriality] = useState<string>(stepData.materiality?.toString() || "")
  const [isValid, setIsValid] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const value = Number.parseFloat(materiality)
    setIsValid(!isNaN(value) && value > 0)
  }, [materiality])

  const handleProceed = () => {
    const materialityValue = Number.parseFloat(materiality)
    if (!isValid) {
      toast({
        title: "Invalid Materiality",
        description: "Please enter a valid materiality amount greater than 0.",
        variant: "destructive",
      })
      return
    }

    onComplete({ materiality: materialityValue })
  }

  const formatCurrency = (amount: string) => {
    const value = Number.parseFloat(amount)
    if (isNaN(value)) return ""
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Set Completion Materiality
          </CardTitle>
          <p className="text-muted-foreground font-body">
            Define the materiality threshold for completion procedures. This will be used to assess the significance of findings and final review procedures.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="materiality" className="font-body-semibold text-foreground">
              Materiality Amount
            </Label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="materiality"
                type="number"
                value={materiality}
                onChange={(e) => setMateriality(e.target.value)}
                placeholder="Enter materiality amount"
                className="pl-10 font-body text-lg"
                min="0"
                step="0.01"
              />
            </div>
            {materiality && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-body-semibold text-foreground">{formatCurrency(materiality)}</span>
              </div>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="font-body">
              <strong>Completion Materiality:</strong> This threshold will be used throughout the completion phase to assess the significance of audit findings, unadjusted errors, and final review procedures.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="flex items-end justify-end">
        {/* <Button variant="outline" onClick={onBack} className="bg-transparent">
          Back to Mode Selection
        </Button> */}
        <Button onClick={handleProceed} disabled={!isValid} className="flex items-center gap-2">
          Proceed to Sections
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}