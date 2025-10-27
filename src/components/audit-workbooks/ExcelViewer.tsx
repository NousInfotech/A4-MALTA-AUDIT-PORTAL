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
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  type ETBData,
  type ETBRow,
  type CreateMappingRequest,
  type UpdateMappingRequest,
} from "@/lib/api/extendedTrialBalanceApi";
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
  etbLoading: boolean;
  etbError: string | null;
  onRefreshETBData?: () => void;
  
  // Sheet data cache (for lazy loading)
  sheetDataCache?: Map<string, any[][]>;
  
  // Loading state for sheets
  loadingSheets?: Set<string>;
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({
  workbook,
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
  etbLoading,
  etbError,
  onRefreshETBData,
  
  // Sheet data cache
  sheetDataCache = new Map(),
  
  // Loading state
  loadingSheets = new Set(),
}) => {
  const { toast } = useToast();
  
  // Use workbook.fileData as fallback, but will be populated with cache
  const sheetData: SheetData = workbook?.fileData || {};
  const sheetNames = Object.keys(sheetData);
  
  // Get cached sheet data from parent (ExcelViewerWithFullscreen will pass this)
  const sheetDataCacheProp = sheetDataCache;

  // Combine workbook mappings with ETB mappings for display
  const allMappings = React.useMemo(() => {
    const workbookMappings = mappings || [];
    const etbMappings = etbData?.rows?.flatMap(row => 
      row.mappings?.map(mapping => ({
        ...mapping,
        // Ensure the mapping has the correct structure for display
        details: mapping.details,
        color: mapping.color,
        isActive: mapping.isActive !== false
      })) || []
    ) || [];
    
    return [...workbookMappings, ...etbMappings];
  }, [mappings, etbData]);

  useEffect(() => {
  }, [namedRanges, workbook]);

  useEffect(() => {
    if (!selectedSheet || !sheetNames.includes(selectedSheet)) {
      if (sheetNames.length > 0) {
        setSelectedSheet(sheetNames[0]);
      } else {
        setSelectedSheet("Sheet1");
      }
    }
  }, [workbook.id, sheetNames, selectedSheet, setSelectedSheet]);

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
      // Check if we have a valid selection and trigger mapping creation
      const lastSelection = selections[selections.length - 1];
      if (lastSelection && lastSelection.sheet === selectedSheet) {
        // Open ETB mapping creation dialog
        setIsCreateETBMappingOpen(true);
      }
    }
    setIsSelecting(false);
  }, [isSelecting, selections, selectedSheet, setIsCreateETBMappingOpen, setIsSelecting]);

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

  const getCellClassName = useCallback(
    (excelGridRowIndex: number, excelGridColIndex: number) => {
      let className =
        "min-w-[100px] cursor-pointer select-none relative border border-gray-200 "; // Added default border

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
      return className;
    },
    [selections, selectedSheet, allMappings]
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
      setSelectedSheet(sheetName);

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

  const handleDeleteETBMapping = async (mappingId: string, rowCode: string) => {
    if (!engagementId) {
      toast({
        title: "Error",
        description: "Engagement ID is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await removeMappingFromRow(engagementId, rowCode, mappingId);
      
      // Refresh ETB data if callback is provided
      if (onRefreshETBData) {
        onRefreshETBData();
      }

      toast({
        title: "Success",
        description: "ETB mapping deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting ETB mapping:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete ETB mapping",
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

    try {
      // If the row changed, we need to first delete from old row and then add to new row
      if (newRowCode !== currentRowCode) {
        // First, delete from old row
        await removeMappingFromRow(engagementId, currentRowCode, mappingId);
        
        // Get the mapping details
        const mapping = editingETBMapping;
        if (mapping && updateData.details) {
          // Create a new mapping with updated details in the new row
          const mappingData: CreateMappingRequest = {
            workbookId: typeof mapping.workbookId === 'object' ? mapping.workbookId._id : mapping.workbookId,
            color: mapping.color,
            details: updateData.details
          };
          await addMappingToRow(engagementId, newRowCode, mappingData);
        }
      } else {
        // Just update the existing mapping
        await updateMapping(engagementId, currentRowCode, mappingId, updateData);
      }
      
      // Refresh ETB data if callback is provided
      if (onRefreshETBData) {
        onRefreshETBData();
      }

      // Reset editing state
      setEditingETBMapping(null);
      setIsEditETBMappingOpen(false);

      toast({
        title: "Success",
        description: "ETB mapping updated successfully",
      });
    } catch (error) {
      console.error('Error updating ETB mapping:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update ETB mapping",
        variant: "destructive",
      });
    }
  };

  const handleCreateETBMapping = async () => {
    if (!selectedETBRow || !engagementId) {
      toast({
        title: "Error",
        description: "Please select an ETB row",
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
      const mappingData: CreateMappingRequest = {
        workbookId: workbook.id, // Fix: Use workbook directly instead of props.workbook
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
      };
  
      // Use the _id if available, otherwise use the code as a fallback
      const rowId = selectedETBRow._id || selectedETBRow.code;
      await addMappingToRow(engagementId, rowId, mappingData);
  
      // Fix: Use onRefreshETBData instead of setEtbData
      if (onRefreshETBData) {
        onRefreshETBData();
      }
  
      // Reset form
      setSelectedETBRow(null);
      setIsCreateETBMappingOpen(false);
  
      toast({
        title: "Success",
        description: "ETB mapping created successfully",
      });
    } catch (error) {
      console.error('Error creating ETB mapping:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ETB mapping",
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
      onCreateMapping(workbook.id, {
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
            <Select value={selectedSheet} onValueChange={setSelectedSheet}>
              <SelectTrigger
                id="sheet-selector"
                className="w-[120px] h-7 text-xs font-semibold px-2 py-0" // Adjusted width, height, text size, and padding
              >
                <SelectValue placeholder="Select Sheet" className="text-xs" />{" "}
                {/* Ensured SelectValue text is small */}
              </SelectTrigger>
              <SelectContent>
                {sheetNames.map((sheet) => (
                  <SelectItem
                    key={sheet}
                    value={sheet}
                    className="text-xs py-1"
                  >
                    {" "}
                    {/* Adjusted item text size and padding */}
                    {sheet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Code className="h-4 w-4 mr-2" /> Actions{" "}
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Data Actions</DropdownMenuLabel>
              <DropdownMenuLabel className="text-gray-500 text-xs mt-1 mb-2">
                Select a range in the sheet to link to a field.
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  const lastSelection =
                    selections.length > 0
                      ? selections[selections.length - 1]
                      : null;
                  if (lastSelection) onLinkField(lastSelection);
                }}
                disabled={selections.length === 0}
              >
                <Link className="h-4 w-4 mr-2" /> Link to Field
              </DropdownMenuItem>

              {/* make it hidden for temprorary */}

              {/* <DropdownMenuItem onClick={onLinkSheet}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Link Sheet as
                Dataset
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onLinkWorkbook}>
                <Code className="h-4 w-4 mr-2" /> Link Workbook via Rules
              </DropdownMenuItem> */}

              {/* end make it hidden for temprorary */}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Named Ranges Dialog Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNamedRangesDialogOpen(true)}
          >
            <List className="h-4 w-4 mr-2" /> Named Ranges
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

        {/* Right-aligned utility buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-5 justify-end mt-2 md:mt-0 md:ml-auto">
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
          {/* Save Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => openSaveDialog("sheet")}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            <Database className="h-4 w-4 mr-2" />
            Save Sheet
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openSaveDialog("workbook")}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            <Database className="h-4 w-4 mr-2" />
            Save Workbook
          </Button>

          {onToggleFullscreen && (
            <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onViewAuditLog}>
            <History className="h-4 w-4 mr-2" />
            Audit Log
          </Button>
          {/* <Button variant="outline" size="sm" onClick={onReupload}>
            <Upload className="h-4 w-4 mr-2" />
            Re-upload
          </Button> */}
          <Button variant="outline" size="sm" onClick={() => updateSheetsInWorkbook(workbook.cloudFileId, workbook.id)}>
            <Upload className="h-4 w-4 mr-2" />
            Re&nbsp;load
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );

  // Named Ranges Dialog Content
  const renderNamedRangesDialog = () => (
    <Dialog
      open={isNamedRangesDialogOpen}
      onOpenChange={setIsNamedRangesDialogOpen}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Named Ranges</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              setIsCreateNamedRangeOpen(true);
              setIsNamedRangesDialogOpen(false); // Close parent dialog to show child
            }}
            disabled={selections.length === 0} // Disable if no selection
          >
            <Plus className="h-4 w-4 mr-2" /> Create New Named Range (Current
            Selection)
          </Button>
          {selections.length === 0 && (
            <p className="text-sm text-gray-500 text-center">
              Select a range in the sheet to create a new named range.
            </p>
          )}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {namedRanges.length === 0 ? (
              <p className="text-gray-500 text-sm text-center">
                No named ranges defined.
              </p>
            ) : (
              namedRanges.map((nr, index) => (
                <div
                  key={index}
                  className="p-2 text-xs bg-gray-100 rounded flex justify-between items-start hover:bg-gray-200 group"
                >
                  <div
                    className="cursor-pointer flex-grow"
                    onClick={() => handleNamedRangeClick(nr)}
                  >
                    <span className="font-medium">{nr.name}</span>
                    <Badge
                      variant="outline"
                      className="text-xs whitespace-nowrap ml-2"
                    >
                      {nr.range}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditNamedRange(nr);
                        setIsNamedRangesDialogOpen(false); // Close parent dialog
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
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsNamedRangesDialogOpen(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Old mappings dialog removed - now using separate ETB and Workbook dialogs

  // ETB Mappings Dialog Content
  const renderETBMappingsDialog = () => (
    <Dialog open={isETBMappingsDialogOpen} onOpenChange={setIsETBMappingsDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>ETB Mappings</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          {etbLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-sm text-gray-500">Loading ETB mappings...</div>
            </div>
          ) : etbError ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-sm text-red-500">Error: {etbError}</div>
            </div>
          ) : !etbData || etbData.rows.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-sm text-gray-500">No ETB data available</div>
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
                            </div>
                            <div className="flex gap-1 ml-2">
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
                                  // TODO: Implement delete ETB mapping
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

  // Workbook Mappings Dialog Content
  const renderWorkbookMappingsDialog = () => (
    <Dialog open={isWorkbookMappingsDialogOpen} onOpenChange={setIsWorkbookMappingsDialogOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Workbook Mappings</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
            {mappings.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-sm text-gray-500">No workbook mappings available</div>
            </div>
          ) : (
            <div className="space-y-4">
              {mappings.map((mapping) => (
                <div
                  key={mapping._id}
                  className={`p-3 rounded border-l-4 ${mapping.color || 'bg-gray-200'} bg-gray-50`}
                    >
                      <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsWorkbookMappingsDialogOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

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

      <div className="w-full bg-white rounded-lg shadow overflow-x-auto mb-1">
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
                        onMouseEnter={() =>
                          handleMouseEnter(excelGridRowIndex, excelGridColIndex)
                        }
                      >
                        <span className="whitespace-nowrap">{cell}</span>

                        {/* invisible but occupying the enough space for the title */}
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

                        {/* end invisible but occupying the enough space for the title */}
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
            Create Mapping
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (lastSelection) onLinkField(lastSelection);
            }}
          >
            Link to Field
          </Button>
        </div>
      </div>
    );
  };

  const renderETBTable = () => {
    if (!engagementId || !classification) {
  return (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Extended Trial Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                Missing engagementId or classification. engagementId: {engagementId || 'undefined'}, classification: {classification || 'undefined'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    if (etbLoading) {
      return (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Extended Trial Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (etbError) {
      return (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Extended Trial Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{etbError}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    if (!etbData || etbData.rows.length === 0) {
      return (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Extended Trial Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                No Extended Trial Balance data found for this classification.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(value);
    };

    return (
      <Card className="mb-4">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Lead Sheet
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsETBMappingsDialogOpen(true)}>
              Lead Sheet Mappings
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsCreateETBMappingOpen(true)}>
              Map to Lead Sheet
            </Button>
            {/* <Button variant="outline" size="sm" onClick={() => setIsWorkbookMappingsDialogOpen(true)}>
              Workbook Mappings
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsCreateWorkbookMappingOpen(true)}>
              Map to Workbook
            </Button> */}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <div className="min-w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap min-w-[80px]">Code</TableHead>
                    <TableHead className="whitespace-nowrap min-w-[200px]">Account Name</TableHead>
                    <TableHead className="text-right whitespace-nowrap min-w-[120px]">Current Year</TableHead>
                    <TableHead className="text-right whitespace-nowrap min-w-[120px]">Prior Year</TableHead>
                    <TableHead className="text-right whitespace-nowrap min-w-[120px]">Adjustments</TableHead>
                    <TableHead className="text-right whitespace-nowrap min-w-[120px]">Final Balance</TableHead>
                    <TableHead className="w-[120px] whitespace-nowrap min-w-[120px]">Mappings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {etbData.rows.map((row) => (
                    <TableRow key={row._id || row.code}>
                      <TableCell className="font-medium whitespace-nowrap">{row.code}</TableCell>
                      <TableCell className="whitespace-nowrap">{row.accountName}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(row.currentYear)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(row.priorYear)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {formatCurrency(row.adjustments)}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatCurrency(row.finalBalance)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline">
                          {row.mappings?.length || 0} mapping{(row.mappings?.length || 0) !== 1 ? 's' : ''}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2} className="whitespace-nowrap">TOTALS</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(etbData.rows.reduce((sum, row) => sum + row.currentYear, 0))}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(etbData.rows.reduce((sum, row) => sum + row.priorYear, 0))}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(etbData.rows.reduce((sum, row) => sum + row.adjustments, 0))}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(etbData.rows.reduce((sum, row) => sum + row.finalBalance, 0))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap"></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-auto">
      <Button variant="default" size="sm" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 py-5 px-2" />
        Back To Workbooks
      </Button>
      {/* ETB Table at the top */}
      {renderETBTable()}

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
                    onClick={() => setSelectedSheet(sheet)}
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {sheet}
                  </Button>
                ))}
              </div>
            </div>

            {/* Actions Section for Mobile */}
            {/* <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">
                Actions
              </h3>
              <div className="space-y-2">
                <Button
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    const lastSelection =
                      selections.length > 0
                        ? selections[selections.length - 1]
                        : null;
                    if (lastSelection) onLinkField(lastSelection);
                  }}
                  disabled={selections.length === 0}
                >
                  <Link className="h-4 w-4 mr-2" /> Link to Field
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={onLinkSheet}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Link Sheet as
                  Dataset
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={onLinkWorkbook}
                >
                  <Code className="h-4 w-4 mr-2" /> Link Workbook via Rules
                </Button>
              </div>
            </div> */}

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
      {renderNamedRangesDialog()} {/* Render the Named Ranges Dialog */}
      {/* Old mappings dialog removed - now using separate ETB and Workbook dialogs */}
      {renderETBMappingsDialog()} {/* Render the ETB Mappings Dialog */}
      {renderWorkbookMappingsDialog()} {/* Render the Workbook Mappings Dialog */}
      {/* Create Named Range Dialog */}
      <Dialog
        open={isCreateNamedRangeOpen}
        onOpenChange={setIsCreateNamedRangeOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Named Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newNamedRangeName}
                onChange={(e) => setNewNamedRangeName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="range">Range</Label>
              <Input
                id="range"
                value={newNamedRangeRange}
                onChange={(e) => setNewNamedRangeRange(e.target.value)}
                placeholder="e.g. Sheet1!A1:B5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateNamedRangeOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateNamedRange}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Named Range Dialog */}
      <Dialog
        open={isEditNamedRangeOpen}
        onOpenChange={setIsEditNamedRangeOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Named Range</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={newNamedRangeName}
                onChange={(e) => setNewNamedRangeName(e.target.value)}
                placeholder="Enter name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-range">Range</Label>
              <Input
                id="edit-range"
                value={newNamedRangeRange}
                onChange={(e) => setNewNamedRangeRange(e.target.value)}
                placeholder="e.g. Sheet1!A1:B5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditNamedRangeOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateNamedRange}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Old create mapping dialog removed - now using separate ETB and Workbook dialogs */}
      {/* Create ETB Mapping Dialog */}
      <Dialog open={isCreateETBMappingOpen} onOpenChange={setIsCreateETBMappingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create ETB Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="etbRow">ETB Row</Label>
              {!etbData ? (
                <div className="p-2 text-sm text-gray-500 bg-gray-100 rounded">
                  Loading ETB data...
            </div>
              ) : !etbData.rows || etbData.rows.length === 0 ? (
                <div className="p-2 text-sm text-gray-500 bg-gray-100 rounded">
                  No ETB rows available.
                </div>
              ) : (
                <>
                  <Select
                    value={selectedETBRow?._id || selectedETBRow?.code || ""}
                    onValueChange={(value) => {
                      const row = etbData?.rows.find(r =>
                        (r._id && r._id === value) || r.code === value
                      );
                      setSelectedETBRow(row || null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select ETB row" />
                    </SelectTrigger>
                    <SelectContent>
                      {etbData.rows.map((row) => (
                        <SelectItem
                          key={row._id || row.code}
                          value={row._id || row.code}
                        >
                          {row.code} - {row.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateETBMappingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateETBMapping}
              disabled={!selectedETBRow || isCreatingETBMapping}
            >
              {isCreatingETBMapping ? "Creating..." : "Create"}
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
  'etbData' | 'etbLoading' | 'etbError' | 'onRefreshETBData'
>> = (props) => {
  const { toast } = useToast();
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sheet selection state
  const [selectedSheet, setSelectedSheet] = useState<string>("");

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

  // Workbook Mappings states
  const [isWorkbookMappingsDialogOpen, setIsWorkbookMappingsDialogOpen] = useState(false);
  const [isCreateWorkbookMappingOpen, setIsCreateWorkbookMappingOpen] = useState(false);
  const [isEditWorkbookMappingOpen, setIsEditWorkbookMappingOpen] = useState(false);
  const [editingWorkbookMapping, setEditingWorkbookMapping] = useState<Mapping | null>(null);
  const [isCreatingWorkbookMapping, setIsCreatingWorkbookMapping] = useState(false);

  // ETB states
  const [etbData, setEtbData] = useState<ETBData | null>(null);
  const [etbLoading, setEtbLoading] = useState(false);
  const [etbError, setEtbError] = useState<string | null>(null);

  // Add sheet data loading states
  const [sheetDataCache, setSheetDataCache] = useState<Map<string, any[][]>>(new Map());
  const [loadingSheets, setLoadingSheets] = useState<Set<string>>(new Set());

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
    
    // Reset Workbook mapping states
    setIsWorkbookMappingsDialogOpen(false);
    setIsCreateWorkbookMappingOpen(false);
    setIsEditWorkbookMappingOpen(false);
    setEditingWorkbookMapping(null);
  }, [props.workbook.id]);

  // Get engagementId and classification from props if needed
  const engagementId = (props as any).engagementId;
  const classification = (props as any).classification;
  
  // Fetch ETB data when engagementId or classification changes
  const fetchETBData = async () => {
    if (!engagementId || !classification) {
      setEtbData(null);
      return;
    }

    try {
      setEtbLoading(true);
      setEtbError(null);
      const result = await getExtendedTrialBalanceWithMappings(engagementId, classification);
      setEtbData(result);
    } catch (err) {
      console.error('ETB API error:', err);
      setEtbError(err instanceof Error ? err.message : 'Failed to fetch ETB data');
    } finally {
      setEtbLoading(false);
    }
  };

  useEffect(() => {
    fetchETBData();
  }, [engagementId, classification]);

  const handleCreateETBMapping = async () => {
    if (!selectedETBRow || !engagementId) {
      toast({
        title: "Error",
        description: "Please select an ETB row",
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
      const mappingData: CreateMappingRequest = {
        workbookId: props.workbook.id, // Fix: Use props.workbook instead of workbook
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
      };
  
      // Use the _id if available, otherwise use the code as a fallback
      const rowId = selectedETBRow._id || selectedETBRow.code;
      await addMappingToRow(engagementId, rowId, mappingData);
  
      // Refresh ETB data
      const result = await getExtendedTrialBalanceWithMappings(engagementId, classification);
      setEtbData(result);
  
      // Reset form
      setSelectedETBRow(null);
      setIsCreateETBMappingOpen(false);
  
      toast({
        title: "Success",
        description: "ETB mapping created successfully",
      });
    } catch (error) {
      console.error('Error creating ETB mapping:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ETB mapping",
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

  return (
    <>
      <ExcelViewer
        {...props}
        onToggleFullscreen={handleToggleFullscreen}
        // Pass all state props
        selectedSheet={selectedSheet}
        setSelectedSheet={setSelectedSheet}
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
        // ETB Mappings states
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
        etbLoading={etbLoading}
        etbError={etbError}
        onRefreshETBData={fetchETBData}
        sheetDataCache={sheetDataCache}
        loadingSheets={loadingSheets}
      />
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full p-0 flex flex-col">
          <div className="flex-1 overflow-auto">
            {/* Render ExcelViewer inside the fullscreen dialog, passing the same state */}
          <ExcelViewer
            {...props}
            isFullscreenMode={true}
            onToggleFullscreen={() => setIsFullscreen(false)}
              // Pass the same state props
              selectedSheet={selectedSheet}
              setSelectedSheet={setSelectedSheet}
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
              // ETB Mappings states
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
              etbLoading={etbLoading}
              etbError={etbError}
              onRefreshETBData={fetchETBData}
              sheetDataCache={sheetDataCache}
              loadingSheets={loadingSheets}
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
        </DialogContent>
      </Dialog>
    </>
  );
};



