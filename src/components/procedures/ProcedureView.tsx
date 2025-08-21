
// @ts-nocheck
import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Download, PrinterIcon as Print, Edit3, Save, X, CheckCircle, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ProcedureViewProps {
  procedure: any
  engagement: any
  onRegenerate: () => void
}

export const ProcedureView: React.FC<ProcedureViewProps> = ({ procedure, engagement, onRegenerate }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedRecommendations, setEditedRecommendations] = useState(procedure.recommendations || "")
  const { toast } = useToast()

  const handleSaveRecommendations = () => {
    // Here you would save the edited recommendations
    setIsEditing(false)
    toast({
      title: "Recommendations Updated",
      description: "Your audit recommendations have been saved.",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getQuestionsByClassification = () => {
    const grouped: { [key: string]: any[] } = {}
    procedure.questions?.forEach((question: any) => {
      const classification = question.classification || "General"
      if (!grouped[classification]) {
        grouped[classification] = []
      }
      grouped[classification].push(question)
    })
    return grouped
  }

  const groupedQuestions = getQuestionsByClassification()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading text-2xl text-foreground mb-2">Audit Procedures Report</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-body">
            <span>Engagement: {engagement.title}</span>
            <span>•</span>
            <span>Mode: {procedure.mode?.toUpperCase()}</span>
            <span>•</span>
            <span>Materiality: {formatCurrency(procedure.materiality)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Print className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Total Procedures</p>
                <p className="text-2xl font-body-semibold text-foreground">{procedure.questions?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Classifications</p>
                <p className="text-2xl font-body-semibold text-foreground">
                  {procedure.selectedClassifications?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-body">Valid Items</p>
                <p className="text-2xl font-body-semibold text-foreground">
                  {procedure.validitySelections?.filter((v: any) => v.isValid).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Procedures by Classification */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-foreground">Audit Procedures</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-6">
              {Object.entries(groupedQuestions).map(([classification, questions]) => (
                <div key={classification} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-body-semibold">
                      {classification}
                    </Badge>
                    <div className="h-px bg-border flex-1" />
                  </div>

                  <div className="space-y-3">
                    {questions.map((question: any, index: number) => (
                      <div key={question.id || index} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                            <span className="text-xs font-body-semibold text-primary">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-body-semibold text-foreground mb-1">{question.question}</p>
                            {question.answer && (
                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm font-body text-muted-foreground">{question.answer}</p>
                              </div>
                            )}
                            {question.isRequired && (
                              <Badge variant="secondary" className="mt-2 text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-xl text-foreground">Audit Recommendations</CardTitle>
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false)
                    setEditedRecommendations(procedure.recommendations || "")
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveRecommendations}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editedRecommendations}
              onChange={(e) => setEditedRecommendations(e.target.value)}
              placeholder="Enter audit recommendations..."
              className="min-h-32 font-body"
            />
          ) : (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="font-body text-foreground whitespace-pre-wrap">
                {procedure.recommendations || "No recommendations provided."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
