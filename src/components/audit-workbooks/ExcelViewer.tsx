// import React, { useState, useCallback, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import {
//   ArrowLeft,
//   Settings,
//   Link,
//   FileSpreadsheet,
//   Upload,
//   List,
//   Code,
//   History,
// } from "lucide-react";
// import {
//   Workbook,
//   SheetData,
//   Selection,
//   Mapping,
//   NamedRange,
// } from "../../types/audit-workbooks/types";

// // Mock named ranges, as these would be parsed from the workbook file in a real app
// const mockNamedRanges: NamedRange[] = [
//   { name: "ppe_values", range: "Balance Sheet!B2:C3" },
//   { name: "total_assets", range: "Balance Sheet!B2" },
//   { name: "revenue_data", range: "Income Statement!B1:C3" },
// ];

// const generateColor = () => {
//   const colors = [
//     "bg-blue-200",
//     "bg-green-200",
//     "bg-yellow-200",
//     "bg-purple-200",
//     "bg-pink-200",
//   ];
//   return colors[Math.floor(Math.random() * colors.length)];
// };

// interface ExcelViewerProps {
//   workbook: Workbook;
//   mappings: Mapping[];
//   onBack: () => void;
//   onLinkField: (selection: Selection) => void;
//   onLinkSheet: () => void;
//   onLinkWorkbook: () => void;
//   onReupload: () => void;
//   onViewAuditLog: () => void;
// }

// export const ExcelViewer: React.FC<ExcelViewerProps> = ({
//   workbook,
//   mappings,
//   onBack,
//   onLinkField,
//   onLinkSheet,
//   onLinkWorkbook,
//   onReupload,
//   onViewAuditLog,
// }) => {
//   // --- KEY CHANGE: Get sheet data from the workbook prop ---
//   const sheetData: SheetData = workbook?.fileData || {};
//   const sheetNames = Object.keys(sheetData);

//   // Initialize the selected sheet to the first available one, or a default
//   const [selectedSheet, setSelectedSheet] = useState<string>(sheetNames[0] || 'Balance_Sheet');
//   const [selection, setSelection] = useState<Selection | null>(null);
//   const [isSelecting, setIsSelecting] = useState(false);

//   // --- KEY CHANGE: Use the dynamic data for the current sheet ---
//   const currentSheetData = sheetData[selectedSheet] || [];

//   const handleMouseDown = (rowIndex: number, colIndex: number) => {
//     setIsSelecting(true);
//     const newSelection = {
//       sheet: selectedSheet,
//       start: { row: rowIndex, col: colIndex },
//       end: { row: rowIndex, col: colIndex },
//     };
//     setSelection(newSelection);
//   };

//   const handleMouseEnter = (rowIndex: number, colIndex: number) => {
//     if (isSelecting && selection) {
//       setSelection({ ...selection, end: { row: rowIndex, col: colIndex } });
//     }
//   };

//   const handleMouseUp = useCallback(() => {
//     setIsSelecting(false);
//   }, []);

//   useEffect(() => {
//     window.addEventListener("mouseup", handleMouseUp);
//     return () => {
//       window.removeEventListener("mouseup", handleMouseUp);
//     };
//   }, [handleMouseUp]);

//   const getCellClassName = useCallback(
//     (rowIndex: number, colIndex: number) => {
//       let className = "min-w-[100px] cursor-pointer select-none relative ";

//       // Check for active selection
//       if (selection && selection.sheet === selectedSheet) {
//         const { start, end } = selection;
//         const minRow = Math.min(start.row, end.row);
//         const maxRow = Math.max(start.row, end.row);
//         const minCol = Math.min(start.col, end.col);
//         const maxCol = Math.max(start.col, end.col);

//         if (
//           rowIndex >= minRow &&
//           rowIndex <= maxRow &&
//           colIndex >= minCol &&
//           colIndex <= maxCol
//         ) {
//           className += "ring-2 ring-blue-500 bg-blue-50 ";
//         }
//       }

//       // Check for existing mappings
//       const mapping = mappings.find(
//         (m) =>
//           m.sheet === selectedSheet &&
//           rowIndex >= m.start.row &&
//           rowIndex <= m.end.row &&
//           colIndex >= m.start.col &&
//           colIndex <= m.end.col
//       );
//       if (mapping) {
//         className += `${mapping.color} `;
//       }

//       return className;
//     },
//     [selection, selectedSheet, mappings]
//   );

//   const getSelectionText = () => {
//     if (!selection || !currentSheetData) return "";
//     const { start, end } = selection;
//     const startCell = currentSheetData[start.row]?.[start.col];
//     const endCell = currentSheetData[end.row]?.[end.col];
//     return `${selection.sheet}!${startCell}:${endCell}`;
//   };

//   // This function is restored from your original code
//   const handleNamedRangeClick = (namedRange: NamedRange) => {
//     const [sheetName, range] = namedRange.range.split("!");
//     const [startCell, endCell] = range.split(":");

//     if (sheetName && startCell) {
//       setSelectedSheet(sheetName);

//       const startCol = startCell.charCodeAt(0) - "A".charCodeAt(0);
//       const startRow = parseInt(startCell.substring(1)) - 1;

//       let endCol = startCol;
//       let endRow = startRow;

//       if (endCell) {
//         endCol = endCell.charCodeAt(0) - "A".charCodeAt(0);
//         endRow = parseInt(endCell.substring(1)) - 1;
//       }

//       const newSelection = {
//         sheet: sheetName,
//         start: { row: startRow, col: startCol },
//         end: { row: endRow, col: endCol },
//       };

//       setSelection(newSelection);
//     }
//   };

//   return (
//     <div className="flex flex-col h-screen">
//       {/* Header */}
//       <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
//         <div className="flex items-center space-x-4">
//           <Button variant="ghost" size="sm" onClick={onBack}>
//             <ArrowLeft className="h-4 w-4" />
//           </Button>
//           <div>
//             <h1 className="text-lg font-semibold">{workbook.name}</h1>
//             <p className="text-xs text-gray-500">
//               Version {workbook.version} • Last modified{" "}
//               {workbook.lastModified || workbook.uploadedDate}
//             </p>
//           </div>
//         </div>
//         <div className="flex items-center space-x-2">
//           <Button variant="outline" size="sm" onClick={onViewAuditLog}>
//             <History className="h-4 w-4 mr-2" />
//             Audit Log
//           </Button>
//           <Button variant="outline" size="sm" onClick={onReupload}>
//             <Upload className="h-4 w-4 mr-2" />
//             Re-upload
//           </Button>
//           <Button variant="outline" size="sm">
//             <Settings className="h-4 w-4" />
//           </Button>
//         </div>
//       </header>

//       <div className="flex flex-1 overflow-hidden">
//         {/* Sidebar for Desktop */}
//         <aside className="hidden md:block w-80 bg-white border-r p-4 space-y-4 overflow-y-auto">
//           <div>
//             <h3 className="text-sm font-semibold text-gray-600 mb-2">Sheets</h3>
//             <div className="space-y-1">
//               {/* --- KEY CHANGE: Map over dynamic sheetNames --- */}
//               {sheetNames.map((sheet) => (
//                 <Button
//                   key={sheet}
//                   variant={selectedSheet === sheet ? "default" : "ghost"}
//                   className="w-full justify-start"
//                   onClick={() => setSelectedSheet(sheet)}
//                 >
//                   <FileSpreadsheet className="h-4 w-4 mr-2" />
//                   {sheet}
//                 </Button>
//               ))}
//             </div>
//           </div>

//           <div className="pt-4 border-t">
//             <h3 className="text-sm font-semibold text-gray-600 mb-2">
//               Actions
//             </h3>
//             <div className="space-y-2">
//               <Button
//                 size="sm"
//                 className="w-full justify-start"
//                 onClick={() => selection && onLinkField(selection)}
//                 disabled={!selection}
//               >
//                 <Link className="h-4 w-4 mr-2" />
//                 Link to Field
//               </Button>
//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="w-full justify-start"
//                 onClick={onLinkSheet}
//               >
//                 <FileSpreadsheet className="h-4 w-4 mr-2" />
//                 Link Sheet as Dataset
//               </Button>
//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="w-full justify-start"
//                 onClick={onLinkWorkbook}
//               >
//                 <Code className="h-4 w-4 mr-2" />
//                 Link Workbook via Rules
//               </Button>
//             </div>
//           </div>

//           <div className="pt-4 border-t">
//             <h3 className="text-sm font-semibold text-gray-600 mb-2">
//               Named Ranges
//             </h3>
//             <div className="space-y-1">
//               {mockNamedRanges.map((nr) => (
//                 <div
//                   key={nr.name}
//                   className="p-2 text-xs bg-gray-100 rounded flex justify-between items-center cursor-pointer hover:bg-gray-200"
//                   onClick={() => handleNamedRangeClick(nr)}
//                 >
//                   <span className="font-medium">{nr.name}</span>
//                   <Badge variant="outline" className="text-xs whitespace-nowrap">
//                     {nr.range}
//                   </Badge>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="pt-4 border-t">
//             <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
//               <List className="h-4 w-4" />
//               Active Mappings
//             </h3>
//             <div className="space-y-2">
//               {mappings
//                 .filter((m) => m.sheet === selectedSheet)
//                 .map((map) => (
//                   <div
//                     key={map.id}
//                     className={`p-2 text-xs rounded border-l-4 ${map.color}`}
//                   >
//                     <p className="font-medium">{map.destinationField}</p>
//                     <p className="text-gray-600">{`${map.sheet}!${
//                       currentSheetData[map.start.row]?.[map.start.col]
//                     }:${currentSheetData[map.end.row]?.[map.end.col]}`}</p>
//                     {map.transform && (
//                       <p className="text-gray-500">
//                         Transform: {map.transform}
//                       </p>
//                     )}
//                   </div>
//                 ))}
//             </div>
//           </div>
//         </aside>

//         {/* Mobile Sheet Sidebar - Restored to full functionality */}
//         <Sheet>
//           <SheetTrigger asChild>
//             <Button variant="outline" size="sm" className="m-4 md:hidden">
//               <FileSpreadsheet className="h-4 w-4 mr-2" /> Sheets & Actions
//             </Button>
//           </SheetTrigger>
//           <SheetContent side="left" className="w-80">
//             <div className="mt-6 space-y-4">
//               <div>
//                 <h3 className="text-sm font-semibold text-gray-600 mb-2">
//                   Sheets
//                 </h3>
//                 <div className="space-y-1">
//                   {/* --- KEY CHANGE: Map over dynamic sheetNames --- */}
//                   {sheetNames.map((sheet) => (
//                     <Button
//                       key={sheet}
//                       variant={selectedSheet === sheet ? "default" : "ghost"}
//                       className="w-full justify-start"
//                       onClick={() => setSelectedSheet(sheet)}
//                     >
//                       <FileSpreadsheet className="h-4 w-4 mr-2" />
//                       {sheet}
//                     </Button>
//                   ))}
//                 </div>
//               </div>

//               <div className="pt-4 border-t">
//                 <h3 className="text-sm font-semibold text-gray-600 mb-2">
//                   Actions
//                 </h3>
//                 <div className="space-y-2">
//                   <Button
//                     size="sm"
//                     className="w-full justify-start"
//                     onClick={() => selection && onLinkField(selection)}
//                     disabled={!selection}
//                   >
//                     <Link className="h-4 w-4 mr-2" />
//                     Link to Field
//                   </Button>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     className="w-full justify-start"
//                     onClick={onLinkSheet}
//                   >
//                     <FileSpreadsheet className="h-4 w-4 mr-2" />
//                     Link Sheet as Dataset
//                   </Button>
//                   <Button
//                     size="sm"
//                     variant="outline"
//                     className="w-full justify-start"
//                     onClick={onLinkWorkbook}
//                   >
//                     <Code className="h-4 w-4 mr-2" />
//                     Link Workbook via Rules
//                   </Button>
//                 </div>
//               </div>

//               <div className="pt-4 border-t">
//                 <h3 className="text-sm font-semibold text-gray-600 mb-2">
//                   Named Ranges
//                 </h3>
//                 <div className="space-y-1">
//                   {mockNamedRanges.map((nr) => (
//                     <div
//                       key={nr.name}
//                       className="p-2 text-xs bg-gray-100 rounded flex justify-between items-center cursor-pointer hover:bg-gray-200"
//                       onClick={() => handleNamedRangeClick(nr)}
//                     >
//                       <span className="font-medium">{nr.name}</span>
//                       <Badge variant="outline" className="text-xs whitespace-nowrap">
//                         {nr.range}
//                       </Badge>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             </div>
//           </SheetContent>
//         </Sheet>

//         {/* Spreadsheet Viewer */}
//         <main className="flex-1 p-4 lg:p-8 overflow-y-auto bg-gray-50">
//           <div className="bg-white rounded-lg shadow overflow-x-auto">
//             <Table>
//               <TableHeader>
//                 {currentSheetData.length > 0 && (
//                   <TableRow>
//                     {currentSheetData[0].map((header, index) => (
//                       <TableHead
//                         key={index}
//                         className="min-w-[100px] font-semibold"
//                       >
//                         {header}
//                       </TableHead>
//                     ))}
//                   </TableRow>
//                 )}
//               </TableHeader>
//               <TableBody>
//                 {currentSheetData.slice(1).map((row, rowIndex) => (
//                   <TableRow key={rowIndex}>
//                     {row.map((cell, cellIndex) => (
//                       <TableCell
//                         key={cellIndex}
//                         className={getCellClassName(rowIndex + 1, cellIndex)}
//                         onMouseDown={() =>
//                           handleMouseDown(rowIndex + 1, cellIndex)
//                         }
//                         onMouseEnter={() =>
//                           handleMouseEnter(rowIndex + 1, cellIndex)
//                         }
//                       >
//                         {cell}
//                         {/* Show mapping indicator */}
//                         {mappings.find(
//                           (m) =>
//                             m.sheet === selectedSheet &&
//                             rowIndex + 1 === m.start.row &&
//                             cellIndex === m.start.col
//                         ) && (
//                           <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
//                         )}
//                       </TableCell>
//                     ))}
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>
//           </div>
//           {selection && (
//             <div className="mt-4 p-2 bg-blue-100 text-blue-800 rounded text-sm flex justify-between items-center">
//               <span>
//                 Selection:{" "}
//                 <Badge variant="secondary">{getSelectionText()}</Badge>
//               </span>
//               <Button size="sm" onClick={() => onLinkField(selection)}>
//                 Link to Field
//               </Button>
//             </div>
//           )}
//         </main>
//       </div>
//     </div>
//   );
// };








//##########################################################################################################





// import React, { useState, useCallback, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
// import { Dialog, DialogContent } from "@/components/ui/dialog";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { Badge } from "@/components/ui/badge";
// import {
//   ArrowLeft,
//   Settings,
//   Link,
//   FileSpreadsheet,
//   Upload,
//   List,
//   Code,
//   History,
//   Maximize2,
//   Minimize2,
// } from "lucide-react";
// import {
//   Workbook,
//   SheetData,
//   Selection,
//   Mapping,
//   NamedRange,
// } from "../../types/audit-workbooks/types";

// // Mock named ranges, as these would be parsed from the workbook file in a real app
// const mockNamedRanges: NamedRange[] = [
//   { name: "ppe_values", range: "Balance Sheet!B2:C3" },
//   { name: "total_assets", range: "Balance Sheet!B2" },
//   { name: "revenue_data", range: "Income Statement!B1:C3" },
// ];

// const generateColor = () => {
//   const colors = [
//     "bg-blue-200",
//     "bg-green-200",
//     "bg-yellow-200",
//     "bg-purple-200",
//     "bg-pink-200",
//   ];
//   return colors[Math.floor(Math.random() * colors.length)];
// };

// interface ExcelViewerProps {
//   workbook: Workbook;
//   mappings: Mapping[];
//   onBack: () => void;
//   onLinkField: (selection: Selection) => void;
//   onLinkSheet: () => void;
//   onLinkWorkbook: () => void;
//   onReupload: () => void;
//   onViewAuditLog: () => void;
//   isFullscreenMode?: boolean;
//   onToggleFullscreen?: () => void;
// }

// export const ExcelViewer: React.FC<ExcelViewerProps> = ({
//   workbook,
//   mappings,
//   onBack,
//   onLinkField,
//   onLinkSheet,
//   onLinkWorkbook,
//   onReupload,
//   onViewAuditLog,
//   isFullscreenMode = false,
//   onToggleFullscreen,
// }) => {
//   const sheetData: SheetData = workbook?.fileData || {};
//   const sheetNames = Object.keys(sheetData);

//   const [selectedSheet, setSelectedSheet] = useState<string>(
//     sheetNames[0] || "Balance_Sheet"
//   );
//   const [selection, setSelection] = useState<Selection | null>(null);
//   const [isSelecting, setIsSelecting] = useState(false);

//   const currentSheetData = sheetData[selectedSheet] || [];

//   const handleMouseDown = (rowIndex: number, colIndex: number) => {
//     setIsSelecting(true);
//     const newSelection = {
//       sheet: selectedSheet,
//       start: { row: rowIndex, col: colIndex },
//       end: { row: rowIndex, col: colIndex },
//     };
//     setSelection(newSelection);
//   };

//   const handleMouseEnter = (rowIndex: number, colIndex: number) => {
//     if (isSelecting && selection) {
//       setSelection({ ...selection, end: { row: rowIndex, col: colIndex } });
//     }
//   };

//   const handleMouseUp = useCallback(() => {
//     setIsSelecting(false);
//   }, []);
//   useEffect(() => {
//     window.addEventListener("mouseup", handleMouseUp);
//     return () => {
//       window.removeEventListener("mouseup", handleMouseUp);
//     };
//   }, [handleMouseUp]);

//   const getCellClassName = useCallback(
//     (rowIndex: number, colIndex: number) => {
//       let className = "min-w-[100px] cursor-pointer select-none relative ";
//       if (selection && selection.sheet === selectedSheet) {
//         const { start, end } = selection;
//         const minRow = Math.min(start.row, end.row);
//         const maxRow = Math.max(start.row, end.row);
//         const minCol = Math.min(start.col, end.col);
//         const maxCol = Math.max(start.col, end.col);
//         if (
//           rowIndex >= minRow &&
//           rowIndex <= maxRow &&
//           colIndex >= minCol &&
//           colIndex <= maxCol
//         ) {
//           className += "ring-2 ring-blue-500 bg-blue-50 ";
//         }
//       }
//       const mapping = mappings.find(
//         (m) =>
//           m.sheet === selectedSheet &&
//           rowIndex >= m.start.row &&
//           rowIndex <= m.end.row &&
//           colIndex >= m.start.col &&
//           colIndex <= m.end.col
//       );
//       if (mapping) {
//         className += `${mapping.color} `;
//       }
//       return className;
//     },
//     [selection, selectedSheet, mappings]
//   );

//   const getSelectionText = () => {
//     if (!selection || !currentSheetData) return "";
//     const { start, end } = selection;
//     const startCell = currentSheetData[start.row]?.[start.col];
//     const endCell = currentSheetData[end.row]?.[end.col];
//     return `${selection.sheet}!${startCell}:${endCell}`;
//   };

//   const handleNamedRangeClick = (namedRange: NamedRange) => {
//     const [sheetName, range] = namedRange.range.split("!");
//     const [startCell, endCell] = range.split(":");
//     if (sheetName && startCell) {
//       setSelectedSheet(sheetName);
//       const startCol = startCell.charCodeAt(0) - "A".charCodeAt(0);
//       const startRow = parseInt(startCell.substring(1)) - 1;
//       let endCol = startCol;
//       let endRow = startRow;
//       if (endCell) {
//         endCol = endCell.charCodeAt(0) - "A".charCodeAt(0);
//         endRow = parseInt(endCell.substring(1)) - 1;
//       }
//       const newSelection = {
//         sheet: sheetName,
//         start: { row: startRow, col: startCol },
//         end: { row: endRow, col: endCol },
//       };
//       setSelection(newSelection);
//     }
//   };

//   const renderSpreadsheet = () => (
//     <div className="w-full bg-white rounded-lg shadow overflow-x-auto mb-1">
//       <Table>
//         <TableHeader>
//           {currentSheetData.length > 0 && (
//             <TableRow>
//               {currentSheetData[0].map((header, index) => (
//                 <TableHead key={index} className="min-w-[100px] font-semibold">
//                   {header}
//                 </TableHead>
//               ))}
//             </TableRow>
//           )}
//         </TableHeader>
//         <TableBody>
//           {currentSheetData.slice(1).map((row, rowIndex) => (
//             <TableRow key={rowIndex}>
//               {row.map((cell, cellIndex) => (
//                 <TableCell
//                   key={cellIndex}
//                   className={getCellClassName(rowIndex + 1, cellIndex)}
//                   onMouseDown={() => handleMouseDown(rowIndex + 1, cellIndex)}
//                   onMouseEnter={() => handleMouseEnter(rowIndex + 1, cellIndex)}
//                 >
//                   {cell}
//                   {mappings.find(
//                     (m) =>
//                       m.sheet === selectedSheet &&
//                       rowIndex + 1 === m.start.row &&
//                       cellIndex === m.start.col
//                   ) && (
//                     <div className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full" />
//                   )}
//                 </TableCell>
//               ))}
//             </TableRow>
//           ))}
//         </TableBody>
//       </Table>
//     </div>
//   );

//   const renderSelectionFooter = () => {
//     if (!selection) return null;
//     return (
//       <div className="sticky bottom-0 left-0 right-0 mt-4 p-4 bg-blue-100 text-blue-800 rounded-t-lg flex justify-between items-center z-10 shadow-lg">
//         <span>
//           Selection: <Badge variant="secondary">{getSelectionText()}</Badge>
//         </span>
//         <Button size="sm" onClick={() => onLinkField(selection)}>
//           Link to Field
//         </Button>
//       </div>
//     );
//   };

//   if (isFullscreenMode) {
//     return (
//       <div className="h-full flex flex-col">
//         <main className="flex-1 relative p-4 lg:p-8 bg-gray-50 w-full overflow-hidden flex flex-col">
//           {renderSpreadsheet()}
//           {renderSelectionFooter()}
//         </main>
//       </div>
//     );
//   }

//   return (
//     <div className="flex flex-col h-screen">
//       {/* Header */}
//       <header className="bg-white shadow-sm border-b px-4 lg:px-8 py-4 flex items-center justify-between">
//         <div className="flex items-center space-x-4">
//           <Button variant="ghost" size="sm" onClick={onBack}>
//             <ArrowLeft className="h-4 w-4" />
//           </Button>
//           <div>
//             <h1 className="text-lg font-semibold">{workbook.name}</h1>
//             <p className="text-xs text-gray-500">
//               Version {workbook.version} • Last modified{" "}
//               {workbook.lastModified || workbook.uploadedDate}
//             </p>
//           </div>
//         </div>
//         <div className="flex items-center space-x-2">
//           {onToggleFullscreen && (
//             <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
//               <Maximize2 className="h-4 w-4" />
//             </Button>
//           )}
//           <Button variant="outline" size="sm" onClick={onViewAuditLog}>
//             <History className="h-4 w-4 mr-2" />
//             Audit Log
//           </Button>
//           <Button variant="outline" size="sm" onClick={onReupload}>
//             <Upload className="h-4 w-4 mr-2" />
//             Re-upload
//           </Button>
//           <Button variant="outline" size="sm">
//             <Settings className="h-4 w-4" />
//           </Button>
//         </div>
//       </header>

//       <div className="flex flex-1 overflow-hidden">
//         {/* Sidebar for Desktop */}
//         <aside className="hidden md:block w-80 bg-white border-r p-4 space-y-4 overflow-y-auto">
//           <div>
//             <h3 className="text-sm font-semibold text-gray-600 mb-2">Sheets</h3>
//             <div className="space-y-1">
//               {sheetNames.map((sheet) => (
//                 <Button
//                   key={sheet}
//                   variant={selectedSheet === sheet ? "default" : "ghost"}
//                   className="w-full justify-start"
//                   onClick={() => setSelectedSheet(sheet)}
//                 >
//                   <FileSpreadsheet className="h-4 w-4 mr-2" />
//                   {sheet}
//                 </Button>
//               ))}
//             </div>
//           </div>
//           <div className="pt-4 border-t">
//             <h3 className="text-sm font-semibold text-gray-600 mb-2">
//               Actions
//             </h3>
//             <div className="space-y-2">
//               <Button
//                 size="sm"
//                 className="w-full justify-start"
//                 onClick={() => selection && onLinkField(selection)}
//                 disabled={!selection}
//               >
//                 <Link className="h-4 w-4 mr-2" /> Link to Field
//               </Button>
//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="w-full justify-start"
//                 onClick={onLinkSheet}
//               >
//                 <FileSpreadsheet className="h-4 w-4 mr-2" /> Link Sheet as
//                 Dataset
//               </Button>
//               <Button
//                 size="sm"
//                 variant="outline"
//                 className="w-full justify-start"
//                 onClick={onLinkWorkbook}
//               >
//                 <Code className="h-4 w-4 mr-2" /> Link Workbook via Rules
//               </Button>
//             </div>
//           </div>
//           <div className="pt-4 border-t">
//             <h3 className="text-sm font-semibold text-gray-600 mb-2">
//               Named Ranges
//             </h3>
//             <div className="space-y-1">
//               {mockNamedRanges.map((nr) => (
//                 <div
//                   key={nr.name}
//                   className="p-2 text-xs bg-gray-100 rounded flex justify-between items-center cursor-pointer hover:bg-gray-200"
//                   onClick={() => handleNamedRangeClick(nr)}
//                 >
//                   <span className="font-medium">{nr.name}</span>
//                   <Badge
//                     variant="outline"
//                     className="text-xs whitespace-nowrap"
//                   >
//                     {nr.range}
//                   </Badge>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="pt-4 border-t">
//             <h3 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
//               <List className="h-4 w-4" /> Active Mappings
//             </h3>
//             <div className="space-y-2">
//               {mappings
//                 .filter((m) => m.sheet === selectedSheet)
//                 .map((map) => (
//                   <div
//                     key={map.id}
//                     className={`p-2 text-xs rounded border-l-4 ${map.color}`}
//                   >
//                     <p className="font-medium">{map.destinationField}</p>
//                     <p className="text-gray-600">{`${map.sheet}!${
//                       currentSheetData[map.start.row]?.[map.start.col]
//                     }:${currentSheetData[map.end.row]?.[map.end.col]}`}</p>
//                     {map.transform && (
//                       <p className="text-gray-500">
//                         Transform: {map.transform}
//                       </p>
//                     )}
//                   </div>
//                 ))}
//             </div>
//           </div>
//         </aside>

//         {/* Spreadsheet Viewer with Flex Layout */}
//         <main className="flex-1 p-4 lg:p-8 bg-gray-50 flex flex-col w-full overflow-hidden">
//           <div className="flex-grow overflow-auto">{renderSpreadsheet()}</div>
//           {renderSelectionFooter()}
//         </main>
//       </div>

//       {/* Mobile Sheet Sidebar */}
//       <Sheet>
//         <SheetTrigger asChild>
//           <Button variant="outline" size="sm" className="m-4 md:hidden">
//             <FileSpreadsheet className="h-4 w-4 mr-2" /> Sheets & Actions
//           </Button>
//         </SheetTrigger>
//         <SheetContent side="left" className="w-80">
//           <div className="mt-6 space-y-4">
//             <div>
//               <h3 className="text-sm font-semibold text-gray-600 mb-2">
//                 Sheets
//               </h3>
//               <div className="space-y-1">
//                 {sheetNames.map((sheet) => (
//                   <Button
//                     key={sheet}
//                     variant={selectedSheet === sheet ? "default" : "ghost"}
//                     className="w-full justify-start"
//                     onClick={() => setSelectedSheet(sheet)}
//                   >
//                     <FileSpreadsheet className="h-4 w-4 mr-2" />
//                     {sheet}
//                   </Button>
//                 ))}
//               </div>
//             </div>
//             <div className="pt-4 border-t">
//               <h3 className="text-sm font-semibold text-gray-600 mb-2">
//                 Actions
//               </h3>
//               <div className="space-y-2">
//                 <Button
//                   size="sm"
//                   className="w-full justify-start"
//                   onClick={() => selection && onLinkField(selection)}
//                   disabled={!selection}
//                 >
//                   <Link className="h-4 w-4 mr-2" /> Link to Field
//                 </Button>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="w-full justify-start"
//                   onClick={onLinkSheet}
//                 >
//                   <FileSpreadsheet className="h-4 w-4 mr-2" /> Link Sheet as
//                   Dataset
//                 </Button>
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   className="w-full justify-start"
//                   onClick={onLinkWorkbook}
//                 >
//                   <Code className="h-4 w-4 mr-2" /> Link Workbook via Rules
//                 </Button>
//               </div>
//             </div>
//           </div>
//         </SheetContent>
//       </Sheet>
//     </div>
//   );
// };

// export const ExcelViewerWithFullscreen: React.FC<ExcelViewerProps> = (
//   props
// ) => {
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const handleToggleFullscreen = () => {
//     setIsFullscreen(true);
//   };
//   return (
//     <>
//       <ExcelViewer {...props} onToggleFullscreen={handleToggleFullscreen} />
//       <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
//         <DialogContent className="w-screen h-screen max-w-full max-h-full p-0 flex flex-col">
//           <ExcelViewer {...props} isFullscreenMode={true} />
//           <div className="absolute top-4 right-4 z-10">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => setIsFullscreen(false)}
//             >
//               <Minimize2 className="h-4 w-4" />
//             </Button>
//           </div>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// };









// ############################################################################################################





import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Code,
  History,
  Maximize2,
  Minimize2,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
} from "lucide-react";
import {
  Workbook,
  SheetData,
  Selection,
  Mapping,
  NamedRange,
} from "../../types/audit-workbooks/types";

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
  namedRanges: NamedRange[];
  onBack: () => void;
  onLinkField: (selection: Selection) => void;
  onLinkSheet: () => void;
  onLinkWorkbook: () => void;
  onReupload: () => void;
  onViewAuditLog: () => void;
  onCreateMapping: (mapping: Mapping) => void;
  onUpdateMapping: (id: string, mapping: Partial<Mapping>) => void;
  onDeleteMapping: (id: string) => void;
  onCreateNamedRange: (namedRange: NamedRange) => void;
  onUpdateNamedRange: (id: string, namedRange: Partial<NamedRange>) => void;
  onDeleteNamedRange: (id: string) => void;
  isFullscreenMode?: boolean;
  onToggleFullscreen?: () => void;
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
}) => {
  const sheetData: SheetData = workbook?.fileData || {};
  const sheetNames = Object.keys(sheetData);

  const [selectedSheet, setSelectedSheet] = useState<string>(
    sheetNames[0] || "Balance_Sheet"
  );
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // State for managing named ranges
  const [isCreateNamedRangeOpen, setIsCreateNamedRangeOpen] = useState(false);
  const [isEditNamedRangeOpen, setIsEditNamedRangeOpen] = useState(false);
  const [editingNamedRange, setEditingNamedRange] = useState<NamedRange | null>(null);
  const [newNamedRangeName, setNewNamedRangeName] = useState("");
  const [newNamedRangeRange, setNewNamedRangeRange] = useState("");

  // State for managing mappings
  const [isCreateMappingOpen, setIsCreateMappingOpen] = useState(false);
  const [isEditMappingOpen, setIsEditMappingOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<Mapping | null>(null);
  const [newMappingDestinationField, setNewMappingDestinationField] = useState("");
  const [newMappingTransform, setNewMappingTransform] = useState("sum");

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
          className += "ring-2 ring-blue-500 bg-blue-50 ";
        }
      }
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
    const [startCell, endCell] = range.split(":");
    if (sheetName && startCell) {
      setSelectedSheet(sheetName);
      const startCol = startCell.charCodeAt(0) - "A".charCodeAt(0);
      const startRow = parseInt(startCell.substring(1)) - 1;
      let endCol = startCol;
      let endRow = startRow;
      if (endCell) {
        endCol = endCell.charCodeAt(0) - "A".charCodeAt(0);
        endRow = parseInt(endCell.substring(1)) - 1;
      }
      const newSelection = {
        sheet: sheetName,
        start: { row: startRow, col: startCol },
        end: { row: endRow, col: endCol },
      };
      setSelection(newSelection);
    }
  };

  const handleCreateNamedRange = () => {
    if (!newNamedRangeName || !newNamedRangeRange) return;
    
    const newNamedRange: NamedRange = {
      id: Date.now().toString(),
      name: newNamedRangeName,
      range: newNamedRangeRange,
    };
    
    onCreateNamedRange(newNamedRange);
    setNewNamedRangeName("");
    setNewNamedRangeRange("");
    setIsCreateNamedRangeOpen(false);
  };

  const handleEditNamedRange = (namedRange: NamedRange) => {
    setEditingNamedRange(namedRange);
    setNewNamedRangeName(namedRange.name);
    setNewNamedRangeRange(namedRange.range);
    setIsEditNamedRangeOpen(true);
  };

  const handleUpdateNamedRange = () => {
    if (!editingNamedRange || !newNamedRangeName || !newNamedRangeRange) return;
    
    onUpdateNamedRange(editingNamedRange.id, {
      name: newNamedRangeName,
      range: newNamedRangeRange,
    });
    
    setEditingNamedRange(null);
    setNewNamedRangeName("");
    setNewNamedRangeRange("");
    setIsEditNamedRangeOpen(false);
  };

  const handleDeleteNamedRange = (id: string) => {
    onDeleteNamedRange(id);
  };

  const handleCreateMapping = () => {
    if (!selection || !newMappingDestinationField) return;
    
    const newMapping: Mapping = {
      id: Date.now().toString(),
      sheet: selection.sheet,
      start: selection.start,
      end: selection.end,
      destinationField: newMappingDestinationField,
      transform: newMappingTransform,
      color: generateColor(),
    };
    
    onCreateMapping(newMapping);
    setNewMappingDestinationField("");
    setNewMappingTransform("sum");
    setIsCreateMappingOpen(false);
  };

  const handleEditMapping = (mapping: Mapping) => {
    setEditingMapping(mapping);
    setNewMappingDestinationField(mapping.destinationField);
    setNewMappingTransform(mapping.transform);
    setIsEditMappingOpen(true);
  };

  const handleUpdateMapping = () => {
    if (!editingMapping || !newMappingDestinationField) return;
    
    onUpdateMapping(editingMapping.id, {
      destinationField: newMappingDestinationField,
      transform: newMappingTransform,
    });
    
    setEditingMapping(null);
    setNewMappingDestinationField("");
    setNewMappingTransform("sum");
    setIsEditMappingOpen(false);
  };

  const handleDeleteMapping = (id: string) => {
    onDeleteMapping(id);
  };

  const renderSpreadsheet = () => (
    <div className="w-full bg-white rounded-lg shadow overflow-x-auto mb-1">
      <Table>
        <TableHeader>
          {currentSheetData.length > 0 && (
            <TableRow>
              {currentSheetData[0].map((header, index) => (
                <TableHead key={index} className="min-w-[100px] font-semibold">
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
                  onMouseDown={() => handleMouseDown(rowIndex + 1, cellIndex)}
                  onMouseEnter={() => handleMouseEnter(rowIndex + 1, cellIndex)}
                >
                  {cell}
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
  );

  const renderSelectionFooter = () => {
    if (!selection) return null;
    return (
      <div className="sticky bottom-0 left-0 right-0 mt-4 p-4 bg-blue-100 text-blue-800 rounded-t-lg flex justify-between items-center z-10 shadow-lg">
        <span>
          Selection: <Badge variant="secondary">{getSelectionText()}</Badge>
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsCreateMappingOpen(true)}>
            Create Mapping
          </Button>
          <Button size="sm" onClick={() => onLinkField(selection)}>
            Link to Field
          </Button>
        </div>
      </div>
    );
  };

  if (isFullscreenMode) {
    return (
      <div className="h-full flex flex-col">
        <main className="flex-1 relative p-4 lg:p-8 bg-gray-50 w-full overflow-hidden flex flex-col">
          {renderSpreadsheet()}
          {renderSelectionFooter()}
        </main>
      </div>
    );
  }

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
          {onToggleFullscreen && (
            <Button variant="outline" size="sm" onClick={onToggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
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
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-600">Sheets</h3>
            </div>
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
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-600">
                Named Ranges
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsCreateNamedRangeOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {namedRanges.map((nr) => (
                <div
                  key={nr.id}
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
                          handleDeleteNamedRange(nr.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                <List className="h-4 w-4" /> Active Mappings
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => selection && setIsCreateMappingOpen(true)}
                disabled={!selection}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {mappings
                .filter((m) => m.sheet === selectedSheet)
                .map((map) => (
                  <div
                    key={map.id}
                    className={`p-2 text-xs rounded border-l-4 ${map.color} group`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
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
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEditMapping(map)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleDeleteMapping(map.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </aside>

        {/* Spreadsheet Viewer with Flex Layout */}
        <main className="flex-1 p-4 lg:p-8 bg-gray-50 flex flex-col w-full overflow-hidden">
          <div className="flex-grow overflow-auto">{renderSpreadsheet()}</div>
          {renderSelectionFooter()}
        </main>
      </div>

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
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-600">
                  Sheets
                </h3>
              </div>
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
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-600">
                  Named Ranges
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsCreateNamedRangeOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {namedRanges.map((nr) => (
                  <div
                    key={nr.id}
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
                      <div className="group-hover:opacity-105 flex gap-1">
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
                            handleDeleteNamedRange(nr.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                  <List className="h-4 w-4" /> Active Mappings
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => selection && setIsCreateMappingOpen(true)}
                  disabled={!selection}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {mappings
                  .filter((m) => m.sheet === selectedSheet)
                  .map((map) => (
                    <div
                      key={map.id}
                      className={`p-2 text-xs rounded border-l-4 ${map.color} group`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
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
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleEditMapping(map)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteMapping(map.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Named Range Dialog */}
      <Dialog open={isCreateNamedRangeOpen} onOpenChange={setIsCreateNamedRangeOpen}>
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
            <Button variant="outline" onClick={() => setIsCreateNamedRangeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNamedRange}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Named Range Dialog */}
      <Dialog open={isEditNamedRangeOpen} onOpenChange={setIsEditNamedRangeOpen}>
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
            <Button variant="outline" onClick={() => setIsEditNamedRangeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateNamedRange}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Mapping Dialog */}
      <Dialog open={isCreateMappingOpen} onOpenChange={setIsCreateMappingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination Field</Label>
              <Input
                id="destination"
                value={newMappingDestinationField}
                onChange={(e) => setNewMappingDestinationField(e.target.value)}
                placeholder="Enter destination field name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transform">Transform</Label>
              <Select value={newMappingTransform} onValueChange={setNewMappingTransform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select transform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                  <SelectItem value="min">Min</SelectItem>
                  <SelectItem value="first">First</SelectItem>
                  <SelectItem value="last">Last</SelectItem>
                  <SelectItem value="concat">Concatenate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selection && (
              <div className="p-2 bg-gray-100 rounded">
                <p className="text-sm font-medium">Selected Range:</p>
                <p className="text-sm">{getSelectionText()}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateMappingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMapping}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Mapping Dialog */}
      <Dialog open={isEditMappingOpen} onOpenChange={setIsEditMappingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Mapping</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-destination">Destination Field</Label>
              <Input
                id="edit-destination"
                value={newMappingDestinationField}
                onChange={(e) => setNewMappingDestinationField(e.target.value)}
                placeholder="Enter destination field name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-transform">Transform</Label>
              <Select value={newMappingTransform} onValueChange={setNewMappingTransform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select transform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="max">Max</SelectItem>
                  <SelectItem value="min">Min</SelectItem>
                  <SelectItem value="first">First</SelectItem>
                  <SelectItem value="last">Last</SelectItem>
                  <SelectItem value="concat">Concatenate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingMapping && (
              <div className="p-2 bg-gray-100 rounded">
                <p className="text-sm font-medium">Mapped Range:</p>
                <p className="text-sm">{`${editingMapping.sheet}!${
                  currentSheetData[editingMapping.start.row]?.[editingMapping.start.col]
                }:${currentSheetData[editingMapping.end.row]?.[editingMapping.end.col]}`}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMappingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMapping}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const ExcelViewerWithFullscreen: React.FC<ExcelViewerProps> = (
  props
) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const handleToggleFullscreen = () => {
    setIsFullscreen(true);
  };
  return (
    <>
      <ExcelViewer {...props} onToggleFullscreen={handleToggleFullscreen} />
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="w-screen h-screen max-w-full max-h-full p-0 flex flex-col">
          <ExcelViewer {...props} isFullscreenMode={true} />
          <div className="absolute top-4 right-4 z-10">
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