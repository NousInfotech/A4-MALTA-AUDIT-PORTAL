"use client"

// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Bot, Loader2 } from "lucide-react"

interface OverviewTabProps {
  engagement: any
  requests: any[]
  procedures: any[]
  handleGenerateProcedures: () => void
  isGeneratingProcedures: boolean
}

export const OverviewTab = ({
  engagement,
  requests,
  procedures,
  handleGenerateProcedures,
  isGeneratingProcedures,
}: OverviewTabProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg truncate">Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-muted-foreground">Trial Balance</span>
            <span className={engagement.trialBalanceUrl ? "text-success" : "text-muted-foreground"}>
              {engagement.trialBalanceUrl ? "Uploaded" : "Pending"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-muted-foreground">Document Requests</span>
            <span className="text-foreground">{requests.length}</span>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-muted-foreground">Procedures</span>
            <span className="text-foreground">{procedures.length}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg truncate">Engagement Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-muted-foreground">Created</div>
            <div className="font-medium">{new Date(engagement.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="font-medium">{engagement.status}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg truncate">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full bg-transparent"
            variant="outline"
            onClick={handleGenerateProcedures}
            disabled={isGeneratingProcedures}
          >
            {isGeneratingProcedures ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            Generate Procedures
          </Button>
          <Button className="w-full bg-transparent" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
