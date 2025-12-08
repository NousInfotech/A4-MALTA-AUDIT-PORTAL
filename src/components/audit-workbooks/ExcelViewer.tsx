import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  Dispatch,
  SetStateAction,
} from "react"; // Added useRef
import { db_WorkbookApi } from "@/lib/api/workbookApi";
import { parseExcelRange, zeroIndexToExcelCol } from "./utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Settings,
  Link,
  FileSpreadsheet,
  Upload,
  List,
  Code,
  History,
  Maximize2,
  Minimize2,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  Info,
  FileText,
  ExternalLink,
  Image,
  File,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Workbook,
  SheetData,
  Selection,
  Mapping,
  NamedRange,
} from "../../types/audit-workbooks/types";
import { useToast } from "@/hooks/use-toast";
import {
  MappingCoordinates,
  SaveSheetRequest,
  SaveWorkbookRequest,
  msDriveworkbookApi,
} from "@/lib/api/workbookApi";
import { excelColToZeroIndex } from "./utils";
import {
  getExtendedTrialBalanceWithMappings,
  addMappingToRow,
  updateMapping,
  removeMappingFromRow,
  getExtendedTBWithLinkedFiles,
  updateLinkedExcelFilesInExtendedTB,
  type ETBData,
  type ETBRow,
  type CreateMappingRequest,
  type UpdateMappingRequest,
} from "@/lib/api/extendedTrialBalanceApi";
import {
  getWorkingPaperWithMappings,
  addMappingToWPRow,
  updateWPMapping,
  removeMappingFromWPRow,
  getWorkingPaperWithLinkedFiles,
  updateLinkedExcelFilesInWP,
  type WorkingPaperData,
} from "@/lib/api/workingPaperApi";
import {
  getEvidenceWithMappings,
  linkWorkbookToEvidence,
  unlinkWorkbookFromEvidence,
  addMappingToEvidence,
  updateEvidenceMapping,
  removeMappingFromEvidence,
  getEvidenceByCellRange,
  addReferenceFileToWorkbook,
  type ClassificationEvidence,
  type CreateMappingRequest as EvidenceCreateMappingRequest
} from "@/lib/api/classificationEvidenceApi";
import { uploadFileToStorage, validateFile } from "@/lib/file-upload-service";
import { createClassificationEvidence } from "@/lib/api/classification-evidence-api";
import { getClassificationId } from "@/lib/classification-mapping";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

const generateColor = () => {
  const colors = [
    "bg-blue-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-purple-200",
    "bg-pink-200",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// zeroIndexToExcelCol is now imported from utils, removed duplicate declaration

interface ExcelViewerProps {
  workbook: any;
  setSelectedWorkbook?: Dispatch<SetStateAction<any | null>>;
  mappings: Mapping[];
  namedRanges: NamedRange[];
  onBack: () => void;
  onLinkField: (selection: Selection) => void;
  onLinkSheet: () => void;
  onLinkWorkbook: () => void;
  onReupload: () => void;
  onViewAuditLog: () => void;
  onCreateMapping: (
    workbookId: string,
    mappingDetails: {
      sheet: string;
      start: MappingCoordinates;
      end: MappingCoordinates;
      color: string;
    }
  ) => void;
  onUpdateMapping: (
    workbookId: string,
    mappingId: string,
    updatedMappingDetails: {
      color?: string;
      sheet?: string;
      start?: MappingCoordinates;
      end?: MappingCoordinates;
    }
  ) => void;
  onDeleteMapping: (workbookId: string, mappingId: string) => void;
  onCreateNamedRange: (workbookId: string, namedRange: any) => void;
  onUpdateNamedRange: (
    workbookId: string,
    namedRangeId: string,
    updatedNamedRangeDetails: any
  ) => void;
  onDeleteNamedRange: (workId: string, namedRangeId: string) => void;
  isFullscreenMode?: boolean;
  onToggleFullscreen?: () => void;
  isLoadingWorkbookData?: boolean;
  workingPaperCloudInfo: any;
  updateSheetsInWorkbook?: (cloudFileId: string, workbookId: string) => void;

  // ETB related props
  engagementId?: string;
  classification?: string;
  rowType?: 'etb' | 'working-paper' | 'evidence'; // Type of rows being worked with
  onRefreshMappings?: (workbookId: string) => Promise<void>; // ✅ NEW: Callback to refresh mappings after CRUD
  
  // Dialog refresh control
  mappingsDialogRefreshKey?: number;
  setMappingsDialogRefreshKey?: (key: number | ((prev: number) => number)) => void;

  // All state props from parent
  selectedSheet: string;
  setSelectedSheet: (sheetName: string) => void;
  selections: Selection[];
  setSelections: Dispatch<SetStateAction<Selection[]>>;
  isSelecting: boolean;
  setIsSelecting: (selecting: boolean) => void;
  anchorSelectionStart: React.MutableRefObject<{
    row: number;
    col: number;
  } | null>;

  // Save dialog states
  isSaveDialogOpen: boolean;
  setIsSaveDialogOpen: (open: boolean) => void;
  saveType: "workbook" | "sheet";
  setSaveType: (type: "workbook" | "sheet") => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;

  // Named ranges states
  isNamedRangesDialogOpen: boolean;
  setIsNamedRangesDialogOpen: (open: boolean) => void;
  isCreateNamedRangeOpen: boolean;
  setIsCreateNamedRangeOpen: (open: boolean) => void;
  isEditNamedRangeOpen: boolean;
  setIsEditNamedRangeOpen: (open: boolean) => void;
  editingNamedRange: any | null;
  setEditingNamedRange: (range: any | null) => void;
  newNamedRangeName: string;
  setNewNamedRangeName: (name: string) => void;
  newNamedRangeRange: string;
  setNewNamedRangeRange: (range: string) => void;

  // ETB Mappings states
  isETBMappingsDialogOpen: boolean;
  setIsETBMappingsDialogOpen: (open: boolean) => void;
  isCreateETBMappingOpen: boolean;
  setIsCreateETBMappingOpen: (open: boolean) => void;
  isEditETBMappingOpen: boolean;
  setIsEditETBMappingOpen: (open: boolean) => void;
  editingETBMapping: any | null;
  setEditingETBMapping: (mapping: any | null) => void;
  selectedETBRow: ETBRow | null;
  setSelectedETBRow: (row: ETBRow | null) => void;
  isCreatingETBMapping: boolean;
  setIsCreatingETBMapping: (creating: boolean) => void;

  // Workbook Mappings states
  isWorkbookMappingsDialogOpen: boolean;
  setIsWorkbookMappingsDialogOpen: (open: boolean) => void;
  isCreateWorkbookMappingOpen: boolean;
  setIsCreateWorkbookMappingOpen: (open: boolean) => void;
  isEditWorkbookMappingOpen: boolean;
  setIsEditWorkbookMappingOpen: (open: boolean) => void;
  editingWorkbookMapping: Mapping | null;
  setEditingWorkbookMapping: (mapping: Mapping | null) => void;
  isCreatingWorkbookMapping: boolean;
  setIsCreatingWorkbookMapping: (creating: boolean) => void;

  // ETB props
  etbData: ETBData | null;
  setEtbData?: (data: any | null | ((prev: any) => any)) => void;
  etbLoading: boolean;
  etbError: string | null;
  onRefreshETBData?: () => void;
  onRefreshParentData?: () => Promise<void> | void;
  onEvidenceMappingUpdated?: (evidence: any) => void;

  // Sheet data cache (for lazy loading)
  sheetDataCache?: Map<string, any[][]>;

  // Loading state for sheets
  loadingSheets?: Set<string>;
  mappingsRefreshKey?: number;

  // Reference files states
  isDualOptionsDialogOpen?: boolean;
  setIsDualOptionsDialogOpen?: (open: boolean) => void;
  isReferenceFilesDialogOpen?: boolean;
  setIsReferenceFilesDialogOpen?: (open: boolean) => void;
  isUploadReferenceFilesDialogOpen?: boolean;
  setIsUploadReferenceFilesDialogOpen?: (open: boolean) => void;
  cellRangeEvidenceFiles?: ClassificationEvidence[];
  setCellRangeEvidenceFiles?: Dispatch<SetStateAction<ClassificationEvidence[]>>;
  loadingEvidenceFiles?: boolean;
  setLoadingEvidenceFiles?: (loading: boolean) => void;
  cellsWithEvidence?: Map<string, boolean>;
  setCellsWithEvidence?: Dispatch<SetStateAction<Map<string, boolean>>>;
  uploadingFiles?: boolean;
  setUploadingFiles?: (uploading: boolean) => void;

  // Reference files functions
  fetchEvidenceFilesForRange?: (
    sheet: string,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ) => Promise<void>;
  cellHasEvidence?: (row: number, col: number, sheet: string) => boolean;
  handleOpenReferenceFilesDialog?: () => Promise<void>;
  handleOpenFileInNewTab?: (fileUrl: string) => void;
  handleReferenceFileUpload?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;

  // File preview states
  filePreviewOpen?: boolean;
  setFilePreviewOpen?: (open: boolean) => void;
  selectedPreviewFile?: ClassificationEvidence | null;
  setSelectedPreviewFile?: (file: ClassificationEvidence | null) => void;

  // ✅ NEW: Callback when sheet selection changes (for saving preference)
  onSheetChange?: (workbookId: string, sheetName: string) => void;
  
  // Auto-scrolling props
  spreadsheetContainerRef?: React.RefObject<HTMLDivElement>;
  autoScrollInterval?: NodeJS.Timeout | null;
  setAutoScrollInterval?: (interval: NodeJS.Timeout | null) => void;
  mousePosition?: { x: number; y: number };
  setMousePosition?: (position: { x: number; y: number }) => void;
  currentMousePositionRef?: React.MutableRefObject<{ x: number; y: number }>; // ✅ NEW: Ref for immediate mouse position access
  
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({
  workbook,
  setSelectedWorkbook,
  mappingsRefreshKey,
  mappings,
  namedRanges,
  onBack,
  onLinkField,
  onLinkSheet,
  onLinkWorkbook,
  onReupload,
  onViewAuditLog,
  onCreateMapping,
  onUpdateMapping,
  onDeleteMapping,
  onCreateNamedRange,
  onUpdateNamedRange,
  onDeleteNamedRange,
  isFullscreenMode = false,
  onToggleFullscreen,
  isLoadingWorkbookData = false,
  workingPaperCloudInfo,
  updateSheetsInWorkbook,

  // ETB related props
  engagementId,
  classification,
  rowType = 'etb', // Default to ETB for backward compatibility
  onRefreshMappings, // ✅ NEW: Callback to refresh mappings after CRUD
  
  // Dialog refresh control
  mappingsDialogRefreshKey = 0,
  setMappingsDialogRefreshKey = () => {},

  // All state props from parent
  selectedSheet,
  setSelectedSheet,
  selections,
  setSelections,
  isSelecting,
  setIsSelecting,
  anchorSelectionStart,

  // Save dialog states
  isSaveDialogOpen,
  setIsSaveDialogOpen,
  saveType,
  setSaveType,
  isSaving,
  setIsSaving,

  // Named ranges states
  isNamedRangesDialogOpen,
  setIsNamedRangesDialogOpen,
  isCreateNamedRangeOpen,
  setIsCreateNamedRangeOpen,
  isEditNamedRangeOpen,
  setIsEditNamedRangeOpen,
  editingNamedRange,
  setEditingNamedRange,
  newNamedRangeName,
  setNewNamedRangeName,
  newNamedRangeRange,
  setNewNamedRangeRange,

  // ETB Mappings states
  isETBMappingsDialogOpen,
  setIsETBMappingsDialogOpen,
  isCreateETBMappingOpen,
  setIsCreateETBMappingOpen,
  isEditETBMappingOpen,
  setIsEditETBMappingOpen,
  editingETBMapping,
  setEditingETBMapping,
  selectedETBRow,
  setSelectedETBRow,
  isCreatingETBMapping,
  setIsCreatingETBMapping,

  // Workbook Mappings states
  isWorkbookMappingsDialogOpen,
  setIsWorkbookMappingsDialogOpen,
  isCreateWorkbookMappingOpen,
  setIsCreateWorkbookMappingOpen,
  isEditWorkbookMappingOpen,
  setIsEditWorkbookMappingOpen,
  editingWorkbookMapping,
  setEditingWorkbookMapping,
  isCreatingWorkbookMapping,
  setIsCreatingWorkbookMapping,

  // ETB props
  etbData,
  setEtbData,
  etbLoading,
  etbError,
  onRefreshETBData,
  onRefreshParentData,
  onEvidenceMappingUpdated,

  // Sheet data cache
  sheetDataCache = new Map(),

  // Loading state
  loadingSheets = new Set(),

  // Reference files states
  isDualOptionsDialogOpen = false,
  setIsDualOptionsDialogOpen = () => {},
  isReferenceFilesDialogOpen = false,
  setIsReferenceFilesDialogOpen = () => {},
  isUploadReferenceFilesDialogOpen = false,
  setIsUploadReferenceFilesDialogOpen = () => {},
  cellRangeEvidenceFiles = [],
  setCellRangeEvidenceFiles = () => {},
  loadingEvidenceFiles = false,
  setLoadingEvidenceFiles = () => {},
  cellsWithEvidence = new Map(),
  setCellsWithEvidence = () => {},
  uploadingFiles = false,
  setUploadingFiles = () => {},

  // Reference files functions
  fetchEvidenceFilesForRange,
  cellHasEvidence,
  handleOpenReferenceFilesDialog,
  handleOpenFileInNewTab,
  handleReferenceFileUpload,

  // File preview states
  filePreviewOpen = false,
  setFilePreviewOpen = () => {},
  selectedPreviewFile = null,
  setSelectedPreviewFile = () => {},

  // ✅ NEW: Callback when sheet selection changes
  onSheetChange,

  // Auto-scrolling props
  spreadsheetContainerRef,
  autoScrollInterval,
  setAutoScrollInterval,
  mousePosition,
  setMousePosition,
  currentMousePositionRef: parentCurrentMousePositionRef,
}) => {
  // ✅ Create local ref if parent doesn't provide one (for standalone ExcelViewer usage)
  const localCurrentMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const currentMousePositionRef = parentCurrentMousePositionRef || localCurrentMousePositionRef;
  // ✅ NEW: Wrapper function to handle sheet changes and notify parent
  // Note: setSelectedSheet (from props) is already a wrapper that calls onSheetChange
  // So we just need to call setSelectedSheet here
  const handleSheetChange = useCallback((sheetName: string) => {
    setSelectedSheet(sheetName);
  }, [setSelectedSheet]);
  const { toast } = useToast();
  
  // State for mapping files to upload
  const [mappingFilesToUpload, setMappingFilesToUpload] = useState<File[]>([]);
  const [isUploadingMappingFiles, setIsUploadingMappingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  
  // ✅ NEW: State for sheet list dropdown panel
  const [isSheetListOpen, setIsSheetListOpen] = useState(false);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  
  // ✅ Create props object reference for functions that need to access props
  const props = {
    workbook,
    engagementId,
    classification,
    rowType,
    onRefreshETBData,
    onRefreshMappings,
    etbData,
    setEtbData,
    onCreateMapping,
  };

  const resolveRowIdentifier = useCallback(
    (row?: Partial<ETBRow>, fallback?: string) => {
      if (!row) return fallback;
      const identifier =
        (row as any)?._id ||
        (row as any)?.id ||
        (row as any)?.rowId ||
        row.code;
      return identifier || fallback;
    },
    []
  );

  const getRowLookupByCode = useCallback(
    (code?: string) => {
      if (!code) {
        return { row: undefined, identifier: undefined };
      }
      const row = etbData?.rows?.find((r) => r.code === code);
      return {
        row,
        identifier: resolveRowIdentifier(row, code),
      };
    },
    [etbData, resolveRowIdentifier]
  );

  const selectMappingRange = useCallback(
    (mapping: any, options?: { closeDialogs?: boolean }) => {
      if (!mapping?.details?.sheet || !mapping.details.start) {
        return;
      }

      const { sheet, start, end } = mapping.details;
      const normalizedEnd = end || start;

      handleSheetChange(sheet);
      setSelections([
        {
          sheet,
          start: { row: start.row, col: start.col },
          end: { row: normalizedEnd.row, col: normalizedEnd.col },
        },
      ]);
      setIsSelecting(false);

      if (options?.closeDialogs) {
        setIsETBMappingsDialogOpen(false);
        setIsWorkbookMappingsDialogOpen(false);
      }
    },
    [setSelectedSheet, setSelections, setIsSelecting]
  );
  
  // ✅ DEBUG: Log when mappings prop changes
  useEffect(() => {
    console.log('📊 ExcelViewer: Mappings prop changed:', {
      count: mappings.length,
      mappingsArray: mappings,
      workbookId: workbook.id,
      workbookName: workbook.name
    });
  }, [mappings, workbook.id, workbook.name]);

  // Use workbook.fileData as fallback, but will be populated with cache
  const sheetData: SheetData = workbook?.fileData || {};
  // ✅ Get sheet names from fileData, or fallback to workbook.sheets array
  const sheetNames = Object.keys(sheetData).length > 0 
    ? Object.keys(sheetData)
    : (workbook?.sheets?.map((s: any) => s.name || s) || []);
  
  // ✅ DEBUG: Log sheet names for troubleshooting
  useEffect(() => {
    console.log('ExcelViewer: Sheet names debug:', {
      workbookId: workbook?.id,
      workbookName: workbook?.name,
      hasFileData: !!workbook?.fileData,
      fileDataKeys: workbook?.fileData ? Object.keys(workbook.fileData) : [],
      hasSheetsArray: !!workbook?.sheets,
      sheetsArray: workbook?.sheets,
      sheetNames: sheetNames,
      sheetNamesLength: sheetNames.length,
      selectedSheet: selectedSheet
    });
  }, [workbook?.id, workbook?.fileData, workbook?.sheets, sheetNames.length, selectedSheet]);

  // ✅ DEBUG: Log workbook.referenceFiles whenever it changes
  useEffect(() => {
    const refFiles = workbook?.referenceFiles || [];
    const refFilesForCurrentSheet = refFiles.filter((ref: any) => 
      ref?.details?.sheet === selectedSheet
    );
    
    console.log('📊 ExcelViewer: workbook.referenceFiles changed:', {
      workbookId: workbook?.id,
      workbookName: workbook?.name,
      selectedSheet,
      totalReferenceFilesCount: refFiles.length,
      referenceFilesForCurrentSheet: refFilesForCurrentSheet.length,
      referenceFiles: refFiles.map((ref: any) => ({
        hasDetails: !!ref?.details,
        sheet: ref?.details?.sheet,
        start: ref?.details?.start,
        end: ref?.details?.end,
        evidenceCount: ref?.evidence?.length || 0,
        evidenceIds: ref?.evidence?.map((e: any) => {
          if (typeof e === 'string') return e;
          if (e && typeof e === 'object') return e._id || e.id || e;
          return e?.toString?.() || e;
        }) || []
      })) || [],
      timestamp: (workbook as any)?._referenceFilesUpdateTimestamp,
      workbookPropReference: workbook // Log the actual prop reference
    });
  }, [workbook?.id, workbook?.referenceFiles, (workbook as any)?._referenceFilesUpdateTimestamp, selectedSheet]);

  // Get cached sheet data from parent (ExcelViewerWithFullscreen will pass this)
  const sheetDataCacheProp = sheetDataCache;

  // Combine workbook mappings with ETB mappings for display
  const allMappings = React.useMemo(() => {
    const workbookMappings = mappings || [];
    
    // Determine source rows based on rowType
    let sourceRows: any[] =
      etbData?.rows ||
      (rowType === 'evidence' ? (props as any)?.etbData?.rows : []);

    // For evidence, ensure rows include mappings (fall back to parent data)
    if (rowType === 'evidence' && (!sourceRows || sourceRows.length === 0)) {
      const fallbackRows = (props as any)?.etbData?.rows || [];
      sourceRows = fallbackRows;
    }

    const etbMappings =
      sourceRows?.flatMap((row) =>
        row.mappings?.map((mapping: any) => ({
          ...mapping,
          details: mapping.details,
          color: mapping.color,
          isActive: mapping.isActive !== false,
          referenceFiles: mapping.referenceFiles || [], // ✅ Preserve referenceFiles from mapping
          workbookId:
            mapping.workbookId && typeof mapping.workbookId === 'string'
              ? {
                  _id: mapping.workbookId,
                  name: workbook.name || 'Unknown Workbook',
                }
              : mapping.workbookId,
          _evidenceId: rowType === 'evidence' ? row.code : undefined,
        })) || []
      ) || [];
    
    const combined = [...workbookMappings, ...etbMappings];
    console.log('🔍 allMappings recalculated:', {
      rowType,
      workbookMappingsCount: workbookMappings.length,
      etbMappingsCount: etbMappings.length,
      totalCount: combined.length,
      selectedSheet,
      timestamp: (workbook as any)?._mappingsUpdateTimestamp,
      etbDataTimestamp: (sourceRows as any)?._updateTimestamp,
      mappingsWithReferenceFiles: combined.filter(m => m.referenceFiles && m.referenceFiles.length > 0).length,
      mappingsWithRefFilesDetails: combined.filter(m => m.referenceFiles && m.referenceFiles.length > 0).map(m => ({
        mappingId: m._id,
        refFilesCount: m.referenceFiles?.length || 0
      }))
    });

    return combined;
  }, [
    mappings,
    etbData,
    selectedSheet,
    rowType,
    workbook.name,
    (workbook as any)?._mappingsUpdateTimestamp,
    (etbData as any)?._updateTimestamp,
    JSON.stringify(etbData?.rows?.map((r) => r.mappings)),
  ]);
  
  // ✅ Log when allMappings changes
  useEffect(() => {
    console.log('📊 allMappings changed:', {
      count: allMappings.length,
      mappings: allMappings,
      selectedSheet
    });
  }, [allMappings, selectedSheet]);

  useEffect(() => {
  }, [namedRanges, workbook]);

  useEffect(() => {
    if (!selectedSheet || !sheetNames.includes(selectedSheet)) {
      if (sheetNames.length > 0) {
        handleSheetChange(sheetNames[0]);
      } else {
        handleSheetChange("Sheet1");
      }
    }
  }, [workbook.id, sheetNames, selectedSheet, handleSheetChange]);

  // ✅ NEW: Initialize selectedSheets with current selectedSheet
  useEffect(() => {
    if (selectedSheet) {
      setSelectedSheets(new Set([selectedSheet]));
    }
  }, [selectedSheet]);

  // ✅ NEW: Handle select all sheets
  const handleSelectAllSheets = (checked: boolean) => {
    if (checked) {
      setSelectedSheets(new Set(sheetNames));
    } else {
      setSelectedSheets(new Set());
    }
  };

  // ✅ NEW: Handle individual sheet selection
  const handleSheetToggle = (sheetName: string, checked: boolean) => {
    setSelectedSheets(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(sheetName);
      } else {
        newSet.delete(sheetName);
      }
      return newSet;
    });
  };

  // ✅ NEW: Check if all sheets are selected
  const areAllSheetsSelected = sheetNames.length > 0 && selectedSheets.size === sheetNames.length;

  // Helper to get cell key for evidence tracking (must be defined before useEffect)
  const getCellKey = useCallback((row: number, col: number, sheet: string) => {
    return `${sheet}_${row}_${col}`;
  }, []);

  // Effect to fetch evidence files for all mappings and referenceFiles in the current sheet
  // ✅ This works for ALL workbooks regardless of rowType (etb, working-paper, evidence)
  useEffect(() => {
    if (!workbook?.id || !selectedSheet) {
      setCellsWithEvidence(new Map());
      return;
    }

    console.log('🔍 Fetching reference files for workbook:', {
      workbookId: workbook.id,
      workbookName: workbook.name,
      selectedSheet,
      rowType,
      referenceFilesCount: workbook.referenceFiles?.length || 0
    });

    // ✅ IMPORTANT: Only process referenceFiles, NOT mappings
    // Mappings are separate and handled by allMappings

    // Get all reference file ranges from workbook.referenceFiles in the current sheet
    // ✅ Handle both old format (ObjectIds) and new format (ReferenceSchema)
    const sheetReferenceFiles = (workbook.referenceFiles || []).filter(
      (ref: any) => {
        // Skip old format entries (just ObjectIds without details)
        if (!ref || typeof ref !== 'object' || !ref.details) return false;
        return ref.details.sheet === selectedSheet;
      }
    );

    if (sheetReferenceFiles.length === 0) {
      // Clear evidence map if no reference files
      // Note: Mappings are separate and don't affect this map
      setCellsWithEvidence(new Map());
      return;
    }

      // ✅ IMPORTANT: Only process referenceFiles (NOT mappings)
      // Mappings and reference files are separate concepts:
      // - Mappings: Link cells to ETB/Working Paper/Evidence rows (shown with "Mapping" label)
      // - Reference Files: Directly attached to cell ranges (shown with "References" label)
      const fetchEvidenceForRanges = async () => {
        const newCellsWithEvidence = new Map<string, boolean>();
        
        // ✅ DO NOT process mappings here - mappings are separate and should not populate cellsWithEvidence
        // Mappings will show "Mapping" label, reference files will show "References" label

        // Process referenceFiles ONLY (new schema with details and evidence array)
      // ✅ Handle both old format (ObjectIds) and new format (ReferenceSchema)
      for (const refFile of sheetReferenceFiles) {
        // Skip old format entries (just ObjectIds without details)
        if (!refFile || typeof refFile !== 'object' || !refFile.details) {
          console.warn('⚠️ Skipping old format referenceFile entry:', refFile);
          continue;
        }
        
        const { start, end } = refFile.details;
        if (!start || typeof start.row !== 'number' || typeof start.col !== 'number') {
          console.warn('⚠️ Invalid referenceFile details.start:', refFile);
          continue;
        }

        const evidenceIds = refFile.evidence || [];
        
        // Mark cells in this reference range if it has evidence
        if (evidenceIds.length > 0) {
          const startRow = start.row;
          const endRow = (end && typeof end.row === 'number') ? end.row : start.row;
          const startCol = start.col;
          const endCol = (end && typeof end.col === 'number') ? end.col : start.col;

          for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
              const cellKey = getCellKey(row, col, selectedSheet);
              newCellsWithEvidence.set(cellKey, true);
            }
          }

          console.log('📋 Reference file range marked:', {
            workbookId: workbook.id,
            refFileId: refFile._id,
            sheet: selectedSheet,
            startRow,
            startCol,
            endRow,
            endCol,
            evidenceCount: evidenceIds.length
          });
        }
      }

      console.log('📋 Updated cellsWithEvidence:', {
        workbookId: workbook.id,
        workbookName: workbook.name,
        rowType,
        sheet: selectedSheet,
        totalCells: newCellsWithEvidence.size,
        cells: Array.from(newCellsWithEvidence.keys())
      });
      setCellsWithEvidence(newCellsWithEvidence);
    };

    fetchEvidenceForRanges();
  }, [workbook?.id, workbook?.name, workbook?.referenceFiles, (workbook as any)?._referenceFilesUpdateTimestamp, selectedSheet, allMappings, getCellKey, setCellsWithEvidence, rowType]);

  // Effect to populate newNamedRangeRange when Create Named Range dialog opens and a selection exists
  useEffect(() => {
    // Take the last selection for context if multiple exist
    const currentSelection =
      selections.length > 0 ? selections[selections.length - 1] : null;
    if (isCreateNamedRangeOpen && currentSelection) {
      setNewNamedRangeRange(getSelectionText(currentSelection));
    } else if (!isCreateNamedRangeOpen) {
      setNewNamedRangeRange(""); // Clear when dialog closes
    }
  }, [isCreateNamedRangeOpen, selections]);

  // currentSheetData now includes the prepended column letters and row numbers
  // Try to get from cache first, then fall back to sheetData
  const cachedSheetData = sheetDataCacheProp.get(selectedSheet);
  const currentSheetData = cachedSheetData && cachedSheetData.length > 0
    ? cachedSheetData
    : sheetData[selectedSheet] || [];

  /**
   * Save entire workbook to backend
   */
  const handleSaveWorkbook = async () => {
    if (!workbook) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No workbook data available to save",
      });
      return;
    }

    setIsSaving(true);

    try {
      const dataToSave = { ...sheetData };

      const request: SaveWorkbookRequest = {
        workbookId: workbook.id,
        workbookName: workbook.name,
        version: workbook.version,
        sheetData: dataToSave,
        metadata: {
          uploadedDate: workbook.uploadedDate,
          lastModifiedBy: workbook.lastModifiedBy || "Current User",
          lastModified: new Date().toISOString(),
        },
      };

      const response = await msDriveworkbookApi.saveWorkbook(request);

      if (response.success) {
        toast({
          title: "Success",
          description: "Workbook saved successfully to database",
        });
        setIsSaveDialogOpen(false);
      } else {
        throw new Error(response.error || "Failed to save workbook");
      }
    } catch (error) {
      console.error("Error saving workbook:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Save current sheet to backend
   */
  const handleSaveSheet = async () => {
    if (!workbook || !selectedSheet) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No sheet data available to save",
      });
      return;
    }

    setIsSaving(true);

    try {
      const sheetDataToSave = sheetData[selectedSheet] || [];

      const request: SaveSheetRequest = {
        workbookId: workbook.id,
        workbookName: workbook.name,
        sheetName: selectedSheet,
        sheetData: sheetDataToSave,
        metadata: {
          uploadedDate: workbook.uploadedDate,
          lastModifiedBy: workbook.lastModifiedBy || "Current User",
          lastModified: new Date().toISOString(),
        },
      };

      const response = await msDriveworkbookApi.saveSheet(request);

      if (response.success) {
        toast({
          title: "Success",
          description: `Sheet "${selectedSheet}" saved successfully to database`,
        });
        setIsSaveDialogOpen(false);
      } else {
        throw new Error(response.error || "Failed to save sheet");
      }
    } catch (error) {
      console.error("Error saving sheet:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Open save dialog
   */
  const openSaveDialog = (type: "workbook" | "sheet") => {
    setSaveType(type);
    setIsSaveDialogOpen(true);
  };

  /**
   * Handle save confirmation
   */
  const handleSaveConfirm = () => {
    if (saveType === "workbook") {
      handleSaveWorkbook();
    } else {
      handleSaveSheet();
    }
  };

  const handleMouseDown = (
    excelGridRowIndex: number,
    excelGridColIndex: number,
    event: React.MouseEvent
  ) => {
    // Prevent selection on header cells
    if (excelGridColIndex === 0 || excelGridRowIndex === 0) {
      setSelections([]);
      anchorSelectionStart.current = null;
      return;
    }

    setIsSelecting(true);
    const excelRowNumber = excelGridRowIndex;
    const excelColIndex = excelGridColIndex - 1;

    const clickedCell = { row: excelRowNumber, col: excelColIndex };

    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd + click: Add to selection or deselect
      const newSelection: Selection = {
        sheet: selectedSheet || "", // Add fallback
        start: clickedCell,
        end: clickedCell,
      };

      setSelections((prevSelections) => {
        // Check if the clicked cell is already part of an existing selection
        const existingSelectionIndex = prevSelections.findIndex((s) =>
          isCellInSelection(clickedCell, s)
        );

        if (existingSelectionIndex !== -1) {
          // If already selected, remove it (for single cell selections)
          const existingSelection = prevSelections[existingSelectionIndex];
          if (
            existingSelection.start.row === clickedCell.row &&
            existingSelection.start.col === clickedCell.col &&
            existingSelection.end.row === clickedCell.row &&
            existingSelection.end.col === clickedCell.col
          ) {
            return prevSelections.filter(
              (_, idx) => idx !== existingSelectionIndex
            );
          }
          return prevSelections.filter(
            (_, idx) => idx !== existingSelectionIndex
          );
        } else {
          // Add a new single-cell selection
          return [...prevSelections, newSelection];
        }
      });
      anchorSelectionStart.current = clickedCell;
    } else if (event.shiftKey) {
      // Shift + click: Extend selection from anchor
      if (anchorSelectionStart.current) {
        const newSelection: Selection = {
          sheet: selectedSheet,
          start: anchorSelectionStart.current,
          end: clickedCell,
        };
        setSelections((prevSelections) => {
          if (prevSelections.length > 0) {
            const lastSelection = prevSelections[prevSelections.length - 1];
            if (lastSelection.sheet === selectedSheet) {
              const updatedSelections = [...prevSelections];
              updatedSelections[updatedSelections.length - 1] = newSelection;
              return updatedSelections;
            } else {
              return [...prevSelections, newSelection];
            }
          }
          return [newSelection];
        });
      } else {
        // If shift-click without prior anchor, treat as normal click but set anchor
        const newSelection: Selection = {
          sheet: selectedSheet,
          start: clickedCell,
          end: clickedCell,
        };
        setSelections([newSelection]);
        anchorSelectionStart.current = clickedCell;
      }
    } else {
      // Normal click: Start a new selection, clear previous ones
      const newSelection: Selection = {
        sheet: selectedSheet,
        start: clickedCell,
        end: clickedCell,
      };
      setSelections([newSelection]);
      anchorSelectionStart.current = clickedCell;
    }
  };

  const handleMouseEnter = (
    excelGridRowIndex: number,
    excelGridColIndex: number
  ) => {
    if (!isSelecting || !selectedSheet) {
      return;
    }

    if (excelGridColIndex === 0 || excelGridRowIndex === 0) {
      return;
    }

    const excelRowNumber = excelGridRowIndex;
    const excelColIndex = excelGridColIndex - 1;
    const currentHoverCell = { row: excelRowNumber, col: excelColIndex };

    setSelections((prevSelections) => {
      if (prevSelections.length === 0) {
        return prevSelections;
      }

      const lastSelectionIndex = prevSelections.length - 1;
      const lastSelection = prevSelections[lastSelectionIndex];

      if (lastSelection.sheet !== selectedSheet) {
        return prevSelections;
      }

      const updatedSelections = [...prevSelections];
      updatedSelections[lastSelectionIndex] = {
        ...lastSelection,
        end: currentHoverCell,
      };
      return updatedSelections;
    });
  };

  const handleMouseUp = useCallback(() => {
    if (isSelecting && selections.length > 0) {
      // Check if we have a valid selection and trigger dual-options dialog
      const lastSelection = selections[selections.length - 1];
      if (lastSelection && lastSelection.sheet === selectedSheet) {
        // Open dual-options dialog instead of directly opening mapping dialog
        setIsDualOptionsDialogOpen(true);
      }
    }
    setIsSelecting(false);
  }, [isSelecting, selections, selectedSheet, setIsSelecting]);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  // Helper to check if a cell is within a given selection
  const isCellInSelection = (
    cell: { row: number; col: number },
    selection: Selection
  ) => {
    if (!selection || selection.sheet !== selectedSheet) return false;

    const minRow = Math.min(selection.start.row, selection.end.row);
    const maxRow = Math.max(selection.start.row, selection.end.row);
    const minCol = Math.min(selection.start.col, selection.end.col);
    const maxCol = Math.max(selection.start.col, selection.end.col);

    return (
      cell.row >= minRow &&
      cell.row <= maxRow &&
      cell.col >= minCol &&
      cell.col <= maxCol
    );
  };

  // Helper functions for file preview
  const getFileIcon = (fileUrl: string) => {
    const fileName = fileUrl.split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return <Image className="h-5 w-5 text-green-500" />;
    }
    if (extension === 'pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    if (['doc', 'docx'].includes(extension)) {
      return <FileText className="h-5 w-5 text-blue-500" />;
    }
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getFileType = (fileUrl: string): string => {
    const fileName = fileUrl.split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    return extension || 'unknown';
  };

  const renderFilePreview = (evidence: ClassificationEvidence) => {
    const fileUrl = evidence.evidenceUrl;
    const fileName = fileUrl.split('/').pop() || 'Unknown File';
    const fileType = getFileType(fileUrl).toLowerCase();

    // For images
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(fileType)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
            style={{ maxHeight: '70vh' }}
          />
        </div>
      );
    }

    // For PDFs
    if (fileType === 'pdf') {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0 rounded-lg shadow-sm"
            title={fileName}
            style={{ minHeight: '70vh' }}
          />
        </div>
      );
    }

    // For text files
    if (['txt', 'csv'].includes(fileType)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0 rounded-lg shadow-sm"
            title={fileName}
            style={{ minHeight: '70vh' }}
          />
        </div>
      );
    }

    // For Office documents
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileType)) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50">
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
            className="w-full h-full border-0 rounded-lg shadow-sm"
            title={fileName}
            style={{ minHeight: '70vh' }}
          />
        </div>
      );
    }

    // For other file types
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center p-8">
          <div className="mb-4">
            {getFileIcon(fileUrl)}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{fileName}</h3>
          <p className="text-sm text-gray-600 mb-4">
            {fileType.toUpperCase()} file
          </p>
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <p className="text-sm text-gray-500 mb-2">Preview not available for this file type</p>
            <Button
              variant="outline"
              onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}
              className="mt-2"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Reference files functions are now passed as props from parent

  const getCellClassName = useCallback(
    (excelGridRowIndex: number, excelGridColIndex: number) => {
      let className =
        "min-w-[100px] cursor-pointer select-none relative border border-gray-200 "; // Added default border and relative positioning

      if (excelGridColIndex === 0 || excelGridRowIndex === 0) {
        className += "bg-gray-100 font-semibold text-gray-700 sticky ";
        if (excelGridColIndex === 0) {
          className += "left-0 z-20 ";
        }
        if (excelGridRowIndex === 0) {
          className += "top-0 z-20 ";
        }
        if (excelGridColIndex === 0 && excelGridRowIndex === 0) {
          className += "sticky top-0 left-0 z-30 ";
        }
        return className;
      }

      const excelRowNumber = excelGridRowIndex;
      const excelColIndex = excelGridColIndex - 1;

      // Check if current cell is part of any selection
      const isSelected = selections.some((s) =>
        isCellInSelection({ row: excelRowNumber, col: excelColIndex }, s)
      );

      if (isSelected) {
        className += "ring-2 ring-blue-500 bg-blue-50 border-blue-500 "; // Stronger selection border
      }

      // FIX: Add defensive checks for mapping.end before accessing its properties
      const mapping = allMappings.find((m) => {
        // Add defensive check for m.details
        if (!m.details) return false;

        const { sheet, start, end } = m.details; // <--- Destructure from m.details

        // Check if end exists and has valid row/col properties
        if (
          !end ||
          typeof end.row !== "number" ||
          typeof end.col !== "number"
        ) {
          // If end is missing or malformed, check if it's a single-cell mapping
          if (!end && start) {
            // Single cell mapping - check if current cell matches start
            return (
              sheet === selectedSheet &&
              excelRowNumber === start.row &&
              excelColIndex === start.col
            );
          }
          // Otherwise, this mapping cannot be matched
          return false;
        }
        // Normal range mapping with valid end
        return (
          sheet === selectedSheet &&
          excelRowNumber >= start.row &&
          excelRowNumber <= end.row &&
          excelColIndex >= start.col &&
          excelColIndex <= end.col
        );
      });

      if (mapping) {
        className += `${mapping.color} `;
      }

      // Check if cell is in a reference file range (for visual marking)
      // ✅ Handle both old format (ObjectIds) and new format (ReferenceSchema)
      const referenceFile = (workbook.referenceFiles || []).find((ref: any) => {
        // Skip old format entries (just ObjectIds without details)
        if (!ref || typeof ref !== 'object' || !ref.details) return false;
        if (ref.details.sheet !== selectedSheet) return false;
        
        const { start, end } = ref.details;
        if (!start || typeof start.row !== 'number' || typeof start.col !== 'number') {
          return false;
        }

        const startRow = start.row;
        const endRow = (end && typeof end.row === 'number') ? end.row : start.row;
        const startCol = start.col;
        const endCol = (end && typeof end.col === 'number') ? end.col : start.col;
        
        return (
          excelRowNumber >= startRow &&
          excelRowNumber <= endRow &&
          excelColIndex >= startCol &&
          excelColIndex <= endCol &&
          (ref.evidence || []).length > 0
        );
      });

      // ✅ Visual marking for reference file ranges ONLY (not mappings)
      // Mappings have their own color highlighting, reference files get blue background
      if (referenceFile) {
        // Light blue background to mark reference areas
        className += "bg-blue-50 border-l-4 border-blue-400 ";
      }

      return className;
    },
    [
      selections, 
      selectedSheet, 
      allMappings, 
      workbook.referenceFiles, 
      (workbook as any)?._referenceFilesUpdateTimestamp,
      (workbook as any)?.referenceFiles?.length, // ✅ Add length to dependencies to force re-render when referenceFiles change
      cellsWithEvidence
    ]
  );

  // Updated getSelectionText to work with the last selection in the array
  const getSelectionText = (currentSelection: Selection | null = null) => {
    const selectionToDisplay =
      currentSelection ||
      (selections.length > 0 ? selections[selections.length - 1] : null);

    if (!selectionToDisplay) {
      return selections.length > 0
        ? `${selections.length} ranges selected`
        : "";
    }
    const { start, end, sheet } = selectionToDisplay;

    const actualMinColIndex = Math.min(start.col, end.col);
    const actualMaxColIndex = Math.max(start.col, end.col);
    const actualMinRowNumber = Math.min(start.row, end.row);
    const actualMaxRowNumber = Math.max(start.row, end.row);

    const displayRangeStartColLetter = zeroIndexToExcelCol(actualMinColIndex);
    const displayRangeEndColLetter = zeroIndexToExcelCol(actualMaxColIndex);

    const displayRangeStart = `${displayRangeStartColLetter}${actualMinRowNumber}`;
    const displayRangeEnd = `${displayRangeEndColLetter}${actualMaxRowNumber}`;

    if (
      actualMinColIndex === actualMaxColIndex &&
      actualMinRowNumber === actualMaxRowNumber
    ) {
      return `${sheet}!${displayRangeStart}`;
    }

    return `${sheet}!${displayRangeStart}:${displayRangeEnd}`;
  };

  const handleNamedRangeClick = (namedRange: NamedRange) => {
    const [sheetName, range] = namedRange.range.split("!");
    const [startCell, endCell] = range.split(":");
    if (sheetName && startCell) {
      handleSheetChange(sheetName);

      const startColLetter = startCell.match(/[A-Z]+/)?.[0] || "A";
      const startRowNumber = parseInt(startCell.match(/\d+/)?.[0] || "1", 10);
      const startCol = excelColToZeroIndex(startColLetter);
      const startRow = startRowNumber;

      let endCol = startCol;
      let endRow = startRow;

      if (endCell) {
        const endColLetter = endCell.match(/[A-Z]+/)?.[0] || "A";
        const endRowNumber = parseInt(endCell.match(/\d+/)?.[0] || "1", 10);
        endCol = excelColToZeroIndex(endColLetter);
        endRow = endRowNumber;
      }

      const newSelection = {
        sheet: sheetName,
        start: { row: startRow, col: startCol },
        end: { row: endRow, col: endCol },
      };
      setSelections([newSelection]); // Set this as the only selection
      anchorSelectionStart.current = newSelection.start; // Update anchor
      setIsNamedRangesDialogOpen(false); // Close dialog after selection
    }
  };

  const handleCreateNamedRange = () => {
    const currentSelection =
      selections.length > 0 ? selections[selections.length - 1] : null;

    if (!currentSelection || !newNamedRangeName || !newNamedRangeRange) return;

    const rangeRegex = /^[^!]+!([A-Z]+)(\d+)(:([A-Z]+)(\d+))?$/;
    if (!rangeRegex.test(newNamedRangeRange)) {
      toast({
        variant: "destructive",
        title: "Invalid Range Format",
        description: "Please use format like 'Sheet1!A1' or 'Sheet1!A1:B5'",
      });
      return;
    }

    const newNamedRange = {
      name: newNamedRangeName,
      range: newNamedRangeRange,
    };

    onCreateNamedRange(workbook.id, newNamedRange);
    setNewNamedRangeName("");
    setNewNamedRangeRange("");
    setIsCreateNamedRangeOpen(false);
  };

  const handleEditNamedRange = (namedRange: NamedRange) => {
    setEditingNamedRange(namedRange);
    setNewNamedRangeName(namedRange.name);
    setNewNamedRangeRange(namedRange.range); // Set the range of the named range being edited
    setIsEditNamedRangeOpen(true);
  };

  const handleUpdateNamedRange = () => {
    if (!editingNamedRange || !newNamedRangeName || !newNamedRangeRange) return;

    const rangeRegex = /^[^!]+!([A-Z]+)(\d+)(:([A-Z]+)(\d+))?$/;
    if (!rangeRegex.test(newNamedRangeRange)) {
      toast({
        variant: "destructive",
        title: "Invalid Range Format",
        description: "Please use format like 'Sheet1!A1' or 'Sheet1!A1:B5'",
      });
      return;
    }

    const newNamedRange = {
      name: newNamedRangeName,
      range: newNamedRangeRange,
    };

    onUpdateNamedRange(workbook.id, editingNamedRange._id, newNamedRange);

    setEditingNamedRange(null);
    setNewNamedRangeName("");
    setNewNamedRangeRange("");
    setIsEditNamedRangeOpen(false);
  };

  const handleDeleteNamedRange = (namedRangeId: string) => {
    onDeleteNamedRange(workbook.id, namedRangeId);
  };


  // Get context-aware labels based on rowType
  const getContextLabels = () => {
    switch (rowType) {
      case 'working-paper':
        return {
          tableTitle: 'Working Papers',
          mappingsButton: 'Working Paper Mappings',
          mapToButton: 'Map to Working Paper',
          noDataMessage: 'No Working Paper data found for this classification.',
          rowLabel: 'Working Paper Row',
          dataType: 'Working Paper'
        };
      case 'evidence':
        return {
          tableTitle: 'Evidence Files',
          mappingsButton: 'Evidence Mappings',
          mapToButton: 'Map to Evidence',
          noDataMessage: 'No Evidence data found.',
          rowLabel: 'Evidence File',
          dataType: 'Evidence'
        };
      default: // 'etb'
        return {
          tableTitle: 'Lead Sheet',
          mappingsButton: 'Lead Sheet Mappings',
          mapToButton: 'Map to Lead Sheet',
          noDataMessage: 'No Extended Trial Balance data found for this classification.',
          rowLabel: 'ETB Row',
          dataType: 'ETB'
        };
    }
  };

  const handleDeleteETBMapping = async (mappingId: string, rowCode: string) => {
    const labels = getContextLabels();
    if (!engagementId && rowType !== 'evidence') {
      toast({
        title: "Error",
        description: "Engagement ID is required",
        variant: "destructive",
      });
      return;
    }

    const { identifier: resolvedRowId } = getRowLookupByCode(rowCode);
    const effectiveRowId = resolvedRowId || rowCode;

    try {
      // Use the appropriate API based on rowType
      if (rowType === 'working-paper' && classification) {
        if (!effectiveRowId) {
          throw new Error('Unable to resolve Working Paper row identifier.');
        }
        await removeMappingFromWPRow(engagementId, classification, effectiveRowId, mappingId);
        
        // Update etbData IMMEDIATELY by removing the mapping (local state update only)
        setEtbData(prev => {
          if (!prev) return prev;
          
          const updatedRows = prev.rows.map(row => {
            if (row.code === rowCode) {
              return {
                ...row,
                mappings: row.mappings?.filter(m => m._id !== mappingId) || []
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
        
        console.log('✅ Working Paper mapping deleted and UI updated immediately (local state only)');
      } else if (rowType === 'evidence') {
        // For Evidence, rowCode is the evidenceId
        const evidenceId = rowCode;
        await removeMappingFromEvidence(evidenceId, mappingId);
        
        // After deletion, re-fetch evidence with mappings to update UI immediately
        try {
          const refreshedEvidence = await getEvidenceWithMappings(evidenceId);
          
          // Update local etbData state with refreshed evidence
          setEtbData(prev => {
            if (!prev) return prev;
            const rowsWithoutEvidence = prev.rows.filter(row => row.code !== evidenceId);
            const evidenceRow = prev.rows.find(row => row.code === evidenceId);
            
            if (!evidenceRow) return prev;
            
            const normalizedRows = refreshedEvidence
              ? [
                  ...rowsWithoutEvidence,
                  {
                    ...evidenceRow,
                    mappings:
                      refreshedEvidence.mappings?.map((mapping: any) => ({
                        ...mapping,
                        workbookId:
                          typeof mapping.workbookId === 'object'
                            ? mapping.workbookId
                            : {
                                _id: mapping.workbookId,
                                name: 'Unknown Workbook'
                              },
                        isActive: mapping.isActive !== false
                      })) || []
                  }
                ]
              : prev.rows.filter(row => row.code !== evidenceId);
            
            return {
              ...prev,
              rows: normalizedRows,
              _updateTimestamp: Date.now()
            } as any;
          });
          
          // Notify parent component about the update
          onEvidenceMappingUpdated?.(refreshedEvidence);
          console.log('✅ Evidence mapping deleted and UI updated immediately');
        } catch (refreshErr) {
          console.error('ExcelViewer: Failed to refresh evidence data after deletion', refreshErr);
          // Still update local state optimistically even if refresh fails
          setEtbData(prev => {
            if (!prev) return prev;
            const updatedRows = prev.rows.map(row => {
              if (row.code === rowCode) {
                return {
                  ...row,
                  mappings: row.mappings?.filter(m => m._id !== mappingId) || []
                };
              }
              return row;
            });
            return {
              ...prev,
              rows: updatedRows,
              _updateTimestamp: Date.now()
            } as any;
          });
        }
      } else {
        // ETB (Lead Sheet) mapping
        await removeMappingFromRow(engagementId, effectiveRowId, mappingId);
        
        // Update etbData IMMEDIATELY by removing the mapping (local state update only)
        setEtbData(prev => {
          if (!prev) return prev;
          
          const updatedRows = prev.rows.map(row => {
            if (row.code === rowCode) {
              return {
                ...row,
                mappings: row.mappings?.filter(m => m._id !== mappingId) || []
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
        
        console.log('✅ Lead Sheet mapping deleted and UI updated immediately (local state only)');
      }

      // DO NOT call onRefreshETBData() or onRefreshParentData() for Lead Sheet and Working Papers
      // The local state update is enough for ExcelViewer to re-render
      // This prevents unnecessary parent component re-renders

      toast({
        title: "Success",
        description: `${labels.dataType} mapping deleted successfully`,
      });
    } catch (error) {
      const labels = getContextLabels();
      console.error(`Error deleting ${labels.dataType} mapping:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to delete ${labels.dataType} mapping`,
        variant: "destructive",
      });
    }
  };

  const handleUpdateETBMapping = async (mappingId: string, currentRowCode: string, newRowCode: string, updateData: UpdateMappingRequest) => {
    if (!engagementId) {
      toast({
        title: "Error",
        description: "Engagement ID is required",
        variant: "destructive",
      });
      return;
    }

    const { identifier: currentRowId } = getRowLookupByCode(currentRowCode);
    const { identifier: newRowId } = getRowLookupByCode(newRowCode);
    const effectiveCurrentRowId = currentRowId || currentRowCode;
    const effectiveNewRowId = newRowId || newRowCode;

    try {
      const labels = getContextLabels();
      
      // Use the appropriate API based on rowType
      if (rowType === 'working-paper' && classification) {
        if (!effectiveCurrentRowId) {
          throw new Error('Unable to resolve Working Paper row identifier.');
        }
        // If the row changed, we need to first delete from old row and then add to new row
        if (newRowCode !== currentRowCode) {
          if (!effectiveNewRowId) {
            throw new Error('Unable to resolve Working Paper target row identifier.');
          }
          // First, delete from old row
          await removeMappingFromWPRow(engagementId, classification, effectiveCurrentRowId, mappingId);

          // Get the mapping details
          const mapping = editingETBMapping;
          if (mapping && updateData.details) {
            // Create a new mapping with updated details in the new row
            const mappingData: CreateMappingRequest = {
              workbookId: typeof mapping.workbookId === 'object' ? mapping.workbookId._id : mapping.workbookId,
              color: updateData.color || mapping.color,
              details: updateData.details
            };
            
            // Update local etbData optimistically: remove from old row
            setEtbData(prev => {
              if (!prev) return prev;
              const updatedRows = prev.rows.map(row => {
                if (row.code === currentRowCode) {
                  // Remove mapping from old row
                  return {
                    ...row,
                    mappings: row.mappings?.filter(m => m._id !== mappingId) || []
                  };
                }
                return row;
              });
              return {
                ...prev,
                rows: updatedRows,
                _updateTimestamp: Date.now()
              } as any;
            });
            
            // Add mapping to new row (backend will create new mapping with new ID)
            const wpData = await addMappingToWPRow(engagementId, classification, effectiveNewRowId, mappingData);
            
            // Update local etbData with the response from backend (includes new mapping with new ID)
            if (wpData?.rows) {
              setEtbData(prev => {
                if (!prev) return prev;
                // Find the new row's data from the backend response
                const backendNewRow = wpData.rows.find((r: any) => r.code === newRowCode || r._id === effectiveNewRowId);
                
                if (backendNewRow?.mappings) {
                  // Replace mappings for the new row with backend data to get correct IDs
                  const updatedRows = prev.rows.map(row => {
                    if (row.code === newRowCode) {
                      const normalizedMappings = backendNewRow.mappings.map((m: any) => ({
                        ...m,
                        workbookId: typeof m.workbookId === 'object' 
                          ? m.workbookId 
                          : {
                              _id: m.workbookId,
                              name: 'Unknown Workbook'
                            },
                        isActive: m.isActive !== false
                      }));
                      return {
                        ...row,
                        mappings: normalizedMappings
                      };
                    }
                    return row;
                  });
                  return {
                    ...prev,
                    rows: updatedRows,
                    _updateTimestamp: Date.now()
                  } as any;
                }
                return prev;
              });
            }
            console.log('✅ Working Paper mapping moved between rows and UI updated immediately (local state only)');
          }
        } else {
          // Just update the existing mapping in the same row
          await updateWPMapping(engagementId, classification, effectiveCurrentRowId, mappingId, updateData);
          
          // Update local etbData immediately
          setEtbData(prev => {
            if (!prev) return prev;
            const updatedRows = prev.rows.map(row => {
              if (row.code === currentRowCode) {
                return {
                  ...row,
                  mappings: row.mappings?.map(m => 
                    m._id === mappingId 
                      ? { ...m, ...updateData, _id: mappingId }
                      : m
                  ) || []
                };
              }
              return row;
            });
            return {
              ...prev,
              rows: updatedRows,
              _updateTimestamp: Date.now()
            } as any;
          });
          console.log('✅ Working Paper mapping updated and UI updated immediately (local state only)');
        }
      } else if (rowType === 'evidence') {
        // For Evidence, currentRowCode is the evidenceId
        // Evidence doesn't support changing evidence files, only updating mapping details
        if (newRowCode !== currentRowCode) {
          throw new Error('Cannot move mappings between evidence files. Please delete and create a new mapping.');
        }
        const evidenceId = currentRowCode;
        await updateEvidenceMapping(evidenceId, mappingId, updateData);
        
        // After update, re-fetch evidence with mappings to update UI immediately
        try {
          const refreshedEvidence = await getEvidenceWithMappings(evidenceId);
          
          // Update local etbData state with refreshed evidence
          setEtbData(prev => {
            if (!prev) return prev;
            const rowsWithoutEvidence = prev.rows.filter(row => row.code !== evidenceId);
            const evidenceRow = prev.rows.find(row => row.code === evidenceId);
            
            if (!evidenceRow) return prev;
            
            const normalizedRows = refreshedEvidence
              ? [
                  ...rowsWithoutEvidence,
                  {
                    ...evidenceRow,
                    mappings:
                      refreshedEvidence.mappings?.map((mapping: any) => ({
                        ...mapping,
                        workbookId:
                          typeof mapping.workbookId === 'object'
                            ? mapping.workbookId
                            : {
                                _id: mapping.workbookId,
                                name: 'Unknown Workbook'
                              },
                        isActive: mapping.isActive !== false
                      })) || []
                  }
                ]
              : prev.rows;
            
            return {
              ...prev,
              rows: normalizedRows,
              _updateTimestamp: Date.now()
            } as any;
          });
          
          // Notify parent component about the update
          onEvidenceMappingUpdated?.(refreshedEvidence);
          console.log('✅ Evidence mapping updated and UI updated immediately');
        } catch (refreshErr) {
          console.error('ExcelViewer: Failed to refresh evidence data after update', refreshErr);
          // Still update local state optimistically even if refresh fails
          setEtbData(prev => {
            if (!prev) return prev;
            const updatedRows = prev.rows.map(row => {
              if (row.code === currentRowCode) {
                return {
                  ...row,
                  mappings: row.mappings?.map(m => 
                    m._id === mappingId 
                      ? { ...m, ...updateData, _id: mappingId }
                      : m
                  ) || []
                };
              }
              return row;
            });
            return {
              ...prev,
              rows: updatedRows,
              _updateTimestamp: Date.now()
            } as any;
          });
        }
      } else {
        // ETB (Lead Sheet) logic
        if (newRowCode !== currentRowCode) {
          // First, delete from old row
          await removeMappingFromRow(engagementId, effectiveCurrentRowId, mappingId);

          // Get the mapping details
          const mapping = editingETBMapping;
          if (mapping && updateData.details) {
            // Create a new mapping with updated details in the new row
            const mappingData: CreateMappingRequest = {
              workbookId: typeof mapping.workbookId === 'object' ? mapping.workbookId._id : mapping.workbookId,
              color: updateData.color || mapping.color,
              details: updateData.details
            };
            
            // Update local etbData optimistically: remove from old row
            setEtbData(prev => {
              if (!prev) return prev;
              const updatedRows = prev.rows.map(row => {
                if (row.code === currentRowCode) {
                  // Remove mapping from old row
                  return {
                    ...row,
                    mappings: row.mappings?.filter(m => m._id !== mappingId) || []
                  };
                }
                return row;
              });
              return {
                ...prev,
                rows: updatedRows,
                _updateTimestamp: Date.now()
              } as any;
            });
            
            // Add mapping to new row (backend will create new mapping with new ID)
            const etbDataResponse = await addMappingToRow(engagementId, effectiveNewRowId, mappingData);
            
            // Update local etbData with the response from backend (includes new mapping with new ID)
            if (etbDataResponse?.rows) {
              setEtbData(prev => {
                if (!prev) return prev;
                // Find the new row's data from the backend response
                const backendNewRow = etbDataResponse.rows.find((r: any) => r.code === newRowCode || r._id === effectiveNewRowId);
                
                if (backendNewRow?.mappings) {
                  // Replace mappings for the new row with backend data to get correct IDs
                  const updatedRows = prev.rows.map(row => {
                    if (row.code === newRowCode) {
                      const normalizedMappings = backendNewRow.mappings.map((m: any) => ({
                        ...m,
                        workbookId: typeof m.workbookId === 'object' 
                          ? m.workbookId 
                          : {
                              _id: m.workbookId,
                              name: 'Unknown Workbook'
                            },
                        isActive: m.isActive !== false
                      }));
                      return {
                        ...row,
                        mappings: normalizedMappings
                      };
                    }
                    return row;
                  });
                  return {
                    ...prev,
                    rows: updatedRows,
                    _updateTimestamp: Date.now()
                  } as any;
                }
                return prev;
              });
            }
            console.log('✅ Lead Sheet mapping moved between rows and UI updated immediately (local state only)');
          }
        } else {
          // Just update the existing mapping in the same row
          await updateMapping(engagementId, effectiveCurrentRowId, mappingId, updateData);
          
          // Update local etbData immediately
          setEtbData(prev => {
            if (!prev) return prev;
            const updatedRows = prev.rows.map(row => {
              if (row.code === currentRowCode) {
                return {
                  ...row,
                  mappings: row.mappings?.map(m => 
                    m._id === mappingId 
                      ? { ...m, ...updateData, _id: mappingId }
                      : m
                  ) || []
                };
              }
              return row;
            });
            return {
              ...prev,
              rows: updatedRows,
              _updateTimestamp: Date.now()
            } as any;
          });
          console.log('✅ Lead Sheet mapping updated and UI updated immediately (local state only)');
        }
      }

      // DO NOT call onRefreshETBData() or onRefreshParentData() for Lead Sheet and Working Papers
      // The local state update is enough for ExcelViewer to re-render
      // This prevents unnecessary parent component re-renders

      // ✅ CRITICAL FIX: Refresh mappings for this workbook (for workbook mappings dialog)
      if (onRefreshMappings) {
        console.log('ExcelViewer: Refreshing workbook mappings after update');
        await onRefreshMappings(workbook.id);
        
        // Force dialog to re-render with updated mappings
        setMappingsDialogRefreshKey(prev => prev + 1);
      }

      // Reset editing state
      setEditingETBMapping(null);
      setIsEditETBMappingOpen(false);

      toast({
        title: "Success",
        description: `${labels.dataType} mapping updated successfully`,
      });
    } catch (error) {
      const labels = getContextLabels();
      console.error(`Error updating ${labels.dataType} mapping:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to update ${labels.dataType} mapping`,
        variant: "destructive",
      });
    }
  };

  const handleCreateETBMapping = async () => {
    const engagementId = (props as any).engagementId;
    const classification = (props as any).classification;
    const rowType = (props as any).rowType || 'etb';
    const workbook = props.workbook;
    const onRefreshETBData = (props as any).onRefreshETBData;
    const onRefreshParentData = (props as any).onRefreshParentData;
  
    if (!selectedETBRow || !engagementId) {
      toast({
        title: "Error",
        description: `Please select a ${rowType === 'working-paper' ? 'Working Paper' : 'ETB'} row`,
        variant: "destructive",
      });
      return;
    }
  
    const currentSelection = selections.length > 0 ? selections[selections.length - 1] : null;
    if (!currentSelection) {
      toast({
        title: "Error",
        description: "Please select a range in the sheet",
        variant: "destructive",
      });
      return;
    }
  
    setIsCreatingETBMapping(true);
  
    try {
      const rowIdentifier = resolveRowIdentifier(selectedETBRow, selectedETBRow?.code);
      if (!rowIdentifier && rowType !== 'evidence') {
        throw new Error('Unable to determine row identifier for mapping.');
      }

      // Upload reference files if any were selected
      let referenceFiles: any[] = [];
      if (mappingFilesToUpload && mappingFilesToUpload.length > 0) {
        console.log('📤 Uploading mapping reference files:', mappingFilesToUpload.length);
        setIsUploadingMappingFiles(true);
        setUploadProgress({});
        
        try {
          // Get current user info - try to get from props or use default
          const userInfo = { name: 'Current User' }; // TODO: Get from auth context if available
          
          // Show initial toast
          toast({
            title: "Uploading Files",
            description: `Uploading ${mappingFilesToUpload.length} file(s)...`,
          });
          
          const uploadPromises = mappingFilesToUpload.map(async (file, index) => {
            try {
              setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
              
              const validation = validateFile(file);
              if (!validation.isValid) {
                throw new Error(validation.error || 'Invalid file');
              }
              
              setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));
              const uploadResult = await uploadFileToStorage(file);
              setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
              
              return {
                fileName: uploadResult.fileName || file.name,
                fileUrl: uploadResult.url,
                uploadedAt: new Date().toISOString(),
                uploadedBy: userInfo.name
              };
            } catch (error) {
              console.error(`Error uploading file ${file.name}:`, error);
              setUploadProgress(prev => ({ ...prev, [file.name]: -1 })); // -1 indicates error
              throw error;
            }
          });
          
          referenceFiles = await Promise.all(uploadPromises);
          console.log('✅ Mapping reference files uploaded:', referenceFiles.length);
          
          toast({
            title: "Upload Complete",
            description: `Successfully uploaded ${referenceFiles.length} file(s)`,
          });
        } catch (uploadError) {
          console.error('Error uploading mapping reference files:', uploadError);
          const successfulUploads = referenceFiles.length;
          const failedUploads = mappingFilesToUpload.length - successfulUploads;
          
          toast({
            variant: "destructive",
            title: "Upload Error",
            description: failedUploads > 0 
              ? `Failed to upload ${failedUploads} file(s). ${successfulUploads > 0 ? `${successfulUploads} file(s) uploaded successfully.` : ''} Mapping will be created with uploaded files only.`
              : "Failed to upload reference files. Mapping will be created without them.",
          });
          // Continue with mapping creation even if file upload fails
        } finally {
          setIsUploadingMappingFiles(false);
          setUploadProgress({});
        }
      }

      const mappingData: CreateMappingRequest = {
        workbookId: workbook.id,
        color: generateColor(),
        details: {
          sheet: currentSelection.sheet,
          start: {
            row: currentSelection.start.row,
            col: currentSelection.start.col,
          },
          end: {
            row: currentSelection.end.row,
            col: currentSelection.end.col,
          },
        },
        referenceFiles: referenceFiles.length > 0 ? referenceFiles : undefined,
      } as any; // Type assertion needed as CreateMappingRequest may not have referenceFiles yet
  
      console.log('ExcelViewer (main): Creating mapping:', {
        rowType,
        rowCode: selectedETBRow.code,
        rowName: selectedETBRow.accountName,
        mappingData,
        classification
      });
  
      // Call the appropriate API based on rowType
      let mappingResult;
      if (rowType === 'working-paper') {
        if (!classification) {
          throw new Error('Classification is required for Working Paper mappings');
        }
        await addMappingToWPRow(engagementId, classification, rowIdentifier as string, mappingData);
        console.log('✅ Working Paper mapping created successfully');
        
        // Update linkedExcelFiles array
        const wpData = await getWorkingPaperWithLinkedFiles(engagementId, classification);
        const currentRow = wpData.rows.find((r: any) => r.code === selectedETBRow.code);
        const existingLinkedFileIds = currentRow?.linkedExcelFiles?.map((wb: any) => wb._id || wb) || [];
        
        if (!existingLinkedFileIds.includes(workbook.id)) {
          const updatedLinkedFiles = [...existingLinkedFileIds, workbook.id];
          await updateLinkedExcelFilesInWP(engagementId, classification, rowIdentifier as string, updatedLinkedFiles);
          console.log('✅ Working Paper linkedExcelFiles updated');
        }
        
      } else if (rowType === 'evidence') {
        // For Evidence, selectedETBRow.code is the evidenceId
        const evidenceId = selectedETBRow.code;
        console.log('ExcelViewer: Creating Evidence mapping for evidenceId:', evidenceId);
        
        if (!workbook?.id) {
          throw new Error('A workbook must be selected before creating an Evidence mapping.');
        }

        const evidenceMappingData: EvidenceCreateMappingRequest = {
          workbookId: workbook.id,
          color: mappingData.color,
          details: mappingData.details
        };
        
        mappingResult = await addMappingToEvidence(evidenceId, evidenceMappingData);
        console.log('✅ Evidence mapping created successfully');
        
        // Always call linkWorkbookToEvidence - backend handles duplicates gracefully
        // and returns the updated evidence with populated linkedWorkbooks
        let linkedEvidenceResult: any = null;
        try {
          linkedEvidenceResult = await linkWorkbookToEvidence(evidenceId, workbook.id);
          console.log('✅ Workbook linked to Evidence successfully (or already linked)');
          
          // Update UI IMMEDIATELY with the response from linkWorkbookToEvidence
          // Backend always returns populated evidence, even if already linked
          if (linkedEvidenceResult) {
            onEvidenceMappingUpdated?.(linkedEvidenceResult);
            console.log('✅ UI updated immediately with linked workbook');
          }
        } catch (linkError) {
          console.error('ExcelViewer: Error linking workbook to evidence:', linkError);
          // Continue even if linking fails - mapping was created successfully
        }

        // Also re-fetch evidence with mappings to ensure we have the latest data (includes mappings)
        let refreshedEvidence: any = null;
        try {
          refreshedEvidence = await getEvidenceWithMappings(evidenceId);
          // Update UI again with the full evidence data (includes both mappings and linkedWorkbooks)
          onEvidenceMappingUpdated?.(refreshedEvidence);
          mappingResult = refreshedEvidence;
          console.log('✅ UI updated with full evidence data (mappings + linkedWorkbooks)');
        } catch (refreshError) {
          console.error('ExcelViewer: Failed to fetch refreshed evidence after mapping creation', refreshError);
          // If refresh fails but we have linkedEvidenceResult, use it to update mappings
          if (linkedEvidenceResult && mappingResult) {
            const updatedEvidence = {
              ...linkedEvidenceResult,
              mappings: mappingResult.mappings || linkedEvidenceResult.mappings || []
            };
            onEvidenceMappingUpdated?.(updatedEvidence);
          }
        }
        
      } else {
        // ETB mapping
        await addMappingToRow(engagementId, rowIdentifier as string, mappingData);
        console.log('✅ ETB mapping created successfully');
        
        // Update linkedExcelFiles array
        const etbRowClassification = etbData?.rows.find(r => r.code === selectedETBRow.code)?.classification || classification;
        const etbLinkedData = await getExtendedTBWithLinkedFiles(engagementId, etbRowClassification);
        const etbCurrentRow = etbLinkedData.rows.find((r: any) => r.code === selectedETBRow.code);
        const etbExistingLinkedFileIds = etbCurrentRow?.linkedExcelFiles?.map((wb: any) => wb._id || wb) || [];
        
        if (!etbExistingLinkedFileIds.includes(workbook.id)) {
          const etbUpdatedLinkedFiles = [...etbExistingLinkedFileIds, workbook.id];
          await updateLinkedExcelFilesInExtendedTB(engagementId, etbRowClassification, rowIdentifier as string, etbUpdatedLinkedFiles);
          console.log('✅ ETB linkedExcelFiles updated');
        }
        
      }
  
      // CRITICAL FIX: Create a new mapping object with the same structure as existing mappings
      let newMapping = {
        _id: `temp-${Date.now()}`, // Temporary ID until refresh
        workbookId: {
          _id: workbook.id,
          name: workbook.name || 'Unknown Workbook'
        },
        color: mappingData.color,
        details: mappingData.details,
        isActive: true
      };

      let normalizedMappingsFromResult: any[] | null = null;
      if (rowType === 'evidence' && mappingResult?.mappings) {
        normalizedMappingsFromResult = mappingResult.mappings.map((mapping: any) => ({
          ...mapping,
          workbookId:
            mapping.workbookId && typeof mapping.workbookId === 'object'
              ? mapping.workbookId
              : {
                  _id: mapping.workbookId,
                  name: workbook.name || 'Unknown Workbook',
                },
          isActive: mapping.isActive !== false,
        }));

        if (normalizedMappingsFromResult.length > 0) {
          newMapping = normalizedMappingsFromResult[normalizedMappingsFromResult.length - 1];
        }
      }
  
      // CRITICAL FIX: Update etbData state immediately to trigger re-render
      setEtbData(prev => {
        if (!prev) return prev;
        
        const updatedRows = prev.rows.map(row => {
          if (row.code === selectedETBRow.code) {
            const updatedMappings = normalizedMappingsFromResult
              ? normalizedMappingsFromResult
              : [...(row.mappings || []), newMapping];
            return {
              ...row,
              mappings: updatedMappings
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

      // CRITICAL FIX: Update parent-selected workbook immediately if setter provided
      // CRITICAL FIX: Force a re-render of the ExcelViewer by updating a timestamp
      (workbook as any)._mappingsUpdateTimestamp = Date.now();
      
      // CRITICAL FIX: Force a re-render by updating a key prop
      // This ensures the component detects the change
      const onRefreshMappings = (props as any).onRefreshMappings;
      if (onRefreshMappings) {
        console.log('ExcelViewer (Wrapper): Refreshing mappings after creation');
        await onRefreshMappings(props.workbook.id);
        
        // Force dialog to re-render with updated mappings
        setMappingsDialogRefreshKey(prev => prev + 1);
      }
  
      // Reset form
      setSelectedETBRow(null);
      setMappingFilesToUpload([]); // Clear uploaded files
      setIsCreateETBMappingOpen(false);
  
      const successMessage = rowType === 'working-paper' ? 'Working Paper mapping created successfully' 
        : rowType === 'evidence' ? 'Evidence mapping created successfully'
        : 'ETB mapping created successfully';
      
      toast({
        title: "Success",
        description: successMessage,
      });
    } catch (error) {
      const errorMessage = rowType === 'working-paper' ? 'Working Paper'
        : rowType === 'evidence' ? 'Evidence'
        : 'ETB';
      console.error(`Error creating ${errorMessage} mapping:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to create ${errorMessage} mapping`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingETBMapping(false);
    }
  };

  const handleCreateWorkbookMapping = async () => {
    const currentSelection = selections.length > 0 ? selections[selections.length - 1] : null;
    if (!currentSelection) {
      toast({
        title: "Error",
        description: "Please select a range in the sheet",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingWorkbookMapping(true);

    try {
      // Fix: Access props correctly
      props.onCreateMapping(workbook.id, {
        sheet: currentSelection.sheet,
        start: {
          row: currentSelection.start.row,
          col: currentSelection.start.col,
        },
        end: {
          row: currentSelection.end.row,
          col: currentSelection.end.col,
        },
        color: generateColor(),
      });

      // Reset form
      setIsCreateWorkbookMappingOpen(false);

      toast({
        title: "Success",
        description: "Workbook mapping created successfully",
      });
    } catch (error) {
      console.error('Error creating workbook mapping:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create workbook mapping",
        variant: "destructive",
      });
    } finally {
      setIsCreatingWorkbookMapping(false);
    }
  };

  const renderHeader = () => (
    <header className="bg-white shadow-sm border-b px-4 py-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
      <div className="w-full flex flex-col space-y-5">
        <div className="flex items-center space-x-2 lg:space-x-4 flex-grow-0 mb-2 md:mb-0">

          <div>
            <h1 className="text-lg font-semibold">{workbook.name}</h1>
            <p className="text-xs text-gray-500">
              Version {workbook.version} • Last modified{" "}
              {workbook.lastModified || workbook.uploadedDate}
            </p>
          </div>
        </div>

        {/* Feature Box for Sheet, Actions, Named Ranges, Mappings */}
        <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md bg-gray-50 flex-grow-0 md:flex-grow min-w-full md:min-w-0 justify-between">
          {/* Sheet Selector with Title */}
          <div className="flex items-center space-x-2">
            <Label
              htmlFor="sheet-selector"
              className="text-sm font-medium text-gray-900"
            >
              Sheets:
            </Label>
            <Select value={selectedSheet} onValueChange={handleSheetChange}>
              <SelectTrigger
                id="sheet-selector"
                className="w-[120px] h-7 text-xs font-semibold px-2 py-0" // Adjusted width, height, text size, and padding
              >
                <SelectValue placeholder="Select Sheet" className="text-xs" />{" "}
                {/* Ensured SelectValue text is small */}
              </SelectTrigger>
              <SelectContent 
                className="max-h-[300px] !z-[9999]" 
                style={{ zIndex: 9999, position: 'fixed' }}
              >
                {sheetNames && sheetNames.length > 0 ? (
                  sheetNames.map((sheet) => (
                    <SelectItem
                      key={sheet}
                      value={sheet}
                      className="text-xs py-1"
                    >
                      {" "}
                      {/* Adjusted item text size and padding */}
                      {sheet}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-sheets" disabled>
                    No sheets available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            
            {/* ✅ NEW: Sheet List Dropdown Panel */}
            <DropdownMenu open={isSheetListOpen} onOpenChange={setIsSheetListOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <List className="h-3 w-3 mr-1" />
                  List
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="start" 
                className="w-56 max-h-[400px] overflow-y-auto !z-[9999]"
                style={{ zIndex: 9999 }}
              >
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>All Sheets ({sheetNames.length})</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Select All Checkbox */}
                <div className="px-2 py-1.5 flex items-center space-x-2 hover:bg-accent rounded-sm cursor-pointer">
                  <Checkbox
                    id="select-all-sheets"
                    checked={areAllSheetsSelected}
                    onCheckedChange={handleSelectAllSheets}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <label
                    htmlFor="select-all-sheets"
                    className="text-sm font-medium cursor-pointer flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAllSheets(!areAllSheetsSelected);
                    }}
                  >
                    Select All
                  </label>
                </div>
                
                <DropdownMenuSeparator />
                
                {/* Sheet List with Checkboxes */}
                {sheetNames && sheetNames.length > 0 ? (
                  sheetNames.map((sheet) => (
                    <div
                      key={sheet}
                      className="px-2 py-1.5 flex items-center space-x-2 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Also switch to this sheet when clicked
                        handleSheetChange(sheet);
                      }}
                    >
                      <Checkbox
                        id={`sheet-${sheet}`}
                        checked={selectedSheets.has(sheet)}
                        onCheckedChange={(checked) => {
                          handleSheetToggle(sheet, checked as boolean);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label
                        htmlFor={`sheet-${sheet}`}
                        className="text-sm cursor-pointer flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSheetToggle(sheet, !selectedSheets.has(sheet));
                        }}
                      >
                        {sheet}
                      </label>
                      {sheet === selectedSheet && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No sheets available
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>




          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
            onClick={() => {
              if (workbook.webUrl) {
                window.open(workbook.webUrl, "_blank"); // Open the workbook in a new tab
              } else {
                toast({
                  variant: "destructive",
                  title: "No Web URL",
                  description: "This workbook does not have a web URL to open.",
                });
              }
            }}
            disabled={!workbook.webUrl} // Disable if no webUrl
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Open Excel
          </Button>



          {onToggleFullscreen && (
            <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}



          <Button variant="outline" size="sm" onClick={() => updateSheetsInWorkbook(workbook.cloudFileId, workbook.id)}>
            <Upload className="h-4 w-4 mr-2" />
            Re&nbsp;load
          </Button>






          {/* Mappings Dialog Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsETBMappingsDialogOpen(true)}
          >
            <Code className="h-4 w-4 mr-2" /> Mappings
          </Button>
        </div>



      </div>
    </header>
  );




  // Old mappings dialog removed - now using separate ETB and Workbook dialogs

  // ETB Mappings Dialog Content
  const renderETBMappingsDialog = () => {
    const currentParentEtbData = (props as any).parentEtbData;
    console.log('ExcelViewer: 🔍 renderETBMappingsDialog called:', {
      hasParentData: !!currentParentEtbData,
      parentDataRows: currentParentEtbData?.rows?.length || 0,
      hasEtbData: !!etbData,
      etbDataRows: etbData?.rows?.length || 0,
      etbLoading,
      etbError
    });
    return (
      <Dialog open={isETBMappingsDialogOpen} onOpenChange={setIsETBMappingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{getContextLabels().mappingsButton}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {etbLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-sm text-gray-500">Loading {getContextLabels().dataType} mappings...</div>
              </div>
            ) : etbError ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-sm text-red-500">Error: {etbError}</div>
              </div>
            ) : !etbData || etbData.rows.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-sm text-gray-500">
                  {getContextLabels().noDataMessage}
                  {currentParentEtbData ? " (Parent data provided)" : " (No parent data)"}
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              {etbData.rows.map((row) => (
                <div key={row._id || row.code} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{row.code} - {row.accountName}</h3>
                      <p className="text-sm text-gray-600">Classification: {row.classification}</p>
                    </div>
                    <Badge variant="outline">{row.mappings?.length || 0} mapping(s)</Badge>
                  </div>

                  {!row.mappings || row.mappings.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No mappings for this row</p>
                  ) : (
                    <div className="space-y-2">
                      {row.mappings.map((mapping) => (
                        <div
                          key={mapping._id}
                          className={`p-3 rounded border-l-4 ${mapping.color || 'bg-gray-200'} bg-gray-50`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {mapping.isActive === false && <Badge variant="destructive">Inactive</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">
                                Range: {mapping.details?.sheet}!{mapping.details?.start && zeroIndexToExcelCol(mapping.details.start.col)}{mapping.details?.start?.row}
                                {mapping.details?.end &&
                                  (mapping.details.end.row !== mapping.details.start.row ||
                                    mapping.details.end.col !== mapping.details.start.col) &&
                                  `:${zeroIndexToExcelCol(mapping.details.end.col)}${mapping.details.end.row}`
                                }
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Workbook: {mapping.workbookId?.name || 'Unknown'}
                              </p>
                              {/* Show reference files count and button */}
                              {mapping.referenceFiles && mapping.referenceFiles.length > 0 && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {mapping.referenceFiles.length} reference file{mapping.referenceFiles.length !== 1 ? 's' : ''}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                      // Convert mapping reference files to ClassificationEvidence format for display
                                      const evidenceFiles: ClassificationEvidence[] = mapping.referenceFiles.map((refFile: any) => ({
                                        _id: `mapping-ref-${mapping._id}-${refFile.fileName}`,
                                        engagementId: (props as any).engagementId || '',
                                        classificationId: (props as any).classification || '',
                                        evidenceUrl: refFile.fileUrl,
                                        uploadedBy: refFile.uploadedBy ? {
                                          userId: '',
                                          name: typeof refFile.uploadedBy === 'string' ? refFile.uploadedBy : refFile.uploadedBy.name || 'Unknown',
                                          email: ''
                                        } : {
                                          userId: '',
                                          name: 'Unknown',
                                          email: ''
                                        },
                                        linkedWorkbooks: [],
                                        mappings: [],
                                        evidenceComments: [],
                                        createdAt: refFile.uploadedAt || new Date().toISOString(),
                                        updatedAt: refFile.uploadedAt || new Date().toISOString()
                                      }));
                                      setCellRangeEvidenceFiles(evidenceFiles);
                                      setIsReferenceFilesDialogOpen(true);
                                    }}
                                  >
                                    <Info className="h-3 w-3 mr-1" />
                                    View Files
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => selectMappingRange(mapping, { closeDialogs: true })}
                            >
                              Select
                            </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingETBMapping(mapping);
                                  setIsEditETBMappingOpen(true);
                                  setIsETBMappingsDialogOpen(false);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  handleDeleteETBMapping(mapping._id, row.code);
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsETBMappingsDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    );
  };

  // Workbook Mappings Dialog Content
  const renderWorkbookMappingsDialog = () => {
    // Log mappings state when dialog renders
    console.log('🎨 renderWorkbookMappingsDialog: Dialog rendering with mappings:', {
      isOpen: isWorkbookMappingsDialogOpen,
      mappingsCount: mappings.length,
      mappingsArray: mappings,
      workbookId: workbook.id,
      workbookName: workbook.name,
      mappingsTimestamp: (workbook as any)._mappingsUpdateTimestamp,
      refreshKey: mappingsDialogRefreshKey
    });
    
    // ✅ CRITICAL FIX: Add key to force re-render when mappings change
    const dialogKey = `workbook-mappings-${workbook.id}-${mappings.length}-${(workbook as any)._mappingsUpdateTimestamp || 0}-${mappingsDialogRefreshKey}-${mappingsRefreshKey || 0}`;
    console.log('🎨 Dialog key:', dialogKey);
    
    return (
      <Dialog key={dialogKey} open={isWorkbookMappingsDialogOpen} onOpenChange={setIsWorkbookMappingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Workbook Mappings ({mappings.length})</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {mappings.length === 0 ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-sm text-gray-500">
                  No workbook mappings available
                  <br />
                  <span className="text-xs text-gray-400 mt-1">
                    Create a mapping by selecting cells and choosing a row
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {mappings.map((mapping) => {
                  console.log('🎨 Rendering mapping:', mapping);
                  return (
                    <div
                      key={`${mapping._id}-${(workbook as any)._mappingsUpdateTimestamp || 0}`}
                      className={`p-3 rounded border-l-4 ${mapping.color || 'bg-gray-200'} bg-gray-50`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">
                              {(mapping as any).workbookId?.name || workbook.name || 'Unknown Workbook'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            Range: {mapping.details?.sheet}!{mapping.details?.start && zeroIndexToExcelCol(mapping.details.start.col)}{mapping.details?.start?.row}
                            {mapping.details?.end &&
                              (mapping.details.end.row !== mapping.details.start.row ||
                                mapping.details.end.col !== mapping.details.start.col) &&
                              `:${zeroIndexToExcelCol(mapping.details.end.col)}${mapping.details.end.row}`
                            }
                          </p>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => selectMappingRange(mapping, { closeDialogs: true })}
                          >
                            Select
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingWorkbookMapping(mapping);
                              setIsEditWorkbookMappingOpen(true);
                              setIsWorkbookMappingsDialogOpen(false);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              onDeleteMapping(workbook.id, mapping._id);
                              // Force dialog refresh after deletion
                              setMappingsDialogRefreshKey(prev => prev + 1);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWorkbookMappingsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Save Confirmation Dialog
  const renderSaveDialog = () => (
    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Save {saveType === "workbook" ? "Workbook" : "Sheet"} to Database
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>What will be saved:</Label>
            <div className="p-3 bg-gray-50 rounded-md space-y-2">
              {saveType === "workbook" ? (
                <>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Workbook: {workbook?.name}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>All Sheets: {sheetNames.length} sheet(s)</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Version: {workbook?.version}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mt-2">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span>
                      Total rows:{" "}
                      {Object.values(sheetData).reduce(
                        (sum, sheet) =>
                          sum + (sheet.length > 0 ? sheet.length - 1 : 0),
                        0
                      )}{" "}
                      (excluding header rows)
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Sheet: {selectedSheet}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Workbook: {workbook?.name}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600 mt-2">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span>
                      Total rows:{" "}
                      {sheetData[selectedSheet]?.length > 0
                        ? sheetData[selectedSheet].length - 1
                        : 0}{" "}
                      (excluding header row)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {isSaving && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">
                Saving to database...
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsSaveDialogOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveConfirm} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                Confirm Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Check if sheet is currently loading
  const isSheetLoading = (sheetDataCacheProp as Map<string, any>).size > 0 && !currentSheetData?.length;

  const renderSpreadsheet = () => {
    if (isLoadingWorkbookData) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg shadow">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-700">Loading workbook...</p>
        </div>
      );
    }

    // Check if sheet is loading from cache
    if (loadingSheets.has(selectedSheet)) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg shadow">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-gray-700">Loading sheet data...</p>
        </div>
      );
    }

    if (!currentSheetData || currentSheetData.length === 0 || currentSheetData[0]?.length === 0) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg shadow">
          <p className="text-gray-500">No data available for this sheet.</p>
        </div>
      );
    }

    const columnHeaders = currentSheetData[0];
    const dataRows = currentSheetData.slice(1);

    return (
      <>
        <div 
          ref={spreadsheetContainerRef}
          className="w-full bg-white rounded-lg shadow overflow-auto mb-1 scrollbar-hide-y"
          style={{ 
            maxHeight: 'calc(100vh - 250px)', // Adjust based on your layout
            overflowX: 'auto', // Ensure horizontal scrolling is enabled
            overflowY: 'auto',
            scrollbarWidth: 'none', /* For Firefox */
            msOverflowStyle: 'none' /* IE and Edge */
          } as React.CSSProperties}
        >
          <style>{`
            .scrollbar-hide-y::-webkit-scrollbar {
              display: none; /* Safari and Chrome */
            }
          `}</style>
          <Table className="border-collapse">
            <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
              <TableRow>
                {columnHeaders.map((header, excelGridColIndex) => (
                  <TableHead
                    key={excelGridColIndex}
                    className={getCellClassName(0, excelGridColIndex)}
                  >
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataRows.map((row, dataRowArrayIndex) => {
                const excelGridRowIndex = dataRowArrayIndex + 1;

                return (
                  <TableRow key={dataRowArrayIndex}>
                    {row.map((cell, excelGridColIndex) => {
                      const isHeaderCell =
                        excelGridColIndex === 0 || excelGridRowIndex === 0;

                      const mapping = allMappings.find(
                        (m) =>
                          m.details &&
                          m.details.sheet === selectedSheet &&
                          excelGridRowIndex >= m.details.start.row &&
                          excelGridRowIndex <=
                          (m.details.end?.row ?? m.details.start.row) &&
                          excelGridColIndex - 1 >= m.details.start.col &&
                          excelGridColIndex - 1 <=
                          (m.details.end?.col ?? m.details.start.col)
                      );

                      // Determine if this is the *first* cell of the mapping
                      const isFirstCellOfMapping =
                        mapping &&
                        excelGridRowIndex === mapping.details.start.row &&
                        excelGridColIndex - 1 === mapping.details.start.col;
                      
                      // Debug logging for mappings with reference files
                      if (mapping && isFirstCellOfMapping && mapping.referenceFiles && mapping.referenceFiles.length > 0) {
                        console.log('🟢 Mapping with reference files found at cell:', {
                          cellRow: excelGridRowIndex,
                          cellCol: excelGridColIndex - 1,
                          mappingId: mapping._id,
                          referenceFilesCount: mapping.referenceFiles.length,
                          referenceFiles: mapping.referenceFiles.map((rf: any) => ({
                            fileName: rf.fileName,
                            fileUrl: rf.fileUrl
                          }))
                        });
                      }

                      return (
                        <TableCell
                          key={excelGridColIndex}
                          className={getCellClassName(
                            excelGridRowIndex,
                            excelGridColIndex
                          )}
                          onMouseDown={(event) =>
                            handleMouseDown(
                              excelGridRowIndex,
                              excelGridColIndex,
                              event
                            )
                          }
                          onMouseEnter={(e) => {
                            handleMouseEnter(excelGridRowIndex, excelGridColIndex);
                            
                            // ✅ IMPROVED: Update mouse position for smooth auto-scrolling
                            // The actual scrolling is handled by the requestAnimationFrame loop above
                            // This just updates the mouse position so the scroll loop knows where to scroll
                            if (isSelecting && e.buttons === 1) {
                              // Update both ref (for immediate access) and state (for React updates)
                              currentMousePositionRef.current = { x: e.clientX, y: e.clientY };
                              setMousePosition({ x: e.clientX, y: e.clientY });
                            }
                          }}
                        >
                          <span className="whitespace-nowrap">{cell}</span>

                          {/* invisible but occupying enough space for the title */}
                          {mapping &&
                            !isHeaderCell &&
                            isFirstCellOfMapping && ( // <--- MODIFIED CONDITION HERE
                              <span
                                className={`invisible text-[15px] text-nowrap whitespace-nowrap font-semibold text-red-500 px-1 rounded-sm ${mapping.color.replace(
                                  "bg-",
                                  "bg-"
                                )}`}
                                style={{
                                  transform: "scale(0.8)",
                                  transformOrigin: "top left",
                                }} // Smaller text size
                              >
                                Mapping
                              </span>
                            )}

                          {/* end invisible but occupying enough space for the title */}
                          {/* visible title */}
                          {mapping &&
                            !isHeaderCell &&
                            isFirstCellOfMapping && ( // <--- MODIFIED CONDITION HERE
                              <div className="absolute top-0 left-0 w-full h-full flex items-start justify-start p-1 pointer-events-none">
                                <span
                                  className={`text-[15px] font-semibold text-nowrap whitespace-nowrap text-red-500 px-1 rounded-sm ${mapping.color.replace(
                                    "bg-",
                                    "bg-"
                                  )}`}
                                  style={{
                                    transform: "scale(0.8)",
                                    transformOrigin: "top left",
                                  }} // Smaller text size
                                >
                                  Mapping
                                </span>
                              </div>
                            )}
                          {/* end visible title */}

                          {/* References title for cells with reference files (separate from mappings) */}
                          {/* Show on ALL cells in reference range, not just first cell */}
                          {!mapping &&
                            !isHeaderCell &&
                            excelGridColIndex > 0 &&
                            excelGridRowIndex > 0 && (
                              (() => {
                                const cellRow = excelGridRowIndex;
                                const cellCol = excelGridColIndex - 1;
                                
                                // Check if this cell is in a reference file range (from workbook.referenceFiles)
                                const referenceFiles = (workbook.referenceFiles || []).filter((ref: any) => {
                                  if (!ref || typeof ref !== 'object' || !ref.details) return false;
                                  if (ref.details.sheet !== selectedSheet) return false;
                                  
                                  const { start, end } = ref.details;
                                  if (!start || typeof start.row !== 'number' || typeof start.col !== 'number') {
                                    return false;
                                  }

                                  const startRow = start.row;
                                  const endRow = (end && typeof end.row === 'number') ? end.row : start.row;
                                  const startCol = start.col;
                                  const endCol = (end && typeof end.col === 'number') ? end.col : start.col;
                                  
                                  return (
                                    cellRow >= startRow &&
                                    cellRow <= endRow &&
                                    cellCol >= startCol &&
                                    cellCol <= endCol &&
                                    (ref.evidence || []).length > 0
                                  );
                                });

                                // Check if this is the first cell of any reference range
                                const isFirstCellOfReference = referenceFiles.some((ref: any) => {
                                  const { start } = ref.details;
                                  return cellRow === start.row && cellCol === start.col;
                                });

                                // Show "References" title on ALL cells in the reference range
                                if (referenceFiles.length > 0) {
                                  return (
                                    <>
                                      {/* invisible but occupying enough space for the title */}
                                      <span
                                        className="invisible text-[15px] text-nowrap whitespace-nowrap font-semibold text-blue-600 px-1 rounded-sm bg-blue-50"
                                        style={{
                                          transform: "scale(0.8)",
                                          transformOrigin: "top left",
                                        }}
                                      >
                                        References
                                      </span>
                                      {/* visible title - only show on first cell to avoid clutter */}
                                      {isFirstCellOfReference && (
                                        <div className="absolute top-0 left-0 w-full h-full flex items-start justify-start p-1 pointer-events-none z-10">
                                          <span
                                            className="text-[15px] font-semibold text-nowrap whitespace-nowrap text-blue-600 px-1 rounded-sm bg-blue-50"
                                            style={{
                                              transform: "scale(0.8)",
                                              transformOrigin: "top left",
                                            }}
                                          >
                                            References
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  );
                                }
                                return null;
                              })()
                            )}

                          {/* The small blue dot can remain or be removed, depending on preference */}
                          {excelGridColIndex > 0 &&
                            excelGridRowIndex > 0 &&
                            allMappings.find(
                              (m) =>
                                m.details &&
                                m.details.sheet === selectedSheet &&
                                excelGridRowIndex === m.details.start.row &&
                                excelGridColIndex - 1 === m.details.start.col
                            ) && (
                              <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
                            )}

                          {/* Information button for cells with reference files - show on first cell of each reference range */}
                          {excelGridColIndex > 0 &&
                            excelGridRowIndex > 0 && (
                              (() => {
                                const cellRow = excelGridRowIndex;
                                const cellCol = excelGridColIndex - 1;
                                
                                // ✅ Check referenceFiles ONLY (not mappings)
                                // Mappings are separate and don't show "i button" - they show "Mapping" label
                                // ✅ CRITICAL: Use workbook prop - it should be reactive and update when state changes
                                // The fix in refreshWorkbookMappings ensures we fetch the latest referenceFiles from backend
                                const allReferenceFiles = workbook.referenceFiles || [];
                                
                                // ✅ DEBUG: Log when checking for reference files on specific cells (first few rows/cols)
                                if (cellRow <= 20 && cellCol <= 5 && allReferenceFiles.length > 0) {
                                  console.log(`🔍 Cell (${cellRow},${cellCol}) - Checking reference files:`, {
                                    allReferenceFilesCount: allReferenceFiles.length,
                                    selectedSheet,
                                    referenceFiles: allReferenceFiles.map((ref: any) => ({
                                      hasDetails: !!ref?.details,
                                      sheet: ref?.details?.sheet,
                                      start: ref?.details?.start,
                                      end: ref?.details?.end,
                                      evidenceCount: ref?.evidence?.length || 0,
                                      evidence: ref?.evidence || []
                                    }))
                                  });
                                }
                                
                                const referenceFiles = allReferenceFiles.filter((ref: any) => {
                                  // Skip old format entries (just ObjectIds without details)
                                  if (!ref || typeof ref !== 'object' || !ref.details) {
                                    return false;
                                  }
                                  if (ref.details.sheet !== selectedSheet) {
                                    return false;
                                  }
                                  
                                  const { start, end } = ref.details;
                                  if (!start || typeof start.row !== 'number' || typeof start.col !== 'number') {
                                    return false;
                                  }

                                  const startRow = start.row;
                                  const endRow = (end && typeof end.row === 'number') ? end.row : start.row;
                                  const startCol = start.col;
                                  const endCol = (end && typeof end.col === 'number') ? end.col : start.col;
                                  
                                  return (
                                    cellRow >= startRow &&
                                    cellRow <= endRow &&
                                    cellCol >= startCol &&
                                    cellCol <= endCol &&
                                    (ref.evidence || []).length > 0
                                  );
                                });

                                // Check if this is the first cell of any reference range
                                const isFirstCellOfReference = referenceFiles.some((ref: any) => {
                                  const { start } = ref.details;
                                  return cellRow === start.row && cellCol === start.col;
                                });

                                // Debug logging for first cell of reference range
                                if (isFirstCellOfReference && referenceFiles.length > 0) {
                                  console.log('🔵 Found first cell of reference range:', {
                                    cellRow,
                                    cellCol,
                                    selectedSheet,
                                    referenceFilesCount: referenceFiles.length,
                                    workbookId: workbook.id
                                  });
                                }

                                // Show "i button" ONLY for reference files (not mappings)
                                // Show on first cell of each reference range - ensure only ONE button per cell
                                if (isFirstCellOfReference && referenceFiles.length > 0) {
                                  // Get the FIRST matching reference file to avoid duplicates
                                  const refRange = referenceFiles.find((ref: any) => {
                                    const { start } = ref.details;
                                    return cellRow === start.row && cellCol === start.col;
                                  });

                                  if (refRange) {
                                    const { start, end } = refRange.details;
                                    // Use a unique key based on cell position to prevent duplicate rendering
                                    const buttonKey = `ref-btn-${selectedSheet}-${start.row}-${start.col}`;
                                    return (
                                      <div key={buttonKey} className="absolute top-1 right-1 z-10 pointer-events-none">
                                        <button
                                          className="w-7 h-7 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center text-white text-xs pointer-events-auto shadow-lg border-2 border-white"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            console.log('🔵 i button clicked for reference files:', {
                                              sheet: selectedSheet,
                                              startRow: start.row,
                                              startCol: start.col,
                                              endRow: (end && typeof end.row === 'number') ? end.row : start.row,
                                              endCol: (end && typeof end.col === 'number') ? end.col : start.col
                                            });
                                            // Fetch evidence files for the entire reference range
                                            if (fetchEvidenceFilesForRange) {
                                              fetchEvidenceFilesForRange(
                                                selectedSheet,
                                                start.row,
                                                start.col,
                                                (end && typeof end.row === 'number') ? end.row : start.row,
                                                (end && typeof end.col === 'number') ? end.col : start.col
                                              ).then(() => {
                                                console.log('✅ Evidence files fetched, opening dialog');
                                                setIsReferenceFilesDialogOpen(true);
                                              }).catch((error) => {
                                                console.error('❌ Error fetching evidence files:', error);
                                              });
                                            } else {
                                              console.warn('⚠️ fetchEvidenceFilesForRange function not available');
                                              setIsReferenceFilesDialogOpen(true);
                                            }
                                          }}
                                          title="View reference files"
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                          }}
                                          onMouseEnter={(e) => {
                                            e.stopPropagation();
                                          }}
                                        >
                                          <Info className="h-4 w-4" />
                                        </button>
                                      </div>
                                    );
                                  }
                                }
                                return null;
                              })()
                            )}

                          {/* Information button for mappings with reference files - show on first cell of each mapping */}
                          {mapping &&
                            !isHeaderCell &&
                            isFirstCellOfMapping &&
                            mapping.referenceFiles &&
                            mapping.referenceFiles.length > 0 && (
                              <div key={`mapping-btn-${mapping._id}-${selectedSheet}-${mapping.details.start.row}-${mapping.details.start.col}`} className="absolute top-1 right-10 z-10 pointer-events-none">
                                <button
                                  className="w-7 h-7 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white text-xs pointer-events-auto shadow-lg border-2 border-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    console.log('🟢 i button clicked for mapping reference files:', {
                                      mappingId: mapping._id,
                                      referenceFilesCount: mapping.referenceFiles?.length || 0,
                                      mappingDetails: mapping.details
                                    });
                                    // Set mapping reference files and open dialog
                                    if (setCellRangeEvidenceFiles) {
                                      // Convert mapping reference files to ClassificationEvidence format for display
                                      const evidenceFiles: ClassificationEvidence[] = (mapping.referenceFiles || []).map((refFile: any) => ({
                                        _id: `mapping-ref-${mapping._id}-${refFile.fileName}`,
                                        engagementId: (props as any).engagementId || '',
                                        classificationId: (props as any).classification || '',
                                        evidenceUrl: refFile.fileUrl,
                                        uploadedBy: refFile.uploadedBy ? {
                                          userId: '',
                                          name: typeof refFile.uploadedBy === 'string' ? refFile.uploadedBy : refFile.uploadedBy.name || 'Unknown',
                                          email: ''
                                        } : {
                                          userId: '',
                                          name: 'Unknown',
                                          email: ''
                                        },
                                        linkedWorkbooks: [],
                                        mappings: [],
                                        evidenceComments: [],
                                        createdAt: refFile.uploadedAt || new Date().toISOString(),
                                        updatedAt: refFile.uploadedAt || new Date().toISOString()
                                      }));
                                      setCellRangeEvidenceFiles(evidenceFiles);
                                      setIsReferenceFilesDialogOpen(true);
                                    }
                                  }}
                                  title={`View ${mapping.referenceFiles.length} reference file${mapping.referenceFiles.length !== 1 ? 's' : ''} attached to this mapping`}
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                  }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <Info className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  const renderSelectionFooter = () => {
    // Display info for the last selection, or a summary if multiple
    const lastSelection =
      selections.length > 0 ? selections[selections.length - 1] : null;

    if (selections.length === 0) return null;

    return (
      <div className="sticky bottom-0 left-0 right-0 mt-4 p-4 bg-blue-100 text-blue-800 rounded-t-lg flex justify-between items-center z-10 shadow-lg">
        <span>
          Selection:{" "}
          <Badge variant="secondary">
            {selections.length > 1
              ? `${selections.length} ranges selected`
              : getSelectionText(lastSelection)}
          </Badge>
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCreateETBMappingOpen(true)}
          >
            {getContextLabels().mapToButton}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (lastSelection) onLinkField(lastSelection);
            }}
          >
            {rowType === 'evidence' ? 'Link to File' : 'Link to Field'}
          </Button>
        </div>
      </div>
    );
  };

  

  const labels = getContextLabels();

  

  return (
    <div className="flex flex-col h-auto">
      <Button variant="default" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 py-5 px-2" />
        Back To Workbooks
      </Button>

      {renderHeader()}
      <div className="flex flex-1">
        {/* Main content area */}
        <main className="flex-1 p-4 bg-gray-50 flex flex-col w-full">


          <div className="flex-grow relative">
            {" "}
            {/* Added relative to parent for absolute positioning of title */}
            {renderSpreadsheet()}
          </div>
          {/* {renderSelectionFooter()} */}
        </main>
      </div>
      {/* Mobile Menu Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="m-4 md:hidden">
            <List className="h-4 w-4 mr-2" /> Menu
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          <div className="mt-6 space-y-6">
            {/* Sheets Section for Mobile */}
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Sheets
              </h3>
              <div className="space-y-1">
                {sheetNames.map((sheet) => (
                  <Button
                    key={sheet}
                    variant={selectedSheet === sheet ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleSheetChange(sheet)}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {sheet}
                  </Button>
                ))}
              </div>
            </div>

            {/* Note: Actions section removed - these features are being deprecated in favor of the auto-open mapping dialog */}

            {/* Named Ranges Section for Mobile */}
            {/* <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-600">
                  Named Ranges
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsCreateNamedRangeOpen(true)}
                  disabled={selections.length === 0} // Disable if no selection
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {namedRanges.length === 0 ? (
                  <p className="text-gray-500 text-xs text-center">
                    No named ranges.
                  </p>
                ) : (
                  namedRanges.map((nr, index) => (
                    <div
                      key={index}
                      className="p-2 text-xs bg-gray-100 rounded flex justify-between items-start cursor-pointer hover:bg-gray-200 group"
                      onClick={() => handleNamedRangeClick(nr)}
                    >
                      <span className="font-medium py-1">{nr.name}</span>
                      <div className="flex flex-col items-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-xs whitespace-nowrap"
                        >
                          {nr.range}
                        </Badge>
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditNamedRange(nr);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNamedRange(nr._id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div> */}

            {/* Mappings Section for Mobile */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                  <List className="h-4 w-4" /> Active Mappings
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    selections.length > 0 && setIsCreateETBMappingOpen(true)
                  }
                  disabled={selections.length === 0}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {allMappings
                  .filter((m) => m.details && m.details.sheet === selectedSheet) // <--- FIX: Access m.details.sheet
                  .map((map, index) => {
                    // Add defensive check for map.details - THIS IS THE FIX
                    if (!map.details || !map.details.start) {
                      // Ensure details and start exist
                      return null; // Skip invalid mappings
                    }

                    const { sheet, start, end } = map.details; // <--- FIX: Destructure from map.details

                    const hasValidEnd =
                      end &&
                      typeof end.row === "number" &&
                      typeof end.col === "number";

                    return (
                      <div
                        key={map._id || index} // Use _id as key if available, fallback to index
                        className={`p-2 text-xs rounded border-l-4 ${map.color} group`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              Mapping
                            </p>
                            <p className="text-gray-600">
                              {`${sheet}!${zeroIndexToExcelCol(start.col)}${start.row
                                }${hasValidEnd &&
                                  (end.row !== start.row || end.col !== start.col)
                                  ? `:${zeroIndexToExcelCol(end.col)}${end.row}`
                                  : ""
                                }`}
                            </p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                // Check if this is an ETB mapping or workbook mapping
                                if ('workbookId' in map) {
                                  // This is an ETB mapping
                                  setEditingETBMapping(map);
                                  setIsEditETBMappingOpen(true);
                                } else {
                                  // This is a workbook mapping
                                  setEditingWorkbookMapping(map);
                                  setIsEditWorkbookMappingOpen(true);
                                }
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => onDeleteMapping(workbook.id, map._id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {renderSaveDialog()}

      {renderETBMappingsDialog()} {/* Render the ETB Mappings Dialog */}
      {renderWorkbookMappingsDialog()} {/* Render the Workbook Mappings Dialog */}



      {/* Dual Options Dialog */}
      <Dialog open={isDualOptionsDialogOpen} onOpenChange={setIsDualOptionsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              What would you like to do with the selected cells?
            </p>
            {selections.length > 0 && (
              <div className="p-2 bg-gray-100 rounded">
                <p className="text-sm font-medium">Selected Range:</p>
                <p className="text-sm">
                  {getSelectionText(selections[selections.length - 1])}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start"
                onClick={() => {
                  setIsDualOptionsDialogOpen(false);
                  setIsCreateETBMappingOpen(true);
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Link className="h-5 w-5" />
                  <span className="font-semibold">Create Mapping</span>
                </div>
                <span className="text-xs text-gray-500 text-left">
                  Link the selected cells to a classification row
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start"
                onClick={() => {
                  setIsDualOptionsDialogOpen(false);
                  setIsUploadReferenceFilesDialogOpen(true);
                }}
                disabled={loadingEvidenceFiles || uploadingFiles}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-5 w-5" />
                  <span className="font-semibold">Add Reference Files</span>
                </div>
                <span className="text-xs text-gray-500 text-left">
                  Upload and attach images or PDFs to the selected cells
                </span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDualOptionsDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reference Files Dialog */}
      <Dialog open={isReferenceFilesDialogOpen} onOpenChange={setIsReferenceFilesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Reference Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingEvidenceFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading reference files...</span>
              </div>
            ) : cellRangeEvidenceFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No reference files found for the selected cells.</p>
                <p className="text-sm mt-2">Add reference files using the "Add Reference Files" option.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {cellRangeEvidenceFiles.map((evidence) => (
                  <div
                    key={evidence._id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm break-all" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {evidence.evidenceUrl.split('/').pop() || 'Reference File'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Uploaded by {evidence.uploadedBy?.name || 'Unknown'} • {new Date(evidence.createdAt).toLocaleDateString()}
                        </p>
                        {/* ✅ DO NOT show mapping count in reference files dialog - mappings and reference files are separate */}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPreviewFile(evidence);
                        setFilePreviewOpen(true);
                      }}
                      className="ml-4 flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReferenceFilesDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={filePreviewOpen} onOpenChange={setFilePreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedPreviewFile && getFileIcon(selectedPreviewFile.evidenceUrl)}
                <span className="truncate max-w-md">
                  {selectedPreviewFile?.evidenceUrl.split('/').pop() || 'Unknown File'}
                </span>
              </div>
              <div className="text-sm text-gray-500 font-normal">
                Uploaded by: <span className="font-medium text-gray-700">
                  {selectedPreviewFile?.uploadedBy?.name || 'Unknown'}
                </span>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col h-[75vh]">
            {/* File Preview */}
            <div className="flex-1 border rounded-lg overflow-hidden mb-4 bg-gray-50">
              {selectedPreviewFile && renderFilePreview(selectedPreviewFile)}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Reference Files Dialog */}
      <Dialog open={isUploadReferenceFilesDialogOpen} onOpenChange={setIsUploadReferenceFilesDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Reference Files</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Upload files to attach to the selected cells. Files will be linked to this workbook and mapped to the selected range.
            </p>
            {selections.length > 0 && (
              <div className="p-2 bg-gray-100 rounded">
                <p className="text-sm font-medium">Selected Range:</p>
                <p className="text-sm">
                  {getSelectionText(selections[selections.length - 1])}
                </p>
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="*/*"
                onChange={handleReferenceFileUpload || (() => {})}
                className="hidden"
                id="reference-file-upload"
                disabled={uploadingFiles}
              />
              <label
                htmlFor="reference-file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600 hover:text-blue-500">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </div>
                <div className="text-xs text-gray-500">
                  All file types supported (max 10MB per file)
                </div>
              </label>
            </div>
            {uploadingFiles && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading and processing files...
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploadReferenceFilesDialogOpen(false)}
              disabled={uploadingFiles}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create ETB Mapping Dialog */}
      <Dialog 
        key={`create-mapping-dialog-${workbook.id}`}
        open={isCreateETBMappingOpen} 
        onOpenChange={(open) => {
          // Prevent closing dialog during upload or creation
          if (!open && (isUploadingMappingFiles || isCreatingETBMapping)) {
            return;
          }
          setIsCreateETBMappingOpen(open);
        }}
        modal={true}
      >
        <DialogContent 
          className="z-[100]"
          style={{ zIndex: isFullscreenMode ? 150 : 100 }}
          onInteractOutside={(e) => {
            // Prevent closing by clicking outside during upload or creation
            if (isUploadingMappingFiles || isCreatingETBMapping) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            // Prevent closing with Escape key during upload or creation
            if (isUploadingMappingFiles || isCreatingETBMapping) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{getContextLabels().mapToButton}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="etbRow">{getContextLabels().rowLabel}</Label>
              {!etbData ? (
                <div className="flex items-center gap-2 p-2 text-sm text-gray-500 bg-gray-100 rounded">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading {getContextLabels().dataType} data...
                </div>
              ) : !etbData.rows || etbData.rows.length === 0 ? (
                <div className="p-2 text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded">
                  No {getContextLabels().dataType} rows available. Please ensure the {getContextLabels().tableTitle} is populated.
                  {(props as any).parentEtbData ? " (Parent data provided)" : " (No parent data)"}
                </div>
              ) : (
                <>
                  {/* List of Account Names from Lead Sheet */}
                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200 max-h-[200px] overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Account Names from Lead Sheet:</p>
                    <div className="space-y-1">
                      {etbData.rows.map((row, index) => (
                        <div
                          key={row.code || index}
                          className="text-xs text-gray-600 py-1 px-2 hover:bg-gray-100 rounded"
                        >
                          <span className="font-medium">{row.code}</span>
                          {row.accountName && (
                            <span className="ml-2">- {row.accountName}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Select
                    value={selectedETBRow?.code || ""}
                    onValueChange={(value) => {
                      const row = etbData?.rows.find(r => r.code === value);
                      setSelectedETBRow(row || null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={`Select ${getContextLabels().rowLabel}`} />
                    </SelectTrigger>
                    <SelectContent 
                      className="max-h-[300px] !z-[9999]" 
                      style={{ zIndex: 9999, position: 'fixed' }}
                    >
                      {etbData.rows.map((row) => (
                        <SelectItem
                          key={row.code}
                          value={row.code}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{row.code} - {row.accountName}</span>
                            {row.classification && (
                              <span className="text-xs text-muted-foreground">{row.classification}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {etbData.rows.length} row{etbData.rows.length !== 1 ? 's' : ''} available
                  </p>
                </>
              )}
            </div>

            {selections.length > 0 && (
              <div className="p-2 bg-gray-100 rounded">
                <p className="text-sm font-medium">Selected Range:</p>
                <p className="text-sm">
                  {getSelectionText(selections[selections.length - 1])}
                </p>
              </div>
            )}

            {/* File Upload Section for Mapping Reference Files */}
            <div className="space-y-2">
              <Label>Reference Files (Optional)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  multiple
                  accept="*/*"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      setMappingFilesToUpload(Array.from(files));
                    }
                  }}
                  className="hidden"
                  id="mapping-file-upload"
                  disabled={isCreatingETBMapping}
                />
                <label
                  htmlFor="mapping-file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-6 w-6 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600 hover:text-blue-500">
                      Click to upload reference files
                    </span>{" "}
                    or drag and drop
                  </div>
                  <div className="text-xs text-gray-500">
                    All file types supported (max 10MB per file)
                  </div>
                </label>
              </div>
              {mappingFilesToUpload.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-gray-700">Selected files:</p>
                  {mappingFilesToUpload.map((file, index) => {
                    const progress = uploadProgress[file.name];
                    const isUploading = isUploadingMappingFiles && progress !== undefined && progress >= 0 && progress < 100;
                    const isError = progress === -1;
                    const isComplete = progress === 100;
                    
                    return (
                      <div key={index} className={`text-xs bg-gray-50 p-2 rounded border ${
                        isError ? 'border-red-300 bg-red-50' : 
                        isComplete ? 'border-green-300 bg-green-50' : 
                        isUploading ? 'border-blue-300 bg-blue-50' : 
                        'border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={isError ? 'text-red-600' : isComplete ? 'text-green-600' : 'text-gray-600'}>
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                          {isUploading && (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                              <span className="text-blue-600">{progress}%</span>
                            </div>
                          )}
                          {isComplete && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                          {isError && (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        {isUploading && progress !== undefined && (
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {isUploadingMappingFiles && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Uploading files...</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMappingFilesToUpload([]); // Clear files when canceling
                setIsUploadingMappingFiles(false);
                setUploadProgress({});
                setIsCreateETBMappingOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateETBMapping}
              disabled={!selectedETBRow || isCreatingETBMapping || isUploadingMappingFiles}
            >
              {isUploadingMappingFiles ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : isCreatingETBMapping ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Create Workbook Mapping Dialog */}
      <Dialog open={isCreateWorkbookMappingOpen} onOpenChange={setIsCreateWorkbookMappingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Workbook Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selections.length > 0 && (
              <div className="p-2 bg-gray-100 rounded">
                <p className="text-sm font-medium">Selected Range:</p>
                <p className="text-sm">
                  {getSelectionText(selections[selections.length - 1])}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateWorkbookMappingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkbookMapping}
              disabled={isCreatingWorkbookMapping}
            >
              {isCreatingWorkbookMapping ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit ETB Mapping Dialog */}
      <Dialog open={isEditETBMappingOpen} onOpenChange={setIsEditETBMappingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit ETB Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {editingETBMapping && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-etb-row">ETB Row</Label>
                  <select
                    id="edit-etb-row"
                    value={editingETBMapping.tempRowCode || (() => {
                      const row = etbData?.rows.find(r => r.mappings?.some(m => m._id === editingETBMapping._id));
                      return row?.code || '';
                    })()}
                    onChange={(e) => {
                      if (editingETBMapping) {
                        setEditingETBMapping({
                          ...editingETBMapping,
                          tempRowCode: e.target.value
                        } as any);
                      }
                    }}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select ETB Row</option>
                    {etbData?.rows.map((row) => (
                      <option key={row.code} value={row.code}>
                        {row.code} - {row.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Selected Range</Label>
                  <Input
                    placeholder="e.g., Sheet1!A1:B10"
                    value={(() => {
                      const details = editingETBMapping.tempDetails || editingETBMapping.details;
                      if (!details) return '';
                      const sheet = details.sheet;
                      const start = `${zeroIndexToExcelCol(details.start.col)}${details.start.row + 1}`;
                      const end = details.end &&
                        (details.end.row !== details.start.row || details.end.col !== details.start.col)
                        ? `${zeroIndexToExcelCol(details.end.col)}${details.end.row + 1}`
                        : '';
                      return `${sheet}!${start}${end ? `:${end}` : ''}`;
                    })()}
                    onChange={(e) => {
                      // Parse the range input
                      const match = e.target.value.match(/^([^!]+)!(.+)$/);
                      if (match && editingETBMapping) {
                        const [, sheet, range] = match;
                        const [start, end] = range.split(':');

                        // Parse start
                        const startMatch = start.match(/^([A-Z]+)(\d+)$/);
                        if (startMatch) {
                          const [, colStr, rowStr] = startMatch;
                          const col = excelColToZeroIndex(colStr);
                          const row = parseInt(rowStr, 10) - 1;

                          let endCol = col, endRow = row;
                          if (end) {
                            const endMatch = end.match(/^([A-Z]+)(\d+)$/);
                            if (endMatch) {
                              const [, endColStr, endRowStr] = endMatch;
                              endCol = excelColToZeroIndex(endColStr);
                              endRow = parseInt(endRowStr, 10) - 1;
                            }
                          }

                          const tempDetails = {
                            sheet,
                            start: { row, col },
                            end: { row: endRow, col: endCol },
                          };
                          setEditingETBMapping({
                            ...editingETBMapping,
                            tempDetails
                          } as any);
                        }
                      }
                    }}
                    className="font-mono"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingETBMapping(null);
                setIsEditETBMappingOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!editingETBMapping?.tempDetails && !editingETBMapping?.details}
              onClick={() => {
                if (editingETBMapping && etbData) {
                  const currentRow = etbData.rows.find(r =>
                    r.mappings?.some(m => m._id === editingETBMapping._id)
                  );
                  const newRowCode = editingETBMapping.tempRowCode || currentRow?.code;
                  const updatedDetails = editingETBMapping.tempDetails || editingETBMapping.details;

                  if (newRowCode && currentRow && updatedDetails) {
                    const updateData: UpdateMappingRequest = {
                      details: updatedDetails,
                    };
                    handleUpdateETBMapping(editingETBMapping._id, currentRow.code, newRowCode, updateData);
                  }
                }
              }}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const ExcelViewerWithFullscreen: React.FC<Omit<ExcelViewerProps,
  'selectedSheet' | 'setSelectedSheet' | 'selections' | 'setSelections' | 'isSelecting' | 'setIsSelecting' | 'anchorSelectionStart' |
  'isSaveDialogOpen' | 'setIsSaveDialogOpen' | 'saveType' | 'setSaveType' | 'isSaving' | 'setIsSaving' |
  'isNamedRangesDialogOpen' | 'setIsNamedRangesDialogOpen' | 'isCreateNamedRangeOpen' | 'setIsCreateNamedRangeOpen' |
  'isEditNamedRangeOpen' | 'setIsEditNamedRangeOpen' | 'editingNamedRange' | 'setEditingNamedRange' |
  'newNamedRangeName' | 'setNewNamedRangeName' | 'newNamedRangeRange' | 'setNewNamedRangeRange' |
  'isETBMappingsDialogOpen' | 'setIsETBMappingsDialogOpen' | 'isCreateETBMappingOpen' | 'setIsCreateETBMappingOpen' |
  'isEditETBMappingOpen' | 'setIsEditETBMappingOpen' | 'editingETBMapping' | 'setEditingETBMapping' |
  'selectedETBRow' | 'setSelectedETBRow' | 'isCreatingETBMapping' | 'setIsCreatingETBMapping' |
  'isWorkbookMappingsDialogOpen' | 'setIsWorkbookMappingsDialogOpen' | 'isCreateWorkbookMappingOpen' | 'setIsCreateWorkbookMappingOpen' |
  'isEditWorkbookMappingOpen' | 'setIsEditWorkbookMappingOpen' | 'editingWorkbookMapping' | 'setEditingWorkbookMapping' |
  'isCreatingWorkbookMapping' | 'setIsCreatingWorkbookMapping' |
  'etbData' | 'etbLoading' | 'etbError' | 'onRefreshETBData' |
  'isDualOptionsDialogOpen' | 'setIsDualOptionsDialogOpen' | 'isReferenceFilesDialogOpen' | 'setIsReferenceFilesDialogOpen' |
  'isUploadReferenceFilesDialogOpen' | 'setIsUploadReferenceFilesDialogOpen' | 'cellRangeEvidenceFiles' | 'setCellRangeEvidenceFiles' |
  'loadingEvidenceFiles' | 'setLoadingEvidenceFiles' | 'cellsWithEvidence' | 'setCellsWithEvidence' | 'uploadingFiles' | 'setUploadingFiles' |
  'fetchEvidenceFilesForRange' | 'cellHasEvidence' | 'handleOpenReferenceFilesDialog' | 'handleOpenFileInNewTab' | 'handleReferenceFileUpload' |
  'filePreviewOpen' | 'setFilePreviewOpen' | 'selectedPreviewFile' | 'setSelectedPreviewFile'
> & {
  parentEtbData?: ETBData | null; // ✅ NEW: Optional parent data to avoid re-fetching
  onRefreshETBData?: () => void; // ✅ NEW: Callback to refresh parent data
  onSheetChange?: (workbookId: string, sheetName: string) => void; // ✅ NEW: Callback when sheet changes
  initialSheet?: string; // ✅ NEW: Initial sheet to select (from saved preference)
  autoFullscreen?: boolean; // ✅ NEW: Automatically open in fullscreen mode
}> = (props) => {
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(props.autoFullscreen || false);
  const parentOnRefreshETBData = props.onRefreshETBData;
  
  // Auto-open fullscreen if autoFullscreen prop is true
  useEffect(() => {
    if (props.autoFullscreen && !isFullscreen) {
      setIsFullscreen(true);
    }
  }, [props.autoFullscreen, isFullscreen]);
  
  // Dialog refresh control
  const [mappingsDialogRefreshKey, setMappingsDialogRefreshKey] = useState(0);

  // Sheet selection state
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const isInitializingRef = useRef(true); // Track if we're still initializing

  // ✅ NEW: Wrapper function to handle sheet changes and notify parent
  const handleSheetChangeWrapper = useCallback((sheetName: string) => {
    setSelectedSheet(sheetName);
    // Only save preference if not initializing (user actually changed the sheet)
    if (!isInitializingRef.current && props.onSheetChange && props.workbook?.id) {
      props.onSheetChange(props.workbook.id, sheetName);
    }
  }, [props.onSheetChange, props.workbook?.id]);

  // Cell selection states
  const [selections, setSelections] = useState<Selection[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const anchorSelectionStart = useRef<{ row: number; col: number } | null>(null);

  // Save dialog states
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveType, setSaveType] = useState<"workbook" | "sheet">("workbook");
  const [isSaving, setIsSaving] = useState(false);

  // Named ranges states
  const [isNamedRangesDialogOpen, setIsNamedRangesDialogOpen] = useState(false);
  const [isCreateNamedRangeOpen, setIsCreateNamedRangeOpen] = useState(false);
  const [isEditNamedRangeOpen, setIsEditNamedRangeOpen] = useState(false);
  const [editingNamedRange, setEditingNamedRange] = useState<any | null>(null);
  const [newNamedRangeName, setNewNamedRangeName] = useState("");
  const [newNamedRangeRange, setNewNamedRangeRange] = useState("");

  // ETB Mappings states
  const [isETBMappingsDialogOpen, setIsETBMappingsDialogOpen] = useState(false);
  const [isCreateETBMappingOpen, setIsCreateETBMappingOpen] = useState(false);
  const [isEditETBMappingOpen, setIsEditETBMappingOpen] = useState(false);
  const [editingETBMapping, setEditingETBMapping] = useState<any | null>(null);
  const [selectedETBRow, setSelectedETBRow] = useState<ETBRow | null>(null);
  const [isCreatingETBMapping, setIsCreatingETBMapping] = useState(false);
  const [mappingFilesToUpload, setMappingFilesToUpload] = useState<File[]>([]);
  const [isUploadingMappingFiles, setIsUploadingMappingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Workbook Mappings states
  const [isWorkbookMappingsDialogOpen, setIsWorkbookMappingsDialogOpen] = useState(false);
  const [isCreateWorkbookMappingOpen, setIsCreateWorkbookMappingOpen] = useState(false);
  const [isEditWorkbookMappingOpen, setIsEditWorkbookMappingOpen] = useState(false);
  const [editingWorkbookMapping, setEditingWorkbookMapping] = useState<Mapping | null>(null);
  const [isCreatingWorkbookMapping, setIsCreatingWorkbookMapping] = useState(false);

  // ETB states - Initialize with parentEtbData if provided
  const parentEtbData = (props as any).parentEtbData;
  const [etbData, setEtbData] = useState<ETBData | null>(parentEtbData || null);
  const [etbLoading, setEtbLoading] = useState(false);
  const [etbError, setEtbError] = useState<string | null>(null);

  // Add sheet data loading states
  const [sheetDataCache, setSheetDataCache] = useState<Map<string, any[][]>>(new Map());
  const [loadingSheets, setLoadingSheets] = useState<Set<string>>(new Set());

  // State for dual-options dialog and reference files
  const [isDualOptionsDialogOpen, setIsDualOptionsDialogOpen] = useState(false);
  const [isReferenceFilesDialogOpen, setIsReferenceFilesDialogOpen] = useState(false);
  const [isUploadReferenceFilesDialogOpen, setIsUploadReferenceFilesDialogOpen] = useState(false);
  const [cellRangeEvidenceFiles, setCellRangeEvidenceFiles] = useState<ClassificationEvidence[]>([]);
  const [loadingEvidenceFiles, setLoadingEvidenceFiles] = useState(false);
  const [cellsWithEvidence, setCellsWithEvidence] = useState<Map<string, boolean>>(new Map());
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // File preview state
  const [filePreviewOpen, setFilePreviewOpen] = useState(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<ClassificationEvidence | null>(null);

  // Auto-scrolling state variables
  const [autoScrollInterval, setAutoScrollInterval] = useState<NodeJS.Timeout | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const spreadsheetContainerRef = useRef<HTMLDivElement>(null);
  const isMouseDownRef = useRef(false);
  // ✅ IMPROVED: Ref for immediate mouse position access (avoids state delay)
  const currentMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const autoScrollAnimationFrameRef = useRef<number | null>(null);

  // ✅ CRITICAL: Use a ref to store the latest workbook state
  // This ensures fetchEvidenceFilesForRange always has access to the most up-to-date referenceFiles
  const workbookRef = useRef(props.workbook);
  useEffect(() => {
    workbookRef.current = props.workbook;
  }, [props.workbook]);

  // Helper to get cell key for evidence tracking
  const getCellKey = useCallback((row: number, col: number, sheet: string) => {
    return `${sheet}_${row}_${col}`;
  }, []);

  // Function to fetch evidence files for a cell range
  // ✅ CRITICAL: This function now reads from workbook.referenceFiles instead of calling the API
  // ✅ Accepts optional workbook parameter to use latest state
  const fetchEvidenceFilesForRange = useCallback(async (
    sheet: string,
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    workbookOverride?: any // Optional: use this workbook instead of props.workbook
  ) => {
    // ✅ CRITICAL: Use workbookOverride if provided, otherwise use the latest workbook from ref
    const workbookToUse = workbookOverride || workbookRef.current;
    
    if (!workbookToUse?.id) {
      console.warn('⚠️ fetchEvidenceFilesForRange: No workbook ID');
      return;
    }

    console.log('🔍 fetchEvidenceFilesForRange called:', {
      workbookId: workbookToUse.id,
      sheet,
      startRow,
      startCol,
      endRow,
      endCol,
      workbookReferenceFilesCount: workbookToUse.referenceFiles?.length || 0,
      referenceFiles: workbookToUse.referenceFiles?.map((ref: any) => ({
        sheet: ref?.details?.sheet,
        start: ref?.details?.start,
        end: ref?.details?.end,
        evidenceCount: ref?.evidence?.length || 0
      })) || [],
      usingOverride: !!workbookOverride
    });

    setLoadingEvidenceFiles(true);
    try {
      // ✅ CRITICAL: Read from workbook.referenceFiles instead of calling API
      // Find reference file entries that match the cell range
      const matchingRefFiles = (workbookToUse.referenceFiles || []).filter((ref: any) => {
        if (!ref || typeof ref !== 'object' || !ref.details) return false;
        if (ref.details.sheet !== sheet) return false;
        
        const { start, end } = ref.details;
        if (!start || typeof start.row !== 'number' || typeof start.col !== 'number') return false;
        
        const refStartRow = start.row;
        const refEndRow = (end && typeof end.row === 'number') ? end.row : start.row;
        const refStartCol = start.col;
        const refEndCol = (end && typeof end.col === 'number') ? end.col : start.col;
        
        // Check if the requested range overlaps with this reference file range
        const rangesOverlap = !(
          endRow < refStartRow ||
          startRow > refEndRow ||
          endCol < refStartCol ||
          startCol > refEndCol
        );
        
        return rangesOverlap && (ref.evidence || []).length > 0;
      });

      console.log('🔍 Found matching reference file entries:', {
        count: matchingRefFiles.length,
        entries: matchingRefFiles.map((ref: any) => ({
          sheet: ref.details?.sheet,
          start: ref.details?.start,
          end: ref.details?.end,
          evidenceCount: ref.evidence?.length || 0
        }))
      });

      // Collect all unique evidence IDs from matching reference files
      const evidenceIds = new Set<string>();
      matchingRefFiles.forEach((ref: any) => {
        (ref.evidence || []).forEach((evId: any) => {
          const id = typeof evId === 'string' ? evId : (evId?._id || evId?.id || evId);
          if (id) evidenceIds.add(String(id));
        });
      });

      console.log('🔍 Collected evidence IDs:', {
        count: evidenceIds.size,
        ids: Array.from(evidenceIds)
      });

      // Fetch evidence details for all evidence IDs
      // Use the backend API to fetch evidence details
      const { getEvidenceWithMappings } = await import('@/lib/api/classificationEvidenceApi');
      const evidenceFilesPromises = Array.from(evidenceIds).map(async (evidenceId) => {
        try {
          const evidence = await getEvidenceWithMappings(evidenceId);
          return evidence;
        } catch (error) {
          console.error(`Error fetching evidence ${evidenceId}:`, error);
          return null;
        }
      });

      const evidenceFilesResults = await Promise.all(evidenceFilesPromises);
      const evidenceFiles = evidenceFilesResults.filter((e): e is any => e !== null);

      console.log('✅ Evidence files fetched from workbook.referenceFiles:', {
        count: evidenceFiles.length,
        files: evidenceFiles.map(e => ({ id: e._id, url: e.evidenceUrl }))
      });
      
      setCellRangeEvidenceFiles(evidenceFiles);
      
      // Update cellsWithEvidence map
      setCellsWithEvidence(prev => {
        const newCellsWithEvidence = new Map(prev);
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const cellKey = getCellKey(row, col, sheet);
            newCellsWithEvidence.set(cellKey, evidenceFiles.length > 0);
          }
        }
        return newCellsWithEvidence;
      });
    } catch (error) {
      console.error("Error fetching evidence files:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch reference files",
      });
    } finally {
      setLoadingEvidenceFiles(false);
    }
  }, [props.workbook?.id, props.workbook?.referenceFiles, getCellKey, toast]);

  // Function to check if a cell has evidence files
  const cellHasEvidence = useCallback((row: number, col: number, sheet: string): boolean => {
    const cellKey = getCellKey(row, col, sheet);
    const hasEvidence = cellsWithEvidence.get(cellKey) || false;
    
    // Debug logging
    if (hasEvidence) {
      console.log('✅ Cell has evidence:', { row, col, sheet, cellKey });
    }
    
    return hasEvidence;
  }, [cellsWithEvidence, getCellKey]);

  // Function to handle opening reference files dialog
  const handleOpenReferenceFilesDialog = useCallback(async () => {
    if (selections.length === 0) return;
    
    const lastSelection = selections[selections.length - 1];
    if (!lastSelection || lastSelection.sheet !== selectedSheet) return;

    const { start, end } = lastSelection;
    await fetchEvidenceFilesForRange(
      selectedSheet,
      start.row,
      start.col,
      end.row,
      end.col
    );
    setIsDualOptionsDialogOpen(false);
    setIsReferenceFilesDialogOpen(true);
  }, [selections, selectedSheet, fetchEvidenceFilesForRange]);

  // Function to handle opening file in new tab
  const handleOpenFileInNewTab = useCallback((fileUrl: string) => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  }, []);

  // Function to handle reference file upload
  // ✅ This works for ALL workbooks regardless of rowType (etb, working-paper, evidence)
  // Reference files can be added to any workbook in any tab (lead-sheet, working-papers, evidence)
  const handleReferenceFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const engagementId = (props as any).engagementId;
    const classification = (props as any).classification;
    const workbook = props.workbook;
    const setSelectedWorkbook = (props as any).setSelectedWorkbook;
    const onRefreshMappings = (props as any).onRefreshMappings;
    const rowType = (props as any).rowType || 'etb';

    console.log('📤 Uploading reference files for workbook:', {
      workbookId: workbook?.id,
      workbookName: workbook?.name,
      rowType,
      engagementId,
      classification,
      fileCount: files.length
    });

    if (!engagementId || !classification || !workbook?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Engagement ID, classification, and workbook are required to upload reference files",
      });
      return;
    }

    if (selections.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select cells before uploading reference files",
      });
      return;
    }

    const lastSelection = selections[selections.length - 1];
    if (!lastSelection || lastSelection.sheet !== selectedSheet) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid selection",
      });
      return;
    }

    setUploadingFiles(true);

    try {
      // Get classification ID
      const classificationId = await getClassificationId(classification, engagementId);
      console.log(`Uploading reference files for classification: ${classification} -> ${classificationId}`);

      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file
        const validation = validateFile(file);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid file');
        }

        // Upload file to storage
        const uploadResult = await uploadFileToStorage(file);

        // Create evidence record via API
        const evidenceData = {
          engagementId: engagementId,
          classificationId: classificationId,
          evidenceUrl: uploadResult.url
        };

        const response = await createClassificationEvidence(evidenceData);
        const evidenceId = response.evidence._id;

        // ✅ IMPORTANT: Add reference file to workbook WITHOUT creating a mapping
        // Reference files and mappings are completely separate concepts
        // Use the new endpoint that only updates referenceFiles, not mappings
        const addRefResult = await addReferenceFileToWorkbook(
          workbook.id,
          evidenceId,
          {
            sheet: lastSelection.sheet,
            start: {
              row: lastSelection.start.row,
              col: lastSelection.start.col,
            },
            end: {
              row: lastSelection.end.row,
              col: lastSelection.end.col,
            },
          }
        );

        if (!addRefResult.success) {
          throw new Error(addRefResult.error || 'Failed to add reference file to workbook');
        }

        console.log('✅ Reference file added to workbook (no mapping created):', {
          workbookId: workbook.id,
          evidenceId,
          cellRange: {
            sheet: lastSelection.sheet,
            start: lastSelection.start,
            end: lastSelection.end
          },
          updatedWorkbook: addRefResult.workbook
        });

        return {
          evidenceId,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.url,
          fileType: uploadResult.fileType,
          fileSize: uploadResult.fileSize,
          updatedWorkbook: addRefResult.workbook, // Return updated workbook from backend
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      console.log('✅ All files uploaded, updating workbook state:', {
        uploadedFilesCount: uploadedFiles.length,
        workbookId: workbook.id,
        currentReferenceFilesCount: workbook.referenceFiles?.length || 0
      });

      // ✅ CRITICAL: Immediately update workbook's referenceFiles in local state
      // Use the last updated workbook from backend response if available
      // IMPORTANT: Preserve all existing workbook properties, especially fileData
      let updatedWorkbook = workbook;
      
      // Try to use the updated workbook from the last backend response
      // ✅ CRITICAL: Use the LAST uploaded file's response (most up-to-date)
      const lastBackendResponse = uploadedFiles[uploadedFiles.length - 1];
      if (lastBackendResponse?.updatedWorkbook) {
        const backendWorkbook = lastBackendResponse.updatedWorkbook;
        
        // ✅ CRITICAL: Normalize workbook ID (backend might use _id, frontend uses id)
        const normalizedBackendWorkbook = {
          ...backendWorkbook,
          id: backendWorkbook._id || backendWorkbook.id,
        };
        
        // ✅ CRITICAL: Preserve fileData and other important properties from original workbook
        updatedWorkbook = {
          ...normalizedBackendWorkbook,
          fileData: workbook.fileData || normalizedBackendWorkbook.fileData, // Preserve fileData
          sheets: workbook.sheets || normalizedBackendWorkbook.sheets, // Preserve sheets
          mappings: workbook.mappings || normalizedBackendWorkbook.mappings, // Preserve mappings
          namedRanges: workbook.namedRanges || normalizedBackendWorkbook.namedRanges, // Preserve namedRanges
        };
        
        // ✅ CRITICAL: Ensure referenceFiles is properly structured
        if (updatedWorkbook.referenceFiles && Array.isArray(updatedWorkbook.referenceFiles)) {
          // Normalize referenceFiles structure
          updatedWorkbook.referenceFiles = updatedWorkbook.referenceFiles.map((ref: any) => {
            if (!ref || typeof ref !== 'object' || !ref.details) return null;
            
            // Normalize evidence IDs (backend might populate them as objects)
            const normalizedEvidence = (ref.evidence || []).map((ev: any) => {
              // If it's already a string ID, return as is
              if (typeof ev === 'string' || ev instanceof String) return ev;
              // If it's an object with _id or id, extract the ID
              if (ev && typeof ev === 'object') {
                return ev._id || ev.id || ev;
              }
              return ev;
            }).filter((ev: any) => ev !== null && ev !== undefined);
            
            return {
              ...ref,
              evidence: normalizedEvidence
            };
          }).filter((ref: any) => ref !== null && ref.details && ref.details.sheet);
        }
        
        console.log('✅ Using updated workbook from backend response (with preserved fileData):', {
          workbookId: updatedWorkbook.id,
          workbookIdBackend: backendWorkbook._id,
          referenceFilesCount: updatedWorkbook.referenceFiles?.length || 0,
          referenceFiles: updatedWorkbook.referenceFiles?.map((ref: any) => ({
            hasDetails: !!ref?.details,
            sheet: ref?.details?.sheet,
            start: ref?.details?.start,
            end: ref?.details?.end,
            evidenceCount: ref?.evidence?.length || 0,
            evidenceIds: ref?.evidence?.map((e: any) => e?._id || e?.toString?.() || e) || []
          })) || [],
          hasFileData: !!updatedWorkbook.fileData,
          fileDataKeys: updatedWorkbook.fileData ? Object.keys(updatedWorkbook.fileData) : []
        });
      } else {
        // Fallback: manually construct updated workbook if backend didn't return it
        // ✅ CRITICAL: Preserve all existing workbook properties
        updatedWorkbook = { 
          ...workbook, // This preserves fileData, sheets, mappings, etc.
        };
        if (!updatedWorkbook.referenceFiles) {
          updatedWorkbook.referenceFiles = [];
        }

        // Clean up old format entries
        updatedWorkbook.referenceFiles = updatedWorkbook.referenceFiles.filter((ref: any) => {
          return ref && typeof ref === 'object' && ref.details && ref.details.sheet;
        });

        // Find or create reference file entry for this cell range
        const { sheet, start, end } = lastSelection;
        const normalizedEnd = {
          row: end?.row ?? start.row,
          col: end?.col ?? start.col,
        };

        let refFileEntry = updatedWorkbook.referenceFiles.find((ref: any) => {
          if (!ref.details) return false;
          return (
            ref.details.sheet === sheet &&
            ref.details.start.row === start.row &&
            ref.details.start.col === start.col &&
            ref.details.end.row === normalizedEnd.row &&
            ref.details.end.col === normalizedEnd.col
          );
        });

        if (refFileEntry) {
          // Add all new evidence IDs to existing entry
          uploadedFiles.forEach((file: any) => {
            if (!refFileEntry.evidence) {
              refFileEntry.evidence = [];
            }
            if (!refFileEntry.evidence.some((evId: any) => evId.toString() === file.evidenceId)) {
              refFileEntry.evidence.push(file.evidenceId);
            }
          });
        } else {
          // Create new reference file entry
          refFileEntry = {
            details: {
              sheet: sheet,
              start: {
                row: start.row,
                col: start.col,
              },
              end: {
                row: normalizedEnd.row,
                col: normalizedEnd.col,
              },
            },
            evidence: uploadedFiles.map((file: any) => file.evidenceId),
          };
          updatedWorkbook.referenceFiles.push(refFileEntry);
        }
        
        console.log('✅ Manually constructed updated workbook:', {
          workbookId: updatedWorkbook.id,
          referenceFilesCount: updatedWorkbook.referenceFiles.length,
          newEntry: refFileEntry,
          hasFileData: !!updatedWorkbook.fileData,
          fileDataKeys: updatedWorkbook.fileData ? Object.keys(updatedWorkbook.fileData) : []
        });
      }

      // ✅ CRITICAL: Ensure fileData and all other important properties are preserved
      // This is a safety check in case the backend response doesn't include these properties
      if (!updatedWorkbook.fileData && workbook.fileData) {
        updatedWorkbook.fileData = workbook.fileData;
        console.log('⚠️ Restored fileData to updated workbook');
      }
      if (!updatedWorkbook.sheets && workbook.sheets) {
        updatedWorkbook.sheets = workbook.sheets;
      }
      if (!updatedWorkbook.mappings && workbook.mappings) {
        updatedWorkbook.mappings = workbook.mappings;
      }
      if (!updatedWorkbook.namedRanges && workbook.namedRanges) {
        updatedWorkbook.namedRanges = workbook.namedRanges;
      }
      
      // ✅ CRITICAL: Verify fileData is present before updating
      if (!updatedWorkbook.fileData) {
        console.error('❌ ERROR: fileData is missing from updated workbook!', {
          workbookId: updatedWorkbook.id,
          originalHasFileData: !!workbook.fileData,
          originalFileDataKeys: workbook.fileData ? Object.keys(workbook.fileData) : []
        });
      }

      // ✅ CRITICAL: Log the updated workbook structure before updating state
      console.log('📋 Updated workbook structure before state update:', {
        workbookId: updatedWorkbook.id,
        referenceFilesCount: updatedWorkbook.referenceFiles?.length || 0,
        referenceFiles: updatedWorkbook.referenceFiles?.map((ref: any) => ({
          hasDetails: !!ref?.details,
          sheet: ref?.details?.sheet,
          start: ref?.details?.start,
          end: ref?.details?.end,
          evidenceCount: ref?.evidence?.length || 0,
          evidenceIds: ref?.evidence?.map((e: any) => e?.toString?.() || e) || []
        })) || [],
        hasFileData: !!updatedWorkbook.fileData
      });

      // ✅ CRITICAL: Force immediate UI update by updating workbook state
      // Set timestamp BEFORE creating new reference to ensure it's included
      const updateTimestamp = Date.now();
      (updatedWorkbook as any)._referenceFilesUpdateTimestamp = updateTimestamp;
      
      // ✅ CRITICAL: Normalize workbook ID (backend might use _id, frontend uses id)
      if (updatedWorkbook._id && !updatedWorkbook.id) {
        updatedWorkbook.id = updatedWorkbook._id;
      }
      
      // ✅ CRITICAL: Ensure referenceFiles array is properly structured and has new reference
      if (updatedWorkbook.referenceFiles) {
        updatedWorkbook.referenceFiles = updatedWorkbook.referenceFiles.map((ref: any) => {
          if (!ref || typeof ref !== 'object') return null;
          // Normalize evidence IDs (might be objects from populate or just IDs)
          const normalizedEvidence = (ref.evidence || []).map((ev: any) => {
            if (typeof ev === 'string' || ev instanceof String) return ev;
            if (ev && typeof ev === 'object' && (ev._id || ev.id)) return ev._id || ev.id;
            return ev;
          }).filter((ev: any) => ev !== null && ev !== undefined);
          
          return {
            ...ref,
            evidence: normalizedEvidence
          };
        }).filter((ref: any) => ref !== null && ref.details && ref.details.sheet);
      }
      
      // ✅ CRITICAL: Create a completely new object reference to ensure React detects the change
      // This is important because React uses shallow comparison for props
      // Use deep clone for nested arrays to ensure new references
      const newWorkbookReference = {
        ...updatedWorkbook,
        // Ensure referenceFiles is a new array reference with new object references
        referenceFiles: updatedWorkbook.referenceFiles ? updatedWorkbook.referenceFiles.map((ref: any) => ({
          ...ref,
          details: ref.details ? { ...ref.details } : ref.details,
          evidence: ref.evidence ? [...ref.evidence] : []
        })) : [],
        // ✅ CRITICAL: Include the timestamp in the new reference to force re-render
        _referenceFilesUpdateTimestamp: updateTimestamp
      };
      
      // Update workbook via setSelectedWorkbook if available
      if (setSelectedWorkbook) {
        // ✅ CRITICAL: Use functional update to ensure we get the latest state
        setSelectedWorkbook((prevWorkbook: any) => {
          // If prevWorkbook exists and has the same ID, merge with updated data
          const prevId = prevWorkbook?.id || prevWorkbook?._id;
          const newId = newWorkbookReference.id || newWorkbookReference._id;
          
          if (prevWorkbook && prevId === newId) {
            const merged = {
              ...prevWorkbook,
              ...newWorkbookReference,
              // Ensure referenceFiles is a completely new array reference
              referenceFiles: newWorkbookReference.referenceFiles.map((ref: any) => ({
                ...ref,
                details: ref.details ? { ...ref.details } : ref.details,
                evidence: ref.evidence ? [...ref.evidence] : []
              })),
              // Preserve fileData from previous if it exists
              fileData: newWorkbookReference.fileData || prevWorkbook.fileData,
              // Normalize ID
              id: newId || prevId,
              // ✅ CRITICAL: Include timestamp to force re-render
              _referenceFilesUpdateTimestamp: updateTimestamp
            };
            console.log('🔄 Merged workbook in setSelectedWorkbook:', {
              prevId: prevId,
              newId: merged.id,
              prevReferenceFilesCount: prevWorkbook.referenceFiles?.length || 0,
              newReferenceFilesCount: merged.referenceFiles?.length || 0,
              referenceFiles: merged.referenceFiles?.map((ref: any) => ({
                sheet: ref?.details?.sheet,
                start: ref?.details?.start,
                end: ref?.details?.end,
                evidenceCount: ref?.evidence?.length || 0
              })) || [],
              isNewReference: merged !== prevWorkbook,
              referenceFilesIsNewArray: merged.referenceFiles !== prevWorkbook.referenceFiles
            });
            return merged;
          }
          console.log('🔄 Setting new workbook in setSelectedWorkbook:', {
            workbookId: newId,
            referenceFilesCount: newWorkbookReference.referenceFiles?.length || 0,
            referenceFiles: newWorkbookReference.referenceFiles?.map((ref: any) => ({
              sheet: ref?.details?.sheet,
              start: ref?.details?.start,
              evidenceCount: ref?.evidence?.length || 0
            })) || []
          });
          return newWorkbookReference;
        });
        console.log('✅ Workbook referenceFiles updated immediately in UI via setSelectedWorkbook (with new reference):', {
          workbookId: updatedWorkbook.id,
          referenceFilesCount: updatedWorkbook.referenceFiles?.length || 0,
          timestamp: (newWorkbookReference as any)._referenceFilesUpdateTimestamp,
          hasFileData: !!updatedWorkbook.fileData,
          fileDataKeys: updatedWorkbook.fileData ? Object.keys(updatedWorkbook.fileData) : [],
          referenceFilesDetails: updatedWorkbook.referenceFiles?.map((ref: any) => ({
            sheet: ref?.details?.sheet,
            start: ref?.details?.start,
            end: ref?.details?.end,
            evidenceCount: ref?.evidence?.length || 0
          })) || [],
          newWorkbookReference: {
            id: newWorkbookReference.id,
            referenceFilesCount: newWorkbookReference.referenceFiles?.length || 0
          }
        });
      } else {
        // If setSelectedWorkbook is not available, update the workbook object directly
        // This is a workaround - ideally we should always have setSelectedWorkbook
        // ✅ CRITICAL: Preserve fileData when updating directly
        const originalFileData = props.workbook.fileData;
        // ✅ CRITICAL: Create new object reference, don't mutate directly
        const updatedPropsWorkbook = {
          ...props.workbook,
          ...newWorkbookReference,
          referenceFiles: [...(newWorkbookReference.referenceFiles || [])],
          fileData: newWorkbookReference.fileData || originalFileData
        };
        Object.assign(props.workbook, updatedPropsWorkbook);
        (props.workbook as any)._referenceFilesUpdateTimestamp = Date.now();
        console.log('⚠️ setSelectedWorkbook not available, updated workbook directly with timestamp and preserved fileData');
        console.log('📋 Updated props.workbook.referenceFiles:', {
          count: props.workbook.referenceFiles?.length || 0,
          referenceFiles: props.workbook.referenceFiles?.map((ref: any) => ({
            hasDetails: !!ref?.details,
            sheet: ref?.details?.sheet,
            start: ref?.details?.start,
            end: ref?.details?.end,
            evidenceCount: ref?.evidence?.length || 0
          })) || []
        });
      }

      // Use updated workbook for subsequent operations
      const workbookToUse = setSelectedWorkbook ? updatedWorkbook : props.workbook;
      
      // ✅ CRITICAL: Ensure workbook ID is valid before using it
      const workbookId = workbookToUse?.id || workbookToUse?._id || workbook?.id || workbook?._id;
      if (!workbookId) {
        console.error('❌ ERROR: Workbook ID is missing!', {
          workbookToUse,
          updatedWorkbook,
          originalWorkbook: workbook
        });
        throw new Error('Workbook ID is required but was not found');
      }

      // ✅ CRITICAL: Update UI immediately with the workbook from upload response
      // This ensures the user sees the changes right away, before the backend refresh
      console.log('✅ Immediate UI update completed, referenceFiles should now be visible');
      
      // ✅ CRITICAL: Keep upload loader visible during evidence files fetching
      // The loader will stay visible in the upload dialog until everything is ready
      
      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded and linked to selected cells successfully`,
      });

      // Refresh mappings if callback provided - only if workbookId is valid
      // Do this in parallel with fetching evidence files for better performance
      const mappingRefreshPromise = onRefreshMappings && workbookId 
        ? (async () => {
            console.log('🔄 Refreshing mappings for workbook:', workbookId);
            try {
              await onRefreshMappings(workbookId);
            } catch (error) {
              console.error('❌ Error refreshing mappings:', error);
              // Don't throw - this is not critical for the upload operation
            }
          })()
        : Promise.resolve();

      // Refresh evidence files for the cell range
      // ✅ CRITICAL: Wait for fetchEvidenceFilesForRange to complete BEFORE closing upload dialog
      // This ensures loadingEvidenceFiles is set to false and files are loaded before dialog opens
      // ✅ CRITICAL: Keep upload loader visible during this process
      await Promise.all([
        fetchEvidenceFilesForRange(
          lastSelection.sheet,
          lastSelection.start.row,
          lastSelection.start.col,
          lastSelection.end.row,
          lastSelection.end.col,
          updatedWorkbook // Pass the updated workbook with latest referenceFiles
        ),
        mappingRefreshPromise
      ]);

      // ✅ CRITICAL: Now that everything is ready, close upload dialog and turn off loader
      setIsUploadReferenceFilesDialogOpen(false);
      setUploadingFiles(false);

      // ✅ CRITICAL: Only open dialog AFTER fetchEvidenceFilesForRange completes successfully
      // This ensures the dialog opens with files already loaded (no flickering)
      // Use setTimeout(0) to ensure state updates from fetchEvidenceFilesForRange are processed
      await new Promise(resolve => setTimeout(resolve, 0));
      
      setIsReferenceFilesDialogOpen(true);

      // ✅ NEW: Dispatch event to notify ClassificationSection to refresh evidence files
      // This allows the Evidence tab to refresh in the background without switching tabs
      if (engagementId) {
        const eventDetail = {
          engagementId: engagementId,
          classification: classification,
          evidenceCount: uploadedFiles.length,
          evidenceIds: uploadedFiles.map((file: any) => file.evidenceId)
        };
        console.log('📣 ExcelViewer: Dispatching evidence-uploaded event:', eventDetail);
        const event = new CustomEvent('evidence-uploaded', { detail: eventDetail });
        window.dispatchEvent(event);
      }

      // ✅ Refresh from backend in the background after dialog opens to ensure data consistency
      // This runs asynchronously and won't cause flickering since dialog is already open
      (async () => {
        try {
          const { db_WorkbookApi } = await import('@/lib/api/workbookApi');
          const refreshedWorkbookResponse = await db_WorkbookApi.getWorkbookById(workbookId);
          
          if (refreshedWorkbookResponse.success && refreshedWorkbookResponse.data && setSelectedWorkbook) {
            const refreshedWorkbook = refreshedWorkbookResponse.data;
            
            // Normalize ID
            if (refreshedWorkbook._id && !refreshedWorkbook.id) {
              refreshedWorkbook.id = refreshedWorkbook._id;
            }
            
            // Preserve fileData from current workbook
            refreshedWorkbook.fileData = updatedWorkbook.fileData || workbook.fileData;
            
            // Normalize referenceFiles structure
            if (refreshedWorkbook.referenceFiles && Array.isArray(refreshedWorkbook.referenceFiles)) {
              refreshedWorkbook.referenceFiles = refreshedWorkbook.referenceFiles.map((ref: any) => {
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
            
            // Update workbook with refreshed data (only if dialog is still open)
            setSelectedWorkbook((prevWorkbook: any) => {
              const prevId = prevWorkbook?.id || prevWorkbook?._id;
              const newId = refreshedWorkbook.id || refreshedWorkbook._id;
              
              if (prevWorkbook && prevId === newId) {
                return {
                  ...prevWorkbook,
                  ...refreshedWorkbook,
                  referenceFiles: refreshedWorkbook.referenceFiles || prevWorkbook.referenceFiles,
                  fileData: refreshedWorkbook.fileData || prevWorkbook.fileData,
                  id: newId || prevId
                };
              }
              return refreshedWorkbook;
            });
            
            console.log('✅ Workbook refreshed from backend (background)');
          }
        } catch (refreshError) {
          console.error('❌ Error refreshing workbook from backend (background):', refreshError);
          // Continue silently - this is a background refresh
        }
      })();
    } catch (error: any) {
      console.error('Error uploading reference files:', error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || 'Failed to upload files',
      });
      // ✅ CRITICAL: Close upload dialog and turn off loader on error
      setIsUploadReferenceFilesDialogOpen(false);
      setUploadingFiles(false);
    } finally {
      // ✅ CRITICAL: Only reset file input here, NOT the loader state
      // The loader state is now managed in the success/error paths above
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  }, [props, selections, selectedSheet, fetchEvidenceFilesForRange, toast]);

  // Auto-scrolling: Handle mouse move and mouse up events during selection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Only track mouse position if mouse button is pressed (dragging)
      if (e.buttons === 1) {
        isMouseDownRef.current = true;
        // Update both state and ref for immediate access
        currentMousePositionRef.current = { x: e.clientX, y: e.clientY };
        setMousePosition({ x: e.clientX, y: e.clientY });
      } else {
        isMouseDownRef.current = false;
      }
    };

    const handleMouseDown = () => {
      isMouseDownRef.current = true;
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      // Stop auto-scrolling
      if (autoScrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollAnimationFrameRef.current);
        autoScrollAnimationFrameRef.current = null;
      }
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    };

    if (isSelecting) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      isMouseDownRef.current = false;
      if (autoScrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollAnimationFrameRef.current);
        autoScrollAnimationFrameRef.current = null;
      }
      if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        setAutoScrollInterval(null);
      }
    };
  }, [isSelecting, autoScrollInterval, setAutoScrollInterval]);

  // ✅ IMPROVED: Smooth auto-scrolling logic using requestAnimationFrame
  useEffect(() => {
    if (!isSelecting || !spreadsheetContainerRef.current) {
      // Stop scrolling if not selecting
      if (autoScrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollAnimationFrameRef.current);
        autoScrollAnimationFrameRef.current = null;
      }
      return;
    }

    const container = spreadsheetContainerRef.current;
    const edgeThreshold = 50; // pixels from edge to trigger scrolling
    const maxScrollSpeed = 25; // maximum pixels per frame
    const minScrollSpeed = 1; // minimum pixels per frame
    
    // Smooth scrolling function using requestAnimationFrame
    const smoothScroll = () => {
      // Only scroll if mouse button is actually pressed (dragging)
      if (!isMouseDownRef.current || !container) {
        autoScrollAnimationFrameRef.current = null;
        return;
      }

      // Use ref for immediate access without state delay
      const mouseX = currentMousePositionRef.current.x;
      const mouseY = currentMousePositionRef.current.y;
      
      // Get container's position and dimensions relative to viewport
      const containerRect = container.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Check if container can scroll in each direction
      const canScrollHorizontally = container.scrollWidth > container.clientWidth;
      const canScrollVertically = container.scrollHeight > container.clientHeight;
      
      let scrollX = 0;
      let scrollY = 0;
      let needsScroll = false;

      // ✅ IMPROVED HORIZONTAL SCROLLING: Check if mouse is over the container area
      if (canScrollHorizontally) {
        // Check if mouse is within the vertical bounds of the container
        const isMouseOverContainerVertically = 
          mouseY >= containerRect.top && 
          mouseY <= containerRect.bottom;
        
        if (isMouseOverContainerVertically) {
          // Check right edge - use container edge, not viewport edge
          const distanceFromContainerRight = containerRect.right - mouseX;
          const isOverContainerRight = distanceFromContainerRight <= edgeThreshold && distanceFromContainerRight > 0;
          
          if (isOverContainerRight) {
            // Calculate scroll speed based on proximity to edge (closer = faster)
            const normalizedDistance = Math.min(distanceFromContainerRight, edgeThreshold) / edgeThreshold;
            const speedFactor = Math.pow(1 - normalizedDistance, 2); // Quadratic easing for smooth acceleration
            scrollX = minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * speedFactor;
            needsScroll = true;
          }
          
          // Check left edge - use container edge, not viewport edge
          const distanceFromContainerLeft = mouseX - containerRect.left;
          const isOverContainerLeft = distanceFromContainerLeft <= edgeThreshold && distanceFromContainerLeft > 0;
          
          if (isOverContainerLeft) {
            const normalizedDistance = Math.min(distanceFromContainerLeft, edgeThreshold) / edgeThreshold;
            const speedFactor = Math.pow(1 - normalizedDistance, 2);
            scrollX = -(minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * speedFactor);
            needsScroll = true;
          }
        }
      }

      // ✅ IMPROVED VERTICAL SCROLLING: Check if mouse is over the container area
      if (canScrollVertically) {
        // Check if mouse is within the horizontal bounds of the container
        const isMouseOverContainerHorizontally = 
          mouseX >= containerRect.left && 
          mouseX <= containerRect.right;
        
        if (isMouseOverContainerHorizontally) {
          // Check bottom edge - use container edge, not viewport edge
          const distanceFromContainerBottom = containerRect.bottom - mouseY;
          const isOverContainerBottom = distanceFromContainerBottom <= edgeThreshold && distanceFromContainerBottom > 0;
          
          if (isOverContainerBottom) {
            const normalizedDistance = Math.min(distanceFromContainerBottom, edgeThreshold) / edgeThreshold;
            const speedFactor = Math.pow(1 - normalizedDistance, 2);
            scrollY = minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * speedFactor;
            needsScroll = true;
          }
          
          // Check top edge - use container edge, not viewport edge
          const distanceFromContainerTop = mouseY - containerRect.top;
          const isOverContainerTop = distanceFromContainerTop <= edgeThreshold && distanceFromContainerTop > 0;
          
          if (isOverContainerTop) {
            const normalizedDistance = Math.min(distanceFromContainerTop, edgeThreshold) / edgeThreshold;
            const speedFactor = Math.pow(1 - normalizedDistance, 2);
            scrollY = -(minScrollSpeed + (maxScrollSpeed - minScrollSpeed) * speedFactor);
            needsScroll = true;
          }
        }
      }

      // Apply smooth scrolling
      if (needsScroll) {
        // Check scroll limits before scrolling to prevent unnecessary operations
        const maxScrollLeft = container.scrollWidth - container.clientWidth;
        const maxScrollTop = container.scrollHeight - container.clientHeight;
        
        // Only scroll if we haven't reached the limits
        const canScrollRight = scrollX > 0 && container.scrollLeft < maxScrollLeft;
        const canScrollLeft = scrollX < 0 && container.scrollLeft > 0;
        const canScrollDown = scrollY > 0 && container.scrollTop < maxScrollTop;
        const canScrollUp = scrollY < 0 && container.scrollTop > 0;
        
        // Apply scrolling only if we can actually scroll in that direction
        if ((scrollX !== 0 && (canScrollRight || canScrollLeft)) || 
            (scrollY !== 0 && (canScrollDown || canScrollUp))) {
          container.scrollBy({
            left: scrollX,
            top: scrollY,
            behavior: 'auto' // Use 'auto' for instant but smooth scrolling
          });
        }
      }

      // Continue animation loop
      autoScrollAnimationFrameRef.current = requestAnimationFrame(smoothScroll);
    };

    // Start the smooth scrolling loop when selecting
    // The loop will check mouse position and only scroll if near edges
    if (isSelecting) {
      autoScrollAnimationFrameRef.current = requestAnimationFrame(smoothScroll);
    }

    return () => {
      if (autoScrollAnimationFrameRef.current !== null) {
        cancelAnimationFrame(autoScrollAnimationFrameRef.current);
        autoScrollAnimationFrameRef.current = null;
      }
    };
  }, [isSelecting, spreadsheetContainerRef]);

  const resolveFullscreenRowIdentifier = useCallback(
    (row?: Partial<ETBRow>, fallback?: string) => {
      if (!row) return fallback;
      const identifier =
        (row as any)?._id ||
        (row as any)?.id ||
        (row as any)?.rowId ||
        row.code;
      return identifier || fallback;
    },
    []
  );


  // Function to load sheet data on-demand from MS Drive
  const loadSheetDataOnDemand = useCallback(async (sheetName: string) => {
    // Check if already in cache
    if (sheetDataCache.has(sheetName)) {
      return sheetDataCache.get(sheetName);
    }

    // Check if already loading
    if (loadingSheets.has(sheetName)) {
      return null; // Wait for existing load to complete
    }

    try {
      setLoadingSheets(prev => new Set(prev).add(sheetName));

      // Use the proper API function from workbookApi
      const response = await db_WorkbookApi.fetchSheetData(props.workbook?.id, sheetName);

      if (response.success && response.data) {
        // Backend returns: { metadata: {...}, values: [...], address: "Sheet1!A1:D10" }
        const processedData = processSheetDataForDisplay(response.data.values, response.data.address);
        setSheetDataCache(prev => new Map(prev).set(sheetName, processedData));
        return processedData;
      }

      // Fallback: try to get from workbook.fileData if available
      if (props.workbook.fileData && props.workbook.fileData[sheetName]) {
        const data = props.workbook.fileData[sheetName];
        setSheetDataCache(prev => new Map(prev).set(sheetName, data));
        return data;
      }

      return null;
    } catch (error) {
      console.error(`Error loading sheet ${sheetName}:`, error);
      return null;
    } finally {
      setLoadingSheets(prev => {
        const next = new Set(prev);
        next.delete(sheetName);
        return next;
      });
    }
  }, [props.workbook, sheetDataCache, loadingSheets]);

  // Helper function to process sheet data for display
  const processSheetDataForDisplay = (rawData: any[][], address?: string) => {
    if (!rawData || rawData.length === 0) {
      return [[""]];
    }

    try {
      // Use provided utils to process
      const { start: { row: startRow, col: startCol } } = parseExcelRange(address || "A1");

      const maxRows = rawData.length;
      const maxCols = Math.max(...rawData.map(r => r.length), 0);
      const totalRows = Math.max(20, startRow + maxRows - 1);
      const totalCols = Math.max(10, startCol + maxCols);

      const headerRow = [""];
      for (let i = 0; i < totalCols; i++) {
        headerRow.push(zeroIndexToExcelCol(i));
      }

      const result = [headerRow];
      for (let i = 0; i < totalRows; i++) {
        const row = [(i + 1).toString()];
        for (let j = 0; j < totalCols; j++) {
          const dataRowIdx = i - (startRow - 1);
          const dataColIdx = j - startCol;

          let cellValue = "";
          if (dataRowIdx >= 0 && dataRowIdx < maxRows &&
            dataColIdx >= 0 && dataColIdx < maxCols &&
            rawData[dataRowIdx]?.[dataColIdx] !== undefined) {
            cellValue = String(rawData[dataRowIdx][dataColIdx]);
          }
          row.push(cellValue);
        }
        result.push(row);
      }
      return result;
    } catch (error) {
      console.error("Error processing sheet data:", error);
      return [[""]];
    }
  };

  // Load sheet data when selectedSheet changes
  useEffect(() => {
    if (selectedSheet && props.workbook?.id) {
      loadSheetDataOnDemand(selectedSheet);
    }
  }, [selectedSheet, props.workbook?.id, loadSheetDataOnDemand]);

  // ✅ NEW: Initialize sheet selection when workbook changes
  // Use initialSheet prop if provided (from saved preference), otherwise use first sheet
  useEffect(() => {
    if (!props.workbook?.id) return;
    
    const sheetNames = props.workbook.fileData 
      ? Object.keys(props.workbook.fileData)
      : (props.workbook.sheets?.map((s: any) => s.name) || []);
    
    if (sheetNames.length === 0) return;
    
    // Use initialSheet from props (saved preference) if provided and valid
    // Otherwise use first sheet
    const sheetToSelect = (props.initialSheet && sheetNames.includes(props.initialSheet))
      ? props.initialSheet
      : sheetNames[0];
    
    // Only set if different from current (to avoid unnecessary updates)
    if (selectedSheet !== sheetToSelect) {
      isInitializingRef.current = true; // Mark as initializing
      setSelectedSheet(sheetToSelect);
      console.log(`ExcelViewerWithFullscreen: Initialized sheet to ${sheetToSelect} (from ${props.initialSheet ? 'saved preference' : 'default'})`);
      // Mark initialization complete after a short delay
      setTimeout(() => {
        isInitializingRef.current = false;
      }, 100);
    }
  }, [props.workbook.id, props.initialSheet]); // Run when workbook ID or initialSheet changes

  // Reset states when workbook changes
  useEffect(() => {
    setSelections([]);
    setIsSelecting(false);
    anchorSelectionStart.current = null;
    setIsSaveDialogOpen(false);
    setIsNamedRangesDialogOpen(false);
    setIsCreateNamedRangeOpen(false);
    setIsEditNamedRangeOpen(false);
    setEditingNamedRange(null);
    setNewNamedRangeName("");
    setNewNamedRangeRange("");
    // Reset ETB mapping states
    setIsETBMappingsDialogOpen(false);
    setIsCreateETBMappingOpen(false);
    setIsEditETBMappingOpen(false);
    setEditingETBMapping(null);
    setSelectedETBRow(null);
    setMappingFilesToUpload([]); // Clear uploaded files
    setIsUploadingMappingFiles(false);
    setUploadProgress({});

    // Reset Workbook mapping states
    setIsWorkbookMappingsDialogOpen(false);
    setIsCreateWorkbookMappingOpen(false);
    setIsEditWorkbookMappingOpen(false);
    setEditingWorkbookMapping(null);
  }, [props.workbook.id]);

  // Get engagementId for use in handleCreateETBMapping
  const engagementId = (props as any).engagementId;

  // Fetch data based on rowType (ETB, Working Paper, or Evidence)
  const fetchETBData = useCallback(async () => {
    // Get props inside useCallback to avoid stale closures
    const engagementId = (props as any).engagementId;
    const classification = (props as any).classification;
    const rowType = (props as any).rowType || 'etb';
    const parentEtbData = (props as any).parentEtbData; // ✅ Get parent data if provided

    // ✅ CRITICAL: ALWAYS use parent data if provided (ensures dialog lists same rows as parent table)
    if (parentEtbData) {
      console.log('ExcelViewer: ✅ Using parent-provided data (no fetch needed):', {
        rowType,
        classification,
        dataRows: parentEtbData.rows?.length || 0,
        firstThreeRows: parentEtbData.rows?.slice(0, 3)?.map(r => ({
          code: r.code,
          name: r.accountName,
          mappingsCount: r.mappings?.length || 0
        }))
      });
      
      // ✅ ENHANCEMENT: Enhance mappings with workbook information
      const workbook = props.workbook; // Get the workbook object
      
      // ✅ CRITICAL: For mapping dialog, show ALL ETB rows from engagement (no classification filtering)
      // This allows users to see all account names from the engagement's ETB
      console.log('ExcelViewer: ✅ Using all ETB rows for mapping dialog (no classification filter):', {
        totalRows: parentEtbData.rows?.length || 0,
        uniqueClassifications: parentEtbData.rows ? Array.from(new Set(
          parentEtbData.rows.map(row => row.classification).filter(Boolean)
        )) : []
      });
      
      const enhancedData = {
        ...parentEtbData,
        rows: (parentEtbData.rows || []).map(row => ({
          ...row,
          mappings: row.mappings?.map(mapping => ({
            ...mapping,
            workbookId: mapping.workbookId && typeof mapping.workbookId === 'string' 
              ? {
                  _id: mapping.workbookId,
                  name: workbook.name || 'Unknown Workbook'
                }
              : mapping.workbookId
          })) || []
        }))
      };
      
      setEtbData(enhancedData);
      setEtbLoading(false);
      setEtbError(null);
      return; // ✅ Parent data is authoritative - skip API fetch
    }

    if (!engagementId) {
      setEtbData(null);
      return;
    }

    // For Working Papers, we need classification
    if (rowType === 'working-paper' && !classification) {
      console.log('ExcelViewer: Skipping Working Paper fetch - classification is required');
      return;
    }

    const dataType = rowType === 'working-paper' ? 'Working Paper' : rowType === 'evidence' ? 'Evidence' : 'ETB';
    console.log(`ExcelViewer: Fetching ${dataType} data for engagement:`, engagementId, 'classification:', classification);

    try {
      setEtbLoading(true);
      setEtbError(null);

      let result;

      if (rowType === 'working-paper' && classification) {
        // Fetch Working Paper data for this classification
        console.log('ExcelViewer: About to call getWorkingPaperWithMappings...');
        try {
          result = await getWorkingPaperWithMappings(engagementId, classification);
          console.log('ExcelViewer: ✅ Working Paper data received:', {
            totalRows: result?.rows?.length || 0,
            firstThreeRows: result?.rows?.slice(0, 3)?.map(r => ({
              code: r.code,
              name: r.accountName,
              classification: r.classification
            }))
          });
        } catch (wpError: any) {
          console.error('ExcelViewer: ❌ Working Paper API error:', wpError);
          // If no Working Paper exists yet, fall back to ETB data for this classification
          if (wpError.response?.status === 404 || wpError.message?.includes('404')) {
            console.log('ExcelViewer: 404 detected, falling back to ETB data for classification');
            result = await getExtendedTrialBalanceWithMappings(engagementId, classification);
            console.log('ExcelViewer: ✅ ETB fallback data received:', {
              totalRows: result?.rows?.length || 0
            });
          } else {
            console.error('ExcelViewer: ❌ Non-404 error, re-throwing:', wpError);
            throw wpError;
          }
        }
      } else if (rowType === 'evidence') {
        // ✅ For Evidence without parent data, don't fetch ETB - show error
        console.log('ExcelViewer: Evidence mode without parent data - cannot fetch');
        setEtbError('Evidence data should be provided by parent component');
        setEtbLoading(false);
        return;
      } else {
        // For ETB/Lead Sheet: Fetch ONLY rows for this classification (same as table shows)
        console.log('ExcelViewer: Fetching ETB data for classification:', classification);
        // ✅ For mapping dialog, fetch all ETB rows (pass null/undefined for classification to get all rows)
        // If API doesn't support null, it will return all rows when classification filter fails
        result = await getExtendedTrialBalanceWithMappings(engagementId, undefined);
        console.log('ExcelViewer: ETB data received (all rows for mapping dialog):', {
          totalRows: result?.rows?.length || 0,
          firstThreeRows: result?.rows?.slice(0, 3)?.map(r => ({
            code: r.code,
            name: r.accountName,
            classification: r.classification
          })),
          uniqueClassifications: result?.rows ? Array.from(new Set(
            result.rows.map(row => row.classification).filter(Boolean)
          )) : []
        });
      }

      setEtbData(result as ETBData);
      console.log('ExcelViewer: ✅ Data set successfully, loading complete');
    } catch (err) {
      console.error(`ExcelViewer: ❌ ${dataType} API error:`, err);
      setEtbError(err instanceof Error ? err.message : `Failed to fetch ${dataType} data`);
    } finally {
      console.log('ExcelViewer: 🏁 Finally block - setting loading to false');
      setEtbLoading(false);
    }
  }, [
    props.engagementId, 
    props.classification, 
    props.rowType, 
    props.parentEtbData // Direct dependency on parentEtbData
  ]); // Depend on props to get fresh values

  // ✅ CRITICAL: Sync etbData immediately when parentEtbData changes
  useEffect(() => {
    const currentParentEtbData = (props as any).parentEtbData;
    console.log('ExcelViewer: 🔄 Sync useEffect triggered:', {
      hasParentData: !!currentParentEtbData,
      parentDataRows: currentParentEtbData?.rows?.length || 0,
      currentEtbDataRows: etbData?.rows?.length || 0,
      rowType: (props as any).rowType,
      classification: (props as any).classification
    });
    
    if (currentParentEtbData) {
      console.log('ExcelViewer: ✅ Syncing etbData from parentEtbData immediately:', {
        rowType: (props as any).rowType,
        classification: (props as any).classification,
        dataRows: currentParentEtbData.rows?.length || 0,
        firstThreeRows: currentParentEtbData.rows?.slice(0, 3)?.map(r => ({
          code: r.code,
          name: r.accountName
        }))
      });
      
      // ✅ ENHANCEMENT: Enhance mappings with workbook information
      const workbook = props.workbook;
      
      // ✅ CRITICAL: For mapping dialog, show ALL ETB rows from engagement (no classification filtering)
      // This allows users to see all account names from the engagement's ETB
      console.log('ExcelViewer: ✅ Using all ETB rows for mapping dialog in sync useEffect (no classification filter):', {
        totalRows: currentParentEtbData.rows?.length || 0,
        uniqueClassifications: currentParentEtbData.rows ? Array.from(new Set(
          currentParentEtbData.rows.map(row => row.classification).filter(Boolean)
        )) : []
      });
      
      const enhancedData = {
        ...currentParentEtbData,
        rows: (currentParentEtbData.rows || []).map(row => ({
          ...row,
          mappings: row.mappings?.map(mapping => ({
            ...mapping,
            workbookId: mapping.workbookId && typeof mapping.workbookId === 'string' 
              ? {
                  _id: mapping.workbookId,
                  name: workbook.name || 'Unknown Workbook'
                }
              : mapping.workbookId
          })) || []
        }))
      };
      
      setEtbData(enhancedData);
      setEtbLoading(false);
      setEtbError(null);
    } else {
      console.log('ExcelViewer: ⚠️ No parentEtbData provided:', {
        rowType: (props as any).rowType,
        classification: (props as any).classification,
        parentEtbData: currentParentEtbData,
        currentEtbData: etbData
      });
    }
  }, [(props as any).parentEtbData, props.workbook]);

  // Update the useEffect that calls fetchETBData
  useEffect(() => {
    fetchETBData();
  }, [fetchETBData, (props as any).parentEtbData]);

  const handleCreateETBMapping = async () => {
    const engagementId = (props as any).engagementId;
    const classification = (props as any).classification;
    const rowType = (props as any).rowType || 'etb';
    const workbook = props.workbook;
    const onRefreshETBData = (props as any).onRefreshETBData;
  
    if (!selectedETBRow || !engagementId) {
      toast({
        title: "Error",
        description: `Please select a ${rowType === 'working-paper' ? 'Working Paper' : 'ETB'} row`,
        variant: "destructive",
      });
      return;
    }
  
    const currentSelection = selections.length > 0 ? selections[selections.length - 1] : null;
    if (!currentSelection) {
      toast({
        title: "Error",
        description: "Please select a range in the sheet",
        variant: "destructive",
      });
      return;
    }
  
    setIsCreatingETBMapping(true);
  
    try {
      const rowIdentifier = resolveFullscreenRowIdentifier(selectedETBRow, selectedETBRow?.code);
      if (!rowIdentifier && rowType !== 'evidence') {
        throw new Error('Unable to determine row identifier for mapping.');
      }

      // Upload reference files if any were selected
      let referenceFiles: any[] = [];
      if (mappingFilesToUpload && mappingFilesToUpload.length > 0) {
        console.log('📤 Uploading mapping reference files:', mappingFilesToUpload.length);
        setIsUploadingMappingFiles(true);
        setUploadProgress({});
        
        try {
          // Get current user info - try to get from props or use default
          const userInfo = { name: 'Current User' }; // TODO: Get from auth context if available
          
          // Show initial toast
          toast({
            title: "Uploading Files",
            description: `Uploading ${mappingFilesToUpload.length} file(s)...`,
          });
          
          const uploadPromises = mappingFilesToUpload.map(async (file, index) => {
            try {
              setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
              
              const validation = validateFile(file);
              if (!validation.isValid) {
                throw new Error(validation.error || 'Invalid file');
              }
              
              setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));
              const uploadResult = await uploadFileToStorage(file);
              setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
              
              return {
                fileName: uploadResult.fileName || file.name,
                fileUrl: uploadResult.url,
                uploadedAt: new Date().toISOString(),
                uploadedBy: userInfo.name
              };
            } catch (error) {
              console.error(`Error uploading file ${file.name}:`, error);
              setUploadProgress(prev => ({ ...prev, [file.name]: -1 })); // -1 indicates error
              throw error;
            }
          });
          
          referenceFiles = await Promise.all(uploadPromises);
          console.log('✅ Mapping reference files uploaded:', referenceFiles.length);
          
          toast({
            title: "Upload Complete",
            description: `Successfully uploaded ${referenceFiles.length} file(s)`,
          });
        } catch (uploadError) {
          console.error('Error uploading mapping reference files:', uploadError);
          const successfulUploads = referenceFiles.length;
          const failedUploads = mappingFilesToUpload.length - successfulUploads;
          
          toast({
            variant: "destructive",
            title: "Upload Error",
            description: failedUploads > 0 
              ? `Failed to upload ${failedUploads} file(s). ${successfulUploads > 0 ? `${successfulUploads} file(s) uploaded successfully.` : ''} Mapping will be created with uploaded files only.`
              : "Failed to upload reference files. Mapping will be created without them.",
          });
          // Continue with mapping creation even if file upload fails
        } finally {
          setIsUploadingMappingFiles(false);
          setUploadProgress({});
        }
      }

      const mappingData: CreateMappingRequest = {
        workbookId: workbook.id,
        color: generateColor(),
        details: {
          sheet: currentSelection.sheet,
          start: {
            row: currentSelection.start.row,
            col: currentSelection.start.col,
          },
          end: {
            row: currentSelection.end.row,
            col: currentSelection.end.col,
          },
        },
        referenceFiles: referenceFiles.length > 0 ? referenceFiles : undefined,
      } as any; // Type assertion needed as CreateMappingRequest may not have referenceFiles yet
  
      console.log('ExcelViewer (main): Creating mapping:', {
        rowType,
        rowCode: selectedETBRow.code,
        rowName: selectedETBRow.accountName,
        mappingData,
        classification
      });
  
      // Call the appropriate API based on rowType
      if (rowType === 'working-paper') {
        if (!classification) {
          throw new Error('Classification is required for Working Paper mappings');
        }
        await addMappingToWPRow(engagementId, classification, rowIdentifier as string, mappingData);
        console.log('✅ Working Paper mapping created successfully');
        
        // Update linkedExcelFiles array
        const wpData = await getWorkingPaperWithLinkedFiles(engagementId, classification);
        const currentRow = wpData.rows.find((r: any) => r.code === selectedETBRow.code);
        const existingLinkedFileIds = currentRow?.linkedExcelFiles?.map((wb: any) => wb._id || wb) || [];
        
        if (!existingLinkedFileIds.includes(workbook.id)) {
          const updatedLinkedFiles = [...existingLinkedFileIds, workbook.id];
          await updateLinkedExcelFilesInWP(engagementId, classification, rowIdentifier as string, updatedLinkedFiles);
          console.log('✅ Working Paper linkedExcelFiles updated');
        }
        
        // Refresh ETB data immediately to update cell highlighting
        if (onRefreshETBData) {
          console.log('✅ Refreshing ETB data for Working Papers to update cell highlighting');
          onRefreshETBData();
        }
      } else if (rowType === 'evidence') {
        // For Evidence, selectedETBRow.code is the evidenceId
        const evidenceId = selectedETBRow.code;
        console.log('ExcelViewer: Creating Evidence mapping for evidenceId:', evidenceId);
        
        const evidenceMappingData: EvidenceCreateMappingRequest = {
          workbookId: workbook.id,
          color: mappingData.color,
          details: mappingData.details
        };
        
        await addMappingToEvidence(evidenceId, evidenceMappingData);
        console.log('✅ Evidence mapping created successfully');
        
        // Link workbook to Evidence
        const evidenceData = await getEvidenceWithMappings(evidenceId);
        const existingWorkbookIds = evidenceData.linkedWorkbooks?.map((wb: any) => wb._id || wb) || [];
        
        if (!existingWorkbookIds.includes(workbook.id)) {
          await linkWorkbookToEvidence(evidenceId, workbook.id);
          console.log('✅ Workbook linked to Evidence successfully');
        }
        
        // Refresh ETB data immediately to update cell highlighting
        if (onRefreshETBData) {
          console.log('✅ Refreshing ETB data for Evidence to update cell highlighting');
          onRefreshETBData();
        }
      } else {
        // ETB mapping
        await addMappingToRow(engagementId, rowIdentifier as string, mappingData);
        console.log('✅ ETB mapping created successfully');
        
        // Update linkedExcelFiles array
        const etbRowClassification = etbData?.rows.find(r => r.code === selectedETBRow.code)?.classification || classification;
        const etbLinkedData = await getExtendedTBWithLinkedFiles(engagementId, etbRowClassification);
        const etbCurrentRow = etbLinkedData.rows.find((r: any) => r.code === selectedETBRow.code);
        const etbExistingLinkedFileIds = etbCurrentRow?.linkedExcelFiles?.map((wb: any) => wb._id || wb) || [];
        
        if (!etbExistingLinkedFileIds.includes(workbook.id)) {
          const etbUpdatedLinkedFiles = [...etbExistingLinkedFileIds, workbook.id];
          await updateLinkedExcelFilesInExtendedTB(engagementId, etbRowClassification, rowIdentifier as string, etbUpdatedLinkedFiles);
          console.log('✅ ETB linkedExcelFiles updated');
        }
        
        // Refresh ETB data immediately to update cell highlighting
        if (onRefreshETBData) {
          console.log('✅ Refreshing ETB data to update cell highlighting');
          onRefreshETBData();
        }
      }
  
      // CRITICAL FIX: Create a new mapping object with the same structure as existing mappings
      const newMapping = {
        _id: `temp-${Date.now()}`, // Temporary ID until refresh
        workbookId: {
          _id: workbook.id,
          name: workbook.name || 'Unknown Workbook'
        },
        color: mappingData.color,
        details: mappingData.details,
        isActive: true
      };

      // CRITICAL FIX: Update etbData state immediately to trigger re-render
      setEtbData(prev => {
        if (!prev) return prev;
        
        const updatedRows = prev.rows.map(row => {
          if (row.code === selectedETBRow.code) {
            return {
              ...row,
              mappings: [...(row.mappings || []), newMapping]
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

      // CRITICAL FIX: Force a re-render of the ExcelViewer by updating a timestamp
      (workbook as any)._mappingsUpdateTimestamp = Date.now();
      
      // CRITICAL FIX: Force a re-render by updating a key prop
      // This ensures the component detects the change
      const onRefreshMappings = (props as any).onRefreshMappings;
      if (onRefreshMappings) {
        console.log('ExcelViewer (Wrapper): Refreshing mappings after creation');
        await onRefreshMappings(props.workbook.id);
        
        // Force dialog to re-render with updated mappings
        setMappingsDialogRefreshKey(prev => prev + 1);
      }
  
      // Reset form
      setSelectedETBRow(null);
      setMappingFilesToUpload([]); // Clear uploaded files
      setIsCreateETBMappingOpen(false);
  
      const successMessage = rowType === 'working-paper' ? 'Working Paper mapping created successfully' 
        : rowType === 'evidence' ? 'Evidence mapping created successfully'
        : 'ETB mapping created successfully';
      
      toast({
        title: "Success",
        description: successMessage,
      });
    } catch (error) {
      const errorMessage = rowType === 'working-paper' ? 'Working Paper'
        : rowType === 'evidence' ? 'Evidence'
        : 'ETB';
      console.error(`Error creating ${errorMessage} mapping:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to create ${errorMessage} mapping`,
        variant: "destructive",
      });
    } finally {
      setIsCreatingETBMapping(false);
    }
  };

  const handleCreateWorkbookMapping = async () => {
    const currentSelection = selections.length > 0 ? selections[selections.length - 1] : null;
    if (!currentSelection) {
      toast({
        title: "Error",
        description: "Please select a range in the sheet",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingWorkbookMapping(true);

    try {
      // Fix: Access props correctly
      props.onCreateMapping(props.workbook.id, {
        sheet: currentSelection.sheet,
        start: {
          row: currentSelection.start.row,
          col: currentSelection.start.col,
        },
        end: {
          row: currentSelection.end.row,
          col: currentSelection.end.col,
        },
        color: generateColor(),
      });

      // Reset form
      setIsCreateWorkbookMappingOpen(false);

      toast({
        title: "Success",
        description: "Workbook mapping created successfully",
      });
    } catch (error) {
      console.error('Error creating workbook mapping:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create workbook mapping",
        variant: "destructive",
      });
    } finally {
      setIsCreatingWorkbookMapping(false);
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(true);
  };

  // Handle ESC key to close fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  return (
    <>
      {/* Only render normal ExcelViewer when NOT in fullscreen mode to prevent duplicate dialogs */}
      {!isFullscreen && (
        <ExcelViewer
          key={`${props.workbook.id}-${(props.workbook as any)._mappingsUpdateTimestamp || 0}-${(props.workbook as any)?._referenceFilesUpdateTimestamp || 0}-${(props.workbook as any)?.referenceFiles?.length || 0}-${mappingsDialogRefreshKey}-${props.mappingsRefreshKey || 0}`}
          {...props}
          setSelectedWorkbook={props.setSelectedWorkbook}
          onToggleFullscreen={handleToggleFullscreen}
          // Pass all state props
          selectedSheet={selectedSheet}
          setSelectedSheet={handleSheetChangeWrapper}
          onSheetChange={props.onSheetChange}
          selections={selections}
          setSelections={setSelections}
          isSelecting={isSelecting}
          setIsSelecting={setIsSelecting}
          anchorSelectionStart={anchorSelectionStart}
          isSaveDialogOpen={isSaveDialogOpen}
          setIsSaveDialogOpen={setIsSaveDialogOpen}
          saveType={saveType}
          setSaveType={setSaveType}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
          isNamedRangesDialogOpen={isNamedRangesDialogOpen}
          setIsNamedRangesDialogOpen={setIsNamedRangesDialogOpen}
          isCreateNamedRangeOpen={isCreateNamedRangeOpen}
          setIsCreateNamedRangeOpen={setIsCreateNamedRangeOpen}
          isEditNamedRangeOpen={isEditNamedRangeOpen}
          setIsEditNamedRangeOpen={setIsEditNamedRangeOpen}
          editingNamedRange={editingNamedRange}
          setEditingNamedRange={setEditingNamedRange}
          newNamedRangeName={newNamedRangeName}
          setNewNamedRangeName={setNewNamedRangeName}
          newNamedRangeRange={newNamedRangeRange}
          setNewNamedRangeRange={setNewNamedRangeRange}
          isETBMappingsDialogOpen={isETBMappingsDialogOpen}
          setIsETBMappingsDialogOpen={setIsETBMappingsDialogOpen}
          isCreateETBMappingOpen={isCreateETBMappingOpen}
          setIsCreateETBMappingOpen={setIsCreateETBMappingOpen}
          isEditETBMappingOpen={isEditETBMappingOpen}
          setIsEditETBMappingOpen={setIsEditETBMappingOpen}
          editingETBMapping={editingETBMapping}
          setEditingETBMapping={setEditingETBMapping}
          selectedETBRow={selectedETBRow}
          setSelectedETBRow={setSelectedETBRow}
          isCreatingETBMapping={isCreatingETBMapping}
          setIsCreatingETBMapping={setIsCreatingETBMapping}

          // Workbook Mappings states
          isWorkbookMappingsDialogOpen={isWorkbookMappingsDialogOpen}
          setIsWorkbookMappingsDialogOpen={setIsWorkbookMappingsDialogOpen}
          isCreateWorkbookMappingOpen={isCreateWorkbookMappingOpen}
          setIsCreateWorkbookMappingOpen={setIsCreateWorkbookMappingOpen}
          isEditWorkbookMappingOpen={isEditWorkbookMappingOpen}
          setIsEditWorkbookMappingOpen={setIsEditWorkbookMappingOpen}
          editingWorkbookMapping={editingWorkbookMapping}
          setEditingWorkbookMapping={setEditingWorkbookMapping}
          isCreatingWorkbookMapping={isCreatingWorkbookMapping}
          setIsCreatingWorkbookMapping={setIsCreatingWorkbookMapping}

          // ETB props
          etbData={etbData}
          setEtbData={setEtbData}
          etbLoading={etbLoading}
          etbError={etbError}
          onRefreshETBData={parentOnRefreshETBData || fetchETBData} // ✅ Use parent's refresh if provided
          sheetDataCache={sheetDataCache}
          loadingSheets={loadingSheets}
          onEvidenceMappingUpdated={props.onEvidenceMappingUpdated}

          // Reference files states
          isDualOptionsDialogOpen={isDualOptionsDialogOpen}
          setIsDualOptionsDialogOpen={setIsDualOptionsDialogOpen}
          isReferenceFilesDialogOpen={isReferenceFilesDialogOpen}
          setIsReferenceFilesDialogOpen={setIsReferenceFilesDialogOpen}
          isUploadReferenceFilesDialogOpen={isUploadReferenceFilesDialogOpen}
          setIsUploadReferenceFilesDialogOpen={setIsUploadReferenceFilesDialogOpen}
          cellRangeEvidenceFiles={cellRangeEvidenceFiles}
          setCellRangeEvidenceFiles={setCellRangeEvidenceFiles}
          loadingEvidenceFiles={loadingEvidenceFiles}
          setLoadingEvidenceFiles={setLoadingEvidenceFiles}
          cellsWithEvidence={cellsWithEvidence}
          setCellsWithEvidence={setCellsWithEvidence}
          uploadingFiles={uploadingFiles}
          setUploadingFiles={setUploadingFiles}

          // Reference files functions
          fetchEvidenceFilesForRange={fetchEvidenceFilesForRange}
          cellHasEvidence={cellHasEvidence}
          handleOpenReferenceFilesDialog={handleOpenReferenceFilesDialog}
          handleOpenFileInNewTab={handleOpenFileInNewTab}
          handleReferenceFileUpload={handleReferenceFileUpload}

          // File preview states
          filePreviewOpen={filePreviewOpen}
          setFilePreviewOpen={setFilePreviewOpen}
          selectedPreviewFile={selectedPreviewFile}
          setSelectedPreviewFile={setSelectedPreviewFile}

          // Auto-scrolling props
          spreadsheetContainerRef={spreadsheetContainerRef}
          autoScrollInterval={autoScrollInterval}
          setAutoScrollInterval={setAutoScrollInterval}
          mousePosition={mousePosition}
          setMousePosition={setMousePosition}
          currentMousePositionRef={currentMousePositionRef}
        />
      )}
      {/* Fullscreen view using normal div instead of Dialog to avoid z-index issues */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[90] w-screen h-screen bg-background flex flex-col"
          style={{ zIndex: 90 }}
        >
          <div className="flex-1 overflow-auto">
            {/* Render ExcelViewer inside the fullscreen div, passing the same state */}
            <ExcelViewer
              {...props}
              key={`${props.workbook.id}-${(props.workbook as any)._mappingsUpdateTimestamp || 0}-${(props.workbook as any)?._referenceFilesUpdateTimestamp || 0}-${(props.workbook as any)?.referenceFiles?.length || 0}-${mappingsDialogRefreshKey}-${props.mappingsRefreshKey || 0}-fullscreen`}
              setSelectedWorkbook={props.setSelectedWorkbook}
              isFullscreenMode={true}
              onToggleFullscreen={() => setIsFullscreen(false)}
              // Pass the same state props
              selectedSheet={selectedSheet}
              setSelectedSheet={handleSheetChangeWrapper}
              onSheetChange={props.onSheetChange}
              selections={selections}
              setSelections={setSelections}
              isSelecting={isSelecting}
              setIsSelecting={setIsSelecting}
              anchorSelectionStart={anchorSelectionStart}
              isSaveDialogOpen={isSaveDialogOpen}
              setIsSaveDialogOpen={setIsSaveDialogOpen}
              saveType={saveType}
              setSaveType={setSaveType}
              isSaving={isSaving}
              setIsSaving={setIsSaving}
              isNamedRangesDialogOpen={isNamedRangesDialogOpen}
              setIsNamedRangesDialogOpen={setIsNamedRangesDialogOpen}
              isCreateNamedRangeOpen={isCreateNamedRangeOpen}
              setIsCreateNamedRangeOpen={setIsCreateNamedRangeOpen}
              isEditNamedRangeOpen={isEditNamedRangeOpen}
              setIsEditNamedRangeOpen={setIsEditNamedRangeOpen}
              editingNamedRange={editingNamedRange}
              setEditingNamedRange={setEditingNamedRange}
              newNamedRangeName={newNamedRangeName}
              setNewNamedRangeName={setNewNamedRangeName}
              newNamedRangeRange={newNamedRangeRange}
              setNewNamedRangeRange={setNewNamedRangeRange}
              isETBMappingsDialogOpen={isETBMappingsDialogOpen}
              setIsETBMappingsDialogOpen={setIsETBMappingsDialogOpen}
              isCreateETBMappingOpen={isCreateETBMappingOpen}
              setIsCreateETBMappingOpen={setIsCreateETBMappingOpen}
              isEditETBMappingOpen={isEditETBMappingOpen}
              setIsEditETBMappingOpen={setIsEditETBMappingOpen}
              editingETBMapping={editingETBMapping}
              setEditingETBMapping={setEditingETBMapping}
              selectedETBRow={selectedETBRow}
              setSelectedETBRow={setSelectedETBRow}
              isCreatingETBMapping={isCreatingETBMapping}
              setIsCreatingETBMapping={setIsCreatingETBMapping}

              // Workbook Mappings states
              isWorkbookMappingsDialogOpen={isWorkbookMappingsDialogOpen}
              setIsWorkbookMappingsDialogOpen={setIsWorkbookMappingsDialogOpen}
              isCreateWorkbookMappingOpen={isCreateWorkbookMappingOpen}
              setIsCreateWorkbookMappingOpen={setIsCreateWorkbookMappingOpen}
              isEditWorkbookMappingOpen={isEditWorkbookMappingOpen}
              setIsEditWorkbookMappingOpen={setIsEditWorkbookMappingOpen}
              editingWorkbookMapping={editingWorkbookMapping}
              setEditingWorkbookMapping={setEditingWorkbookMapping}
              isCreatingWorkbookMapping={isCreatingWorkbookMapping}
              setIsCreatingWorkbookMapping={setIsCreatingWorkbookMapping}
              
              // Dialog refresh control
              mappingsDialogRefreshKey={mappingsDialogRefreshKey}
              setMappingsDialogRefreshKey={setMappingsDialogRefreshKey}
              
              // ETB props
              etbData={etbData}
              setEtbData={setEtbData}
              etbLoading={etbLoading}
              etbError={etbError}
              onRefreshETBData={parentOnRefreshETBData || fetchETBData} // ✅ Use parent's refresh if provided
              sheetDataCache={sheetDataCache}
              loadingSheets={loadingSheets}

              // Reference files states
              isDualOptionsDialogOpen={isDualOptionsDialogOpen}
              setIsDualOptionsDialogOpen={setIsDualOptionsDialogOpen}
              isReferenceFilesDialogOpen={isReferenceFilesDialogOpen}
              setIsReferenceFilesDialogOpen={setIsReferenceFilesDialogOpen}
              isUploadReferenceFilesDialogOpen={isUploadReferenceFilesDialogOpen}
              setIsUploadReferenceFilesDialogOpen={setIsUploadReferenceFilesDialogOpen}
              cellRangeEvidenceFiles={cellRangeEvidenceFiles}
              setCellRangeEvidenceFiles={setCellRangeEvidenceFiles}
              loadingEvidenceFiles={loadingEvidenceFiles}
              setLoadingEvidenceFiles={setLoadingEvidenceFiles}
              cellsWithEvidence={cellsWithEvidence}
              setCellsWithEvidence={setCellsWithEvidence}
              uploadingFiles={uploadingFiles}
              setUploadingFiles={setUploadingFiles}

              // Reference files functions
              fetchEvidenceFilesForRange={fetchEvidenceFilesForRange}
              cellHasEvidence={cellHasEvidence}
              handleOpenReferenceFilesDialog={handleOpenReferenceFilesDialog}
              handleOpenFileInNewTab={handleOpenFileInNewTab}
              handleReferenceFileUpload={handleReferenceFileUpload}

              // File preview states
              filePreviewOpen={filePreviewOpen}
              setFilePreviewOpen={setFilePreviewOpen}
              selectedPreviewFile={selectedPreviewFile}
              setSelectedPreviewFile={setSelectedPreviewFile}

              // Auto-scrolling props
              spreadsheetContainerRef={spreadsheetContainerRef}
              autoScrollInterval={autoScrollInterval}
              setAutoScrollInterval={setAutoScrollInterval}
              mousePosition={mousePosition}
              setMousePosition={setMousePosition}
              currentMousePositionRef={currentMousePositionRef}
            />
          </div>
          <div className="absolute top-4 right-4 z-50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(false)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * WorkbookViewerFullscreen - A wrapper component that renders ExcelViewerWithFullscreen
 * in fullscreen mode with all features enabled. This component is designed to be used
 * in pages like WorkbookViewerPage where the workbook should open directly in fullscreen.
 * 
 * This component ensures all features from ExcelViewerWithFullscreen are available,
 * including sheet selection, mappings, named ranges, reference files, etc.
 */
export interface WorkbookViewerFullscreenProps {
  workbook: any;
  setSelectedWorkbook?: (workbook: any) => void;
  mappings: Mapping[];
  namedRanges: NamedRange[];
  engagementId?: string;
  classification?: string;
  rowType?: 'etb' | 'working-paper' | 'evidence';
  parentEtbData?: ETBData | null;
  onRefreshETBData?: () => void;
  onRefreshMappings?: (workbookId: string) => Promise<void>;
  onSheetChange?: (workbookId: string, sheetName: string) => void;
  initialSheet?: string;
  mappingsRefreshKey?: number;
  onCreateMapping?: (
    workbookId: string,
    mappingDetails: {
      sheet: string;
      start: { row: number; col: number };
      end: { row: number; col: number };
      destinationField?: string;
      transform?: string;
      color: string;
      referenceFiles?: any[];
    }
  ) => void;
  onUpdateMapping?: (
    workbookId: string,
    mappingId: string,
    updatedMappingDetails: {
      color?: string;
      sheet?: string;
      start?: { row: number; col: number };
      end?: { row: number; col: number };
    }
  ) => void;
  onDeleteMapping?: (workbookId: string, mappingId: string) => void;
  onCreateNamedRange?: (workbookId: string, namedRange: any) => void;
  onUpdateNamedRange?: (
    workbookId: string,
    namedRangeId: string,
    updatedNamedRangeDetails: any
  ) => void;
  onDeleteNamedRange?: (workbookId: string, namedRangeId: string) => void;
  onBack?: () => void;
  onLinkField?: (selection: any) => void;
  onLinkSheet?: () => void;
  onLinkWorkbook?: () => void;
  onReupload?: () => void;
  onViewAuditLog?: () => void;
  onEvidenceMappingUpdated?: (evidence: any) => void;
}

export const WorkbookViewerFullscreen: React.FC<WorkbookViewerFullscreenProps> = ({
  workbook,
  setSelectedWorkbook,
  mappings,
  namedRanges,
  engagementId,
  classification,
  rowType = 'etb',
  parentEtbData,
  onRefreshETBData,
  onRefreshMappings,
  onSheetChange,
  initialSheet,
  mappingsRefreshKey = 0,
  onCreateMapping,
  onUpdateMapping,
  onDeleteMapping,
  onCreateNamedRange,
  onUpdateNamedRange,
  onDeleteNamedRange,
  onBack = () => window.close(),
  onLinkField = () => {},
  onLinkSheet = () => {},
  onLinkWorkbook = () => {},
  onReupload = () => {},
  onViewAuditLog = () => {},
  onEvidenceMappingUpdated,
}) => {
  return (
    <div className="w-full h-screen overflow-hidden">
      <ExcelViewerWithFullscreen
        key={`${workbook.id}-${(workbook as any)._mappingsUpdateTimestamp || 0}-${(workbook as any)?._referenceFilesUpdateTimestamp || 0}-${(workbook as any)?.referenceFiles?.length || 0}-${mappingsRefreshKey}`}
        workbook={workbook}
        mappingsRefreshKey={mappingsRefreshKey}
        setSelectedWorkbook={setSelectedWorkbook}
        mappings={mappings}
        namedRanges={namedRanges}
        onBack={onBack}
        onLinkField={onLinkField}
        onLinkSheet={onLinkSheet}
        onLinkWorkbook={onLinkWorkbook}
        onReupload={onReupload}
        onViewAuditLog={onViewAuditLog}
        onCreateMapping={onCreateMapping || (() => {})}
        onUpdateMapping={onUpdateMapping || (() => {})}
        onDeleteMapping={onDeleteMapping || (() => {})}
        onCreateNamedRange={onCreateNamedRange || (() => {})}
        onUpdateNamedRange={onUpdateNamedRange || (() => {})}
        onDeleteNamedRange={onDeleteNamedRange || (() => {})}
        isLoadingWorkbookData={false}
        workingPaperCloudInfo={null}
        updateSheetsInWorkbook={undefined}
        engagementId={engagementId}
        classification={classification}
        rowType={rowType}
        parentEtbData={parentEtbData}
        onRefreshETBData={onRefreshETBData}
        onRefreshMappings={onRefreshMappings}
        onEvidenceMappingUpdated={onEvidenceMappingUpdated}
        onSheetChange={onSheetChange}
        initialSheet={initialSheet}
        autoFullscreen={true}
      />
    </div>
  );
};

