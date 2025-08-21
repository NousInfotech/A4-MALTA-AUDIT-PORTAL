
// @ts-nocheck
import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calculator, DollarSign, TrendingUp, ArrowRight, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface MaterialityStepProps {
  engagement: any
  mode: string
  stepData: any
  onComplete: (data: any) => void
  onBack: () => void
}

export const MaterialityStep: React.FC<MaterialityStepProps> = ({ engagement, mode, stepData, onComplete, onBack }) => {
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
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getMaterialityGuidance = () => {
    const value = Number.parseFloat(materiality)
    if (isNaN(value) || value <= 0) return null

    let guidance = ""
    let color = "text-muted-foreground"

    if (value < 1000) {
      guidance = "Very low materiality - suitable for small entities"
      color = "text-blue-600"
    } else if (value < 10000) {
      guidance = "Low materiality - typical for small to medium entities"
      color = "text-green-600"
    } else if (value < 100000) {
      guidance = "Moderate materiality - typical for medium entities"
      color = "text-yellow-600"
    } else {
      guidance = "High materiality - typical for large entities"
      color = "text-orange-600"
    }

    return { guidance, color }
  }

  const materialityInfo = getMaterialityGuidance()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-foreground flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Set Materiality Threshold
          </CardTitle>
          <p className="text-muted-foreground font-body">
            Define the materiality threshold for selecting accounts from the Extended Trial Balance. Only accounts with
            final balances equal to or greater than this amount will be automatically selected for audit procedures.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="materiality" className="font-body-semibold text-foreground">
              Materiality Amount
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                {materialityInfo && (
                  <span className={`font-body ${materialityInfo.color}`}>• {materialityInfo.guidance}</span>
                )}
              </div>
            )}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="font-body">
              <strong>Materiality Guidelines:</strong> Materiality is typically set as a percentage of key financial
              statement items (e.g., 5% of net income, 0.5-1% of total assets, or 0.5-1% of revenue). Consider the
              entity's size, nature, and risk profile when setting materiality.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <h4 className="font-body-semibold text-foreground">What happens next?</h4>
            <ul className="space-y-2 text-sm font-body text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                All ETB accounts with final balance ≥ {formatCurrency(materiality) || "$X"} will be pre-selected
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                You can manually adjust selections in the next step
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                Selected accounts will be used for classification-based procedure generation
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack} className="bg-transparent">
          Back to Mode Selection
        </Button>
        <Button onClick={handleProceed} disabled={!isValid} className="flex items-center gap-2">
          Proceed to Classifications
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
