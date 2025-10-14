// import React, { useState, useEffect } from "react";
// import { MainDashboard } from "@/components/audit-workbooks/MainDashboard";
// import { ExcelViewer } from "@/components/audit-workbooks/ExcelViewer";
// import { AuditLog } from "@/components/audit-workbooks/AuditLog";
// import { UploadModal } from "@/components/audit-workbooks/UploadModal";
// import { LinkToFieldModal } from "@/components/audit-workbooks/LinkToFieldModal";
// import { DatasetPreviewModal } from "@/components/audit-workbooks/DatasetPreviewModal";
// import { WorkbookRulesModal } from "@/components/audit-workbooks/WorkbookRulesModal";
// import { VersionComparison } from "@/components/audit-workbooks/VersionComparison";
// import {
//   Workbook,
//   Selection,
//   Mapping,
//   DatasetMapping,
//   WorkbookRule,
//   AuditLogEntry,
// } from "../../types/audit-workbooks/types";
// import { Toaster } from "@/components/ui/toaster";
// import { useToast } from "@/hooks/use-toast";
// import { ExcelViewerWithFullscreen } from "@/components/audit-workbooks/ExcelViewer";

// type View =
//   | "dashboard"
//   | "viewer"
//   | "audit-log"
//   | "upload-modal"
//   | "link-field-modal"
//   | "dataset-preview-modal"
//   | "workbook-rules-modal"
//   | "version-comparison";

// // --- MOCK DATA ---
// // This data mimics the structure that SheetJS would produce after parsing an Excel file.
// const mockWorkbooks: Workbook[] = [
//   {
//     id: "1",
//     name: "FY2023_Financial_Statements.xlsx",
//     uploadedDate: "2023-10-26",
//     version: "v2",
//     lastModified: "2023-10-27T10:00:00Z",
//     lastModifiedBy: "Alice",
//     fileData: {
//       "Balance Sheet": [
//         ["", "A", "B", "C", "D"],
//         ["1", "Assets", "Q1 2023", "Q2 2023", "Q3 2023"],
//         ["2", "Current Assets", "150,000", "165,000", "180,000"],
//         ["3", "Cash", "50,000", "55,000", "60,000"],
//         ["4", "Accounts Receivable", "100,000", "110,000", "120,000"],
//         ["5", "Inventory", "75,000", "80,000", "85,000"],
//         ["6", "Prepaid Expenses", "10,000", "12,000", "14,000"],
//         ["7", "Total Current Assets", "235,000", "257,000", "279,000"],
//         ["8", "Property, Plant & Equipment", "250,000", "260,000", "270,000"],
//         ["9", "Intangible Assets", "50,000", "52,000", "54,000"],
//         ["10", "Investments", "40,000", "45,000", "50,000"],
//         ["11", "Deferred Tax Asset", "10,000", "9,500", "9,000"],
//         ["12", "Total Non-Current Assets", "350,000", "366,500", "383,000"],
//         ["13", "Total Assets", "585,000", "623,500", "662,000"],
//         ["14", "Liabilities", "", "", ""],
//         ["15", "Accounts Payable", "70,000", "72,000", "75,000"],
//         ["16", "Accrued Expenses", "25,000", "26,000", "28,000"],
//         ["17", "Long-Term Debt", "150,000", "160,000", "165,000"],
//         ["18", "Total Liabilities", "245,000", "258,000", "268,000"],
//         ["19", "Equity", "", "", ""],
//         ["20", "Total Equity", "340,000", "365,500", "394,000"],
//       ],
//       "Income Statement": [
//         ["", "A", "B", "C"],
//         ["1", "Revenue", "200,000", "220,000"],
//         ["2", "Cost of Goods Sold", "-80,000", "-88,000"],
//         ["3", "Gross Profit", "120,000", "132,000"],
//         ["4", "Operating Expenses", "-70,000", "-75,000"],
//         ["5", "Operating Income", "50,000", "57,000"],
//         ["6", "Interest Expense", "-5,000", "-6,000"],
//         ["7", "Other Income", "2,000", "3,000"],
//         ["8", "Earnings Before Tax", "47,000", "54,000"],
//         ["9", "Income Tax Expense", "-12,000", "-14,000"],
//         ["10", "Net Income", "35,000", "40,000"],
//         ["11", "Depreciation Expense", "-8,000", "-8,500"],
//         ["12", "EBITDA", "58,000", "62,500"],
//         ["13", "R&D Expense", "-5,000", "-6,000"],
//         ["14", "Sales & Marketing", "-15,000", "-17,000"],
//         ["15", "Administrative Expense", "-10,000", "-11,000"],
//         ["16", "Total Expenses", "-118,000", "-126,500"],
//         ["17", "Operating Margin (%)", "25%", "26%"],
//         ["18", "Tax Rate (%)", "25%", "26%"],
//         ["19", "Earnings per Share", "1.75", "2.00"],
//         ["20", "Dividends Paid", "15,000", "17,000"],
//       ],
//     },
//   },
//   {
//     id: "2",
//     name: "Q4_Sales_Report_Regional.xlsx",
//     uploadedDate: "2023-10-25",
//     version: "v1",
//     lastModifiedBy: "Bob",
//     fileData: {
//       "Sales Data": [
//         ["", "A", "B", "C", "D", "E"],
//         ["1", "Region", "Product A", "Product B", "Product C", "Total Sales"],
//         ["2", "North", "15,000", "18,000", "22,000", "55,000"],
//         ["3", "South", "12,000", "14,000", "16,000", "42,000"],
//         ["4", "East", "18,000", "20,000", "25,000", "63,000"],
//         ["5", "West", "10,000", "11,000", "13,000", "34,000"],
//         ["6", "Central", "9,000", "9,500", "10,000", "28,500"],
//         ["7", "Northeast", "8,500", "9,000", "9,500", "27,000"],
//         ["8", "Southeast", "14,000", "15,000", "17,000", "46,000"],
//         ["9", "Northwest", "11,000", "12,500", "13,000", "36,500"],
//         ["10", "Southwest", "9,500", "10,000", "10,500", "30,000"],
//         ["11", "Metro", "25,000", "26,000", "28,000", "79,000"],
//         ["12", "Rural", "6,000", "7,000", "8,000", "21,000"],
//         ["13", "Online", "30,000", "32,000", "35,000", "97,000"],
//         ["14", "International", "40,000", "42,000", "45,000", "127,000"],
//         ["15", "Exports", "22,000", "25,000", "27,000", "74,000"],
//         ["16", "Imports", "5,000", "5,500", "6,000", "16,500"],
//         ["17", "Promotional Sales", "3,000", "4,000", "5,000", "12,000"],
//         ["18", "Seasonal Sales", "6,000", "7,500", "9,000", "22,500"],
//         ["19", "Wholesale", "12,000", "14,000", "15,500", "41,500"],
//         ["20", "Grand Total", "285,000", "309,000", "335,000", "929,000"],
//       ],
//     },
//   },
//   {
//     id: "3",
//     name: "Employee_List_HR.xlsx",
//     uploadedDate: "2023-09-15",
//     version: "v3",
//     lastModifiedBy: "Charlie",
//     fileData: {
//       Employees: [
//         ["", "A", "B", "C", "D"],
//         ["1", "Employee ID", "Full Name", "Department", "Hire Date"],
//         ["2", "E001", "John Doe", "Engineering", "2021-05-20"],
//         ["3", "E002", "Jane Smith", "Marketing", "2020-08-15"],
//         ["4", "E003", "Peter Jones", "Engineering", "2022-01-10"],
//         ["5", "E004", "Mary Williams", "Human Resources", "2019-11-30"],
//         ["6", "E005", "David Brown", "Sales", "2022-03-22"],
//         ["7", "E006", "Nancy Johnson", "Finance", "2021-07-10"],
//         ["8", "E007", "Robert Miller", "Engineering", "2020-02-19"],
//         ["9", "E008", "Patricia Davis", "Legal", "2019-06-15"],
//         ["10", "E009", "James Wilson", "IT", "2023-01-05"],
//         ["11", "E010", "Linda Martinez", "Design", "2021-12-12"],
//         ["12", "E011", "Michael Taylor", "Sales", "2020-05-01"],
//         ["13", "E012", "Barbara Anderson", "Engineering", "2022-09-20"],
//         ["14", "E013", "William Thomas", "Finance", "2021-03-14"],
//         ["15", "E014", "Elizabeth Jackson", "Marketing", "2023-02-10"],
//         ["16", "E015", "Christopher White", "Engineering", "2020-10-05"],
//         ["17", "E016", "Jennifer Harris", "Legal", "2019-08-25"],
//         ["18", "E017", "Charles Martin", "IT", "2021-04-18"],
//         ["19", "E018", "Susan Thompson", "Human Resources", "2022-11-22"],
//         ["20", "E019", "Thomas Garcia", "Engineering", "2020-09-09"],
//       ],
//     },
//   },
// ];

// // You can also add some initial mock mappings, dataset mappings, and rules
// const mockMappings: Mapping[] = [
//   {
//     id: "m1",
//     sheet: "Balance Sheet",
//     start: { row: 2, col: 1 },
//     end: { row: 2, col: 3 },
//     destinationField: "current_assets_q3",
//     transform: "sum",
//     color: "bg-blue-200",
//   },
// ];

// const mockAuditLogs: AuditLogEntry[] = [
//   {
//     id: "log1",
//     timestamp: new Date("2023-10-27T09:30:00Z").toISOString(),
//     user: "Alice",
//     action: "Uploaded Workbook",
//     details: "Uploaded FY2023_Financial_Statements.xlsx as v2",
//   },
//   {
//     id: "log2",
//     timestamp: new Date("2023-10-27T09:35:00Z").toISOString(),
//     user: "Alice",
//     action: "Created Mapping",
//     details: "Mapped Balance Sheet!B2:D2 to current_assets_q3",
//   },
// ];

// export default function App() {
//   // --- INITIALIZE STATE WITH MOCK DATA ---
//   const [currentView, setCurrentView] = useState<View>("dashboard");
//   const [selectedWorkbook, setSelectedWorkbook] = useState<Workbook | null>(
//     mockWorkbooks[0] || null
//   ); // Select the first workbook by default
//   const [pendingSelection, setPendingSelection] = useState<Selection | null>(
//     null
//   );
//   const [workbooks, setWorkbooks] = useState<Workbook[]>(mockWorkbooks); // Initialize with mock data
//   const [mappings, setMappings] = useState<Mapping[]>(mockMappings); // Initialize with mock mappings
//   const [datasetMappings, setDatasetMappings] = useState<DatasetMapping[]>([]);
//   const [workbookRules, setWorkbookRules] = useState<WorkbookRule[]>([]);
//   const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(mockAuditLogs); // Initialize with mock logs
//   const { toast } = useToast();

//   const handleSelectWorkbook = (workbook: Workbook) => {
//     setSelectedWorkbook(workbook);
//     setCurrentView("viewer");
//   };

//   const handleLinkFieldClick = (selection: Selection) => {
//     setPendingSelection(selection);
//     setCurrentView("link-field-modal");
//   };

//   const handleCreateMapping = (mapping: Mapping) => {
//     setMappings((prev) => [...prev, mapping]);
//     setAuditLogs((prev) => [
//       ...prev,
//       {
//         id: Date.now().toString(),
//         timestamp: new Date().toISOString(),
//         user: "Current User",
//         action: "Created Mapping",
//         details: `Mapped ${mapping.sheet}!${mapping.start.row}:${mapping.start.col} to ${mapping.destinationField}`,
//       },
//     ]);
//     toast({
//       title: "Mapping Created",
//       description: `Successfully mapped to ${mapping.destinationField}`,
//     });
//     setPendingSelection(null);
//   };

//   const handleCreateDatasetMapping = (datasetMapping: DatasetMapping) => {
//     setDatasetMappings((prev) => [...prev, datasetMapping]);
//     setAuditLogs((prev) => [
//       ...prev,
//       {
//         id: Date.now().toString(),
//         timestamp: new Date().toISOString(),
//         user: "Current User",
//         action: "Created Dataset Mapping",
//         details: `Mapped sheet ${datasetMapping.sheetName} to dataset ${datasetMapping.datasetName}`,
//       },
//     ]);
//     toast({
//       title: "Dataset Mapping Created",
//       description: `Successfully mapped sheet to dataset`,
//     });
//   };

//   const handleCreateWorkbookRule = (rule: WorkbookRule) => {
//     setWorkbookRules((prev) => [...prev, rule]);
//     setAuditLogs((prev) => [
//       ...prev,
//       {
//         id: Date.now().toString(),
//         timestamp: new Date().toISOString(),
//         user: "Current User",
//         action: "Created Workbook Rule",
//         details: `Created rule ${rule.name} for workbook`,
//       },
//     ]);
//     toast({
//       title: "Workbook Rule Created",
//       description: `Successfully created workbook rule`,
//     });
//   };

//   const handleUploadWorkbook = (workbook: Workbook) => {
//     // 1. Add the new workbook to the list
//     setWorkbooks((prev) => [...prev, workbook]);

//     // 2. Add an audit log for the upload
//     setAuditLogs((prev) => [
//       ...prev,
//       {
//         id: Date.now().toString(),
//         timestamp: new Date().toISOString(),
//         user: "Current User",
//         action: "Uploaded Workbook",
//         details: `Uploaded ${workbook.name} version ${workbook.version}`,
//       },
//     ]);

//     // 3. Show a success toast
//     toast({
//       title: "Workbook Uploaded",
//       description: `Successfully uploaded ${workbook.name}`,
//     });

//     // 4. Select the new workbook and navigate to the viewer
//     setSelectedWorkbook(workbook);
//     setCurrentView("viewer");
//   };

//   const handleUploadError = (message: string) => {
//     toast({
//       variant: "destructive",
//       title: "Upload Failed",
//       description: message,
//     });
//   };

//   const handleReuploadWorkbook = (newWorkbook: Workbook) => {
//     if (!selectedWorkbook) return;

//     const updatedWorkbook = {
//       ...selectedWorkbook,
//       version: `v${parseInt(selectedWorkbook.version.replace("v", "")) + 1}`,
//       lastModified: new Date().toISOString(),
//       previousVersion: selectedWorkbook.version,
//     };

//     setWorkbooks((prev) =>
//       prev.map((w) => (w.id === selectedWorkbook.id ? updatedWorkbook : w))
//     );
//     setSelectedWorkbook(updatedWorkbook);

//     setAuditLogs((prev) => [
//       ...prev,
//       {
//         id: Date.now().toString(),
//         timestamp: new Date().toISOString(),
//         user: "Current User",
//         action: "Re-uploaded Workbook",
//         details: `Re-uploaded ${updatedWorkbook.name} as version ${updatedWorkbook.version}`,
//       },
//     ]);

//     toast({
//       title: "Workbook Re-uploaded",
//       description: `Successfully re-uploaded as version ${updatedWorkbook.version}`,
//     });

//     setCurrentView("version-comparison");
//   };

//   const renderView = () => {
//     switch (currentView) {
//       case "dashboard":
//         return (
//           <MainDashboard
//             workbooks={workbooks}
//             onSelectWorkbook={handleSelectWorkbook}
//             onUploadClick={() => setCurrentView("upload-modal")}
//           />
//         );
//       case "viewer":
//         return selectedWorkbook ? (
//           <ExcelViewerWithFullscreen
//             workbook={selectedWorkbook}
//             mappings={mappings}
//             onBack={() => setCurrentView("dashboard")}
//             onLinkField={handleLinkFieldClick}
//             onLinkSheet={() => setCurrentView("dataset-preview-modal")}
//             onLinkWorkbook={() => setCurrentView("workbook-rules-modal")}
//             onReupload={() => handleReuploadWorkbook(selectedWorkbook)}
//             onViewAuditLog={() => setCurrentView("audit-log")}
//           />
//         ) : null;
//       case "audit-log":
//         return (
//           <AuditLog
//             auditLogs={auditLogs}
//             workbook={selectedWorkbook}
//             onBack={() => setCurrentView("viewer")}
//           />
//         );
//       case "upload-modal":
//         return (
//           <UploadModal
//             onClose={() => setCurrentView("dashboard")}
//             onUploadSuccess={handleUploadWorkbook}
//             onError={handleUploadError}
//           />
//         );
//       case "link-field-modal":
//         return (
//           <LinkToFieldModal
//             onClose={() => setCurrentView("viewer")}
//             selection={pendingSelection}
//             onLink={handleCreateMapping}
//           />
//         );
//       case "dataset-preview-modal":
//         return (
//           <DatasetPreviewModal
//             workbook={selectedWorkbook}
//             onClose={() => setCurrentView("viewer")}
//             onLink={handleCreateDatasetMapping}
//           />
//         );
//       case "workbook-rules-modal":
//         return (
//           <WorkbookRulesModal
//             workbook={selectedWorkbook}
//             onClose={() => setCurrentView("viewer")}
//             onLink={handleCreateWorkbookRule}
//           />
//         );
//       case "version-comparison":
//         return (
//           <VersionComparison
//             workbook={selectedWorkbook}
//             onBack={() => setCurrentView("viewer")}
//             onUploadSuccess={() => setCurrentView("viewer")}
//           />
//         );
//       default:
//         return (
//           <MainDashboard
//             workbooks={workbooks}
//             onSelectWorkbook={handleSelectWorkbook}
//             onUploadClick={() => setCurrentView("upload-modal")}
//           />
//         );
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 text-foreground">
//       {renderView()}
//       <Toaster />
//     </div>
//   );
// }






// // #########################################################################################################





import React, { useState, useEffect } from "react";
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
} from "../../types/audit-workbooks/types";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { ExcelViewerWithFullscreen } from "@/components/audit-workbooks/ExcelViewer";

type View =
  | "dashboard"
  | "viewer"
  | "audit-log"
  | "upload-modal"
  | "link-field-modal"
  | "dataset-preview-modal"
  | "workbook-rules-modal"
  | "version-comparison";

// --- MOCK DATA ---
// This data mimics the structure that SheetJS would produce after parsing an Excel file.
const mockWorkbooks: Workbook[] = [
  {
    id: "1",
    name: "FY2023_Financial_Statements.xlsx",
    uploadedDate: "2023-10-26",
    version: "v2",
    lastModified: "2023-10-27T10:00:00Z",
    lastModifiedBy: "Alice",
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
        ["11", "E010", "Linda Martinez", "Design", "2021-12-12"],
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

// You can also add some initial mock mappings, dataset mappings, rules, and named ranges
const mockMappings: Mapping[] = [
  {
    id: "m1",
    sheet: "Balance Sheet",
    start: { row: 2, col: 1 },
    end: { row: 2, col: 3 },
    destinationField: "current_assets_q3",
    transform: "sum",
    color: "bg-blue-200",
  },
];

const mockNamedRanges: NamedRange[] = [
  { id: "nr1", name: "ppe_values", range: "Balance Sheet!B8:D8" },
  { id: "nr2", name: "total_assets", range: "Balance Sheet!B1:D1" },
  { id: "nr3", name: "revenue_data", range: "Income Statement!B1:C1" },
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

export default function WorkBookApp() {
  // --- INITIALIZE STATE WITH MOCK DATA ---
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedWorkbook, setSelectedWorkbook] = useState<Workbook | null>(
    mockWorkbooks[0] || null
  ); // Select the first workbook by default
  const [pendingSelection, setPendingSelection] = useState<Selection | null>(
    null
  );
  const [workbooks, setWorkbooks] = useState<Workbook[]>(mockWorkbooks); // Initialize with mock data
  const [mappings, setMappings] = useState<Mapping[]>(mockMappings); // Initialize with mock mappings
  const [namedRanges, setNamedRanges] = useState<NamedRange[]>(mockNamedRanges); // Initialize with mock named ranges
  const [datasetMappings, setDatasetMappings] = useState<DatasetMapping[]>([]);
  const [workbookRules, setWorkbookRules] = useState<WorkbookRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(mockAuditLogs); // Initialize with mock logs
  const { toast } = useToast();

  const handleSelectWorkbook = (workbook: Workbook) => {
    setSelectedWorkbook(workbook);
    setCurrentView("viewer");
  };

  const handleLinkFieldClick = (selection: Selection) => {
    setPendingSelection(selection);
    setCurrentView("link-field-modal");
  };

  const handleCreateMapping = (mapping: Mapping) => {
    setMappings((prev) => [...prev, mapping]);
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Created Mapping",
        details: `Mapped ${mapping.sheet}!${mapping.start.row}:${mapping.start.col} to ${mapping.destinationField}`,
      },
    ]);
    toast({
      title: "Mapping Created",
      description: `Successfully mapped to ${mapping.destinationField}`,
    });
    setPendingSelection(null);
  };

  const handleUpdateMapping = (id: string, updatedMapping: Partial<Mapping>) => {
    setMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updatedMapping } : m))
    );
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Updated Mapping",
        details: `Updated mapping for ${updatedMapping.destinationField || "unknown field"}`,
      },
    ]);
    toast({
      title: "Mapping Updated",
      description: `Successfully updated mapping`,
    });
  };

  const handleDeleteMapping = (id: string) => {
    const mapping = mappings.find((m) => m.id === id);
    setMappings((prev) => prev.filter((m) => m.id !== id));
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Deleted Mapping",
        details: `Deleted mapping for ${mapping?.destinationField || "unknown field"}`,
      },
    ]);
    toast({
      title: "Mapping Deleted",
      description: `Successfully deleted mapping`,
    });
  };

  const handleCreateNamedRange = (namedRange: NamedRange) => {
    setNamedRanges((prev) => [...prev, namedRange]);
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Created Named Range",
        details: `Created named range ${namedRange.name} for ${namedRange.range}`,
      },
    ]);
    toast({
      title: "Named Range Created",
      description: `Successfully created named range ${namedRange.name}`,
    });
  };

  const handleUpdateNamedRange = (id: string, updatedNamedRange: Partial<NamedRange>) => {
    setNamedRanges((prev) =>
      prev.map((nr) => (nr.id === id ? { ...nr, ...updatedNamedRange } : nr))
    );
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Updated Named Range",
        details: `Updated named range ${updatedNamedRange.name || "unknown range"}`,
      },
    ]);
    toast({
      title: "Named Range Updated",
      description: `Successfully updated named range`,
    });
  };

  const handleDeleteNamedRange = (id: string) => {
    const namedRange = namedRanges.find((nr) => nr.id === id);
    setNamedRanges((prev) => prev.filter((nr) => nr.id !== id));
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Deleted Named Range",
        details: `Deleted named range ${namedRange?.name || "unknown range"}`,
      },
    ]);
    toast({
      title: "Named Range Deleted",
      description: `Successfully deleted named range`,
    });
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

  const handleUploadWorkbook = (workbook: Workbook) => {
    // 1. Add the new workbook to the list
    setWorkbooks((prev) => [...prev, workbook]);

    // 2. Add an audit log for the upload
    setAuditLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        user: "Current User",
        action: "Uploaded Workbook",
        details: `Uploaded ${workbook.name} version ${workbook.version}`,
      },
    ]);

    // 3. Show a success toast
    toast({
      title: "Workbook Uploaded",
      description: `Successfully uploaded ${workbook.name}`,
    });

    // 4. Select the new workbook and navigate to the viewer
    setSelectedWorkbook(workbook);
    setCurrentView("viewer");
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
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <MainDashboard
            workbooks={workbooks}
            onSelectWorkbook={handleSelectWorkbook}
            onUploadClick={() => setCurrentView("upload-modal")}
          />
        );
      case "viewer":
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
          />
        );
      case "link-field-modal":
        return (
          <LinkToFieldModal
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
      default:
        return (
          <MainDashboard
            workbooks={workbooks}
            onSelectWorkbook={handleSelectWorkbook}
            onUploadClick={() => setCurrentView("upload-modal")}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-foreground">
      {renderView()}
      <Toaster />
    </div>
  );
}