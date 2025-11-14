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
import { Upload, FileSpreadsheet, Activity, User, Loader2, Link, Trash2 } from "lucide-react";
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
import {
  getExtendedTrialBalanceWithMappings,
  addMappingToRow,
  getExtendedTBWithLinkedFiles,
  updateLinkedExcelFilesInExtendedTB,
  type ETBData,
  type ETBRow
} from "@/lib/api/extendedTrialBalanceApi";
import {
  getWorkingPaperWithMappings,
  getWorkingPaperWithLinkedFiles,
  updateLinkedExcelFilesInWP,
  type WorkingPaperData
} from "@/lib/api/workingPaperApi";
import {
  getEvidenceWithMappings,
  linkWorkbookToEvidence,
  unlinkWorkbookFromEvidence
} from "@/lib/api/classificationEvidenceApi";
import { supabase } from "@/integrations/supabase/client";

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
  rowType?: 'etb' | 'working-paper' | 'evidence'; // Type of rows being worked with
  parentEtbData?: ETBData | null; // ✅ CRITICAL: Receive data from parent instead of fetching
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
  rowType = 'etb', // Default to ETB for backward compatibility
  parentEtbData = null, // ✅ CRITICAL: Receive parent data
}) => {
  const { toast } = useToast();
  const [etbData, setEtbData] = useState<ETBData | null>(parentEtbData); // ✅ Initialize with parent data
  const [selectedWorkbook, setSelectedWorkbook] = useState<Workbook | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // ✅ CRITICAL FIX: Use parent data if provided, otherwise fetch
  useEffect(() => {
    // Update etbData when parentEtbData changes
    if (parentEtbData) {
      console.log('MainDashboard: ✅ Using parent-provided data (no fetch needed):', {
        rowType,
        classification,
        dataRows: parentEtbData.rows?.length || 0,
        firstThreeRows: parentEtbData.rows?.slice(0, 3)?.map(r => ({
          code: r.code,
          name: r.accountName
        }))
      });
      setEtbData(parentEtbData);
      return; // ✅ Don't fetch - parent data is authoritative
    }

    // Only fetch if parent didn't provide data
    const fetchData = async () => {
      if (!engagementId || !classification) return;

      console.log('MainDashboard: ⚠️ No parent data - fetching for classification:', { engagementId, classification, rowType });

      try {
        // For Evidence, parent should ALWAYS provide data
        if (rowType === 'evidence') {
          console.log('MainDashboard: ⚠️ Evidence mode but no parent data provided!');
          return;
        }

        // Fetch data using appropriate API
        const data = await loadSectionData();
        
        console.log('MainDashboard: Data received:', {
          totalRows: data?.rows?.length || 0,
          classification,
          rowType,
          rowCodes: data?.rows?.map((r: ETBRow) => `${r.code} - ${r.accountName}`)
        });
        
        setEtbData(data);
      } catch (err) {
        console.error("MainDashboard: Error loading section data:", err);
        toast({
          title: "Error",
          description: `Failed to fetch ${rowType === 'working-paper' ? 'Working Paper' : 'Extended Trial Balance'} data`,
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [engagementId, classification, rowType, parentEtbData, toast]);

  // Helper function - mirrors ExtendedTBWithWorkbook's loadSectionData logic
  const loadSectionData = async () => {
    if (!engagementId || !classification) return null;

    try {
      console.log('MainDashboard: loadSectionData called with:', { engagementId, classification, rowType });
      
      // Step 1: Get row data based on classification type
      const isAdjustments = (c: string) => c === 'Adjustments';
      const isETB = (c: string) => c === 'ETB';
      const TOP_CATEGORIES = ['Equity', 'Income', 'Expenses'];
      const isTopCategory = (c: string) => TOP_CATEGORIES.includes(c);

      // Helper to attach auth token
      async function authFetch(url: string, options: RequestInit = {}) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        const headers = new Headers(options.headers || {});
        if (data.session?.access_token) {
          headers.set('Authorization', `Bearer ${data.session.access_token}`);
        }
        return fetch(url, { ...options, headers });
      }

      let rows: any[] = [];

      if (isAdjustments(classification) || isETB(classification)) {
        const etbResp = await authFetch(
          `${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/etb`
        );
        if (!etbResp.ok) throw new Error('Failed to load ETB');
        const etb = await etbResp.json();
        const allRows: any[] = Array.isArray(etb.rows) ? etb.rows : [];
        rows = isAdjustments(classification)
          ? allRows.filter((r) => Number(r.adjustments) !== 0)
          : allRows;
      } else {
        const endpoint = isTopCategory(classification)
          ? `${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/etb/category/${encodeURIComponent(classification)}`
          : `${import.meta.env.VITE_APIURL}/api/engagements/${engagementId}/etb/classification/${encodeURIComponent(classification)}`;

        const response = await authFetch(endpoint);
        if (!response.ok) throw new Error('Failed to load section data');
        const data = await response.json();
        rows = Array.isArray(data.rows) ? data.rows : [];
      }

      console.log('MainDashboard: Rows fetched:', {
        rowCount: rows.length,
        rows: rows.map(r => ({ code: r.code, name: r.accountName, classification: r.classification }))
      });

      // Step 2: For EACH row, fetch linked files using its ACTUAL classification
      // ✅ FIX: Use appropriate API based on rowType
      const byCode = new Map<string, any>();
      const byId = new Map<string, any>();

      for (const row of rows) {
        if (row.classification) {
          try {
            console.log(`MainDashboard: Fetching linked files for row ${row.code} with classification:`, row.classification, 'rowType:', rowType);
            
            let linkedResp;
            if (rowType === 'working-paper') {
              linkedResp = await getWorkingPaperWithLinkedFiles(engagementId, row.classification);
            } else {
              // Default to ETB
              linkedResp = await getExtendedTBWithLinkedFiles(engagementId, row.classification);
            }
            
            const linkedRow = linkedResp?.rows?.find((lr: any) => lr.code === row.code);
            
            if (linkedRow) {
              console.log(`MainDashboard: Found linked files for row ${row.code}:`, {
                linkedCount: linkedRow.linkedExcelFiles?.length || 0,
                linkedFileNames: linkedRow.linkedExcelFiles?.map((f: any) => f.name) || [],
                rowType
              });
              byCode.set(String(row.code), linkedRow);
              if (linkedRow._id) byId.set(String(linkedRow._id), linkedRow);
            }
          } catch (err) {
            console.warn(`MainDashboard: Failed to fetch linked files for row ${row.code}:`, err);
          }
        }
      }

      // Step 3: Merge linked files info
      const merged = rows.map((r) => {
        const match = (r.code && byCode.get(String(r.code))) || (r._id && byId.get(String(r._id)));
        return {
          ...r,
          _id: match?._id ?? r._id,
          linkedExcelFiles: Array.isArray(match?.linkedExcelFiles) ? match.linkedExcelFiles : [],
        };
      });

      console.log('MainDashboard: Final merged data:', {
        totalRows: merged.length,
        rowsWithLinkedFiles: merged.filter(r => r.linkedExcelFiles?.length > 0).length
      });

      // Return a proper ETBData object
      return {
        _id: merged[0]?._id || '',
        engagement: engagementId,
        classification: classification,
        rows: merged,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as ETBData;
    } catch (err: any) {
      console.error('MainDashboard: Error loading section data:', err);
      throw err;
    }
  };

  // ✅ CRITICAL FIX: Use parent data if provided, otherwise fetch
  useEffect(() => {
    // Update etbData when parentEtbData changes
    if (parentEtbData) {
      console.log('MainDashboard: ✅ Using parent-provided data (no fetch needed):', {
        rowType,
        classification,
        dataRows: parentEtbData.rows?.length || 0,
        firstThreeRows: parentEtbData.rows?.slice(0, 3)?.map(r => ({
          code: r.code,
          name: r.accountName
        }))
      });
      setEtbData(parentEtbData);
      return; // ✅ Don't fetch - parent data is authoritative
    }

    // Only fetch if parent didn't provide data
    const fetchData = async () => {
      if (!engagementId || !classification) return;

      console.log('MainDashboard: ⚠️ No parent data - fetching for classification:', { engagementId, classification, rowType });

      try {
        // For Evidence, parent should ALWAYS provide data
        if (rowType === 'evidence') {
          console.log('MainDashboard: ⚠️ Evidence mode but no parent data provided!');
          return;
        }

        // Fetch data using appropriate API
        const data = await loadSectionData();
        
        console.log('MainDashboard: Data received:', {
          totalRows: data?.rows?.length || 0,
          classification,
          rowType,
          rowCodes: data?.rows?.map((r: ETBRow) => `${r.code} - ${r.accountName}`)
        });
        
        setEtbData(data);
      } catch (error) {
        console.error("MainDashboard: Error fetching data:", error);
        toast({
          title: "Error",
          description: `Failed to fetch ${rowType === 'working-paper' ? 'Working Paper' : 'Extended Trial Balance'} data`,
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, [engagementId, classification, rowType, parentEtbData, toast]);

  const deleteWorkbook = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    onDeleteWorkbook(id, name);
  };

  const handleLinkToField = async (workbook: Workbook) => {
    setSelectedWorkbook(workbook);

    console.log('MainDashboard: handleLinkToField called for workbook:', workbook.name);

    // Ensure ETB data is loaded before opening dialog
    if (!etbData || etbData.rows.length === 0) {
      console.log('MainDashboard: No ETB data, fetching for classification:', classification);
      try {
        // Use the SAME logic as ExtendedTBWithWorkbook
        const data = await loadSectionData();
        
        console.log('MainDashboard: ETB data fetched:', { 
          totalRows: data?.rows?.length || 0,
          rowCodes: data?.rows?.map((r: ETBRow) => `${r.code} - ${r.accountName}`)
        });
        
        setEtbData(data);
      } catch (error) {
        console.error("MainDashboard: Error fetching ETB data for linking:", error);
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
      etbDataRows: etbData?.rows.length
    });

    if (!selectedWorkbook || !selectedRowId || !engagementId) {
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
      // Find the selected row by code
      const selectedRow = etbData.rows.find(row => 
        row.code === selectedRowId
      );
      
      console.log("MainDashboard: Debug linking process:", {
        selectedRowId,
        selectedRowCode: selectedRow?.code,
        selectedRowClassification: selectedRow?.classification,
        totalRows: etbData.rows.length
      });
      
      if (!selectedRow) {
        console.error("MainDashboard: Selected row not found");
        toast({
          title: "Error",
          description: `Selected row not found. Row code: ${selectedRowId}`,
          variant: "destructive",
        });
        return;
      }

      // IMPORTANT: Use the ROW'S actual classification (not the page classification)
      // The row might be in a sub-classification that's different from the current page
      const rowClassification = selectedRow.classification || classification;

      const rowIdentifier = (selectedRow as any)?._id || (selectedRow as any)?.id || selectedRow.code;

      if (rowType === 'working-paper' && !rowIdentifier) {
        throw new Error('Unable to determine Working Paper row identifier.');
      }

      // Immediate UI update so users see the new linked workbook right away
      setEtbData((prev) => {
        if (!prev) return prev;

        const updatedRows = prev.rows.map((row) => {
          if (row.code === selectedRowId) {
            const existingLinkedFiles = row.linkedExcelFiles || [];
            const alreadyLinked = existingLinkedFiles.some(
              (wb: any) => (wb?._id || wb) === selectedWorkbook.id
            );
            if (alreadyLinked) {
              return row;
            }
            return {
              ...row,
              linkedExcelFiles: [
                ...existingLinkedFiles,
                { _id: selectedWorkbook.id, name: selectedWorkbook.name },
              ],
            };
          }
          return row;
        });

        return {
          ...prev,
          rows: updatedRows,
          _updateTimestamp: Date.now(),
        } as any;
      });
      
      console.log("MainDashboard: Row details:", {
        selectedRowCode: selectedRow.code,
        selectedRowName: selectedRow.accountName,
        selectedRowClassification: selectedRow.classification,
        currentPageClassification: classification,
        willUseClassification: rowClassification
      });

      // Fetch current linked files for this row/evidence file using appropriate API
      let existingLinkedFileIds: string[] = [];
      
      if (rowType === 'evidence') {
        // For Evidence, selectedRowId is evidenceId - fetch evidence to check linkedWorkbooks
        console.log("MainDashboard: Fetching Evidence file to check linked workbooks");
        const evidenceData = await getEvidenceWithMappings(selectedRowId);
        existingLinkedFileIds = evidenceData.linkedWorkbooks?.map((wb: any) => wb._id || wb) || [];
        
        console.log("MainDashboard: Current linked workbooks for Evidence:", {
          evidenceId: selectedRowId,
          existingCount: existingLinkedFileIds.length,
          existingIds: existingLinkedFileIds
        });
      } else {
        // For ETB/WP, fetch linked files using row's classification with CORRECT API
        let linkedFilesData;
        
        if (rowType === 'working-paper') {
          // ✅ CRITICAL FIX: Call Working Paper API for WP!
          console.log("MainDashboard: Fetching Working Paper linked files for check");
          linkedFilesData = await getWorkingPaperWithLinkedFiles(engagementId, rowClassification);
        } else {
          // For ETB (default)
          console.log("MainDashboard: Fetching ETB linked files for check");
          linkedFilesData = await getExtendedTBWithLinkedFiles(engagementId, rowClassification);
        }
        
        const targetRow = linkedFilesData.rows.find((r: any) => r.code === selectedRowId);
        
        console.log("MainDashboard: Found target row in linked files:", {
          found: !!targetRow,
          rowType,
          rowCode: targetRow?.code,
          currentLinkedCount: targetRow?.linkedExcelFiles?.length || 0
        });

        // Get existing linked file IDs - handle both ObjectId and string formats
        existingLinkedFileIds = targetRow?.linkedExcelFiles?.map((wb: any) => {
          const id = wb._id || wb;
          return String(id); // ✅ Convert to string for comparison
        }) || [];

        console.log("MainDashboard: Current linked files:", {
          existingCount: existingLinkedFileIds.length,
          existingIds: existingLinkedFileIds,
          existingIdsTypes: existingLinkedFileIds.map(id => typeof id),
          selectedWorkbookId: selectedWorkbook.id,
          selectedWorkbookIdType: typeof selectedWorkbook.id,
          rowType
        });
      }

      // Check if the workbook is already linked (compare strings)
      const selectedWorkbookIdStr = String(selectedWorkbook.id);
      const isAlreadyLinked = existingLinkedFileIds.some(id => String(id) === selectedWorkbookIdStr);
      
      console.log("MainDashboard: Already linked check:", {
        selectedWorkbookId: selectedWorkbookIdStr,
        existingIds: existingLinkedFileIds,
        isAlreadyLinked,
        comparisonResults: existingLinkedFileIds.map(id => ({
          id: String(id),
          matches: String(id) === selectedWorkbookIdStr
        }))
      });
      
      if (isAlreadyLinked) {
        toast({
          title: "Warning",
          description: rowType === 'evidence'
            ? `Workbook "${selectedWorkbook.name}" is already linked to this file`
            : `Workbook "${selectedWorkbook.name}" is already linked to this field`,
          variant: "destructive",
        });
        setIsLinking(false);
        return;
      }

      // Append the new workbook ID to existing linked files (for ETB/WP only)
      const updatedLinkedFiles = [...existingLinkedFileIds, selectedWorkbook.id];

      console.log("MainDashboard: Saving linked files with ROW'S classification:", {
        engagementId,
        classification: rowClassification, // Use row's actual classification
        rowCode: selectedRowId,
        newWorkbookId: selectedWorkbook.id,
        updatedLinkedFiles,
        rowType
      });

      // ✅ FIX: Save the updated linked files using the appropriate API based on rowType
      if (rowType === 'working-paper') {
        console.log("MainDashboard: Calling Working Paper API to update linked files");
        await updateLinkedExcelFilesInWP(
          engagementId,
          rowClassification, // Use row's actual classification
          rowIdentifier,
          updatedLinkedFiles
        );
      } else if (rowType === 'evidence') {
        // For Evidence, selectedRowId is the evidenceId
        console.log("MainDashboard: Calling Evidence API to link workbook");
        await linkWorkbookToEvidence(selectedRowId, selectedWorkbook.id);
      } else {
        // Default to ETB
        console.log("MainDashboard: Calling ETB API to update linked files");
        await updateLinkedExcelFilesInExtendedTB(
          engagementId,
          rowClassification, // Use row's actual classification
          selectedRowId,
          updatedLinkedFiles
        );
      }

      console.log(`MainDashboard: Successfully saved linked files to ${rowType === 'working-paper' ? 'Working Paper' : 'ETB'} backend`);

      // Small delay to ensure backend has fully persisted the data
      console.log("MainDashboard: Waiting 500ms for backend to persist data...");
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh the ETB data using the same logic as ExtendedTBWithWorkbook
      console.log("MainDashboard: Refreshing data after linking...");
      setIsRefreshing(true);
      const refreshedData = await loadSectionData();
      setIsRefreshing(false);
      
      console.log("MainDashboard: Refreshed data:", {
        totalRows: refreshedData?.rows?.length || 0,
        targetRowCode: selectedRowId,
        targetRowLinkedFiles: refreshedData?.rows?.find(r => r.code === selectedRowId)?.linkedExcelFiles?.length || 0
      });
      
      setEtbData(refreshedData);

      toast({
        title: "Success",
        description: rowType === 'evidence' 
          ? `Workbook "${selectedWorkbook.name}" linked to file "${selectedRow.accountName}" successfully`
          : `Workbook "${selectedWorkbook.name}" linked to field "${selectedRow.code} - ${selectedRow.accountName}" successfully`,
      });

      // Dispatch custom event to notify other components (e.g., ClassificationSection Lead Sheet tab)
      const eventDetail = {
        workbookId: selectedWorkbook.id,
        workbookName: selectedWorkbook.name,
        rowCode: selectedRowId,
        classification: rowClassification,
        engagementId,
        rowType
      };
      
      console.log('📣 MainDashboard: Dispatching workbook-linked event with detail:', eventDetail);
      const event = new CustomEvent('workbook-linked', { detail: eventDetail });
      window.dispatchEvent(event);
      console.log('📣 MainDashboard: Event dispatched successfully');

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
      setIsRefreshing(false);
    }
  };

  return (
    <>
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
            {/* <Card>
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
                    <p className="text-xs text-gray-500">
                    v{wb.version} by {wb.lastModifiedBy || "Unknown"}
                  </p>
                    
                    <button onClick={(e) => deleteWorkbook(e, wb.id, wb.name)}>
                    delete
                  </button>
                  </div>
                ))}
                {workbooks.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No working paper yet.
                  </p>
                )}
              </CardContent>
            </Card> */}
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
                      className="cursor-pointer bg-gray-50 rounded-lg p-2 hover:bg-gray-300 transition-colors"
                    >
                      <p className="font-medium text-sm">{wb.name}</p>
                      <p className="text-xs text-gray-500">
                        v{wb.version} by {wb.lastModifiedBy || "Unknown"}
                      </p>
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
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
                        {rowType === 'evidence' ? 'Link to File' : 'Link to Field'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteWorkbook(wb.id, wb.name);
                        }}
                        className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
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

      {/* Link to Field/File Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {rowType === 'evidence' ? 'Link Workbook to File' : 'Link Workbook to Field'}
            </DialogTitle>
            <DialogDescription>
              Select {rowType === 'evidence' ? 'a file' : 'a field'} to link the workbook "{selectedWorkbook?.name}" to.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="field-select" className="text-right">
                {rowType === 'evidence' ? 'File' : 'Field'}
              </Label>
              <div className="col-span-3">
                {!etbData ? (
                  <div className="text-sm text-muted-foreground p-2 border rounded-md">
                    Loading {rowType === 'evidence' ? 'files' : 'fields'} for "{classification}"...
                  </div>
                ) : etbData.rows.length === 0 ? (
                  <div className="text-sm text-orange-600 p-2 border border-orange-200 rounded-md">
                    No {rowType === 'evidence' ? 'files' : 'fields'} found for "{classification}"
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
                    <option value="" disabled>
                      {rowType === 'evidence' ? 'Select a file' : 'Select a field'}
                    </option>
                    {etbData?.rows.map((row) => (
                      <option key={row.code} value={row.code}>
                        {rowType === 'evidence' 
                          ? row.accountName  /* For Evidence, accountName is the fileName */
                          : `${row.code} - ${row.accountName}`  /* For ETB/WP, show code and name */
                        }
                        {rowType !== 'evidence' && row.classification && ` (${row.classification})`}
                      </option>
                    ))}
                  </select>
                )}
                {etbData && etbData.rows.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {etbData.rows.length} {rowType === 'evidence' ? 'file' : 'field'}{etbData.rows.length !== 1 ? 's' : ''} available in this classification
                  </p>
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
              disabled={!selectedRowId || isLinking || isRefreshing}
            >
              {isLinking || isRefreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLinking ? "Linking..." : "Refreshing..."}
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