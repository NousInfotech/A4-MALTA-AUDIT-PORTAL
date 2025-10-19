import { AuditLogEntry } from "../../types/audit-workbooks/types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
// Import the new component
import { AuditLogEntryDisplay } from "./AuditLogEntryDisplay";

interface WorkbookHistoryProps {
  allWorkbookLogs: (AuditLogEntry & { workbookName?: string })[];
  isLoading: boolean;
  onBack: () => void;
}

export function WorkbookHistory({
  allWorkbookLogs,
  isLoading,
  onBack,
}: WorkbookHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-gray-50 rounded-lg shadow p-6">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-gray-700">Loading workbook history...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Workbook History</h1>
        <Button onClick={onBack}>Back to Home</Button>
      </div>

      {allWorkbookLogs.length === 0 ? (
        <p className="text-gray-600">
          No history available for any workbooks yet.
        </p>
      ) : (
        <div className="space-y-4">
          {allWorkbookLogs.map((log, index) => (
            <AuditLogEntryDisplay key={log.id || index} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
