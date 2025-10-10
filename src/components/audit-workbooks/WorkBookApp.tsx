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
// import { useToast } from "@//hooks/use-toast";

// type View =
//   | "dashboard"
//   | "viewer"
//   | "audit-log"
//   | "upload-modal"
//   | "link-field-modal"
//   | "dataset-preview-modal"
//   | "workbook-rules-modal"
//   | "version-comparison";

// export default function App() {
//   const [currentView, setCurrentView] = useState<View>("dashboard");
//   const [selectedWorkbook, setSelectedWorkbook] = useState<Workbook | null>(
//     null
//   );
//   const [pendingSelection, setPendingSelection] = useState<Selection | null>(
//     null
//   );
//   const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
//   const [mappings, setMappings] = useState<Mapping[]>([]);
//   const [datasetMappings, setDatasetMappings] = useState<DatasetMapping[]>([]);
//   const [workbookRules, setWorkbookRules] = useState<WorkbookRule[]>([]);
//   const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
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
//     setWorkbooks((prev) => [...prev, workbook]);
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
//     toast({
//       title: "Workbook Uploaded",
//       description: `Successfully uploaded ${workbook.name}`,
//     });
//     handleSelectWorkbook(workbook);
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

//   const handleUploadError = (message: string) => {
//     toast({
//       variant: "destructive", // Use a destructive variant for errors
//       title: "Upload Failed",
//       description: message,
//     });
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
//           <ExcelViewer
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
//             onError={handleUploadError} // Pass the error handler here
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






//#################################################################################################################





import React, { useState, useEffect } from "react";
import { MainDashboard } from "@/components/audit-workbooks/MainDashboard";
import { ExcelViewer } from "@/components/audit-workbooks/ExcelViewer";
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
} from "../../types/audit-workbooks/types";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

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
    id: '1',
    name: 'FY2023_Financial_Statements.xlsx',
    uploadedDate: '2023-10-26',
    version: 'v2',
    lastModified: '2023-10-27T10:00:00Z',
    lastModifiedBy: 'Alice',
    fileData: {
      'Balance Sheet': [
        ['', 'A', 'B', 'C', 'D'],
        ['1', 'Assets', 'Q1 2023', 'Q2 2023', 'Q3 2023'],
        ['2', 'Current Assets', '150,000', '165,000', '180,000'],
        ['3', 'Cash', '50,000', '55,000', '60,000'],
        ['4', 'Accounts Receivable', '100,000', '110,000', '120,000'],
        ['5', 'Total Current Assets', '150,000', '165,000', '180,000'],
        ['6', 'Non-Current Assets', '350,000', '360,000', '370,000'],
        ['7', 'Total Assets', '500,000', '525,000', '550,000'],
      ],
      'Income Statement': [
        ['', 'A', 'B', 'C'],
        ['1', 'Revenue', '200,000', '220,000'],
        ['2', 'Cost of Goods Sold', '-80,000', '-88,000'],
        ['3', 'Gross Profit', '120,000', '132,000'],
        ['4', 'Operating Expenses', '-70,000', '-75,000'],
        ['5', 'Net Income', '50,000', '57,000'],
      ],
    },
  },
  {
    id: '2',
    name: 'Q4_Sales_Report_Regional.xlsx',
    uploadedDate: '2023-10-25',
    version: 'v1',
    lastModifiedBy: 'Bob',
    fileData: {
      'Sales Data': [
        ['', 'A', 'B', 'C', 'D', 'E'],
        ['1', 'Region', 'Product A', 'Product B', 'Product C', 'Total Sales'],
        ['2', 'North', '15,000', '18,000', '22,000', '55,000'],
        ['3', 'South', '12,000', '14,000', '16,000', '42,000'],
        ['4', 'East', '18,000', '20,000', '25,000', '63,000'],
        ['5', 'West', '10,000', '11,000', '13,000', '34,000'],
        ['6', 'Grand Total', '55,000', '63,000', '76,000', '194,000'],
      ],
    },
  },
  {
    id: '3',
    name: 'Employee_List_HR.xlsx',
    uploadedDate: '2023-09-15',
    version: 'v3',
    lastModifiedBy: 'Charlie',
    fileData: {
      'Employees': [
        ['', 'A', 'B', 'C', 'D'],
        ['1', 'Employee ID', 'Full Name', 'Department', 'Hire Date'],
        ['2', 'E001', 'John Doe', 'Engineering', '2021-05-20'],
        ['3', 'E002', 'Jane Smith', 'Marketing', '2020-08-15'],
        ['4', 'E003', 'Peter Jones', 'Engineering', '2022-01-10'],
        ['5', 'E004', 'Mary Williams', 'Human Resources', '2019-11-30'],
        ['6', 'E005', 'David Brown', 'Sales', '2022-03-22'],
      ],
    },
  },
];

// You can also add some initial mock mappings, dataset mappings, and rules
const mockMappings: Mapping[] = [
  {
    id: 'm1',
    sheet: 'Balance Sheet',
    start: { row: 2, col: 1 },
    end: { row: 2, col: 3 },
    destinationField: 'current_assets_q3',
    transform: 'sum',
    color: 'bg-blue-200',
  },
];

const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'log1',
    timestamp: new Date('2023-10-27T09:30:00Z').toISOString(),
    user: 'Alice',
    action: 'Uploaded Workbook',
    details: 'Uploaded FY2023_Financial_Statements.xlsx as v2',
  },
  {
    id: 'log2',
    timestamp: new Date('2023-10-27T09:35:00Z').toISOString(),
    user: 'Alice',
    action: 'Created Mapping',
    details: 'Mapped Balance Sheet!B2:D2 to current_assets_q3',
  },
];


export default function App() {
  // --- INITIALIZE STATE WITH MOCK DATA ---
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedWorkbook, setSelectedWorkbook] = useState<Workbook | null>(mockWorkbooks[0] || null); // Select the first workbook by default
  const [pendingSelection, setPendingSelection] = useState<Selection | null>(null);
  const [workbooks, setWorkbooks] = useState<Workbook[]>(mockWorkbooks); // Initialize with mock data
  const [mappings, setMappings] = useState<Mapping[]>(mockMappings); // Initialize with mock mappings
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
    setWorkbooks((prev) => [...prev, workbook]);
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
    toast({
      title: "Workbook Uploaded",
      description: `Successfully uploaded ${workbook.name}`,
    });
    handleSelectWorkbook(workbook);
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
      case 'viewer':
        return selectedWorkbook ? (
          <ExcelViewer 
            workbook={selectedWorkbook} 
            mappings={mappings}
            onBack={() => setCurrentView('dashboard')} 
            onLinkField={handleLinkFieldClick}
            onLinkSheet={() => setCurrentView('dataset-preview-modal')}
            onLinkWorkbook={() => setCurrentView('workbook-rules-modal')}
            onReupload={() => handleReuploadWorkbook(selectedWorkbook)}
            onViewAuditLog={() => setCurrentView('audit-log')}
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