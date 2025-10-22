// src/components/audit-workbooks/MainDashboard.tsx
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Upload, FileSpreadsheet, Activity, User, Loader2 } from "lucide-react";
import { AuditLogEntry, Workbook } from "../../types/audit-workbooks/types"; // Adjust path as needed
// import { db_WorkbookApi } from "@/lib/api/workbookApi"; // Not directly used in render, can be removed if not needed elsewhere in this file
// import { toast } from "sonner"; // Not directly used in render, can be removed if not needed elsewhere in this file

// Import the AuditLogEntryDisplay component
import { AuditLogEntryDisplay } from "./AuditLogEntryDisplay"; // Adjust path as needed

interface MainDashboardProps {
  workbooks: Workbook[];
  onSelectWorkbook: (workbook: Workbook) => void;
  onUploadClick: () => void;
  onDeleteWorkbook: (workbookId: string, workbookName: string) => void;
  onViewHistoryClick: () => void;
  allWorkbookLogs: (AuditLogEntry & { workbookName?: string })[]; // This is the prop we'll use
  isLoading: boolean; // This prop likely refers to loading workbooks or initial data for the dashboard
}

export const TrialBalanceMainDashboard: React.FC<MainDashboardProps> = ({
  workbooks,
  onSelectWorkbook,
  onUploadClick,
  onDeleteWorkbook,
  onViewHistoryClick,
  allWorkbookLogs, // Destructure the prop here
  isLoading, // Destructure the prop here
}) => {
  const deleteWorkbook = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    onDeleteWorkbook(id, name);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="h-8 w-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Trial&nbsp;Balance</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Avatar>
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:block text-sm font-medium">Auditor</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="grid grid-cols-1 gap-6"> {/* Added responsive grid classes */}
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload&nbsp;Trial&nbsp;Balance
              </CardTitle>
              <CardDescription>
                Add a new Excel file to start mapping.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onClick={onUploadClick}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Drag & drop an .xlsx file here, or
                </p>
                <Button variant="link" className="mt-1 p-0 h-auto">
                  Browse Files
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Workbooks */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Trial Balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workbooks.map((wb) => (
                <div
                  key={wb.id}
                  onClick={() => onSelectWorkbook(wb)}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-sm">{wb.name}</p>
                  <p className="text-xs text-gray-500">
                    v{wb.version} by {wb.lastModifiedBy || "Unknown"}
                  </p>
                  {/* If you want a delete button, uncomment this and ensure styling is good */}
                  {/* <button onClick={(e) => deleteWorkbook(e, wb.id, wb.name)}>
                    delete
                  </button> */}
                </div>
              ))}
              {workbooks.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No workbooks uploaded yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-4 mb-4"> {/* Added flex-col for better mobile stacking */}
                <Button onClick={onUploadClick}>Upload New Workbook</Button>
                <Button onClick={onViewHistoryClick} variant="outline">
                  View All Workbook History
                </Button>
              </div>

              {/* Render actual workbook logs instead of mockActivities */}
              {isLoading ? ( // Use the isLoading prop for the main dashboard
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <p className="ml-2 text-gray-700">Loading activities...</p>
                </div>
              ) : allWorkbookLogs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent activities.
                </p>
              ) : (
                allWorkbookLogs.slice(0, 5).map( // Displaying only the first 5 logs for "Recent Activities"
                  (log, index) => (
                    <AuditLogEntryDisplay
                      key={log.id || index}
                      log={log}
                    />
                  )
                )
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};