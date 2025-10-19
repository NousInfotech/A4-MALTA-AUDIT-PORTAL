// @ts-nocheck
import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Search, CheckCircle, ArrowRight } from 'lucide-react'

interface ProcedureTypeSelectionProps {
  onTypeSelect: (type: "planning" | "fieldwork" | "completion") => void
  title:String
}

export const ProcedureTypeSelection: React.FC<ProcedureTypeSelectionProps> = ({ onTypeSelect,title }) => {
  const procedureTypes = [
    {
      id: "planning" as const,
      title: "Planning Procedures",
      description: "Risk assessment, materiality, and audit planning procedures",
      icon: Search,
      color: "bg-blue-500",
      features: [
        "Understanding the entity & environment",
        "Risk assessment procedures",
        "Materiality determination",
        "Fraud & going concern planning",
      ],
    },
    {
      id: "fieldwork" as const,
      title: "Field Work Procedures",
      description: "Substantive testing and detailed audit procedures",
      icon: FileText,
      color: "bg-green-500",
      features: [
        "Classification-based procedures",
        "Substantive testing",
        "Controls testing",
        "Evidence gathering",
      ],
    },
    {
      id: "completion" as const,
      title: "Completion Procedures",
      description: "Final review and completion procedures",
      icon: CheckCircle,
      color: "bg-purple-500",
      features: [
        "Subsequent events review",
        "Final analytical procedures",
        "Management representations",
        "Audit conclusion",
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="font-heading text-2xl text-foreground mb-2">Select Procedure Type</h3>
        <p className="text-muted-foreground font-body">{title}</p>
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
                  {!type.disabled && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <CardTitle className="font-heading text-xl text-foreground">{type.title}</CardTitle>
                <p className="text-muted-foreground font-body text-sm">{type.description}</p>
                {type.disabled && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">Coming Soon</span>
                  </div>
                )}
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
