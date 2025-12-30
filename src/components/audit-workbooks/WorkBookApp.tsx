import React, { useState, useEffect, useCallback } from "react"; // Add useCallback
import { MainDashboard } from "@/components/audit-workbooks/MainDashboard";
import { AuditLog } from "@/components/audit-workbooks/AuditLog";
import { UploadModal } from "@/components/audit-workbooks/UploadModal";
import { LinkToFieldModal } from "@/components/audit-workbooks/LinkToFieldModal";
import { DatasetPreviewModal } from "@/components/audit-workbooks/DatasetPreviewModal";
import { WorkbookRulesModal } from "@/components/audit-workbooks/WorkbookRulesModal";
import { VersionComparison } from "@/components/audit-workbooks/VersionComparison";
import {
  Workbook,
  Selection,
  Mapping,
  DatasetMapping,
  WorkbookRule,
  AuditLogEntry,
  NamedRange,
  SheetData,
} from "../../types/audit-workbooks/types";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ExcelViewer } from "@/components/audit-workbooks/ExcelViewer";
import { Loader2 } from "lucide-react";
import {
  db_WorkbookApi,
  MappingCoordinates,
  msDriveworkbookApi,
} from "@/lib/api/workbookApi";
import { parseExcelRange, zeroIndexToExcelCol } from "./utils";
import { WorkbookHistory } from "@/components/audit-workbooks/WorkbookHistory"; // NEW: Import WorkbookHistory
import { useAuth } from "@/contexts/AuthContext";
import { getWorkingPapersCloudFileId } from "@/lib/api/engagement";
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
  addMappingToWPRow,
  getWorkingPaperWithLinkedFiles,
  updateLinkedExcelFilesInWP,
  type WorkingPaperData,
  type WPRow
} from "@/lib/api/workingPaperApi";
import {
  getEvidenceWithMappings,
  linkWorkbookToEvidence,
  unlinkWorkbookFromEvidence,
  addMappingToEvidence,
  updateEvidenceMapping,
  removeMappingFromEvidence,
  type ClassificationEvidence,
  type CreateMappingRequest as EvidenceCreateMappingRequest
} from "@/lib/api/classificationEvidenceApi";

type View =
  | "dashboard"
  | "viewer"
  | "audit-log"
  | "upload-modal"
  | "link-field-modal"
  | "dataset-preview-modal"
  | "workbook-rules-modal"
  | "version-comparison"
  | "history";

// --- MOCK DATA ---

const mockWorkbooks: any[] = [
  {
    id: "1",
    name: "FY2023_Financial_Statements.xlsx",
    uploadedDate: "2023-10-26",
    version: "v2",
    lastModified: "2023-10-27T10:00:00Z",
    lastModifiedBy: "Alice",
    webUrl: "https://mock-url/workbook1.xlsx",
    fileData: {
      "Balance Sheet": [
        ["", "A", "B", "C", "D"],
        ["1", "Assets", "Q1 2023", "Q2 2023", "Q3 2023"],
        ["2", "Current Assets", "150,000", "165,000", "180,000"],
        ["3", "Cash", "50,000", "55,000", "60,000"],
        ["4", "Accounts Receivable", "100,000", "110,000", "120,000"],
        ["5", "Inventory", "75,000", "80,000", "85,000"],
        ["6", "Prepaid Expenses", "10,000", "12,000", "14,000"],
        ["7", "Total Current Assets", "235,000", "257,000", "279,000"],
        ["8", "Property, Plant & Equipment", "250,000", "260,000", "270,000"],
        ["9", "Intangible Assets", "50,000", "52,000", "54,000"],
        ["10", "Investments", "40,000", "45,000", "50,000"],
        ["11", "Deferred Tax Asset", "10,000", "9,500", "9,000"],
        ["12", "Total Non-Current Assets", "350,000", "366,500", "383,000"],
        ["13", "Total Assets", "585,000", "623,500", "662,000"],
        ["14", "Liabilities", "", "", ""],
        ["15", "Accounts Payable", "70,000", "72,000", "75,000"],
        ["16", "Accrued Expenses", "25,000", "26,000", "28,000"],
        ["17", "Long-Term Debt", "150,000", "160,000", "165,000"],
        ["18", "Total Liabilities", "245,000", "258,000", "268,000"],
        ["19", "Equity", "", "", ""],
        ["20", "Total Equity", "340,000", "365,500", "394,000"],
      ],
      "Income Statement": [
        ["", "A", "B", "C"],
        ["1", "Revenue", "200,000", "220,000"],
        ["2", "Cost of Goods Sold", "-80,000", "-88,000"],
        ["3", "Gross Profit", "120,000", "132,000"],
        ["4", "Operating Expenses", "-70,000", "-75,000"],
        ["5", "Operating Income", "50,000", "57,000"],
        ["6", "Interest Expense", "-5,000", "-6,000"],
        ["7", "Other Income", "2,000", "3,000"],
        ["8", "Earnings Before Tax", "47,000", "54,000"],
        ["9", "Income Tax Expense", "-12,000", "-14,000"],
        ["10", "Net Income", "35,000", "40,000"],
        ["11", "Depreciation Expense", "-8,000", "-8,500"],
        ["12", "EBITDA", "58,000", "62,500"],
        ["13", "R&D Expense", "-5,000", "-6,000"],
        ["14", "Sales & Marketing", "-15,000", "-17,000"],
        ["15", "Administrative Expense", "-10,000", "-11,000"],
        ["16", "Total Expenses", "-118,000", "-126,500"],
        ["17", "Operating Margin (%)", "25%", "26%"],
        ["18", "Tax Rate (%)", "25%", "26%"],
        ["19", "Earnings per Share", "1.75", "2.00"],
        ["20", "Dividends Paid", "15,000", "17,000"],
      ],
    },
  },
  {
    id: "2",
    name: "Q4_Sales_Report_Regional.xlsx",
    uploadedDate: "2023-10-25",
    version: "v1",
    lastModifiedBy: "Bob",
    webUrl: "https://mock-url/workbook1.xlsx",
    fileData: {
      "Sales Data": [
        ["", "A", "B", "C", "D", "E"],
        ["1", "Region", "Product A", "Product B", "Product C", "Total Sales"],
        ["2", "North", "15,000", "18,000", "22,000", "55,000"],
        ["3", "South", "12,000", "14,000", "16,000", "42,000"],
        ["4", "East", "18,000", "20,000", "25,000", "63,000"],
        ["5", "West", "10,000", "11,000", "13,000", "34,000"],
        ["6", "Central", "9,000", "9,500", "10,000", "28,500"],
        ["7", "Northeast", "8,500", "9,000", "9,500", "27,000"],
        ["8", "Southeast", "14,000", "15,000", "17,000", "46,000"],
        ["9", "Northwest", "11,000", "12,500", "13,000", "36,500"],
        ["10", "Southwest", "9,500", "10,000", "10,500", "30,000"],
        ["11", "Metro", "25,000", "26,000", "28,000", "79,000"],
        ["12", "Rural", "6,000", "7,000", "8,000", "21,000"],
        ["13", "Online", "30,000", "32,000", "35,000", "97,000"],
        ["14", "International", "40,000", "42,000", "45,000", "127,000"],
        ["15", "Exports", "22,000", "25,000", "27,000", "74,000"],
        ["16", "Imports", "5,000", "5,500", "6,000", "16,500"],
        ["17", "Promotional Sales", "3,000", "4,000", "5,000", "12,000"],
        ["18", "Seasonal Sales", "6,000", "7,500", "9,000", "22,500"],
        ["19", "Wholesale", "12,000", "14,000", "15,500", "41,500"],
        ["20", "Grand Total", "285,000", "309,000", "335,000", "929,000"],
      ],
    },
  },
  {
    id: "3",
    name: "Employee_List_HR.xlsx",
    uploadedDate: "2023-09-15",
    version: "v3",
    lastModifiedBy: "Charlie",
    webUrl: "https://mock-url/workbook1.xlsx",
    fileData: {
      Employees: [
        ["", "A", "B", "C", "D"],
        ["1", "Employee ID", "Full Name", "Department", "Hire Date"],
        ["2", "E001", "John Doe", "Engineering", "2021-05-20"],
        ["3", "E002", "Jane Smith", "Marketing", "2020-08-15"],
        ["4", "E003", "Peter Jones", "Engineering", "2022-01-10"],
        ["5", "E004", "Mary Williams", "Human Resources", "2019-11-30"],
        ["6", "E005", "David Brown", "Sales", "2022-03-22"],
        ["7", "E006", "Nancy Johnson", "Finance", "2021-07-10"],
        ["8", "E007", "Robert Miller", "Engineering", "2020-02-19"],
        ["9", "E008", "Patricia Davis", "Legal", "2019-06-15"],
        ["10", "E009", "James Wilson", "IT", "2023-01-05"],
        ["11", "Linda Martinez", "Design", "2021-12-12"],
        ["12", "E011", "Michael Taylor", "Sales", "2020-05-01"],
        ["13", "E012", "Barbara Anderson", "Engineering", "2022-09-20"],
        ["14", "E013", "William Thomas", "Finance", "2021-03-14"],
        ["15", "E014", "Elizabeth Jackson", "Marketing", "2023-02-10"],
        ["16", "E015", "Christopher White", "Engineering", "2020-10-05"],
        ["17", "E016", "Jennifer Harris", "Legal", "2019-08-25"],
        ["18", "E017", "Charles Martin", "IT", "2021-04-18"],
        ["19", "E018", "Susan Thompson", "Human Resources", "2022-11-22"],
        ["20", "E019", "Thomas Garcia", "Engineering", "2020-09-09"],
      ],
    },
  },
];

const mockMappings: Mapping[] = [
  // Updated mockMappings type
  {
    _id: "m1",
    destinationField: "current_assets_q3",
    transform: "sum",
    color: "bg-blue-200",
    details: {
      sheet: "Balance Sheet",
      start: { row: 2, col: 1 },
      end: { row: 2, col: 3 },
    },
  },
];

const mockNamedRanges: NamedRange[] = [
  { _id: "nr1", name: "total_debits", range: "Template!G5:G25" },
  { _id: "nr2", name: "total_credits", range: "Template!H5:H25" },
  { _id: "nr3", name: "receivable_li jie", range: "Template!G10" },
];

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: "log1",
    timestamp: new Date("2023-10-27T09:30:00Z").toISOString(),
    user: "Alice",
    action: "Uploaded Workbook",
    details: "Uploaded FY2023_Financial_Statements.xlsx as v2",
  },
  {
    id: "log2",
    timestamp: new Date("2023-10-27T09:35:00Z").toISOString(),
    user: "Alice",
    action: "Created Mapping",
    details: "Mapped Balance Sheet!B2:D2 to current_assets_q3",
  },
];

export default function WorkBookApp({
  engagementId,
  classification,
  etbRows,
  onRefreshData,
  rowType = 'etb', // Default to ETB for backward compatibility
  refreshTrigger = 0,
  onEvidenceMappingUpdated,
  allClassifications, // ✅ NEW: All classifications to fetch workbooks from
}: {
  engagementId: string;
  classification: string;
  etbRows?: ETBRow[]; // Optional rows from parent component (can be ETB or WP rows)
  onRefreshData?: () => Promise<void>; // Optional callback to refresh parent data
  rowType?: 'etb' | 'working-paper' | 'evidence'; // Type of rows being worked with
  refreshTrigger?: number;
  onEvidenceMappingUpdated?: (evidence: any) => void;
  allClassifications?: string[]; // ✅ NEW: All classifications to fetch workbooks from
}) {
  console.log('WorkBookApp: Component mounted/updated with:', {
    engagementId,
    classification,
    etbRowsCount: etbRows?.length || 0,
    hasRefreshCallback: !!onRefreshData,
    rowType,
    firstThreePassedRows: etbRows?.slice(0, 3).map(r => ({
      code: r.code,
      name: r.accountName,
      classification: r.classification
    })) || []
  });

  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedWorkbook, setSelectedWorkbook] = useState<any | null>(
    null // Start with no workbook selected
  );
  const [viewerSelectedSheet, setViewerSelectedSheet] = useState<
    string | undefined
  >(undefined);

  const [pendingSelection, setPendingSelection] = useState<Selection | null>(
    null
  );
  const [workbooks, setWorkbooks] = useState<Workbook[] | []>(mockWorkbooks);
  const [mappings, setMappings] = useState<any[]>([]);
  const [namedRanges, setNamedRanges] = useState([]);
  const [datasetMappings, setDatasetMappings] = useState<DatasetMapping[]>([]);
  const [workbookRules, setWorkbookRules] = useState<WorkbookRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(mockAuditLogs);
  const [isLoadingWorkbooks, setIsLoadingWorkbooks] = useState(true);
  const [isLoadingWorkbookData, setIsLoadingWorkbookData] = useState(false);
  const [refreshWorkbooksTrigger, setRefreshWorkbooksTrigger] = useState(0); // NEW STATE
  const [mappingsRefreshKey, setMappingsRefreshKey] = useState(0);
  const [allWorkbookLogs, setAllWorkbookLogs] = useState<AuditLogEntry[]>([]); // NEW STATE for all logs
  const [isLoadingAllWorkbookLogs, setIsLoadingAllWorkbookLogs] =
    useState(false); // NEW STATE for logs loading
  const [workingPaperCloudInfo, setWorkingPaperCloudInfo] = useState(null);
  const [hasAttemptedWorkingPaperUpload, setHasAttemptedWorkingPaperUpload] =
    useState(false);
  const [isUploadingWorkingPaper, setIsUploadingWorkingPaper] = useState(false);
  const [isUpdatingSheets, setIsUpdatingSheets] = useState(false);
  const [etbData, setEtbData] = useState<ETBData | null>(null);
  const [etbLoading, setEtbLoading] = useState(false);
  const [etbError, setEtbError] = useState<string | null>(null);

  const { toast } = useToast();

  const resolveRowIdentifier = useCallback(
    (row?: Partial<ETBRow> | Partial<WPRow>, fallback?: string) => {
      if (!row) return fallback;
      const rowId =
        (row as any)?._id ||
        (row as any)?.wpRowId ||
        (row as any)?.id ||
        (row as any)?.rowId ||
        row.code;
      return rowId || fallback;
    },
    []
  );

  useEffect(() => {
    setHasAttemptedWorkingPaperUpload(false);
  }, [engagementId, classification]);

  useEffect(() => {
    if (engagementId && classification) {
      const fetchData = async () => {
        const data = await getWorkingPapersCloudFileId(
          engagementId,
          classification
        );
        setWorkingPaperCloudInfo(data);
      };

      fetchData();
    }
  }, [engagementId, classification]);

  // Fetch ETB/WP data for linking workbooks to fields
  const fetchETBData = useCallback(async () => {
    console.log('WorkBookApp: fetchETBData called with:', { engagementId, rowType });

    if (!engagementId) {
      console.log('WorkBookApp: No engagementId, skipping data fetch');
      setEtbData(null);
      return;
    }

    // ✅ ALWAYS use rows from parent if provided (ensures dialog lists same rows as table)
    if (etbRows && etbRows.length > 0) {
      console.log(`WorkBookApp: ✅ Using ${rowType} rows passed from parent (same as table shows):`, {
        rowsCount: etbRows.length,
        rowType,
        classification,
        firstThreeRows: etbRows.slice(0, 3).map(r => ({
          code: r.code,
          name: r.accountName,
          classification: r.classification,
          mappingsCount: r.mappings?.length || 0,
          linkedFilesCount: r.linkedExcelFiles?.length || 0,
          id: (r as any)?._id || (r as any)?.id || (r as any)?.wpRowId || r.code
        }))
      });

      let normalizedRows = etbRows.map((row) => {
        const resolvedId =
          (row as any)?._id ||
          (row as any)?.id ||
          (row as any)?.wpRowId ||
          (row as any)?.rowId ||
          row.code;

        const normalizedRow = {
          ...(row as any),
          _id: resolvedId,
          id: (row as any)?.id || resolvedId,
          wpRowId: resolvedId,
        };

        return normalizedRow as ETBRow;
      });

      if (rowType === 'working-paper' && engagementId) {
        console.log('WorkBookApp: Ensuring Working Paper rows have canonical IDs from backend');
        try {
          const uniqueClassifications = Array.from(
            new Set(
              normalizedRows.map((row) => row.classification || classification)
            )
          ).filter(Boolean) as string[];

          const idMap = new Map<string, string>();

          await Promise.all(
            uniqueClassifications.map(async (classKey) => {
              try {
                const wpData = await getWorkingPaperWithMappings(
                  engagementId,
                  classKey
                );
                wpData?.rows?.forEach((wpRow) => {
                  const mapKey = `${classKey}::${wpRow.code}`;
                  idMap.set(mapKey, wpRow._id);
                });
              } catch (wpError) {
                console.warn(
                  'WorkBookApp: Failed to fetch Working Paper rows for classification',
                  classKey,
                  wpError
                );
              }
            })
          );

          normalizedRows = normalizedRows.map((row) => {
            const classKey = row.classification || classification;
            const mapKey = `${classKey}::${row.code}`;
            const resolvedId =
              idMap.get(mapKey) ||
              (row as any)?._id ||
              (row as any)?.id ||
              (row as any)?.wpRowId ||
              row.code;

            const normalizedRow = {
              ...(row as any),
              _id: resolvedId,
              id: (row as any)?.id || resolvedId,
              wpRowId: resolvedId,
            };

            return normalizedRow as ETBRow;
          });
        } catch (wpIdError) {
          console.warn(
            'WorkBookApp: Failed to enrich Working Paper rows with canonical IDs',
            wpIdError
          );
        }
      }

      setEtbData({
        _id: 'from-parent',
        engagement: engagementId,
        classification: classification, // Add classification from parent
        rows: normalizedRows, // ✅ These are the EXACT rows visible in the table!
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setEtbLoading(false);
      setEtbError(null);
      return; // ✅ Don't fetch from API - parent data is authoritative
    }

    // ✅ FALLBACK: Only fetch from API if parent didn't provide rows
    try {
      setEtbLoading(true);
      setEtbError(null);
      console.log(`WorkBookApp: ⚠️ No parent rows provided - fetching from API for ${rowType}:`, {
        engagementId,
        classification,
        rowType
      });

      let result;
      if (rowType === 'working-paper') {
        // For Working Papers: Fetch WP data for THIS classification only
        console.log('WorkBookApp: Fetching Working Paper data for classification:', classification);
        try {
          result = await getWorkingPaperWithMappings(engagementId, classification);
          console.log('WorkBookApp: ✅ Working Paper data found for classification');
        } catch (wpError) {
          // If no Working Paper exists yet, fall back to ETB data for THIS classification
          console.log('WorkBookApp: No Working Paper found, fetching ETB data for classification:', classification);
          result = await getExtendedTrialBalanceWithMappings(engagementId, classification);
          console.log('WorkBookApp: ✅ Using ETB data as fallback for Working Papers');
        }
      } else {
        // For ETB/Lead Sheet: Fetch ONLY rows for THIS classification (same as Lead Sheet table shows)
        console.log('WorkBookApp: Fetching ETB data for classification:', classification);
        result = await getExtendedTrialBalanceWithMappings(engagementId, classification);
        console.log('WorkBookApp: ✅ ETB data received for classification');
      }

      console.log(`WorkBookApp: ${rowType} data received successfully:`, {
        hasResult: !!result,
        hasRows: !!result?.rows,
        totalRows: result?.rows?.length || 0,
        firstThreeRows: result?.rows?.slice(0, 3)?.map(r => ({
          code: r.code,
          name: r.accountName,
          classification: r.classification
        }))
      });

      setEtbData(result);
    } catch (err) {
      console.error(`WorkBookApp: ${rowType} API error:`, err);
      setEtbError(err instanceof Error ? err.message : `Failed to fetch ${rowType} data`);
      setEtbData(null);
    } finally {
      setEtbLoading(false);
    }
  }, [engagementId, etbRows, rowType, classification]);

  // Fetch ETB data when engagementId or etbRows changes
  useEffect(() => {
    fetchETBData();
  }, [engagementId, etbRows, fetchETBData]);

  useEffect(() => {
    if (selectedWorkbook) {
      console.log('📊 WorkBookApp: selectedWorkbook changed - syncing mappings/namedRanges:', {
        workbookId: selectedWorkbook.id,
        mappingsCount: selectedWorkbook.mappings?.length || 0,
        namedRangesCount: selectedWorkbook.namedRanges?.length || 0,
        timestamp: selectedWorkbook._mappingsUpdateTimestamp
      });

      // Set namedRanges from selectedWorkbook if they exist
      if (
        selectedWorkbook.namedRanges &&
        Array.isArray(selectedWorkbook.namedRanges)
      ) {
        setNamedRanges([...selectedWorkbook.namedRanges]); // ✅ NEW reference
      } else {
        setNamedRanges([]);
      }

      // Set mappings from selectedWorkbook if they exist
      if (
        selectedWorkbook.mappings &&
        Array.isArray(selectedWorkbook.mappings)
      ) {
        const newMappings = [...selectedWorkbook.mappings]; // ✅ NEW reference
        console.log('📊 WorkBookApp: Setting mappings from selectedWorkbook:', {
          count: newMappings.length,
          mappings: newMappings
        });
        setMappings(newMappings);
      } else {
        console.log('📊 WorkBookApp: No mappings in selectedWorkbook, clearing');
        setMappings([]);
      }
    } else {
      // Reset when no workbook is selected
      console.log('📊 WorkBookApp: No workbook selected, clearing mappings/namedRanges');
      setNamedRanges([]);
      setMappings([]);
    }
  }, [selectedWorkbook]);

  const handleWorkingPaperUpload = (newWorkbookFromUploadModal: Workbook) => {
    setWorkbooks((prev) => {
      const existingIndex = prev.findIndex(
        (wb: any) => wb.id === newWorkbookFromUploadModal.id
      );
      if (existingIndex > -1) {
        const updatedWorkbooks = [...prev];
        updatedWorkbooks[existingIndex] = newWorkbookFromUploadModal;
        return updatedWorkbooks;
      } else {
        return [...prev, newWorkbookFromUploadModal];
      }
    });

    toast({
      title: "Working Paper",
      description: `Successfully loaded ${newWorkbookFromUploadModal.name}`,
    });

    setSelectedWorkbook(newWorkbookFromUploadModal);

    if (
      newWorkbookFromUploadModal.fileData &&
      Object.keys(newWorkbookFromUploadModal.fileData).length > 0
    ) {
      setViewerSelectedSheet(
        Object.keys(newWorkbookFromUploadModal.fileData)[0]
      );
    } else {
      setViewerSelectedSheet("Sheet1");
    }

    setRefreshWorkbooksTrigger((prev) => prev + 1); // Trigger refresh after upload
  };

  const getExcelDatafromCloudAndUploadToDB = async (
    workingPaperCloudInfo: any
  ) => {
    setIsLoadingWorkbooks(true);
    try {
      const cloudFileId = workingPaperCloudInfo.spreadsheetId;
      const listSheetsResponse = await msDriveworkbookApi.listWorksheets(
        cloudFileId
      );

      if (!listSheetsResponse.success) {
        throw new Error(
          listSheetsResponse.error ||
          "Failed to list worksheets from uploaded file."
        );
      }

      const sheetNames = listSheetsResponse.data.map((ws) => ws.name);
      const processedFileData: SheetData = {};

      // 3. Create minimal fileData - just sheet names for metadata
      for (const sheetName of sheetNames) {
        // Empty placeholder - actual data will be loaded on-demand from MS Drive
        processedFileData[sheetName] = [[]];
      }

      // --- NEW STEP: Save the processed workbook metadata and sheet data to our MongoDB ---
      const category = rowType === 'etb' ? 'lead-sheet' : rowType; // ✅ Tag with category
      const workbookMetadataForDB = {
        cloudFileId,
        name: "Working Paper",
        webUrl: workingPaperCloudInfo.url,
        engagementId: engagementId,
        classification: classification,
        category: category, // ✅ CRITICAL FIX: Tag workbook with category (lead-sheet, working-paper, evidence)
        uploadedDate: new Date().toISOString(),
        version: "v1", // You might have a better versioning strategy
        uploadedBy: user?.id,
        lastModifiedBy: user?.id,
      };

      console.log('WorkBookApp: Uploading workbook with category:', { category, rowType, classification });

      console.log("Saving workbook with sheet names only:", sheetNames);
      console.log("Workbook metadata:", workbookMetadataForDB);

      // Save to DB with minimal data (no sheet cell data)
      const saveToDbResponse = await db_WorkbookApi.saveProcessedWorkbook(
        workbookMetadataForDB,
        processedFileData
      );

      if (!saveToDbResponse.success || !saveToDbResponse.data) {
        throw new Error(
          saveToDbResponse.error || "Failed to save workbook data to database."
        );
      }

      // The backend should return the full Workbook object (with _id, populated sheets if needed)
      // from the database, which you can then pass to onUploadSuccess.
      const newWorkbookFromDB = saveToDbResponse.data.workbook;

      // Ensure fileData is populated for frontend display immediately
      newWorkbookFromDB.fileData = processedFileData;

      handleWorkingPaperUpload(newWorkbookFromDB);
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoadingWorkbooks(false);
    }
  };

  // NEW: Memoize the fetchWorkbooks function using useCallback
  // ✅ UPDATED: Now fetches ALL workbooks for engagement (like evidence files) - no classification filter
  // Uses new API endpoint that queries database directly by engagementId only
  // This is exactly like getAllClassificationEvidence(engagement.id) - no classification filtering
  const fetchWorkbooks = useCallback(async (showLoading: boolean = true) => {
    // ✅ CRITICAL FIX: Only show loading if not already viewing a workbook
    // This prevents the loading screen from replacing the viewer during background refreshes
    if (showLoading) {
      setIsLoadingWorkbooks(true);
    }
    try {
      console.log('📚 WorkBookApp: Fetching ALL workbooks for engagement (like evidence files, no classification filter):', engagementId);
      
      const allWorkbooksMap = new Map<string, any>();
      
      // ✅ NEW: Use the new API endpoint that fetches ALL workbooks for engagement (no classification filter)
      // This is exactly like getAllClassificationEvidence - fetches all items for the engagement
      try {
        console.log(`📚 WorkBookApp: Fetching ALL workbooks for engagement (no classification filter, like evidence files)`);
        
        // Use the new listAllWorkbooksForEngagement API - fetches all workbooks by engagementId only
        const result = await db_WorkbookApi.listAllWorkbooksForEngagement(engagementId);
        
        if (result.success && result.data && Array.isArray(result.data)) {
          console.log(`📚 WorkBookApp: Got ${result.data.length} workbooks (ALL classifications, ALL categories)`);
          result.data.forEach((workbook: any) => {
            const workbookId = workbook._id || workbook.id;
            if (workbookId && !allWorkbooksMap.has(workbookId)) {
              // ✅ CRITICAL: Normalize referenceFiles structure
              let normalizedReferenceFiles: any[] = [];
              if (workbook.referenceFiles && Array.isArray(workbook.referenceFiles)) {
                normalizedReferenceFiles = workbook.referenceFiles.map((ref: any) => {
                  if (!ref || typeof ref !== 'object' || !ref.details) return null;
                  
                  // Normalize evidence IDs (might be populated objects or just IDs)
                  const normalizedEvidence = (ref.evidence || []).map((ev: any) => {
                    if (typeof ev === 'string') return ev;
                    if (ev && typeof ev === 'object' && (ev._id || ev.id)) return ev._id || ev.id;
                    return ev;
                  }).filter((ev: any) => ev !== null && ev !== undefined);
                  
                  return {
                    ...ref,
                    evidence: normalizedEvidence
                  };
                }).filter((ref: any) => ref !== null && ref.details && ref.details.sheet);
              }
              
              const normalizedWorkbook = {
                id: workbookId,
                cloudFileId: workbook.cloudFileId,
                name: workbook.name,
                webUrl: workbook.webUrl,
                uploadedDate: workbook.uploadedDate
                  ? new Date(workbook.uploadedDate).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0],
                version: workbook.version || "v1",
                lastModified: workbook.lastModifiedDate,
                lastModifiedBy: workbook.lastModifiedBy,
                classification: workbook.classification,
                category: workbook.category,
                engagementId: workbook.engagementId,
                fileData: {},
                referenceFiles: normalizedReferenceFiles, // ✅ CRITICAL: Include referenceFiles
              };
              
              allWorkbooksMap.set(workbookId, normalizedWorkbook);
            }
          });
        } else {
          console.log(`📚 WorkBookApp: No workbooks found (success: ${result.success}, error: ${result.error || 'none'})`);
        }
      } catch (error: any) {
        console.error(`❌ WorkBookApp: Error fetching all workbooks:`, error);
        throw error; // Re-throw to be caught by outer catch
      }
      
      const uniqueWorkbooks = Array.from(allWorkbooksMap.values());
      setWorkbooks(uniqueWorkbooks);
      console.log(`✅ WorkBookApp: Loaded ${uniqueWorkbooks.length} unique workbooks (ALL classifications & categories, NO classification filter) for engagement`, {
        totalFetched: uniqueWorkbooks.length,
        workbooks: uniqueWorkbooks.map(wb => ({ id: wb.id, name: wb.name, classification: wb.classification, category: wb.category }))
      });
      return uniqueWorkbooks;
    } catch (error: any) {
      console.error("Failed to fetch workbooks:", error);
      toast({
        variant: "destructive",
        title: "Error fetching workbooks",
        description: `An unexpected error occurred: ${error.message || error}`,
      });
      return [];
    } finally {
      if (showLoading) {
        setIsLoadingWorkbooks(false);
      }
    }
  }, [engagementId, toast]); // ✅ Removed classification and allClassifications - we fetch ALL workbooks like evidence files

  // to upload working papaer to db

  // NEW useEffect to fetch all workbook logs
  useEffect(() => {
    const fetchAllWorkbookLogs = async () => {
      if (!engagementId || !classification || !workingPaperCloudInfo) return;

      setIsLoadingAllWorkbookLogs(true);
      try {
        const fetchedWorkbooks = await fetchWorkbooks();

        let workingpaperUploadExist = fetchedWorkbooks.find(
          (wb) => wb.cloudFileId === workingPaperCloudInfo?.spreadsheetId
        );

        // Only attempt upload if we haven't tried before and the workbook doesn't exist
        if (!workingpaperUploadExist && !hasAttemptedWorkingPaperUpload) {
          setHasAttemptedWorkingPaperUpload(true);
          setIsUploadingWorkingPaper(true); // Start showing loading state
          await getExcelDatafromCloudAndUploadToDB(workingPaperCloudInfo);
          setIsUploadingWorkingPaper(false); // Stop showing loading state

          // After upload, fetch workbooks again to get the updated list
          const updatedWorkbooks = await fetchWorkbooks();

          // Now fetch the logs for all workbooks including the newly uploaded one
          const allLogs: AuditLogEntry[] = [];
          for (const workbook of updatedWorkbooks) {
            try {
              const logsResponse = await db_WorkbookApi.getWorkbookLogs(
                workbook.id
              );
              if (logsResponse.success && logsResponse.data) {
                const workbookSpecificLogs = logsResponse.data.map(
                  (log: any) => ({
                    id: log._id || Date.now().toString() + Math.random(),
                    timestamp: log.timestamp,
                    user: log.actor || "Unknown User",
                    action: log.type,
                    details: log.details?.name
                      ? `Workbook: ${log.details.name}, Version: ${log.version || "N/A"
                      }, Action: ${log.type}`
                      : log.details?.message || JSON.stringify(log.details),
                    workbookName: workbook.name,
                  })
                );
                allLogs.push(...workbookSpecificLogs);
              } else {
                console.warn(
                  `Failed to fetch logs for workbook ${workbook.name}:`,
                  logsResponse.error
                );
              }
            } catch (error) {
              console.error(
                `Error fetching logs for workbook ${workbook.name}:`,
                error
              );
            }
          }

          allLogs.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setAllWorkbookLogs(allLogs);
        } else {
          // If working paper already exists, just fetch logs normally
          const allLogs: AuditLogEntry[] = [];
          for (const workbook of fetchedWorkbooks) {
            try {
              const logsResponse = await db_WorkbookApi.getWorkbookLogs(
                workbook.id
              );
              if (logsResponse.success && logsResponse.data) {
                const workbookSpecificLogs = logsResponse.data.map(
                  (log: any) => ({
                    id: log._id || Date.now().toString() + Math.random(),
                    timestamp: log.timestamp,
                    user: log.actor || "Unknown User",
                    action: log.type,
                    details: log.details?.name
                      ? `Workbook: ${log.details.name}, Version: ${log.version || "N/A"
                      }, Action: ${log.type}`
                      : log.details?.message || JSON.stringify(log.details),
                    workbookName: workbook.name,
                  })
                );
                allLogs.push(...workbookSpecificLogs);
              } else {
                console.warn(
                  `Failed to fetch logs for workbook ${workbook.name}:`,
                  logsResponse.error
                );
              }
            } catch (error) {
              console.error(
                `Error fetching logs for workbook ${workbook.name}:`,
                error
              );
            }
          }

          allLogs.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setAllWorkbookLogs(allLogs);
        }
      } catch (error) {
        console.error("Error fetching all workbook logs:", error);
        toast({
          variant: "destructive",
          title: "Error fetching history",
          description: `Failed to load workbook history: ${error instanceof Error ? error.message : "Unknown error."
            }`,
        });
        setIsUploadingWorkingPaper(false); // Make sure to stop loading on error
      } finally {
        setIsLoadingAllWorkbookLogs(false);
      }
    };

    fetchAllWorkbookLogs();
  }, [
    engagementId,
    classification,
    refreshWorkbooksTrigger,
    fetchWorkbooks,
    toast,
    workingPaperCloudInfo,
    hasAttemptedWorkingPaperUpload,
  ]);

  // Modify useEffect to depend on refreshWorkbooksTrigger
  useEffect(() => {
    if (engagementId && classification) {
      // ✅ CRITICAL FIX: Don't show loading screen when refreshing workbooks if we're viewing a workbook
      // This prevents the viewer from being replaced by the loading screen during background refreshes
      const isViewingWorkbook = currentView === "viewer" && selectedWorkbook !== null;
      fetchWorkbooks(!isViewingWorkbook); // Only show loading if not viewing a workbook
    }
  }, [engagementId, classification, fetchWorkbooks, refreshWorkbooksTrigger, currentView, selectedWorkbook]);

  // Trigger refresh when parent notifies via refreshTrigger
  useEffect(() => {
    if (refreshTrigger !== 0) {
      setRefreshWorkbooksTrigger((prev) => prev + 1);
    }
  }, [refreshTrigger]);

  // Add state for sheet data cache
  const [sheetDataCache, setSheetDataCache] = useState<Map<string, any>>(new Map());

  // Function to load sheet data on-demand
  const loadSheetData = async (workbookId: string, cloudFileId: string, sheetName: string) => {
    const cacheKey = `${workbookId}-${sheetName}`;

    // Check cache first
    if (sheetDataCache.has(cacheKey)) {
      return sheetDataCache.get(cacheKey);
    }

    // If not in cache, fetch from backend
    try {
      const sheetData = await db_WorkbookApi.fetchSheetData(workbookId, sheetName);
      if (sheetData.success) {
        // Update cache
        setSheetDataCache(prev => new Map(prev).set(cacheKey, sheetData.data));
        return sheetData.data;
      }
    } catch (error) {
      console.error(`Failed to load sheet ${sheetName}:`, error);
      return null;
    }
  };

  // ✅ NEW: Helper function to refresh mappings for a workbook
  const refreshWorkbookMappings = async (workbookId: string) => {
    try {
      console.log('🔄 WorkBookApp: Refreshing mappings for workbook:', { workbookId, rowType, engagementId, classification });
  
      let fetchedMappings: any[] = [];
  
      try {
        if (rowType === 'working-paper') {
          console.log('🔄 Calling Working Paper API: getWPMappingsByWorkbook');
          const { getWPMappingsByWorkbook } = await import('@/lib/api/workingPaperApi');
          fetchedMappings = await getWPMappingsByWorkbook(engagementId, classification, workbookId);
        } else if (rowType === 'evidence') {
          console.log('🔄 Calling Evidence API: getEvidenceMappingsByWorkbook');
          const { getEvidenceMappingsByWorkbook } = await import('@/lib/api/classificationEvidenceApi');
          fetchedMappings = await getEvidenceMappingsByWorkbook(workbookId);
        } else {
          console.log('🔄 Calling ETB API: getMappingsByWorkbook');
          const { getMappingsByWorkbook } = await import('@/lib/api/extendedTrialBalanceApi');
          fetchedMappings = await getMappingsByWorkbook(workbookId);
        }
      } catch (apiErr) {
        console.error('❌ API call failed:', apiErr);
        fetchedMappings = [];
      }
  
      // ✅ CRITICAL: Fetch the latest workbook from backend to ensure we have the most up-to-date referenceFiles
      // This prevents reading stale state from closures
      let currentWorkbook: any = null;
      let currentMappings: any[] = [];
      let currentReferenceFiles: any[] = [];
      
      try {
        // Fetch the latest workbook from backend to get the most up-to-date referenceFiles
        const workbookResponse = await db_WorkbookApi.getWorkbookById(workbookId);
        if (workbookResponse.success && workbookResponse.data) {
          currentWorkbook = workbookResponse.data;
          // Normalize ID
          if (currentWorkbook._id && !currentWorkbook.id) {
            currentWorkbook.id = currentWorkbook._id;
          }
          // Normalize referenceFiles structure
          if (currentWorkbook.referenceFiles && Array.isArray(currentWorkbook.referenceFiles)) {
            currentWorkbook.referenceFiles = currentWorkbook.referenceFiles.map((ref: any) => {
              if (!ref || typeof ref !== 'object' || !ref.details) return null;
              // Normalize evidence IDs
              const normalizedEvidence = (ref.evidence || []).map((ev: any) => {
                if (typeof ev === 'string') return ev;
                if (ev && typeof ev === 'object' && (ev._id || ev.id)) return ev._id || ev.id;
                return ev;
              }).filter((ev: any) => ev !== null && ev !== undefined);
              return {
                ...ref,
                evidence: normalizedEvidence
              };
            }).filter((ref: any) => ref !== null && ref.details && ref.details.sheet);
          }
          currentMappings = currentWorkbook.mappings || [];
          currentReferenceFiles = currentWorkbook.referenceFiles || [];
        }
      } catch (fetchError) {
        console.error('❌ Error fetching workbook from backend:', fetchError);
        // Fallback to local state if backend fetch fails
        currentWorkbook = selectedWorkbook && selectedWorkbook.id === workbookId 
          ? selectedWorkbook 
          : (workbooks as any[]).find((wb: any) => wb.id === workbookId);
        currentMappings = currentWorkbook?.mappings || [];
        currentReferenceFiles = currentWorkbook?.referenceFiles || [];
      }
      
      console.log('🔄 refreshWorkbookMappings: Current workbook state:', {
        workbookId,
        mappingsCount: currentMappings.length,
        referenceFilesCount: currentReferenceFiles.length,
        hasReferenceFiles: currentReferenceFiles.length > 0,
        source: currentWorkbook ? 'backend' : 'local'
      });
  
      // ✅ CRITICAL FIX: Merge fetched mappings with existing ones
      // This prevents overwriting any local changes that haven't been saved yet
      const mergedMappings = currentMappings.map(existingMapping => {
        const fetchedMatch = fetchedMappings.find(m => m._id === existingMapping._id);
        return fetchedMatch || existingMapping;
      });
  
      // ✅ Include any new mappings returned from the API
      const newFetchedMappings = fetchedMappings.filter(
        fetched => !currentMappings.some((existing: any) => existing._id === fetched._id)
      );

      // ✅ CRITICAL FIX: Ensure we create a NEW array reference for React to detect change
      const mappingsArray = [...mergedMappings, ...newFetchedMappings];
  
      // ✅ ENHANCEMENT: Add workbook information to each mapping
      const enhancedMappings = mappingsArray.map((mapping: any) => {
        const workbook = workbooks.find((wb: any) => wb.id === mapping.workbookId);
        return {
          ...mapping,
          workbookId: {
            _id: mapping.workbookId,
            name: workbook?.name || 'Unknown Workbook'
          }
        };
      });
  
      console.log('🔄 Setting mappings state to:', {
        count: enhancedMappings.length,
        mappings: enhancedMappings,
        isNewArrayReference: true
      });
  
      // Update mappings state with NEW array reference
      setMappings([...enhancedMappings]);
  
      // Update selected workbook with new mappings (NEW object reference)
      // ✅ CRITICAL: Preserve referenceFiles when updating mappings
      // Use functional update to get the latest state
      setSelectedWorkbook((prevSelectedWorkbook: any) => {
        if (prevSelectedWorkbook && prevSelectedWorkbook.id === workbookId) {
          // ✅ CRITICAL: Use currentReferenceFiles from backend fetch, or fallback to prevSelectedWorkbook
          const latestRefFiles = currentReferenceFiles.length > 0 
            ? currentReferenceFiles 
            : (prevSelectedWorkbook.referenceFiles || []);
          
          // ✅ CRITICAL: Preserve fileData and other important properties
          const updatedWorkbook = {
            ...prevSelectedWorkbook,
            ...(currentWorkbook || {}), // Merge backend data if available
            mappings: [...enhancedMappings],
            _mappingsUpdateTimestamp: Date.now(),
            // ✅ CRITICAL: Preserve referenceFiles from the latest workbook state
            referenceFiles: latestRefFiles.map((ref: any) => ({
              ...ref,
              details: ref.details ? { ...ref.details } : ref.details,
              evidence: ref.evidence ? [...ref.evidence] : []
            })),
            // ✅ CRITICAL: Preserve fileData from previous state
            fileData: prevSelectedWorkbook.fileData || currentWorkbook?.fileData,
            // Normalize ID
            id: workbookId
          };
          
          console.log('🔄 Updated selectedWorkbook with refreshed mappings (preserved referenceFiles):', {
            mappingsCount: enhancedMappings.length,
            referenceFilesCount: updatedWorkbook.referenceFiles?.length || 0,
            referenceFilesFrom: currentReferenceFiles.length > 0 ? 'backend' : 'prevSelectedWorkbook',
            hasFileData: !!updatedWorkbook.fileData
          });
          
          return updatedWorkbook;
        }
        return prevSelectedWorkbook;
      });
  
      // Update workbooks list with new mappings (NEW object references)
      // ✅ CRITICAL: Preserve referenceFiles when updating mappings
      setWorkbooks(prev => {
        const updated = prev.map(wb => {
          if (wb.id === workbookId) {
            // ✅ CRITICAL: Get the latest referenceFiles from backend fetch or existing wb
            const latestRefFiles = currentReferenceFiles.length > 0 
              ? currentReferenceFiles 
              : (wb.referenceFiles || []);
            
            return {
              ...wb,
              ...(currentWorkbook || {}), // Merge backend data if available
              mappings: [...enhancedMappings],
              _mappingsUpdateTimestamp: Date.now(),
              // ✅ CRITICAL: Preserve referenceFiles from the latest workbook state
              referenceFiles: latestRefFiles.map((ref: any) => ({
                ...ref,
                details: ref.details ? { ...ref.details } : ref.details,
                evidence: ref.evidence ? [...ref.evidence] : []
              })),
              // ✅ CRITICAL: Preserve fileData from existing wb
              fileData: wb.fileData || currentWorkbook?.fileData,
              // Normalize ID
              id: workbookId
            };
          }
          return wb;
        });
        return updated;
      });
  
      console.log('✅ WorkBookApp: Mappings refresh complete - all states updated');
    } catch (err) {
      console.error('❌ WorkBookApp: Failed to refresh mappings:', err);
    }
  };

  const handleSelectWorkbook = async (workbook: Workbook) => {
    setIsLoadingWorkbookData(true);
    try {
      toast({
        title: "Loading Workbook",
        description: `Fetching data for ${workbook.name}...`,
        duration: 3000,
      });

      const fetchWorkbookResponse =
        await db_WorkbookApi.fetchWorkbookWithSheets(workbook.id);

      if (!fetchWorkbookResponse.success || !fetchWorkbookResponse.data) {
        throw new Error(
          fetchWorkbookResponse.error ||
          "Failed to fetch full workbook data from database."
        );
      }

      const fullWorkbookFromDB = fetchWorkbookResponse.data;
      console.log(fullWorkbookFromDB);
      const fetchedFileData: SheetData = {};
      let sheetNamesToProcess: string[] = [];

      if (fullWorkbookFromDB.sheets && fullWorkbookFromDB.sheets.length > 0) {
        // OPTIMIZATION: Don't store sheet.data (it's metadata now)
        // Instead, just extract sheet names and create empty placeholders
        fullWorkbookFromDB.sheets.forEach((sheet: any) => {
          fetchedFileData[sheet.name] = [[]]; // Empty placeholder
          sheetNamesToProcess.push(sheet.name);
        });
      } else {
        console.warn(
          `No sheets found or populated for workbook ID: ${workbook.id}`
        );
      }

      // ✅ CRITICAL FIX: Fetch mappings from the correct model based on rowType
      let fetchedMappings: any[] = [];
      try {
        console.log('WorkBookApp: Fetching mappings for workbook:', { workbookId: workbook.id, rowType });

        // Use the same helper function we created
        if (rowType === 'working-paper') {
          // Fetch Working Paper mappings
          const { getWPMappingsByWorkbook } = await import('@/lib/api/workingPaperApi');
          fetchedMappings = await getWPMappingsByWorkbook(engagementId, classification, workbook.id);
        } else if (rowType === 'evidence') {
          // Fetch Evidence mappings
          const { getEvidenceMappingsByWorkbook } = await import('@/lib/api/classificationEvidenceApi');
          fetchedMappings = await getEvidenceMappingsByWorkbook(workbook.id);
        } else {
          // Fetch ETB mappings (default)
          const { getMappingsByWorkbook } = await import('@/lib/api/extendedTrialBalanceApi');
          fetchedMappings = await getMappingsByWorkbook(workbook.id);
        }

        console.log('WorkBookApp: Fetched mappings from model:', {
          rowType,
          count: fetchedMappings?.length || 0,
          mappings: fetchedMappings
        });
      } catch (err) {
        console.warn('WorkBookApp: Failed to fetch mappings for workbook:', err);
        fetchedMappings = fullWorkbookFromDB.mappings || []; // Fallback to workbook-level mappings
      }

      // ✅ CRITICAL: Normalize referenceFiles structure from backend
      let normalizedReferenceFiles: any[] = [];
      if (fullWorkbookFromDB.referenceFiles && Array.isArray(fullWorkbookFromDB.referenceFiles)) {
        normalizedReferenceFiles = fullWorkbookFromDB.referenceFiles.map((ref: any) => {
          if (!ref || typeof ref !== 'object' || !ref.details) return null;
          
          // Normalize evidence IDs (might be populated objects or just IDs)
          const normalizedEvidence = (ref.evidence || []).map((ev: any) => {
            if (typeof ev === 'string') return ev;
            if (ev && typeof ev === 'object' && (ev._id || ev.id)) return ev._id || ev.id;
            return ev;
          }).filter((ev: any) => ev !== null && ev !== undefined);
          
          return {
            ...ref,
            evidence: normalizedEvidence
          };
        }).filter((ref: any) => ref !== null && ref.details && ref.details.sheet);
      }

      const updatedWorkbook = {
        ...workbook,
        fileData: fetchedFileData,
        namedRanges: fullWorkbookFromDB.namedRanges || [],
        mappings: fetchedMappings, // ✅ Use fetched mappings from correct model
        referenceFiles: normalizedReferenceFiles, // ✅ CRITICAL: Include referenceFiles from backend
      };

      setWorkbooks((prev) =>
        prev.map((wb) => (wb.id === workbook.id ? updatedWorkbook : wb))
      );

      setSelectedWorkbook(updatedWorkbook);

      // ✅ NEW: Load user's last selected sheet preference
      let sheetToSelect: string | undefined = undefined;
      if (sheetNamesToProcess.length > 0) {
        try {
          const preferenceResponse = await db_WorkbookApi.getUserWorkbookPreference(workbook.id);
          if (preferenceResponse.success && preferenceResponse.data?.lastSelectedSheet) {
            const savedSheet = preferenceResponse.data.lastSelectedSheet;
            // Verify the saved sheet still exists in the workbook
            if (sheetNamesToProcess.includes(savedSheet)) {
              sheetToSelect = savedSheet;
              console.log(`WorkBookApp: Restored last selected sheet: ${savedSheet}`);
            } else {
              console.log(`WorkBookApp: Saved sheet "${savedSheet}" no longer exists, using first sheet`);
            }
          }
        } catch (prefError) {
          console.warn('WorkBookApp: Failed to load sheet preference, using default:', prefError);
        }
        
        // Fallback to first sheet if no preference or preference invalid
        if (!sheetToSelect) {
          sheetToSelect = sheetNamesToProcess[0];
        }
      } else {
        sheetToSelect = "Sheet1";
      }

      setViewerSelectedSheet(sheetToSelect);

      console.log("WorkBookApp: About to render ExcelViewer with data:");
      console.log("WorkBookApp: selectedWorkbook (updated):", updatedWorkbook);
      console.log(
        "WorkBookApp: mappings (from DB):",
        fullWorkbookFromDB.mappings
      );
      console.log(
        "WorkBookApp: namedRanges (from DB):",
        fullWorkbookFromDB.namedRanges
      );
      console.log("WorkBookApp: Selected sheet:", sheetToSelect);

      setCurrentView("viewer");
    } catch (error) {
      console.error("Error fetching workbook sheets:", error);
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: `Failed to load data for ${workbook.name}: ${error instanceof Error ? error.message : "Unknown error."
          }`,
      });
    } finally {
      setIsLoadingWorkbookData(false);
    }
  };

  // Create a utility function to process sheet data (to avoid code duplication)
  const processSheetData = (rawSheetData: any[][], address?: string) => {
    // Parse the address to get the starting row and column
    const {
      start: { row: startExcelRow, col: startZeroCol },
    } = parseExcelRange(address || "A1");

    // Determine actual data dimensions
    let maxDataRows = rawSheetData.length;
    let maxDataCols = 0;
    if (rawSheetData && rawSheetData.length > 0) {
      rawSheetData.forEach((row) => {
        if (row.length > maxDataCols) {
          maxDataCols = row.length;
        }
      });
    }

    // These are the *display* dimensions, including potential empty space before the data starts.
    // minDisplayRows/Cols ensure a minimum grid size.
    const minDisplayRows = 20;
    const minDisplayCols = 10;

    // Calculate the total number of rows and columns needed for the display grid.
    // This should accommodate the data, starting from its actual Excel position.
    const totalDisplayRows = Math.max(
      minDisplayRows,
      startExcelRow + maxDataRows - 1
    ); // Adjusted based on data's end row
    const totalDisplayCols = Math.max(
      minDisplayCols,
      startZeroCol + maxDataCols
    ); // Adjusted based on data's end col

    // Construct the header row (empty corner, A, B, C...)
    const headerRow: string[] = [""];
    for (let i = 0; i < totalDisplayCols; i++) {
      headerRow.push(zeroIndexToExcelCol(i));
    }

    const excelLikeData: string[][] = [headerRow];

    // Construct the data rows (1, 2, 3... | cell data)
    for (let i = 0; i < totalDisplayRows; i++) {
      const newRow: string[] = [(i + 1).toString()]; // Prepend row number (1-indexed)

      for (let j = 0; j < totalDisplayCols; j++) {
        // Calculate the corresponding index in rawSheetData
        const dataRowIndex = i - (startExcelRow - 1); // Adjust for 0-indexed array vs 1-indexed Excel row
        const dataColIndex = j - startZeroCol; // Adjust for 0-indexed array vs 0-indexed Excel column

        let cellValue = "";
        if (
          dataRowIndex >= 0 &&
          dataRowIndex < maxDataRows &&
          dataColIndex >= 0 &&
          dataColIndex < maxDataCols &&
          rawSheetData[dataRowIndex] &&
          rawSheetData[dataRowIndex][dataColIndex] !== undefined
        ) {
          cellValue = String(rawSheetData[dataRowIndex][dataColIndex]);
        }
        newRow.push(cellValue);
      }
      excelLikeData.push(newRow);
    }

    return excelLikeData;
  };

  // Update the updateSheetsInWorkbook function
  const updateSheetsInWorkbook = async (
    cloudFileId: string,
    workbookId: string
  ) => {
    setIsUpdatingSheets(true);

    try {
      // Show a toast to indicate the process has started
      toast({
        title: "Updating Sheets",
        description: "Fetching the latest data from the cloud...",
      });

      // Fetch the sheet names from the cloud storage
      const listSheetsResponse = await msDriveworkbookApi.listWorksheets(
        cloudFileId
      );

      if (!listSheetsResponse.success) {
        throw new Error(
          listSheetsResponse.error ||
          "Failed to list worksheets from cloud storage."
        );
      }

      const sheetNames = listSheetsResponse.data.map((ws) => ws.name);
      const processedFileData: SheetData = {};
      let processedSheets = 0;

      // Update the toast to show progress
      const progressToast = toast({
        title: "Processing Sheets",
        description: `Processed 0 of ${sheetNames.length} sheets...`,
      });

      // Process each sheet
      for (const sheetName of sheetNames) {
        try {
          const readSheetResponse = await msDriveworkbookApi.readSheet(
            cloudFileId,
            sheetName
          );

          if (!readSheetResponse.success) {
            console.warn(
              `Failed to read data for sheet '${sheetName}'. Skipping.`
            );
            processedFileData[sheetName] = [["Error reading sheet"]];
          } else {
            const { values: rawSheetData, address } = readSheetResponse.data;
            processedFileData[sheetName] = processSheetData(
              rawSheetData,
              address
            );
          }

          // Update progress
          processedSheets++;
          toast({
            title: "Processing Sheets",
            description: `Processed ${processedSheets} of ${sheetNames.length} sheets...`,
          });
        } catch (sheetError) {
          console.error(`Error processing sheet ${sheetName}:`, sheetError);
          processedFileData[sheetName] = [["Error processing sheet"]];
        }
      }

      // Update the sheets in the database
      toast({
        title: "Saving to Database",
        description: "Updating the workbook in the database...",
      });

      const updatedSheetsResponse = await db_WorkbookApi.updateSheets(
        workbookId,
        processedFileData
      );

      if (!updatedSheetsResponse.success || !updatedSheetsResponse.data) {
        throw new Error(
          updatedSheetsResponse.error ||
          "Failed to save workbook data to database."
        );
      }

      // Get the updated workbook from the response
      const newWorkbookFromDB = updatedSheetsResponse.data.workbook;
      newWorkbookFromDB.fileData = processedFileData;

      // Update both the selected workbook and the workbooks list
      setSelectedWorkbook(newWorkbookFromDB);
      setWorkbooks((prev) =>
        prev.map((wb) => (wb.id === workbookId ? newWorkbookFromDB : wb))
      );

      // Set the selected sheet
      if (
        newWorkbookFromDB.fileData &&
        Object.keys(newWorkbookFromDB.fileData).length > 0
      ) {
        setViewerSelectedSheet(Object.keys(newWorkbookFromDB.fileData)[0]);
      } else {
        setViewerSelectedSheet("Sheet1");
      }

      // Show success message
      toast({
        title: "Sheets Updated Successfully",
        description: `Updated ${sheetNames.length} sheets from the cloud.`,
      });

      // Navigate to the viewer and refresh data
      setCurrentView("viewer");
      setRefreshWorkbooksTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error updating sheets:", error);
      toast({
        variant: "destructive",
        title: "Sheets Update Failed",
        description: `Failed to update sheets: ${error instanceof Error ? error.message : "Unknown error."
          }`,
      });
    } finally {
      setIsUpdatingSheets(false);
    }
  };

  const handleLinkFieldClick = (selection: Selection) => {
    setPendingSelection(selection);
    setCurrentView("link-field-modal");
  };

  const handleCreateMapping = async (
    workbookId: string,
    mappingDetails: {
      sheet: string;
      start: MappingCoordinates;
      end: MappingCoordinates;
      destinationField: string;
      transform: string;
      color: string;
    }
  ) => {
    console.log('🚀🚀🚀 WorkBookApp.handleCreateMapping: CALLED!', {
      workbookId,
      destinationField: mappingDetails.destinationField,
      rowType,
      classification,
      engagementId
    });
  
    try {
      if (!workbookId) {
        console.log('❌ WorkBookApp: Missing workbookId');
        toast({
          title: "Error",
          description: "Workbook ID is missing.",
          variant: "destructive",
        });
        return;
      }
  
      if (!engagementId) {
        console.log('❌ WorkBookApp: Missing engagementId');
        toast({
          title: "Error",
          description: "Engagement ID is missing.",
          variant: "destructive",
        });
        return;
      }
  
      console.log('WorkBookApp: Creating mapping with rowType:', rowType, {
        engagementId,
        classification,
        rowId: mappingDetails.destinationField,
        workbookId,
        mappingDetails
      });
  
      // Step 1: Find row to get its classification
      const targetRow = etbData?.rows.find(r => r.code === mappingDetails.destinationField);
      const rowClassification = targetRow?.classification || classification;
      let rowIdentifier = resolveRowIdentifier(targetRow, mappingDetails.destinationField);

      if (rowType === 'working-paper' && engagementId && rowClassification && (!rowIdentifier || rowIdentifier === targetRow?.code)) {
        try {
          console.log('WorkBookApp: Fetching Working Paper row to resolve _id', {
            engagementId,
            rowClassification,
            rowCode: targetRow?.code
          });
          const wpData = await getWorkingPaperWithMappings(engagementId, rowClassification);
          const wpRow = wpData?.rows?.find((row) => row.code === targetRow?.code);
          if (wpRow?._id) {
            rowIdentifier = wpRow._id;
            console.log('WorkBookApp: Resolved Working Paper row identifier from backend', {
              rowCode: targetRow?.code,
              rowIdentifier
            });
          } else {
            console.warn('WorkBookApp: Unable to resolve Working Paper row identifier from backend response', {
              rowCode: targetRow?.code,
              rowsReturned: wpData?.rows?.length
            });
          }
        } catch (wpResolveError) {
          console.error('WorkBookApp: Failed to fetch Working Paper row for identifier resolution', wpResolveError);
        }
      }

      if (rowType === 'working-paper' && !rowIdentifier) {
        toast({
          title: "Error",
          description: "Unable to determine Working Paper row identifier.",
          variant: "destructive",
        });
        return;
      }
  
      console.log('WorkBookApp: Target row details:', {
        rowCode: targetRow?.code,
        rowName: targetRow?.accountName,
        rowClassification,
        rowIdentifier,
        workbookId,
        rowType
      });
  
      // Step 2: Add mapping to the row (call appropriate API based on rowType)
      const mappingPayload = {
        workbookId: workbookId,
        color: mappingDetails.color,
        details: {
          sheet: mappingDetails.sheet,
          start: mappingDetails.start,
          end: mappingDetails.end
        }
      };
  
      let mappingResult;
      if (rowType === 'working-paper') {
        console.log('WorkBookApp: Calling Working Paper API to add mapping');
        mappingResult = await addMappingToWPRow(
          engagementId,
          rowClassification,
          rowIdentifier as string,
          mappingPayload
        );
      } else if (rowType === 'evidence') {
        // For Evidence, destinationField is the evidenceId
        console.log('WorkBookApp: Calling Evidence API to add mapping');
        const evidenceId = mappingDetails.destinationField;
        mappingResult = await addMappingToEvidence(evidenceId, mappingPayload);
      } else {
        // Default to ETB API
        console.log('WorkBookApp: Calling ETB API to add mapping');
        mappingResult = await addMappingToRow(
          engagementId,
          mappingDetails.destinationField, // This is the row code
          mappingPayload
        );
      }
  
      console.log('WorkBookApp: Mapping created successfully:', mappingResult);
  
      // Step 3: Also add workbook to linkedExcelFiles/linkedWorkbooks array (call appropriate API based on rowType)
      if (rowType === 'evidence') {
        // For Evidence we only want the local ExcelViewer to update; avoid re-fetching entire evidence set here
        console.log('WorkBookApp: Evidence mapping created - deferring workbook linkage to ExcelViewer');
      } else {
        // For ETB/WP, fetch current linked files
        let linkedFilesData;
        
        if (rowType === 'working-paper') {
          console.log('WorkBookApp: Fetching WP linked files');
          linkedFilesData = await getWorkingPaperWithLinkedFiles(engagementId, rowClassification);
        } else {
          console.log('WorkBookApp: Fetching ETB linked files');
          linkedFilesData = await getExtendedTBWithLinkedFiles(engagementId, rowClassification);
        }
  
        const currentRow = linkedFilesData.rows.find((r: any) => r.code === mappingDetails.destinationField);
        
        // Get existing linked file IDs
        const existingLinkedFileIds = currentRow?.linkedExcelFiles?.map((wb: any) => wb._id || wb) || [];
        
        console.log('WorkBookApp: Current linked files:', {
          rowCode: mappingDetails.destinationField,
          rowClassification,
          newWorkbookId: workbookId,
          existingCount: existingLinkedFileIds.length,
          existingIds: existingLinkedFileIds,
          rowType
        });
  
        // Check if workbook already in linkedExcelFiles
        if (!existingLinkedFileIds.includes(workbookId)) {
          // Add the workbook to linkedExcelFiles array
          const updatedLinkedFiles = [...existingLinkedFileIds, workbookId];
  
          console.log('WorkBookApp: Updating linkedExcelFiles array:', {
            rowCode: mappingDetails.destinationField,
            rowClassification,
            newWorkbookId: workbookId,
            updatedLinkedFiles,
            rowType
          });
  
          if (rowType === 'working-paper') {
            console.log('WorkBookApp: Calling WP API to update linked files');
            await updateLinkedExcelFilesInWP(
              engagementId,
              rowClassification,
              rowIdentifier as string,
              updatedLinkedFiles
            );
          } else {
            console.log('WorkBookApp: Calling ETB API to update linked files');
            await updateLinkedExcelFilesInExtendedTB(
              engagementId,
              rowClassification,
              mappingDetails.destinationField,
              updatedLinkedFiles
            );
          }
  
          console.log('WorkBookApp: LinkedExcelFiles updated successfully');
        } else {
          console.log('WorkBookApp: Workbook already in linkedExcelFiles, skipping update');
        }
      }
  
      // CRITICAL FIX: Create a new mapping object with correct structure
      const newMapping = {
        _id: `temp-${Date.now()}`, // Temporary ID until refresh
        workbookId: workbookId,
        destinationField: mappingDetails.destinationField,
        transform: mappingDetails.transform,
        color: mappingDetails.color,
        details: {
          sheet: mappingDetails.sheet,
          start: mappingDetails.start,
          end: mappingDetails.end
        }
      };
  
      // CRITICAL FIX: Update selectedWorkbook IMMEDIATELY with new mapping
      if (selectedWorkbook && selectedWorkbook.id === workbookId) {
        const updatedWorkbook = {
          ...selectedWorkbook,
          mappings: [...(selectedWorkbook.mappings || []), newMapping],
          _mappingsUpdateTimestamp: Date.now() // Force re-render
        };
        
        console.log('🔄 WorkBookApp: Updating selectedWorkbook IMMEDIATELY with new mapping:', {
          workbookId: selectedWorkbook.id,
          oldMappingsCount: selectedWorkbook.mappings?.length || 0,
          newMappingsCount: updatedWorkbook.mappings.length,
          timestamp: updatedWorkbook._mappingsUpdateTimestamp
        });
        
        setSelectedWorkbook(updatedWorkbook);
      }

      // ✅ CRITICAL FIX: Update workbooks list immediately
      setWorkbooks(prev =>
        prev.map(wb =>
          wb.id === workbookId
            ? {
                ...wb,
                mappings: [...(wb.mappings || []), newMapping],
                _mappingsUpdateTimestamp: Date.now()
              }
            : wb
        )
      );
      
      // CRITICAL FIX: Update etbData IMMEDIATELY with new mapping to ensure cell highlighting works
      setEtbData(prev => {
        if (!prev) return prev;
        
        const updatedRows = prev.rows.map(row => {
          if (row.code === mappingDetails.destinationField) {
            return {
              ...row,
              mappings: [...(row.mappings || []), {
                ...newMapping,
                workbookId: {
                  _id: workbookId,
                  name: selectedWorkbook?.name || 'Unknown Workbook'
                }
              }]
            };
          }
          return row;
        });
        
        return {
          ...prev,
          rows: updatedRows,
          _updateTimestamp: Date.now() // Force re-render
        } as any;
      });
      
      console.log('🔄 WorkBookApp: Updated etbData IMMEDIATELY with new mapping for cell highlighting');
      
      // Refresh parent component data FIRST (ClassificationSection) if callback provided
      if (rowType !== 'evidence') {
        if (onRefreshData) {
          console.log('WorkBookApp: Calling parent refresh callback to update table');
          await onRefreshData();
          console.log('WorkBookApp: Parent refresh complete - table should now show updated linked files');
        } else {
          // Only refresh local data if no parent callback (standalone mode)
          console.log('WorkBookApp: No parent callback - refreshing local ETB data');
          await fetchETBData();
          console.log('WorkBookApp: Local ETB data refreshed');
        }
      }
      
      // CRITICAL FIX: Refresh mappings after creation to sync with backend
      await refreshWorkbookMappings(workbookId);
      setMappingsRefreshKey((prev) => prev + 1);
      
      toast({
        title: "Mapping Created",
        description: `Successfully mapped to ${mappingDetails.destinationField}`,
      });
      
      setPendingSelection(null);
      setRefreshWorkbooksTrigger((prev) => {
        const newValue = prev + 1;
        console.log('WorkBookApp: Incrementing refreshWorkbooksTrigger:', prev, '→', newValue);
        return newValue;
      });
    } catch (error) {
      console.error("Error in handleCreateMapping:", error);
      toast({
        title: "Mapping Creation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred while creating the mapping.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMapping = async (
    workbookId: string,
    mappingId: string,
    updatedMappingDetails: any
  ) => {
    try {
      if (!workbookId) {
        toast({
          title: "Error",
          description: "Workbook ID is missing.",
          variant: "destructive",
        });
        return;
      }

      const response = await db_WorkbookApi.updateMapping(
        workbookId,
        mappingId,
        updatedMappingDetails
      );

      if (response.success) {
        // ✅ Update workbooks list immediately
        setWorkbooks(prev =>
          prev.map(wb =>
            wb.id === workbookId
              ? {
                  ...wb,
                  mappings: wb.mappings?.filter(m => m._id !== mappingId) || [],
                  _mappingsUpdateTimestamp: Date.now()
                }
              : wb
          )
        );

        setMappings((prev) =>
          prev.map((m) =>
            m._id === mappingId ? { ...m, ...updatedMappingDetails } : m
          )
        );
        await refreshWorkbookMappings(workbookId);
        setMappingsRefreshKey((prev) => prev + 1);
        toast({
          title: "Mapping Updated",
          description: `Successfully updated mapping`,
        });
        setRefreshWorkbooksTrigger((prev) => prev + 1); // Refresh logs after a mapping is updated
      } else {
        toast({
          title: "Mapping Updation Failed",
          description: response.error || `Failed to update mapping.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleUpdateMapping:", error);
      toast({
        title: "Mapping Updation Failed",
        description: `An unexpected error occurred while updating the mapping.`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteMapping = async (workbookId: string, mappingId: string) => {
    try {
      if (!workbookId) {
        toast({
          title: "Error",
          description: "Workbook ID is missing.",
          variant: "destructive",
        });
        return;
      }

      const mappingToDelete = mappings.find((m) => m._id === mappingId);

      const response = await db_WorkbookApi.deleteMapping(
        workbookId,
        mappingId
      );

      if (response.success) {
        // CRITICAL FIX: Update selectedWorkbook IMMEDIATELY by removing the mapping
        if (selectedWorkbook && selectedWorkbook.id === workbookId) {
          const updatedWorkbook = {
            ...selectedWorkbook,
            mappings: selectedWorkbook.mappings?.filter(m => m._id !== mappingId) || [],
            _mappingsUpdateTimestamp: Date.now() // Force re-render
          };
          
          setSelectedWorkbook(updatedWorkbook);
          console.log('🔄 WorkBookApp: Removed mapping from selectedWorkbook IMMEDIATELY');
        }

        setMappings((prev) => prev.filter((m) => m._id !== mappingId));
        toast({
          title: "Mapping Deleted",
          description:
            `Successfully deleted mapping` +
            (mappingToDelete ? ` for ${mappingToDelete.destinationField}` : ""),
        });
        await refreshWorkbookMappings(workbookId);
        setMappingsRefreshKey((prev) => prev + 1);
        setRefreshWorkbooksTrigger((prev) => prev + 1); // Refresh logs after a mapping is deleted
      } else {
        toast({
          title: "Mapping Deletion Failed",
          description: response.error || `Failed to delete mapping.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleDeleteMapping:", error);
      toast({
        title: "Mapping Deletion Failed",
        description: `An unexpected error occurred while deleting the mapping.`,
        variant: "destructive",
      });
    }
  };

  const handleCreateNamedRange = async (
    workbookId: string,
    namedRangeDetails: { name: string; range: string }
  ) => {
    try {
      const response = await db_WorkbookApi.createNamedRange(
        workbookId,
        namedRangeDetails
      );

      if (response.success && response.data) {
        setNamedRanges((prev) => [...prev, response.data as NamedRange]);
        toast({
          title: "Named Range Created",
          description: `Successfully created named range: ${namedRangeDetails.name}`,
        });
        setRefreshWorkbooksTrigger((prev) => prev + 1); // Refresh logs
      } else {
        toast({
          title: "Named Range Creation Failed",
          description:
            response.error ||
            `Error creating named range: ${namedRangeDetails.name}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleCreateNamedRange:", error);
      toast({
        title: "Named Range Creation Failed",
        description: `An unexpected error occurred while creating named range: ${namedRangeDetails.name}.`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateNamedRange = async (
    workbookId: string,
    namedRangeId: string,
    updatedNamedRangeDetails: { name?: string; range?: string }
  ) => {
    try {
      const response = await db_WorkbookApi.updateNamedRange(
        workbookId,
        namedRangeId,
        updatedNamedRangeDetails
      );

      if (response.success) {
        setNamedRanges((prev) =>
          prev.map((nr) =>
            nr._id === namedRangeId
              ? { ...nr, ...updatedNamedRangeDetails }
              : nr
          )
        );
        toast({
          title: "Named Range Updated",
          description: `Successfully updated named range.`,
        });
        setRefreshWorkbooksTrigger((prev) => prev + 1); // Refresh logs
      } else {
        toast({
          title: "Named Range Updation Failed",
          description: response.error || `Failed to update named range.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleUpdateNamedRange:", error);
      toast({
        title: "Named Range Updation Failed",
        description: `An unexpected error occurred while updating the named range.`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteNamedRange = async (
    workbookId: string,
    namedRangeId: string
  ) => {
    try {
      const response = await db_WorkbookApi.deleteNamedRange(
        workbookId,
        namedRangeId
      );

      if (response.success) {
        setNamedRanges((prev) => prev.filter((nr) => nr._id !== namedRangeId));
        toast({
          title: "Named Range Deleted",
          description: `Successfully deleted named range.`,
        });
        setRefreshWorkbooksTrigger((prev) => prev + 1); // Refresh logs
      } else {
        toast({
          title: "Deletion Failed",
          description: response.error || `Failed to delete named range.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleDeleteNamedRange:", error);
      toast({
        title: "Deletion Failed",
        description: `An unexpected error occurred while deleting the named range.`,
        variant: "destructive",
      });
    }
  };

  // NEW: Handler for deleting a workbook
  const handleDeleteWorkbook = async (
    workbookId: string,
    workbookName: string
  ) => {
    try {
      const response = await db_WorkbookApi.deleteWorkbook(workbookId);

      if (response.success) {
        toast({
          title: "Workbook Deleted",
          description: `Successfully deleted workbook: ${workbookName}. All mappings, reference files, and notes have been removed.`,
        });
        
        // ✅ Refresh parent data (ETB/WorkingPaper/Evidence) to reflect deleted workbook
        if (onRefreshData) {
          try {
            await onRefreshData();
            console.log('WorkBookApp: Parent data refreshed after workbook deletion');
          } catch (refreshError) {
            console.warn('WorkBookApp: Failed to refresh parent data after workbook deletion:', refreshError);
          }
        }
        
        setRefreshWorkbooksTrigger((prev) => prev + 1); // Trigger re-fetch of workbooks AND logs
        if (selectedWorkbook?.id === workbookId) {
          setSelectedWorkbook(null);
          setCurrentView("dashboard");
        }
      } else {
        toast({
          title: "Workbook Deletion Failed",
          description:
            response.error || `Failed to delete workbook: ${workbookName}.`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error in handleDeleteWorkbook:", error);
      toast({
        title: "Workbook Deletion Failed",
        description: `An unexpected error occurred while deleting workbook: ${workbookName}. ${error.message || ""
          }`,
        variant: "destructive",
      });
    }
  };

  const handleCreateDatasetMapping = (datasetMapping: DatasetMapping) => {
    setDatasetMappings((prev) => [...prev, datasetMapping]);
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Created Dataset Mapping",
        details: `Mapped sheet ${datasetMapping.sheetName} to dataset ${datasetMapping.datasetName}`,
      },
    ]);
    toast({
      title: "Dataset Mapping Created",
      description: `Successfully mapped sheet to dataset`,
    });
  };

  const handleCreateWorkbookRule = (rule: WorkbookRule) => {
    setWorkbookRules((prev) => [...prev, rule]);
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Created Workbook Rule",
        details: `Created rule ${rule.name} for workbook`,
      },
    ]);
    toast({
      title: "Workbook Rule Created",
      description: `Successfully created workbook rule`,
    });
  };

  const handleUploadWorkbook = async (newWorkbookFromUploadModal: Workbook) => {
    // ✅ NEW WORKFLOW: After upload, navigate to dashboard (don't open workbook)
    // User can manually open the workbook from the dashboard if needed
    
    // Add the workbook to the list
    setWorkbooks((prev) => {
      const existingIndex = prev.findIndex(
        (wb: any) => wb.id === newWorkbookFromUploadModal.id
      );
      if (existingIndex > -1) {
        const updatedWorkbooks = [...prev];
        updatedWorkbooks[existingIndex] = newWorkbookFromUploadModal;
        return updatedWorkbooks;
      } else {
        return [...prev, newWorkbookFromUploadModal];
      }
    });

    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Uploaded Workbook",
        details: `Uploaded ${newWorkbookFromUploadModal.name} version ${newWorkbookFromUploadModal.version}`,
      },
    ]);

    toast({
      title: "Workbook Uploaded",
      description: `Successfully uploaded ${newWorkbookFromUploadModal.name}`,
    });

    // ✅ NEW WORKFLOW: Navigate to dashboard instead of opening the workbook
    setCurrentView("dashboard");
    
    // Clear selected workbook since we're not opening it
    setSelectedWorkbook(null);
    setViewerSelectedSheet(undefined);

    // ✅ Refresh workbook list to show the newly uploaded workbook
    // Use setTimeout to ensure navigation happens first
    setTimeout(() => {
      setRefreshWorkbooksTrigger((prev) => prev + 1);
    }, 100);

    // ✅ NEW: Dispatch event to notify ClassificationSection to refresh workbook list
    // This allows the Workbook tab to refresh in the background without switching tabs
    if (engagementId) {
      // Handle both id and _id (backend might return _id)
      const workbookId = newWorkbookFromUploadModal.id || (newWorkbookFromUploadModal as any)._id;
      const eventDetail = {
        workbookId: workbookId,
        workbookName: newWorkbookFromUploadModal.name,
        classification: classification,
        engagementId: engagementId,
        rowType: rowType,
        isUpload: true // Flag to indicate this is an upload, not a link
      };
      console.log('📣 WorkBookApp: Dispatching workbook-linked event for upload:', eventDetail);
      const event = new CustomEvent('workbook-linked', { detail: eventDetail });
      window.dispatchEvent(event);
    }
  };

  const handleUploadError = (message: string) => {
    toast({
      variant: "destructive",
      title: "Upload Failed",
      description: message,
    });
  };

  // ✅ NEW: Handler for sheet selection changes - saves preference
  const handleSheetChange = async (workbookId: string, sheetName: string) => {
    try {
      // Update local state immediately for responsive UI
      setViewerSelectedSheet(sheetName);
      
      // Save preference to backend (fire and forget - don't block UI)
      db_WorkbookApi.saveUserWorkbookPreference(workbookId, sheetName)
        .then((response) => {
          if (response.success) {
            console.log(`WorkBookApp: Saved sheet preference: ${sheetName} for workbook ${workbookId}`);
          } else {
            console.warn(`WorkBookApp: Failed to save sheet preference:`, response.error);
          }
        })
        .catch((error) => {
          console.error(`WorkBookApp: Error saving sheet preference:`, error);
        });
    } catch (error) {
      console.error('WorkBookApp: Error in handleSheetChange:', error);
    }
  };

  const handleReuploadWorkbook = (newWorkbook: Workbook) => {
    if (!selectedWorkbook) return;

    const updatedWorkbook = {
      ...selectedWorkbook,
      version: `v${parseInt(selectedWorkbook.version.replace("v", "")) + 1}`,
      lastModified: new Date().toISOString(),
      previousVersion: selectedWorkbook.version,
    };

    setWorkbooks((prev) =>
      prev.map((w) => (w.id === selectedWorkbook.id ? updatedWorkbook : w))
    );
    setSelectedWorkbook(updatedWorkbook);

    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Re-uploaded Workbook",
        details: `Re-uploaded ${updatedWorkbook.name} as version ${updatedWorkbook.version}`,
      },
    ]);

    toast({
      title: "Workbook Re-uploaded",
      description: `Successfully re-uploaded as version ${updatedWorkbook.version}`,
    });

    setCurrentView("version-comparison");
    setRefreshWorkbooksTrigger((prev) => prev + 1); // Trigger refresh after re-upload
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <MainDashboard
            workbooks={workbooks}
            onSelectWorkbook={handleSelectWorkbook}
            onUploadClick={() => setCurrentView("upload-modal")}
            onDeleteWorkbook={handleDeleteWorkbook} // Pass the new handler
            onViewHistoryClick={() => setCurrentView("history")} // NEW: Add prop
            allWorkbookLogs={allWorkbookLogs}
            isLoading={isLoadingAllWorkbookLogs}
            engagementId={engagementId}
            classification={classification}
            rowType={rowType} // ✅ Pass rowType to MainDashboard
            parentEtbData={etbData} // ✅ CRITICAL FIX: Pass parent's prepared data
          />
        );
      case "viewer":
        console.log("WorkBookApp: Rendering ExcelViewer:");
        console.log(
          "WorkBookApp: Current selectedWorkbook state:",
          selectedWorkbook
        );
        console.log("WorkBookApp: Current mappings state:", mappings);
        console.log("WorkBookApp: Current namedRanges state:", namedRanges);

        console.log("WorkBookApp: About to render ExcelViewer with props:", {
          engagementId,
          classification,
          selectedWorkbook: selectedWorkbook?.name
        });

        return selectedWorkbook ? (
          <ExcelViewer
          key={`${selectedWorkbook?.id}-${mappings.length}-${mappingsRefreshKey}-${viewerSelectedSheet}`}
            workbook={selectedWorkbook}
            mappingsRefreshKey={mappingsRefreshKey}
            setSelectedWorkbook={setSelectedWorkbook}
            mappings={mappings}
            namedRanges={namedRanges}
            onBack={() => setCurrentView("dashboard")}
            onLinkField={handleLinkFieldClick}
            onLinkSheet={() => setCurrentView("dataset-preview-modal")}
            onLinkWorkbook={() => setCurrentView("workbook-rules-modal")}
            onReupload={() => handleReuploadWorkbook(selectedWorkbook)}
            onViewAuditLog={() => setCurrentView("audit-log")}
            onCreateMapping={handleCreateMapping}
            onUpdateMapping={handleUpdateMapping}
            onDeleteMapping={handleDeleteMapping}
            onCreateNamedRange={handleCreateNamedRange}
            onUpdateNamedRange={handleUpdateNamedRange}
            onDeleteNamedRange={handleDeleteNamedRange}
            isLoadingWorkbookData={isLoadingWorkbookData}
            workingPaperCloudInfo={workingPaperCloudInfo}
            updateSheetsInWorkbook={updateSheetsInWorkbook}
            engagementId={engagementId}
            classification={classification}
            rowType={rowType}
            parentEtbData={etbData} // ✅ CRITICAL FIX: Pass parent's etbData to avoid re-fetching
            onRefreshETBData={fetchETBData} // ✅ Pass refresh function
            onRefreshMappings={refreshWorkbookMappings} // ✅ NEW: Pass mappings refresh function
            onRefreshParentData={onRefreshData}
            onEvidenceMappingUpdated={onEvidenceMappingUpdated}
            onSheetChange={handleSheetChange} // ✅ NEW: Pass sheet change handler
            initialSheet={viewerSelectedSheet} // ✅ NEW: Pass initial sheet from saved preference
          />
        ) : null;
      case "audit-log":
        return (
          <AuditLog
            auditLogs={auditLogs}
            workbook={selectedWorkbook}
            onBack={() => setCurrentView("viewer")}
          />
        );
      case "upload-modal":
        return (
          <UploadModal
            onClose={() => setCurrentView("dashboard")}
            onUploadSuccess={handleUploadWorkbook}
            onError={handleUploadError}
            engagementId={engagementId}
            classification={classification}
            rowType={rowType} // ✅ CRITICAL FIX: Pass rowType to tag uploads with category
          />
        );
      case "link-field-modal":
        return (
          <LinkToFieldModal
            workbook={selectedWorkbook}
            onClose={() => setCurrentView("viewer")}
            selection={pendingSelection}
            onLink={handleCreateMapping}
            etbData={etbData}
            etbLoading={etbLoading}
            etbError={etbError}
            onRefreshETBData={fetchETBData}
            rowType={rowType} // ✅ CRITICAL: Pass rowType for contextual UI
          />
        );
      case "dataset-preview-modal":
        return (
          <DatasetPreviewModal
            workbook={selectedWorkbook}
            onClose={() => setCurrentView("viewer")}
            onLink={handleCreateDatasetMapping}
          />
        );
      case "workbook-rules-modal":
        return (
          <WorkbookRulesModal
            workbook={selectedWorkbook}
            onClose={() => setCurrentView("viewer")}
            onLink={handleCreateWorkbookRule}
          />
        );
      case "version-comparison":
        return (
          <VersionComparison
            workbook={selectedWorkbook}
            onBack={() => setCurrentView("viewer")}
            onUploadSuccess={() => setCurrentView("viewer")}
          />
        );
      case "history": // NEW: Render WorkbookHistory
        return (
          <WorkbookHistory
            allWorkbookLogs={allWorkbookLogs}
            isLoading={isLoadingAllWorkbookLogs}
            onBack={() => setCurrentView("dashboard")}
          />
        );
      default:
        return (
          <MainDashboard
            workbooks={workbooks}
            onSelectWorkbook={handleSelectWorkbook}
            onUploadClick={() => setCurrentView("upload-modal")}
            onDeleteWorkbook={handleDeleteWorkbook} // Pass the new handler
            onViewHistoryClick={() => setCurrentView("history")} // NEW: Add prop
            allWorkbookLogs={allWorkbookLogs}
            isLoading={isLoadingAllWorkbookLogs}
            engagementId={engagementId}
            classification={classification}
            rowType={rowType} // ✅ CRITICAL FIX: Pass rowType to MainDashboard in default case!
            parentEtbData={etbData} // ✅ CRITICAL FIX: Pass parent's prepared data
          />
        );
    }
  };

  if (
    isLoadingWorkbooks ||
    isLoadingAllWorkbookLogs ||
    isUploadingWorkingPaper ||
    isUpdatingSheets
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <span className="ml-3 text-lg text-gray-700">
          {isUploadingWorkingPaper
            ? "Loading Working Paper..."
            : isUpdatingSheets
              ? "Updating Sheets..."
              : "Loading Workbooks..."}
        </span>
      </div>
    );
  }

  if (isLoadingWorkbookData) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-gray-50 rounded-lg border-none">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-2 text-gray-700">Loading sheet data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground">
      {renderView()}
      <Toaster />
    </div>
  );
}
