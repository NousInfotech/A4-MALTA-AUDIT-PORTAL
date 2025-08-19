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
  const statusColor =
    engagement?.status === "active"
      ? "text-success"
      : engagement?.status === "completed"
      ? "text-muted-foreground"
      : engagement?.status === "draft"
      ? "text-warning"
      : "text-foreground"

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg truncate">Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-muted-foreground">Trial Balance</span>
            <span
              className={`truncate ${engagement?.trialBalanceUrl ? "text-success" : "text-muted-foreground"}`}
              title={engagement?.trialBalanceUrl ? "Uploaded" : "Pending"}
            >
              {engagement?.trialBalanceUrl ? "Uploaded" : "Pending"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-muted-foreground">Document Requests</span>
            <span className="text-foreground truncate" title={`${requests?.length ?? 0}`}>
              {requests?.length ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-muted-foreground">Procedures</span>
            <span className="text-foreground truncate" title={`${procedures?.length ?? 0}`}>
              {procedures?.length ?? 0}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg truncate">Engagement Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-muted-foreground">Created</div>
            <div
              className="font-medium truncate"
              title={new Date(engagement.createdAt).toLocaleDateString()}
            >
              {new Date(engagement.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className={`font-medium truncate ${statusColor}`} title={engagement.status}>
              {engagement.status}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
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
            aria-busy={isGeneratingProcedures}
            title="Generate suggested procedures"
          >
            {isGeneratingProcedures ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
            ) : (
              <Bot className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            <span>Generate Procedures</span>
          </Button>

          <Button
            className="w-full bg-transparent"
            variant="outline"
            title="Export a summary report"
          >
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            <span>Export Report</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
