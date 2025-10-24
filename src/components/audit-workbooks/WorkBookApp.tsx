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
import { ExcelViewerWithFullscreen } from "@/components/audit-workbooks/ExcelViewer";
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
  engagement,
  engagementId,
  classification,
}: {
  engagement: any;
  engagementId: string;
  classification: string;
}) {
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
  const [allWorkbookLogs, setAllWorkbookLogs] = useState<AuditLogEntry[]>([]); // NEW STATE for all logs
  const [isLoadingAllWorkbookLogs, setIsLoadingAllWorkbookLogs] =
    useState(false); // NEW STATE for logs loading
  const [workingPaperCloudInfo, setWorkingPaperCloudInfo] = useState(null);
  const [hasAttemptedWorkingPaperUpload, setHasAttemptedWorkingPaperUpload] =
    useState(false);
  const [isUploadingWorkingPaper, setIsUploadingWorkingPaper] = useState(false);

  const { toast } = useToast();

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

  useEffect(() => {
    if (selectedWorkbook) {
      // Set namedRanges from selectedWorkbook if they exist
      if (
        selectedWorkbook.namedRanges &&
        Array.isArray(selectedWorkbook.namedRanges)
      ) {
        setNamedRanges(selectedWorkbook.namedRanges);
      } else {
        setNamedRanges([]);
      }

      // Set mappings from selectedWorkbook if they exist
      if (
        selectedWorkbook.mappings &&
        Array.isArray(selectedWorkbook.mappings)
      ) {
        setMappings(selectedWorkbook.mappings);
      } else {
        setMappings([]);
      }
    } else {
      // Reset when no workbook is selected
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

      // 3. For each sheet, read its data
      for (const sheetName of sheetNames) {
        const readSheetResponse = await msDriveworkbookApi.readSheet(
          cloudFileId,
          sheetName
        );
        if (!readSheetResponse.success) {
          console.warn(
            `Failed to read data for sheet '${sheetName}'. Skipping.`
          );
          processedFileData[sheetName] = [["Error reading sheet"]]; // Placeholder for error
        } else {
          // --- MODIFIED LOGIC START ---
          const { values: rawSheetData, address } = readSheetResponse.data; // Destructure values and address

          // Parse the address to get the starting row and column
          const {
            start: { row: startExcelRow, col: startZeroCol },
          } = parseExcelRange(address || `${sheetName}!A1`);

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
          processedFileData[sheetName] = excelLikeData;
          // --- MODIFIED LOGIC END ---
        }
      }

      // --- NEW STEP: Save the processed workbook metadata and sheet data to our MongoDB ---
      const workbookMetadataForDB = {
        cloudFileId,
        name: "Working Paper",
        webUrl: workingPaperCloudInfo.url,
        engagementId: engagementId,
        classification: classification,
        uploadedDate: new Date().toISOString(),
        version: "v1", // You might have a better versioning strategy
        uploadedBy: user?.id,
        lastModifiedBy: user?.id,
      };

      console.log(processedFileData);
      console.log(workbookMetadataForDB);

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
  const fetchWorkbooks = useCallback(async () => {
    setIsLoadingWorkbooks(true);
    try {
      const response = await db_WorkbookApi.listWorkbooks(
        engagementId,
        classification
      );

      if (response.success && response.data) {
        const fetchedWorkbooks: Workbook[] = response.data.map((item: any) => ({
          id: item._id || item.id,
          cloudFileId: item.cloudFileId,
          name: item.name,
          webUrl: item.webUrl,
          uploadedDate: item.uploadedDate
            ? new Date(item.uploadedDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
          version: item.version || "v1",
          lastModified: item.lastModifiedDate,
          lastModifiedBy: item.lastModifiedBy,
          classification: item.classification,
          engagementId: item.engagementId,
          fileData: {},
        }));
        setWorkbooks(fetchedWorkbooks);
        return fetchedWorkbooks; // Return the fetched workbooks for the next step
      } else {
        toast({
          variant: "destructive",
          title: "Error fetching workbooks",
          description:
            response.error || "Failed to load workbooks from the server.",
        });
        return [];
      }
    } catch (error: any) {
      console.error("Failed to fetch workbooks:", error);
      toast({
        variant: "destructive",
        title: "Error fetching workbooks",
        description: `An unexpected error occurred: ${error.message || error}`,
      });
      return [];
    } finally {
      setIsLoadingWorkbooks(false);
    }
  }, [engagementId, classification, toast]);

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
                      ? `Workbook: ${log.details.name}, Version: ${
                          log.version || "N/A"
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
                      ? `Workbook: ${log.details.name}, Version: ${
                          log.version || "N/A"
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
          description: `Failed to load workbook history: ${
            error instanceof Error ? error.message : "Unknown error."
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
      fetchWorkbooks();
    }
  }, [engagementId, classification, fetchWorkbooks, refreshWorkbooksTrigger]); // Add refreshWorkbooksTrigger here

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
        fullWorkbookFromDB.sheets.forEach((sheet) => {
          fetchedFileData[sheet.name] = sheet.data;
          sheetNamesToProcess.push(sheet.name);
        });
      } else {
        console.warn(
          `No sheets found or populated for workbook ID: ${workbook.id}`
        );
      }

      const updatedWorkbook = {
        ...workbook,
        fileData: fetchedFileData,
        namedRanges: fullWorkbookFromDB.namedRanges || [],
        mappings: fullWorkbookFromDB.mappings || [],
      };

      setWorkbooks((prev) =>
        prev.map((wb) => (wb.id === workbook.id ? updatedWorkbook : wb))
      );

      setSelectedWorkbook(updatedWorkbook);

      if (sheetNamesToProcess.length > 0) {
        setViewerSelectedSheet(sheetNamesToProcess[0]);
      } else {
        setViewerSelectedSheet("Sheet1");
      }

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

      setCurrentView("viewer");
    } catch (error) {
      console.error("Error fetching workbook sheets:", error);
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: `Failed to load data for ${workbook.name}: ${
          error instanceof Error ? error.message : "Unknown error."
        }`,
      });
    } finally {
      setIsLoadingWorkbookData(false);
    }
  };

  const updateSheetsInWorkbook = async (
    cloudFileId: string,
    workbookId: string
  ) => {
    try {
      // 2. After successful upload, fetch the sheet names from the uploaded workbook (from the cloud storage not from the db backend)
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

      // 3. For each sheet, read its data
      for (const sheetName of sheetNames) {
        const readSheetResponse = await msDriveworkbookApi.readSheet(
          cloudFileId,
          sheetName
        );
        if (!readSheetResponse.success) {
          console.warn(
            `Failed to read data for sheet '${sheetName}'. Skipping.`
          );
          processedFileData[sheetName] = [["Error reading sheet"]]; // Placeholder for error
        } else {
          // --- MODIFIED LOGIC START ---
          const { values: rawSheetData, address } = readSheetResponse.data; // Destructure values and address

          // Parse the address to get the starting row and column
          const {
            start: { row: startExcelRow, col: startZeroCol },
          } = parseExcelRange(address || `${sheetName}!A1`);

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
          processedFileData[sheetName] = excelLikeData;
          // --- MODIFIED LOGIC END ---
        }
      }

      // --- NEW STEP: update the sheets by workbookId  ---

      console.log(processedFileData);

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

      // The backend should return the full Workbook object (with _id, populated sheets if needed)
      // from the database, which you can then pass to onUploadSuccess.
      const newWorkbookFromDB = updatedSheetsResponse.data.workbook;

      // Ensure fileData is populated for frontend display immediately
      newWorkbookFromDB.fileData = processedFileData;

      setSelectedWorkbook(newWorkbookFromDB);
      if (
        newWorkbookFromDB.fileData &&
        Object.keys(newWorkbookFromDB.fileData).length > 0
      ) {
        setViewerSelectedSheet(Object.keys(newWorkbookFromDB.fileData)[0]);
      } else {
        setViewerSelectedSheet("Sheet1");
      }

      setCurrentView("viewer");
      setRefreshWorkbooksTrigger((prev) => prev + 1); // Trigger refresh after upload
    } catch (error) {
      console.log(error);
      toast({
        title: "Sheets Reload Failed",
        description: `Failed to reload sheets`,
        variant: "destructive",
      });
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
    try {
      if (!workbookId) {
        toast({
          title: "Error",
          description: "Workbook ID is missing.",
          variant: "destructive",
        });
        return;
      }

      const response = await db_WorkbookApi.createMapping(
        workbookId,
        mappingDetails
      );

      if (response.success && response.data) {
        setMappings((prev) => [...prev, response.data as Mapping]);
        toast({
          title: "Mapping Created",
          description: `Successfully mapped to ${response.data.destinationField}`,
        });
        setPendingSelection(null);
        setRefreshWorkbooksTrigger((prev) => prev + 1); // Refresh logs after a mapping is created
      } else {
        toast({
          title: "Mapping Creation Failed",
          description:
            response.error ||
            `Error creating mapping for destination: ${mappingDetails.destinationField}.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error in handleCreateMapping:", error);
      toast({
        title: "Mapping Creation Failed",
        description: `An unexpected error occurred while creating the mapping.`,
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
        setMappings((prev) =>
          prev.map((m) =>
            m._id === mappingId ? { ...m, ...updatedMappingDetails } : m
          )
        );
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
        setMappings((prev) => prev.filter((m) => m._id !== mappingId));
        toast({
          title: "Mapping Deleted",
          description:
            `Successfully deleted mapping` +
            (mappingToDelete ? ` for ${mappingToDelete.destinationField}` : ""),
        });
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
          description: `Successfully deleted workbook: ${workbookName}.`,
        });
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
        description: `An unexpected error occurred while deleting workbook: ${workbookName}. ${
          error.message || ""
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

  const handleUploadWorkbook = (newWorkbookFromUploadModal: Workbook) => {
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

    setCurrentView("viewer");
    setRefreshWorkbooksTrigger((prev) => prev + 1); // Trigger refresh after upload
  };

  const handleUploadError = (message: string) => {
    toast({
      variant: "destructive",
      title: "Upload Failed",
      description: message,
    });
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

        return selectedWorkbook ? (
          <ExcelViewerWithFullscreen
            workbook={selectedWorkbook}
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
            selectedSheet={viewerSelectedSheet}
            setSelectedSheet={setViewerSelectedSheet}
            workingPaperCloudInfo={workingPaperCloudInfo}
            updateSheetsInWorkbook={updateSheetsInWorkbook}
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
          />
        );
      case "link-field-modal":
        return (
          <LinkToFieldModal
            workbook={selectedWorkbook}
            onClose={() => setCurrentView("viewer")}
            selection={pendingSelection}
            onLink={handleCreateMapping}
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
          />
        );
    }
  };

  if (
    isLoadingWorkbooks ||
    isLoadingAllWorkbookLogs ||
    isUploadingWorkingPaper
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <span className="ml-3 text-lg text-gray-700">
          {isUploadingWorkingPaper
            ? "Loading Working Paper..."
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
