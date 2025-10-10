import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Settings,
  Link,
  FileSpreadsheet,
  Upload,
  List,
  History,
} from "lucide-react";
import {
  Workbook,
  SheetData,
  Selection,
  Mapping,
  NamedRange,
} from "../../types/audit-workbooks/types";

// Mock named ranges, as these would be parsed from the workbook file in a real app
const mockNamedRanges: NamedRange[] = [
  { name: "ppe_values", range: "Balance Sheet!B2:C3" },
  { name: "total_assets", range: "Balance Sheet!B2" },
  { name: "revenue_data", range: "Income Statement!B1:C3" },
];

// Helper to generate a random color for new mappings
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

interface ExcelViewerProps {
  workbook: Workbook;
  mappings: Mapping[];
  onBack: () => void;
  onLinkField: (selection: Selection) => void;
  onLinkSheet: () => void;
  onLinkWorkbook: () => void;
  onReupload: () => void;
  onViewAuditLog: () => void;
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({
  workbook,
  mappings,
  onBack,
  onLinkField,
  onLinkSheet,
  onLinkWorkbook,
  onReupload,
  onViewAuditLog,
}) => {
  // Get sheet data from the workbook prop, not from internal mock data
  const sheetData: SheetData = workbook?.fileData || {};
  const sheetNames = Object.keys(sheetData);

  // Initialize the selected sheet to the first available sheet in the workbook
  const [selectedSheet, setSelectedSheet] = useState<string>(
    sheetNames[0] || ""
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Get the data for the currently selected sheet
  const currentSheetData = sheetData[selectedSheet] || [];

  const handleMouseDown = (rowIndex: number, colIndex: number) => {
    setIsSelecting(true);
    const newSelection = {
      sheet: selectedSheet,
      start: { row: rowIndex, col: colIndex },
      end: { row: rowIndex, col: colIndex },
    };
    setSelection(newSelection);
  };

  const handleMouseEnter = (rowIndex: number, colIndex: number) => {
    if (isSelecting && selection) {
      setSelection({ ...selection, end: { row: rowIndex, col: colIndex } });
    }
  };

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseUp]);

  const getCellClassName = useCallback(
    (rowIndex: number, colIndex: number) => {
      let className = "min-w-[100px] cursor-pointer select-none relative ";

      // Apply style for the active selection
      if (selection && selection.sheet === selectedSheet) {
        const { start, end } = selection;
        const minRow = Math.min(start.row, end.row);
        const maxRow = Math.max(start.row, end.row);
        const minCol = Math.min(start.col, end.col);
        const maxCol = Math.max(start.col, end.col);

        if (
          rowIndex >= minRow &&
          rowIndex <= maxRow &&
          colIndex >= minCol &&
          colIndex <= maxCol
        ) {
          className += "ring-2 ring-blue-500 ";
        }
      }

      // Apply style for existing mappings
      const mapping = mappings.find(
        (m) =>
          m.sheet === selectedSheet &&
          rowIndex >= m.start.row &&
          rowIndex <= m.end.row &&
          colIndex >= m.start.col &&
          colIndex <= m.end.col
      );
      if (mapping) {
        className += `${mapping.color} `;
      }

      return className;
    },
    [selection, selectedSheet, mappings]
  );

  const getSelectionText = () => {
    if (!selection || !currentSheetData) return "";
    const { start, end } = selection;
    const startCell = currentSheetData[start.row]?.[start.col];
    const endCell = currentSheetData[end.row]?.[end.col];
    return `${selection.sheet}!${startCell}:${endCell}`;
  };

  const handleNamedRangeClick = (namedRange: NamedRange) => {
    const [sheetName, range] = namedRange.range.split("!");
    if (sheetName && range) {
      setSelectedSheet(sheetName);
      // In a real app, you would parse the range string (e.g., "A1:B10") to set the selection
      // For now, we'll just switch to the sheet.
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{workbook.name}</h1>
            <p className="text-xs text-gray-500">
              Version {workbook.version} • Last modified{" "}
              {workbook.lastModified || workbook.uploadedDate}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onViewAuditLog}>
            <History className="h-4 w-4 mr-2" />
            Audit Log
          </Button>
          <Button variant="outline" size="sm" onClick={onReupload}>
            <Upload className="h-4 w-4 mr-2" />
            Re-upload
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:block w-80 bg-white border-r p-4 space-y-4 overflow-y-auto">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Sheets</h3>
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

          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Actions
            </h3>
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full justify-start"
                onClick={() => selection && onLinkField(selection)}
                disabled={!selection}
              >
                <Link className="h-4 w-4 mr-2" />
                Link to Field
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={onLinkSheet}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Link Sheet as Dataset
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={onLinkWorkbook}
              >
                <List className="h-4 w-4 mr-2" />
                Link Workbook via Rules
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Named Ranges
            </h3>
            <div className="space-y-1">
              {mockNamedRanges.map((nr) => (
                <div
                  key={nr.name}
                  className="p-2 text-xs bg-gray-100 rounded flex justify-between items-center cursor-pointer hover:bg-gray-200"
                  onClick={() => handleNamedRangeClick(nr)}
                >
                  <span className="font-medium">{nr.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {nr.range}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
              <List className="h-4 w-4" />
              Active Mappings
            </h3>
            <div className="space-y-2">
              {mappings
                .filter((m) => m.sheet === selectedSheet)
                .map((map) => (
                  <div
                    key={map.id}
                    className={`p-2 text-xs rounded border-l-4 ${map.color}`}
                  >
                    <p className="font-medium">{map.destinationField}</p>
                    <p className="text-gray-600">{`${map.sheet}!${
                      currentSheetData[map.start.row]?.[map.start.col]
                    }:${currentSheetData[map.end.row]?.[map.end.col]}`}</p>
                    {map.transform && (
                      <p className="text-gray-500">
                        Transform: {map.transform}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </aside>

        {/* Mobile Sheet Sidebar */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="m-4 md:hidden">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Sheets & Actions
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <div className="mt-6 space-y-4">
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
              {/* You can copy other sidebar sections here for mobile view */}
            </div>
          </SheetContent>
        </Sheet>

        {/* Spreadsheet Viewer */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-gray-50">
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <Table>
              <TableHeader>
                {currentSheetData.length > 0 && (
                  <TableRow>
                    {currentSheetData[0].map((header, index) => (
                      <TableHead
                        key={index}
                        className="min-w-[100px] font-semibold"
                      >
                        {header}
                      </TableHead>
                    ))}
                  </TableRow>
                )}
              </TableHeader>
              <TableBody>
                {currentSheetData.slice(1).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <TableCell
                        key={cellIndex}
                        className={getCellClassName(rowIndex + 1, cellIndex)}
                        onMouseDown={() =>
                          handleMouseDown(rowIndex + 1, cellIndex)
                        }
                        onMouseEnter={() =>
                          handleMouseEnter(rowIndex + 1, cellIndex)
                        }
                      >
                        {cell}
                        {/* Show mapping indicator */}
                        {mappings.find(
                          (m) =>
                            m.sheet === selectedSheet &&
                            rowIndex + 1 === m.start.row &&
                            cellIndex === m.start.col
                        ) && (
                          <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {selection && (
            <div className="mt-4 p-2 bg-blue-100 text-blue-800 rounded text-sm flex justify-between items-center">
              <span>
                Selection:{" "}
                <Badge variant="secondary">{getSelectionText()}</Badge>
              </span>
              <Button size="sm" onClick={() => onLinkField(selection)}>
                Link to Field
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
