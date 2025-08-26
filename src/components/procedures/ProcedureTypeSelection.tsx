
import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, ClipboardList, Search, CheckCircle } from "lucide-react"

interface ProcedureTypeSelectionProps {
  onTypeSelect: (type: "planning" | "fieldwork" | "completion") => void
}

 const ProcedureTypeSelection: React.FC<ProcedureTypeSelectionProps> = ({ onTypeSelect }) => {
  const procedureTypes = [
    {
      id: "planning" as const,
      title: "Planning Procedures",
      description: "Initial audit planning and risk assessment procedures",
      icon: ClipboardList,
      color: "bg-blue-500",
      features: [
        "Understanding the Entity & Environment",
        "Risk Response Planning",
        "Materiality & Risk Summary",
        "Fraud Risk & Going Concern Planning",
        "Compliance with Laws & Regulations",
      ],
    },
    {
      id: "fieldwork" as const,
      title: "Field Work Procedures",
      description: "Substantive testing and detailed audit procedures",
      icon: Search,
      color: "bg-green-500",
      features: [
        "Classification-based procedures",
        "Substantive testing",
        "Test of details",
        "Analytical procedures",
        "Control testing",
      ],
    },
    {
      id: "completion" as const,
      title: "Completion Procedures",
      description: "Final audit procedures and wrap-up activities",
      icon: CheckCircle,
      color: "bg-purple-500",
      features: [
        "Final analytical review",
        "Subsequent events review",
        "Management representations",
        "Audit conclusion",
        "Report preparation",
      ],
      disabled: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="font-heading text-2xl text-foreground mb-2">Select Procedure Type</h3>
        <p className="text-muted-foreground font-body">Choose the type of audit procedures you want to generate</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {procedureTypes.map((type) => {
          const Icon = type.icon
          return (
            <Card
              key={type.id}
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 hover:border-primary/20 ${
                type.disabled ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={() => !type.disabled && onTypeSelect(type.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-3 rounded-lg ${type.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {type.disabled && (
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                  {!type.disabled && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <CardTitle className="font-heading text-xl text-foreground">{type.title}</CardTitle>
                <p className="text-muted-foreground font-body text-sm">{type.description}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {type.features.map((feature, index) => (
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
export default ProcedureTypeSelection
