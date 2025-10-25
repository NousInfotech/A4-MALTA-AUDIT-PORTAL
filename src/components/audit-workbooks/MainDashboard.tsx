// src/components/audit-workbooks/MainDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Upload, FileSpreadsheet, Activity, User, Loader2, Link } from "lucide-react";
import { AuditLogEntry, Workbook } from "../../types/audit-workbooks/types"; // Adjust path as needed
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// Import the AuditLogEntryDisplay component
import { AuditLogEntryDisplay } from "./AuditLogEntryDisplay"; // Adjust path as needed
import ExtendedTBWithWorkbook from "./ExtendedTBWithWorkbook";
import {
  getExtendedTBWithLinkedFiles,
  updateLinkedExcelFilesInExtendedTB,
  type ETBData,
  type ETBRow
} from "@/lib/api/extendedTrialBalanceApi";

interface MainDashboardProps {
  workbooks: Workbook[];
  onSelectWorkbook: (workbook: Workbook) => void;
  onUploadClick: () => void;
  onDeleteWorkbook: (workbookId: string, workbookName: string) => void;
  onViewHistoryClick: () => void;
  allWorkbookLogs: (AuditLogEntry & { workbookName?: string })[]; // This is the prop we'll use
  isLoading: boolean; // This prop likely refers to loading workbooks or initial data for the dashboard
  engagementId: string;
  classification: string;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  workbooks,
  onSelectWorkbook,
  onUploadClick,
  onDeleteWorkbook,
  onViewHistoryClick,
  allWorkbookLogs, // Destructure the prop here
  isLoading, // Destructure the prop here
  engagementId,
  classification,
}) => {
  const { toast } = useToast();
  const [etbData, setEtbData] = useState<ETBData | null>(null);
  const [selectedWorkbook, setSelectedWorkbook] = useState<Workbook | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Debug useEffect to track state changes
  useEffect(() => {
    console.log("MainDashboard state changed:", {
      selectedRowId,
      isLinking,
      isDialogOpen,
      etbDataRows: etbData?.rows.length,
      selectedWorkbook: selectedWorkbook?.name
    });
  }, [selectedRowId, isLinking, isDialogOpen, etbData, selectedWorkbook]);

  // Fetch ETB data when component mounts
  useEffect(() => {
    const fetchETBData = async () => {
      if (!engagementId || !classification) return;

      try {
        const data = await getExtendedTBWithLinkedFiles(engagementId, classification);
        setEtbData(data);
      } catch (error) {
        console.error("Error fetching ETB data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch Extended Trial Balance data",
          variant: "destructive",
        });
      }
    };

    fetchETBData();
  }, [engagementId, classification, toast]);

  const deleteWorkbook = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    onDeleteWorkbook(id, name);
  };

  const handleLinkToField = async (workbook: Workbook) => {
    setSelectedWorkbook(workbook);

    // Ensure ETB data is loaded before opening dialog
    if (!etbData) {
      try {
        const data = await getExtendedTBWithLinkedFiles(engagementId, classification);
        setEtbData(data);
      } catch (error) {
        console.error("Error fetching ETB data for linking:", error);
        toast({
          title: "Error",
          description: "Failed to load field data for linking",
          variant: "destructive",
        });
        return;
      }
    }

    setIsDialogOpen(true);
  };

  const handleSubmitLink = async () => {
    console.log("handleSubmitLink called with:", {
      selectedWorkbook: selectedWorkbook?.name,
      selectedRowId,
      engagementId,
      classification,
      etbDataRows: etbData?.rows.length
    });

    if (!selectedWorkbook || !selectedRowId || !engagementId || !classification) {
      toast({
        title: "Error",
        description: "Please select a field to link the workbook to",
        variant: "destructive",
      });
      return;
    }

    if (!etbData || etbData.rows.length === 0) {
      toast({
        title: "Error",
        description: "No field data available for linking",
        variant: "destructive",
      });
      return;
    }

    setIsLinking(true);
    try {
      // First, get the current ETB data to find existing linked files
      const currentData = await getExtendedTBWithLinkedFiles(engagementId, classification);

      // Find the selected row to get its current linked files
      const selectedRow = currentData.rows.find(row => 
        row._id === selectedRowId || row.code === selectedRowId
      );
      
      console.log("Debug linking process:", {
        selectedRowId,
        selectedRowIdType: typeof selectedRowId,
        totalRows: currentData.rows.length,
        firstRowId: currentData.rows[0]?._id,
        firstRowIdType: typeof currentData.rows[0]?._id,
        allRowIds: currentData.rows.map(row => ({ id: row._id, type: typeof row._id }))
      });
      
      if (!selectedRow) {
        console.error("Selected row not found. Available rows:", currentData.rows.map(row => row._id));
        toast({
          title: "Error",
          description: `Selected row not found. Row ID: ${selectedRowId}`,
          variant: "destructive",
        });
        return;
      }

      // Get existing linked file IDs (convert Workbook objects to IDs)
      const existingLinkedFileIds = selectedRow.linkedExcelFiles.map(workbook => workbook._id);

      // Check if the workbook is already linked to this row
      if (existingLinkedFileIds.includes(selectedWorkbook.id)) {
        toast({
          title: "Warning",
          description: `Workbook "${selectedWorkbook.name}" is already linked to this field`,
          variant: "destructive",
        });
        return;
      }

      // Append the new workbook ID to existing linked files
      const updatedLinkedFiles = [...existingLinkedFileIds, selectedWorkbook.id];

      console.log("Updating linked files:", {
        rowId: selectedRowId,
        existingFiles: existingLinkedFileIds,
        newFiles: updatedLinkedFiles
      });

      // Update with the combined array
      await updateLinkedExcelFilesInExtendedTB(
        engagementId,
        classification,
        selectedRowId,
        updatedLinkedFiles
      );

      toast({
        title: "Success",
        description: `Workbook "${selectedWorkbook.name}" linked to field successfully`,
      });

      // Refresh ETB data
      const updatedData = await getExtendedTBWithLinkedFiles(engagementId, classification);
      setEtbData(updatedData);

      // Trigger refresh of ExtendedTBWithWorkbook component
      setRefreshTrigger(prev => prev + 1);

      // Close dialog and reset state
      setIsDialogOpen(false);
      setSelectedWorkbook(null);
      setSelectedRowId("");
    } catch (error) {
      console.error("Error linking workbook to field:", error);
      toast({
        title: "Error",
        description: "Failed to link workbook to field",
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <>
      <div>
        <ExtendedTBWithWorkbook
          engagementId={engagementId}
          classification={classification}
          refreshTrigger={refreshTrigger}
        />
      </div>

      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Audit&nbsp;Work&nbsp;Book</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button onClick={onViewHistoryClick} variant="outline">
              View All Workbook History
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="grid grid-cols-1 gap-6"> {/* Added responsive grid classes */}

            {/* Main sheets */}
            <Card>
              <CardHeader>
                <CardTitle>Master Associated Sheets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workbooks.filter((wb) => wb.name === "Working Paper").map((wb) => (
                  <div
                    key={wb.id}
                    onClick={() => onSelectWorkbook(wb)}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-sm text-green-700">{wb.name}</p>
                    <p><span className="text-xs italic">including lead sheet</span></p>
                    {/* <p className="text-xs text-gray-500">
                    v{wb.version} by {wb.lastModifiedBy || "Unknown"}
                  </p> */}
                    {/* If you want a delete button, uncomment this and ensure styling is good */}
                    {/* <button onClick={(e) => deleteWorkbook(e, wb.id, wb.name)}>
                    delete
                  </button> */}
                  </div>
                ))}
                {workbooks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No working paper yet.
                  </p>
                )}
              </CardContent>
            </Card>
            {/* End Main sheets */}


            {/* Upload Area */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Workbook
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
                <CardTitle>Recent Workbooks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workbooks.filter((wb) => wb.name !== "Working Paper").map((wb) => (
                  <div
                    key={wb.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      onClick={() => onSelectWorkbook(wb)}
                      className="cursor-pointer"
                    >
                      <p className="font-medium text-sm">{wb.name}</p>
                      <p className="text-xs text-gray-500">
                        v{wb.version} by {wb.lastModifiedBy || "Unknown"}
                      </p>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLinkToField(wb);
                        }}
                        className="h-8 px-3"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Link to Field
                      </Button>
                    </div>
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
            {/* <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <Button onClick={onUploadClick}>Upload New Workbook</Button>
                  <Button onClick={onViewHistoryClick} variant="outline">
                    View All Workbook History
                  </Button>
                </div>

                
                {isLoading ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <p className="ml-2 text-gray-700">Loading activities...</p>
                  </div>
                ) : allWorkbookLogs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No recent activities.
                  </p>
                ) : (
                  allWorkbookLogs.slice(0, 5).map(
                    (log, index) => (
                      <AuditLogEntryDisplay
                        key={log.id || index}
                        log={log}
                      />
                    )
                  )
                )}
              </CardContent>
            </Card> */}
          </div>
        </main>
      </div>

      {/* Link to Field Dialog */}
      {/* Link to Field Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Link Workbook to Field</DialogTitle>
            <DialogDescription>
              Select a field to link the workbook "{selectedWorkbook?.name}" to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="field-select" className="text-right">
                Field
              </Label>
              <div className="col-span-3">
                {!etbData || etbData.rows.length === 0 ? (
                  <div className="text-sm text-muted-foreground p-2">
                    Loading field data...
                  </div>
                ) : (
                   <select
                     value={selectedRowId}
                     onChange={(e) => {
                       console.log("Select changed to:", e.target.value);
                       console.log("Select value type:", typeof e.target.value);
                       setSelectedRowId(e.target.value);
                     }}
                     className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                   >
                     <option value="" disabled>Select a field</option>
                     {etbData?.rows.map((row) => {
                       console.log("Rendering option for row:", row);
                       return (
                         <option key={row._id || row.code} value={row._id || row.code}>
                           {row.code} - {row.accountName}
                         </option>
                       );
                     })}
                  </select>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setSelectedWorkbook(null);
                setSelectedRowId("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitLink}
              disabled={!selectedRowId || isLinking}
            >
              {isLinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Linking...
                </>
              ) : (
                "Link Workbook"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};