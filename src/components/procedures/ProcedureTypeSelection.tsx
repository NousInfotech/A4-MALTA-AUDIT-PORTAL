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
      disabled: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Select Procedure Type</h3>
        <p className="text-gray-700">{title}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {procedureTypes.map((type) => {
          const Icon = type.icon
          return (
            <Card
              key={type.id}
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg shadow-gray-300/30 group ${
                type.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-white/70"
              }`}
              onClick={() => !type.disabled && onTypeSelect(type.id)}
            >
              <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  {!type.disabled && (
                    <ArrowRight className="h-5 w-5 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">{type.title}</CardTitle>
                <p className="text-gray-700 text-sm">{type.description}</p>
                {type.disabled && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-xl font-medium">Coming Soon</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                <ul className="space-y-3">
                  {type.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 text-sm text-gray-700">
                      <div className="h-2 w-2 rounded-full bg-gray-800 flex-shrink-0" />
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
